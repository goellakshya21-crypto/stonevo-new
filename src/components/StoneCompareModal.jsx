import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Download, ArrowRight } from 'lucide-react';
import { aiVisualizer } from '../lib/aiVisualizer';
import ImageCompareSlider from './ImageCompareSlider';
import VisualizationLimitNotice from './VisualizationLimitNotice';

/**
 * Two stones, one room, a line you drag between them.
 *
 * THE WHOLE TRICK IS THAT THE SECOND RENDER IS AN EDIT OF THE FIRST.
 * Generating twice from the same prompt gives two different rooms -- different
 * furniture, different light, different camera -- and comparing those tells you
 * nothing about the stone. So the first render creates the scene, and the
 * second is produced by handing that render back as the "room photo" with the
 * other stone as the material. Same room, same light, one variable changed.
 *
 * That is the existing own-photo path doing exactly what it already does; no
 * new server branch was needed for any of this.
 *
 * Costs TWO renders, and two credits against the user's limit, because it
 * really does generate two images.
 */

// Deliberately a short local list rather than the visualiser's full set: a
// comparison needs a room and a style to go with the surface, and only the
// applications where two stones genuinely read differently are worth offering.
const COMPARE_APPS = [
    { value: 'Flooring',     room: 'Minimalist Living Room', style: 'Modern' },
    { value: 'Feature Wall', room: 'Luxury Living Room',     style: 'Modern' },
    { value: 'Counter Top',  room: 'Luxury Kitchen',         style: 'Modern' },
    { value: 'Washroom',     room: 'High-end Bathroom',      style: 'Modern' },
];

