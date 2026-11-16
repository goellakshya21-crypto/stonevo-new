// Realistic room renders, made with the LIVE site's visualiser.
//
// Nothing here writes a prompt. It calls the same client code the live
// "Visualise" modal calls (src/lib/aiVisualizer.js), with the same bookmatched
// slab panel (src/utils/slabGrid.js), against the same server route
// (api/generate-image.js -> Gemini 2.5 Flash Image on Vertex). The prototype's
// dev server bridges that route; see vite.config.js.
//
// Three jobs, all through that one route:
//   renderLot      a lot in one of our compact rooms. Saved, reused for everyone.
//   compareInRoom  a second lot swapped into the FIRST lot's saved room, the
//                  same idea as the live StoneCompareModal. Not saved.
//   renderOwnRoom  a lot put into a photo of the buyer's own room. Not saved:
//                  it is their home.
// The last two edit an existing picture, through the prototype's stone-swap
// route and prompt (server/swapStone.js), not the live own-photo prompt.
//
// A render costs about $0.04 and takes 15–25 s, which is fine once per lot and
// hopeless once per page view.
import { aiVisualizer } from '../../../src/lib/aiVisualizer.js';
import { composeSlabGrid, describeSlabGrid, findPreset } from '../../../src/utils/slabGrid.js';
import { urlToDataUrl } from '../../../src/utils/urlToDataUrl.js';
import { artDirection, canDo, SCENES, STYLE_IDS, STYLES, stylesForTone } from './applications.js';

export const RENDER_SCENES = SCENES;

// The rooms a buyer can switch between in the hero.
export const ROOM_TABS = ['bathroom', 'kitchen', 'living', 'bedroom', 'pooja'];

// ─── The hero tour ─────────────────────────────────────────────────────────
// The first screen's default: nine slides, each a different space, a
// different lot and a different architectural style, so the opening run shows
// the range rather than one bathroom eight times. Saved as renders/tour.json:
// [{ lotId, scene, style }].
export const TOUR_SCENES = ['bathroom', 'kitchen', 'living', 'bedroom', 'pooja', 'dining', 'vanity', 'foyer', 'staircase'];

export async function fetchTour() {
    try {
        const res = await fetch('/renders/tour.json', { cache: 'no-store' });
        const j = res.ok ? await res.json() : null;
        return Array.isArray(j?.items) ? j.items : [];
    } catch {
        return [];
    }
}

export async function saveTour(items) {
    const res = await fetch('/__renders/tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not save the tour');
}

/**
 * Pick the tour: for each space, a lot that can do it (best discount first),
 * never the same lot twice and spread across stone families; then a style no
 * other slide uses, chosen from those that contrast with that stone's tone.
 * @returns {Promise<Array<{ lot, sceneId, styleId }>>}
 */
export async function planTour(lots) {
    const usedLots = new Set();
    const usedStyles = new Set();
    const familyCount = {};
    const toneCount = {};
    const plan = [];
    for (const sceneId of TOUR_SCENES) {
        // Best few candidates by family spread and discount, then the one whose
        // family AND tone (light / mid / dark) the tour has least of, so the
        // nine stones look different, not nine pale marbles.
        const candidates = lots
            .filter((l) => canDo(l, sceneId) && !usedLots.has(l.id))
            .sort((a, b) => (familyCount[a.family] || 0) - (familyCount[b.family] || 0) || b.discountPct - a.discountPct)
            .slice(0, 12);
        let lot = null;
        let tone = 'mid';
        let best = Infinity;
        for (const c of candidates) {
            const t = await stoneTone(c);
            const score = (familyCount[c.family] || 0) + 1.5 * (toneCount[t] || 0);
            if (score < best) {
                best = score;
                lot = c;
                tone = t;
            }
        }
        if (!lot) continue;
        usedLots.add(lot.id);
        familyCount[lot.family] = (familyCount[lot.family] || 0) + 1;
        toneCount[tone] = (toneCount[tone] || 0) + 1;
        const styleId = stylesForTone(tone).find((s) => !usedStyles.has(s)) || STYLE_IDS.find((s) => !usedStyles.has(s)) || STYLE_IDS[0];
        usedStyles.add(styleId);
        plan.push({ lot, sceneId, styleId, tone });
    }
    return plan;
}

export const styleName = (id) => STYLES[id]?.name || '';

export async function fetchRenders() {
    try {
        const res = await fetch('/renders/manifest.json', { cache: 'no-store' });
        return res.ok ? await res.json() : {};
    } catch {
        return {};
    }
}

