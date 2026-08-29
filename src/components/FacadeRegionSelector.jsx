import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';

/**
 * Pick ONE region of an uploaded facade photo to clad in stone.
 *
 * A facade has several storeys, often finished in different materials, so
 * replacing every wall in the photo is wrong. The user marks the band they mean.
 *
 * Coordinates are emitted NORMALISED (0..1 of the image), never in screen pixels
 * — the same rect then survives a window resize, a different device, and the
 * downscale applied before upload. The screen-to-image mapping reuses the
 * contain-fit measurement pattern from ImageModal.jsx (ResizeObserver + fit box).
 *
 * Props:
 *   imageSrc  data-URL of the user's photo
 *   onConfirm ({ x, y, w, h }) => void   normalised, 0..1
 *   onBack    () => void
 */
const clamp01 = (n) => Math.min(1, Math.max(0, n));

const FacadeRegionSelector = ({ imageSrc, onConfirm, onBack }) => {
    const boxRef = useRef(null);
    const draftRef = useRef(null); // drag origin, in normalised space

    const [box, setBox] = useState({ w: 0, h: 0 });      // measured container
    const [imgAR, setImgAR] = useState(1);               // natural width / height
    const [rect, setRect] = useState(null);              // normalised selection
    const [levels, setLevels] = useState(null);          // active preset count
    const [dragging, setDragging] = useState(false);

    // Measure the container (same approach as ImageModal)
    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Natural aspect ratio of the photo
    useEffect(() => {
        if (!imageSrc) return;
        const img = new Image();
        img.onload = () => { if (img.naturalHeight) setImgAR(img.naturalWidth / img.naturalHeight); };
        img.src = imageSrc;
    }, [imageSrc]);

    // The photo is contain-fitted, so it rarely fills the container. This is the
    // rect the image ACTUALLY occupies — all pointer maths must be relative to
    // it, not to the container, or the selection drifts on letterboxed photos.
    const fitted = (() => {
        const { w, h } = box;
        if (!w || !h) return { w: 0, h: 0, left: 0, top: 0 };
        let fw = w, fh = w / imgAR;
        if (fh > h) { fh = h; fw = h * imgAR; }
        return { w: fw, h: fh, left: (w - fw) / 2, top: (h - fh) / 2 };
    })();

    const toNorm = useCallback((clientX, clientY) => {
        const el = boxRef.current;
        if (!el || !fitted.w || !fitted.h) return { x: 0, y: 0 };
        const b = el.getBoundingClientRect();
        return {
            x: clamp01((clientX - b.left - fitted.left) / fitted.w),
            y: clamp01((clientY - b.top - fitted.top) / fitted.h),
        };
    }, [fitted.w, fitted.h, fitted.left, fitted.top]);

    // Level presets: split the elevation into equal horizontal bands
    const applyPreset = (n, index) => {
        setLevels(n);
        setRect({ x: 0, y: index / n, w: 1, h: 1 / n });
    };

    // Freehand drag. Pointer events cover mouse and touch in one path.
    const onPointerDown = (e) => {
        if (e.button != null && e.button !== 0) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const p = toNorm(e.clientX, e.clientY);
        draftRef.current = p;
        setLevels(null);
        setDragging(true);
        setRect({ x: p.x, y: p.y, w: 0, h: 0 });
    };

    const onPointerMove = (e) => {
        if (!draftRef.current) return;
        const p = toNorm(e.clientX, e.clientY);
        const s = draftRef.current;
        setRect({
            x: Math.min(s.x, p.x),
            y: Math.min(s.y, p.y),
            w: Math.abs(p.x - s.x),
            h: Math.abs(p.y - s.y),
        });
    };

    const endDrag = (e) => {
        if (!draftRef.current) return;
        try { e?.currentTarget?.releasePointerCapture?.(e.pointerId); } catch { /* already released */ }
        draftRef.current = null;
        setDragging(false);
        // A stray click (not a real drag) shouldn't leave a useless sliver.
        setRect(r => (r && (r.w < 0.02 || r.h < 0.02)) ? null : r);
    };

    const pct = (n) => (n * 100).toFixed(2) + '%';
    const isUsable = !!rect && rect.w >= 0.02 && rect.h >= 0.02;

    // Cut the selection out of a dark scrim so the target area reads instantly.
    const scrimClip = rect
        ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, '
          + pct(rect.x) + ' ' + pct(rect.y) + ', '
          + pct(rect.x) + ' ' + pct(rect.y + rect.h) + ', '
          + pct(rect.x + rect.w) + ' ' + pct(rect.y + rect.h) + ', '
          + pct(rect.x + rect.w) + ' ' + pct(rect.y) + ', '
          + pct(rect.x) + ' ' + pct(rect.y) + ')'
        : 'none';

    return (
        <div className="text-center w-full">
            <h2 className="text-2xl md:text-3xl font-serif text-white mb-3 italic">Select the area to clad</h2>
            <p className="text-white/50 text-xs md:text-sm mb-6 tracking-wide leading-relaxed">
                Choose a level, or drag across the photo to mark exactly where the stone should go.
                Everything outside your selection stays untouched.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-5">
                {[2, 3, 4].map(n => (
                    <div key={n} className="flex items-center gap-1">
                        <span className="text-[9px] uppercase tracking-widest text-white/30 mr-1">{n} levels</span>
                        {Array.from({ length: n }, (_, i) => {
                            const active = levels === n && rect && Math.abs(rect.y - i / n) < 0.001;
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => applyPreset(n, i)}
                                    className={`w-8 h-8 rounded-lg border text-[10px] font-bold transition-all ${
                                        active
                                            ? 'bg-[#eca413] text-black border-[#eca413]'
                                            : 'bg-white/[0.03] text-white/60 border-white/10 hover:border-[#eca413]/50'
                                    }`}
                                    title={'Band ' + (i + 1) + ' of ' + n + ', counting from the top'}
                                >
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            <div
                ref={boxRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="relative w-full h-[38vh] md:h-[42vh] bg-black/40 rounded-2xl overflow-hidden border border-white/10 cursor-crosshair touch-none select-none"
            >
                <img
                    src={imageSrc}
                    alt="Your facade"
                    draggable={false}
                    className="absolute pointer-events-none"
                    style={{ left: fitted.left, top: fitted.top, width: fitted.w, height: fitted.h }}
                />

                {rect && fitted.w > 0 && (
                    <>
                        <div
                            className="absolute pointer-events-none"
                            style={{
                                left: fitted.left, top: fitted.top, width: fitted.w, height: fitted.h,
                                background: 'rgba(0,0,0,0.55)',
                                clipPath: scrimClip,
                            }}
                        />
                        <div
                            className="absolute border-2 border-[#eca413] pointer-events-none"
                            style={{
                                left: fitted.left + rect.x * fitted.w,
                                top: fitted.top + rect.y * fitted.h,
                                width: rect.w * fitted.w,
                                height: rect.h * fitted.h,
                            }}
                        />
                    </>
                )}

                {!rect && !dragging && (
                    <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
                        <span className="text-[10px] uppercase tracking-widest text-white/40 bg-black/50 px-3 py-1.5 rounded-full">
                            Drag across a level
                        </span>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-center gap-3 mt-6">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#eca413] transition-colors"
                >
                    Back
                </button>
                {rect && (
                    <button
                        type="button"
                        onClick={() => { setRect(null); setLevels(null); }}
                        className="flex items-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                    >
                        <RotateCcw size={11} /> Clear
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => isUsable && onConfirm(rect)}
                    disabled={!isUsable}
                    className="flex items-center gap-2 px-7 py-3 bg-[#eca413] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Check size={13} /> Apply stone here
                </button>
            </div>
        </div>
    );
};

export default FacadeRegionSelector;
