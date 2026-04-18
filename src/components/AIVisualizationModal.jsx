import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Box, Camera, Download, Share2, Expand, ArrowRight, Upload, Image as ImageIcon, Wand2, RefreshCw } from 'lucide-react';
import { aiVisualizer } from '../lib/aiVisualizer';

const AIVisualizationModal = ({ isOpen, onClose, stone, roomName, initialStyle, intendedApp }) => {
    const [loading, setLoading] = useState(false);
    const [visualData, setVisualData] = useState(null);
    const [roomImage, setRoomImage] = useState(null);
    const [imageReady, setImageReady] = useState(false);
    const [finalRoomType, setFinalRoomType] = useState(roomName || 'Luxury Space');
    const [selectedStyle, setSelectedStyle] = useState(initialStyle || 'Classical');
    const [error, setError] = useState(null);
    
    // Lifecycle Steps
    const [visualizationStep, setVisualizationStep] = useState('app'); // 'app' | 'method' | 'upload'
    const [userRoomImage, setUserRoomImage] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // Application Selection States
    const [selectedApp, setSelectedApp] = useState(intendedApp || null);
    const [normalizedApps, setNormalizedApps] = useState([]);

    const roomStyles = [
        'Classical', 'Modern', 'Contemporary', 'Minimalist', 'Neo Classical', 
        'Modern Classical', 'Industrial', 'Scandinavian', 
        'Mediterranean', 'Art Deco', 'Sustainable / Green'
    ];

    // Mapping: Application Category -> Default AI Room Type
    const APP_ROOM_MAP = {
        // High Priority / Specialized Residential Exteriors
        'Facade': 'Luxury Home Balcony',
        'Exterior': 'Modern Residential Exterior',
        'Outer Wall': 'High-end Villa Facade',
        'Driveway': 'Outdoor Entrance',
        'Balcony': 'Luxury Residential Balcony',
        
        // Interior
        'Counter Top': 'Luxury Kitchen',
        'Kitchen': 'Luxury Kitchen',
        'Washroom': 'High-end Bathroom',
        'Bathroom': 'High-end Bathroom',
        'Vanity': 'High-end Bathroom',
        'Powder Room': 'High-end Bathroom',
        'Wall Cladding': 'Modern Living Room',
        'Flooring': 'Minimalist Living Room',
        'Floor': 'Minimalist Living Room',
        'Feature Wall': 'Luxury Living Room',
        'Staircase': 'Grand Lobby',
        'Dining': 'Luxury Dining Room',
        'Table Top': 'Bespoke Kitchen'
    };

    useEffect(() => {
        if (isOpen && stone) {
            console.log("[AI Modal] Stone loaded:", stone.name, "Apps:", stone.application);
            setError(null);
            setImageReady(false);
            setRoomImage(null);
            setUserRoomImage(null);
            
            // Normalize application to array
            const apps = Array.isArray(stone.application) 
                ? stone.application 
                : (stone.application ? [stone.application] : []);
            
            setNormalizedApps(apps);
            
            if (intendedApp) {
                setSelectedApp(intendedApp);
                setVisualizationStep('method'); // Still give choice even if app is pre-selected
            } else if (apps.length === 1) {
                setSelectedApp(apps[0]);
                setVisualizationStep('method');
            } else if (apps.length > 1) {
                setVisualizationStep('app');
                setLoading(false);
            } else {
                setSelectedApp('Surface');
                setVisualizationStep('method');
            }
        }
    }, [isOpen, stone?.id, intendedApp]); 

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

    const handleImageUpload = async (file) => {
        if (!file) return;
        
        // Convert to Base64 with Resizing
        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
                
                setUserRoomImage(resizedBase64);
                handleVisualize(null, selectedApp, resizedBase64);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleVisualize = async (forcedStyle, forcedApp, forcedUserImage) => {
        const styleToUse = forcedStyle || selectedStyle;
        const appToUse = forcedApp || selectedApp || 'Surface';
        const userImgToUse = forcedUserImage !== undefined ? forcedUserImage : userRoomImage;
        
        console.log("[AI Modal] Starting visualization for:", stone?.name, "Application:", appToUse, "Custom Image:", !!userImgToUse);
        setLoading(true);
        setImageReady(false);
        setRoomImage(null);
        setError(null);
        setVisualizationStep(null);

        // Determine roomType from Mapping
        let roomType = 'Living Room'; // Global Default
        
        // Normalization helper for special characters like Façade
        const normalize = (str) => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
        const normalizedApp = normalize(appToUse);

        const mappedRoom = Object.keys(APP_ROOM_MAP).find(k => {
            const nk = normalize(k);
            return normalizedApp.includes(nk) || nk.includes(normalizedApp);
        });

        if (mappedRoom) {
            roomType = APP_ROOM_MAP[mappedRoom];
        }

        // Contextual overrides (if roomName was passed by chat override)
        if (roomName && !intendedApp) {
            roomType = roomName;
        }

        // FINAL CRITICAL CHECK: Force Outdoor if it's a Facade or Exterior synonym
        const isActuallyOutdoor = 
            normalizedApp.includes('facade') || 
            normalizedApp.includes('exterior') || 
            normalizedApp.includes('balcony') ||
            normalizedApp.includes('cladding') ||
            normalizedApp.includes('elevation') ||
            normalizedApp.includes('landscape') ||
            normalizedApp.includes('paving') ||
            normalizedApp.includes('entrance') ||
            normalizedApp.includes('outdoor') ||
            normalize(stone?.name).includes('facade') ||
            normalize(stone?.name).includes('exterior') ||
            normalize(stone?.description).includes('exterior') ||
            normalize(stone?.description).includes('facade') ||
            normalize(stone?.description).includes('balcony');

        if (isActuallyOutdoor && !userImgToUse) {
            console.log("[AI Modal] CRITICAL: Outdoor specimen detected (normalized)! Locking to Residential Balcony.");
            roomType = 'Luxury Residential Balcony with Outdoor View';
        }

        console.log("[AI Modal] FINAL Determined environment:", roomType, "for:", appToUse);
        setFinalRoomType(roomType);

        try {
            console.log("[AI Modal] Calling aiVisualizer API...");
            const [aiData, imageUrl] = await Promise.all([
                aiVisualizer.generateVisualDescription(
                    stone?.name || 'Natural Stone', roomType, stone?.colour || 'Natural', appToUse, styleToUse
                ),
                aiVisualizer.generateRoomImage(
                    stone?.name || 'Natural Stone', roomType, stone?.colour || 'Natural', appToUse, stone?.image_url, styleToUse, userImgToUse
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
                    {/* Main UI Body */}
                    <div className="bg-[#0f0d0a] border border-white/10 w-full max-w-6xl h-[90vh] md:h-auto md:aspect-[16/9] rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(236,164,19,0.15)] flex flex-col md:flex-row relative">
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 md:top-6 right-4 md:right-6 z-[100] p-2.5 md:p-3 bg-black/60 hover:bg-[#eca413] text-white hover:text-black rounded-full transition-all backdrop-blur-md border border-white/10"
                        >
                            <X size={18} />
                        </button>

                        {/* Sequential Steps Overlay */}
                        {visualizationStep && (
                            <div className="absolute inset-0 z-[80] bg-[#0f0d0a] flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="max-w-xl w-full"
                                >
                                    {visualizationStep === 'app' && (
                                        <div className="text-center">
                                            <div className="w-12 h-12 md:w-16 md:h-16 bg-luxury-bronze/10 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8">
                                                <Box className="text-[#eca413]" size={24} md:size={32} />
                                            </div>
                                            <h2 className="text-2xl md:text-3xl font-serif text-white mb-4 italic">Choose Application</h2>
                                            <p className="text-white/50 text-xs md:text-sm mb-8 tracking-wide leading-relaxed">
                                                Where will <strong>{stone?.name}</strong> be featured in your architectural project?
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                                {normalizedApps.length > 0 ? normalizedApps.map(app => (
                                                    <button
                                                        key={app}
                                                        onClick={() => {
                                                            setSelectedApp(app);
                                                            setVisualizationStep('method');
                                                        }}
                                                        className="group relative p-4 md:p-6 bg-white/[0.03] border border-white/10 rounded-xl md:rounded-2xl text-left hover:bg-white/[0.08] hover:border-[#eca413]/50 transition-all duration-300"
                                                    >
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#eca413] mb-1">{app}</p>
                                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <ArrowRight size={14} className="text-[#eca413]" />
                                                        </div>
                                                    </button>
                                                )) : (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedApp('Surface');
                                                            setVisualizationStep('method');
                                                        }}
                                                        className="col-span-2 p-6 bg-white/[0.03] border border-white/10 rounded-2xl text-center hover:bg-[#eca413] hover:text-black transition-all font-bold uppercase tracking-widest text-xs"
                                                    >
                                                        General Surface Application
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {visualizationStep === 'method' && (
                                        <div className="text-center">
                                            <div className="mb-6">
                                                <span className="px-3 py-1 bg-[#eca413]/10 text-[#eca413] rounded-full text-[8px] font-black uppercase tracking-widest border border-[#eca413]/20">
                                                    Selected: {selectedApp}
                                                </span>
                                            </div>
                                            <h2 className="text-2xl md:text-3xl font-serif text-white mb-4 italic">Next, Visualize Your Space</h2>
                                            <p className="text-white/50 text-xs md:text-sm mb-12 tracking-wide leading-relaxed">
                                                Would you like Gemini AI to generate a curated room for you, or do you want to see it in your actual project?
                                            </p>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <button
                                                    onClick={() => handleVisualize()}
                                                    className="group p-8 bg-white/[0.03] border border-white/10 rounded-2xl text-center hover:bg-white/[0.08] hover:border-[#eca413]/50 transition-all"
                                                >
                                                    <div className="w-12 h-12 bg-[#eca413]/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                        <Wand2 className="text-[#eca413]" size={20} />
                                                    </div>
                                                    <h3 className="text-white font-serif text-lg mb-1 italic">Surprise Me</h3>
                                                    <p className="text-white/30 text-[9px] uppercase tracking-widest">AI Generated Environment</p>
                                                </button>

                                                <button
                                                    onClick={() => setVisualizationStep('upload')}
                                                    className="group p-8 bg-white/[0.03] border border-white/10 rounded-2xl text-center hover:bg-white/[0.08] hover:border-[#eca413]/50 transition-all font-black uppercase tracking-widest"
                                                >
                                                    <div className="w-12 h-12 bg-[#eca413]/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                        <Camera className="text-[#eca413]" size={20} />
                                                    </div>
                                                    <h3 className="text-white font-serif text-lg mb-1 italic">Visualize My Space</h3>
                                                    <p className="text-white/30 text-[9px] uppercase tracking-widest">Upload Your Room Photo</p>
                                                </button>
                                            </div>

                                            <button 
                                                onClick={() => setVisualizationStep('app')}
                                                className="mt-12 text-[10px] text-white/30 uppercase tracking-[0.2em] hover:text-[#eca413] transition-colors flex items-center gap-2 mx-auto font-black"
                                            >
                                                <RefreshCw size={10} /> Change Application
                                            </button>
                                        </div>
                                    )}

                                    {visualizationStep === 'upload' && (
                                        <div className="text-center">
                                            <h2 className="text-2xl md:text-3xl font-serif text-white mb-4 italic">Upload Photo</h2>
                                            <p className="text-white/50 text-xs md:text-sm mb-12 tracking-wide font-sans leading-relaxed">
                                                Ensure the room is well-lit and the {selectedApp} surfaces are clearly visible.
                                            </p>

                                            <div 
                                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                                onDragLeave={() => setIsDragging(false)}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    setIsDragging(false);
                                                    const file = e.dataTransfer.files[0];
                                                    if (file) handleImageUpload(file);
                                                }}
                                                className={`relative border-2 border-dashed rounded-3xl p-12 transition-all ${
                                                    isDragging ? 'border-[#eca413] bg-[#eca413]/5' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                                                }`}
                                            >
                                                <input 
                                                    type="file" 
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleImageUpload(file);
                                                    }}
                                                />
                                                <div className="flex flex-col items-center">
                                                    <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mb-6">
                                                        <Upload className="text-white/40" size={32} />
                                                    </div>
                                                    <p className="text-white font-medium mb-2 font-serif text-lg italic">Tap to upload or drag & drop</p>
                                                    <p className="text-white/30 text-[10px] uppercase tracking-widest">Supports JPG, PNG (Max 10MB)</p>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => setVisualizationStep('method')}
                                                className="mt-12 text-[10px] text-white/30 uppercase tracking-[0.2em] hover:text-[#eca413] transition-colors flex items-center gap-2 mx-auto font-black"
                                            >
                                                Back to Selection
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        )}

                        {/* Left Side: AI Visual Rendering */}
                        <div className="h-[45vh] md:h-full md:flex-1 bg-stone-900 relative overflow-hidden group shrink-0">
                            {!imageReady ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 md:gap-6 z-20 bg-stone-900 px-6">
                                    {error ? (
                                        <div className="text-center flex flex-col items-center max-w-sm">
                                            <div className="p-3 bg-amber-500/10 rounded-full mb-3 md:mb-4">
                                                <Camera className="text-amber-400" size={24} md:size={32} />
                                            </div>
                                            <h3 className="text-white font-serif text-lg md:text-xl mb-2">Rendering Incomplete</h3>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setError(null); handleVisualize(); }}
                                                className="px-6 py-2.5 bg-[#eca413] text-black text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-white transition-all shadow-xl active:scale-95 flex items-center gap-2"
                                            >
                                                <Sparkles size={12} />
                                                Retry
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <div className="w-12 h-12 md:w-20 md:h-20 border-2 border-[#eca413]/20 border-t-[#eca413] rounded-full animate-spin"></div>
                                                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#eca413] animate-pulse" size={16} md:size={24} />
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-[#eca413] font-serif italic text-lg md:text-xl mb-1">Gemini AI is reimagining...</h3>
                                                <p className="text-white/40 text-[8px] md:text-[10px] uppercase tracking-widest">Neural Rendering in Progress</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <img
                                        src={roomImage}
                                        alt="AI Rendering"
                                        className="w-full h-full object-contain animate-image-reveal"
                                        onError={(e) => {
                                            e.target.src = "https://images.unsplash.com/photo-1556911220-e15595b6a981?auto=format&fit=crop&q=80&w=1200";
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                                    <div className="absolute bottom-4 md:bottom-8 left-4 md:left-8 flex items-end gap-4 md:gap-6">
                                        <div className="size-16 md:size-24 rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl">
                                            <img src={stone?.image_url || 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?auto=format&fit=crop&q=80&w=200'} alt="Texture" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="pb-1 md:pb-2">
                                            <p className="text-[8px] md:text-[10px] font-bold text-[#eca413] uppercase tracking-widest mb-0.5 md:mb-1">Material Source</p>
                                            <h4 className="text-white font-serif text-sm md:text-lg italic">{stone?.name}</h4>
                                        </div>
                                    </div>
                                </>
                            )}
                            {!imageReady && <div className="absolute inset-0 bg-scanline pointer-events-none opacity-20 z-30"></div>}
                        </div>

                        {/* Right Side: Architectural Analysis */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0f0d0a] min-h-0">
                            <div className="p-6 md:p-10 flex flex-col border-t md:border-t-0 md:border-l border-white/5 pb-10">
                                <div className="mb-6 md:mb-10">
                                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                                        <Sparkles size={14} md:size={16} className="text-[#eca413]" />
                                        <span className="text-[8px] md:text-[10px] font-bold tracking-[0.3em] text-[#eca413] uppercase">AI Architectural Vision</span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-serif text-white mb-2 leading-tight">
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
                            .custom-scrollbar::-webkit-scrollbar {
                                width: 4px;
                            }
                            .custom-scrollbar::-webkit-scrollbar-track {
                                background: transparent;
                            }
                            .custom-scrollbar::-webkit-scrollbar-thumb {
                                background: rgba(255, 255, 255, 0.1);
                                border-radius: 10px;
                            }
                        `}</style>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default AIVisualizationModal;
