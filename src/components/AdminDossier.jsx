import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FileText, Trash2, Plus, Loader2, ChevronDown, X, Download, ImagePlus, IndianRupee, Ruler } from 'lucide-react';
import jsPDF from 'jspdf';
import { aiVisualizer } from '../lib/aiVisualizer';

// ─── Application options — identical to AIVisualizationModal ─────────────────
const APPLICATION_OPTIONS = [
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
async function generateRender(stoneImageUrl, stoneName, application) {
    const appObj = APPLICATION_OPTIONS.find(a => a.value === application) || APPLICATION_OPTIONS[0];
    return aiVisualizer.generateRoomImage(
        stoneName,
        appObj.room,
        'Natural Stone',
        appObj.value,
        stoneImageUrl,
        appObj.style
    );
}

// ─── Helper: load image as base64 from File or URL ───────────────────────────
function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ─── PDF builder ─────────────────────────────────────────────────────────────
// Implements the "Stonevo Stone Dossier" Claude Design (1920×1080 deck) as a
// landscape A4 PDF. Each design slide = one PDF page.
//
// Palette (from design CSS variables):
//   --bg     #0E0D0C   ink-black background
//   --ink    #F2EEE7   primary text
//   --muted  #9A938A   body / lead text
//   --faint  #6A645B   labels, foot text
//   --accent #C8A86E   champagne / brass accent
//   --line   rgba(F2EEE7, .14)
async function buildPDF(stones) {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297; // A4 landscape width
    const H = 210; // A4 landscape height
    const PAD_X = 17;   // ≈ design's --pad-x: 110px at our proportional scale

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

    // Fetch an image URL → dataURL via canvas (so jsPDF can embed it).
    const urlToDataUrl = async (url) => {
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

    // Pre-process an image dataURL via canvas: apply grayscale + dim it to ~34% opacity
    // over the dark bg. Matches the design's `opacity:.34; filter:grayscale(.2)` look
    // baked into the image (so jsPDF embeds a single flattened image — no overlay needed).
    const dimImage = (dataUrl, opacity = 0.34, grayscale = 0.2) =>
        new Promise((resolve) => {
            if (!dataUrl) return resolve(null);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth;
                c.height = img.naturalHeight;
                const ctx = c.getContext('2d');
                // Fill bg ink color
                ctx.fillStyle = `rgb(${C.bg[0]}, ${C.bg[1]}, ${C.bg[2]})`;
                ctx.fillRect(0, 0, c.width, c.height);
                // Draw image at requested opacity with grayscale filter
                ctx.globalAlpha = opacity;
                ctx.filter = `grayscale(${grayscale * 100}%) contrast(1.05)`;
                ctx.drawImage(img, 0, 0);
                ctx.filter = 'none';
                ctx.globalAlpha = 1;
                try { resolve(c.toDataURL('image/jpeg', 0.9)); } catch { resolve(null); }
            };
            img.onerror = () => resolve(null);
            img.src = dataUrl;
        });

    // Embed a pre-dimmed background image full-bleed (no gradient overlay).
    const drawCoverBG = (dimmedDataUrl) => {
        if (dimmedDataUrl) embedImage(dimmedDataUrl, 0, 0, W, H);
    };

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
            // "STONEVO" in accent
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            setText(C.accent);
            pdf.text('STONEVO', PAD_X, y);
            // " — STONE DOSSIER" in ink
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7);
            setText(C.faint);
            const stonevoW = pdf.getTextWidth('STONEVO');
            pdf.text('  —  STONE DOSSIER', PAD_X + stonevoW + 1.5, y);
            // Right side
            pdf.text('CONFIDENTIAL · ARCHITECTURAL INTELLIGENCE', W - PAD_X, y, { align: 'right' });
        });
    };

    // Footer bar (bottom of every page except cover variations)
    const drawFoot = (left = 'STONEVO ATELIER', right = '') => {
        const y = H - 10;
        withTracking(0.5, () => {
            pdf.setFont('helvetica', 'normal');
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
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            setText(C.accent);
            pdf.text(text, x + 13, y, { baseline: 'middle' });
        });
    };

    const addPage = (first = false) => {
        if (!first) pdf.addPage();
        paintBg();
    };

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

    // Pre-fetch + dim background images for cover/divider pages.
    // Dimming is baked into the image (no overlay rects in the PDF).
    const firstRender = pairs.length ? await urlToDataUrl(pairs[0].app.renderUrl) : null;
    const firstRenderDataUrl = await dimImage(firstRender, 0.34, 0.2);
    const dividerBgs = {};
    for (const k of order) {
        const raw = await urlToDataUrl(groups[k].items[0].app.renderUrl);
        dividerBgs[k] = await dimImage(raw, 0.42, 0.15);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SLIDE 01 — COVER
    // ─────────────────────────────────────────────────────────────────────────
    addPage(true);
    drawCoverBG(firstRenderDataUrl);
    drawRunHead();

    // Eyebrow
    const eyebrowY = 70;
    drawEyebrow('VOLUME 01 · PRIVATE COLLECTION', PAD_X, eyebrowY);

    // Headline: "Stone Dossier" — huge, with italic accent
    pdf.setFont('times', 'normal');
    pdf.setFontSize(72);
    setText(C.ink);
    pdf.text('Stone', PAD_X, 105);
    pdf.setFont('times', 'italic');
    setText(C.accent);
    pdf.text('Dossier', PAD_X, 138);

    // Sub copy
    const subY = 152;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    setText(C.muted);
    const subText = `${stones.length} specimen${stones.length !== 1 ? 's' : ''}, sourced and matched to application — presented with AI-rendered interiors.`;
    pdf.text(pdf.splitTextToSize(subText, W * 0.55), PAD_X, subY);

    // Meta row
    const metaY = 178;
    const metaCol = (x, label, value) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        setText(C.faint);
        pdf.text(label, x, metaY);
        pdf.setFont('times', 'normal');
        pdf.setFontSize(11);
        setText(C.ink);
        pdf.text(value, x, metaY + 6);
    };
    metaCol(PAD_X, 'SPECIMENS', `${String(stones.length).padStart(2, '0')} — CURATED`);
    metaCol(PAD_X + 65, 'APPLICATIONS', order.map(o => groups[o].label).join(' · ') || '—');
    metaCol(PAD_X + 175, 'ISSUED', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase());

    drawFoot('STONEVO ATELIER', 'PREPARED FOR PRIVATE VIEWING');

    // ─────────────────────────────────────────────────────────────────────────
    // SLIDE 02 — CONTENTS
    // ─────────────────────────────────────────────────────────────────────────
    addPage();
    drawRunHead();

    // LEFT column: eyebrow + title + lead
    drawEyebrow('CONTENTS', PAD_X, 56);

    pdf.setFont('times', 'normal');
    pdf.setFontSize(42);
    setText(C.ink);
    pdf.text('The Collection', PAD_X, 82);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    setText(C.muted);
    const leadText = 'Each specimen is presented as a raw slab and as an AI-rendered application, with format, lot availability and indicative price for private clients.';
    pdf.text(pdf.splitTextToSize(leadText, 110), PAD_X, 100);

    // RIGHT column: TOC entries
    const tocX = W * 0.5;
    let tocY = 56;
    setDraw(C.line);
    pdf.setLineWidth(0.3);

    order.forEach((appKey, gi) => {
        pdf.line(tocX, tocY, W - PAD_X, tocY);
        tocY += 13;

        // Number
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        setText(C.accent);
        pdf.text(String(gi + 1).padStart(2, '0'), tocX, tocY);

        // Application name (serif)
        pdf.setFont('times', 'normal');
        pdf.setFontSize(22);
        setText(C.ink);
        pdf.text(groups[appKey].label, tocX + 18, tocY);

        // Stone names below
        const stoneNames = groups[appKey].items.map(i => i.stone.name).join(' · ');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        setText(C.faint);
        pdf.text(stoneNames, tocX + 18, tocY + 6);

        // Specimen count (right)
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        setText(C.muted);
        pdf.text(`${groups[appKey].items.length} SPECIMEN${groups[appKey].items.length !== 1 ? 'S' : ''}`, W - PAD_X, tocY, { align: 'right' });

        tocY += 14;
    });
    pdf.line(tocX, tocY, W - PAD_X, tocY);

    drawFoot('STONEVO ATELIER', '02');

    // ─────────────────────────────────────────────────────────────────────────
    // SLIDES 03+ — DIVIDERS + STONE DETAILS (grouped by application)
    // ─────────────────────────────────────────────────────────────────────────
    let pageNum = 2;

    const addDividerPage = (appKey, appIndex) => {
        addPage();
        drawCoverBG(dividerBgs[appKey]);
        drawRunHead();

        // Ghost numeral — outline-only text (matches design's text-stroke)
        pdf.setFont('times', 'normal');
        pdf.setFontSize(110);
        setDraw(C.lineStrong);
        pdf.setLineWidth(0.4);
        if (typeof pdf.setTextRenderingMode === 'function') {
            pdf.setTextRenderingMode(1); // 1 = stroke text only
            pdf.text(String(appIndex + 1).padStart(2, '0'), PAD_X, 100);
            pdf.setTextRenderingMode(0); // back to fill
        } else {
            setText(C.lineStrong);
            pdf.text(String(appIndex + 1).padStart(2, '0'), PAD_X, 100);
        }

        // App name (huge)
        pdf.setFont('times', 'normal');
        pdf.setFontSize(72);
        setText(C.ink);
        pdf.text(groups[appKey].label, PAD_X, 140);

        // Tick + specimen count (with mono-style tracking)
        const noteY = 158;
        setDraw(C.accent);
        pdf.setLineWidth(0.6);
        pdf.line(PAD_X, noteY, PAD_X + 14, noteY);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        setText(C.muted);
        const n = groups[appKey].items.length;
        if (typeof pdf.setCharSpace === 'function') pdf.setCharSpace(0.6);
        pdf.text(`${n} SPECIMEN${n !== 1 ? 'S' : ''}`, PAD_X + 18, noteY + 1);
        if (typeof pdf.setCharSpace === 'function') pdf.setCharSpace(0);

        pageNum++;
        drawFoot(`APPLICATION ${String(appIndex + 1).padStart(2, '0')}`, String(pageNum).padStart(2, '0'));
    };

    const addStoneDetailPage = async (stone, app, specIdx, totalSpecs) => {
        addPage();
        drawRunHead();

        // Split layout: left card (text + slab) | right (full-bleed render)
        const splitX = W * 0.46;

        // Eyebrow
        drawEyebrow(`APPLICATION · ${(app.label || app.application).toUpperCase()}`, PAD_X, 50);

        // Stone name (huge serif)
        pdf.setFont('times', 'normal');
        pdf.setFontSize(48);
        setText(C.ink);
        const stoneNameLines = pdf.splitTextToSize(stone.name || '—', splitX - PAD_X - 4);
        pdf.text(stoneNameLines, PAD_X, 72);

        // Description (italic muted)
        if (stone.description) {
            pdf.setFont('times', 'italic');
            pdf.setFontSize(11);
            setText(C.muted);
            const descLines = pdf.splitTextToSize(stone.description, splitX - PAD_X - 8);
            pdf.text(descLines, PAD_X, 88);
        }

        // Slab caption row
        const slabY = 122;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        setText(C.faint);
        pdf.text('RAW SLAB', PAD_X, slabY);
        pdf.text('POLISHED', splitX - 4, slabY, { align: 'right' });

        // Slab image
        const slabH = 32;
        const slabW = splitX - PAD_X - 4;
        if (stone.imageDataUrl) {
            embedImage(stone.imageDataUrl, PAD_X, slabY + 2, slabW, slabH);
        }
        setDraw(C.line);
        pdf.setLineWidth(0.3);
        pdf.rect(PAD_X, slabY + 2, slabW, slabH);

        // Specs row (Format / Lot / Price) — 3 cells under slab
        const specsY = slabY + 2 + slabH + 10;
        pdf.line(PAD_X, specsY - 4, splitX - 4, specsY - 4); // top rule

        const cellW = (splitX - PAD_X - 4) / 3;
        const drawSpec = (idx, label, value, sub) => {
            const x = PAD_X + idx * cellW;
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(6.5);
            setText(C.faint);
            pdf.text(label, x, specsY);
            pdf.setFont('times', 'normal');
            pdf.setFontSize(18);
            setText(C.ink);
            pdf.text(value || '—', x, specsY + 9);
            if (sub) {
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(7);
                setText(C.muted);
                pdf.text(sub, x + pdf.getTextWidth(value || '—') + 2, specsY + 8);
            }
        };
        drawSpec(0, 'FORMAT', stone.format || '—');
        drawSpec(1, 'LOT', stone.lotSize || '—');
        drawSpec(2, 'PRICE', stone.price || '—');

        // RIGHT: full-bleed render
        if (app.renderUrl) {
            const renderDataUrl = await urlToDataUrl(app.renderUrl);
            if (renderDataUrl) {
                embedImage(renderDataUrl, splitX, 0, W - splitX, H);
            }
            // Caption band — solid dark strip at bottom of render
            // (No gradient — kept flat to match the updated design.)
            const capH = 24;
            setFill([8, 8, 8]);
            pdf.rect(splitX, H - capH, W - splitX, capH, 'F');

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7.5);
            setText(C.ink);
            pdf.text(`AI-RENDERED · ${(app.label || app.application).toUpperCase()}`, splitX + 12, H - 12);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7.5);
            setText(C.accent);
            pdf.text(`SPECIMEN ${String(specIdx).padStart(2, '0')}`, W - PAD_X, H - 12, { align: 'right' });
            pdf.setFont('helvetica', 'normal');
            setText(C.ink);
            pdf.text(` / ${String(totalSpecs).padStart(2, '0')}`, W - PAD_X + pdf.getTextWidth(` / ${String(totalSpecs).padStart(2, '0')}`) * 0 + 0.5, H - 12, { align: 'right' });
        }

        pageNum++;
        drawFoot('STONEVO ATELIER', String(pageNum).padStart(2, '0'));
    };

    let specCounter = 0;
    const totalSpecimens = pairs.length;
    for (let gi = 0; gi < order.length; gi++) {
        const k = order[gi];
        addDividerPage(k, gi);
        for (const { stone, app } of groups[k].items) {
            specCounter++;
            await addStoneDetailPage(stone, app, specCounter, totalSpecimens);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CLOSING SLIDE
    // ─────────────────────────────────────────────────────────────────────────
    addPage();
    drawRunHead();

    drawEyebrow('PRIVATE ENQUIRY', PAD_X, 80);

    pdf.setFont('times', 'normal');
    pdf.setFontSize(56);
    setText(C.ink);
    pdf.text('Reserve a', PAD_X, 112);
    pdf.setFont('times', 'italic');
    setText(C.accent);
    pdf.text('specimen', PAD_X + pdf.getTextWidth('Reserve a ') + 4, 112);

    // Contact rows
    const cy = 148;
    const drawContact = (x, label, value) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        setText(C.faint);
        pdf.text(label, x, cy);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        setText(C.ink);
        pdf.text(value, x, cy + 8);
    };
    drawContact(PAD_X, 'ATELIER', 'Stonevo — by appointment');
    drawContact(PAD_X + 90, 'ENQUIRIES', 'advisory@stonevo.in');
    drawContact(PAD_X + 175, 'DIRECT', 'stonevo.in');

    drawFoot('STONEVO ATELIER', 'END OF DOSSIER');

    return pdf;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminDossier = () => {
    const [stones, setStones] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [generatingIdx, setGeneratingIdx] = useState(null);
    const [generatingApp, setGeneratingApp] = useState(null);
    const [pdfReady, setPdfReady] = useState(false);
    const [pdfBlob, setPdfBlob] = useState(null);
    const [step, setStep] = useState('build'); // 'build' | 'preview'
    const [globalError, setGlobalError] = useState('');

    // ── Add / remove stones ──────────────────────────────────────────────────
    const addStone = () => {
        setStones(prev => [...prev, {
            id: Date.now(),
            name: '',
            description: '',
            format: '',
            lotSize: '',
            price: '',
            imageFile: null,
            imageDataUrl: null,
            imageUrl: null,
            applications: [{ application: 'flooring', label: 'Flooring', renderUrl: null, error: null }]
        }]);
        setPdfReady(false);
    };

    const removeStone = (id) => setStones(prev => prev.filter(s => s.id !== id));

    const updateStone = (id, patch) => {
        setStones(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
        setPdfReady(false);
    };

    const handleStoneImage = async (id, file) => {
        const dataUrl = await fileToDataUrl(file);
        // Upload to Supabase storage so the API can fetch it
        const { data, error } = await import('../lib/supabaseClient').then(m => m.supabase.storage
            .from('chat-files')
            .upload(`dossier/${Date.now()}_${file.name}`, file, { upsert: false, contentType: file.type })
        );
        let imageUrl = null;
        if (!error) {
            const { data: { publicUrl } } = (await import('../lib/supabaseClient')).supabase.storage
                .from('chat-files').getPublicUrl(data.path);
            imageUrl = publicUrl;
        }
        updateStone(id, { imageFile: file, imageDataUrl: dataUrl, imageUrl: imageUrl || null });
    };

    const addApplication = (id) => {
        setStones(prev => prev.map(s => {
            if (s.id !== id) return s;
            return { ...s, applications: [...s.applications, { application: 'kitchen counter', label: 'Kitchen Counter', renderUrl: null, error: null }] };
        }));
    };

    const removeApplication = (stoneId, idx) => {
        setStones(prev => prev.map(s => {
            if (s.id !== stoneId) return s;
            return { ...s, applications: s.applications.filter((_, i) => i !== idx) };
        }));
    };

    const updateApplication = (stoneId, idx, patch) => {
        setStones(prev => prev.map(s => {
            if (s.id !== stoneId) return s;
            const apps = s.applications.map((a, i) => i === idx ? { ...a, ...patch } : a);
            return { ...s, applications: apps };
        }));
    };

    // ── Generate one render ──────────────────────────────────────────────────
    const generateOne = async (stoneId, appIdx) => {
        const stone = stones.find(s => s.id === stoneId);
        if (!stone?.imageUrl) {
            setGlobalError('Please upload a stone image first.');
            return;
        }
        const app = stone.applications[appIdx];
        setGeneratingIdx(stoneId);
        setGeneratingApp(appIdx);
        updateApplication(stoneId, appIdx, { renderUrl: null, error: null });

        try {
            const url = await generateRender(stone.imageUrl, stone.name || 'Stone', app.application);
            updateApplication(stoneId, appIdx, { renderUrl: url });
        } catch (err) {
            updateApplication(stoneId, appIdx, { error: err.message });
        } finally {
            setGeneratingIdx(null);
            setGeneratingApp(null);
        }
    };

    // ── Generate ALL renders ─────────────────────────────────────────────────
    const generateAll = async () => {
        setGenerating(true);
        setGlobalError('');
        setPdfReady(false);

        for (let si = 0; si < stones.length; si++) {
            const stone = stones[si];
            if (!stone.imageUrl) continue;
            for (let ai = 0; ai < stone.applications.length; ai++) {
                setGeneratingIdx(stone.id);
                setGeneratingApp(ai);
                try {
                    const url = await generateRender(stone.imageUrl, stone.name || 'Stone', stone.applications[ai].application);
                    updateApplication(stone.id, ai, { renderUrl: url, error: null });
                } catch (err) {
                    updateApplication(stone.id, ai, { error: err.message });
                }
            }
        }

        setGeneratingIdx(null);
        setGeneratingApp(null);
        setGenerating(false);
        setPdfReady(true);
    };

    // ── Build and download PDF ───────────────────────────────────────────────
    const downloadPDF = async () => {
        try {
            const pdf = await buildPDF(stones);
            pdf.save('Stonevo_Stone_Dossier.pdf');
        } catch (err) {
            setGlobalError('PDF generation failed: ' + err.message);
        }
    };

    const totalRenders = stones.reduce((s, st) => s + st.applications.length, 0);
    const completedRenders = stones.reduce((s, st) => s + st.applications.filter(a => a.renderUrl).length, 0);
    const allReady = stones.length > 0 && completedRenders === totalRenders;
    const hasImages = stones.every(s => s.imageUrl);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-serif text-stone-800 flex items-center gap-2">
                            <FileText className="text-bronze" size={22} />
                            Stone Dossier Generator
                        </h2>
                        <p className="text-stone-500 text-sm mt-1">
                            Add stones → generate AI renders → export a branded PDF dossier
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {completedRenders > 0 && (
                            <span className="text-xs text-stone-500 font-medium">
                                {completedRenders}/{totalRenders} renders ready
                            </span>
                        )}
                        {allReady && (
                            <button
                                onClick={downloadPDF}
                                className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-bronze transition-colors"
                            >
                                <Download size={14} /> Download PDF
                            </button>
                        )}
                        {stones.length > 0 && !generating && (
                            <button
                                onClick={generateAll}
                                disabled={!hasImages}
                                className="flex items-center gap-2 px-5 py-2.5 bg-bronze text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-stone-900 transition-colors disabled:opacity-40"
                            >
                                <Sparkles size={14} /> Generate All Renders
                            </button>
                        )}
                        {generating && (
                            <div className="flex items-center gap-2 text-bronze text-xs font-bold uppercase tracking-widest">
                                <Loader2 size={14} className="animate-spin" /> Generating…
                            </div>
                        )}
                        <button
                            onClick={addStone}
                            className="flex items-center gap-2 px-5 py-2.5 border border-stone-300 bg-white text-stone-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-stone-50 transition-colors"
                        >
                            <Plus size={14} /> Add Stone
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                {totalRenders > 0 && (
                    <div className="mt-4">
                        <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-bronze rounded-full transition-all duration-500"
                                style={{ width: `${(completedRenders / totalRenders) * 100}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {globalError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                    {globalError}
                </div>
            )}

            {/* Empty state */}
            {stones.length === 0 && (
                <div
                    onClick={addStone}
                    className="border-2 border-dashed border-stone-200 rounded-2xl p-16 text-center cursor-pointer hover:border-bronze hover:bg-amber-50/20 transition-all group"
                >
                    <div className="w-16 h-16 bg-stone-100 group-hover:bg-bronze/10 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                        <Plus className="text-stone-400 group-hover:text-bronze" size={28} />
                    </div>
                    <p className="text-stone-600 font-medium mb-1">Add your first stone</p>
                    <p className="text-stone-400 text-sm">Click to add a stone specimen to the dossier</p>
                </div>
            )}

            {/* Stone cards */}
            <AnimatePresence>
                {stones.map((stone, si) => (
                    <motion.div
                        key={stone.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
                    >
                        {/* Stone header */}
                        <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {si + 1}
                                </span>
                                <span className="text-stone-400 text-xs uppercase tracking-widest font-bold">Stone {si + 1}</span>
                                {!stone.name && <span className="text-xs text-amber-500 font-medium">← Enter name below</span>}
                                {stone.name && <span className="text-stone-700 font-semibold text-sm">— {stone.name}</span>}
                            </div>
                            <button onClick={() => removeStone(stone.id)} className="p-2 text-stone-400 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Stone Name — prominent, required */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1">
                                    Stone Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Carrara Bianco, Silver Travertine…"
                                    value={stone.name}
                                    onChange={e => updateStone(stone.id, { name: e.target.value })}
                                    className={`w-full border rounded-lg px-4 py-2.5 text-stone-800 font-semibold text-sm focus:outline-none focus:border-bronze transition-colors ${!stone.name ? 'border-amber-300 bg-amber-50' : 'border-stone-200 bg-white'}`}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-8">
                            {/* Left: image upload */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Stone Slab Image</label>
                                {stone.imageDataUrl ? (
                                    <div className="relative group rounded-xl overflow-hidden aspect-[4/3] bg-stone-100">
                                        <img src={stone.imageDataUrl} alt={stone.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <label className="cursor-pointer text-white text-xs font-bold uppercase tracking-widest bg-black/50 px-3 py-1.5 rounded-full">
                                                Change
                                                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleStoneImage(stone.id, e.target.files[0])} />
                                            </label>
                                        </div>
                                        {!stone.imageUrl && (
                                            <div className="absolute bottom-2 left-2 right-2 bg-amber-500/90 text-white text-[10px] rounded px-2 py-1 text-center">
                                                Uploading…
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-xl aspect-[4/3] cursor-pointer hover:border-bronze hover:bg-amber-50/20 transition-all group">
                                        <ImagePlus className="text-stone-300 group-hover:text-bronze mb-2 transition-colors" size={28} />
                                        <span className="text-stone-400 text-xs">Upload stone image</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleStoneImage(stone.id, e.target.files[0])} />
                                    </label>
                                )}

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1">
                                            <Ruler size={10} /> Format
                                        </label>
                                        <input
                                            type="text"
                                            value={stone.format || ''}
                                            onChange={e => updateStone(stone.id, { format: e.target.value })}
                                            placeholder="e.g. 3200×1600 mm"
                                            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-bronze"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1">
                                            <Ruler size={10} /> Lot
                                        </label>
                                        <input
                                            type="text"
                                            value={stone.lotSize}
                                            onChange={e => updateStone(stone.id, { lotSize: e.target.value })}
                                            placeholder="e.g. 123 m²"
                                            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-bronze"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1">
                                            <IndianRupee size={10} /> Price
                                        </label>
                                        <input
                                            type="text"
                                            value={stone.price}
                                            onChange={e => updateStone(stone.id, { price: e.target.value })}
                                            placeholder="e.g. ₹34,500"
                                            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-bronze"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Notes (optional)</label>
                                    <textarea
                                        value={stone.description}
                                        onChange={e => updateStone(stone.id, { description: e.target.value })}
                                        placeholder="Finish, origin, etc."
                                        rows={2}
                                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-bronze resize-none"
                                    />
                                </div>
                            </div>

                            {/* Right: applications */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Applications & AI Renders</label>
                                    <button
                                        onClick={() => addApplication(stone.id)}
                                        className="flex items-center gap-1 text-[10px] text-bronze font-bold uppercase tracking-widest hover:text-stone-900 transition-colors"
                                    >
                                        <Plus size={12} /> Add Application
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {stone.applications.map((app, ai) => {
                                        const isGen = generatingIdx === stone.id && generatingApp === ai;
                                        return (
                                            <div key={ai} className="border border-stone-100 rounded-xl p-4 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    {/* Application selector */}
                                                    <div className="relative flex-1">
                                                        <select
                                                            value={app.application}
                                                            onChange={e => {
                                                                const opt = APPLICATION_OPTIONS.find(o => o.value === e.target.value);
                                                                updateApplication(stone.id, ai, {
                                                                    application: e.target.value,
                                                                    label: opt?.label || e.target.value,
                                                                    renderUrl: null,
                                                                    error: null
                                                                });
                                                            }}
                                                            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-bronze bg-white appearance-none"
                                                        >
                                                            {APPLICATION_OPTIONS.map(o => (
                                                                <option key={o.value} value={o.value}>{o.label}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                                                    </div>

                                                    {/* Generate button */}
                                                    <button
                                                        onClick={() => generateOne(stone.id, ai)}
                                                        disabled={isGen || generating || !stone.imageUrl}
                                                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-bronze/10 text-bronze border border-bronze/20 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-bronze hover:text-white transition-all disabled:opacity-40"
                                                    >
                                                        {isGen ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                        {isGen ? 'Rendering…' : 'Render'}
                                                    </button>

                                                    {stone.applications.length > 1 && (
                                                        <button onClick={() => removeApplication(stone.id, ai)} className="p-1.5 text-stone-300 hover:text-red-400 transition-colors shrink-0">
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Render preview */}
                                                {isGen && (
                                                    <div className="aspect-video bg-stone-50 rounded-lg flex flex-col items-center justify-center gap-2 border border-stone-100">
                                                        <Loader2 className="animate-spin text-bronze" size={24} />
                                                        <p className="text-stone-400 text-xs">Generating AI render…</p>
                                                    </div>
                                                )}
                                                {app.renderUrl && !isGen && (
                                                    <div className="relative rounded-lg overflow-hidden aspect-video bg-stone-100">
                                                        <img src={app.renderUrl} alt={app.label} className="w-full h-full object-cover" />
                                                        <div className="absolute top-2 right-2">
                                                            <button
                                                                onClick={() => generateOne(stone.id, ai)}
                                                                disabled={generating}
                                                                className="px-2 py-1 bg-black/60 text-white text-[9px] uppercase tracking-widest rounded hover:bg-bronze transition-colors"
                                                            >
                                                                Re-render
                                                            </button>
                                                        </div>
                                                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-bronze text-[9px] uppercase tracking-widest rounded">
                                                            {app.label}
                                                        </div>
                                                    </div>
                                                )}
                                                {app.error && !isGen && (
                                                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-red-500 text-xs flex items-center justify-between">
                                                        <span>{app.error}</span>
                                                        <button onClick={() => generateOne(stone.id, ai)} className="text-red-600 font-bold underline ml-3 shrink-0">Retry</button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            </div> {/* close inner grid */}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Bottom actions */}
            {stones.length > 0 && (
                <div className="flex items-center justify-between bg-white rounded-2xl border border-stone-200 px-6 py-4">
                    <p className="text-stone-500 text-sm">
                        {allReady
                            ? '✅ All renders complete — your dossier is ready to download.'
                            : generating
                            ? `Generating render ${completedRenders + 1} of ${totalRenders}…`
                            : `${completedRenders}/${totalRenders} renders complete`}
                    </p>
                    <div className="flex items-center gap-3">
                        {allReady && (
                            <button
                                onClick={downloadPDF}
                                className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-bronze transition-colors shadow-lg"
                            >
                                <Download size={14} /> Download PDF Dossier
                            </button>
                        )}
                        {!generating && !allReady && hasImages && (
                            <button
                                onClick={generateAll}
                                className="flex items-center gap-2 px-6 py-3 bg-bronze text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-stone-900 transition-colors shadow-lg shadow-amber-500/20"
                            >
                                <Sparkles size={14} /> Generate All & Build PDF
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDossier;
