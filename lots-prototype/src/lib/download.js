// Download any picture on the site: a render, a slab photo, a book-match panel
// or an edit of the buyer's own room. Data URLs download as they are; anything
// else is fetched first so the browser saves it instead of opening it (the
// live ImageModal's "Download High-Res" does the same, and falls back to a new
// tab when a host refuses the fetch).

/** "Neve Statuario in a bathroom" -> "neve-statuario-in-a-bathroom.jpg" */
export const fileNameFor = (...parts) =>
    `${parts
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'stone'}.jpg`;

export async function downloadImage(src, name) {
    const save = (href) => {
        const a = document.createElement('a');
        a.href = href;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };
    if (src.startsWith('data:')) {
        save(src);
        return;
    }
    try {
        const res = await fetch(src, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const url = URL.createObjectURL(await res.blob());
        save(url);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
        console.warn('[download] fetch failed, opening the picture instead:', err);
        window.open(src, '_blank', 'noopener');
    }
}
