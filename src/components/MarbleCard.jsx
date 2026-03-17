import React from 'react';

const MarbleCard = ({ marble, onEnlarge }) => {
    const handleDownload = async (e) => {
        e.stopPropagation();
        try {
            const response = await fetch(marble.imageUrl);
            if (!response.ok) throw new Error('CORS or Network issue');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const fileName = `${marble.name.replace(/\s+/g, '_')}_Stonevo.jpg`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.warn('Direct download failed (possibly CORS). Opening in new tab...', error);
            // Fail-safe: Open the image in a new tab so they can still see/save it
            window.open(marble.imageUrl, '_blank');
        }
    };

    return (
        <div
            id={`stone-${marble.id}`}
            onClick={() => onEnlarge(marble)}
            className="group relative bg-[#4A423B] rounded-xl overflow-hidden border border-white/5 flex flex-col h-full cursor-pointer transition-all duration-500 hover:shadow-[0_40px_80px_rgba(0,0,0,0.5)] transform hover:scale-[1.02] active:scale-[0.98] will-change-transform"
        >
            <div className="aspect-[4/5] overflow-hidden bg-stone-900 relative">
                <img
                    src={marble.imageUrl}
                    alt={marble.name}
                    className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transform group-hover:scale-110 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    loading="lazy"
                />

                {/* Glassmorphic Price Badge */}
                <div className="absolute top-4 left-4 glass-panel backdrop-blur-xl px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-luxury-cream tracking-widest uppercase z-10 shadow-2xl">
                    {[].concat(marble.physical_properties.priceRange || []).join(' · ') || '—'}
                </div>

                {/* Hover Action Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out flex items-center justify-between">
                    <p className="text-[10px] text-bronze font-bold tracking-[0.2em] uppercase">Archive Detail</p>
                    <span className="material-icons text-bronze text-xl">add</span>
                </div>
            </div>

            <div className="p-6 flex flex-col flex-grow bg-transparent backdrop-blur-md relative overflow-hidden group/footer">
                {/* Glass Card Footer Overlay */}
                <div className="absolute inset-0 bg-white/[0.03] border-t border-white/10 z-0" />

                <div className="relative z-10 space-y-1 mb-4">
                    <p className="text-[10px] font-bold text-bronze uppercase tracking-[0.3em] font-display">{[].concat(marble.physical_properties.marble || []).join(', ') || 'Stone'}</p>
                    <h3 className="text-2xl font-serif text-luxury-cream leading-tight">
                        {marble.name}
                    </h3>
                </div>

                <p className="relative z-10 text-sand/70 text-xs font-sans leading-relaxed line-clamp-2 italic mb-6">
                    {marble.description}
                </p>

                <div className="relative z-10 mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex gap-6">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-bronze/40 uppercase tracking-widest font-display">Palette</span>
                            <span className="text-[10px] font-medium text-sand">{[].concat(marble.physical_properties.color || []).join(', ') || '—'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-bronze/40 uppercase tracking-widest font-display">Pattern</span>
                            <span className="text-[10px] font-medium text-sand italic">{[].concat(marble.physical_properties.pattern || []).filter(Boolean).join(' · ') || 'Uniform'}</span>
                        </div>
                    </div>

                    <div className="w-8 h-8 rounded-full border border-bronze/20 flex items-center justify-center group-hover/footer:border-bronze transition-all grayscale opacity-40 group-hover/footer:grayscale-0 group-hover/footer:opacity-100">
                        <span className="material-icons text-bronze text-sm">east</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarbleCard;