// The model returns a large PNG. Re-encode to a JPEG sized for the web: ~10x
// smaller, no visible difference at page size.
const toJpeg = (dataUrl, maxEdge = 1600, quality = 0.86) =>
    new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const k = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
            const c = document.createElement('canvas');
            c.width = Math.round(img.naturalWidth * k);
            c.height = Math.round(img.naturalHeight * k);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            resolve(c.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A book-match layout: how many slabs (1, 2 or 4 in the Book-match view; the live SLAB_PRESETS),
// which way each slab is turned, and which row is the slab as cut (the live
// "Mirror down / Mirror up"). `slabs` below is a layout or just a count.
const asLayout = (slabs) => (slabs && typeof slabs === 'object' ? slabs : { count: slabs || 1 });
export const layoutKey = (slabs) => {
    const l = asLayout(slabs);
    return `${l.count || 1}-${l.rotation || 0}-${l.originRow || 'top'}`;
};

/** The book-matched panel itself, as a JPEG data URL (the Book-match view's download). */
export async function bookmatchImage(lot, layout, maxEdge = 3000) {
    const l = asLayout(layout);
    const preset = findPreset(l.count) || { count: 1, cols: 1, rows: 1 };
    const src = await urlToDataUrl(lot.image);
    if (!src) throw new Error('Could not read the slab photo.');
    const panel = await composeSlabGrid(src, { ...preset, rotation: l.rotation || 0, originRow: l.originRow || 'top', maxEdge });
    return panel.dataUrl;
}

// Same slab panel step as AIVisualizationModal: composed on canvas so the slab
// count is a property of the image, not an instruction. Falls back to the
// single slab on any failure, exactly as the live modal does.
async function slabPanel(imageUrl, slabs) {
    const layout = asLayout(slabs);
    const preset = layout.count > 1 ? findPreset(layout.count) : null;
    // One slab as cut needs no panel: the slab photo is the material.
    if (!preset && !layout.rotation) return {};
    try {
        const src = await urlToDataUrl(imageUrl);
        if (!src) throw new Error('slab photo unreadable');
        const panel = await composeSlabGrid(src, {
            ...(preset || { count: 1, cols: 1, rows: 1 }),
            rotation: layout.rotation || 0,
            originRow: layout.originRow || 'top',
        });
        return {
            slabPanelImage: panel.dataUrl,
            slabGrid: { cols: panel.cols, rows: panel.rows, count: panel.count },
            slabDescription: describeSlabGrid(panel),
        };
    } catch (err) {
        console.warn('[renders] slab panel failed, using the single slab:', err);
        return {};
    }
}

/** One call to the live visualiser, with one patient retry. Returns a JPEG data URL. */
async function visualise(lot, { roomType, application, slabs, roomStyle = 'Modern', userRoomImage = null }) {
    const panel = await slabPanel(lot.image, slabs);
    const request = () =>
        aiVisualizer.generateRoomImage({
            stoneName: lot.name,
            roomType,
            stoneType: lot.colors[0] || lot.family,
            application,
            imageUrl: lot.image,
            roomStyle,
            userRoomImage,
            ...panel,
        });

    // The server already waits out short Vertex quota bursts, so a second
    // failure is worth surfacing rather than hammering.
    let raw;
    try {
        raw = await request();
    } catch (err) {
        await sleep(8000);
        raw = await request().catch(() => {
            throw err;
        });
    }
    if (!raw) throw new Error('The visualiser returned no image.');
    return toJpeg(raw);
}

/**
 * Render one lot in one of our rooms and save it for every visitor.
 * @returns {Promise<string>} the saved render's URL
 */
// How bright a slab really is, from its photo: 'light' | 'mid' | 'dark'. Used
// to paint the room in a contrasting colour. Measured rather than read from
// the colour tags, which can mislead (Mogano Vein is tagged Brown but is mostly
// white). Cached per photo.
const tones = new Map();
export function stoneTone(lot) {
    if (tones.has(lot.image)) return tones.get(lot.image);
    const job = (async () => {
        const src = await urlToDataUrl(lot.image);
        if (!src) return 'mid';
        const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = src;
        });
        const c = document.createElement('canvas');
        c.width = 48;
        c.height = 48;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, 48, 48);
        const d = ctx.getImageData(0, 0, 48, 48).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        const lum = sum / (d.length / 4);
        return lum >= 170 ? 'light' : lum <= 95 ? 'dark' : 'mid';
    })().catch(() => 'mid');
    tones.set(lot.image, job);
    return job;
}

export async function renderLot(lot, sceneId, { styleId = null } = {}) {
    const scene = SCENES[sceneId];
    if (!scene) throw new Error(`Unknown room: ${sceneId}`);
    const look = artDirection(lot, sceneId, await stoneTone(lot), styleId);
    const jpeg = await visualise(lot, { ...scene, ...look });
    const res = await fetch('/__renders/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId: lot.id, scene: sceneId, name: lot.name, dataUrl: jpeg }),
    });
    const saved = await res.json();
    if (!res.ok) throw new Error(saved.error || 'Could not save the render');
    return saved.url;
}

// ─── Putting a stone onto an existing picture ──────────────────────────────
// Comparisons and the buyer's own room both EDIT a picture rather than make a
// new one. They go through the prototype's stone-swap route
// (server/swapStone.js), whose prompt insists the surface really changes; the
// live own-photo prompt is built to protect the buyer's room and often handed
// the picture back untouched, which made both sides of a comparison the same.

const loadImage = (src) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image did not load'));
        img.src = src;
    });

// The image model's own picture sizes. Measured: a picture sent at one of
// these sizes, with its aspect ratio asked for, comes back in EXACTLY the same
// frame (scale 1.000, under a pixel of drift). Sent at any other size it comes
// back reframed unpredictably: a 1280×800 room returned 1408×736 with the
// bottom cut and the right side invented; a 16:9 one returned zoomed 6.7% and
// trimmed. So every picture is put into one of these frames BEFORE it is sent,
// and the slider's "before" side is that framed picture. Both sides then share
// one frame by construction; nothing is lined up after the fact.
const FRAMES = [
    { ar: '1:1', w: 1024, h: 1024 },
    { ar: '2:3', w: 832, h: 1248 },
    { ar: '3:2', w: 1248, h: 832 },
    { ar: '3:4', w: 864, h: 1184 },
    { ar: '4:3', w: 1184, h: 864 },
    { ar: '4:5', w: 896, h: 1152 },
    { ar: '5:4', w: 1152, h: 896 },
    { ar: '9:16', w: 768, h: 1344 },
    { ar: '16:9', w: 1344, h: 768 },
    { ar: '21:9', w: 1536, h: 672 },
];

const framed = new Map(); // picture -> Promise<{ url, ar, w, h }>

/**
 * A picture cropped (centred, as little as possible) and resized to the
 * nearest of the model's frames. A picture already in a frame is kept as is.
 * @returns {Promise<{url: string, ar: string, w: number, h: number}>}
 */
export function toFrame(src) {
    if (framed.has(src)) return framed.get(src);
    const job = (async () => {
        const img = await loadImage(src);
        const W = img.naturalWidth;
        const H = img.naturalHeight;
        const exact = FRAMES.find((f) => f.w === W && f.h === H);
        if (exact && src.startsWith('data:image/jpeg')) return { url: src, ...exact };
        const f = exact || FRAMES.reduce((best, fr) => (Math.abs(Math.log(fr.w / fr.h / (W / H))) < Math.abs(Math.log(best.w / best.h / (W / H))) ? fr : best));
        const target = f.w / f.h;
        const cw = W / H > target ? H * target : W;
        const ch = W / H > target ? H : W / target;
        const c = document.createElement('canvas');
        c.width = f.w;
        c.height = f.h;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, (W - cw) / 2, (H - ch) / 2, cw, ch, 0, 0, f.w, f.h);
        return { url: c.toDataURL('image/jpeg', 0.9), ...f };
    })();
    framed.set(src, job);
    if (framed.size > 40) framed.delete(framed.keys().next().value);
    job.catch(() => framed.delete(src));
    return job;
}