const StoneCompareModal = ({ isOpen, stoneA, stoneB, onClose }) => {
    const [app, setApp] = useState(null);
    const [phase, setPhase] = useState('pick');   // pick | scene | swap | done
    const [images, setImages] = useState(null);   // { a, b }
    const [error, setError] = useState(null);
    const [limitReached, setLimitReached] = useState(false);
    const inFlightRef = useRef(false);

    useEffect(() => {
        if (!isOpen) return;
        setApp(null);
        setPhase('pick');
        setImages(null);
        setError(null);
        setLimitReached(false);
        inFlightRef.current = false;
    }, [isOpen, stoneA?.id, stoneB?.id]);

    const nameOf = (s) => s?.name || 'Stone';
    const colourOf = (s) =>
        [].concat(s?.physical_properties?.color || s?.colour || s?.color || []).filter(Boolean).join(', ') || 'Natural';
    const imageOf = (s) => s?.imageUrl || s?.image_url;

    const run = async (chosen) => {
        // Each click here spends two renders, so a double-click must not spend four.
        if (inFlightRef.current) return;
        inFlightRef.current = true;

        setApp(chosen);
        setError(null);
        setImages(null);
        setPhase('scene');

        try {
            // 1. Build the room around the first stone.
            const a = await aiVisualizer.generateRoomImage({
                stoneName: nameOf(stoneA),
                roomType: chosen.room,
                stoneType: colourOf(stoneA),
                application: chosen.value,
                imageUrl: imageOf(stoneA),
                roomStyle: chosen.style,
            });

            // The swap sends this render back as the room photo, and the server
            // only accepts a data URL there. The Unsplash fallback is a remote
            // URL, so stop rather than silently comparing against a stock photo.
            if (!a || !a.startsWith('data:')) {
                throw new Error('The first render did not come back in a form we can re-use. Please try again.');
            }

            setPhase('swap');

            // 2. Same room, other stone. This is the comparison.
            const b = await aiVisualizer.generateRoomImage({
                stoneName: nameOf(stoneB),
                roomType: chosen.room,
                stoneType: colourOf(stoneB),
                application: chosen.value,
                imageUrl: imageOf(stoneB),
                roomStyle: chosen.style,
                userRoomImage: a,
            });

            setImages({ a, b: b || a });
            setPhase('done');
        } catch (err) {
            console.error('[Compare] failed:', err.message);
            if (err.limitReached) setLimitReached(true);
            else setError(err.message);
            setPhase('pick');
        } finally {
            inFlightRef.current = false;
        }
    };

    const download = () => {
        if (!images?.b) return;
        const link = document.createElement('a');
        link.href = images.b;
        link.download = `ston-compare-${nameOf(stoneA)}-vs-${nameOf(stoneB)}`
            .replace(/[^a-z0-9-]+/gi, '-').toLowerCase() + '.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const busy = phase === 'scene' || phase === 'swap';

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-10"
                >
                    <div className="relative bg-[#0f0d0a] border border-white/10 w-full max-w-6xl h-[90vh] rounded-2xl md:rounded-3xl overflow-hidden flex flex-col">
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="absolute top-4 right-4 z-[60] p-2.5 bg-black/70 hover:bg-[#eca413] text-white hover:text-black rounded-full transition-all border border-white/20"
                        >
                            <X size={18} />
                        </button>

                        {limitReached && <VisualizationLimitNotice onClose={onClose} />}

                        {/* Header: the two stones being compared */}
                        <div className="px-6 md:px-10 pt-6 pb-5 border-b border-white/5 shrink-0">
                            <p className="text-[9px] uppercase tracking-[0.3em] text-[#eca413] font-bold mb-3">Compare</p>
                            <div className="flex items-center gap-4">
                                {[stoneA, stoneB].map((s, i) => (
                                    <React.Fragment key={s?.id || i}>
                                        {i === 1 && <span className="text-white/20 text-xs shrink-0">vs</span>}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="size-10 rounded-lg overflow-hidden border border-white/15 shrink-0">
                                                <img src={imageOf(s)} alt={nameOf(s)} className="w-full h-full object-cover" />
                                            </div>
                                            <p className="text-white font-serif italic text-sm truncate">{nameOf(s)}</p>
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col">
                            {phase === 'done' && images ? (
                                <>
                                    <div className="flex-1 min-h-0 p-4 md:p-6">
                                        <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10">
                                            <ImageCompareSlider
                                                before={images.a}
                                                after={images.b}
                                                beforeLabel={nameOf(stoneA)}
                                                afterLabel={nameOf(stoneB)}
                                            />
                                        </div>
                                    </div>
                                    <div className="px-6 md:px-10 pb-6 flex items-center justify-between gap-4 shrink-0">
                                        <p className="text-white/30 text-[10px] uppercase tracking-widest">
                                            Drag the line · {app?.value}
                                        </p>
                                        <button
                                            onClick={download}
                                            className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 text-white/70 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                        >
                                            <Download size={13} /> Save {nameOf(stoneB)}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                    {busy ? (
                                        <>
                                            <div className="w-12 h-12 border-2 border-[#eca413]/20 border-t-[#eca413] rounded-full animate-spin mb-6" />
                                            <h3 className="text-[#eca413] font-serif italic text-xl mb-2">
                                                {phase === 'scene' ? 'Building the room…' : 'Swapping in the second stone…'}
                                            </h3>
                                            <p className="text-white/40 text-[10px] uppercase tracking-widest">
                                                {phase === 'scene' ? 'Step 1 of 2' : 'Step 2 of 2 · same room, other stone'}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-2xl md:text-3xl font-serif text-white mb-3 italic">
                                                Where should we compare them?
                                            </h3>
                                            <p className="text-white/50 text-xs md:text-sm mb-8 max-w-md leading-relaxed">
                                                Both stones are shown in the same room, under the same light, so the
                                                only difference you see is the material itself.
                                            </p>

                                            {error && (
                                                <p className="mb-6 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 max-w-md">
                                                    {String(error).replace(/^Proxy error:\s*/i, '')}
                                                </p>
                                            )}

                                            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                                                {COMPARE_APPS.map(a => (
                                                    <button
                                                        key={a.value}
                                                        onClick={() => run(a)}
                                                        className="group relative p-5 bg-white/[0.03] border border-white/10 rounded-2xl text-left hover:bg-white/[0.08] hover:border-[#eca413]/50 transition-all"
                                                    >
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#eca413]">{a.value}</p>
                                                        <ArrowRight size={13} className="text-[#eca413] absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </button>
                                                ))}
                                            </div>

                                            <p className="text-white/20 text-[9px] uppercase tracking-widest mt-8 flex items-center gap-2">
                                                <Sparkles size={10} /> Uses two of your visualisations
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default StoneCompareModal;
