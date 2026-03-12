import React, { useState, useEffect } from 'react';
import AIVisualizationModal from './AIVisualizationModal';

/**
 * Premium Image Modal for full-screen stone viewing.
 */
function ImageModal({ stone, allStones = [], onClose, onNavigate }) {
    const [isVisualizing, setIsVisualizing] = useState(false);

    if (!stone) return null;

    const currentIndex = allStones.findIndex(s => s.id === stone.id);
    const hasMultiple = allStones.length > 1;

    const handlePrev = (e) => {
        e?.stopPropagation();
        if (currentIndex > 0) {
            onNavigate(allStones[currentIndex - 1]);
        } else if (allStones.length > 0) {
            onNavigate(allStones[allStones.length - 1]); // Loop to end
        }
    };

    const handleNext = (e) => {
        e?.stopPropagation();
        if (currentIndex < allStones.length - 1) {
            onNavigate(allStones[currentIndex + 1]);
        } else if (allStones.length > 0) {
            onNavigate(allStones[0]); // Loop to start
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isVisualizing) return; // Disable gallery nav while AI modal is open
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, isVisualizing]);

    const handleDownload = async (e) => {
        e.stopPropagation();
        try {
            const response = await fetch(stone.imageUrl);
            if (!response.ok) throw new Error('CORS or Network issue');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const fileName = `${stone.name.replace(/\s+/g, '_')}_Stonevo.jpg`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.warn('Direct download failed (possibly CORS). Opening in new tab...', error);
            window.open(stone.imageUrl, '_blank');
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/95 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
                onClick={onClose}
            >
                <div
                    className="relative max-w-6xl w-full max-h-[90vh] bg-white rounded-none shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-up border border-stone-800/10"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-stone-900 text-stone-900 hover:text-white rounded-full transition-all border border-stone-200"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Left Navigation */}
                    {hasMultiple && !isVisualizing && (
                        <button
                            onClick={handlePrev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/20 hover:bg-white text-stone-900 rounded-full transition-all shadow-xl backdrop-blur-sm border border-stone-200 group"
                        >
                            <svg className="w-6 h-6 transform group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    {/* Right Navigation */}
                    {hasMultiple && !isVisualizing && (
                        <button
                            onClick={handleNext}
                            className="absolute right-[330px] top-1/2 -translate-y-1/2 z-20 p-3 bg-white/20 hover:bg-white text-stone-900 rounded-full transition-all shadow-xl backdrop-blur-sm border border-stone-200 group invisible md:visible"
                        >
                            <svg className="w-6 h-6 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}

                    {/* Image Container */}
                    <div className="flex-1 bg-stone-50 flex items-center justify-center overflow-hidden relative min-h-[400px]">
                        <img
                            key={stone.id}
                            src={stone.imageUrl}
                            alt={stone.name}
                            className="w-full h-full object-contain animate-fade-in"
                        />

                        {/* Counter for context */}
                        {hasMultiple && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-stone-900/80 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm tracking-widest">
                                {currentIndex + 1} / {allStones.length}
                            </div>
                        )}
                    </div>

                    {/* Sidebar Info */}
                    <div className="w-full md:w-80 p-8 flex flex-col bg-white border-l border-stone-100 z-10">
                        <div className="mb-8">
                            <span className="text-[10px] font-bold tracking-[0.2em] text-stone-400 uppercase mb-2 block">Stonevo Archive</span>
                            <h2 className="text-3xl font-serif font-bold text-stone-900 mb-2">{stone.name}</h2>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-2 py-0.5 bg-stone-100 text-[10px] font-bold text-stone-500 uppercase rounded">{stone.physical_properties.type || 'Natural Stone'}</span>
                                <span className="px-2 py-0.5 bg-stone-900 text-[10px] font-bold text-white uppercase rounded">{stone.physical_properties.color}</span>
                            </div>
                        </div>

                        <p className="text-stone-500 text-sm leading-relaxed mb-8 font-light italic">
                            "{stone.description}"
                        </p>

                        <div className="mt-auto space-y-4">
                            {/* Mobile-only next button */}
                            {hasMultiple && (
                                <button
                                    onClick={handleNext}
                                    className="w-full md:hidden bg-stone-100 text-stone-900 py-3 px-6 text-[10px] font-bold uppercase tracking-widest hover:bg-stone-200 transition-all flex items-center justify-center gap-2 border border-stone-200 group relative overflow-hidden"
                                >
                                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                                    Next Recommended Stone
                                </button>
                            )}

                            <button
                                onClick={(e) => { e.stopPropagation(); setIsVisualizing(true); }}
                                className="w-full bg-stone-50 text-stone-900 py-4 px-6 text-xs font-bold uppercase tracking-[0.2em] hover:bg-stone-100 transition-all flex items-center justify-center gap-2 border border-stone-200 group relative overflow-hidden"
                            >
                                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                                <svg className="w-4 h-4 text-luxury-bronze" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                Visualise in Room
                            </button>

                            <button
                                onClick={handleDownload}
                                className="w-full bg-stone-900 text-white py-4 px-6 text-xs font-bold uppercase tracking-[0.2em] hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12 a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download High-Res
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Visualization Overlay */}
            {isVisualizing && (
                <AIVisualizationModal
                    isOpen={true}
                    stone={{
                        name: stone.name,
                        type: stone?.physical_properties?.type || 'Natural Stone',
                        image_url: stone.imageUrl
                    }}
                    roomContext={`Luxury ${stone?.physical_properties?.application || 'Room'}`}
                    onClose={() => setIsVisualizing(false)}
                />
            )}
        </>
    );
}

export default ImageModal;