// The edit, at exactly the frame's size. It comes back that size when sent in
// a frame; if it ever does not, it is fitted centrally (and logged).
async function intoFrame(raw, frame) {
    const img = await loadImage(raw);
    if (img.naturalWidth === frame.w && img.naturalHeight === frame.h) return toJpeg(raw, 2000, 0.9);
    console.warn(`[renders] edit came back ${img.naturalWidth}×${img.naturalHeight}, not ${frame.w}×${frame.h}; fitting it`);
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const target = frame.w / frame.h;
    const cw = W / H > target ? H * target : W;
    const ch = W / H > target ? H : W / target;
    const c = document.createElement('canvas');
    c.width = frame.w;
    c.height = frame.h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (W - cw) / 2, (H - ch) / 2, cw, ch, 0, 0, frame.w, frame.h);
    return c.toDataURL('image/jpeg', 0.9);
}

// Shrink in steps so each output pixel is a fair average of its patch.
const tinyPixels = (img, w, h) => {
    let src = img;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    while (sw / 2 > w * 2) {
        const c = document.createElement('canvas');
        c.width = Math.round(sw / 2);
        c.height = Math.round(sh / 2);
        c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
        src = c;
        sw = c.width;
        sh = c.height;
    }
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h).data;
};

/**
 * How much of a picture changed: the number of patches, on a 64-wide grid,
 * whose colour moved by more than 40. Both pictures share one frame, so a
 * patch only moves if its content did.
 *
 * Measured on the dining table that failed: real swaps changed 110 and 29
 * patches (an edge-on table top is a thin strip, hence 29); asking for the
 * same stone again changed 0. A percentile measure missed the thin strip.
 */
export async function changedPatches(beforeUrl, afterUrl) {
    const [a, b] = await Promise.all([loadImage(beforeUrl), loadImage(afterUrl)]);
    const w = 64;
    const h = Math.max(8, Math.round((w * a.naturalHeight) / a.naturalWidth));
    const pa = tinyPixels(a, w, h);
    const pb = tinyPixels(b, w, h);
    let n = 0;
    for (let i = 0; i < pa.length; i += 4) if (Math.hypot(pa[i] - pb[i], pa[i + 1] - pb[i + 1], pa[i + 2] - pb[i + 2]) > 40) n++;
    return n;
}

// Fewer changed patches than this: the surface is taken as unchanged and
// asked for once more (see changedPatches for the measurements).
export const UNCHANGED_BELOW = 12;

const plainStone = (lot) => ({ name: lot.name, family: lot.family, colors: lot.colors, pattern: lot.pattern });

async function callSwap(body) {
    const send = () =>
        fetch('/__proto/swap-stone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => {
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j.url) throw new Error(j.error || `Stone swap failed (${r.status})`);
            return j.url;
        });
    try {
        return await send();
    } catch (err) {
        await sleep(8000);
        return send().catch(() => {
            throw err;
        });
    }
}

/**
 * Put `lot` onto one surface of `photo`. `current` is the lot whose stone is on
 * that surface now, when we know it. Checks the result really changed and asks
 * once more, insisting, when it did not.
 *
 * @returns {Promise<{url, before, w, h, changed, patches}>} `url` and `before`
 *   are the same size and frame, ready for the slider.
 */
async function swapInPhoto({ lot, photo, surface, where, slabs, current = null }) {
    const frame = await toFrame(photo);
    const panel = await slabPanel(lot.image, slabs);
    const body = {
        roomImage: frame.url,
        aspectRatio: frame.ar,
        stoneImage: panel.slabPanelImage || null,
        stoneImageUrl: lot.image,
        currentImageUrl: current?.image || null,
        stone: plainStone(lot),
        current: current ? plainStone(current) : null,
        surface,
        where,
        panel: panel.slabDescription || null,
        // cols x rows of the book-matched panel, so the prompt can say exactly
        // how many slabs and joints the surface must show.
        panelGrid: panel.slabGrid || null,
    };
    let url = await intoFrame(await callSwap(body), frame);
    let renders = 1;
    let patches = await changedPatches(frame.url, url).catch(() => 999);
    console.info(`[renders] ${lot.name} on the ${surface} (${frame.ar}): ${patches} patches changed`);
    if (patches < UNCHANGED_BELOW) {
        console.warn(`[renders] ${lot.name} on the ${surface}: barely changed, asking again`);
        const again = await intoFrame(await callSwap({ ...body, insist: true }), frame);
        renders++;
        const patches2 = await changedPatches(frame.url, again).catch(() => 999);
        console.info(`[renders] ${lot.name} on the ${surface}: second try changed ${patches2} patches`);
        if (patches2 > patches) {
            url = again;
            patches = patches2;
        }
    }
    return { url, before: frame.url, w: frame.w, h: frame.h, changed: patches >= UNCHANGED_BELOW, patches, renders };
}

// Swaps already made this session, so flicking between rooms in the compare
// sheet never pays twice for the same picture.
const swaps = new Map();

/**
 * The live StoneCompareModal's idea: the second lot is put into the FIRST
 * lot's room, so the room, light and camera stay the same and only the stone
 * changes. Generating both from scratch gives two different rooms and tells
 * you nothing about the stone. The first lot's side of the slider is its room
 * put into the model's frame (`before`), not the saved render as is.
 *
 * @param base     the lot whose saved render is the room
 * @param baseUrl  that render
 * @param other    the lot to swap in
 * @param fresh    ignore an earlier swap of the same pair (for "Try again")
 * @returns {Promise<{url, before, w, h, changed}>}
 */
export async function compareInRoom({ base, baseUrl, other, sceneId, fresh = false }) {
    const key = `${baseUrl}|${other.id}`;
    if (!fresh && swaps.has(key)) return swaps.get(key);
    const scene = SCENES[sceneId];
    const job = (async () => {
        const room = await urlToDataUrl(baseUrl);
        if (!room) throw new Error('Could not read the first room to swap the stone into.');
        return swapInPhoto({ lot: other, photo: room, surface: scene.surface, where: scene.application, slabs: scene.slabs, current: base });
    })();
    swaps.set(key, job);
    job.catch(() => swaps.delete(key));
    return job;
}

// Own-room renders made this visit, for the current photo only, so the lot
// page and the compare sheet never pay twice for the same picture. Memory
// only; a new photo empties it.
let ownJobs = { photo: null, jobs: new Map() };

/**
 * A lot on one surface of a photo of the buyer's own room. The result is
 * returned, never saved.
 *
 * Two lots compared in the buyer's room are each an edit of the SAME framed
 * photo, so both come back in the same frame and line up on the slider.
 *
 * @returns {Promise<{url, before, w, h, changed}>}
 */
