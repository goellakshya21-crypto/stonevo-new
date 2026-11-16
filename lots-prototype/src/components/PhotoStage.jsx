import React, { useState } from 'react';

/**
 * A full-bleed photo that cross-fades to the next one, with a slow push-in.
 * The outgoing photo stays underneath until the incoming one has faded in.
 */
export default function PhotoStage({ url, fallback, preload, alt = '', motion = true, className = '', position = '50% 50%' }) {
    const src = url || fallback || null;
    const [layers, setLayers] = useState(() => (src ? [{ src, id: 1 }] : []));

    // Derived from the prop during render (React's "adjust state on prop
    // change" pattern) rather than in an effect, so there is no blank frame.
    if (src && (!layers.length || layers.at(-1).src !== src)) {
        setLayers((prev) => [...prev.slice(-1), { src, id: (prev.at(-1)?.id || 0) + 1 }]);
    }
    const settle = (id) => setLayers((prev) => (prev.length > 1 && prev.at(-1).id === id ? prev.slice(-1) : prev));

    return (
        <div className={`overflow-hidden ${className}`}>
            {layers.map((l, i) => (
                <img
                    key={l.id}
                    src={l.src}
                    alt={i === layers.length - 1 ? alt : ''}
                    aria-hidden={i === layers.length - 1 ? undefined : true}
                    className={`absolute inset-0 w-full h-full object-cover ${i === layers.length - 1 && layers.length > 1 ? 'photo-in' : ''} ${
                        motion ? 'photo-push' : ''
                    } ${!url ? 'blur-sm scale-105 opacity-80' : ''}`}
                    style={{ objectPosition: position }}
                    onAnimationEnd={(e) => e.animationName === 'photo-in' && settle(l.id)}
                    draggable={false}
                />
            ))}
            {/* Warm the next photo so the cross-fade never shows a half-loaded image */}
            {preload && <link rel="preload" as="image" href={preload} />}
        </div>
    );
}
