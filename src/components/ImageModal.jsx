import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AIVisualizationModal from './AIVisualizationModal';

/**
 * Premium Image Modal for full-screen stone viewing.
 */
function ImageModal({ stone, allStones = [], onClose, onNavigate, isOpen = true }) {
    const [isVisualizing, setIsVisualizing] = useState(false);
    const [isBookmatched, setIsBookmatched] = useState(false);

    if (!stone || !isOpen) return null;

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

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-[100] bg-stone-900 transition-opacity duration-300 animate-fade-in"
                onClick={onClose}
            >
                <div
                    className="fixed inset-0 bg-white flex flex-col md:flex-row animate-scale-up"
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
                            className="absolute right-[320px] top-1/2 -translate-y-1/2 z-20 p-3 bg-white/20 hover:bg-white text-stone-900 rounded-full transition-all shadow-xl backdrop-blur-sm border border-stone-200 group invisible md:visible mr-4"
                        >
                            <svg className="w-6 h-6 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}

                    {/* Image Container */}
                    <div className="flex-1 bg-stone-900 flex items-center justify-center overflow-hidden relative min-h-[400px]">
                        {!isBookmatched ? (
                            <img
                                key={stone.id}
                                src={stone.imageUrl}
                                alt={stone.name}
                                className="w-full h-full object-contain animate-fade-in"
                            />
                        ) : (
                            <div className="flex w-full h-full animate-fade-in">
                                <div className="flex-1 h-full overflow-hidden mr-[-1px] relative z-10">
                                    <img
                                        src={stone.imageUrl}
                                        alt={`${stone.name} - Left`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 h-full overflow-hidden relative z-0">
                                    <img
                                        src={stone.imageUrl}
                                        alt={`${stone.name} - Mirror`}
                                        className="w-full h-full object-cover scale-x-[-1]"
                                    />
                                </div>
                            </div>
                        )}

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
                                <span className="px-2 py-0.5 bg-stone-100 text-[10px] font-bold text-stone-500 uppercase rounded">{stone.physical_properties?.type || 'Natural Stone'}</span>
                                <span className="px-2 py-0.5 bg-stone-900 text-[10px] font-bold text-white uppercase rounded">{stone.physical_properties?.color}</span>
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
                                onClick={(e) => { e.stopPropagation(); setIsBookmatched(!isBookmatched); }}
                                className={`w-full py-4 px-6 text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border relative overflow-hidden ${
                                    isBookmatched 
                                    ? 'bg-stone-900 text-white border-stone-800' 
                                    : 'bg-white text-stone-900 border-stone-200 hover:bg-stone-50'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h2m0-16h2a2 2 0 012 2v12a2 2 0 01-2 2h-2m-6-16l6 6m0 0l6-6m-6 6v12" />
                                </svg>
                                {isBookmatched ? 'Disable Bookmatch' : 'Bookmatch View'}
                            </button>

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
                        type: stone?.physical_properties?.type || stone?.type || 'Natural Stone',
                        image_url: stone.imageUrl || stone.image_url,
                        application: stone?.physical_properties?.application || []
                    }}
                    roomName={null} // Let the modal determine room from application
                    onClose={() => setIsVisualizing(false)}
                />
            )}
        </>,
        document.body
    );
}

export default ImageModal;
