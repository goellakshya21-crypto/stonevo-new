import React, { useEffect, useMemo, useState } from 'react';
import { CITIES, inchSize, inr, partRateOf, pieceInches } from '../lib/lots';
import { marginLabel, yardOf } from '../lib/vendor';
import { ChatIcon, Check, Chip, Close, PhoneIcon, Pin } from './ui';
import StoneVideo from './StoneVideo';

// The team panel's yard views (ReviewQueue, #/review): every yard with all its
// details, every lot yards have sent, and one lot opened with the yard it is
// from. Team only: buyers never see any of this (they see the city).

/** A listing's state, as our team says it. */
const TEAM_STATUS = {
    review: { label: 'Waiting for review', chip: 'bg-paper-2 text-ink-2' },
    changes: { label: 'Sent back to fix', chip: 'bg-clay-soft text-clay' },
    live: { label: 'Live', chip: 'bg-moss-soft text-moss' },
    sold: { label: 'Sold', chip: 'bg-ink/10 text-ink' },
    withdrawn: { label: 'Withdrawn by the yard', chip: 'bg-paper-2 text-ink-3' },
    cancelled: { label: 'Cancelled', chip: 'bg-clay-soft text-clay' },
};

const date = (t) => (t ? new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const StatusChip = ({ status }) => {
    const st = TEAM_STATUS[status] || TEAM_STATUS.review;
    return <span className={`rounded-md text-[11px] font-extrabold uppercase tracking-[0.08em] px-1.5 py-0.5 whitespace-nowrap ${st.chip}`}>{st.label}</span>;
};

const YardState = ({ y }) =>
    y.status === 'verified' ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-moss-soft text-moss text-[11.5px] font-bold px-2 py-0.5">
            <Check className="w-3 h-3" /> Verified{y.verifiedAt ? ` ${date(y.verifiedAt)}` : ''}
        </span>
    ) : y.status === 'checking' ? (
        <span className="rounded-full bg-paper-2 text-ink-2 text-[11.5px] font-bold px-2 py-0.5">Being checked</span>
    ) : (
        <span className="rounded-full bg-clay-soft text-clay text-[11.5px] font-bold px-2 py-0.5">Signed up, no details yet</span>
    );

/** Ways to reach the yard: a call, or WhatsApp. */
function Reach({ phone, compact = false }) {
    const cls = `inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white/80 font-bold hover:border-ink ${compact ? 'h-8 px-2.5 text-[12px]' : 'h-9 px-3 text-[12.5px]'}`;
    return (
        <span className="inline-flex flex-wrap gap-1.5">
            <a href={`tel:+91${phone}`} className={cls}>
                <PhoneIcon className="w-3.5 h-3.5" /> Call
            </a>
            <a href={`https://wa.me/91${phone}`} target="_blank" rel="noreferrer" className={cls}>
                <ChatIcon className="w-3.5 h-3.5" /> WhatsApp
            </a>
        </span>
    );
}

/** All we know about a yard, as label / value rows. */
function YardFacts({ y }) {
    const city = CITIES[y.cityKey];
    const rows = [
        ['Contact person', y.contact || '–'],
        ['Mobile', <span className="tabular-nums">+91 {y.phone}</span>],
        ['City', city ? `${city.name}, ${city.state}` : '–'],
        ['Address', y.address || '–'],
        [
            'GSTIN',
            y.gstin ? (
                <span className="tabular-nums">
                    {y.gstin}{' '}
                    <span className={y.gstinOk ? 'text-moss' : 'text-clay'}>{y.gstinOk ? '· matched to the GST register' : '· to confirm on our call'}</span>
                </span>
            ) : (
                <span className="text-clay">Not given yet (ask on our call)</span>
            ),
        ],
        ['Buy direct', y.directOk ? 'Yes: buyers can pay a fee for its details' : 'No: buyers only buy through us'],
        ['Joined', y.joinedAt ? date(y.joinedAt) : '–'],
    ];
    return (
        <dl className="grid grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
            {rows.map(([k, v]) => (
                <React.Fragment key={k}>
                    <dt className="text-ink-3">{k}</dt>
                    <dd className="font-semibold min-w-0 break-words">{v}</dd>
                </React.Fragment>
            ))}
        </dl>
    );
}