export function renderOwnRoom(lot, surface, roomPhoto, { fresh = false, layout = null } = {}) {
    if (ownJobs.photo !== roomPhoto) ownJobs = { photo: roomPhoto, jobs: new Map() };
    const { jobs } = ownJobs;
    // `layout`: the buyer's book-match (Book-match view); else the surface's usual slab count.
    const slabs = layout || surface.slabs;
    const key = `${lot.id}|${surface.id}|${layoutKey(slabs)}`;
    if (fresh || !jobs.has(key)) {
        const job = swapInPhoto({ lot, photo: roomPhoto, surface: surface.label, where: surface.where, slabs });
        jobs.set(key, job);
        job.catch(() => jobs.delete(key));
    }
    return jobs.get(key);
}

// ─── Several stones, one render ────────────────────────────────────────────
// "Floor in stone 1, table top in stone 2, highlighter wall in stone 3", all in
// one edit (server/mixStones.js). The model takes 3 images at most, so: the
// photo, a guide copy with a coloured numbered box per marked surface, and one
// materials board with every stone framed in its colour and numbered.

export const MIX_COLORS = [
    { name: 'RED', hex: '#E5484D' },
    { name: 'BLUE', hex: '#3E63DD' },
    { name: 'GREEN', hex: '#2F9E5B' },
];

const badge = (ctx, x, y, r, color, n) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(r * 1.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), x, y + 1);
};

/**
 * A marked area's four corners (0..1), clockwise from top left. The buyer
 * drags a rectangle, then can drag each corner to fit a wall seen at an angle
 * (decided 2026-11-15), so `region.pts` may hold any four-sided shape; x, y, w
 * and h are always its bounding box.
 */
export const regionCorners = (r) =>
    r.pts || [
        { x: r.x, y: r.y },
        { x: r.x + r.w, y: r.y },
        { x: r.x + r.w, y: r.y + r.h },
        { x: r.x, y: r.y + r.h },
    ];

// The area's outline as a canvas path, in a W x H picture.
const traceRegion = (ctx, r, W, H) => {
    ctx.beginPath();
    regionCorners(r).forEach((p, i) => (i ? ctx.lineTo(p.x * W, p.y * H) : ctx.moveTo(p.x * W, p.y * H)));
    ctx.closePath();
};

// Where each surface is, as a separate colour MAP: a black canvas the shape
// of the photo with a solid coloured rectangle per surface (bigger ones first,
// so a table sits on top of the floor around it). Marks drawn ON a copy of the
// photo were copied into the result twice: a tinted box turned a TV solid
// blue, and outline boxes came back drawn into the room. A map looks nothing
// like the room, so there is nothing to copy.
async function drawMap(frame, items) {
    const c = document.createElement('canvas');
    c.width = frame.w;
    c.height = frame.h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, frame.w, frame.h);
    items
        .map((it, i) => ({ it, i }))
        .filter(({ it }) => it.region)
        .sort((a, b) => b.it.region.w * b.it.region.h - a.it.region.w * a.it.region.h)
        .forEach(({ it, i }) => {
            ctx.fillStyle = MIX_COLORS[i].hex;
            traceRegion(ctx, it.region, frame.w, frame.h);
            ctx.fill();
        });
    return c.toDataURL('image/png');
}

// Every stone side by side, each framed in its colour with its number.
async function drawBoard(items) {
    const S = 480;
    const B = 22;
    const c = document.createElement('canvas');
    c.width = items.length * (S + 2 * B) + (items.length - 1) * 24;
    c.height = S + 2 * B;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    for (const [i, it] of items.entries()) {
        const x0 = i * (S + 2 * B + 24);
        ctx.fillStyle = MIX_COLORS[i].hex;
        ctx.fillRect(x0, 0, S + 2 * B, S + 2 * B);
        const src = await urlToDataUrl(it.lot.image);
        if (src) {
            const img = await loadImage(src);
            const k = Math.max(S / img.naturalWidth, S / img.naturalHeight);
            const sw = S / k;
            const sh = S / k;
            ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x0 + B, B, S, S);
        }
        badge(ctx, x0 + B + 34, B + 34, 26, MIX_COLORS[i].hex, i + 1);
    }
    return c.toDataURL('image/jpeg', 0.9);
}

const canvasOf = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
};

// A box on a grid of w×h cells: all of it, or (inset 0.15) its inner part,
// which is what judges whether the surface changed. A four-sided area whose
// corners were moved also carries its outline (`poly`, shrunk the same way
// toward its centre), so only cells inside the shape count.
const boxCells = (region, w, h, inset = 0) => {
    const pts = regionCorners(region);
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const k = 1 - 2 * inset;
    const poly = pts.map((p) => ({ x: (cx + (p.x - cx) * k) * w, y: (cy + (p.y - cy) * k) * h }));
    const xs = poly.map((p) => p.x);
    const ys = poly.map((p) => p.y);
    return {
        x0: Math.max(0, Math.floor(Math.min(...xs))),
        x1: Math.min(w, Math.ceil(Math.max(...xs))),
        y0: Math.max(0, Math.floor(Math.min(...ys))),
        y1: Math.min(h, Math.ceil(Math.max(...ys))),
        poly: region.pts ? poly : null,
    };
};
// Even-odd point-in-polygon test.
const inPoly = (poly, x, y) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i];
        const b = poly[j];
        if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
};
const inCells = (c, x, y) => x >= c.x0 && x < c.x1 && y >= c.y0 && y < c.y1 && (!c.poly || inPoly(c.poly, x + 0.5, y + 0.5));

// A cell whose pixels moved by more than this on average has changed.
const CELL_MOVED = 22;

/**
 * What changed between two pictures in one frame, cell by cell on a 128-wide
 * grid: the mean colour difference of the PIXELS in each cell (4×4 samples a
 * cell), and each cell's colour after (`color`) and before (`was`).
 *
 * Per pixel, not cell averages: in a dining room the new floor stone was close
 * in tone to the old floor, and comparing cell averages saw 31% of the floor
 * box change although all of it had (the veins are new, the average colour
 * barely moved). Per pixel, unchanged areas score 5–10 (the model redraws the
 * whole picture) and new stone 20–45 and up.
 */
