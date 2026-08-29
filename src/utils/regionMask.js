/**
 * Build the visual guide that tells the image model WHICH part of a facade photo
 * to clad.
 *
 * The room-editing prompt locates surfaces semantically ("identify every
 * instance of the flooring"). That can't express "only the middle storey", so
 * the region is communicated visually instead: a copy of the photo with the
 * chosen band flooded in an unnatural colour. The prompt then says "apply only
 * where the highlight is, and never draw the highlight colour itself".
 *
 * Magenta is deliberate — it effectively never occurs on a building elevation
 * (brick, render, stone, glass, sky, foliage), so the model can't confuse the
 * marker for real material.
 *
 * @param {string} imageDataUrl  the user's photo, as a data URL
 * @param {{x:number,y:number,w:number,h:number}} rect  normalised 0..1
 * @returns {Promise<string>} data URL of the marked-up copy
 */
export const MASK_COLOR = { r: 255, g: 0, b: 255 };

export const buildRegionMask = (imageDataUrl, rect) =>
    new Promise((resolve, reject) => {
        if (!imageDataUrl || !rect) { reject(new Error('buildRegionMask: missing image or rect')); return; }

        const img = new Image();
        img.onerror = () => reject(new Error('buildRegionMask: could not decode the photo'));
        img.onload = () => {
            try {
                const w = img.naturalWidth, h = img.naturalHeight;
                if (!w || !h) { reject(new Error('buildRegionMask: image has no dimensions')); return; }

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');

                ctx.drawImage(img, 0, 0, w, h);

                // Convert normalised -> pixels, rounded so the band edges land on
                // whole pixels (a half-pixel edge shows up as a seam to the model).
                const rx = Math.round(rect.x * w);
                const ry = Math.round(rect.y * h);
                const rw = Math.max(1, Math.round(rect.w * w));
                const rh = Math.max(1, Math.round(rect.h * h));

                // Semi-transparent flood: the underlying architecture stays legible
                // so the model can still read window/door positions inside the band.
                ctx.fillStyle = `rgba(${MASK_COLOR.r}, ${MASK_COLOR.g}, ${MASK_COLOR.b}, 0.45)`;
                ctx.fillRect(rx, ry, rw, rh);

                // Hard outline: a crisp boundary is easier to honour than a soft edge.
                ctx.strokeStyle = `rgb(${MASK_COLOR.r}, ${MASK_COLOR.g}, ${MASK_COLOR.b})`;
                ctx.lineWidth = Math.max(3, Math.round(Math.min(w, h) * 0.006));
                ctx.strokeRect(rx, ry, rw, rh);

                resolve(canvas.toDataURL('image/jpeg', 0.85));
            } catch (err) {
                reject(err);
            }
        };
        img.src = imageDataUrl;
    });

/**
 * Plain-English description of the region, sent alongside the mask image.
 * Two independent signals for one instruction: if the model under-weights the
 * visual marker, the worded bounds still land.
 */
export const describeRegion = (rect) => {
    if (!rect) return '';
    const top = Math.round(rect.y * 100);
    const bottom = Math.round((rect.y + rect.h) * 100);
    const left = Math.round(rect.x * 100);
    const right = Math.round((rect.x + rect.w) * 100);
    const fullWidth = rect.x <= 0.02 && (rect.x + rect.w) >= 0.98;

    return fullWidth
        ? `the horizontal band running from ${top}% to ${bottom}% of the image height, across the full width`
        : `the rectangular area from ${left}% to ${right}% of the image width and ${top}% to ${bottom}% of the image height`;
};

/**
 * Clip a render back to the region the user actually selected.
 *
 * The prompt asks the model to leave everything outside the marked band
 * untouched, and the model treats that as a suggestion: on a real facade it
 * snapped to the architectural feature wall instead, spilling the new stone
 * roughly a third of an image-height past the selection. Prompt wording cannot
 * make a geometric constraint binding, so it is enforced here rather than
 * requested: the original photo is the base, and only the pixels inside the
 * rect are taken from the render. Outside the selection the output is now
 * byte-identical to what the user uploaded, by construction.
 *
 * Skipped (returns the render untouched) when the model reframed the shot —
 * a different aspect ratio means the two images no longer line up, so clipping
 * would paste the wrong content into the band.
 *
 * @param {string} originalDataUrl  the user's photo, as uploaded
 * @param {string} renderedDataUrl  the model's render (must be a data URL)
 * @param {{x:number,y:number,w:number,h:number}} rect  normalised 0..1
 * @returns {Promise<string>} data URL of the clipped composite
 */
export const compositeRegion = (originalDataUrl, renderedDataUrl, rect) =>
    new Promise((resolve, reject) => {
        if (!originalDataUrl || !renderedDataUrl || !rect) {
            reject(new Error('compositeRegion: missing input'));
            return;
        }
        // A cross-origin render (the Unsplash fallback) would taint the canvas
        // and make toDataURL throw. Only data URLs are safe to composite.
        if (!renderedDataUrl.startsWith('data:')) {
            reject(new Error('compositeRegion: render is not a data URL'));
            return;
        }

        const load = (src) => new Promise((res, rej) => {
            const im = new Image();
            im.onload = () => res(im);
            im.onerror = () => rej(new Error('compositeRegion: could not decode ' + src.slice(0, 24)));
            im.src = src;
        });

        Promise.all([load(originalDataUrl), load(renderedDataUrl)]).then(([orig, rendered]) => {
            const w = orig.naturalWidth, h = orig.naturalHeight;
            if (!w || !h || !rendered.naturalWidth || !rendered.naturalHeight) {
                reject(new Error('compositeRegion: image has no dimensions'));
                return;
            }

            const origAR = w / h;
            const renderAR = rendered.naturalWidth / rendered.naturalHeight;
            if (Math.abs(renderAR - origAR) / origAR > 0.03) {
                reject(new Error('compositeRegion: render was reframed, cannot align'));
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');

            ctx.drawImage(orig, 0, 0, w, h);

            const rx = Math.round(rect.x * w);
            const ry = Math.round(rect.y * h);
            const rw = Math.max(1, Math.round(rect.w * w));
            const rh = Math.max(1, Math.round(rect.h * h));

            ctx.save();
            ctx.beginPath();
            ctx.rect(rx, ry, rw, rh);
            ctx.clip();
            // Scaled to the original's frame so the two line up pixel-for-pixel.
            ctx.drawImage(rendered, 0, 0, w, h);
            ctx.restore();

            resolve(canvas.toDataURL('image/jpeg', 0.92));
        }).catch(reject);
    });
