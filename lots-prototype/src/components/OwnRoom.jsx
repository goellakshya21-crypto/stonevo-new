import React, { useState } from 'react';
import ImageCompareSlider from '../../../src/components/ImageCompareSlider.jsx';
import { ownSurfacesFor } from '../lib/applications';
import { hasOwnRender, layoutKey, prepareRoomPhoto, renderOwnRoom } from '../lib/renders';
import { creditsLeft, giveCreditBack, takeCredit, useCredits } from '../lib/commerce';
import { useFileDrop } from '../lib/hooks';
import { Chip } from './ui';
import { RenderingNote } from './Busy';
import { NewPhotoButton, RoomDropZone, SurfaceStep } from './RoomUpload';

/**
 * A lot, put into a photo of the buyer's own room (or the 3D render their
 * interior designer sent). The live own-photo path: the visualiser finds the
 * chosen surface in their picture and replaces only that, keeping the room,
 * light and furniture as they are. Before/after on the live compare slider.
 *
 * The photo is held in memory by the app, so a buyer uploads once and tries
 * lot after lot in the same room. It is never saved to disk or to the server.
 *
 * The buyer picks WHERE the stone goes (floor, feature wall, counter…) before
 * adding a photo, and can change it after; nothing is pre-picked, so the stone
 * never lands on a surface they did not choose.
 *
 * Renders the picture box and its controls as two siblings, so they slot into
 * the lot sheet's left column in place of the room picture.
 */