async function changeGrid(beforeUrl, afterUrl, w = 128) {
    const [a, b] = await Promise.all([loadImage(beforeUrl), loadImage(afterUrl)]);
    const h = Math.max(8, Math.round((w * a.naturalHeight) / a.naturalWidth));
    const S = 4;
    const pa = tinyPixels(a, w * S, h * S);
    const pb = tinyPixels(b, w * S, h * S);
    const diff = new Float32Array(w * h);
    const color = new Float32Array(w * h * 3);
    const was = new Float32Array(w * h * 3);
    const share = 1 / (S * S);
    for (let y = 0; y < h * S; y++) {
        const row = Math.floor(y / S) * w;
        for (let x = 0; x < w * S; x++) {
            const i = (y * w * S + x) * 4;
            const c = row + Math.floor(x / S);
            diff[c] += Math.hypot(pa[i] - pb[i], pa[i + 1] - pb[i + 1], pa[i + 2] - pb[i + 2]) * share;
            color[c * 3] += pb[i] * share;
            color[c * 3 + 1] += pb[i + 1] * share;
            color[c * 3 + 2] += pb[i + 2] * share;
            was[c * 3] += pa[i] * share;
            was[c * 3 + 1] += pa[i + 1] * share;
            was[c * 3 + 2] += pa[i + 2] * share;
        }
    }
    return { w, h, color, was, moved: (c) => diff[c] > CELL_MOVED };
}

// Shares of a box's inner part that changed. Measured on one dining room: a
// wall fully re-done 100%, a floor fully re-done with chairs standing on it
// 64%, a wall re-done only at one end 35%.
const CHANGED_FROM = 0.1; // below this, the surface did not change
const DONE_FROM = 0.5; // below this, it is unchanged or only partly done, and gets a pass of its own

/**
 * How much of each boxed surface changed: the share of its box's inner part,
 * leaving out the inner part of any SMALLER box inside it, so a table top
 * changing does not count as the floor around it changing.
 * @returns {(number|null)[]} 0..1 per item; null with no box to judge by
 */
function coverEach(grid, items) {
    const { w, h, moved } = grid;
    const cores = items.map((it) => (it.region ? boxCells(it.region, w, h, 0.15) : null));
    const area = (r) => (r ? r.w * r.h : Infinity);
    return items.map((it, i) => {
        if (!cores[i]) return null;
        const smaller = cores.filter((c, j) => c && j !== i && area(items[j].region) < area(it.region));
        let total = 0;
        let changed = 0;
        for (let y = cores[i].y0; y < cores[i].y1; y++)
            for (let x = cores[i].x0; x < cores[i].x1; x++) {
                if (!inCells(cores[i], x, y) || smaller.some((c) => inCells(c, x, y))) continue;
                total++;
                if (moved(y * w + x)) changed++;
            }
        return total ? changed / total : null;
    });
}

// Surfaces that carry on past a loosely drawn box: a floor runs on under the
// table and chairs; stairs and "all the bathroom walls" are several pieces.
const SPREADS = new Set(['floor', 'stairs', 'bathwalls']);
// A floor stays below this share of the picture's height, unless its box goes higher.
const FLOOR_TOP = 0.45;
// How far (in hue, r/g/b shares) a cell may be from what the floor looked like
// before, at least, for the floor to spread into it.
const HUE_GATE = 0.03;
const NEIGHBOURS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
];

/**
 * Keep each stone on the surface its box marks, and put back anything else the
 * render changed. Measured on a dining room with the floor and two walls
 * boxed: the model clad the unmarked wood panel next to one wall, once in the
 * floor stone and once in the second wall's stone (which it left off the wall
 * the buyer boxed). That panel ran down to the floor, so "keep whatever joins
 * up with the floor" kept it.
 *
 * So every changed cell is claimed by whichever grows into it first, nearest
 * colour first (seeded region growing):
 *   - each surface, from the change inside its box, in its stone's colour.
 *     Anything but a floor (or stairs, or all the bathroom walls) stops at
 *     its box, with a soft edge. A floor may run
 *     on under the furniture, but not into the upper part of the picture: in
 *     a photo taken at eye level the floor stays below the middle;
 *   - STRAY, from every change that no surface may reach, in the colour next
 *     to it. A stray panel that runs down to the floor is the panel's colour
 *     all the way down, so it is claimed as stray before the floor gets there.
 * Changes inside a box are kept; outside, only what a surface claimed.
 */
