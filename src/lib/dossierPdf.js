import jsPDF from 'jspdf';
import { aiVisualizer } from './aiVisualizer';
import { urlToDataUrl } from '../utils/urlToDataUrl';

// ─── Application options — identical to AIVisualizationModal ─────────────────
export const APPLICATION_OPTIONS = [
    { value: 'flooring',        label: 'Flooring',           room: 'Living Room',     style: 'Contemporary' },
    { value: 'kitchen counter', label: 'Kitchen Counter',     room: 'Kitchen',         style: 'Modern' },
    { value: 'bathroom wall',   label: 'Bathroom Wall',       room: 'Bathroom',        style: 'Luxury Spa' },
    { value: 'feature wall',    label: 'Feature Wall',        room: 'Living Room',     style: 'Modern Luxury' },
    { value: 'dining table',    label: 'Dining Table',        room: 'Dining Room',     style: 'Contemporary' },
    { value: 'bathroom floor',  label: 'Bathroom Floor',      room: 'Bathroom',        style: 'Minimalist' },
    { value: 'staircase',       label: 'Staircase',           room: 'Foyer',           style: 'Grand Classical' },
    { value: 'outdoor terrace', label: 'Outdoor Terrace',     room: 'Terrace',         style: 'Resort Luxury' },
];

// ─── Generate one render — exact same method as architect visualizer ──────────
export async function generateRender(stoneImageUrl, stoneName, application) {
    const appObj = APPLICATION_OPTIONS.find(a => a.value === application) || APPLICATION_OPTIONS[0];
    return aiVisualizer.generateRoomImage({
        stoneName,
        roomType: appObj.room,
        stoneType: 'Natural Stone',
        application: appObj.value,
        imageUrl: stoneImageUrl,
        roomStyle: appObj.style,
    });
}

// ─── Helper: load image as base64 from File or URL ───────────────────────────
export function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ─── Helper: build a two-way bookmatch composite from a slab image ───────────
// Draws the slab and its horizontal mirror side by side, so the veining meets
// at the centre seam exactly like a real bookmatched installation.
function makeBookmatch(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth, h = img.naturalHeight;
            const c = document.createElement('canvas');
            c.width = w * 2;
            c.height = h;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(img, -w * 2, 0);
            ctx.restore();
            try { resolve({ dataUrl: c.toDataURL('image/jpeg', 0.92), ar: (w * 2) / h }); }
            catch { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
    });
}

// ─── Helper: measure an image's natural aspect ratio ─────────────────────────
function getImageAR(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
        img.onerror = () => resolve(null);
        img.src = dataUrl;
    });
}

