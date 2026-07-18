import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, Sparkles, Loader2, Download, ChevronDown, Search, Check, Plus } from 'lucide-react';
import { APPLICATION_OPTIONS, generateRender, buildPDF } from '../lib/dossierPdf';

// Architect-facing dossier builder. Stones come ONLY from the gallery —
// there is deliberately no upload path here.
const MAX_STONES = 6;
const MAX_APPS_PER_STONE = 3;

const ArchitectDossier = ({ isOpen, onClose, marbles }) => {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState([]); // [{ marble, applications: [{application,label,renderUrl,error}] }]
    const [generating, setGenerating] = useState(false);
    const [genLabel, setGenLabel] = useState('');
    const [error, setError] = useState('');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return marbles;
        return marbles.filter(m => (m.name || '').toLowerCase().includes(q));
    }, [marbles, query]);

    const isSelected = (id) => selected.some(s => s.marble.id === id);

    const toggleStone = (marble) => {
        setError('');
        setSelected(prev => {
            if (prev.some(s => s.marble.id === marble.id)) {
                return prev.filter(s => s.marble.id !== marble.id);
            }
            if (prev.length >= MAX_STONES) {
                setError(`Up to ${MAX_STONES} stones per dossier.`);
                return prev;
            }
            return [...prev, {
                marble,
                applications: [{ application: 'flooring', label: 'Flooring', renderUrl: null, error: null }]
            }];
        });
    };

    const updateApp = (stoneId, idx, patch) => {
        setSelected(prev => prev.map(s => {
            if (s.marble.id !== stoneId) return s;
            return { ...s, applications: s.applications.map((a, i) => i === idx ? { ...a, ...patch } : a) };
        }));
    };

    const addApp = (stoneId) => {
        setSelected(prev => prev.map(s => {
            if (s.marble.id !== stoneId || s.applications.length >= MAX_APPS_PER_STONE) return s;
            return { ...s, applications: [...s.applications, { application: 'feature wall', label: 'Feature Wall', renderUrl: null, error: null }] };
        }));
    };

    const removeApp = (stoneId, idx) => {
        setSelected(prev => prev.map(s => {
            if (s.marble.id !== stoneId) return s;
            return { ...s, applications: s.applications.filter((_, i) => i !== idx) };
        }));
    };

    const totalRenders = selected.reduce((n, s) => n + s.applications.length, 0);
    const doneRenders = selected.reduce((n, s) => n + s.applications.filter(a => a.renderUrl).length, 0);
    const allReady = selected.length > 0 && doneRenders === totalRenders;

    const generateAll = async () => {
        setGenerating(true);
        setError('');
        for (const s of selected) {
            for (let ai = 0; ai < s.applications.length; ai++) {
                const app = s.applications[ai];
                if (app.renderUrl) continue;
                setGenLabel(`${s.marble.name} · ${app.label}`);
                try {
                    const url = await generateRender(s.marble.imageUrl, s.marble.name || 'Stone', app.application);
                    updateApp(s.marble.id, ai, { renderUrl: url, error: null });
                } catch (err) {
                    updateApp(s.marble.id, ai, { error: err.message });
                }
            }
        }
        setGenLabel('');
        setGenerating(false);
    };

    const downloadPDF = async () => {
        try {
            const stones = selected.map(({ marble, applications }) => ({
                id: marble.id,
                name: marble.name,
                description: marble.description || '',
                format: '',
                lotSize: '',
                price: (marble.physical_properties?.priceRange || []).join(' · '),
                imageDataUrl: null,
                imageUrl: marble.imageUrl,
                applications,
            }));
            const pdf = await buildPDF(stones);
            pdf.save('Ston_Stone_Dossier.pdf');
        } catch (err) {
            setError('PDF generation failed: ' + err.message);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-6xl h-[88vh] bg-stone-950 border border-white/10 rounded-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-3">
                            <FileText className="text-bronze" size={20} />
                            <div>
                                <h2 className="font-serif text-lg text-white">Create Dossier</h2>
                                <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
                                    Pick stones from the gallery · AI renders · branded PDF
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {totalRenders > 0 && (
                                <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">
                                    {doneRenders}/{totalRenders} renders
                                </span>
                            )}
                            {selected.length > 0 && !generating && !allReady && (
                                <button
                                    onClick={generateAll}
                                    className="flex items-center gap-2 px-4 py-2 bg-bronze text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-stone-900 transition-colors"
                                >
                                    <Sparkles size={12} /> Generate Renders
                                </button>
                            )}
                            {generating && (
                                <span className="flex items-center gap-2 text-bronze text-[10px] font-bold uppercase tracking-widest">
                                    <Loader2 size={12} className="animate-spin" /> {genLabel || 'Rendering…'}
                                </span>
                            )}
                            {allReady && (
                                <button
                                    onClick={downloadPDF}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-stone-900 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-bronze hover:text-white transition-colors"
                                >
                                    <Download size={12} /> Download PDF
                                </button>
                            )}
                            <button onClick={onClose} className="p-2 text-stone-400 hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="px-6 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs shrink-0">{error}</div>
                    )}

                    {/* Body: gallery picker (left) + selection config (right) */}
                    <div className="flex-1 flex flex-col md:flex-row min-h-0">
                        {/* Gallery picker */}
                        <div className="flex-1 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-white/10">
                            <div className="p-4 shrink-0">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                                    <input
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        placeholder="Search the gallery…"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-bronze"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {filtered.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => toggleStone(m)}
                                            className={`relative rounded-xl overflow-hidden aspect-square group border transition-all ${isSelected(m.id) ? 'border-bronze ring-1 ring-bronze' : 'border-white/10 hover:border-white/30'}`}
                                        >
                                            <img src={m.imageUrl} alt={m.name} loading="lazy" className="w-full h-full object-cover" />
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-6">
                                                <p className="text-[11px] text-white font-medium truncate text-left">{m.name}</p>
                                            </div>
                                            {isSelected(m.id) && (
                                                <span className="absolute top-2 right-2 w-5 h-5 bg-bronze rounded-full flex items-center justify-center">
                                                    <Check size={12} className="text-white" />
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {filtered.length === 0 && (
                                    <p className="text-stone-500 text-sm text-center py-10">No stones match “{query}”.</p>
                                )}
                            </div>
                        </div>

                        {/* Selection config */}
                        <div className="w-full md:w-[380px] flex flex-col min-h-0 shrink-0">
                            <div className="px-4 py-3 border-b border-white/10 shrink-0 flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">
                                    Selected · {selected.length}/{MAX_STONES}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {selected.length === 0 && (
                                    <p className="text-stone-500 text-sm text-center py-10">
                                        Tap stones in the gallery to add them to your dossier.
                                    </p>
                                )}
                                {selected.map(({ marble, applications }) => (
                                    <div key={marble.id} className="border border-white/10 rounded-xl overflow-hidden">
                                        <div className="flex items-center gap-3 p-3 bg-white/5">
                                            <img src={marble.imageUrl} alt={marble.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                            <p className="text-sm text-white font-medium flex-1 truncate">{marble.name}</p>
                                            <button onClick={() => toggleStone(marble)} className="p-1 text-stone-500 hover:text-red-400 transition-colors shrink-0">
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {applications.map((app, ai) => (
                                                <div key={ai} className="flex items-center gap-2">
                                                    <div className="relative flex-1">
                                                        <select
                                                            value={app.application}
                                                            disabled={generating}
                                                            onChange={e => {
                                                                const opt = APPLICATION_OPTIONS.find(o => o.value === e.target.value);
                                                                updateApp(marble.id, ai, { application: e.target.value, label: opt?.label || e.target.value, renderUrl: null, error: null });
                                                            }}
                                                            className="w-full bg-stone-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-bronze appearance-none"
                                                        >
                                                            {APPLICATION_OPTIONS.map(o => (
                                                                <option key={o.value} value={o.value}>{o.label}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" size={12} />
                                                    </div>
                                                    {app.renderUrl && <Check size={14} className="text-emerald-400 shrink-0" />}
                                                    {app.error && <span className="text-red-400 text-[10px] shrink-0">failed</span>}
                                                    {applications.length > 1 && (
                                                        <button onClick={() => removeApp(marble.id, ai)} disabled={generating} className="p-1 text-stone-600 hover:text-red-400 transition-colors shrink-0">
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {applications.length < MAX_APPS_PER_STONE && (
                                                <button
                                                    onClick={() => addApp(marble.id)}
                                                    disabled={generating}
                                                    className="flex items-center gap-1 text-[10px] text-bronze font-bold uppercase tracking-widest hover:text-white transition-colors"
                                                >
                                                    <Plus size={10} /> Application
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {totalRenders > 0 && (
                                <div className="px-4 py-3 border-t border-white/10 shrink-0">
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-bronze rounded-full transition-all duration-500" style={{ width: `${(doneRenders / Math.max(totalRenders, 1)) * 100}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ArchitectDossier;