export default function OwnRoom({
    lot,
    photo,
    setPhoto,
    boxClass,
    onMix,
    layout = null,
    onChangeLayout,
    surfaceId: keptSurfaceId,
    setSurfaceId: keepSurfaceId,
    onNeedCredits,
}) {
    const credits = useCredits();
    const surfaces = ownSurfacesFor(lot);
    // The lot page keeps the chosen surface, so a trip to the Book-match view
    // and back does not make the buyer pick it again.
    const [ownSurfaceId, setOwnSurfaceId] = useState(null);
    const surfaceId = keepSurfaceId ? keptSurfaceId : ownSurfaceId;
    const setSurfaceId = keepSurfaceId || setOwnSurfaceId;
    const surface = surfaces.find((s) => s.id === surfaceId) || null;
    // Results belong to one photo; a new photo starts clean.
    const [done, setDone] = useState({ photo: null, by: {} });
    const results = done.photo === photo ? done.by : {}; // { [surface|layout]: { url, changed } }
    // A result belongs to a surface AND a slab layout (book-match).
    const keyOf = (s) => `${s.id}|${layoutKey(layout || s.slabs)}`;
    // How the slabs go on, in words: the buyer's book-match, else the surface's usual count.
    const laidAs = (s) => {
        const n = layout?.count || s.slabs;
        return `${n === 1 ? 'one slab' : `${n} slabs, book-matched`}${layout?.rotation ? `, turned ${layout.rotation}°` : ''}`;
    };
    const mine = surface ? results[keyOf(surface)] : null;
    const result = mine?.url || null;
    const unchanged = !!mine && !mine.changed;
    const [busy, setBusy] = useState(null); // { started, surfaceId }
    const [error, setError] = useState('');

    const take = async (file) => {
        setError('');
        try {
            setPhoto(await prepareRoomPhoto(file));
        } catch (err) {
            setError(err.message);
        }
    };
    const [, dropProps] = useFileDrop(take);

    const run = async ({ fresh = false } = {}) => {
        if (busy || !photo || !surface) return;
        // Each new picture of the buyer's room takes a credit (decided
        // 2026-11-17); "Try again" after an unchanged result does not, and a
        // render that fails gives its credit back.
        let credit = null;
        if (!fresh && !hasOwnRender(lot, surface, photo, layout)) {
            credit = takeCredit();
            if (!credit) {
                onNeedCredits?.();
                return;
            }
        }
        setError('');
        setBusy({ started: Date.now(), surfaceId: surface.id });
        try {
            const out = await renderOwnRoom(lot, surface, photo, { fresh, layout });
            setDone((d) => ({
                photo,
                by: { ...(d.photo === photo ? d.by : {}), [keyOf(surface)]: { url: out.url, before: out.before, changed: out.changed } },
            }));
        } catch (err) {
            giveCreditBack(credit);
            setError(String(err.message || err).replace(/^Proxy error:\s*/i, ''));
        } finally {
            setBusy(null);
        }
    };

    const download = () => {
        const a = document.createElement('a');
        a.href = result;
        a.download = `${lot.name}-in-my-room.jpg`.replace(/[^a-z0-9.-]+/gi, '-').toLowerCase();
        a.click();
    };

    if (!photo) {
        return (
            <>
                <div className={`${boxClass} bg-paper-2`}>
                    {surface ? (
                        <RoomDropZone
                            eyebrow={`Step 2 of 2 · ${surface.label}`}
                            title="Now a photo of your room"
                            text={`Your room, or the 3D render your interior designer sent. We put ${lot.name} on the ${surface.label.toLowerCase()} only, laid as ${laidAs(surface)}, and keep everything else as it is.`}
                            error={error}
                            onFile={take}
                            onBack={() => setSurfaceId(null)}
                            backLabel="Change surface"
                        />
                    ) : (
                        <SurfaceStep
                            title={`Where should ${lot.name} go in your room?`}
                            note="Then add a photo of the room. Only that surface changes; the rest of your photo stays as it is."
                            surfaces={surfaces}
                            onPick={setSurfaceId}
                        />
                    )}
                </div>
                {onMix && (
                    <div className="px-4 md:px-5 pt-3 shrink-0">
                        <button
                            type="button"
                            onClick={() => onMix(surface?.id || 'wall')}
                            className="text-[13px] font-bold text-clay underline underline-offset-4 decoration-clay/40 hover:decoration-clay"
                        >
                            Several surfaces at once? Design your space with {lot.name} and other stones
                        </button>
                    </div>
                )}
            </>
        );
    }

    return (
        <>
            <div className={`${boxClass} bg-ink`} {...dropProps}>
                {result && !busy ? (
                    <ImageCompareSlider key={result} before={mine.before || photo} after={result} beforeLabel="Your room" afterLabel={lot.name} />
                ) : (
                    <>
                        <img src={photo} alt="Your room" className={`absolute inset-0 w-full h-full object-contain ${busy ? 'opacity-50' : ''}`} />
                        {busy && (
                            <div className="absolute inset-0 grid place-items-center p-4">
                                <RenderingNote started={busy.started} title={`Putting ${lot.name} on your ${surface.label.toLowerCase()}…`} />
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className="px-4 md:px-5 pt-4 space-y-3 shrink-0">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">
                        Where should it go in your photo?
                        {!surface && <span className="normal-case tracking-normal font-semibold text-clay"> Pick one to start.</span>}
                    </p>
                    <div className="mt-1.5 flex md:flex-wrap gap-1.5 overflow-x-auto md:overflow-visible no-scrollbar">
                        {surfaces.map((s) => (
                            <Chip key={s.id} active={surface?.id === s.id} onClick={() => !busy && setSurfaceId(s.id)}>
                                {results[keyOf(s)] && <span className="w-1.5 h-1.5 rounded-full bg-moss" aria-hidden="true" />}
                                {s.label}
                            </Chip>
                        ))}
                    </div>
                    {surface && (
                        <p className="mt-2 text-[12.5px] text-ink-2">
                            Laid as <b>{laidAs(surface)}</b>
                            {layout ? ' (your layout)' : ` (usual for a ${surface.label.toLowerCase()})`}
                            {onChangeLayout && (
                                <>
                                    {' · '}
                                    <button
                                        type="button"
                                        onClick={() => onChangeLayout(layout?.count || surface.slabs)}
                                        className="font-bold text-clay underline underline-offset-2 decoration-clay/40 hover:decoration-clay"
                                    >
                                        Change the book-match
                                    </button>
                                </>
                            )}
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {result ? (
                        <button onClick={download} className="h-10 px-4 rounded-full bg-ink text-paper text-[13px] font-bold">
                            Save this picture
                        </button>
                    ) : (
                        <button
                            onClick={() => run()}
                            disabled={!!busy || !surface}
                            className="h-10 px-4 rounded-full bg-ink text-paper text-[13px] font-bold disabled:opacity-50"
                        >
                            {surface ? `Put it on the ${surface.label.toLowerCase()}` : 'Pick where it goes first'}
                        </button>
                    )}
                    {unchanged && !busy && (
                        <button onClick={() => run({ fresh: true })} className="h-10 px-4 rounded-full bg-clay text-paper text-[13px] font-bold">
                            Try again
                        </button>
                    )}
                    <NewPhotoButton onFile={take} />
                    {onMix && (
                        <button
                            type="button"
                            onClick={() => onMix(surface?.id || 'wall')}
                            className="h-10 px-4 rounded-full border border-ink/20 text-[13px] font-bold hover:border-ink shrink-0"
                        >
                            Add more stones
                        </button>
                    )}
                    <span className="text-[12px] text-ink-3">
                        {result
                            ? 'Drag the line to compare.'
                            : `About 20 seconds, 1 credit (${creditsLeft(credits)} left${credits.free ? `, ${credits.free} free` : ''}).`}{' '}
                        Your photo is never saved.
                    </span>
                </div>
                {unchanged && !busy && (
                    <p className="text-[12.5px] text-clay font-semibold" role="alert">
                        The {surface.label.toLowerCase()} looks almost the same as in your photo, even after a second try. If it is already a similar stone,
                        that is expected; if not, try again, or use a photo where the surface is easier to see.
                    </p>
                )}
                {error && <p className="text-[12.5px] text-clay font-semibold">Couldn&apos;t finish: {error}</p>}
            </div>
        </>
    );
}
