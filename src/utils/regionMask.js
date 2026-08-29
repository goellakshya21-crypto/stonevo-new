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
