import React, { useEffect, useRef, useState } from 'react';
// The live site's slider, imported as is: same drag, same clip, same labels.
import ImageCompareSlider from '../../../src/components/ImageCompareSlider.jsx';
import { canDo, GROUPS, ownSurfacesFor, placeOf, SCENE_IDS, SCENES } from '../lib/applications';
import { hasOwnRender, prepareRoomPhoto, renderOwnRoom } from '../lib/renders';
import { creditsLeft, giveCreditBack, takeCredit, useCredits } from '../lib/commerce';
import { costFor, inr } from '../lib/lots';
import { Arrow, Chip, Close, DownloadButton, Pin } from './ui';
import { fileNameFor } from '../lib/download';
import { Elapsed } from './Busy';
import { CameraIcon, NewPhotoButton, RoomDropZone, SurfaceStep } from './RoomUpload';

const OWN = 'own';

/**
 * Two lots, one room, a line you drag between them. The live StoneCompareModal,
 * on the prototype's saved renders, plus the buyer's own room.
 *
 * In one of OUR rooms, the second stone is an EDIT of the first lot's room,
 * never a fresh render, so the room, light and camera are identical and only
 * the stone changes. When either lot already has a saved render of the room,
 * that render is the room and a comparison costs one render. Otherwise the
 * first lot's room is rendered (and saved, like any other) and then the second
 * is swapped in: two renders.
 *
 * In the buyer's OWN room, both stones go onto the same surface of their photo
 * (see renderOwnRoom): two renders, fewer if either was already tried on that
 * surface this visit. The photo is the app's in-memory one, shared with the
 * lot pages, and is never saved.
 */
