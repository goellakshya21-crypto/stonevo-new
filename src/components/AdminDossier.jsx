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
async function buildPDF(stones) {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210; // A4 width mm
    const H = 297; // A4 height mm
    const margin = 14;

    const addPage = (isFirst = false) => {
        if (!isFirst) pdf.addPage();

        // Background
        pdf.setFillColor(18, 17, 15);
        pdf.rect(0, 0, W, H, 'F');

        // Gold top rule
        pdf.setDrawColor(180, 138, 70);
        pdf.setLineWidth(0.5);
        pdf.line(margin, 12, W - margin, 12);

        // Wordmark
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(180, 138, 70);
        pdf.text('STONEVO', margin, 9);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(120, 110, 100);
        pdf.text('STONE DOSSIER', W - margin, 9, { align: 'right' });

        // Gold bottom rule
        pdf.line(margin, H - 10, W - margin, H - 10);
        pdf.setFontSize(6);
        pdf.setTextColor(80, 75, 65);
        pdf.text('Confidential · Stonevo Architectural Intelligence', W / 2, H - 6, { align: 'center' });
    };

    const toMM = (px, dpi = 96) => px * 25.4 / dpi;

    const embedImage = (dataUrl, x, y, w, h) => {
        const fmt = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        pdf.addImage(dataUrl, fmt, x, y, w, h);
    };

    // ── Cover page ──────────────────────────────────────────────────────────
    addPage(true);

    // Large title
    pdf.setFont('times', 'italic');
    pdf.setFontSize(36);
    pdf.setTextColor(230, 215, 185);
    pdf.text('Stone Dossier', W / 2, 80, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(130, 120, 105);
    pdf.text(`${stones.length} specimen${stones.length !== 1 ? 's' : ''} · AI-rendered applications`, W / 2, 92, { align: 'center' });

    // Decorative line
    pdf.setDrawColor(180, 138, 70);
    pdf.setLineWidth(0.3);
    pdf.line(W / 2 - 30, 98, W / 2 + 30, 98);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 95, 85);
    pdf.text(new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }), W / 2, 106, { align: 'center' });

    // ── Build flat list of (stone, application) pairs with renders ───────────
    const pairs = []; // { stone, app }
    stones.forEach(stone => {
        stone.applications.forEach(app => {
            if (app.renderUrl) pairs.push({ stone, app });
        });
    });

    // ── Group pairs by application label, preserving first-seen order ─────────
    const order = [];
    const groups = {};
    pairs.forEach(({ stone, app }) => {
        const key = (app.label || app.application).toUpperCase();
        if (!groups[key]) { groups[key] = []; order.push(key); }
        groups[key].push({ stone, app });
    });

    // ── Table of contents ─────────────────────────────────────────────────────
    let tocY = 125;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(180, 138, 70);
    pdf.text('CONTENTS', margin, tocY);
    tocY += 6;

    order.forEach((appKey, gi) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(200, 190, 170);
        pdf.text(`${String(gi + 1).padStart(2, '0')}.  ${appKey}`, margin + 4, tocY);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(100, 95, 85);
        pdf.text(`${groups[appKey].length} stone${groups[appKey].length > 1 ? 's' : ''}`, W - margin, tocY, { align: 'right' });
        tocY += 7;
    });

    // ── Section divider page ──────────────────────────────────────────────────
    const addDivider = (appLabel) => {
        addPage();
        // Big centered application name
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(180, 138, 70);
        pdf.text('APPLICATION', W / 2, H / 2 - 22, { align: 'center' });

        pdf.setFont('times', 'italic');
        pdf.setFontSize(40);
        pdf.setTextColor(230, 215, 185);
        pdf.text(appLabel, W / 2, H / 2 - 8, { align: 'center' });

        pdf.setDrawColor(180, 138, 70);
        pdf.setLineWidth(0.4);
        pdf.line(W / 2 - 40, H / 2 + 2, W / 2 + 40, H / 2 + 2);
    };

    // ── Stone + application page ──────────────────────────────────────────────
    const addStonePage = (stone, app) => {
        addPage();
        let y = 18;

        // Stone name header
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(180, 138, 70);
        pdf.text((app.label || app.application).toUpperCase(), margin, y);

        y += 5;
        pdf.setFont('times', 'italic');
        pdf.setFontSize(22);
        pdf.setTextColor(230, 215, 185);
        pdf.text(stone.name, margin, y);

        y += 4;
        pdf.setDrawColor(180, 138, 70);
        pdf.setLineWidth(0.3);
        pdf.line(margin, y, margin + 60, y);
        y += 8;

        // ── Slab image (left) ──
        const slabW = 75;
        const slabH = 52;
        if (stone.imageDataUrl) {
            embedImage(stone.imageDataUrl, margin, y, slabW, slabH);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(6);
            pdf.setTextColor(100, 95, 85);
            pdf.text('RAW SLAB', margin + slabW / 2, y + slabH + 4, { align: 'center' });
        }

        // ── Spec block (right of slab) ──
        const specX = margin + slabW + 8;
        let specY = y + 2;

        const specRow = (label, value) => {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(6);
            pdf.setTextColor(120, 110, 100);
            pdf.text(label, specX, specY);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7.5);
            pdf.setTextColor(200, 190, 170);
            // Wrap long values
            const maxW = W - specX - margin;
            const lines = pdf.splitTextToSize(value, maxW);
            pdf.text(lines, specX, specY + 4);
            specY += 10 + (lines.length - 1) * 4;
        };

        specRow('STONE NAME', stone.name);
        specRow('APPLICATION', app.label || app.application);
        if (stone.lotSize)     specRow('LOT SIZE', stone.lotSize);
        if (stone.price)       specRow('PRICE', stone.price);
        if (stone.description) specRow('NOTES', stone.description);

        y += slabH + 12;

        // ── Full-width AI render ──
        if (app.renderUrl) {
            const renderW = W - margin * 2;
            const renderH = renderW * 0.58;
            embedImage(app.renderUrl, margin, y, renderW, renderH);

            // Caption bar
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(6);
            pdf.setTextColor(180, 138, 70);
            pdf.text('AI-RENDERED · ' + (app.label || app.application).toUpperCase(), margin, y + renderH + 4);
        }
    };

    // ── Emit all pages grouped by application ─────────────────────────────────
    order.forEach(appKey => {
        addDivider(appKey);
        groups[appKey].forEach(({ stone, app }) => addStonePage(stone, app));
    });

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
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[10px] font-bold flex items-center justify-center">
                                    {si + 1}
                                </span>
                                <input
                                    type="text"
                                    placeholder="Stone Name (e.g. Carrara Bianco)"
                                    value={stone.name}
                                    onChange={e => updateStone(stone.id, { name: e.target.value })}
                                    className="text-stone-800 font-semibold text-sm bg-transparent border-b border-transparent focus:border-bronze outline-none transition-colors w-64 placeholder:text-stone-400"
                                />
                            </div>
                            <button onClick={() => removeStone(stone.id)} className="p-2 text-stone-400 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-[220px,1fr] gap-8">
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

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1">
                                            <Ruler size={10} /> Lot Size
                                        </label>
                                        <input
                                            type="text"
                                            value={stone.lotSize}
                                            onChange={e => updateStone(stone.id, { lotSize: e.target.value })}
                                            placeholder="e.g. 120×60 cm"
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
                                            placeholder="e.g. ₹450/sq.ft"
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