/** A lot in a list: photo, name, size, price and state. Opens the lot. */
function LotRow({ l, yardName, onOpen }) {
    const site = l.listPrice || null;
    return (
        <li>
            <button type="button" onClick={() => onOpen(l.id)} className="w-full text-left px-3.5 py-3 flex items-center gap-3 hover:bg-paper-2/60 rounded-xl">
                <img src={l.photos[0]} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                <span className="min-w-0 flex-1">
                    <span className="block font-bold text-[14px] truncate">
                        {l.name}
                        {yardName && <span className="font-normal text-ink-3"> · {yardName}</span>}
                    </span>
                    <span className="block text-[12.5px] text-ink-3 truncate tabular-nums">
                        {l.family} · {l.sqft} sq ft · {CITIES[l.cityKey]?.name} · yard {inr(l.yardPrice)}
                        {site ? ` · site ${inr(site)}` : ''}/sq ft
                    </span>
                </span>
                <StatusChip status={l.status} />
            </button>
        </li>
    );
}

/** Every yard that has signed up, with all its details and its lots. */
export function YardsTab({ yards, listings, openPhone, setOpenPhone, onOpenLot }) {
    const [q, setQ] = useState('');
    const list = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return Object.values(yards)
            .map((a) => ({ ...yardOf({ phone: a.phone, yard: {} }, yards), lots: listings.filter((l) => l.phone === a.phone) }))
            .filter((y) => !needle || [y.yardName, y.contact, y.phone, y.gstin, y.address, CITIES[y.cityKey]?.name].join(' ').toLowerCase().includes(needle))
            .sort((a, b) => (a.yardName || '~').localeCompare(b.yardName || '~'));
    }, [yards, listings, q]);

    return (
        <div>
            <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a yard, person, mobile, GSTIN or city"
                className="w-full md:w-[420px] h-11 rounded-full border border-ink/15 bg-white/80 px-4 text-[14px] outline-none focus:border-ink"
                aria-label="Search yards"
            />
            <div className="mt-4 space-y-3">
                {list.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-ink/15 px-5 py-10 text-center">
                        <p className="font-bold text-[16px]">{q ? 'No yard matches that' : 'No yards yet'}</p>
                        <p className="mt-1 text-[14px] text-ink-2">Yards that sign up in the yard portal appear here, with everything they told us.</p>
                    </div>
                )}
                {list.map((y) => (
                    <YardCard
                        key={y.phone}
                        y={y}
                        open={openPhone === y.phone}
                        onToggle={() => setOpenPhone(openPhone === y.phone ? null : y.phone)}
                        onOpenLot={onOpenLot}
                    />
                ))}
            </div>
        </div>
    );
}

