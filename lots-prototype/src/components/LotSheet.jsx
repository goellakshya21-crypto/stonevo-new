import React, { useEffect, useState } from 'react';
import { costFor, inr, SPACES, suitsSpace, wholeIsCheaper } from '../lib/lots';
import { GROUPS, placeOf, roomsFor, whyNot } from '../lib/applications';
import { RENDER_SCENES, renderLot } from '../lib/renders';
import { Arrow, ChatIcon, Check, Chip, Close, DownloadButton, Heart, KeyIcon, Pin, VideoIcon } from './ui';
import BookmatchView from './BookmatchView';
import StoneVideo, { PlayIcon } from './StoneVideo';
import { fileNameFor } from '../lib/download';
import { RenderingNote } from './Busy';
import OwnRoom from './OwnRoom';
import { CameraIcon } from './RoomUpload';
import { BRAND } from '../lib/brand';
import { directFee, lotLine, whatsappLink } from '../lib/contact';

const BOX = 'relative aspect-[1408/736] md:aspect-auto md:flex-1 md:min-h-0 overflow-hidden';

export default function LotSheet({
    lot,
    initial,
    renders,
    onRendered,
    saved,
    onToggleSave,
    onCompare,
    onDesign,
    onContact,
    onDirect,
    ownPhoto,
    setOwnPhoto,
    onClose,
}) {
    const mine = renders[lot.id] || {};
    // Only rooms this lot can actually finish, with a stone that suits them.
    // Showing a 16 sq ft lot as a 48 sq ft feature wall, or an onyx staircase,
    // would be a picture of something we should not sell.
    const rooms = roomsFor(lot);
    // Open on the room the visitor came from, else the first room this lot has
    // a render for, else the first room it fits.
    const [sceneId, setSceneId] = useState(() =>
        initial?.sceneId && rooms.includes(initial.sceneId) ? initial.sceneId : rooms.find((id) => mine[id]) || rooms[0] || 'vanity',
    );
    const [view, setView] = useState(['own', 'bookmatch'].includes(initial?.view) ? initial.view : 'room'); // room | photo | bookmatch | own
    // The book-match layout (Book-match view). Once the buyer has seen it
    // (`chosen`), Your room renders exactly that layout instead of the surface's
    // usual count: what the view shows selected is what gets rendered. Opened
    // from Your room, the view starts at the count Your room is using.
    const [layout, setLayout] = useState({ count: 2, rotation: 0, originRow: 'top', chosen: initial?.view === 'bookmatch' });
    const [ownSurfaceId, setOwnSurfaceId] = useState(null); // Your room's surface, kept across views
    const openBookmatch = (inUse) => {
        setLayout((l) => (l.chosen ? l : { ...l, count: inUse || l.count, chosen: true }));
        setView('bookmatch');
    };
    const [reserving, setReserving] = useState(!!initial?.reserve);
    const [rendering, setRendering] = useState(null); // { started } while a render runs
    const [renderError, setRenderError] = useState('');
    const scene = RENDER_SCENES[sceneId];
    // How much stone the buyer needs, in their own words (decided 2026-11-15):
    // no fixed size per space. It prices the job and checks the lot is enough.
    const [want, setWant] = useState(() => (initial?.sqft ? String(initial.sqft) : ''));
    const need = Number(want) || 0;
    const roomUrl = mine[sceneId];

    const makeRender = async () => {
        setRendering({ started: Date.now() });
        setRenderError('');
        try {
            const url = await renderLot(lot, sceneId);
            onRendered(lot, sceneId, url);
        } catch (err) {
            setRenderError(err.message || String(err));
        } finally {
            setRendering(null);
        }
    };

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

    const switchScene = (id) => {
        if (rendering) return;
        setSceneId(id);
        setView('room');
        setRenderError('');
    };

    const facts = [
        ['Stone in this lot', `${lot.sqft} sq ft`],
        ['Pieces', lot.pieceSize ? `${lot.slabs}, about ${lot.pieceSize} (${lot.pieceSqft} sq ft) each` : `${lot.slabs}, about ${lot.pieceSqft} sq ft each`],
        ['Thickness', `${lot.thicknessMm} mm`],
        ['Finish', lot.finish],
        ['Colour', lot.colors.join(', ') || '—'],
        ['Ships from', `${lot.city.name}, ${lot.city.state}`],
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={lot.name}>
            <button className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] scene-fade" onClick={onClose} aria-label="Close" />
            <div className="relative sheet-in bg-paper w-full md:w-[min(1180px,94vw)] h-[94svh] md:h-[min(860px,90vh)] rounded-t-[26px] md:rounded-[26px] overflow-hidden shadow-float flex flex-col md:flex-row">
                {/* Visual: the lot rendered in a room by the live visualiser, or its slab photo */}
                <div className="md:flex-[1.35] shrink-0 bg-paper-2 md:flex md:flex-col md:min-h-0">
                    {view === 'own' ? (
                        <OwnRoom
                            lot={lot}
                            photo={ownPhoto}
                            setPhoto={setOwnPhoto}
                            boxClass={BOX}
                            layout={layout.chosen ? layout : null}
                            onChangeLayout={openBookmatch}
                            surfaceId={ownSurfaceId}
                            setSurfaceId={setOwnSurfaceId}
                            onMix={(surfaceId) => onDesign({ lotId: lot.id, surfaceId })}
                        />
                    ) : view === 'bookmatch' ? (
                        <div className={`${BOX} bg-ink`}>
                            <BookmatchView
                                lot={lot}
                                layout={layout}
                                setLayout={setLayout}
                                onUseInRoom={() => {
                                    setLayout((l) => ({ ...l, chosen: true }));
                                    setView('own');
                                }}
                            />
                        </div>
                    ) : view === 'video' && lot.video ? (
                        <div className={`${BOX} bg-ink`}>
                            <StoneVideo video={lot.video} className="absolute inset-0 w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div className={`${BOX} bg-paper-3`}>
                            {view === 'photo' ? (
                                <img src={lot.image} alt={`${lot.name} slab photo`} className="absolute inset-0 w-full h-full object-cover" />
                            ) : roomUrl ? (
                                <img
                                    key={roomUrl}
                                    src={roomUrl}
                                    alt={`${lot.name} on the ${scene.surface.toLowerCase()} of a ${placeOf(scene)}`}
                                    className="absolute inset-0 w-full h-full object-cover scene-fade"
                                />
                            ) : (
                                <div className="absolute inset-0">
                                    <img src={lot.image} alt="" className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-60" />
                                    <div className="absolute inset-0 grid place-items-center p-4 text-center">
                                        {rendering ? (
                                            <RenderingNote started={rendering.started} title={`Rendering the ${placeOf(scene)}…`} />
                                        ) : (
                                            <div className="rounded-2xl bg-paper/95 backdrop-blur px-5 py-4 shadow-card max-w-[340px]">
                                                <p className="font-bold text-[15px]">
                                                    See {lot.name} in a {placeOf(scene)}
                                                </p>
                                                <p className="mt-1 text-[12.5px] text-ink-2">
                                                    Visualised with this lot&apos;s own stone, by the same visualiser as the live site. About 15 seconds.
                                                </p>
                                                <button onClick={makeRender} className="mt-3 h-10 px-4 rounded-full bg-ink text-paper text-[13px] font-bold">
                                                    Show it in a real room
                                                </button>
                                                {renderError && <p className="mt-2 text-[12px] text-clay font-semibold">Couldn&apos;t render: {renderError}</p>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {view === 'room' && roomUrl && (
                                <span className="absolute left-3 bottom-3 rounded-full bg-white/85 backdrop-blur px-2.5 py-1 text-[11.5px] font-semibold text-ink-2">
                                    {scene.surface} · visualised with this lot&apos;s stone
                                </span>
                            )}
                            {(view === 'photo' || (view === 'room' && roomUrl)) && (
                                <div className="absolute left-3 top-3">
                                    <DownloadButton
                                        getSrc={() => (view === 'photo' ? lot.image : roomUrl)}
                                        name={
                                            view === 'photo'
                                                ? fileNameFor(lot.name, 'slab photo')
                                                : fileNameFor(lot.name, scene.surface, 'in a', placeOf(scene))
                                        }
                                        label={view === 'photo' ? 'Download the slab photo' : 'Download this room'}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <div className="p-4 md:p-5 space-y-3 shrink-0">
                        <div className="flex md:flex-wrap items-center gap-1.5 overflow-x-auto md:overflow-visible no-scrollbar">
                            <Chip
                                active={view === 'own'}
                                onClick={() => !rendering && setView('own')}
                                className={view === 'own' ? '' : '!border-clay/50 !text-clay'}
                            >
                                <CameraIcon /> Your room
                            </Chip>
                            <span className="w-px h-5 bg-ink/15 mx-0.5 shrink-0" aria-hidden="true" />
                            {rooms.map((id) => (
                                <Chip key={id} active={view === 'room' && sceneId === id} onClick={() => switchScene(id)}>
                                    {mine[id] && <span className="w-1.5 h-1.5 rounded-full bg-moss" aria-hidden="true" />}
                                    {RENDER_SCENES[id].label}
                                </Chip>
                            ))}
                            <Chip active={view === 'photo'} onClick={() => !rendering && setView('photo')}>
                                Slab photo
                            </Chip>
                            {lot.video && (
                                <Chip active={view === 'video'} onClick={() => !rendering && setView('video')}>
                                    <PlayIcon className="w-3.5 h-3.5" /> Video
                                </Chip>
                            )}
                            <Chip active={view === 'bookmatch'} onClick={() => !rendering && openBookmatch()}>
                                Book-match
                            </Chip>
                        </div>
                        <p className="hidden md:block text-[12px] text-ink-3 leading-relaxed">
                            {view === 'own'
                                ? 'Works with a phone photo or a designer’s 3D render. The stone comes from this lot’s slab photo; the rest of your picture stays as it is.'
                                : view === 'video'
                                  ? 'A few seconds of this lot, filmed at the yard: the real slabs in daylight.'
                                  : view === 'bookmatch'
                                    ? 'This lot’s slab photo laid as a book-match: each slab mirrored against its neighbours so the veining meets at every joint. Pick how many slabs, turn the slab, download it, or use the layout in your own room.'
                                    : `The slab photo is the actual lot. Each room is visualised from it, so the colour and veining follow the real stone; the room around it is illustrative. ${rooms.length} rooms suit this lot.`}
                        </p>
                    </div>
                </div>

                {/* Details */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6 md:p-8">
                        <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink-3">
                            {lot.family} <span className="opacity-40">·</span> <Pin className="w-3 h-3" /> {lot.city.name}, {lot.city.state}
                        </p>
                        <h2 className="mt-1 font-brand text-[40px] md:text-[46px] leading-[1.02]">{lot.name}</h2>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            <span className="rounded-md bg-clay-soft text-clay text-[12px] font-extrabold px-2 py-1">{lot.discountPct}% under market</span>
                            <span className="rounded-md bg-paper-2 text-ink-2 text-[12px] font-bold px-2 py-1">One lot only</span>
                            {lot.isNew && <span className="rounded-md bg-moss-soft text-moss text-[12px] font-bold px-2 py-1">Listed this week</span>}
                        </div>

                        {/* Whole lot and part of it are priced differently: part of a lot
                            costs more a square foot (lots.js, PART_PREMIUM). */}
                        <div className="mt-6 rounded-2xl bg-white/70 border border-ink/10 p-5">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-moss-soft/70 px-3.5 py-3">
                                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-moss">Whole lot</p>
                                    <p className="mt-1 flex items-baseline gap-1">
                                        <span className="text-[26px] font-extrabold tracking-tight leading-none">{inr(lot.price)}</span>
                                        <span className="text-ink-3 text-[13px]">/sq ft</span>
                                    </p>
                                    <p className="mt-1 text-[12.5px] text-ink-2">
                                        {lot.sqft} sq ft for <b className="tabular-nums">{inr(lot.lotTotal)}</b> · {lot.discountPct}% under market
                                    </p>
                                </div>
                                <div className="rounded-xl bg-paper-2/80 px-3.5 py-3">
                                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-3">Part of it</p>
                                    <p className="mt-1 flex items-baseline gap-1">
                                        <span className="text-[26px] font-extrabold tracking-tight leading-none">{inr(lot.partRate)}</span>
                                        <span className="text-ink-3 text-[13px]">/sq ft</span>
                                    </p>
                                    <p className="mt-1 text-[12.5px] text-ink-2">Only what you need · {lot.partDiscountPct}% under market</p>
                                </div>
                            </div>
                            <dl className="mt-4 space-y-1.5 text-[14px]">
                                <div className="flex items-center justify-between gap-4">
                                    <dt className="text-ink-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span>You need</span>
                                        <span className="inline-flex items-center gap-1 h-9 rounded-lg border border-ink/15 bg-white px-2 focus-within:border-ink">
                                            <input
                                                inputMode="numeric"
                                                value={want}
                                                onChange={(e) => setWant(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                placeholder="–"
                                                className="w-12 bg-transparent outline-none text-center font-bold tabular-nums text-ink"
                                                aria-label="How many sq ft you need"
                                            />
                                            <span className="text-[13px] text-ink-3">sq ft</span>
                                        </span>
                                        {need > 0 && need === lot.sqft && <span className="text-moss font-semibold">the whole lot</span>}
                                        {need > 0 && need < lot.sqft && wholeIsCheaper(lot, need) && (
                                            <span className="text-moss font-semibold">the whole lot is cheaper</span>
                                        )}
                                    </dt>
                                    <dd className="font-bold tabular-nums text-right">
                                        {need ? (
                                            inr(costFor(lot, Math.min(need, lot.sqft)))
                                        ) : (
                                            <span className="text-[12.5px] font-semibold text-ink-3">Type it for your price</span>
                                        )}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt className="text-ink-2">Market price</dt>
                                    <dd className="text-ink-3 line-through tabular-nums">{inr(lot.marketPrice)}/sq ft</dd>
                                </div>
                                <div className="flex justify-between gap-4 text-moss">
                                    <dt>You save on the whole lot</dt>
                                    <dd className="font-bold tabular-nums">{inr(lot.sqft * (lot.marketPrice - lot.price))}</dd>
                                </div>
                            </dl>
                            {need > lot.sqft && (
                                <p className="mt-3 rounded-lg bg-clay-soft text-clay text-[12.5px] font-semibold px-3 py-2">
                                    This lot has {lot.sqft} sq ft, less than your {need}. The price above is the whole lot; pair it with a second lot for the
                                    rest.
                                </p>
                            )}
                        </div>

                        <div className="mt-5 flex gap-2">
                            <button
                                onClick={() => setReserving(true)}
                                className="flex-1 h-12 rounded-full bg-ink text-paper font-bold text-[15px] hover:bg-ink/90 transition-colors"
                            >
                                Reserve this lot
                            </button>
                            <button
                                onClick={() => onToggleSave(lot.id)}
                                aria-pressed={saved}
                                aria-label={saved ? 'Remove from saved' : 'Save lot'}
                                className="w-12 h-12 rounded-full border border-ink/15 grid place-items-center hover:border-ink/50"
                            >
                                <Heart filled={saved} />
                            </button>
                        </div>
                        <p className="mt-2 text-[12px] text-ink-3 text-center">Free 48-hour hold. No payment to reserve.</p>
                        <button
                            onClick={() => onCompare(lot, { ownRoom: view === 'own' })}
                            className="mt-3 w-full h-11 rounded-full border border-ink/20 font-bold text-[14px] inline-flex items-center justify-center gap-2 hover:border-ink"
                        >
                            {view === 'own' && ownPhoto ? 'Compare with another lot in your room' : 'Compare with another lot'} <Arrow />
                        </button>

                        <div className="mt-3 rounded-2xl bg-paper-2 px-3.5 py-3 flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-semibold text-ink-2 flex-1 min-w-[150px]">Questions about this lot?</span>
                            <a
                                href={whatsappLink(`Hi ${BRAND.name}, I have a question about ${lotLine(lot)}.`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-9 px-3.5 rounded-full bg-moss text-paper text-[12.5px] font-bold inline-flex items-center gap-1.5 hover:bg-moss/90"
                            >
                                <ChatIcon className="w-3.5 h-3.5" /> WhatsApp us
                            </a>
                            <button
                                type="button"
                                onClick={() => onContact('video')}
                                className="h-9 px-3.5 rounded-full border border-ink/20 bg-white/70 text-[12.5px] font-bold inline-flex items-center gap-1.5 hover:border-ink"
                            >
                                <VideoIcon className="w-3.5 h-3.5" /> See it on video
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => onDirect(lot)}
                            className="mt-2 w-full text-left rounded-2xl border border-ink/10 px-3.5 py-3 flex items-center gap-3 hover:border-ink/40"
                        >
                            <KeyIcon className="w-5 h-5 text-ink-2 shrink-0" />
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13.5px] font-bold">Buy direct from the yard</span>
                                <span className="block text-[12px] text-ink-3">Get the yard&apos;s details for a one-time {inr(directFee(lot))}</span>
                            </span>
                            <Arrow className="w-4 h-4 text-ink-3 shrink-0" />
                        </button>

                        {reserving && <ReserveForm lot={lot} group={scene.group} need={need} onDone={() => setReserving(false)} />}

                        <h3 className="mt-8 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">About this lot</h3>
                        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
                            {facts.map(([k, v]) => (
                                <div key={k}>
                                    <dt className="text-[12px] text-ink-3 font-semibold">{k}</dt>
                                    <dd className="text-[14.5px] font-bold">{v}</dd>
                                </div>
                            ))}
                        </dl>

                        <h3 className="mt-8 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">What this lot can do</h3>
                        <p className="mt-1 text-[12.5px] text-ink-3">
                            {need
                                ? `For your ${need} sq ft: this lot has ${lot.sqft}.`
                                : `Where this stone may go. Type how much you need above to check this lot's ${lot.sqft} sq ft is enough.`}
                        </p>
                        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {SPACES.map((s) => {
                                const suits = suitsSpace(lot, s);
                                const enough = !need || lot.sqft >= need;
                                const ok = suits && enough;
                                const why = !suits ? whyNot(lot.family, s.room) : !enough ? `only ${lot.sqft} sq ft` : '';
                                const canShow = ok && rooms.includes(s.room);
                                return (
                                    <li key={s.id}>
                                        <button
                                            type="button"
                                            disabled={!canShow}
                                            onClick={() => switchScene(s.room)}
                                            className={`w-full text-left flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] ${
                                                ok ? 'bg-moss-soft/70 hover:bg-moss-soft' : 'bg-paper-2 text-ink-3'
                                            }`}
                                        >
                                            <span
                                                className={`w-5 h-5 rounded-full grid place-items-center shrink-0 ${ok ? 'bg-moss text-paper' : 'bg-ink/10'}`}
                                            >
                                                {ok ? <Check className="w-3 h-3" /> : <span className="text-[10px]">–</span>}
                                            </span>
                                            <span className="font-semibold">{s.label}</span>
                                            {why && <span className="ml-auto text-[12px] opacity-70 tabular-nums text-right">{why}</span>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="mt-8 rounded-2xl border border-ink/10 p-5 text-[13.5px] text-ink-2 space-y-2.5">
                            <p>
                                <b className="text-ink">You buy from {BRAND.name}.</b> We measure and photograph every lot, check it before dispatch, and
                                arrange pickup and delivery. You get a delivery quote before you pay.
                            </p>
                            <p className="text-ink-3 text-[12.5px]">
                                Natural stone varies slab to slab. The slab photo is the actual lot; the room is a preview.
                            </p>
                        </div>
                    </div>
                </div>

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

// Prototype form: collects nothing and sends nothing. In production this is
// where the phone OTP (the existing LeadGate flow) and the 48-hour hold happen.
function ReserveForm({ lot, group, need, onDone }) {
    const [done, setDone] = useState(false);
    const [useFor, setUseFor] = useState(group);
    if (done) {
        return (
            <div className="mt-5 rounded-2xl bg-moss-soft p-5 fade-up">
                <p className="font-bold text-moss">Hold requested (demo)</p>
                <p className="mt-1 text-[13.5px] text-ink-2">
                    In the live version this verifies the phone number by OTP, holds {lot.name} for 48 hours so no one else can buy it, and our team calls with
                    a delivery quote. Nothing was sent from this prototype.
                </p>
                <button onClick={onDone} className="mt-3 text-[13px] font-bold underline underline-offset-4">
                    Close
                </button>
            </div>
        );
    }
    return (
        <form
            className="mt-5 rounded-2xl bg-white/70 border border-ink/10 p-5 space-y-3 fade-up"
            onSubmit={(e) => {
                e.preventDefault();
                setDone(true);
            }}
        >
            <div className="flex items-center justify-between">
                <p className="font-bold">Hold {lot.name} for 48 hours</p>
                <span className="text-[11px] font-bold uppercase tracking-wider text-clay">Demo · nothing is sent</span>
            </div>
            <label className="block">
                <span className="text-[12px] font-semibold text-ink-3">Your name</span>
                <input required className="mt-1 w-full h-11 rounded-xl border border-ink/15 bg-white px-3 text-[14px] outline-none focus:border-ink" />
            </label>
            <div className="grid grid-cols-[1fr_120px] gap-2">
                <label className="block">
                    <span className="text-[12px] font-semibold text-ink-3">Mobile number</span>
                    <div className="mt-1 flex h-11 rounded-xl border border-ink/15 bg-white focus-within:border-ink">
                        <span className="px-3 grid place-items-center text-[14px] text-ink-3 border-r border-ink/10">+91</span>
                        <input
                            required
                            inputMode="numeric"
                            pattern="[0-9]{10}"
                            maxLength={10}
                            className="flex-1 min-w-0 px-3 text-[14px] outline-none bg-transparent"
                        />
                    </div>
                </label>
                <label className="block">
                    <span className="text-[12px] font-semibold text-ink-3">Pincode</span>
                    <input
                        required
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        className="mt-1 w-full h-11 rounded-xl border border-ink/15 bg-white px-3 text-[14px] outline-none focus:border-ink"
                    />
                </label>
            </div>
            <div>
                <span className="text-[12px] font-semibold text-ink-3">It's for</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {[...GROUPS, 'Something else'].map((u) => (
                        <Chip key={u} active={useFor === u} onClick={() => setUseFor(u)}>
                            {u}
                        </Chip>
                    ))}
                </div>
            </div>
            <button className="w-full h-11 rounded-full bg-ink text-paper font-bold text-[14px]">Hold this lot{need ? ` · ${need} sq ft planned` : ''}</button>
        </form>
    );
}
