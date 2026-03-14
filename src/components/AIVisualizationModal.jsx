import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Box, Camera, Download, Share2, Expand } from 'lucide-react';
import { aiVisualizer } from '../lib/aiVisualizer';

const AIVisualizationModal = ({ isOpen, onClose, stone, roomName, initialStyle }) => {
    const [loading, setLoading] = useState(true);
    const [visualData, setVisualData] = useState(null);
    const [roomImage, setRoomImage] = useState(null);
    const [imageReady, setImageReady] = useState(false);
    const [finalRoomType, setFinalRoomType] = useState(roomName || 'Luxury Space');
    const [selectedStyle, setSelectedStyle] = useState(initialStyle || 'Classical');
    const [error, setError] = useState(null);

    const roomStyles = [
        'Classical', 'Modern', 'Contemporary', 'Minimalist', 'Neo Classical', 
        'Modern Classical', 'Industrial', 'Scandinavian', 
        'Mediterranean', 'Art Deco', 'Sustainable / Green'
    ];

    useEffect(() => {
        if (isOpen && stone) {
            setError(null);
            setImageReady(false);
            handleVisualize();
        }
    }, [isOpen, stone]);

    const handleVisualize = async (forcedStyle) => {
        const styleToUse = forcedStyle || selectedStyle;
        const targetRoom = roomName || 'Luxury Space';
        console.log("[AI Modal] Starting visualization for:", stone?.name, "in room:", targetRoom);
        setLoading(true);
        setImageReady(false);
        setRoomImage(null);
        setError(null);

        const app = stone?.application?.toLowerCase() || stone?.type?.toLowerCase() || '';
        const room = targetRoom.toLowerCase();

        let roomType = 'Living Room';

        if (app.includes('countertop') || app.includes('kitchen')) {
            roomType = (room.includes('bath') || app.includes('bath')) ? 'Bathroom' : 'Kitchen';
        } else if (room.includes('kitchen')) {
            roomType = 'Kitchen';
        } else if (room.includes('bath')) {
            roomType = 'Bathroom';
        } else if (room.includes('living')) {
            roomType = 'Living Room';
        } else if (room.includes('bed')) {
            roomType = 'Bedroom';
        } else if (room.includes('lobby') || app.includes('exterior')) {
            roomType = 'Lobby';
        }

        console.log("[AI Modal] Determined roomType:", roomType);
        setFinalRoomType(roomType);

        try {
            console.log("[AI Modal] Calling aiVisualizer API...");
            const [aiData, imageUrl] = await Promise.all([
                aiVisualizer.generateVisualDescription(
                    stone?.name || 'Natural Stone', roomType, stone?.colour || 'Natural', app || 'Surface', styleToUse
                ),
                aiVisualizer.generateRoomImage(
                    stone?.name || 'Natural Stone', roomType, stone?.colour || 'Natural', app || 'Surface', stone?.image_url, styleToUse
                )
            ]);

            console.log("[AI Modal] API Response received. URL exists:", !!imageUrl);
            setVisualData(aiData);

            if (!imageUrl) {
                console.warn("[AI Modal] No image URL returned, using fallback.");
                setRoomImage("https://images.unsplash.com/photo-1556911220-e15595b6a981?auto=format&fit=crop&q=80&w=1200");
                setImageReady(true);
                setLoading(false);
                return;
            }

            const loadImage = (url, isFallback = false) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    let isResolved = false;

                    const finish = (finalUrl) => {
                        if (!isResolved) {
                            isResolved = true;
                            resolve(finalUrl);
                        }
                    };

                    img.onload = () => {
                        console.log("[AI Modal] DOM image pre-loaded.");
                        finish(url);
                    };
                    img.onerror = () => {
                        console.error("[AI Modal] Image load failed for:", url);
                        if (!isFallback) {
                            loadImage("https://images.unsplash.com/photo-1556911220-e15595b6a981?auto=format&fit=crop&q=80&w=1200", true).then(resolve);
                        } else {
                            finish(url);
                        }
                    };

                    setTimeout(() => {
                        if (!isResolved) {
                            console.warn("[AI Modal] Image load timeout. Forcing resolution.");
                            if (!isFallback) {
                                loadImage("https://images.unsplash.com/photo-1556911220-e15595b6a981?auto=format&fit=crop&q=80&w=1200", true).then(resolve);
                            } else {
                                finish(url);
                            }
                        }
                    }, isFallback ? 10000 : 35000);
                    img.src = url;
                });
            };

            const finalImageUrl = await loadImage(imageUrl);
            setRoomImage(finalImageUrl);
            setImageReady(true);
        } catch (error) {
            console.error("[AI Modal] FATAL ERROR:", error.message);
            setError(error.message);
            setVisualData({
                description: `A stunning interior vision featuring ${stone?.name || 'this stone'}.`,
                style_keywords: ["Modern", "Elegant"],
                lighting: "Natural"
            });
            setRoomImage("https://images.unsplash.com/photo-1556911220-e15595b6a981?auto=format&fit=crop&q=80&w=1200");
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-12 overflow-hidden"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 40 }}
                        className="bg-[#0f0d0a] border border-white/10 w-full max-w-6xl h-full md:h-auto md:aspect-[16/9] rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(236,164,19,0.15)] flex flex-col md:flex-row relative"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 z-50 p-3 bg-black/40 hover:bg-[#eca413] text-white hover:text-black rounded-full transition-all backdrop-blur-md"
                        >
                            <X size={20} />
                        </button>

                        {/* Left Side: AI Visual Rendering */}
                        <div className="flex-1 bg-stone-900 relative overflow-hidden group">
                            {!imageReady ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20 bg-stone-900">
                                    {error ? (
                                        <div className="text-center px-8 flex flex-col items-center max-w-sm">
                                            <div className="p-4 bg-amber-500/10 rounded-full mb-4">
                                                <Camera className="text-amber-400" size={32} />
                                            </div>
                                            <h3 className="text-white font-serif text-xl mb-2">Rendering Incomplete</h3>
                                            <p className="text-white/40 text-xs mb-8 text-center leading-relaxed">
                                                The AI couldn't composite the stone this time. This can happen occasionally — hit Revisualise to try again with the same stone.
                                            </p>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setError(null); handleVisualize(); }}
                                                className="px-8 py-3 bg-[#eca413] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all shadow-xl active:scale-95 flex items-center gap-2"
                                            >
                                                <Sparkles size={14} />
                                                Revisualise
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <div className="w-20 h-20 border-2 border-[#eca413]/20 border-t-[#eca413] rounded-full animate-spin"></div>
                                                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#eca413] animate-pulse" size={24} />
                                            </div>
                                            <div className="text-center px-4">
                                                <h3 className="text-[#eca413] font-serif italic text-xl mb-1">Gemini AI is reimagining your space...</h3>
                                                <p className="text-white/40 text-[10px] uppercase tracking-widest">Architectural Neural Rendering in Progress</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <img
                                        src={roomImage}
                                        alt="AI Rendering"
                                        className="w-full h-full object-cover animate-image-reveal"
                                        onError={(e) => {
                                            console.error("[AI Modal] React img onError triggered");
                                            e.target.src = "https://images.unsplash.com/photo-1556911220-e15595b6a981?auto=format&fit=crop&q=80&w=1200";
                                        }}
                                        style={{
                                            filter: 'contrast(1.1) saturate(0.9) brightness(0.9)',
                                            mixBlendMode: 'normal'
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                                    <div className="absolute bottom-8 left-8 flex items-end gap-6">
                                        <div className="size-24 rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl">
                                            <img src={stone?.image_url || 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?auto=format&fit=crop&q=80&w=200'} alt="Texture" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="pb-2">
                                            <p className="text-[10px] font-bold text-[#eca413] uppercase tracking-widest mb-1">Material Source</p>
                                            <h4 className="text-white font-serif text-lg italic">{stone?.name}</h4>
                                        </div>
                                    </div>
                                </>
                            )}
                            {!imageReady && <div className="absolute inset-0 bg-scanline pointer-events-none opacity-20 z-30"></div>}
                        </div>

                        {/* Right Side: Architectural Analysis */}
                        <div className="w-full md:w-[400px] p-10 flex flex-col bg-[#0f0d0a] border-l border-white/5 overflow-y-auto custom-scrollbar">
                            <div className="mb-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles size={16} className="text-[#eca413]" />
                                    <span className="text-[10px] font-bold tracking-[0.3em] text-[#eca413] uppercase">AI Architectural Vision</span>
                                </div>
                                <h2 className="text-3xl font-serif text-white mb-2 leading-tight">
                                    {finalRoomType} <br />
                                    <span className="text-white/40 italic">Reimagined</span>
                                </h2>
                            </div>

                            {/* Style Selector */}
                            <div className="mb-8">
                                <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest block mb-3">Architectural Style</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select 
                                        value={selectedStyle}
                                        onChange={(e) => {
                                            setSelectedStyle(e.target.value);
                                            handleVisualize(e.target.value);
                                        }}
                                        disabled={loading}
                                        className="col-span-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/80 focus:outline-none focus:border-[#eca413] transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        {roomStyles.map(style => (
                                            <option key={style} value={style} className="bg-[#0f0d0a]">{style}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {!imageReady ? (
                                <div className="space-y-6">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="h-4 bg-white/5 rounded animate-pulse" style={{ width: `${100 - (i % 3) * 20}%` }}></div>
                                    ))}
                                    <div className="pt-10">
                                        <div className="h-12 bg-white/5 rounded-xl animate-pulse"></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-10">
                                    <div>
                                        <p className="text-white/80 font-serif italic text-lg leading-relaxed mb-6">
                                            "{visualData?.description}"
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {visualData?.style_keywords?.map(keyword => (
                                                <span key={keyword} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] uppercase font-bold text-white/50">
                                                    {keyword}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                            <p className="text-[9px] uppercase font-bold text-white/30 tracking-widest mb-2">Lighting Mode</p>
                                            <p className="text-xs text-white uppercase tracking-wider">{visualData?.lighting || 'Natural Daylight'}</p>
                                        </div>
                                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                            <p className="text-[9px] uppercase font-bold text-white/30 tracking-widest mb-2">Reflectivity</p>
                                            <p className="text-xs text-white uppercase tracking-wider">High Gloss</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-6">
                                        <button className="w-full py-4 bg-[#eca413] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#d99510] transition-all flex items-center justify-center gap-2">
                                            <Download size={14} /> Download Rendering
                                        </button>
                                        <button className="w-full py-4 bg-white/5 text-white/60 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/10">
                                            <Share2 size={14} /> Send to Client
                                        </button>
                                    </div>

                                    <p className="text-[9px] text-white/20 text-center uppercase tracking-widest italic pt-4">
                                        * This AI visualization is for concept and material interplay demonstration.
                                    </p>
                                </div>
                            )}
                        </div>

                        <style>{`
                            @keyframes image-reveal {
                                from { transform: scale(1.1); filter: brightness(0) blur(20px); }
                                to { transform: scale(1); filter: brightness(0.9) blur(0); }
                            }
                            .animate-image-reveal {
                                animation: image-reveal 2s cubic-bezier(0.2, 0, 0.2, 1) forwards;
                            }
                            .bg-scanline {
                                background: linear-gradient(to bottom, transparent 50%, rgba(236, 164, 19, 0.1) 50%);
                                background-size: 100% 4px;
                            }
                        `}</style>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default AIVisualizationModal;
