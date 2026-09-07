import React, { useEffect, useRef, useState } from 'react';
import { Check, RotateCw } from 'lucide-react';
import { SLAB_PRESETS, slabParity, quarterTurnsOf } from '../utils/slabGrid';

/**
 * Pick how many slabs go on the surface.
 *
 * A render that shows stone as one endless surface hides the thing an architect
 * actually cares about: how many slabs this takes, and where the bookmatch
 * symmetry falls. So they choose the arrangement, and the render is built from
 * it.
 *
 * The preview here is CSS transforms; the image actually sent to the model is
 * composed on canvas by utils/slabGrid.js. Both read their mirror parity from
 * the same slabParity() helper, so what the architect sees cannot drift from
 * what gets rendered.
 *
 * The contain-fit measurement (ResizeObserver + fitted box) is the same pattern
 * as FacadeRegionSelector and ImageModal.
 *
 * Props:
 *   imageSrc      the slab image to preview
 *   application   what surface this is for, used in the copy
 *   initialPreset a preset object to pre-select (from the caller's default, or
 *                 carried over from ImageModal's bookmatch preview)
 *   originRow     'top' | 'bottom' — which row is the slab as cut
 *   onConfirm     (preset) => void
 *   onBack        () => void
 */
const SlabGridSelector = ({ imageSrc, application, initialPreset, originRow = 'top', onConfirm, onBack }) => {
    const boxRef = useRef(null);
    const [box, setBox] = useState({ w: 0, h: 0 });
    const [imgAR, setImgAR] = useState(1);
    const [preset, setPreset] = useState(
        initialPreset || SLAB_PRESETS.find(p => p.count === 4) || SLAB_PRESETS[0]
    );
    // Which way the slab itself sits. Turning it does not turn the panel: the
    // mirror axes stay put and the stone rotates underneath them, so the veining
    // meets each seam at a different angle and the bookmatch reads differently.
    const [rotation, setRotation] = useState(initialPreset?.rotation || 0);

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!imageSrc) return;
        const img = new Image();
        img.onload = () => { if (img.naturalHeight) setImgAR(img.naturalWidth / img.naturalHeight); };
        img.src = imageSrc;
    }, [imageSrc]);

    // A quarter turn swaps the slab's width and height, so it changes the panel's
    // aspect too — a 4x2 of a landscape slab is a wide strip, the same slab
    // turned 90 degrees is nearly square. Mirrors composeSlabGrid's unit maths.
    const turns = quarterTurnsOf(rotation);
    const unitAR = (turns % 2) ? 1 / imgAR : imgAR;
    const panelAR = unitAR * (preset.cols / preset.rows);
    const fitted = (() => {
        const { w, h } = box;
        if (!w || !h) return { w: 0, h: 0, left: 0, top: 0 };
        let fw = w, fh = w / panelAR;
        if (fh > h) { fh = h; fw = h * panelAR; }
        return { w: fw, h: fh, left: (w - fw) / 2, top: (h - fh) / 2 };
    })();

    // Cells are laid out in PIXELS rather than percentages. Percentages give
    // fractional boxes, which is why this used to need a +1px fudge to hide
    // sub-pixel gaps; exact pixels also let a rotated slab be centred precisely.
    const cellW = fitted.w / preset.cols;
    const cellH = fitted.h / preset.rows;
    const cells = [];
    for (let r = 0; r < preset.rows; r++) {
        for (let c = 0; c < preset.cols; c++) {
            const { sx, sy } = slabParity(c, r, originRow);
            // Pre-rotation size that fills the cell once turned.
            const iw = (turns % 2) ? cellH : cellW;
            const ih = (turns % 2) ? cellW : cellH;
            cells.push(
                <div
                    key={`${c}-${r}`}
                    className="absolute overflow-hidden"
                    style={{
                        left: c * cellW,
                        top: r * cellH,
                        // A hair of overlap so neighbouring cells never show a
                        // seam when the container height lands on a fraction.
                        width: cellW + 1,
                        height: cellH + 1,
                    }}
                >
                    <img
                        src={imageSrc}
                        alt=""
                        draggable={false}
                        className="absolute max-w-none"
                        style={{
                            width: iw,
                            height: ih,
                            left: (cellW - iw) / 2,
                            top: (cellH - ih) / 2,
                            transformOrigin: 'center',
                            // Right-to-left: rotate the slab FIRST, then mirror it
                            // — the same order the compositor draws in.
                            transform: `scale(${sx}, ${sy}) rotate(${turns * 90}deg)`,
                        }}
                    />
                </div>
            );
        }
    }

    return (
        <div className="text-center w-full">
            <h2 className="text-2xl md:text-3xl font-serif text-white mb-3 italic">How many slabs?</h2>
            <p className="text-white/50 text-xs md:text-sm mb-6 tracking-wide leading-relaxed">
                Choose how the {application ? application.toLowerCase() : 'surface'} is laid out.
                Each slab is mirrored against its neighbours, so the veining meets at every joint.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-6">
                {SLAB_PRESETS.map(p => {
                    const active = p.count === preset.count;
                    return (
                        <button
                            key={p.count}
                            type="button"
                            onClick={() => setPreset(p)}
                            title={p.label}
                            className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                                active
                                    ? 'bg-[#eca413]/10 border-[#eca413] text-[#eca413]'
                                    : 'bg-white/[0.03] border-white/10 text-white/50 hover:border-[#eca413]/50 hover:text-white/80'
                            }`}
                        >
                            {/* Miniature of the arrangement, so the shape is
                                unambiguous without reading the label. */}
                            <span
                                className="grid gap-[2px]"
                                style={{
                                    gridTemplateColumns: `repeat(${p.cols}, 1fr)`,
                                    width: 12 * p.cols,
                                    height: 12 * p.rows,
                                }}
                            >
                                {Array.from({ length: p.count }, (_, i) => (
                                    <span
                                        key={i}
                                        className={`rounded-[1px] ${active ? 'bg-[#eca413]' : 'bg-white/30'}`}
                                    />
                                ))}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest">
                                {p.count} {p.count === 1 ? 'slab' : 'slabs'}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="flex items-center justify-center gap-3 mb-4">
                <button
                    type="button"
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-white/60 hover:border-[#eca413]/50 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                >
                    <RotateCw size={12} /> Rotate slab
                </button>
                <span className="text-[10px] uppercase tracking-widest text-white/30 tabular-nums">
                    {turns * 90}°
                </span>
            </div>

            <div
                ref={boxRef}
                className="relative w-full h-[34vh] md:h-[38vh] bg-black/40 rounded-2xl overflow-hidden border border-white/10"
            >
                {fitted.w > 0 && (
                    <div
                        className="absolute overflow-hidden"
                        style={{ left: fitted.left, top: fitted.top, width: fitted.w, height: fitted.h }}
                    >
                        {cells}
                    </div>
                )}
            </div>

            {/* Deliberately modest claim: gallery photos are marketing crops of
                unknown proportion, so this shows the arrangement and the
                mirroring, not real-world dimensions. */}
            <p className="text-white/25 text-[9px] uppercase tracking-widest mt-3">
                Shows arrangement and mirroring · not to measured scale
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#eca413] transition-colors"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={() => onConfirm({ ...preset, originRow, rotation: turns * 90 })}
                    className="flex items-center gap-2 px-7 py-3 bg-[#eca413] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
                >
                    <Check size={13} /> Continue
                </button>
            </div>
        </div>
    );
};

export default SlabGridSelector;