function YardCard({ y, open, onToggle, onOpenLot }) {
    const count = (s) => y.lots.filter((l) => l.status === s).length;
    const live = y.lots.filter((l) => l.status === 'live');
    const sold = y.lots.filter((l) => l.status === 'sold');
    const stats = [
        ['In review', count('review') + count('changes')],
        ['Live', live.length],
        ['Sold', sold.length],
        ['Off the site', count('withdrawn') + count('cancelled')],
    ];
    return (
        <article id={`yard-${y.phone}`} className={`rounded-[20px] border bg-white/80 p-4 md:p-5 scroll-mt-24 ${open ? 'border-ink/40' : 'border-ink/10'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-brand text-[24px] leading-tight">{y.yardName || `+91 ${y.phone}`}</h3>
                        <YardState y={y} />
                    </div>
                    <p className="mt-0.5 text-[13px] text-ink-3 flex items-center gap-1.5">
                        <Pin className="w-3.5 h-3.5" /> {CITIES[y.cityKey]?.name || 'City not given'}
                        {y.contact ? ` · ${y.contact}` : ''} · +91 {y.phone}
                    </p>
                </div>
                <Reach phone={y.phone} />
            </div>

            <div className="mt-4 grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 md:gap-6">
                {y.status === 'new' ? (
                    <p className="text-[13.5px] text-ink-2">This number logged in with a one-time code but has not sent its yard details yet.</p>
                ) : (
                    <YardFacts y={y} />
                )}
                <div>
                    <dl className="grid grid-cols-4 gap-2">
                        {stats.map(([k, v]) => (
                            <div key={k} className="rounded-xl bg-paper-2/70 px-2.5 py-2">
                                <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3 leading-tight">{k}</dt>
                                <dd className="mt-0.5 text-[20px] font-extrabold tabular-nums">{v}</dd>
                            </div>
                        ))}
                    </dl>
                    {y.lots.length ? (
                        <p className="mt-2 text-[12.5px] text-ink-2 tabular-nums">
                            Live stock {live.reduce((n, l) => n + l.sqft, 0)} sq ft · {inr(live.reduce((n, l) => n + l.yardPrice * l.sqft, 0))} at the
                            yard&apos;s price
                            {sold.length > 0 && ` · sold ${inr(sold.reduce((n, l) => n + (l.listPrice || l.yardPrice) * l.sqft, 0))} through us`}
                        </p>
                    ) : (
                        <p className="mt-2 text-[12.5px] text-ink-3">No lots sent yet.</p>
                    )}
                    {y.lots.length > 0 && (
                        <button
                            type="button"
                            onClick={onToggle}
                            className="mt-3 h-9 px-3.5 rounded-full border border-ink/20 text-[12.5px] font-bold hover:border-ink"
                            aria-expanded={open}
                        >
                            {open ? 'Hide its lots' : `See its ${y.lots.length} ${y.lots.length === 1 ? 'lot' : 'lots'}`}
                        </button>
                    )}
                </div>
            </div>

            {open && (
                <ul className="mt-4 border-t border-ink/10 pt-2 space-y-0.5">
                    {[...y.lots]
                        .sort((a, b) => b.sentAt - a.sentAt)
                        .map((l) => (
                            <LotRow key={l.id} l={l} onOpen={onOpenLot} />
                        ))}
                </ul>
            )}
        </article>
    );
}

/** Every lot yards have sent, in any state, each with its yard. */
export function AllLotsTab({ listings, yards, onOpenLot }) {
    const [status, setStatus] = useState('');
    const [q, setQ] = useState('');
    const counts = useMemo(() => {
        const m = {};
        listings.forEach((l) => (m[l.status] = (m[l.status] || 0) + 1));
        return m;
    }, [listings]);
    const shown = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return listings
            .map((l) => ({ l, y: yardOf(l, yards) }))
            .filter(({ l }) => !status || l.status === status)
            .filter(
                ({ l, y }) => !needle || [l.name, l.family, y.yardName, y.contact, y.phone, CITIES[l.cityKey]?.name].join(' ').toLowerCase().includes(needle),
            )
            .sort((a, b) => b.l.sentAt - a.l.sentAt);
    }, [listings, yards, status, q]);

    return (
        <div>
            <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a stone, yard, person or city"
                className="w-full md:w-[420px] h-11 rounded-full border border-ink/15 bg-white/80 px-4 text-[14px] outline-none focus:border-ink"
                aria-label="Search lots"
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip active={!status} onClick={() => setStatus('')}>
                    All ({listings.length})
                </Chip>
                {Object.entries(TEAM_STATUS)
                    .filter(([id]) => counts[id])
                    .map(([id, st]) => (
                        <Chip key={id} active={status === id} onClick={() => setStatus(status === id ? '' : id)}>
                            {st.label} ({counts[id]})
                        </Chip>
                    ))}
            </div>
            {shown.length ? (
                <ul className="mt-4 rounded-2xl border border-ink/10 bg-white/60 p-1.5 space-y-0.5">
                    {shown.map(({ l, y }) => (
                        <LotRow key={l.id} l={l} yardName={y.yardName} onOpen={onOpenLot} />
                    ))}
                </ul>
            ) : (
                <div className="mt-4 rounded-2xl border-2 border-dashed border-ink/15 px-5 py-10 text-center">
                    <p className="font-bold text-[16px]">{listings.length ? 'No lot matches that' : 'No lots yet'}</p>
                    <p className="mt-1 text-[14px] text-ink-2">Every lot a yard sends appears here, in whatever state it is in.</p>
                </div>
            )}
        </div>
    );
}

/** One lot, opened: the stone, its prices, what happened to it, and the yard it is from. */
export function TeamLotSheet({ l, yards, listings, onClose, onOpenYard, onViewLot }) {
    const [big, setBig] = useState(0);
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

    const y = yardOf(l, yards);
    const yardLots = listings.filter((x) => x.phone === l.phone).length;
    const site = l.listPrice;
    const timeline = [
        ['Sent for review', l.sentAt],
        ['Approved, on the site', l.listedAt],
        ['Margin last changed', l.marginChangedAt],
        ['Sold', l.status === 'sold' && l.soldAt],
        ['Withdrawn by the yard', l.status === 'withdrawn' && l.withdrawnAt],
        ['Cancelled by our team', l.status === 'cancelled' && l.cancelledAt],
    ].filter(([, t]) => t);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label={`${l.name}, from ${y.yardName || 'a yard'}`}
        >
            <button className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] scene-fade" onClick={onClose} aria-label="Close" />
            <div className="relative sheet-in bg-paper w-full md:w-[min(980px,94vw)] max-h-[94svh] md:max-h-[92vh] rounded-t-[26px] md:rounded-[26px] overflow-y-auto shadow-float">
                <div className="p-5 md:p-7 grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5 md:gap-7 items-start">
                    <div>
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-paper-2">
                            <img
                                src={l.photos[big] || l.photos[0]}
                                alt={`${l.name}, photo ${big + 1}`}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        </div>
                        {l.photos.length > 1 && (
                            <div className="mt-2 flex gap-2">
                                {l.photos.map((src, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setBig(i)}
                                        aria-label={`Photo ${i + 1}`}
                                        className={`w-14 h-14 rounded-lg overflow-hidden border-2 ${i === big ? 'border-ink' : 'border-transparent'}`}
                                    >
                                        <img src={src} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                        {l.video && <StoneVideo video={l.video} className="mt-2 w-full aspect-video rounded-xl bg-ink object-contain" />}
                        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px] tabular-nums">
                            <dt className="text-ink-3">Yard&apos;s price</dt>
                            <dd className="font-semibold">
                                {inr(l.yardPrice)}/sq ft · {inr(l.yardPrice * l.sqft)} whole
                            </dd>
                            <dt className="text-ink-3">Our margin</dt>
                            <dd className="font-semibold">{marginLabel(l.margin)}</dd>
                            <dt className="text-ink-3">On the site</dt>
                            <dd className="font-semibold">{site ? `${inr(site)} whole / ${inr(partRateOf(site))} part` : 'Not priced yet'}</dd>
                            <dt className="text-ink-3">Market rate</dt>
                            <dd className="font-semibold">
                                {inr(l.marketRate)}/sq ft{site ? ` · ${Math.max(0, Math.round((1 - site / l.marketRate) * 100))}% under` : ''}
                            </dd>
                            {site && (
                                <>
                                    <dt className="text-ink-3">We make</dt>
                                    <dd className="font-semibold">{inr((site - l.yardPrice) * l.sqft)} on the whole lot</dd>
                                </>
                            )}
                        </dl>
                    </div>

                    <div className="min-w-0">
                        <div className="pr-10">
                            <StatusChip status={l.status} />
                            <h2 className="mt-1.5 font-brand text-[30px] md:text-[36px] leading-[1.04]">{l.name}</h2>
                            <p className="mt-1 text-[13.5px] text-ink-2">
                                {l.family}
                                {l.colors?.length ? ` · ${l.colors.join(', ')}` : ''} · {l.sqft} sq ft · {l.pieces} {l.pieces === 1 ? 'piece' : 'pieces'}
                                {pieceInches(l) ? ` of ${inchSize(...pieceInches(l))}` : ''} · {l.thicknessMm} mm {l.finish?.toLowerCase()}
                            </p>
                        </div>

                        <section className="mt-4 rounded-[18px] border border-ink/15 bg-white/85 p-4" aria-label="The yard this lot is from">
                            <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-clay">From the yard · never shown to buyers</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                <h3 className="font-brand text-[24px] leading-tight">{y.yardName || `+91 ${y.phone}`}</h3>
                                <YardState y={y} />
                            </div>
                            <div className="mt-3">
                                <YardFacts y={y} />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Reach phone={y.phone} compact />
                                <button
                                    type="button"
                                    onClick={() => onOpenYard(l.phone)}
                                    className="h-8 px-3 rounded-full bg-ink text-paper text-[12px] font-bold"
                                >
                                    {yardLots === 1 ? 'See this yard' : `All ${yardLots} lots from this yard`}
                                </button>
                            </div>
                        </section>

                        {timeline.length > 0 && (
                            <ul className="mt-4 space-y-1 text-[13px]">
                                {timeline.map(([k, t]) => (
                                    <li key={k} className="flex justify-between gap-3 border-b border-ink/5 pb-1">
                                        <span className="text-ink-3">{k}</span>
                                        <span className="font-semibold tabular-nums">{date(t)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {l.review && !l.review.approved && (
                            <div className="mt-4 rounded-xl bg-clay-soft/70 px-3.5 py-3 text-[13px] text-clay">
                                <p className="font-bold">{l.review.cancelled ? 'Why we cancelled it' : 'What we asked the yard to fix'}</p>
                                {(l.review.reasons || []).map((r) => (
                                    <p key={r}>· {r}</p>
                                ))}
                                {l.review.note && <p className="mt-0.5 text-ink-2">“{l.review.note}”</p>}
                            </div>
                        )}

                        {l.status === 'live' && onViewLot && (
                            <button
                                type="button"
                                onClick={() => onViewLot(l.id)}
                                className="mt-4 h-10 px-4 rounded-full border border-ink/20 text-[13px] font-bold hover:border-ink"
                            >
                                See it on the site
                            </button>
                        )}
                    </div>
                </div>
                <button
                    type="button"
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