export async function dropStrays(frame, baseUrl, url, items) {
    const { w, h, color, was, moved } = await changeGrid(baseUrl, url);
    const N = w * h;
    const STRAY = items.length;
    const owner = new Int16Array(N).fill(-1);
    const inBox = new Uint8Array(N);
    const boxes = items.map((it) => boxCells(it.region, w, h));
    // Anything but a floor stops at its box. A margin round the box (for a box
    // drawn a little short) was tried: when the model ran the stone on past the
    // box, the margin kept a ragged strip of it (a black wall with a jagged
    // bite out of the wood beside it), worse than a straight edge at the box.
    const reach = items.map((it, k) => {
        const b = boxes[k];
        if (SPREADS.has(it.surface.id)) return { x0: 0, x1: w, y0: it.surface.id === 'floor' ? Math.min(b.y0, Math.floor(h * FLOOR_TOP)) : 0, y1: h };
        return b;
    });
    const at = (c) => [c % w, Math.floor(c / w)];
    const dist = (c, rgb) => Math.hypot(color[c * 3] - rgb[0], color[c * 3 + 1] - rgb[1], color[c * 3 + 2] - rgb[2]);
    const rgbOf = (c) => [color[c * 3], color[c * 3 + 1], color[c * 3 + 2]];

    // Seeds. A cell in two boxes belongs to the smaller one.
    const bySize = items.map((_, k) => k).sort((a, b) => items[b].region.w * items[b].region.h - items[a].region.w * items[a].region.h);
    for (const k of bySize) {
        const b = boxes[k];
        for (let y = b.y0; y < b.y1; y++)
            for (let x = b.x0; x < b.x1; x++) {
                if (!inCells(b, x, y)) continue;
                inBox[y * w + x] = 1;
                if (moved(y * w + x)) owner[y * w + x] = k;
            }
    }
    for (let c = 0; c < N; c++) {
        if (!moved(c) || inBox[c]) continue;
        const [x, y] = at(c);
        if (!reach.some((r) => inCells(r, x, y))) owner[c] = STRAY;
    }
    // Each surface's colour as it came out inside its box.
    const coreOf = (k) => {
        const core = boxCells(items[k].region, w, h, 0.15);
        const cells = [];
        for (let y = core.y0; y < core.y1; y++)
            for (let x = core.x0; x < core.x1; x++) if (owner[y * w + x] === k && inCells(core, x, y)) cells.push(y * w + x);
        return cells;
    };
    const stone = items.map((_, k) => {
        const cells = coreOf(k);
        if (cells.length < 4) return null;
        return [0, 1, 2].map((ch) => cells.reduce((sum, c) => sum + color[c * 3 + ch], 0) / cells.length);
    });
    // What a spreading surface (a floor) looked like BEFORE, as a hue (shade
    // takes out brightness: the same floor in sun and under the table). A floor
    // only spreads into cells that looked like it: measured, the model ran a
    // wall's stone down to the floor over wood panelling, and the floor claimed
    // the bottom of it, because new floor and new wall stone looked alike; the
    // beige floor and the wood had not.
    const hueOf = (arr, c) => {
        const sum = arr[c * 3] + arr[c * 3 + 1] + arr[c * 3 + 2] + 1;
        return [arr[c * 3] / sum, arr[c * 3 + 1] / sum, arr[c * 3 + 2] / sum];
    };
    const hueDist = (c, hue) => {
        const [r, g, b] = hueOf(was, c);
        return Math.hypot(r - hue[0], g - hue[1], b - hue[2]);
    };
    const looked = items.map((it, k) => {
        if (!SPREADS.has(it.surface.id)) return null;
        const cells = coreOf(k);
        if (cells.length < 4) return null;
        const hue = [0, 1, 2].map((ch) => cells.reduce((sum, c) => sum + hueOf(was, c)[ch], 0) / cells.length);
        const spread = Math.sqrt(cells.reduce((sum, c) => sum + hueDist(c, hue) ** 2, 0) / cells.length);
        return { hue, gate: Math.max(HUE_GATE, 2.5 * spread) };
    });

    // Grow, nearest colour first (a bucket queue on the colour distance).
    const buckets = Array.from({ length: 512 }, () => []);
    let lo = 512;
    const offer = (from) => {
        const k = owner[from];
        const [x, y] = at(from);
        for (const [dx, dy] of NEIGHBOURS) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const n = ny * w + nx;
            if (owner[n] !== -1 || !moved(n) || (k !== STRAY && !inCells(reach[k], nx, ny))) continue;
            if (k !== STRAY && looked[k] && hueDist(n, looked[k].hue) > looked[k].gate) continue;
            const i = Math.min(511, Math.round(dist(n, k !== STRAY && stone[k] ? stone[k] : rgbOf(from))));
            buckets[i].push(n, k);
            if (i < lo) lo = i;
        }
    };
    for (let c = 0; c < N; c++) if (owner[c] !== -1) offer(c);
    for (;;) {
        while (lo < 512 && !buckets[lo].length) lo++;
        if (lo >= 512) break;
        const k = buckets[lo].pop();
        const n = buckets[lo].pop();
        if (owner[n] !== -1) continue;
        owner[n] = k;
        offer(n);
    }

    // What goes back: changed outside the boxes and not claimed by a surface,
    // and one cell round it (not into anything kept), so its fringe goes back too.
    const keep = (c) => inBox[c] || (owner[c] >= 0 && owner[c] !== STRAY);
    const back = new Uint8Array(N);
    let strays = 0;
    for (let c = 0; c < N; c++)
        if (moved(c) && !keep(c)) {
            back[c] = 1;
            strays++;
        }
    if (!strays) return { url, strays: 0 };
    const grown = back.slice();
    for (let c = 0; c < N; c++) {
        if (!back[c]) continue;
        const x = c % w;
        const y = (c - x) / w;
        for (const [dx, dy] of NEIGHBOURS) {
            const nx = x + dx;
            const ny = y + dy;
            // Into a box too: the boxes are cut back out to the pixel below,
            // so the mask is fully on right up to a box's edge.
            const n = ny * w + nx;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h && (inBox[n] || !keep(n))) grown[n] = 1;
        }
    }
    const small = canvasOf(w, h);
    const sctx = small.getContext('2d');
    const px = sctx.createImageData(w, h);
    for (let c = 0; c < N; c++) if (grown[c]) px.data.fill(255, c * 4, c * 4 + 4);
    sctx.putImageData(px, 0, 0);

    const [base, top] = await Promise.all([loadImage(baseUrl), loadImage(url)]);
    const { w: W, h: H } = frame;
    const mask = canvasOf(W, H);
    const m = mask.getContext('2d');
    m.imageSmoothingQuality = 'high';
    m.filter = `blur(${Math.round(W / w / 2)}px)`;
    m.drawImage(small, 0, 0, W, H);
    // Inside a box is always kept, to the pixel: cut the boxes out of the mask
    // so a stone stopped at its box ends on the line the buyer drew, not on
    // the cell grid's soft ramp.
    m.filter = 'blur(1px)';
    m.globalCompositeOperation = 'destination-out';
    m.fillStyle = '#000';
    items.forEach(({ region: r }) => {
        traceRegion(m, r, W, H);
        m.fill();
    });
    const layer = canvasOf(W, H);
    const l = layer.getContext('2d');
    l.drawImage(base, 0, 0, W, H);
    l.globalCompositeOperation = 'destination-in';
    l.drawImage(mask, 0, 0);
    const out = canvasOf(W, H);
    const o = out.getContext('2d');
    o.drawImage(top, 0, 0, W, H);
    o.drawImage(layer, 0, 0);
    return { url: out.toDataURL('image/jpeg', 0.9), strays: strays / N };
}

/**
 * Ask a text model where each surface is, as boxes (server/locateSurfaces.js).
 * @returns {Promise<Array<object|null>>} a region per item, or null where not found
 */
async function locateIn(frameUrl, items) {
    const res = await fetch('/__proto/locate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: frameUrl, surfaces: items.map((it, i) => ({ number: i + 1, label: it.surface.label, where: it.surface.where })) }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || `Locate failed (${res.status})`);
    return items.map((_, i) => (j.boxes || []).find((b) => b.number === i + 1)?.region || null);
}

// One multi-stone edit of `baseUrl` (which is in `frame`). Returns a JPEG in the frame.
async function renderMix(frame, baseUrl, items, extra = {}) {
    const [guide, board] = await Promise.all([items.some((it) => it.region) ? drawMap(frame, items) : null, drawBoard(items)]);
    const res = await fetch('/__proto/mix-stones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            roomImage: baseUrl,
            guideImage: guide,
            boardImage: board,
            aspectRatio: frame.ar,
            // A boxed surface is defined by its box, not by the generic
            // description ("the most prominent wall" may be a different wall
            // from the one the buyer boxed). `label` numbers repeats ("Feature
            // wall 2") so two walls are two jobs.
            items: items.map((it, i) => ({
                number: i + 1,
                colorName: MIX_COLORS[i].name,
                surface: it.label || it.surface.label,
                kind: it.surface.label,
                where: it.region ? `the ${it.surface.label.toLowerCase()} area the buyer marked` : it.surface.where,
                stone: plainStone(it.lot),
                hasRegion: !!it.region,
            })),
            ...extra,
        }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.url) throw new Error(j.error || `Render failed (${res.status})`);
    return intoFrame(j.url, frame);
}

