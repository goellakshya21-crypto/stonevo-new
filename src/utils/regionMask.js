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

/**
 * Did the model actually clad the region the user marked?
 *
 * The facade edit silently no-ops perhaps one time in three: the model returns
 * the photograph essentially untouched. That used to be invisible, because
 * compositeRegion rebuilds the output from the original photo, so a no-op and a
 * miss both arrive looking like a pristine upload. The user sees "nothing
 * happened" and cannot tell whether to retry.
 *
 * Measured, not guessed: mean absolute pixel difference against the original,
 * inside the rect versus outside it.
 *
 * The RATIO is what decides it, never the absolute difference. These models
 * re-render the whole frame -- lighting, compression, a pixel of drift -- so
 * "outside" sits around 20/255 even on a perfect edit, and a pale stone over a
 * pale facade can legitimately move "inside" very little. Comparing the two
 * normalises out both the global noise and the stone-to-wall contrast.
 *
 * Calibrated against three renders of the same request (black marble onto a
 * travertine elevation), scored by eye:
 *   inside 14.3, outside 21.1 -> ratio 0.68  visually untouched
 *   inside 46.7, outside 20.3 -> ratio 2.30  partially clad
 *   inside 97.4, outside 28.1 -> ratio 3.47  fully clad
 * 1.5 sits in the empty space between a no-op and a partial hit.
 *
 * @returns {Promise<{inside:number, outside:number, ratio:number, applied:boolean, measured:boolean}>}
 *          measured:false means we could not tell -- treat as applied, never retry on ignorance.
 */
export const REGION_EDIT_MIN_RATIO = 1.5;

export const measureRegionEdit = (originalDataUrl, renderedDataUrl, rect) =>
    new Promise((resolve) => {
        const unknown = { inside: 0, outside: 0, ratio: Infinity, applied: true, measured: false };
        // A cross-origin render (the Unsplash fallback) taints the canvas and
        // makes getImageData throw. Same guard as compositeRegion.
        if (!originalDataUrl || !renderedDataUrl || !rect || !renderedDataUrl.startsWith('data:')) {
            resolve(unknown);
            return;
        }
        const load = (src) => new Promise((res, rej) => {
            const im = new Image();
            im.onload = () => res(im);
            im.onerror = () => rej(new Error('decode failed'));
            im.src = src;
        });
        Promise.all([load(originalDataUrl), load(renderedDataUrl)]).then(([a, b]) => {
            // Sampled small: this is a coarse "did anything happen" question, and
            // running it at full size on every render would cost more than it tells us.
            const W = 256;
            const H = Math.max(1, Math.round(W * a.naturalHeight / a.naturalWidth));
            const grab = (im) => {
                const c = document.createElement('canvas');
                c.width = W; c.height = H;
                c.getContext('2d').drawImage(im, 0, 0, W, H);
                return c.getContext('2d').getImageData(0, 0, W, H).data;
            };
            const da = grab(a), db = grab(b);
            let inSum = 0, inN = 0, outSum = 0, outN = 0;
            for (let y = 0; y < H; y++) {
                const fy = y / H;
                const insideY = fy >= rect.y && fy < rect.y + rect.h;
                for (let x = 0; x < W; x++) {
                    const i = (y * W + x) * 4;
                    const d = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
                    const fx = x / W;
                    if (insideY && fx >= rect.x && fx < rect.x + rect.w) { inSum += d; inN++; }
                    else { outSum += d; outN++; }
                }
            }
            const inside = inN ? inSum / inN : 0;
            const outside = outN ? outSum / outN : 0;
            // Floor the denominator: a byte-identical render would otherwise
            // divide by ~0 and report an infinite ratio, i.e. a perfect edit.
            const ratio = inside / Math.max(outside, 1);
            resolve({
                inside: +inside.toFixed(2),
                outside: +outside.toFixed(2),
                ratio: +ratio.toFixed(2),
                applied: ratio >= REGION_EDIT_MIN_RATIO,
                measured: true,
            });
        }).catch(() => resolve(unknown));
    });
