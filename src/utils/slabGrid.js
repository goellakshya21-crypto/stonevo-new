/**
 * Compose a bookmatched slab panel — the real number of slabs, mirrored.
 *
 * Every render before this showed stone as one endless monolithic surface. A
 * real wall is clad in a finite number of slabs, and the whole point of a
 * bookmatch is the symmetry where two of them meet. So the architect picks how
 * many slabs go on the surface, and this builds that arrangement.
 *
 * WHY THIS IS DONE ON CANVAS AND NOT IN THE PROMPT
 * The image model cannot count. Asking it for "exactly six slabs in a 3x2 grid,
 * mirrored in pairs" produces whatever it feels like, and every attempt is a
 * billed Vertex call. So the grid is composed here, deterministically, into a
 * single panel image which is then handed to the model as the material source.
 * Its only remaining job is mapping an image it can see onto a surface in
 * perspective, which it is genuinely good at. The slab count stops being a
 * request and becomes a property of the input.
 *
 * This generalises makeBookmatch() in lib/dossierPdf.js (a fixed 2-way mirror)
 * to an arbitrary N x M grid.
 */

/**
 * The arrangements offered in the UI. cols x rows, counting left-to-right and
 * top-to-bottom.
 *
 * Two slabs are side by side rather than stacked, matching every other
 * bookmatch in the app: ImageModal's 2-way preview, the dossier PDF's bookmatch
 * page, and the prompt wording itself ("two mirrored slabs placed side by
 * side"). It is also the canonical feature-wall bookmatch.
 */
export const SLAB_PRESETS = [
    { count: 1, cols: 1, rows: 1, label: 'Single slab' },
    { count: 2, cols: 2, rows: 1, label: 'Two — side by side' },
    { count: 4, cols: 2, rows: 2, label: 'Four — 2 × 2' },
    { count: 6, cols: 3, rows: 2, label: 'Six — 3 × 2' },
    { count: 8, cols: 4, rows: 2, label: 'Eight — 4 × 2' },
];

export const findPreset = (count) => SLAB_PRESETS.find(p => p.count === count) || null;

/**
 * Mirror parity for the slab at (col, row).
 *
 * A bookmatch alternates: every slab is the mirror of the one beside it, so the
 * veining meets symmetrically at each joint. That is just parity on the index —
 * odd columns flip horizontally, odd rows flip vertically.
 *
 * Shared with SlabGridSelector's CSS preview so the two can never disagree
 * about what the architect is looking at.
 *
 * `originRow: 'bottom'` seeds the row parity one step along, which is the
 * generalisation of ImageModal's Mirror Up / Mirror Down toggle: it swaps which
 * row is the slab as cut and which is the reflection.
 */
export const slabParity = (col, row, originRow = 'top') => ({
    sx: (col % 2) ? -1 : 1,
    sy: ((row + (originRow === 'bottom' ? 1 : 0)) % 2) ? -1 : 1,
});

/**
 * Build the panel.
 *
 * @param {string} sourceDataUrl  the slab image, as a data URL. Must already be
 *        a data URL — see the guard below.
 * @param {object} opts
 * @param {number} opts.cols, opts.rows  the grid
 * @param {number} opts.maxEdge   cap on the composite's longest side (see below)
 * @param {number} opts.quality   JPEG quality
 * @param {string} opts.originRow 'top' | 'bottom'
 * @returns {Promise<{dataUrl,cols,rows,count,cellW,cellH,aspect,slabAspect}>}
 */