// ─── Helper: centre-crop an image to a target aspect ratio ───────────────────
// jsPDF's addImage stretches to fit, which distorts slabs and renders. This
// crops the source to the destination box's aspect first, so every image in
// the dossier is embedded cover-style with no distortion.
function coverCrop(dataUrl, targetAR) {
    return new Promise((resolve) => {
        if (!dataUrl) return resolve(null);
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth, h = img.naturalHeight;
            const srcAR = w / h;
            let sx = 0, sy = 0, sw = w, sh = h;
            if (srcAR > targetAR) {
                sw = h * targetAR;
                sx = (w - sw) / 2;
            } else {
                sh = w / targetAR;
                sy = (h - sh) / 2;
            }
            const c = document.createElement('canvas');
            c.width = Math.round(sw);
            c.height = Math.round(sh);
            c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
            try { resolve(c.toDataURL('image/jpeg', 0.92)); }
            catch { resolve(dataUrl); }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

// ─── Font loader ──────────────────────────────────────────────────────────────
// Fetches Cormorant Garamond + Space Mono TTFs from /public/fonts and registers
// them with the jsPDF instance. Cached at module scope so subsequent renders
// don't re-fetch.
const _fontCache = {};
async function loadFont(path) {
    if (_fontCache[path]) return _fontCache[path];
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Font fetch failed: ${path}`);
    const buf = await res.arrayBuffer();
    // Convert ArrayBuffer → base64 (without using btoa on long binary strings)
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    const b64 = btoa(binary);
    _fontCache[path] = b64;
    return b64;
}

async function registerDossierFonts(pdf) {
    const fonts = [
        { vfs: 'Cormorant-Regular.ttf',  family: 'Cormorant', style: 'normal', path: '/fonts/cormorant-variable.ttf' },
        { vfs: 'Cormorant-Italic.ttf',   family: 'Cormorant', style: 'italic', path: '/fonts/cormorant-italic-variable.ttf' },
        { vfs: 'SpaceMono-Regular.ttf',  family: 'SpaceMono', style: 'normal', path: '/fonts/spacemono-regular.ttf' },
        { vfs: 'SpaceMono-Bold.ttf',     family: 'SpaceMono', style: 'bold',   path: '/fonts/spacemono-bold.ttf' },
    ];
    for (const f of fonts) {
        const b64 = await loadFont(f.path);
        pdf.addFileToVFS(f.vfs, b64);
        pdf.addFont(f.vfs, f.family, f.style);
    }
}

// ─── PDF builder ─────────────────────────────────────────────────────────────
// Implements the "Ston Stone Dossier" Claude Design (1920×1080 deck) as a
// landscape 16:9 PDF. Each design slide = one PDF page.
//
// Palette (from design CSS variables):
//   --bg     #0E0D0C   ink-black background
//   --ink    #F2EEE7   primary text
//   --muted  #9A938A   body / lead text
//   --faint  #6A645B   labels, foot text
//   --accent #C8A86E   champagne / brass accent
//   --line   rgba(F2EEE7, .14)
export async function buildPDF(stones) {
    // 16:9 landscape page sized to A4 width (297mm × 167mm).
    // Matches the design's 1920×1080 aspect exactly.
    const W = 297;
    const H = 167;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H] });
    await registerDossierFonts(pdf);
    const PAD_X = 17;   // ≈ design's --pad-x: 110px at proportional scale

    // Font shortcuts — Cormorant Garamond (serif) + Space Mono (technical labels)
    const SERIF = 'Cormorant';
    const MONO = 'SpaceMono';

    // Color helpers (jsPDF wants RGB triples)
    const C = {
        bg:     [14, 13, 12],
        panel:  [22, 20, 18],
        ink:    [242, 238, 231],
        muted:  [154, 147, 138],
        faint:  [106, 100, 91],
        line:   [56, 54, 50],
        lineStrong: [80, 78, 72],
        accent: [200, 168, 110],
    };
    const setText = (rgb) => pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
    const setDraw = (rgb) => pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
    const setFill = (rgb) => pdf.setFillColor(rgb[0], rgb[1], rgb[2]);

    // ── Image helpers ────────────────────────────────────────────────────────
    const embedImage = (dataUrl, x, y, w, h) => {
        const fmt = dataUrl?.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        try { pdf.addImage(dataUrl, fmt, x, y, w, h); } catch (e) { console.warn('addImage failed', e); }
    };

    // urlToDataUrl (image URL → dataURL via canvas, so jsPDF can embed it) now
    // lives in utils/urlToDataUrl.js — the slab compositor needs it too.

    // Tracking text — jsPDF doesn't support letter-spacing natively, so for
    // mono labels we manually space characters by drawing word-by-word with
    // a calculated gap. For now we lean on uppercase + small size to approximate.
    const drawText = (text, x, y, opts = {}) => {
        const {
            font = 'helvetica', style = 'normal', size = 8,
            color = C.ink, align = 'left',
        } = opts;
        pdf.setFont(font, style);
        pdf.setFontSize(size);
        setText(color);
        pdf.text(text, x, y, { align });
    };

    // (v3 design replaced full-bleed dimmed backgrounds with side-by-side
    // image panels — no dimming needed anymore.)

    // Apply character spacing (matches CSS `letter-spacing`) — jsPDF supports
    // this natively via setCharSpace when available. Saves the prior value
    // and restores on exit.
    const withTracking = (mm, fn) => {
        const has = typeof pdf.setCharSpace === 'function';
        if (has) pdf.setCharSpace(mm);
        fn();
        if (has) pdf.setCharSpace(0);
    };

    // Running header (top of every page)
    const drawRunHead = () => {
        const y = 12;
        withTracking(0.6, () => {
            // "STON" in accent
            pdf.setFont(MONO, 'bold');
            pdf.setFontSize(7);
            setText(C.accent);
            pdf.text('STON', PAD_X, y);
            // " — STONE DOSSIER" in ink
            pdf.setFont(MONO, 'normal');
            pdf.setFontSize(7);
            setText(C.faint);
            const stonevoW = pdf.getTextWidth('STON');
            pdf.text('  —  STONE DOSSIER', PAD_X + stonevoW + 1.5, y);
            // Right side
            pdf.text('CONFIDENTIAL · ARCHITECTURAL INTELLIGENCE', W - PAD_X, y, { align: 'right' });
        });
    };

    // Footer bar (bottom of every page except cover variations)
    const drawFoot = (left = 'STON ATELIER', right = '') => {
        const y = H - 10;
        withTracking(0.5, () => {
            pdf.setFont(MONO, 'normal');
            pdf.setFontSize(6.5);
            setText(C.faint);
            pdf.text(left, PAD_X, y);
            if (right) pdf.text(right, W - PAD_X, y, { align: 'right' });
        });
    };

    // Solid black page bg
    const paintBg = () => {
        setFill(C.bg);
        pdf.rect(0, 0, W, H, 'F');
    };

    // Eyebrow: "— EYEBROW TEXT" with a leading accent tick
    const drawEyebrow = (text, x, y) => {
        setDraw(C.accent);
        pdf.setLineWidth(0.4);
        pdf.line(x, y - 1.4, x + 9, y - 1.4);
        withTracking(0.7, () => {
            pdf.setFont(MONO, 'bold');
            pdf.setFontSize(7);
            setText(C.accent);
            pdf.text(text, x + 13, y, { baseline: 'middle' });
        });
    };

    const addPage = (first = false) => {
        if (!first) pdf.addPage();
        paintBg();
    };

    // Gallery stones carry only a public URL (no uploaded file) — fetch their
    // pixels once so the slab strip, raw-slab page and bookmatch all work.
    stones = await Promise.all(stones.map(async (s) => (
        s.imageDataUrl || !s.imageUrl ? s : { ...s, imageDataUrl: await urlToDataUrl(s.imageUrl) }
    )));

    // ── Build flat list of (stone, application) pairs with renders ───────────
    const pairs = [];
    stones.forEach(stone => {
        stone.applications.forEach(app => {
            if (app.renderUrl) pairs.push({ stone, app });
        });
    });

    // Group pairs by application label, preserving first-seen order
    const order = [];
    const groups = {};
    pairs.forEach(({ stone, app }) => {
        const key = (app.label || app.application);
        const upper = key.toUpperCase();
        if (!groups[upper]) { groups[upper] = { label: key, items: [] }; order.push(upper); }
        groups[upper].items.push({ stone, app });
    });

    // Pre-fetch image-panel sources (used on cover + dividers as side panels).
    const coverPanelDataUrl = pairs.length ? await urlToDataUrl(pairs[0].app.renderUrl) : null;
    const dividerPanels = {};
    for (const k of order) {
        dividerPanels[k] = await urlToDataUrl(groups[k].items[0].app.renderUrl);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SLIDE 01 — COVER (split layout: text 1.06fr / image panel .94fr)
    // ─────────────────────────────────────────────────────────────────────────
    addPage(true);
    drawRunHead();

    // Image panel — right side, full body height (cover-cropped, no stretch)
    const bodyTop = 24;            // approx where body starts under run-head
    const bodyBot = H - 18;        // approx where body ends above foot
    const splitRatio = 1.06 / (1.06 + 0.94);
    const splitColX = W * splitRatio; // x boundary between text and image
    if (coverPanelDataUrl) {
        const cropped = await coverCrop(coverPanelDataUrl, (W - splitColX) / (bodyBot - bodyTop));
        embedImage(cropped, splitColX, bodyTop, W - splitColX, bodyBot - bodyTop);
    }
    // Vertical hairline between panels
    setDraw(C.line);
    pdf.setLineWidth(0.2);
    pdf.line(splitColX, bodyTop, splitColX, bodyBot);

    // LEFT — text column, centered vertically in body
    const TXT_RIGHT_PAD = 18;
    const textColW = splitColX - PAD_X - TXT_RIGHT_PAD;
    const textCenterY = (bodyTop + bodyBot) / 2;

    // Eyebrow
    drawEyebrow('VOLUME 01 · PRIVATE COLLECTION', PAD_X, textCenterY - 42);

    // Headline: "Stone Dossier" — italic accent on "Dossier"
    pdf.setFont(SERIF, 'normal');
    pdf.setFontSize(60);
    setText(C.ink);
    pdf.text('Stone', PAD_X, textCenterY - 8);
    pdf.setFont(SERIF, 'italic');
    setText(C.accent);
    pdf.text('Dossier', PAD_X, textCenterY + 18);

    // Sub copy
    pdf.setFont(MONO, 'normal');
    pdf.setFontSize(9);
    setText(C.muted);
    const subText = `${stones.length} specimen${stones.length !== 1 ? 's' : ''}, sourced and matched to application — presented with AI-rendered interiors.`;
    pdf.text(pdf.splitTextToSize(subText, textColW), PAD_X, textCenterY + 30);

    // Meta row (3 columns) — values are wrapped to their column width (max
    // two lines, ellipsis beyond) so long application lists can't run into
    // the neighbouring column.
    const metaY = textCenterY + 48;
    const colGap = textColW / 3;
    const metaCol = (x, label, value) => {
        withTracking(0.4, () => {
            pdf.setFont(MONO, 'normal');
            pdf.setFontSize(6.5);
            setText(C.faint);
            pdf.text(label, x, metaY);
        });
        withTracking(0.6, () => {
            pdf.setFont(MONO, 'bold');
            pdf.setFontSize(8);
            setText(C.ink);
            let lines = pdf.splitTextToSize(value, colGap - 8);
            if (lines.length > 2) {
                lines = lines.slice(0, 2);
                lines[1] = lines[1].replace(/.{2}$/, '') + '…';
            }
            pdf.text(lines, x, metaY + 5);
        });
    };
    metaCol(PAD_X,                   'SPECIMENS',   `${String(stones.length).padStart(2, '0')} — CURATED`);
    metaCol(PAD_X + colGap,          'APPLICATIONS', (order.map(o => groups[o].label).join(' · ') || '—').toUpperCase());
    metaCol(PAD_X + colGap * 2,      'ISSUED',       new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase());

    drawFoot('STON ATELIER', 'PREPARED FOR PRIVATE VIEWING');

    // ─────────────────────────────────────────────────────────────────────────
    // SLIDE 02 — CONTENTS
    // ─────────────────────────────────────────────────────────────────────────
    addPage();
    drawRunHead();

    // LEFT column: eyebrow + title + lead
    drawEyebrow('CONTENTS', PAD_X, 45);

    pdf.setFont(SERIF, 'normal');
    pdf.setFontSize(38);
    setText(C.ink);
    pdf.text('The Collection', PAD_X, 65);

    pdf.setFont(MONO, 'normal');
    pdf.setFontSize(9);
    setText(C.muted);
    const leadText = 'Each specimen is presented as a raw slab, a two-way bookmatch study, and an AI-rendered application, with format, lot availability and indicative price for private clients.';
    pdf.text(pdf.splitTextToSize(leadText, 110), PAD_X, 82);

    // RIGHT column: TOC entries
    const tocX = W * 0.5;
    let tocY = 45;
    setDraw(C.line);
    pdf.setLineWidth(0.3);

    order.forEach((appKey, gi) => {
        pdf.line(tocX, tocY, W - PAD_X, tocY);
        tocY += 13;

        // Number
        pdf.setFont(MONO, 'bold');
        pdf.setFontSize(8.5);
        setText(C.accent);
        pdf.text(String(gi + 1).padStart(2, '0'), tocX, tocY);

        // Application name (serif)
        pdf.setFont(SERIF, 'normal');
        pdf.setFontSize(22);
        setText(C.ink);
        pdf.text(groups[appKey].label, tocX + 18, tocY);

        // Stone names below
        const stoneNames = groups[appKey].items.map(i => i.stone.name).join(' · ');
        pdf.setFont(MONO, 'normal');
        pdf.setFontSize(7);
        setText(C.faint);
        pdf.text(stoneNames, tocX + 18, tocY + 6);

        // Specimen count (right)
        pdf.setFont(MONO, 'normal');
        pdf.setFontSize(7);
        setText(C.muted);
        pdf.text(`${groups[appKey].items.length} SPECIMEN${groups[appKey].items.length !== 1 ? 'S' : ''}`, W - PAD_X, tocY, { align: 'right' });

        tocY += 14;
    });
    pdf.line(tocX, tocY, W - PAD_X, tocY);

    drawFoot('STON ATELIER', '02');

    // ─────────────────────────────────────────────────────────────────────────
    // SLIDES 03+ — DIVIDERS + STONE DETAILS (grouped by application)
    // ─────────────────────────────────────────────────────────────────────────
    let pageNum = 2;

    const addDividerPage = async (appKey, appIndex) => {
        addPage();
        drawRunHead();

        // Same split layout as cover: text left (1.06fr), image panel right (.94fr)
        const dBodyTop = 24;
        const dBodyBot = H - 18;
        const dSplitX = W * (1.06 / (1.06 + 0.94));
        if (dividerPanels[appKey]) {
            const cropped = await coverCrop(dividerPanels[appKey], (W - dSplitX) / (dBodyBot - dBodyTop));
            embedImage(cropped, dSplitX, dBodyTop, W - dSplitX, dBodyBot - dBodyTop);
        }
        setDraw(C.line);
        pdf.setLineWidth(0.2);
        pdf.line(dSplitX, dBodyTop, dSplitX, dBodyBot);

        // LEFT text column, centered vertically
        const centerY = (dBodyTop + dBodyBot) / 2;

        // Ghost numeral — outline-only stroke (matches design's text-stroke)
        pdf.setFont(SERIF, 'normal');
        pdf.setFontSize(88);
        setDraw(C.lineStrong);
        pdf.setLineWidth(0.4);
        if (typeof pdf.setTextRenderingMode === 'function') {
            pdf.setTextRenderingMode(1);
            pdf.text(String(appIndex + 1).padStart(2, '0'), PAD_X, centerY - 22);
            pdf.setTextRenderingMode(0);
        } else {
            setText(C.lineStrong);
            pdf.text(String(appIndex + 1).padStart(2, '0'), PAD_X, centerY - 22);
        }

        // App name (huge serif)
        pdf.setFont(SERIF, 'normal');
        pdf.setFontSize(70);
        setText(C.ink);
        pdf.text(groups[appKey].label, PAD_X, centerY + 14);

        // Tick + specimen count
        const noteY = centerY + 38;
        setDraw(C.accent);
        pdf.setLineWidth(0.6);
        pdf.line(PAD_X, noteY, PAD_X + 16, noteY);
        withTracking(0.6, () => {
            pdf.setFont(MONO, 'bold');
            pdf.setFontSize(8);
            setText(C.muted);
            const n = groups[appKey].items.length;
            pdf.text(`${n} SPECIMEN${n !== 1 ? 'S' : ''}`, PAD_X + 20, noteY + 1);
        });

        pageNum++;
        drawFoot(`APPLICATION ${String(appIndex + 1).padStart(2, '0')}`, String(pageNum).padStart(2, '0'));
    };

    // Split a spec value into a primary number part and a secondary unit part —
    // mirrors the design's `<small>` styling. Examples:
    //   "3200×1600 mm"  → { value: "3200", sub: "×1600 mm" }
    //   "123 m²"        → { value: "123",  sub: "m²" }
    //   "$34,567"       → { value: "$34,567", sub: "" }
    //   "₹25,000/sq.ft" → { value: "₹25,000", sub: "/sq.ft" }
    const splitSpec = (raw) => {
        if (!raw) return { value: '—', sub: '' };
        const s = String(raw).trim();
        // Match: optional currency + digits/commas/dot + optional simple suffix word
        const m = s.match(/^([₹$€£¥]?\s?[\d.,]+)(.*)$/);
        if (!m) return { value: s, sub: '' };
        const value = m[1].trim();
        const sub = m[2].trim();
        return { value, sub };
    };

    // ── Raw slab page — the entire slab, uncropped ────────────────────────────
    // The detail pages show only a cropped strip; this slide shows the whole
    // specimen contained within a frame, exactly as photographed.
    const addRawSlabPage = async (stone) => {
        if (!stone.imageDataUrl) return false;
        const imgAR = await getImageAR(stone.imageDataUrl);
        if (!imgAR) return false;
        addPage();
        drawRunHead();

        drawEyebrow('SPECIMEN · RAW SLAB', PAD_X, 30);

        // Big serif title: the stone name, unmissable
        pdf.setFont(SERIF, 'normal');
        pdf.setFontSize(34);
        setText(C.ink);
        pdf.text(stone.name || '—', PAD_X, 48);

        // "AS PHOTOGRAPHED" note, right-aligned on the title line
        withTracking(0.5, () => {
            pdf.setFont(MONO, 'normal');
            pdf.setFontSize(7);
            setText(C.faint);
            pdf.text('ENTIRE SLAB · AS PHOTOGRAPHED', W - PAD_X, 46, { align: 'right' });
        });

        // Contained image — the WHOLE slab visible, no cropping
        const boxTop = 56;
        const boxBot = H - 24;
        const availW = W - PAD_X * 2;
        const availH = boxBot - boxTop;
        let iw = availW;
        let ih = iw / imgAR;
        if (ih > availH) { ih = availH; iw = ih * imgAR; }
        const ix = (W - iw) / 2;
        const iy = boxTop + (availH - ih) / 2;
        embedImage(stone.imageDataUrl, ix, iy, iw, ih);

        // Hairline frame + corner captions
        setDraw(C.line);
        pdf.setLineWidth(0.3);
        pdf.rect(ix, iy, iw, ih);
        withTracking(0.5, () => {
            pdf.setFont(MONO, 'bold');
            pdf.setFontSize(6.5);
            setText(C.faint);
            pdf.text('RAW SLAB', ix, iy + ih + 5);
            pdf.text('POLISHED', ix + iw, iy + ih + 5, { align: 'right' });
        });

        pageNum++;
        drawFoot('RAW SLAB', String(pageNum).padStart(2, '0'));
        return true;
    };

    // ── Two-way bookmatch page — one per stone, before its application pages ──
    // The slab and its mirror meet at a centre seam, full width of the page,
    // in the same editorial language as the rest of the dossier.
    const addBookmatchPage = async (stone) => {
        const bm = await makeBookmatch(stone.imageDataUrl);
        if (!bm) return false;
        addPage();
        drawRunHead();

        drawEyebrow(`SPECIMEN STUDY · ${(stone.name || '—').toUpperCase()}`, PAD_X, 30);

        // Big serif title so the client can't miss what they're looking at:
        // "Two-Way" in ink + "Bookmatch" in italic accent, cover-style.
        pdf.setFont(SERIF, 'normal');
        pdf.setFontSize(34);
        setText(C.ink);
        pdf.text('Two-Way', PAD_X, 48);
        pdf.setFont(SERIF, 'italic');
        setText(C.accent);
        pdf.text('Bookmatch', PAD_X + pdf.getTextWidth('Two-Way') + 3, 48);

        // Composite box — as wide as the page body allows, centred vertically
        const boxTop = 56;
        const boxBot = H - 26;
        const availW = W - PAD_X * 2;
        const availH = boxBot - boxTop;
        let bw = availW;
        let bh = bw / bm.ar;
        if (bh > availH) { bh = availH; bw = bh * bm.ar; }
        const bx = (W - bw) / 2;
        const by = boxTop + (availH - bh) / 2;
        embedImage(bm.dataUrl, bx, by, bw, bh);

        // Hairline frame
        setDraw(C.line);
        pdf.setLineWidth(0.3);
        pdf.rect(bx, by, bw, bh);

        // Centre seam: accent ticks above and below the mirror line
        const seamX = bx + bw / 2;
        setDraw(C.accent);
        pdf.setLineWidth(0.4);
        pdf.line(seamX, by - 3.5, seamX, by - 1);
        pdf.line(seamX, by + bh + 1, seamX, by + bh + 3.5);

        // Seam caption between the ticks and the frame
        withTracking(0.5, () => {
            pdf.setFont(MONO, 'normal');
            pdf.setFontSize(6);
            setText(C.faint);
            pdf.text('MIRROR SEAM', seamX, by - 5, { align: 'center' });
        });

        // Corner captions under the composite
        withTracking(0.5, () => {
            pdf.setFont(MONO, 'bold');
            pdf.setFontSize(6.5);
            setText(C.faint);
            pdf.text('SLAB A · AS CUT', bx, by + bh + 6);
            pdf.text('SLAB B · MIRRORED', bx + bw, by + bh + 6, { align: 'right' });
        });

        pageNum++;
        drawFoot('TWO-WAY BOOKMATCH', String(pageNum).padStart(2, '0'));
        return true;
    };

    const addStoneDetailPage = async (stone, app, specIdx, totalSpecs) => {
        addPage();
        drawRunHead();

        // Split layout: left card (text + slab) | right (full-bleed render)
        const splitX = W * 0.46;

        // Eyebrow
        drawEyebrow(`APPLICATION · ${(app.label || app.application).toUpperCase()}`, PAD_X, 38);

        // Stone name (huge serif)
        pdf.setFont(SERIF, 'normal');
        pdf.setFontSize(56);
        setText(C.ink);
        const stoneNameLines = pdf.splitTextToSize(stone.name || '—', splitX - PAD_X - 4);
        pdf.text(stoneNameLines, PAD_X, 60);

        // Description (italic muted)
        if (stone.description) {
            pdf.setFont(SERIF, 'italic');
            pdf.setFontSize(11);
            setText(C.muted);
            const descLines = pdf.splitTextToSize(stone.description, splitX - PAD_X - 8);
            pdf.text(descLines, PAD_X, 76);
        }

        // Slab caption row
        const slabY = 100;
        withTracking(0.5, () => {
            pdf.setFont(MONO, 'bold');
            pdf.setFontSize(6.5);
            setText(C.faint);
            pdf.text('RAW SLAB', PAD_X, slabY);
            pdf.text('POLISHED', splitX - 4, slabY, { align: 'right' });
        });

        // Slab image (cover-cropped to the strip, no stretch)
        const slabH = 26;
        const slabW = splitX - PAD_X - 4;
        if (stone.imageDataUrl) {
            const croppedSlab = await coverCrop(stone.imageDataUrl, slabW / slabH);
            embedImage(croppedSlab, PAD_X, slabY + 2, slabW, slabH);
        }
        setDraw(C.line);
        pdf.setLineWidth(0.3);
        pdf.rect(PAD_X, slabY + 2, slabW, slabH);

        // Specs row (Format / Lot / Price) — 3 cells under slab
        const specsY = slabY + 2 + slabH + 10;
        pdf.line(PAD_X, specsY - 4, splitX - 4, specsY - 4); // top rule

        const cellW = (splitX - PAD_X - 4) / 3;
        const drawSpec = (idx, label, raw) => {
            const x = PAD_X + idx * cellW;
            const { value, sub } = splitSpec(raw);
            withTracking(0.45, () => {
                pdf.setFont(MONO, 'bold');
                pdf.setFontSize(6.5);
                setText(C.faint);
                pdf.text(label, x, specsY);
            });
            pdf.setFont(SERIF, 'normal');
            pdf.setFontSize(20);
            setText(C.ink);
            pdf.text(value, x, specsY + 9);
            if (sub) {
                pdf.setFont(MONO, 'normal');
                pdf.setFontSize(8);
                setText(C.muted);
                pdf.text(sub, x + pdf.getTextWidth(value) + 1.6, specsY + 8.5);
            }
        };
        drawSpec(0, 'FORMAT', stone.format);
        drawSpec(1, 'LOT',    stone.lotSize);
        drawSpec(2, 'PRICE',  stone.price);

        // RIGHT: full-bleed render (cover-cropped, no stretch)
        if (app.renderUrl) {
            const renderDataUrl = await urlToDataUrl(app.renderUrl);
            if (renderDataUrl) {
                const croppedRender = await coverCrop(renderDataUrl, (W - splitX) / H);
                embedImage(croppedRender, splitX, 0, W - splitX, H);
            }
            // Floating caption pill at bottom-left of render
            // (solid dark bg + 1px stroke-strong border, two segments separated by a vertical hairline)
            const capPadX = 7;
            const capPadY = 4;
            const capLeft = splitX + 10;
            const capBottom = H - 12;

            const labelText = `AI-RENDERED · ${(app.label || app.application).toUpperCase()}`;
            const specText = `SPECIMEN ${String(specIdx).padStart(2, '0')} / ${String(totalSpecs).padStart(2, '0')}`;

            withTracking(0.5, () => {
                pdf.setFont(MONO, 'bold');
                pdf.setFontSize(7);
                const labelW = pdf.getTextWidth(labelText);
                const specW = pdf.getTextWidth(specText);
                const sepGap = 6;
                const innerW = labelW + sepGap * 2 + 1 + specW;
                const capW = innerW + capPadX * 2;
                const capH = 9.5;

                // Pill bg + border
                setFill(C.bg);
                pdf.rect(capLeft, capBottom - capH, capW, capH, 'F');
                setDraw(C.lineStrong);
                pdf.setLineWidth(0.2);
                pdf.rect(capLeft, capBottom - capH, capW, capH);

                // Label segment
                setText(C.ink);
                pdf.text(labelText, capLeft + capPadX, capBottom - capPadY - 0.4);

                // Vertical separator
                const sepX = capLeft + capPadX + labelW + sepGap;
                setDraw(C.lineStrong);
                pdf.setLineWidth(0.2);
                pdf.line(sepX, capBottom - capH + 1.8, sepX, capBottom - 1.8);

                // Spec segment ("SPECIMEN 01 / 03") — "SPECIMEN 01" in accent, " / 03" in ink
                const specStart = sepX + sepGap + 1;
                const specPrefix = `SPECIMEN ${String(specIdx).padStart(2, '0')}`;
                const specSuffix = ` / ${String(totalSpecs).padStart(2, '0')}`;
                setText(C.accent);
                pdf.text(specPrefix, specStart, capBottom - capPadY - 0.4);
                setText(C.ink);
                pdf.text(specSuffix, specStart + pdf.getTextWidth(specPrefix), capBottom - capPadY - 0.4);
            });
        }

        pageNum++;
        drawFoot('STON ATELIER', String(pageNum).padStart(2, '0'));
    };

    let specCounter = 0;
    const totalSpecimens = pairs.length;
    const bookmatched = new Set(); // one bookmatch page per stone, at first appearance
    for (let gi = 0; gi < order.length; gi++) {
        const k = order[gi];
        await addDividerPage(k, gi);
        for (const { stone, app } of groups[k].items) {
            if (!bookmatched.has(stone.id) && stone.imageDataUrl) {
                bookmatched.add(stone.id);
                await addRawSlabPage(stone);
                await addBookmatchPage(stone);
            }
            specCounter++;
            await addStoneDetailPage(stone, app, specCounter, totalSpecimens);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CLOSING SLIDE
    // ─────────────────────────────────────────────────────────────────────────
    addPage();
    drawRunHead();

    drawEyebrow('PRIVATE ENQUIRY', PAD_X, 55);

    pdf.setFont(SERIF, 'normal');
    pdf.setFontSize(56);
    setText(C.ink);
    pdf.text('Reserve a', PAD_X, 84);
    pdf.setFont(SERIF, 'italic');
    setText(C.accent);
    pdf.text('specimen', PAD_X + pdf.getTextWidth('Reserve a ') + 4, 84);

    // Contact rows
    const cy = 118;
    const drawContact = (x, label, value) => {
        withTracking(0.5, () => {
            pdf.setFont(MONO, 'bold');
            pdf.setFontSize(7);
            setText(C.faint);
            pdf.text(label, x, cy);
        });
        pdf.setFont(MONO, 'normal');
        pdf.setFontSize(10);
        setText(C.ink);
        pdf.text(value, x, cy + 7);
    };
    drawContact(PAD_X,         'ATELIER',   'Ston — by appointment');
    drawContact(PAD_X + 90,    'ENQUIRIES', 'advisory@ston.co.in');
    drawContact(PAD_X + 175,   'DIRECT',    'ston.co.in');

    drawFoot('STON ATELIER', 'END OF DOSSIER');

    return pdf;
}

