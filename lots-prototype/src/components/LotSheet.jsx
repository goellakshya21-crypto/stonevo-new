import React, { useEffect, useState } from 'react';
import { inr, jobFor, jobLabel } from '../lib/lots';
import { placeOf, roomsFor } from '../lib/applications';
import { RENDER_SCENES } from '../lib/renders';
import { Arrow, ChatIcon, Check, Chip, Close, DownloadButton, Heart, Pin } from './ui';
import BookmatchView from './BookmatchView';
import StoneVideo, { PlayIcon } from './StoneVideo';
import { fileNameFor } from '../lib/download';
import OwnRoom from './OwnRoom';
import { CameraIcon } from './RoomUpload';
import { BRAND } from '../lib/brand';
import { lotLine, whatsappLink } from '../lib/contact';
import { ADVANCE_PCT, advanceFor, creditsLeft, lineFor, useCredits } from '../lib/commerce';

// The big picture area: the gallery's main picture, and the Your room,
// Book-match and Video tools when one is open.
const BIG = 'relative overflow-hidden rounded-[18px] aspect-[4/3] md:aspect-auto md:h-[min(60vh,560px)]';

/**
 * One lot (redesigned 2026-11-17, after James Edition's listing pages): a big
 * gallery on top (the stone in our rooms, then the slab photo and the yard's
 * own photos; click any for the full-screen viewer), the tools beside it (Your
 * room, Book-match, Video), and the details and the price below the pictures.
 *
 * Only ready-made pictures here: new pictures are made only of the buyer's own
 * room, for credits (Your room). The price is for whole slabs: the buyer's sq
 * ft rounds up. "Reserve" takes a 2% advance and gives the yard's details to
 * visit (BookingSheet); "Add to cart" books several lots at once.
 */
