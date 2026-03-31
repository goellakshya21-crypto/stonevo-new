import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Box, Camera, Download, Share2, Expand, ArrowRight } from 'lucide-react';
import { aiVisualizer } from '../lib/aiVisualizer';

const AIVisualizationModal = ({ isOpen, onClose, stone, roomName, initialStyle, intendedApp }) => {
    const [loading, setLoading] = useState(false);
    const [visualData, setVisualData] = useState(null);
    const [roomImage, setRoomImage] = useState(null);
    const [imageReady, setImageReady] = useState(false);
    const [finalRoomType, setFinalRoomType] = useState(roomName || 'Luxury Space');
    const [selectedStyle, setSelectedStyle] = useState(initialStyle || 'Classical');
    const [error, setError] = useState(null);
    
    // Application Selection States
    const [showAppSelection, setShowAppSelection] = useState(false);
    const [selectedApp, setSelectedApp] = useState(intendedApp || null);
    const [normalizedApps, setNormalizedApps] = useState([]);

    const roomStyles = [
        'Classical', 'Modern', 'Contemporary', 'Minimalist', 'Neo Classical', 
        'Modern Classical', 'Industrial', 'Scandinavian', 
        'Mediterranean', 'Art Deco', 'Sustainable / Green'
    ];

    // Mapping: Application Category -> Default AI Room Type
    const APP_ROOM_MAP = {
        'Counter Top': 'Kitchen',
        'Kitchen': 'Kitchen',
        'Washroom': 'Bathroom',
        'Bathroom': 'Bathroom',
        'Vanity': 'Bathroom',
        'Powder Room': 'Bathroom',
        'Wall Cladding': 'Living Room',
        'Flooring': 'Living Room',
        'Floor': 'Living Room',
        'Facade': 'Lobby',
        'Exterior': 'Lobby',
        'Feature Wall': 'Living Room',
        'Staircase': 'Lobby',
        'Dining': 'Kitchen',
        'Table Top': 'Kitchen'
    };

    useEffect(() => {
        if (isOpen && stone) {
            console.log("[AI Modal] Stone loaded:", stone.name, "Apps:", stone.application);
            setError(null);
            setImageReady(false);
            setRoomImage(null);
            
            // Normalize application to array
            const apps = Array.isArray(stone.application) 
                ? stone.application 
                : (stone.application ? [stone.application] : []);
            
            setNormalizedApps(apps);
            
            // If the user specified an application (e.g. via Chat) or there's only one, proceed
            if (intendedApp) {
                console.log("[AI Modal] Using intended application:", intendedApp);
                setSelectedApp(intendedApp);
                setShowAppSelection(false);
                handleVisualize(null, intendedApp);
            } else if (apps.length === 1) {
                console.log("[AI Modal] Single application detected:", apps[0]);
                setSelectedApp(apps[0]);
                setShowAppSelection(false);
                handleVisualize(null, apps[0]);
            } else if (apps.length > 1) {
                console.log("[AI Modal] Multiple applications detected. Asking user...");
                setShowAppSelection(true);
                setLoading(false); // Stop loading while waiting for choice
            } else {
                console.log("[AI Modal] No application metadata found, defaulting to rendering.");
                handleVisualize();
            }
        }
    }, [isOpen, stone?.name, intendedApp]); // Use name instead of whole object to prevent infinite loops

    const handleDownloadImage = () => {
        if (!roomImage) return;
        
        console.log("[AI Modal] Commencing download of rendering...");
        const link = document.createElement('a');
        link.href = roomImage;
        // Clean stone name for filename
        const safeName = (stone?.name || 'render').replace(/[^a-z0-9]/gi, '-').toLowerCase();
        link.download = `stonevo-${safeName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleVisualize = async (forcedStyle, forcedApp) => {
        const styleToUse = forcedStyle || selectedStyle;
        const appToUse = forcedApp || selectedApp || 'Surface';
        
        console.log("[AI Modal] Starting visualization for:", stone?.name, "Application:", appToUse);
        setLoading(true);
        setImageReady(false);
        setRoomImage(null);
        setError(null);
        setShowAppSelection(false);

        // Determine roomType from Mapping
        let roomType = 'Living Room'; // Global Default
        
        const mappedRoom = Object.keys(APP_ROOM_MAP).find(k => 
            appToUse.toLowerCase().includes(k.toLowerCase()) || 
            k.toLowerCase().includes(appToUse.toLowerCase())
        );

        if (mappedRoom) {
            roomType = APP_ROOM_MAP[mappedRoom];
        }

        // Contextual overrides (if roomName was passed by chat override)
        if (roomName && !intendedApp) {
            roomType = roomName;
        }

        console.log("[AI Modal] Determined roomType from app:", roomType);
        setFinalRoomType(roomType);

        try {
            console.log("[AI Modal] Calling aiVisualizer API...");
            const [aiData, imageUrl] = await Promise.all([
                aiVisualizer.generateVisualDescription(
                    stone?.name || 'Natural Stone', roomType, stone?.colour || 'Natural', appToUse, styleToUse
                ),
                aiVisualizer.generateRoomImage(
                    stone?.name || 'Natural Stone', roomType, stone?.colour || 'Natural', appToUse, stone?.image_url, styleToUse
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
                            className="absolute top-6 right-6 z-[60] p-3 bg-black/40 hover:bg-[#eca413] text-white hover:text-black rounded-full transition-all backdrop-blur-md"
                        >
                            <X size={20} />
                        </button>

                        {/* Selection Step */}
                        {showAppSelection && (
                            <div className="absolute inset-0 z-50 bg-[#0f0d0a] flex flex-col items-center justify-center p-12">
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="max-w-xl w-full text-center"
                                >
                                    <div className="w-16 h-16 bg-luxury-bronze/10 rounded-full flex items-center justify-center mx-auto mb-8">
                                        <Box className="text-[#eca413]" size={32} />
                                    </div>
                                    <h2 className="text-3xl font-serif text-white mb-4 italic">Tailor the Vision</h2>
                                    <p className="text-white/50 text-sm mb-12 tracking-wide font-sans leading-relaxed">
                                        This specimen is versatile. How would you like to see <strong>{stone?.name}</strong> applied in your architectural rendering?
                                    </p>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {normalizedApps.map(app => (
                                            <button
                                                key={app}
                                                onClick={() => {
                                                    setSelectedApp(app);
                                                    handleVisualize(null, app);
                                                }}
                                                className="group relative p-6 bg-white/[0.03] border border-white/10 rounded-2xl text-left hover:bg-white/[0.08] hover:border-[#eca413]/50 transition-all duration-300 overflow-hidden"
                                            >
                                                <div className="relative z-10">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#eca413] mb-2 group-hover:translate-x-1 transition-transform">{app}</p>
                                                    <p className="text-xs text-white/40 group-hover:text-white/80 transition-colors">Visualize in a {APP_ROOM_MAP[Object.keys(APP_ROOM_MAP).find(k => app.toLowerCase().includes(k.toLowerCase()))] || 'Luxury Space'}</p>
                                                </div>
                                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowRight size={16} className="text-[#eca413]" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <button 
                                        onClick={onClose}
                                        className="mt-12 text-[10px] uppercase font-bold tracking-widest text-white/20 hover:text-white transition-colors"
                                    >
                                        Cancel Visualization
                                    </button>
                                </motion.div>
                            </div>
                        )}

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
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-4 bg-white/5 rounded animate-pulse" style={{ width: `${100 - (i % 3) * 20}%` }}></div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div>
                                        <p className="text-white/90 font-serif italic text-base leading-relaxed mb-6">
                                            "{visualData?.description?.split('.').slice(0, 2).join('.') + '.'}"
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <button 
                                            onClick={handleDownloadImage}
                                            className="w-full py-4 bg-[#eca413] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#d99510] transition-all flex items-center justify-center gap-2"
                                        >
                                            <Download size={14} /> Download Rendering
                                        </button>
                                        
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleVisualize(); }}
                                            className="w-full py-4 bg-white/5 text-white/40 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/10"
                                        >
                                            <Sparkles size={14} /> New Architecture
                                        </button>
                                    </div>

                                    <p className="text-[8px] text-white/20 text-center uppercase tracking-widest leading-relaxed">
                                        Rendered with Google Gemini & Stonevo Neural Engine
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
