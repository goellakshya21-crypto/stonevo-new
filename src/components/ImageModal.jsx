import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AIVisualizationModal from './AIVisualizationModal';

/**
 * Premium Image Modal for full-screen stone viewing.
 */
function ImageModal({ stone, allStones = [], onClose, onNavigate, isOpen = true, onAddToRequirements }) {
    const [isVisualizing, setIsVisualizing] = useState(false);
    // null = off | '2way' = side-by-side mirror | '4way' = 2×2 quad mirror
    const [bookmatchMode, setBookmatchMode] = useState(null);
    // '4way' vertical direction: 'down' = original on top, mirror below | 'up' = mirror on top, original below
    const [flipDir, setFlipDir] = useState('down');

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
                    className="fixed inset-0 bg-white flex flex-col md:flex-row overflow-y-auto md:overflow-hidden animate-scale-up"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="fixed top-4 right-4 z-[60] p-2.5 bg-white/80 hover:bg-stone-900 text-stone-900 hover:text-white rounded-full transition-all border border-stone-200 backdrop-blur-md shadow-lg"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Left Navigation */}
                    {hasMultiple && !isVisualizing && (
                        <button
                            onClick={handlePrev}
                            className="fixed left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/20 hover:bg-white text-stone-900 rounded-full transition-all shadow-xl backdrop-blur-sm border border-stone-200 group invisible md:visible"
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
                            className="fixed right-4 md:right-[320px] top-1/2 -translate-y-1/2 z-20 p-3 bg-white/20 hover:bg-white text-stone-900 rounded-full transition-all shadow-xl backdrop-blur-sm border border-stone-200 group invisible md:visible mr-4"
                        >
                            <svg className="w-6 h-6 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}

                    {/* Image Container */}
                    <div className="w-full md:flex-1 bg-stone-900 flex items-center justify-center overflow-hidden relative h-[50vh] md:h-full shrink-0">
                        {!bookmatchMode && (
                            <img
                                key={stone.id}
                                src={stone.imageUrl}
                                alt={stone.name}
                                className="w-full h-full object-contain animate-fade-in"
                            />
                        )}

                        {bookmatchMode === '2way' && (
                            <div className="flex w-full h-full animate-fade-in">
                                <div className="flex-1 h-full overflow-hidden mr-[-1px] relative z-10">
                                    <img src={stone.imageUrl} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 h-full overflow-hidden relative z-0">
                                    <img src={stone.imageUrl} className="w-full h-full object-cover scale-x-[-1]" />
                                </div>
                            </div>
                        )}

                        {bookmatchMode === '4way' && (() => {
                            const isUp = flipDir === 'up';
                            const tl = isUp ? 'scaleY(-1)'   : 'none';
                            const tr = isUp ? 'scale(-1,-1)' : 'scaleX(-1)';
                            const bl = isUp ? 'none'         : 'scaleY(-1)';
                            const br = isUp ? 'scaleX(-1)'   : 'scale(-1,-1)';
                            const cell = (transform, pos) => (
                                <div style={{ position: 'absolute', overflow: 'hidden', ...pos }}>
                                    <img src={stone.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', transform, display: 'block' }} />
                                </div>
                            );
                            return (
                                <div style={{ position: 'relative', width: '100%', height: '100%' }} className="animate-fade-in">
                                    {cell(tl, { top: 0,    left: 0,     width: '50%', height: 'calc(50% + 1px)' })}
                                    {cell(tr, { top: 0,    left: '50%', width: '50%', height: 'calc(50% + 1px)' })}
                                    {cell(bl, { top: '50%', left: 0,    width: '50%', height: '50%' })}
                                    {cell(br, { top: '50%', left: '50%', width: '50%', height: '50%' })}
                                </div>
                            );
                        })()}

                        {/* Counter for context */}
                        {hasMultiple && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-stone-900/80 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm tracking-widest">
                                {currentIndex + 1} / {allStones.length}
                            </div>
                        )}
                    </div>

                    {/* Sidebar Info - Compact Layout */}
                    <div className="w-full md:w-80 p-5 md:p-6 flex flex-col bg-white border-l border-stone-100 z-10 overflow-y-auto h-full">
                        <div className="mb-4 md:mb-5">
                            <span className="text-[8px] font-bold tracking-[0.2em] text-stone-400 uppercase mb-1 block">Stonevo Archive</span>
                            <h2 className="text-xl md:text-2xl font-serif font-bold text-stone-900 mb-1">{stone.name}</h2>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-1.5 py-0.5 bg-stone-100 text-[8px] font-bold text-stone-500 uppercase rounded">{stone.physical_properties?.type || 'Natural Stone'}</span>
                                <span className="px-1.5 py-0.5 bg-stone-900 text-[8px] font-bold text-white uppercase rounded">{stone.physical_properties?.color}</span>
                            </div>
                        </div>

                        <p className="text-stone-500 text-xs leading-relaxed mb-4 md:mb-6 font-light italic">
                            "{stone.description}"
                        </p>

                        <div className="space-y-2 md:space-y-2.5 pb-4 md:pb-0 mt-auto">
                            {/* Mobile-only next recommended button */}
                            {hasMultiple && (
                                <button
                                    onClick={handleNext}
                                    className="w-full md:hidden bg-stone-50 text-stone-900 py-2.5 px-4 text-[9px] font-bold uppercase tracking-widest hover:bg-stone-100 transition-all flex items-center justify-center gap-2 border border-stone-200 active:scale-[0.98]"
                                >
                                    Next Recommended Specimen
                                </button>
                            )}

                            {/* 2-Way Bookmatch */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setBookmatchMode(bookmatchMode === '2way' ? null : '2way'); }}
                                className={`w-full py-2.5 md:py-3 px-4 text-[9px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border relative overflow-hidden active:scale-[0.98] ${
                                    bookmatchMode === '2way'
                                    ? 'bg-stone-900 text-white border-stone-800'
                                    : 'bg-white text-stone-900 border-stone-200 hover:bg-stone-50'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h2m0-16h2a2 2 0 012 2v12a2 2 0 01-2 2h-2m-6-16l6 6m0 0l6-6m-6 6v12" />
                                </svg>
                                {bookmatchMode === '2way' ? 'Disable Bookmatch' : 'Bookmatch View'}
                            </button>

                            {/* 4-Way Bookmatch */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setBookmatchMode(bookmatchMode === '4way' ? null : '4way'); }}
                                className={`w-full py-2.5 md:py-3 px-4 text-[9px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border relative overflow-hidden active:scale-[0.98] ${
                                    bookmatchMode === '4way'
                                    ? 'bg-stone-900 text-white border-stone-800'
                                    : 'bg-white text-stone-900 border-stone-200 hover:bg-stone-50'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                {bookmatchMode === '4way' ? 'Disable 4-Way' : '4-Way Bookmatch'}
                            </button>

                            {/* Direction toggle — only visible when 4-way is active */}
                            {bookmatchMode === '4way' && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setFlipDir('down'); }}
                                        className={`flex-1 py-2 px-3 text-[9px] font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-1.5 border active:scale-[0.98] ${
                                            flipDir === 'down' ? 'bg-stone-900 text-white border-stone-800' : 'bg-white text-stone-400 border-stone-200 hover:bg-stone-50'
                                        }`}
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        Mirror Down
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setFlipDir('up'); }}
                                        className={`flex-1 py-2 px-3 text-[9px] font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-1.5 border active:scale-[0.98] ${
                                            flipDir === 'up' ? 'bg-stone-900 text-white border-stone-800' : 'bg-white text-stone-400 border-stone-200 hover:bg-stone-50'
                                        }`}
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                                        Mirror Up
                                    </button>
                                </div>
                            )}

                            {onAddToRequirements && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAddToRequirements(stone); }}
                                    className="w-full bg-[#eca413]/10 text-[#eca413] py-2.5 md:py-3 px-4 text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-[#eca413]/20 transition-all flex items-center justify-center gap-2 border border-[#eca413]/30 active:scale-[0.98]"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add to Requirements
                                </button>
                            )}

                            <button
                                onClick={(e) => { e.stopPropagation(); setIsVisualizing(true); }}
                                className="w-full bg-stone-50 text-stone-900 py-2.5 md:py-3 px-4 text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-stone-100 transition-all flex items-center justify-center gap-2 border border-stone-200 group relative overflow-hidden active:scale-[0.98]"
                            >
                                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                                <svg className="w-4 h-4 text-luxury-bronze" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                Visualise in Room
                            </button>

                            <button
                                onClick={handleDownload}
                                className="w-full bg-stone-900 text-white py-2.5 md:py-3 px-4 text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20 active:scale-[0.98]"
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
                    roomName={null}
                    // Pass the user's chosen bookmatch direction so the AI renders accordingly
                    bookmatchDir={bookmatchMode === '4way' ? flipDir : null}
                    onClose={() => setIsVisualizing(false)}
                />
            )}
        </>,
        document.body
    );
}

export default ImageModal;
