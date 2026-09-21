import React, { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Drag a vertical line across two images of the same scene.
 *
 * Both images sit exactly on top of each other and the top one is clipped at
 * the divider, so the eye compares the SAME pixel in two materials rather than
 * flicking between two pictures. That only works because the two renders share
 * a scene -- see StoneCompareModal, which makes the second by editing the first
 * rather than generating it afresh.
 *
 * Pointer events cover mouse, pen and touch in one path, and the position is
 * kept as a percentage so it survives a resize and any container size.
 *
 * Props:
 *   before, after        image urls. `before` is the base, `after` is clipped.
 *   beforeLabel, afterLabel  names shown in the corners
 */
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

const ImageCompareSlider = ({ before, after, beforeLabel, afterLabel }) => {
    const boxRef = useRef(null);
    const draggingRef = useRef(false);
    const [pos, setPos] = useState(50);

    const moveTo = useCallback((clientX) => {
        const el = boxRef.current;
        if (!el) return;
        const b = el.getBoundingClientRect();
        if (!b.width) return;
        setPos(clamp(((clientX - b.left) / b.width) * 100, 0, 100));
    }, []);

    const onPointerDown = (e) => {
        if (e.button != null && e.button !== 0) return;
        draggingRef.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        moveTo(e.clientX);
    };
    const onPointerMove = (e) => {
        if (!draggingRef.current) return;
        moveTo(e.clientX);
    };
    const endDrag = (e) => {
        draggingRef.current = false;
        try { e?.currentTarget?.releasePointerCapture?.(e.pointerId); } catch { /* already released */ }
    };

    return (
        <div
            ref={boxRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="relative w-full h-full select-none touch-none cursor-ew-resize overflow-hidden bg-stone-900"
        >
            <img src={before} alt={beforeLabel || 'Before'} draggable={false}
                 className="absolute inset-0 w-full h-full object-contain pointer-events-none" />

            {/* Clipped from the left, so the divider's right-hand side is this one. */}
            <img src={after} alt={afterLabel || 'After'} draggable={false}
                 style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
                 className="absolute inset-0 w-full h-full object-contain pointer-events-none" />

            <div className="absolute inset-y-0 pointer-events-none" style={{ left: `${pos}%` }}>
                <div className="absolute inset-y-0 -translate-x-1/2 w-[2px] bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.6)]" />
                {/* Arrows make it obvious the line is draggable; a bare line reads
                    as a seam in the picture rather than a control. */}
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 shadow-xl flex items-center justify-center">
                    <ChevronLeft size={14} className="text-stone-900 -mr-1" />
                    <ChevronRight size={14} className="text-stone-900 -ml-1" />
                </div>
            </div>

            {beforeLabel && (
                <span className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest text-white/90 pointer-events-none">
                    {beforeLabel}
                </span>
            )}
            {afterLabel && (
                <span className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest text-white/90 pointer-events-none">
                    {afterLabel}
                </span>
            )}
        </div>
    );
};

export default ImageCompareSlider;