export const composeSlabGrid = (sourceDataUrl, opts = {}) =>
    new Promise((resolve, reject) => {
        const { cols, rows, maxEdge = 2048, quality = 0.92, originRow = 'top' } = opts;

        if (!sourceDataUrl) { reject(new Error('composeSlabGrid: missing image')); return; }
        if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1) {
            reject(new Error('composeSlabGrid: cols and rows must be integers >= 1'));
            return;
        }
        // A cross-origin image would taint the canvas and make toDataURL throw.
        // Turning a remote URL into a data URL is utils/urlToDataUrl.js's job and
        // only its job — the same split regionMask.js draws for compositeRegion.
        if (!sourceDataUrl.startsWith('data:')) {
            reject(new Error('composeSlabGrid: source is not a data URL'));
            return;
        }

        const img = new Image();
        img.onerror = () => reject(new Error('composeSlabGrid: could not decode the slab image'));
        img.onload = () => {
            try {
                const sw = img.naturalWidth, sh = img.naturalHeight;
                if (!sw || !sh) { reject(new Error('composeSlabGrid: image has no dimensions')); return; }

                // Each cell is the WHOLE source slab, uncropped and unstretched.
                // Because every cell is identical, each slab keeps its native
                // proportion and the panel's aspect ratio is derived rather than
                // chosen. Same reasoning as ImageModal's fitBox(2 * imgAR),
                // generalised to N x M.
                //
                // "Native proportion" is exact on the fast path and within a
                // rounded pixel on the downscaled one below: canvas dimensions
                // are integers, so a cell of 341.33px becomes 341 and the panel
                // aspect drifts by well under a percent. Visually nil, but don't
                // assert exact equality on it.
                let cellW = sw, cellH = sh;

                // Downscale guard. This is load-bearing, not defensive: an 8-slab
                // grid off a 3000x2000 photo is a 12000x4000 canvas, past iOS
                // Safari's 4096^2 area cap, and its base64 would blow the 4.5MB
                // Vercel request limit that also has to carry userRoomImage and
                // regionMaskImage on the facade path. Do not raise maxEdge
                // without re-checking that budget.
                const fullW = sw * cols, fullH = sh * rows;
                if (fullW > maxEdge || fullH > maxEdge) {
                    const scale = maxEdge / Math.max(fullW, fullH);
                    cellW = Math.max(1, Math.round(sw * scale));
                    cellH = Math.max(1, Math.round(sh * scale));
                }

                const canvas = document.createElement('canvas');
                canvas.width = cellW * cols;
                canvas.height = cellH * rows;
                const ctx = canvas.getContext('2d');

                // Pre-smear the whole frame before laying out the grid. Integer
                // cell sizes mean the tiles below should butt exactly, but if a
                // renderer ever leaves a sub-pixel sliver it now shows stone
                // colour rather than a black hairline the model would read as
                // grout. This is why the CSS +1px anti-gap hacks in
                // ImageModal/SlabGridSelector are NOT needed here — those exist
                // because percentage layout produces fractional boxes. Please
                // don't port them in.
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const { sx, sy } = slabParity(c, r, originRow);
                        ctx.save();
                        // Translate to the far edge before flipping, so the
                        // mirrored draw lands back inside its own cell. Extends
                        // to the Y axis without the hand-computed negative
                        // offsets makeBookmatch() used for the 2-way case.
                        ctx.translate(
                            c * cellW + (sx < 0 ? cellW : 0),
                            r * cellH + (sy < 0 ? cellH : 0),
                        );
                        ctx.scale(sx, sy);
                        ctx.drawImage(img, 0, 0, cellW, cellH);
                        ctx.restore();
                    }
                }

                // Deliberately NO joint lines are drawn. A dark line baked into
                // the material source is the strongest possible signal to the
                // model that this stone comes with grout — exactly what the
                // render prompts spend three paragraphs forbidding. The joints
                // are described in words instead (describeSlabGrid), and the
                // mirrored veining is what actually reveals where slabs meet.
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                if (!dataUrl || dataUrl.length < 100) {
                    reject(new Error('composeSlabGrid: canvas produced no image'));
                    return;
                }

                resolve({
                    dataUrl,
                    cols, rows,
                    count: cols * rows,
                    cellW, cellH,
                    aspect: (cellW * cols) / (cellH * rows),
                    slabAspect: sw / sh,
                });
            } catch (err) {
                reject(err);
            }
        };
        img.src = sourceDataUrl;
    });

/**
 * Plain-English description of the panel, sent alongside the panel image.
 *
 * Two independent signals for one instruction, the same pattern buildRegionMask
 * and describeRegion use: if the model under-reads the image, the words still
 * land.
 */
export const describeSlabGrid = (panel) => {
    if (!panel || !panel.count) return '';
    if (panel.count === 1) return 'a single slab';
    const shape = panel.rows === 1
        ? `${panel.cols} slabs in a single row, side by side`
        : `${panel.cols} columns wide by ${panel.rows} rows high`;
    return `a finished panel of ${panel.count} slabs, ${shape}, each slab mirrored against its neighbours so the veining meets symmetrically at every joint`;
};
