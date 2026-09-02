/**
 * Fetch an image URL into a data URL, via canvas.
 *
 * Lifted verbatim out of the buildPDF closure in lib/dossierPdf.js, where it has
 * been shipping since the dossier feature landed. It captured nothing from that
 * closure, so the move is behaviour-free — but it is now also the single place
 * in the app that turns a remote image into something canvas code may touch.
 *
 * `crossOrigin = 'anonymous'` is the load-bearing line: without it, drawing a
 * Supabase-hosted stone photo taints the canvas and every subsequent
 * toDataURL() throws. Supabase's public buckets send the CORS headers this
 * needs, which is why the dossier PDF works in production today.
 *
 * CONTRACT — depended on by callers: resolves `null` on failure (image failed to
 * load, or the canvas came back tainted anyway) and NEVER throws or rejects. A
 * data URL passed in is returned untouched.
 *
 * @param {string} url  http(s) or data URL
 * @returns {Promise<string|null>} data URL, or null if it could not be read
 */
export const urlToDataUrl = async (url) => {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext('2d').drawImage(img, 0, 0);
            try { resolve(c.toDataURL('image/jpeg', 0.92)); }
            catch { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
};