export default function LotSheet({
    lot,
    initial,
    renders,
    saved,
    onToggleSave,
    onCompare,
    onDesign,
    ownPhoto,
    setOwnPhoto,
    onReserve,
    onAddToCart,
    inCart,
    booked,
    onNeedCredits,
    onClose,
}) {
    const mine = renders[lot.id] || {};
    const credits = useCredits();
    // Ready-made rooms this lot can do, the one the buyer came from first.
    const rooms = roomsFor(lot).filter((id) => mine[id]);
    const first = initial?.sceneId && rooms.includes(initial.sceneId) ? initial.sceneId : null;
    const ordered = first ? [first, ...rooms.filter((id) => id !== first)] : rooms;
    const pics = [
        ...ordered.map((id) => ({
            src: mine[id],
            label: RENDER_SCENES[id].label,
            file: [RENDER_SCENES[id].surface, 'in a', placeOf(RENDER_SCENES[id])],
        })),
        { src: lot.image, label: 'Slab photo: the actual lot', file: ['slab photo'] },
        ...(lot.photos || []).slice(1).map((src, i) => ({ src, label: `Yard photo ${i + 2}`, file: [`yard photo ${i + 2}`] })),
    ];

    const [view, setView] = useState(['own', 'bookmatch', 'video'].includes(initial?.view) ? initial.view : 'photos'); // photos | own | bookmatch | video
    const [viewer, setViewer] = useState(null); // index of the picture open full screen
    // The book-match layout. Once the buyer has seen it (`chosen`), Your room
    // renders exactly that layout instead of the surface's usual count.
    const [layout, setLayout] = useState({ count: 2, rotation: 0, originRow: 'top', chosen: initial?.view === 'bookmatch' });
    const [ownSurfaceId, setOwnSurfaceId] = useState(null);
    const openBookmatch = (inUse) => {
        setLayout((l) => (l.chosen ? l : { ...l, count: inUse || l.count, chosen: true }));
        setView('bookmatch');
    };

    // How much stone the buyer needs; it rounds up to whole slabs.
    const [want, setWant] = useState(() => (initial?.sqft ? String(initial.sqft) : ''));
    const need = Number(want) || 0;
    const line = lineFor(lot, need || null);
    const job = need ? jobFor(lot, need) : null;

    useEffect(() => {
        const onKey = (e) => {
            if (viewer != null) {
                if (e.key === 'Escape') setViewer(null);
                if (e.key === 'ArrowRight') setViewer((i) => (i + 1) % pics.length);
                if (e.key === 'ArrowLeft') setViewer((i) => (i - 1 + pics.length) % pics.length);
                return;
            }
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose, viewer, pics.length]);

    const facts = [
        ['Stone in this lot', `${lot.sqft} sq ft`],
        ['Slabs', lot.pieceSize ? `${lot.slabs}, about ${lot.pieceSize} (${lot.pieceSqft} sq ft) each` : `${lot.slabs}, about ${lot.pieceSqft} sq ft each`],
        ['Thickness', `${lot.thicknessMm} mm`],
        ['Finish', lot.finish],
        ['Colour', lot.colors.join(', ') || '—'],
        ...(lot.origin ? [['Origin', lot.origin]] : []),
        ...(lot.filling ? [['Filling', lot.filling]] : []),
        ['Ships from', `${lot.city.name}, ${lot.city.state}`],
    ];
    const side = pics.slice(1, 5);

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={lot.name}>
            <button className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] scene-fade" onClick={onClose} aria-label="Close" />
            <div className="relative sheet-in bg-paper w-full md:w-[min(1180px,94vw)] max-h-[94svh] md:max-h-[92vh] rounded-t-[26px] md:rounded-[26px] overflow-y-auto shadow-float">
                {/* Pictures */}
                <div className="p-3 md:p-4">
                    {view === 'own' ? (
                        <div className="rounded-[18px] overflow-hidden bg-paper-2">
                            <OwnRoom
                                lot={lot}
                                photo={ownPhoto}
                                setPhoto={setOwnPhoto}
                                boxClass={BIG}
                                layout={layout.chosen ? layout : null}
                                onChangeLayout={openBookmatch}
                                surfaceId={ownSurfaceId}
                                setSurfaceId={setOwnSurfaceId}
                                onMix={(surfaceId) => onDesign({ lotId: lot.id, surfaceId })}
                                onNeedCredits={onNeedCredits}
                            />
                            <div className="h-4" />
                        </div>
                    ) : view === 'bookmatch' ? (
                        <div className={`${BIG} bg-ink`}>
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
                        <div className={`${BIG} bg-ink`}>
                            <StoneVideo video={lot.video} className="absolute inset-0 w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2 md:h-[min(60vh,560px)]">
                            <button
                                type="button"
                                onClick={() => setViewer(0)}
                                className="relative overflow-hidden rounded-[18px] md:rounded-r-md bg-paper-3 aspect-[4/3] md:aspect-auto group"
                                aria-label={`Open ${pics[0].label} full screen`}
                            >
                                <img
                                    src={pics[0].src}
                                    alt={`${lot.name}: ${pics[0].label}`}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                                />
                                <span className="absolute left-3 bottom-3 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[11.5px] font-semibold text-ink-2">
                                    {pics[0].label}
                                </span>
                            </button>
                            <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-2">
                                {[0, 1, 2, 3].map((k) => {
                                    const p = side.at(k);
                                    if (p) {
                                        const idx = k + 1;
                                        const more = k === 3 && pics.length > 5 ? pics.length - 5 : 0;
                                        return (
                                            <button
                                                key={p.src}
                                                type="button"
                                                onClick={() => setViewer(idx)}
                                                className={`relative overflow-hidden bg-paper-3 group ${k === 1 ? 'rounded-tr-[18px]' : ''} ${k === 3 ? 'rounded-br-[18px]' : ''} rounded-md`}
                                                aria-label={`Open ${p.label} full screen`}
                                            >
                                                <img
                                                    src={p.src}
                                                    alt=""
                                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                                                />
                                                {more > 0 && (
                                                    <span className="absolute inset-0 bg-ink/45 grid place-items-center text-paper font-bold text-[15px]">
                                                        +{more} more
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    }
                                    // Fewer pictures than tiles: the tools fill the rest.
                                    const tool = [
                                        { id: 'own', label: 'Try it in your room', icon: <CameraIcon className="w-5 h-5" />, go: () => setView('own') },
                                        {
                                            id: 'bookmatch',
                                            label: 'See it book-matched',
                                            icon: <span className="text-[18px]">⧉</span>,
                                            go: () => openBookmatch(),
                                        },
                                        ...(lot.video
                                            ? [{ id: 'video', label: 'Watch the video', icon: <PlayIcon className="w-5 h-5" />, go: () => setView('video') }]
                                            : []),
                                    ].at(k - side.length);
                                    if (!tool) return <span key={`empty-${k}`} className="rounded-md bg-paper-2" />;
                                    return (
                                        <button
                                            key={tool.id}
                                            type="button"
                                            onClick={tool.go}
                                            className={`relative overflow-hidden rounded-md bg-paper-2 hover:bg-paper-3 grid place-items-center text-center p-3 ${k === 1 ? 'rounded-tr-[18px]' : ''} ${k === 3 ? 'rounded-br-[18px]' : ''}`}
                                        >
                                            <span>
                                                <span className="mx-auto w-10 h-10 rounded-full bg-white grid place-items-center text-ink-2">{tool.icon}</span>
                                                <span className="mt-2 block text-[13px] font-bold">{tool.label}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Phones: the other pictures in a strip under the main one. */}
                            {pics.length > 1 && (
                                <div className="md:hidden flex gap-2 overflow-x-auto no-scrollbar">
                                    {pics.slice(1).map((p, i) => (
                                        <button
                                            key={p.src}
                                            type="button"
                                            onClick={() => setViewer(i + 1)}
                                            className="shrink-0 w-24 h-20 rounded-lg overflow-hidden bg-paper-3"
                                        >
                                            <img src={p.src} alt={p.label} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <Chip active={view === 'photos'} onClick={() => setView('photos')}>
                            Photos ({pics.length})
                        </Chip>
                        <Chip active={view === 'own'} onClick={() => setView('own')} className={view === 'own' ? '' : '!border-clay/50 !text-clay'}>
                            <CameraIcon /> Your room
                            <span className={`text-[11px] font-semibold ${view === 'own' ? 'text-paper/70' : 'text-clay/70'}`}>
                                · {creditsLeft(credits)} {creditsLeft(credits) === 1 ? 'credit' : 'credits'}
                            </span>
                        </Chip>
                        <Chip active={view === 'bookmatch'} onClick={() => openBookmatch()}>
                            Book-match
                        </Chip>
                        {lot.video && (
                            <Chip active={view === 'video'} onClick={() => setView('video')}>
                                <PlayIcon className="w-3.5 h-3.5" /> Video
                            </Chip>
                        )}
                        <span className="ml-auto hidden md:inline text-[12px] text-ink-3">
                            {view === 'photos'
                                ? rooms.length
                                    ? `${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'} with this lot's stone, then the slab photo. Click any to see it large.`
                                    : 'The slab photo is the actual lot. Try it in your own room for a picture of it in place.'
                                : view === 'own'
                                  ? 'Each new picture of your room takes a credit. Refundable if you buy over 50 sq ft.'
                                  : view === 'bookmatch'
                                    ? 'Slabs mirrored so the veining meets at every joint.'
                                    : 'A few seconds of this lot, filmed at the yard.'}
                        </span>
                    </div>
                </div>

                {/* Details, with the price below the pictures */}
                <div className="px-5 md:px-8 pb-8 pt-2 grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6 md:gap-10 items-start">
                    <div>
                        <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink-3">
                            {lot.family} <span className="opacity-40">·</span> <Pin className="w-3 h-3" /> {lot.city.name}, {lot.city.state}
                        </p>
                        <h2 className="mt-1 font-brand text-[40px] md:text-[50px] leading-[1.02]">{lot.name}</h2>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            <span className="rounded-md bg-clay-soft text-clay text-[12px] font-extrabold px-2 py-1">{lot.discountPct}% under market</span>
                            <span className="rounded-md bg-paper-2 text-ink-2 text-[12px] font-bold px-2 py-1">One lot only</span>
                            {lot.isNew && <span className="rounded-md bg-moss-soft text-moss text-[12px] font-bold px-2 py-1">Listed this week</span>}
                            {booked && <span className="rounded-md bg-ink text-paper text-[12px] font-bold px-2 py-1">Booked: a buyer is visiting</span>}
                        </div>

                        <h3 className="mt-8 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">About this lot</h3>
                        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
                            {facts.map(([k, v]) => (
                                <div key={k}>
                                    <dt className="text-[12px] text-ink-3 font-semibold">{k}</dt>
                                    <dd className="text-[14.5px] font-bold">{v}</dd>
                                </div>
                            ))}
                        </dl>

                        <div className="mt-8 rounded-2xl border border-ink/10 p-5 text-[13.5px] text-ink-2 space-y-2.5">
                            <p>
                                <b className="text-ink">You buy from {BRAND.name}.</b> Reserve with a {ADVANCE_PCT}% advance and we send you the yard&apos;s
                                address to see the slabs. The advance counts toward what you buy, and is refunded in full if you buy nothing.
                            </p>
                            <p className="text-ink-3 text-[12.5px]">
                                Natural stone varies slab to slab. The slab photo is the actual lot; the rooms are previews.
                            </p>
                        </div>
                    </div>

                    <div className="md:sticky md:top-4 space-y-3">
                        <div className="rounded-2xl bg-white/80 border border-ink/10 p-5">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-moss-soft/70 px-3.5 py-3">
                                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-moss">Whole lot</p>
                                    <p className="mt-1 flex items-baseline gap-1">
                                        <span className="text-[24px] font-extrabold tracking-tight leading-none">{inr(lot.price)}</span>
                                        <span className="text-ink-3 text-[13px]">/sq ft</span>
                                    </p>
                                    <p className="mt-1 text-[12.5px] text-ink-2 tabular-nums">
                                        {lot.sqft} sq ft for <b>{inr(lot.lotTotal)}</b>
                                    </p>
                                </div>
                                <div className="rounded-xl bg-paper-2/80 px-3.5 py-3">
                                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-3">By the slab</p>
                                    <p className="mt-1 flex items-baseline gap-1">
                                        <span className="text-[24px] font-extrabold tracking-tight leading-none">{inr(lot.partRate)}</span>
                                        <span className="text-ink-3 text-[13px]">/sq ft</span>
                                    </p>
                                    <p className="mt-1 text-[12.5px] text-ink-2">Whole slabs only · {lot.partDiscountPct}% under market</p>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3 text-[14px]">
                                <span className="text-ink-2 flex flex-wrap items-center gap-2">
                                    You need
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
                                </span>
                                <span className="text-right">
                                    <b className="block tabular-nums text-[16px]">{inr(line.cost)}</b>
                                    <span className="block text-[12px] text-ink-3">{jobLabel(line)}</span>
                                </span>
                            </div>
                            <p className="mt-1 text-[12px] text-ink-3">
                                {job
                                    ? job.short
                                        ? `This lot has ${lot.sqft} sq ft, less than your ${need}: this is the whole lot.`
                                        : job.whole
                                          ? `${need} sq ft rounds up to the whole lot, which is the better price.`
                                          : `${need} sq ft rounds up to ${job.slabs} whole ${job.slabs === 1 ? 'slab' : 'slabs'} (${job.sqft} sq ft).`
                                    : 'Sold by the whole slab. Type your sq ft to see how many slabs and the price.'}
                            </p>
                            <div className="mt-3 flex justify-between text-[13px]">
                                <span className="text-ink-3">Market price</span>
                                <span className="text-ink-3 line-through tabular-nums">{inr(lot.marketPrice)}/sq ft</span>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={() => onReserve(line)}
                                    disabled={booked}
                                    className="flex-1 h-12 rounded-full bg-ink text-paper font-bold text-[14.5px] hover:bg-ink/90 disabled:opacity-40"
                                >
                                    {booked ? 'Booked: a visit is due' : `Reserve · ${inr(advanceFor(line.cost))} advance`}
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
                            <button
                                onClick={() => onAddToCart(lot.id, need || null)}
                                disabled={booked}
                                className="mt-2 w-full h-11 rounded-full border border-ink/20 font-bold text-[14px] inline-flex items-center justify-center gap-2 hover:border-ink disabled:opacity-40"
                            >
                                {inCart ? (
                                    <>
                                        <Check className="w-4 h-4" /> In your cart · update
                                    </>
                                ) : (
                                    'Add to cart'
                                )}
                            </button>
                            <p className="mt-2 text-[12px] text-ink-3 text-center">
                                {ADVANCE_PCT}% advance, counted toward what you buy · refunded in full if you buy nothing
                            </p>
                        </div>

                        <button
                            onClick={() => onCompare(lot, { ownRoom: view === 'own' })}
                            className="w-full h-11 rounded-full border border-ink/20 font-bold text-[14px] inline-flex items-center justify-center gap-2 hover:border-ink"
                        >
                            {view === 'own' && ownPhoto ? 'Compare with another lot in your room' : 'Compare with another lot'} <Arrow />
                        </button>
                        <div className="rounded-2xl bg-paper-2 px-3.5 py-3 flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-semibold text-ink-2 flex-1 min-w-[150px]">Questions about this lot?</span>
                            <a
                                href={whatsappLink(`Hi ${BRAND.name}, I have a question about ${lotLine(lot)}.`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-9 px-3.5 rounded-full bg-moss text-paper text-[12.5px] font-bold inline-flex items-center gap-1.5 hover:bg-moss/90"
                            >
                                <ChatIcon className="w-3.5 h-3.5" /> WhatsApp us
                            </a>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-5 right-5 md:top-6 md:right-6 w-10 h-10 rounded-full bg-white/90 backdrop-blur grid place-items-center shadow-sm hover:bg-white z-10"
                >
                    <Close />
                </button>
            </div>

            {viewer != null && (
                <div className="fixed inset-0 z-[60] bg-ink/95 flex flex-col" role="dialog" aria-modal="true" aria-label={`${lot.name} pictures`}>
                    <div className="flex items-center gap-3 px-4 md:px-6 h-14 text-paper shrink-0">
                        <span className="text-[13px] font-semibold tabular-nums">
                            {viewer + 1} / {pics.length}
                        </span>
                        <span className="text-[13px] text-paper/70 truncate flex-1">{pics.at(viewer).label}</span>
                        <DownloadButton
                            getSrc={() => pics.at(viewer).src}
                            name={fileNameFor(lot.name, ...pics.at(viewer).file)}
                            label="Download this picture"
                        />
                        <button
                            onClick={() => setViewer(null)}
                            aria-label="Close the pictures"
                            className="w-10 h-10 rounded-full bg-white/10 grid place-items-center hover:bg-white/20"
                        >
                            <Close />
                        </button>
                    </div>
                    <div className="relative flex-1 min-h-0">
                        <img
                            key={pics.at(viewer).src}
                            src={pics.at(viewer).src}
                            alt={pics.at(viewer).label}
                            className="absolute inset-0 w-full h-full object-contain scene-fade"
                        />
                        {pics.length > 1 && (
                            <>
                                <button
                                    onClick={() => setViewer((i) => (i - 1 + pics.length) % pics.length)}
                                    aria-label="Previous picture"
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 grid place-items-center"
                                >
                                    <Arrow dir="left" />
                                </button>
                                <button
                                    onClick={() => setViewer((i) => (i + 1) % pics.length)}
                                    aria-label="Next picture"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 grid place-items-center"
                                >
                                    <Arrow />
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2 justify-center px-4 py-3 overflow-x-auto no-scrollbar shrink-0">
                        {pics.map((p, i) => (
                            <button
                                key={p.src}
                                onClick={() => setViewer(i)}
                                aria-label={p.label}
                                className={`shrink-0 w-20 h-14 rounded-md overflow-hidden border-2 ${i === viewer ? 'border-paper' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <img src={p.src} alt="" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
