import React, { useEffect, useRef, useState } from 'react';
import { quarterTurnsOf, SLAB_PRESETS, slabParity } from '../../../src/utils/slabGrid.js';

// 1, 2 and 4 slabs only (2026-11-14): the live site's 6 and 8 are left out
// here. Small lots rarely run to six or eight matching slabs, and the shared
// slabGrid.js is the live site's, so it is filtered here, not edited.
const PRESETS = SLAB_PRESETS.filter((p) => p.count <= 4);
import { bookmatchImage } from '../lib/renders';
import { fileNameFor } from '../lib/download';
import { DownloadButton } from './ui';

/**
 * Book-match: the live site's slab layouts on this lot's actual slab photo.
 * 1, 2 or 4 slabs, each mirrored against its neighbours so the veining
 * meets at every joint (the live 2-way and 4-way book-match views and the
 * "How many slabs?" picker are the 2 x 1 and 2 x 2 cases), the slab turned in
 * quarter turns, and which row is the slab as cut ("Mirror down / up").
 *
 * The preview is CSS; the download and the "Your room" render use the same
 * layout composed on canvas by the live utils/slabGrid.js. Both read their
 * mirroring from slabParity(), so what the buyer sees is what gets made.
 *
 * Fills its positioned parent (the lot sheet's picture box); the controls go
 * in a bar along the bottom.
 */
export default function BookmatchView({ lot, layout, setLayout, onUseInRoom }) {
    const boxRef = useRef(null);
    const [box, setBox] = useState({ w: 0, h: 0 });
    const [imgAR, setImgAR] = useState(1);

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return undefined;
        const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const img = new Image();
        img.onload = () => img.naturalHeight && setImgAR(img.naturalWidth / img.naturalHeight);
        img.src = lot.image;
    }, [lot.image]);

    const preset = PRESETS.find((p) => p.count === layout.count) || PRESETS[1];
    const turns = quarterTurnsOf(layout.rotation);
    const unitAR = turns % 2 ? 1 / imgAR : imgAR;
    const panelAR = unitAR * (preset.cols / preset.rows);
    let fw = box.w;
    let fh = box.w / panelAR;
    if (fh > box.h) {
        fh = box.h;
        fw = box.h * panelAR;
    }
    const cellW = fw / preset.cols;
    const cellH = fh / preset.rows;
    const set = (patch) => setLayout({ ...layout, ...patch, chosen: true });

    const cells = [];
    for (let r = 0; r < preset.rows; r++)
        for (let c = 0; c < preset.cols; c++) {
            const { sx, sy } = slabParity(c, r, layout.originRow);
            const iw = turns % 2 ? cellH : cellW;
            const ih = turns % 2 ? cellW : cellH;
            cells.push(
                <div key={`${c}-${r}`} className="absolute overflow-hidden" style={{ left: c * cellW, top: r * cellH, width: cellW + 1, height: cellH + 1 }}>
                    <img
                        src={lot.image}
                        alt=""
                        draggable={false}
                        className="absolute max-w-none"
                        style={{
                            width: iw,
                            height: ih,
                            left: (cellW - iw) / 2,
                            top: (cellH - ih) / 2,
                            transformOrigin: 'center',
                            transform: `scale(${sx}, ${sy}) rotate(${turns * 90}deg)`,
                        }}
                    />
                </div>,
            );
        }

    return (
        <div className="absolute inset-0 flex flex-col bg-ink">
            <div ref={boxRef} className="relative flex-1 min-h-0 m-3 md:m-4">
                {box.w > 0 && (
                    <div
                        className="absolute overflow-hidden"
                        style={{ left: (box.w - fw) / 2, top: (box.h - fh) / 2, width: fw, height: fh }}
                        role="img"
                        aria-label={`${lot.name}, ${preset.count} ${preset.count === 1 ? 'slab' : 'slabs'} book-matched`}
                    >
                        {cells}
                    </div>
                )}
                <div className="absolute top-0 right-0">
                    <DownloadButton
                        getSrc={() => bookmatchImage(lot, layout)}
                        name={fileNameFor(lot.name, `${preset.count} slab book-match`)}
                        label="Download this book-match"
                    />
                </div>
            </div>
            <div className="shrink-0 px-3 md:px-4 pb-3 md:pb-4 flex flex-wrap items-center gap-1.5">
                {PRESETS.map((p) => {
                    const on = p.count === preset.count;
                    return (
                        <button
                            key={p.count}
                            type="button"
                            onClick={() => set({ count: p.count })}
                            aria-pressed={on}
                            title={p.label}
                            className={`h-9 px-2.5 rounded-full border inline-flex items-center gap-1.5 text-[12px] font-bold transition-colors ${
                                on ? 'bg-paper text-ink border-paper' : 'border-paper/25 text-paper/80 hover:border-paper/60'
                            }`}
                        >
                            <span className="grid gap-[1.5px]" style={{ gridTemplateColumns: `repeat(${p.cols}, 1fr)`, width: 7 * p.cols, height: 7 * p.rows }} aria-hidden="true">
                                {Array.from({ length: p.count }, (_, i) => (
                                    <span key={i} className={`rounded-[1px] ${on ? 'bg-ink' : 'bg-paper/60'}`} />
                                ))}
                            </span>
                            {p.count}
                        </button>
                    );
                })}
                <span className="w-px h-5 bg-paper/20 mx-0.5" aria-hidden="true" />
                <button
                    type="button"
                    onClick={() => set({ rotation: (turns * 90 + 90) % 360 })}
                    className="h-9 px-3 rounded-full border border-paper/25 text-paper/80 hover:border-paper/60 text-[12px] font-bold tabular-nums"
                >
                    Turn slab · {turns * 90}°
                </button>
                {preset.rows > 1 && (
                    <button
                        type="button"
                        onClick={() => set({ originRow: layout.originRow === 'bottom' ? 'top' : 'bottom' })}
                        className="h-9 px-3 rounded-full border border-paper/25 text-paper/80 hover:border-paper/60 text-[12px] font-bold"
                    >
                        Mirror {layout.originRow === 'bottom' ? 'up' : 'down'}
                    </button>
                )}
                {onUseInRoom && (
                    <button type="button" onClick={onUseInRoom} className="ml-auto h-9 px-3.5 rounded-full bg-paper text-ink text-[12px] font-bold">
                        Use this layout in your room
                    </button>
                )}
            </div>
        </div>
    );
}
