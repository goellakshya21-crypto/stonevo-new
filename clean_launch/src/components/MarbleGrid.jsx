import React from 'react';
import MarbleCard from './MarbleCard';

const MarbleGrid = ({ marbles, loading, onEnlarge }) => {
    if (loading) {
        return (
            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="break-inside-avoid h-96 bg-white/5 rounded-xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (marbles.length === 0) {
        return (
            <div className="text-center py-32 bg-white/[0.02] rounded-2xl border border-white/5 italic">
                <h3 className="text-2xl font-serif text-bronze/40 mb-2">The archives are quiet</h3>
                <p className="text-sand/40 text-sm font-display tracking-widest uppercase">Fine-tune your selection to reveal the collection.</p>
            </div>
        );
    }

    return (
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
            {marbles.map((marble) => (
                <div key={marble.id} className="break-inside-avoid mb-8">
                    <MarbleCard marble={marble} onEnlarge={onEnlarge} />
                </div>
            ))}
        </div>
    );
};

export default MarbleGrid;
