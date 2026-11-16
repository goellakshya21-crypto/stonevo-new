import React, { useEffect, useMemo, useRef, useState } from 'react';
import ImageCompareSlider from '../../../src/components/ImageCompareSlider.jsx';
import { OWN_SURFACES } from '../lib/applications';
import { inr } from '../lib/lots';
import { MIX_COLORS, mixStonesInPhoto, prepareRoomPhoto, regionCorners, RENDER_SCENES, styleName, suggestBoxes, toFrame } from '../lib/renders';
import { Arrow, Close } from './ui';
import { RenderingNote } from './Busy';
import { NewPhotoButton, RoomDropZone } from './RoomUpload';

const MAX = 3;
// The buyer's word for a feature wall is often "highlighter wall".
const surfaceLabel = (s) => (s.id === 'wall' ? 'Feature (highlighter) wall' : s.label);

// The same surface can be picked more than once (two walls). Repeats are
// numbered so the buyer, the prompt and the legend can tell them apart.
const rowLabels = (rows) => {
    const count = {};
    rows.forEach((r) => (count[r.surfaceId] = (count[r.surfaceId] || 0) + 1));
    const seen = {};
    return rows.map((r) => {
        const s = OWN_SURFACES.find((x) => x.id === r.surfaceId);
        if (count[r.surfaceId] < 2) return surfaceLabel(s);
        seen[r.surfaceId] = (seen[r.surfaceId] || 0) + 1;
        return `${s.label} ${seen[r.surfaceId]}`;
    });
};
const repeats = (rows) => {
    const count = {};
    rows.forEach((r) => (count[r.surfaceId] = (count[r.surfaceId] || 0) + 1));
    return (r) => count[r.surfaceId] > 1;
};
let seq = 0;
// Time + counter: a hot reload resets the counter while the rows in state
// keep their keys, and two rows sharing a key change together.
const newRow = (surfaceId, lotId = '') => ({ key: `${Date.now().toString(36)}-${++seq}`, surfaceId, lotId, region: null });

// A marked area from its four corners: the corners plus their bounding box.
const fromCorners = (pts) => {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, pts };
};

/**
 * Design a room: one picture, up to three surfaces, a stone for each, all
 * changed together in ONE render ("floor in this, table top in that,
 * highlighter wall in the other"). The buyer can drag a box over each
 * surface so the model knows exactly where it is; without a box it finds the
 * surface itself. Before/after on the live compare slider.
 *
 * The picture is the buyer's own room photo (shared with the lot pages, never
 * saved) or one of our rendered rooms.
 *
 * Stones are chosen in the gallery, by their pictures (decided 2026-11-15):
 * "Choose from the gallery" opens it in a pick mode for that surface, like
 * compare's second lot, and the tapped lot comes back here (App keeps this
 * page alive meanwhile). A marked area starts as the rectangle the buyer
 * drags; each corner can then be dragged, so a wall seen at an angle is
 * marked as its real four-sided shape.
 */
