import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { SLAB_PRESETS, slabParity } from '../utils/slabGrid';

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

    // The panel's aspect ratio is the slab's, stretched by the grid shape — the
    // same figure composeSlabGrid derives. Contain-fit it into the box.
    const panelAR = imgAR * (preset.cols / preset.rows);
    const fitted = (() => {
        const { w, h } = box;
        if (!w || !h) return { w: 0, h: 0, left: 0, top: 0 };
        let fw = w, fh = w / panelAR;
        if (fh > h) { fh = h; fw = h * panelAR; }
        return { w: fw, h: fh, left: (w - fw) / 2, top: (h - fh) / 2 };
    })();

    const cells = [];
    for (let r = 0; r < preset.rows; r++) {
        for (let c = 0; c < preset.cols; c++) {
            const { sx, sy } = slabParity(c, r, originRow);
            cells.push(
                <div
                    key={`${c}-${r}`}
                    className="absolute overflow-hidden"
                    style={{
                        left: `${(c / preset.cols) * 100}%`,
                        top: `${(r / preset.rows) * 100}%`,
                        // The +1px is the CSS sub-pixel gap hack from ImageModal:
                        // percentage layout produces fractional boxes and leaves a
                        // hairline between cells without it. The canvas compositor
                        // uses integer cells and needs no such thing.
                        width: `calc(${100 / preset.cols}% + 1px)`,
                        height: `calc(${100 / preset.rows}% + 1px)`,
                    }}
                >
                    <img
                        src={imageSrc}
                        alt=""
                        draggable={false}
                        className="w-full h-full"
                        style={{ objectFit: 'fill', transform: `scale(${sx}, ${sy})` }}
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
                    onClick={() => onConfirm({ ...preset, originRow })}
                    className="flex items-center gap-2 px-7 py-3 bg-[#eca413] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
                >
                    <Check size={13} /> Continue
                </button>
            </div>
        </div>
    );
};

export default SlabGridSelector;