const nearestFrame = (aspect) => FRAMES.reduce((best, f) => (Math.abs(Math.log(f.w / f.h / aspect)) < Math.abs(Math.log(best.w / best.h / aspect)) ? f : best));

// `top` laid over `base` only inside the boxes, with soft edges.
async function pasteInBoxes(baseUrl, topUrl, regions, frame) {
    const [base, top] = await Promise.all([loadImage(baseUrl), loadImage(topUrl)]);
    const { w: W, h: H } = frame;
    const soft = Math.round(Math.max(W, H) * 0.008);
    const mask = canvasOf(W, H);
    const m = mask.getContext('2d');
    m.filter = `blur(${soft}px)`;
    m.fillStyle = '#fff';
    regions.forEach((r) => {
        traceRegion(m, r, W, H);
        m.fill();
    });
    const layer = canvasOf(W, H);
    const l = layer.getContext('2d');
    l.drawImage(top, 0, 0, W, H);
    l.globalCompositeOperation = 'destination-in';
    l.drawImage(mask, 0, 0);
    const out = canvasOf(W, H);
    const o = out.getContext('2d');
    o.drawImage(base, 0, 0, W, H);
    o.drawImage(layer, 0, 0);
    return out.toDataURL('image/jpeg', 0.9);
}

/**
 * Put one stone exactly inside one box, when the combined render missed it.
 * Measured: told "exactly the blue area", the model put the stone on the wood
 * panelling NEXT to the boxed wall, twice. So: cut the area around the box out
 * (in the shape of one of the model's frames, so it comes back unshifted), let
 * the single-stone swap re-surface the surface that fills that cut-out, and
 * paste the result back into the picture inside the box only.
 */
async function fixInBox(frame, url, it) {
    const r = it.region;
    const { w: W, h: H } = frame;
    const fr = nearestFrame((r.w * W) / (r.h * H));
    let cw = r.w * W * 1.35;
    let ch = r.h * H * 1.35;
    if (cw / ch > fr.w / fr.h) ch = (cw * fr.h) / fr.w;
    else cw = (ch * fr.w) / fr.h;
    const k = Math.min(1, W / cw, H / ch);
    cw *= k;
    ch *= k;
    const cx = (r.x + r.w / 2) * W;
    const cy = (r.y + r.h / 2) * H;
    const x0 = Math.min(Math.max(0, cx - cw / 2), W - cw);
    const y0 = Math.min(Math.max(0, cy - ch / 2), H - ch);

    const img = await loadImage(url);
    const crop = canvasOf(fr.w, fr.h);
    crop.getContext('2d').drawImage(img, x0, y0, cw, ch, 0, 0, fr.w, fr.h);
    const kind = it.surface.label.toLowerCase();
    const out = await swapInPhoto({
        lot: it.lot,
        photo: crop.toDataURL('image/jpeg', 0.92),
        surface: it.surface.label,
        where: `the ${kind} that fills the middle of this picture (cover all of it that is visible)`,
        slabs: it.surface.slabs,
    });
    if (!out.changed) return { url, changed: false, renders: out.renders };

    const edited = await loadImage(out.url);
    const whole = canvasOf(W, H);
    const w = whole.getContext('2d');
    w.drawImage(img, 0, 0, W, H);
    w.drawImage(edited, 0, 0, edited.naturalWidth, edited.naturalHeight, x0, y0, cw, ch);
    const merged = await pasteInBoxes(url, whole.toDataURL('image/jpeg', 0.92), [r], frame);
    return { url: merged, changed: true, renders: out.renders };
}

// Boxes that cannot be right for the surface they claim to be. Measured: the
// locator once boxed the "floor" as 0–100% across and 7–100% down, i.e. nearly
// the whole room.
const plausible = (surfaceId, r) => {
    if (!r) return false;
    const area = r.w * r.h;
    if (area > 0.7) return false;
    if (surfaceId === 'floor' || surfaceId === 'stairs') return r.y >= 0.3; // floors start in the lower part
    if (['counter', 'vanity', 'table'].includes(surfaceId)) return area <= 0.4;
    return true;
};

/**
 * Suggest a box for each surface (a cheap text call), for the buyer to check
 * and correct before rendering. Implausible boxes are dropped.
 * @returns {Promise<Array<object|null>>} a region per item, or null
 */
export async function suggestBoxes(photo, items) {
    const frame = await toFrame(photo);
    const found = await locateIn(frame.url, items);
    return found.map((r, i) => (plausible(items[i].surface.id, r) ? r : null));
}

/**
 * Several stones on several surfaces of one picture.
 *
 *   MARKED surfaces (the buyer drew or accepted a box) all go into ONE render,
 *   with a colour map of where each one is. Whatever it changed outside the
 *   boxes is put back (dropStrays). Each box is then checked, and any that did
 *   not change, or changed only in part, get one focused pass of their own.
 *
 *   UNMARKED surfaces are then done one at a time with the single-stone swap
 *   (the compare / "Your room" path), on the result so far. Without a box the
 *   combined render was not reliable: with a floor and a wall it changed only
 *   one of them, and there was no way to tell which.
 *
 * @param items   [{ lot, surface (an OWN_SURFACES entry), region?: {x,y,w,h} 0..1 }], up to 3
 * @param onStage ('rendering' | 'fixing' | 'finishing' | 'single', labels?) => void, for the progress note
 * @returns {Promise<{ url, before, w, h, changed: (boolean|null)[], partly: boolean[], renders: number }>}
 */