// Decided 2026-11-17: only "Your room" makes new pictures, and each takes a
// credit. In one of our rooms the two lots are shown from their ready-made
// pictures (or the slab photo where a lot has none for that room), at once
// and free; for both stones in the very same room, use a photo of your own.
export default function CompareSheet({ a, b, renders, onOpenLot, onClose, ownPhoto, setOwnPhoto, startInOwnRoom, onNeedCredits }) {
    const credits = useCredits();
    const rooms = SCENE_IDS.filter((id) => canDo(a, id) && canDo(b, id));
    const bSurfaces = ownSurfacesFor(b);
    const surfaces = ownSurfacesFor(a).filter((s) => bSurfaces.includes(s));
    const [sceneId, setSceneId] = useState(startInOwnRoom ? OWN : null);
    // Your room: nothing is pre-picked, the buyer says where both stones go.
    const [surfaceId, setSurfaceId] = useState(null);
    const surface = surfaces.find((s) => s.id === surfaceId) || null;
    const [results, setResults] = useState({}); // our rooms: { [sceneId]: { left, right } }
    const [own, setOwn] = useState({ photo: null, by: {} }); // your room: { [surfaceId]: { left, right } } for one photo
    const ownBy = own.photo === ownPhoto ? own.by : {};
    const [busy, setBusy] = useState(null); // { sceneId, step, started, steps }
    const [error, setError] = useState('');
    const inFlight = useRef(false);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    const cleanError = (err) => String(err.message || err).replace(/^Proxy error:\s*/i, '');

    // Our rooms: each lot's ready-made picture of that room, else its slab photo. No render.
    const runRoom = (id) => {
        if (results[id]) return;
        setError('');
        setResults((r) => ({ ...r, [id]: { left: renders[a.id]?.[id] || a.image, right: renders[b.id]?.[id] || b.image, ready: true, unchanged: [] } }));
    };

    // `again`: the lots to ask for afresh (the ones that came back unchanged).
    const runOwn = async ({ again = [] } = {}) => {
        if (inFlight.current || !ownPhoto || !surface) return;
        inFlight.current = true;
        setError('');
        const photo = ownPhoto;
        const s = surface;
        const started = Date.now();
        const fresh = (l) => again.some((x) => x.id === l.id);
        const steps = [a, b].filter((l) => fresh(l) || !hasOwnRender(l, s, photo)).length;
        // A credit for each new picture; "Try again" on an unchanged side is free.
        const toPay = [a, b].filter((l) => !fresh(l) && !hasOwnRender(l, s, photo)).length;
        if (toPay > creditsLeft(credits)) {
            inFlight.current = false;
            onNeedCredits?.();
            return;
        }
        const taken = Array.from({ length: toPay }, () => takeCredit());
        try {
            setBusy({ sceneId: OWN, step: 'a', started, steps });
            const left = await renderOwnRoom(a, s, photo, { fresh: fresh(a) });
            setBusy({ sceneId: OWN, step: 'b', started, steps });
            const right = await renderOwnRoom(b, s, photo, { fresh: fresh(b) });
            const unchanged = [left.changed ? null : a, right.changed ? null : b].filter(Boolean);
            // Both are edits of the same framed photo, so they share one frame.
            setOwn((o) => ({
                photo,
                by: { ...(o.photo === photo ? o.by : {}), [s.id]: { left: left.url, right: right.url, w: left.w, h: left.h, unchanged } },
            }));
        } catch (err) {
            taken.forEach(giveCreditBack);
            setError(cleanError(err));
        } finally {
            setBusy(null);
            inFlight.current = false;
        }
    };

    const pick = (id) => {
        if (busy) return;
        setSceneId(id);
        setError('');
        if (id !== OWN) runRoom(id);
    };

    const takePhoto = async (file) => {
        setError('');
        try {
            setOwnPhoto(await prepareRoomPhoto(file));
        } catch (err) {
            setError(err.message);
        }
    };

    const isOwn = sceneId === OWN;
    const scene = sceneId && !isOwn ? SCENES[sceneId] : null;
    const result = isOwn ? ownBy[surface?.id] : sceneId ? results[sceneId] : null;
    // Renders the next "Compare on the …" click would cost.
    const ownCost = isOwn && ownPhoto && surface ? [a, b].filter((l) => !hasOwnRender(l, surface, ownPhoto)).length : 0;

    let picture;
    if (result && !busy) {
        picture = (
            <ImageCompareSlider
                key={`${result.left.slice(-24)}${result.right.slice(-24)}`}
                before={result.left}
                after={result.right}
                beforeLabel={a.name}
                afterLabel={b.name}
            />
        );
    } else if (isOwn && !ownPhoto) {
        picture = (
            <div className="absolute inset-0 bg-paper-2">
                {surface ? (
                    <RoomDropZone
                        eyebrow={`Step 2 of 2 · ${surface.label}`}
                        title="Now a photo of your room"
                        text={`Your room, or the 3D render your interior designer sent. Both stones go on its ${surface.label.toLowerCase()}, then you drag the line between them.`}
                        error={error}
                        onFile={takePhoto}
                        onBack={() => setSurfaceId(null)}
                        backLabel="Change surface"
                    />
                ) : (
                    <SurfaceStep
                        title="Where should both stones go in your room?"
                        note="Then add a photo of the room. Both go on that surface only; the rest of your photo stays as it is."
                        surfaces={surfaces}
                        onPick={setSurfaceId}
                    />
                )}
            </div>
        );
    } else if (isOwn) {
        picture = (
            <div className="absolute inset-0 bg-ink">
                <img src={ownPhoto} alt="Your room" className={`absolute inset-0 w-full h-full object-contain ${busy ? 'opacity-50' : ''}`} />
                {busy && (
                    <div className="absolute inset-0 grid place-items-center p-4">
                        <BusyNote
                            title={
                                busy.step === 'a'
                                    ? `Putting ${a.name} on your ${surface.label.toLowerCase()}…`
                                    : `Now ${b.name} on the same ${surface.label.toLowerCase()}…`
                            }
                            started={busy.started}
                            hint={busy.steps === 2 ? `step ${busy.step === 'a' ? 1 : 2} of 2, about 40 s in all` : 'about 20 s'}
                        />
                    </div>
                )}
            </div>
        );
    } else {
        const preview = renders[a.id]?.[sceneId] || renders[b.id]?.[sceneId] || a.image;
        picture = (
            <>
                <img src={preview} alt="" className={`absolute inset-0 w-full h-full object-cover ${busy || !sceneId ? 'blur-md scale-110 opacity-60' : ''}`} />
                <div className="absolute inset-0 grid place-items-center p-4 text-center">
                    {busy ? (
                        <BusyNote
                            title={busy.step === 'scene' ? `Building the ${placeOf(SCENES[busy.sceneId])} with ${a.name}…` : 'Swapping in the other stone…'}
                            started={busy.started}
                            hint={
                                busy.step === 'scene'
                                    ? 'step 1 of 2, about 40 s in all'
                                    : busy.steps === 2
                                      ? 'step 2 of 2'
                                      : 'same room, other stone · about 20 s'
                            }
                        />
                    ) : (
                        <div className="rounded-2xl bg-paper/95 backdrop-blur px-5 py-4 shadow-card max-w-[400px]">
                            <p className="font-bold text-[15px]">{error ? 'That comparison did not finish' : 'Pick a room to compare them in'}</p>
                            <p className="mt-1 text-[12.5px] text-ink-2">
                                {error || 'Pick one of our rooms to see both lots in it, or put both stones on the same surface of a photo of your own.'}
                            </p>
                            {
                                <button
                                    onClick={() => pick(OWN)}
                                    className="mt-3 h-10 px-4 rounded-full border border-ink/20 text-[13px] font-bold inline-flex items-center gap-1.5 hover:border-ink"
                                >
                                    <CameraIcon /> Use my own room
                                </button>
                            }
                        </div>
                    )}
                </div>
            </>
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label={`Compare ${a.name} and ${b.name}`}
        >
            <button className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] scene-fade" onClick={onClose} aria-label="Close" />
            <div className="relative sheet-in bg-paper w-full md:w-[min(1180px,94vw)] max-h-[94svh] md:max-h-[92vh] rounded-t-[26px] md:rounded-[26px] overflow-y-auto shadow-float">
                <div className="p-4 md:p-6 pb-3 md:pb-4 pr-14">
                    <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-clay">Compare{isOwn ? ' · in your room' : ''}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                        <LotTag lot={a} />
                        <span className="text-ink-3 text-[13px] font-semibold">vs</span>
                        <LotTag lot={b} />
                    </div>
                </div>

                <div className="px-4 md:px-6">
                    {/* Shaped like the comparison's frame (landscape ones), so the
                        slider fills the box with no bars. */}
                    <div
                        className="relative w-full rounded-[18px] overflow-hidden bg-paper-3"
                        style={{ aspectRatio: result?.w && result.w >= result.h && !busy ? `${result.w} / ${result.h}` : '1408 / 736' }}
                    >
                        {picture}
                    </div>
                    {result && !busy && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {[
                                [a, result.left],
                                [b, result.right],
                            ].map(([lot, src]) => (
                                <DownloadButton
                                    key={lot.id}
                                    getSrc={() => src}
                                    name={fileNameFor(lot.name, isOwn ? 'in my room' : `in a ${scene ? placeOf(scene) : 'room'}`)}
                                    label={`Download ${lot.name}'s picture`}
                                    text={`Download ${lot.name}`}
                                    className="border border-ink/15 shadow-none"
                                />
                            ))}
                        </div>
                    )}
                    {result?.unchanged?.length > 0 && !busy && (
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-clay-soft px-4 py-3 text-[13px] text-clay" role="alert">
                            <span className="font-semibold flex-1 min-w-[220px]">
                                {isOwn
                                    ? `${result.unchanged.map((l) => l.name).join(' and ')} looks almost the same as your photo on the ${surface.label.toLowerCase()}, even after a second try. If that surface is already a similar stone, that is expected; if not, try again.`
                                    : `${result.unchanged.map((l) => l.name).join(' and ')} came back with the ${scene.surface.toLowerCase()} barely changed, even after a second try, so both sides may look alike.`}
                            </span>
                            <button
                                onClick={() => runOwn({ again: result.unchanged })}
                                className="h-9 px-4 rounded-full bg-clay text-paper text-[12.5px] font-bold shrink-0"
                            >
                                Try again
                            </button>
                        </div>
                    )}
                </div>

                {isOwn && ownPhoto && (
                    <div className="px-4 md:px-6 pt-4 space-y-3">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">
                                Where should they go in your photo?
                                {!surface && <span className="normal-case tracking-normal font-semibold text-clay"> Pick one to start.</span>}
                            </p>
                            <div className="mt-1.5 flex md:flex-wrap gap-1.5 overflow-x-auto md:overflow-visible no-scrollbar">
                                {surfaces.map((s) => (
                                    <Chip key={s.id} active={surface?.id === s.id} onClick={() => !busy && setSurfaceId(s.id)}>
                                        {ownBy[s.id] && <span className="w-1.5 h-1.5 rounded-full bg-moss" aria-hidden="true" />}
                                        {s.label}
                                    </Chip>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {!result && (
                                <button
                                    onClick={() => runOwn()}
                                    disabled={!!busy || !surface}
                                    className="h-10 px-4 rounded-full bg-ink text-paper text-[13px] font-bold disabled:opacity-50 shrink-0"
                                >
                                    {surface ? `Compare on the ${surface.label.toLowerCase()}` : 'Pick where they go first'}
                                </button>
                            )}
                            <NewPhotoButton onFile={takePhoto} />
                            <span className="text-[12px] text-ink-3">
                                {result
                                    ? 'Drag the line to compare. Pick another surface to try that too.'
                                    : !surface
                                      ? ''
                                      : ownCost === 0
                                        ? 'Both are ready.'
                                        : `${ownCost} ${ownCost === 1 ? 'render' : 'renders'}, about ${ownCost * 20} seconds, ${ownCost} ${ownCost === 1 ? 'credit' : 'credits'} (${creditsLeft(credits)} left).`}{' '}
                                Your photo is never saved.
                            </span>
                        </div>
                        {error && <p className="text-[12.5px] text-clay font-semibold">Couldn&apos;t finish: {error}</p>}
                    </div>
                )}

                <div className="px-4 md:px-6 pt-4">
                    <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">
                        Where to compare{' '}
                        <span className="normal-case tracking-normal font-semibold">· your room, or {rooms.length} of ours both lots suit</span>
                    </p>
                    <div className="mt-2 flex md:flex-wrap items-center gap-1.5 overflow-x-auto md:overflow-visible no-scrollbar pb-1">
                        <Chip
                            active={isOwn}
                            onClick={() => pick(OWN)}
                            className={`${isOwn ? '' : '!border-clay/50 !text-clay'} ${busy && !isOwn ? 'opacity-50' : ''}`}
                        >
                            <CameraIcon /> Your room
                        </Chip>
                        <span className="w-px h-5 bg-ink/15 mx-0.5 shrink-0" aria-hidden="true" />
                        {GROUPS.flatMap((g) => rooms.filter((id) => SCENES[id].group === g)).map((id) => (
                            <Chip key={id} active={sceneId === id} onClick={() => pick(id)} className={busy && busy.sceneId !== id ? 'opacity-50' : ''}>
                                {results[id] && <span className="w-1.5 h-1.5 rounded-full bg-moss" aria-hidden="true" />}
                                {SCENES[id].label}
                                <span className="opacity-60 font-medium">{SCENES[id].surface.toLowerCase()}</span>
                            </Chip>
                        ))}
                    </div>
                </div>

                <div className="p-4 md:p-6 grid sm:grid-cols-2 gap-3">
                    {[a, b].map((lot, i) => (
                        <div key={lot.id} className="rounded-2xl bg-white/70 border border-ink/10 p-4 flex gap-3">
                            <img src={lot.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3">{i === 0 ? 'Left' : 'Right'}</p>
                                <p className="font-brand text-[22px] leading-tight truncate">{lot.name}</p>
                                <p className="text-[12.5px] text-ink-3 font-semibold">
                                    {lot.family} · {lot.sqft} sq ft · <Pin className="w-3 h-3 inline -mt-0.5" /> {lot.city.name}
                                </p>
                                <p className="mt-2 text-[13.5px]">
                                    <b>{inr(lot.price)}</b>
                                    <span className="text-ink-3">/sq ft whole lot</span>
                                    {scene && (
                                        <>
                                            {' '}
                                            · {scene.surface.toLowerCase()} <b className="tabular-nums">{inr(costFor(lot, scene.sqft))}</b>
                                        </>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => onOpenLot(lot)}
                                className="self-center shrink-0 h-9 px-3 rounded-full border border-ink/20 text-[12.5px] font-bold hover:border-ink inline-flex items-center gap-1"
                            >
                                See lot <Arrow className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
                <p className="px-4 md:px-6 pb-5 -mt-2 text-[12px] text-ink-3">
                    {isOwn
                        ? 'Both stones go onto the same surface of your photo, and everything else stays as you shot it. Two renders; one if you already tried either lot on that surface.'
                        : "Uses the live site's compare: the second stone is swapped into the first one's room. One render when either lot already has the room saved, two when neither does."}
                </p>

                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur grid place-items-center shadow-sm hover:bg-white"
                >
                    <Close />
                </button>
            </div>
        </div>
    );
}

const BusyNote = ({ title, started, hint }) => (
    <div className="rounded-2xl bg-paper/95 backdrop-blur px-5 py-4 shadow-card text-center" role="status">
        <div className="mx-auto w-8 h-8 rounded-full border-[3px] border-ink/15 border-t-ink animate-spin" />
        <p className="mt-3 font-bold text-[14px]">{title}</p>
        <p className="text-[12.5px] text-ink-3 tabular-nums">
            <Elapsed since={started} /> · {hint}
        </p>
    </div>
);

const LotTag = ({ lot }) => (
    <span className="inline-flex items-center gap-2 min-w-0">
        <img src={lot.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
        <span className="font-brand text-[24px] md:text-[28px] leading-none truncate">{lot.name}</span>
    </span>
);