export default function RoomDesigner({ lots, renders, tour, ownPhoto, setOwnPhoto, prefill, onOpenLot, onPickStone, onHome }) {
    const [picture, setPicture] = useState(prefill?.picture || ownPhoto || null);
    const [framed, setFramed] = useState(null); // { url, w, h, ar } for `picture`
    const [rows, setRows] = useState(() => (prefill?.lotId ? [newRow(prefill.surfaceId || 'wall', prefill.lotId)] : [newRow('floor'), newRow('wall')]));
    const [drawingFor, setDrawingFor] = useState(null); // row key being marked
    const [draft, setDraft] = useState(null); // rectangle while dragging
    const [busy, setBusy] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const imgRef = useRef(null);
    const start = useRef(null);
    const dragging = useRef(null); // { key, idx }: the corner being moved

    // Show and mark exactly the frame the model will get.
    useEffect(() => {
        let alive = true;
        if (!picture) return undefined;
        toFrame(picture)
            .then((f) => alive && setFramed(f))
            .catch(() => alive && setError('That picture could not be opened.'));
        return () => {
            alive = false;
        };
    }, [picture]);
    const shown = picture ? framed : null;

    const byId = useMemo(() => Object.fromEntries(lots.map((l) => [l.id, l])), [lots]);
    const ourRooms = useMemo(() => (tour || []).map((t) => ({ ...t, url: renders[t.lotId]?.[t.scene] })).filter((t) => t.url), [tour, renders]);

    const take = async (file) => {
        setError('');
        try {
            const url = await prepareRoomPhoto(file);
            setOwnPhoto(url);
            choosePicture(url);
        } catch (err) {
            setError(err.message);
        }
    };
    const choosePicture = (url) => {
        setPicture(url);
        setFramed(null);
        setResult(null);
        setRows((rs) => rs.map((r) => ({ ...r, region: null })));
    };

    const update = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    // A new row starts on a surface not picked yet, else on a wall; any surface
    // can be picked again (two walls, say).
    const used = new Set(rows.map((r) => r.surfaceId));
    const addRow = () => {
        const next = OWN_SURFACES.find((s) => !used.has(s.id)) || OWN_SURFACES.find((s) => s.id === 'wall');
        if (rows.length < MAX) setRows((rs) => [...rs, newRow(next.id)]);
    };
    const labels = rowLabels(rows);
    const isRepeat = repeats(rows);
    // "The wall" means nothing when there are two: each needs its box.
    const needsBox = (r) => isRepeat(r) && !r.region;

    // Drag a box over the picture for the row being marked.
    const point = (e) => {
        const b = imgRef.current.getBoundingClientRect();
        return { x: Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), y: Math.min(1, Math.max(0, (e.clientY - b.top) / b.height)) };
    };
    const onDown = (e) => {
        if (drawingFor == null) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        start.current = point(e);
        setDraft({ ...start.current, w: 0, h: 0 });
    };
    const onMove = (e) => {
        if (!start.current) return;
        const p = point(e);
        const s = start.current;
        setDraft({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
    };
    const onUp = () => {
        if (!start.current) return;
        start.current = null;
        if (draft && draft.w > 0.02 && draft.h > 0.02) update(drawingFor, { region: fromCorners(regionCorners(draft)), auto: false });
        setDraft(null);
        setDrawingFor(null);
    };
    // Drag one corner of a marked area.
    const onCornerDown = (e, key, idx) => {
        if (busy) return;
        e.stopPropagation();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        dragging.current = { key, idx };
    };
    const onCornerMove = (e) => {
        const d = dragging.current;
        if (!d) return;
        const p = point(e);
        setRows((rs) =>
            rs.map((r) =>
                r.key === d.key && r.region ? { ...r, region: fromCorners(regionCorners(r.region).map((q, i) => (i === d.idx ? p : q))), auto: false } : r,
            ),
        );
    };
    const onCornerUp = () => {
        dragging.current = null;
    };

    const ready = shown && rows.length && rows.every((r) => byId[r.lotId]) && !rows.some(needsBox);
    const unmarked = rows.filter((r) => !r.region).length;
    const passes = (rows.length - unmarked ? 1 : 0) + unmarked; // renders, before any fix-up

    // Suggest a box for every unmarked surface, for the buyer to check and fix.
    const [finding, setFinding] = useState(false);
    const findBoxes = async () => {
        if (!shown || finding) return;
        setFinding(true);
        setError('');
        try {
            // Repeats (two walls) cannot be told apart by name, so only the buyer can box them.
            const todo = rows.filter((r) => !r.region && !isRepeat(r));
            const boxes = await suggestBoxes(
                shown.url,
                todo.map((r) => ({ surface: OWN_SURFACES.find((x) => x.id === r.surfaceId) })),
            );
            const byKey = Object.fromEntries(todo.map((r, i) => [r.key, boxes[i]]));
            setRows((rs) => rs.map((r) => (byKey[r.key] ? { ...r, region: byKey[r.key], auto: true } : r)));
            const missed = todo.filter((r) => !byKey[r.key]).length;
            if (missed)
                setError(`Could not find ${missed === 1 ? 'one surface' : `${missed} surfaces`} reliably: mark ${missed === 1 ? 'it' : 'them'} yourself.`);
        } catch (err) {
            setError(`Could not find the surfaces: ${err.message}`);
        } finally {
            setFinding(false);
        }
    };
    const run = async () => {
        if (!ready || busy) return;
        setError('');
        setBusy({ started: Date.now(), stage: 'rendering' });
        try {
            const items = rows.map((r, i) => ({
                lot: byId[r.lotId],
                surface: OWN_SURFACES.find((s) => s.id === r.surfaceId),
                label: labels[i],
                region: r.region,
            }));
            const out = await mixStonesInPhoto({
                photo: shown.url,
                items,
                onStage: (stage, labels) => setBusy((b) => (b ? { ...b, stage, labels } : b)),
            });
            setResult({ ...out, rows: rows.map((r, i) => ({ ...r, label: labels[i] })) });
        } catch (err) {
            setError(String(err.message || err).replace(/^Proxy error:\s*/i, ''));
        } finally {
            setBusy(null);
        }
    };

    const download = () => {
        const a = document.createElement('a');
        a.href = result.url;
        a.download = 'my-room-design.jpg';
        a.click();
    };

    const picker = (
        <div className="space-y-3">
            {rows.map((r, i) => {
                const surface = OWN_SURFACES.find((s) => s.id === r.surfaceId);
                const lot = byId[r.lotId];
                const choose = () =>
                    onPickStone?.({
                        n: i + 1,
                        label: labels[i],
                        color: MIX_COLORS[i].hex,
                        kind: surface.label.toLowerCase(),
                        avoid: surface.avoid || [],
                        apply: (lotId) => update(r.key, { lotId }),
                    });
                return (
                    <div key={r.key} className="rounded-2xl bg-white/80 border border-ink/10 p-3.5" style={{ borderLeft: `6px solid ${MIX_COLORS[i].hex}` }}>
                        <div className="flex items-center gap-2">
                            <span
                                className="w-6 h-6 rounded-full grid place-items-center text-[12px] font-extrabold text-white shrink-0"
                                style={{ background: MIX_COLORS[i].hex }}
                            >
                                {i + 1}
                            </span>
                            {isRepeat(r) && <span className="sr-only">{labels[i]}</span>}
                            <select
                                value={r.surfaceId}
                                onChange={(e) => {
                                    const next = OWN_SURFACES.find((s) => s.id === e.target.value);
                                    // A stone that may not go on the new surface (marble on a kitchen counter) is taken off it.
                                    const misfit = lot && next.avoid?.includes(lot.family);
                                    update(r.key, { surfaceId: next.id, ...(misfit ? { lotId: '' } : {}), ...(r.auto ? { region: null, auto: false } : {}) });
                                }}
                                className="flex-1 min-w-0 h-10 rounded-xl border border-ink/15 bg-white px-2 text-[14px] font-bold outline-none"
                                aria-label={`Surface ${i + 1}`}
                            >
                                {OWN_SURFACES.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {surfaceLabel(s)}
                                    </option>
                                ))}
                            </select>
                            {rows.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                                    aria-label={`Remove surface ${i + 1}`}
                                    className="w-9 h-9 rounded-full grid place-items-center text-ink-3 hover:text-ink hover:bg-paper-2 shrink-0"
                                >
                                    <Close className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            {lot ? (
                                <img src={lot.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            ) : (
                                <span className="w-10 h-10 rounded-lg bg-paper-2 shrink-0" />
                            )}
                            <span className="min-w-0 flex-1">
                                {lot ? (
                                    <>
                                        <span className="block text-[13.5px] font-bold truncate">{lot.name}</span>
                                        <span className="block text-[12px] text-ink-3 truncate">
                                            {lot.family} · {inr(lot.price)}/sq ft · {lot.sqft} sq ft
                                        </span>
                                    </>
                                ) : (
                                    <span className="block text-[13px] text-ink-3">No stone yet</span>
                                )}
                            </span>
                            <button
                                type="button"
                                onClick={choose}
                                className={`h-9 px-3.5 rounded-full text-[12.5px] font-bold shrink-0 ${lot ? 'border border-ink/20 hover:border-ink' : 'bg-ink text-paper'}`}
                                aria-label={`${lot ? 'Change the stone' : 'Choose a stone'} for ${labels[i]}, from the gallery`}
                            >
                                {lot ? 'Change' : 'Choose from the gallery'}
                            </button>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[12.5px]">
                            <button
                                type="button"
                                disabled={!shown}
                                onClick={() => setDrawingFor(drawingFor === r.key ? null : r.key)}
                                className={`h-8 px-3 rounded-full font-bold border disabled:opacity-40 ${
                                    drawingFor === r.key ? 'bg-ink text-paper border-ink' : 'border-ink/20 hover:border-ink'
                                }`}
                            >
                                {drawingFor === r.key ? 'Drag over the whole surface…' : r.region ? 'Mark again' : 'Mark it on the picture'}
                            </button>
                            {r.region && (
                                <button
                                    type="button"
                                    onClick={() => update(r.key, { region: null })}
                                    className="text-ink-3 hover:text-ink underline underline-offset-2"
                                >
                                    Clear mark
                                </button>
                            )}
                            {r.region && drawingFor !== r.key && <span className="text-ink-3">Drag its corners to fit the edges</span>}
                            {!r.region &&
                                drawingFor !== r.key &&
                                (needsBox(r) ? (
                                    <span className="text-clay font-semibold">Needed: mark which {labels[i].replace(/ \d+$/, '').toLowerCase()} this is</span>
                                ) : (
                                    <span className="text-ink-3">Optional: the stone then stays inside your box</span>
                                ))}
                        </div>
                    </div>
                );
            })}
            {rows.length < MAX && (
                <button
                    type="button"
                    onClick={addRow}
                    className="w-full h-11 rounded-2xl border-2 border-dashed border-ink/20 text-[13.5px] font-bold text-ink-2 hover:border-ink/50"
                >
                    + Add another surface ({rows.length} of {MAX})
                </button>
            )}
            {shown && unmarked > 0 && (
                <button
                    type="button"
                    onClick={findBoxes}
                    disabled={finding || !!busy}
                    className="w-full h-11 rounded-2xl bg-white/80 border border-ink/15 text-[13.5px] font-bold hover:border-ink disabled:opacity-50"
                >
                    {finding ? 'Finding them…' : `Find ${unmarked === 1 ? 'it' : 'them'} for me (dashed boxes you can redraw)`}
                </button>
            )}
        </div>
    );

    return (
        <section className="pt-24 md:pt-28 pb-20 max-w-[1320px] mx-auto px-4 md:px-8">
            <button onClick={onHome} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink-3 hover:text-ink">
                <Arrow dir="left" className="w-3.5 h-3.5" /> Back to the site
            </button>
            <h1 className="mt-3 font-brand text-[44px] md:text-[56px] leading-none">Design a room</h1>
            <p className="mt-3 max-w-[680px] text-ink-2 text-[15px] leading-relaxed">
                Pick up to three surfaces in one picture, a stone for each, and see them all together in one render: say the floor in one stone, the dining
                table in another, and the highlighter wall in a third.
            </p>

            <div className="mt-8 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6 items-start">
                <div>
                    {result && !busy ? (
                        <div className="rounded-[18px] overflow-hidden bg-ink" style={{ aspectRatio: `${result.w} / ${result.h}` }}>
                            <ImageCompareSlider
                                key={result.url.slice(-32)}
                                before={result.before}
                                after={result.url}
                                beforeLabel="Before"
                                afterLabel="With your stones"
                            />
                        </div>
                    ) : shown ? (
                        <div
                            className={`relative rounded-[18px] overflow-hidden bg-ink select-none ${drawingFor != null ? 'cursor-crosshair touch-none' : ''}`}
                            onPointerDown={onDown}
                            onPointerMove={onMove}
                            onPointerUp={onUp}
                            onPointerCancel={onUp}
                        >
                            <img
                                ref={imgRef}
                                src={shown.url}
                                alt="The picture to design"
                                draggable={false}
                                className={`block w-full h-auto ${busy ? 'opacity-50' : ''}`}
                            />
                            {rows.map((r, i) =>
                                r.region ? <Shape key={r.key} region={r.region} color={MIX_COLORS[i].hex} n={i + 1} dashed={r.auto} /> : null,
                            )}
                            {!busy &&
                                drawingFor == null &&
                                rows.map((r, i) =>
                                    r.region
                                        ? regionCorners(r.region).map((p, idx) => (
                                              <button
                                                  key={`${r.key}-${idx}`}
                                                  type="button"
                                                  aria-label={`Corner ${idx + 1} of ${labels[i]}: drag to move it`}
                                                  onPointerDown={(e) => onCornerDown(e, r.key, idx)}
                                                  onPointerMove={onCornerMove}
                                                  onPointerUp={onCornerUp}
                                                  onPointerCancel={onCornerUp}
                                                  className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-white border-[3px] shadow cursor-move touch-none"
                                                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, borderColor: MIX_COLORS[i].hex }}
                                              />
                                          ))
                                        : null,
                                )}
                            {draft && <Box region={draft} color={MIX_COLORS[rows.findIndex((r) => r.key === drawingFor)]?.hex || '#000'} />}
                            {busy && (
                                <div className="absolute inset-0 grid place-items-center p-4">
                                    <RenderingNote
                                        started={busy.started}
                                        title={
                                            busy.stage === 'single'
                                                ? `Now the ${(busy.labels || [])[0]?.toLowerCase()}, on its own…`
                                                : busy.stage === 'fixing'
                                                  ? `The ${(busy.labels || [])[0]?.toLowerCase()} did not change, a pass for it alone…`
                                                  : busy.stage === 'finishing'
                                                    ? `The ${(busy.labels || [])[0]?.toLowerCase()} is only partly done, finishing it…`
                                                    : `Putting ${busy.labels?.length || rows.length} ${(busy.labels?.length || rows.length) === 1 ? 'stone' : 'stones'} in, in one render…`
                                        }
                                        hint={busy.stage === 'rendering' ? 'about 20 s' : 'one more render'}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="relative rounded-[18px] bg-paper-2 aspect-[3/2]">
                            <RoomDropZone
                                title="Start with a picture of your room"
                                text="A phone photo or the 3D render your interior designer sent. Or pick one of our rooms below."
                                error={error}
                                onFile={take}
                            />
                        </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <NewPhotoButton onFile={take} />
                        {ourRooms.length > 0 && <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3 ml-1">Or one of ours</span>}
                    </div>
                    {ourRooms.length > 0 && (
                        <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {ourRooms.map((t) => (
                                <button
                                    key={t.url}
                                    type="button"
                                    onClick={() => choosePicture(t.url)}
                                    className={`shrink-0 w-[120px] rounded-xl overflow-hidden border-2 text-left ${picture === t.url ? 'border-ink' : 'border-transparent hover:border-ink/30'}`}
                                >
                                    <img src={t.url} alt="" className="w-full aspect-[3/2] object-cover" />
                                    <span className="block px-1.5 py-1 text-[11px] font-semibold text-ink-2 truncate bg-white/80">
                                        {RENDER_SCENES[t.scene]?.label} · {styleName(t.style)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-4 lg:sticky lg:top-24">
                    {result && !busy ? (
                        <Legend result={result} byId={byId} onOpenLot={onOpenLot} onEdit={() => setResult(null)} onDownload={download} />
                    ) : (
                        <>
                            {picker}
                            <button
                                onClick={run}
                                disabled={!ready || !!busy}
                                className="w-full h-12 rounded-full bg-ink text-paper font-bold text-[15px] disabled:opacity-40"
                            >
                                {busy ? 'Rendering…' : `Render ${rows.length === 1 ? 'it' : `all ${rows.length}`}`}
                            </button>
                            <p className="text-[12px] text-ink-3 text-center">
                                {!shown
                                    ? 'Choose a picture first.'
                                    : rows.some(needsBox)
                                      ? 'You picked the same surface twice: mark each one on the picture so we know which is which.'
                                      : !ready
                                        ? 'Choose a stone for every surface.'
                                        : unmarked && rows.length > 1
                                          ? `${unmarked} not marked: ${unmarked === 1 ? 'it is' : 'they are'} done one at a time, so ${passes} renders, about ${passes * 20} s. Mark every surface to do them all in one render.`
                                          : 'One render, about 20 seconds. Your photo is never saved.'}
                            </p>
                            {error && <p className="text-[12.5px] text-clay font-semibold">Couldn&apos;t finish: {error}</p>}
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

/** A marked area as its real shape (four corners), numbered at its centre. */
const Shape = ({ region, color, n, dashed }) => {
    const pts = regionCorners(region);
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return (
        <>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <polygon
                    points={pts.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
                    fill={`${color}33`}
                    stroke={color}
                    strokeWidth="3"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray={dashed ? '9 6' : undefined}
                />
            </svg>
            <span
                className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full grid place-items-center text-[12px] font-extrabold text-white shadow pointer-events-none"
                style={{ left: `${cx * 100}%`, top: `${cy * 100}%`, background: color }}
            >
                {n}
            </span>
        </>
    );
};

// The rectangle while it is being dragged out.
const Box = ({ region, color, n, dashed }) => (
    <div
        className="absolute pointer-events-none"
        style={{
            left: `${region.x * 100}%`,
            top: `${region.y * 100}%`,
            width: `${region.w * 100}%`,
            height: `${region.h * 100}%`,
            border: `3px ${dashed ? 'dashed' : 'solid'} ${color}`,
            background: `${color}33`,
            borderRadius: 6,
        }}
    >
        {n && (
            <span
                className="absolute -top-3 -left-3 w-6 h-6 rounded-full grid place-items-center text-[12px] font-extrabold text-white shadow"
                style={{ background: color }}
            >
                {n}
            </span>
        )}
    </div>
);

function Legend({ result, byId, onOpenLot, onEdit, onDownload }) {
    return (
        <div className="space-y-3">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">In this picture</p>
            {result.rows.map((r, i) => {
                const lot = byId[r.lotId];
                const surface = OWN_SURFACES.find((s) => s.id === r.surfaceId);
                return (
                    <div
                        key={r.key}
                        className="rounded-2xl bg-white/80 border border-ink/10 p-3 flex items-center gap-3"
                        style={{ borderLeft: `6px solid ${MIX_COLORS[i].hex}` }}
                    >
                        <img src={lot.image} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink-3">{r.label || surfaceLabel(surface)}</p>
                            <p className="font-bold text-[14px] truncate">{lot.name}</p>
                            <p className="text-[12px] text-ink-3">
                                {inr(lot.price)}/sq ft · {lot.sqft} sq ft in the lot
                                {result.changed[i] === false && <span className="text-clay font-semibold"> · did not change, try again</span>}
                                {result.partly?.[i] && <span className="text-clay font-semibold"> · only partly done, try again</span>}
                                {r.auto && <span> · box suggested automatically</span>}
                            </p>
                        </div>
                        <button
                            onClick={() => onOpenLot(lot)}
                            className="h-9 px-3 rounded-full border border-ink/20 text-[12.5px] font-bold hover:border-ink shrink-0"
                        >
                            See lot
                        </button>
                    </div>
                );
            })}
            <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={onDownload} className="h-10 px-4 rounded-full bg-ink text-paper text-[13px] font-bold">
                    Save this picture
                </button>
                <button onClick={onEdit} className="h-10 px-4 rounded-full border border-ink/20 text-[13px] font-bold hover:border-ink">
                    Change the stones
                </button>
            </div>
            <p className="text-[12px] text-ink-3">
                Drag the line on the picture to compare before and after. {result.renders > 1 ? `Took ${result.renders} renders.` : 'One render.'}
            </p>
        </div>
    );
}