export async function mixStonesInPhoto({ photo, items, onStage }) {
    const frame = await toFrame(photo);
    const changed = items.map(() => null);
    const partly = items.map(() => false);
    const markedIdx = items.map((it, i) => (it.region ? i : -1)).filter((i) => i >= 0);
    const unmarkedIdx = items.map((it, i) => (it.region ? -1 : i)).filter((i) => i >= 0);
    let url = frame.url;
    let renders = 0;

    if (markedIdx.length) {
        const marked = markedIdx.map((i) => items[i]);
        onStage?.(
            'rendering',
            marked.map((it) => it.surface.label),
        );
        url = await renderMix(frame, frame.url, marked);
        renders++;
        const first = coverEach(await changeGrid(frame.url, url), marked);
        for (const [k, i] of markedIdx.entries()) {
            if (first[k] === null || first[k] >= DONE_FROM) continue;
            const it = items[i];
            const label = it.label || it.surface.label;
            console.warn(`[renders] mixed render: only ${Math.round(first[k] * 100)}% of the ${label} box changed, a pass for it alone`);
            onStage?.(first[k] < CHANGED_FROM ? 'fixing' : 'finishing', [label]);
            try {
                const out = await fixInBox(frame, url, it);
                renders += out.renders;
                if (out.changed) url = out.url;
            } catch (err) {
                console.warn(`[renders] could not fix the ${label}:`, err.message);
            }
        }
        // After the fixes, so every box has its stone to compare with.
        const raw = url;
        const kept = await dropStrays(frame, frame.url, url, marked);
        if (kept.strays) console.info(`[renders] mixed render: put back ${(kept.strays * 100).toFixed(1)}% of the picture, changed outside the boxes`);
        url = kept.url;
        // Dev only: keep the last pictures in the tab, so the clean-up can be
        // tuned on them (dropStrays is exported for that) without new renders.
        if (import.meta.env.DEV) {
            try {
                sessionStorage.setItem(
                    'mixtest',
                    JSON.stringify({
                        base: frame.url,
                        raw,
                        final: url,
                        items: marked.map((it) => ({ surface: { id: it.surface.id, label: it.surface.label }, region: it.region })),
                    }),
                );
            } catch {
                /* too big for the tab's storage */
            }
        }
        const after = coverEach(await changeGrid(frame.url, url), marked);
        markedIdx.forEach((i, k) => {
            changed[i] = after[k] === null ? null : after[k] >= CHANGED_FROM;
            partly[i] = after[k] !== null && after[k] >= CHANGED_FROM && after[k] < DONE_FROM;
        });
    }

    for (const i of unmarkedIdx) {
        const it = items[i];
        onStage?.('single', [it.surface.label]);
        try {
            const out = await swapInPhoto({ lot: it.lot, photo: url, surface: it.surface.label, where: it.surface.where, slabs: it.surface.slabs });
            renders += out.renders;
            changed[i] = out.changed;
            if (out.changed) url = out.url;
        } catch (err) {
            console.warn(`[renders] could not do the ${it.surface.label}:`, err.message);
            changed[i] = false;
        }
    }
    return { url, before: frame.url, w: frame.w, h: frame.h, changed, partly, renders };
}

/** Whether this lot is already done (or under way) on this surface of this photo. */
export const hasOwnRender = (lot, surface, roomPhoto, layout = null) =>
    ownJobs.photo === roomPhoto && ownJobs.jobs.has(`${lot.id}|${surface.id}|${layoutKey(layout || surface.slabs)}`);

/**
 * Read an uploaded room photo and put it straight into the model's nearest
 * frame (see FRAMES), so what the buyer sees as "before" is exactly what the
 * edits are made from.
 */
export const prepareRoomPhoto = (file) =>
    new Promise((resolve, reject) => {
        if (!file || !file.type?.startsWith('image/')) {
            reject(new Error('That file is not a photo. Please choose a JPG or PNG.'));
            return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read that file. Please try another photo.'));
        reader.onload = () =>
            toFrame(reader.result)
                .then((f) => resolve(f.url))
                .catch(() => reject(new Error('That image could not be opened. Please try a JPG or PNG.')));
        reader.readAsDataURL(file);
    });

// Stones to show off first in each room, so the hero does not run six white
// marbles in a row. Rooms not listed use the default order.
const SHOWCASE = {
    kitchen: ['Granite', 'Marble', 'Dolomite', 'Onyx'],
    dining: ['Marble', 'Granite', 'Onyx', 'Dolomite'],
    balcony: ['Sandstone', 'Granite', 'Travertine'],
    default: ['Marble', 'Onyx', 'Travertine', 'Dolomite', 'Granite'],
};

/**
 * Which lots to render next in a room: ones that can finish it, not rendered
 * there yet, spread across stone families. Within a family, lots with the
 * fewest renders anywhere come first (then the best discount), so each room
 * shows different stones instead of the same four everywhere. `queued` counts
 * renders already planned in this batch, keyed by lot id.
 */
export function pickForScene(lots, renders, sceneId, n, queued = new Map()) {
    const families = SHOWCASE[sceneId] || SHOWCASE.default;
    const used = (l) => Object.keys(renders[l.id] || {}).filter((k) => k !== 'name').length + (queued.get(l.id) || 0);
    const open = lots
        .filter((l) => canDo(l, sceneId) && !renders[l.id]?.[sceneId] && families.includes(l.family))
        .sort((a, b) => used(a) - used(b) || b.discountPct - a.discountPct);
    const byFamily = families.map((f) => open.filter((l) => l.family === f));
    const out = [];
    // The whole-bathroom card needs one bathroom render of a lot that big.
    if (sceneId === 'bathroom' && !lots.some((l) => l.sqft >= 130 && renders[l.id]?.bathroom)) {
        const big = open.find((l) => l.sqft >= 130);
        if (big) out.push(big);
    }
    for (let i = 0; out.length < n && byFamily.some((g) => g.length > i); i++) {
        for (const g of byFamily) {
            if (out.length >= n) break;
            const l = g.at(i);
            if (l && !out.includes(l)) out.push(l);
        }
    }
    return out.slice(0, n);
}

// Pause between batch renders. Measured 9 Nov 2026: back-to-back image
// requests were refused ("busy", 429) after the first one or two, on the
// us-central1 AND the global endpoint alike, so the limit is on how fast this
// project asks, not on one region. Spacing them out wastes fewer calls and
// leaves room for the live site's Visualise button, which shares the limit.
const BATCH_GAP_MS = 20000;

/**
 * Render a list of {lot, sceneId} one at a time, with a gap between them
 * (never in parallel: a burst trips the limit), reporting as it goes.
 */
export async function runQueue(items, { onStart, onDone, onFail }) {
    for (const [i, it] of items.entries()) {
        if (i > 0) await sleep(BATCH_GAP_MS);
        const t0 = Date.now();
        onStart(it);
        try {
            const url = await renderLot(it.lot, it.sceneId, { styleId: it.styleId });
            onDone(it, url, Date.now() - t0);
        } catch (err) {
            onFail(it, err.message || String(err), Date.now() - t0);
        }
    }
}
