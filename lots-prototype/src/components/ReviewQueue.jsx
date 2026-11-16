import React, { useState } from 'react';
import { CITIES, inchSize, inr, partRateOf, pieceInches, sqftOfInches } from '../lib/lots';
import { CANCEL_REASONS, DEFAULT_MARGIN, listPriceFor, MARGIN_STEPS, marginLabel, SEND_BACK_REASONS, useYard, yard, yardOf } from '../lib/vendor';
import { AllLotsTab, TeamLotSheet, YardsTab } from './AdminYards';
import { Brand, Check, Chip } from './ui';
import WhereItGoes from './WhereItGoes';
import StoneVideo from './StoneVideo';
import { secsLabel } from '../lib/media';

/**
 * The team's review page (#/review): every lot a yard sends waits here until
 * someone approves it (it goes live on the site at once) or sends it back with
 * reasons (the yard sees them in My lots, fixes the lot and sends it again).
 *
 * The reviewer sees what buyers never do: the yard, its contact and GSTIN, and
 * the yard's own price. Our margin is set here, per lot, when it is approved,
 * and can be changed any time after under "Live lots: prices"; the site price
 * follows at once.
 *
 * Two more tabs: Yards (every yard that signed up, with all its details and
 * its lots) and All lots (every lot yards have sent, in any state). Click any
 * stone on this page and it opens with the yard it is from (AdminYards.jsx).
 *
 * Prototype: open to anyone who knows the address. Production: behind the
 * existing admin login, with the decision logged per reviewer.
 */
export default function ReviewQueue({ onHome, onViewLot }) {
    const { listings, yards } = useYard();
    const [now] = useState(() => Date.now());
    const [tab, setTab] = useState('review'); // review | yards | lots
    const [openLotId, setOpenLotId] = useState(null);
    const [openPhone, setOpenPhone] = useState(null);
    const openLot = listings.find((l) => l.id === openLotId);
    // From a lot to its yard: the Yards tab, that yard opened and in view.
    const openYard = (phone) => {
        setOpenLotId(null);
        setTab('yards');
        setOpenPhone(phone);
        setTimeout(() => document.getElementById(`yard-${phone}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    };
    const waiting = listings.filter((l) => l.status === 'review').sort((a, b) => a.sentAt - b.sentAt);
    const live = listings.filter((l) => l.status === 'live').sort((a, b) => b.listedAt - a.listedAt);
    const reviewed = listings
        .filter((l) => l.review?.at)
        .sort((a, b) => b.review.at - a.review.at)
        .slice(0, 8);

    return (
        <div className="min-h-screen bg-paper">
            <header className="border-b border-ink/10 bg-paper/90 backdrop-blur sticky top-0 z-30">
                <div className="max-w-[1180px] mx-auto h-[60px] md:h-[68px] px-4 md:px-8 flex items-center justify-between gap-3">
                    <button onClick={onHome} className="flex items-center gap-2.5" aria-label="Back to the site">
                        <Brand />
                        <span className="hidden sm:inline text-[12px] font-extrabold uppercase tracking-[0.16em] text-ink-3">team panel · team only</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <a href="#/yards" className="h-10 px-3.5 rounded-full text-[13px] font-bold text-ink-2 hover:text-ink inline-flex items-center">
                            Yard portal
                        </a>
                        <button onClick={onHome} className="h-10 px-4 rounded-full border border-ink/15 text-[13px] font-bold hover:border-ink">
                            The site
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1180px] mx-auto px-4 md:px-8 py-8 md:py-12">
                <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Team panel">
                    {[
                        ['review', `Review (${waiting.length})`],
                        ['yards', `Yards (${Object.keys(yards).length})`],
                        ['lots', `All lots (${listings.length})`],
                    ].map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={tab === id}
                            onClick={() => setTab(id)}
                            className={`h-9 px-3.5 rounded-full text-[13px] font-bold ${tab === id ? 'bg-ink text-paper' : 'bg-white/60 border border-ink/15 text-ink-2 hover:border-ink/40'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'yards' && (
                    <>
                        <h1 className="mt-5 font-brand text-[36px] md:text-[48px] leading-[1.02]">Every yard</h1>
                        <p className="mt-2 mb-5 text-[14px] text-ink-2 max-w-[640px]">
                            Every yard that has signed up, with everything it told us and all its lots. Buyers never see any of this: they only see the city.
                        </p>
                        <YardsTab yards={yards} listings={listings} openPhone={openPhone} setOpenPhone={setOpenPhone} onOpenLot={setOpenLotId} />
                    </>
                )}

                {tab === 'lots' && (
                    <>
                        <h1 className="mt-5 font-brand text-[36px] md:text-[48px] leading-[1.02]">Every lot from the yards</h1>
                        <p className="mt-2 mb-5 text-[14px] text-ink-2 max-w-[640px]">
                            Every lot a yard has sent, in any state. Open one to see the yard it is from.
                        </p>
                        <AllLotsTab listings={listings} yards={yards} onOpenLot={setOpenLotId} />
                    </>
                )}

                {tab === 'review' && (
                    <>
                        <h1 className="mt-5 font-brand text-[36px] md:text-[48px] leading-[1.02]">Lots waiting for review</h1>
                        <p className="mt-2 text-[14px] text-ink-2 max-w-[640px]">
                            Nothing a yard sends is on the site until someone here approves it. Check the photos are the real slabs, the name fits the stone,
                            the size adds up and the price is well under market. Prototype: in the live site this page is behind the admin login.
                        </p>

                        <div className="mt-6 space-y-4">
                            {waiting.length === 0 && (
                                <div className="rounded-2xl border-2 border-dashed border-ink/15 px-5 py-10 text-center">
                                    <p className="font-bold text-[16px]">Nothing waiting</p>
                                    <p className="mt-1 text-[14px] text-ink-2">Lots yards send from the yard portal appear here, oldest first.</p>
                                </div>
                            )}
                            {waiting.map((l) => (
                                <ReviewCard key={l.id} l={l} now={now} y={yardOf(l, yards)} onOpenYard={openYard} />
                            ))}
                        </div>

                        {live.length > 0 && (
                            <>
                                <h2 className="mt-12 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">Live lots: prices ({live.length})</h2>
                                <p className="mt-1 text-[13px] text-ink-3">
                                    Change our margin on any live lot; the price on the site changes at once. The yard always gets its own price.
                                </p>
                                <ul className="mt-3 space-y-2">
                                    {live.map((l) => (
                                        <LivePrice
                                            key={l.id}
                                            l={l}
                                            now={now}
                                            yardName={yardOf(l, yards).yardName}
                                            onViewLot={onViewLot}
                                            onOpen={() => setOpenLotId(l.id)}
                                        />
                                    ))}
                                </ul>
                            </>
                        )}

                        {reviewed.length > 0 && (
                            <>
                                <h2 className="mt-12 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">Recently reviewed</h2>
                                <ul className="mt-3 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white/60">
                                    {reviewed.map((l) => (
                                        <li key={l.id} className="px-4 py-3 flex items-center gap-3 text-[13.5px]">
                                            <button
                                                type="button"
                                                onClick={() => setOpenLotId(l.id)}
                                                className="min-w-0 flex-1 flex items-center gap-3 text-left group"
                                                title="Open the lot and its yard"
                                            >
                                                <img src={l.photos[0]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                                <span className="min-w-0 flex-1 truncate">
                                                    <b className="group-hover:underline underline-offset-2">{l.name}</b>{' '}
                                                    <span className="text-ink-3">· {yardOf(l, yards).yardName}</span>
                                                </span>
                                            </button>
                                            {l.status === 'live' && onViewLot && (
                                                <button
                                                    type="button"
                                                    onClick={() => onViewLot(l.id)}
                                                    className="text-[12.5px] font-bold text-ink-2 hover:text-ink underline underline-offset-2"
                                                >
                                                    See it on the site
                                                </button>
                                            )}
                                            <span
                                                className={`rounded-md text-[11px] font-extrabold uppercase tracking-[0.08em] px-1.5 py-0.5 ${
                                                    l.review.approved ? 'bg-moss-soft text-moss' : 'bg-clay-soft text-clay'
                                                }`}
                                            >
                                                {l.review.approved ? 'Approved' : l.review.cancelled ? 'Cancelled' : 'Sent back'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </>
                )}
            </main>

            {openLot && (
                <TeamLotSheet
                    key={openLot.id}
                    l={openLot}
                    yards={yards}
                    listings={listings}
                    onClose={() => setOpenLotId(null)}
                    onOpenYard={openYard}
                    onViewLot={onViewLot}
                />
            )}
        </div>
    );
}

const ago = (t, now) => {
    const m = Math.max(0, Math.round((now - t) / 60000));
    return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};

function ReviewCard({ l, now, y, onOpenYard }) {
    const [big, setBig] = useState(0);
    // null | 'back' (send back to fix) | 'cancel' (cancel the listing for good)
    const [deciding, setDeciding] = useState(null);
    const [reasons, setReasons] = useState([]);
    const [note, setNote] = useState('');
    // Our margin for this lot: the one it had before (if sent back once), else the default.
    const [margin, setMargin] = useState(l.margin || DEFAULT_MARGIN);
    const list = listPriceFor(l.yardPrice, margin);
    const off = Math.round((1 - list / l.marketRate) * 100);
    // Does pieces x piece size come near the total? (Only when a size was given.)
    const dims = pieceInches(l);
    const fromPieces = dims ? l.pieces * sqftOfInches(...dims) : null;
    const addsUp = fromPieces ? Math.abs(fromPieces - l.sqft) / l.sqft <= 0.25 : null;
    const checks = [
        [off >= 30, off >= 30 ? `${off}% under market` : `Only ${Math.max(0, off)}% under market (aim for 30%+)`],
        addsUp === null
            ? [null, 'No piece size given, so the total cannot be checked']
            : [
                  addsUp,
                  addsUp
                      ? `Size adds up: ${l.pieces} × ${inchSize(...dims)} ≈ ${Math.round(fromPieces)} sq ft`
                      : `Size does not add up: ${l.pieces} × ${inchSize(...dims)} is ${Math.round(fromPieces)} sq ft, not ${l.sqft}`,
              ],
        [l.photos.length >= 2, l.photos.length >= 2 ? `${l.photos.length} photos` : 'Only one photo'],
        [l.video ? true : null, l.video ? `A ${secsLabel(l.video.secs)} video: check no yard name or signboard is in it` : 'No video (optional)'],
    ];
    const toggle = (r) => setReasons((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));

    return (
        <article className="rounded-[22px] bg-white/80 border border-ink/10 p-4 md:p-5 grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5">
            <div>
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-paper-2">
                    <img src={l.photos[big] || l.photos[0]} alt={`${l.name}, photo ${big + 1}`} className="absolute inset-0 w-full h-full object-cover" />
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
            </div>

            <div className="min-w-0">
                <p className="text-[12px] text-ink-3">
                    Sent {ago(l.sentAt, now)}
                    {l.history?.length ? ` · sent again after a fix (${l.history.length}×)` : ''}
                </p>
                <h2 className="font-brand text-[28px] leading-tight">{l.name}</h2>
                <p className="text-[13.5px] text-ink-2">
                    {l.family}
                    {l.colors?.length ? ` · ${l.colors.join(', ')}` : ''} · {l.sqft} sq ft · {l.pieces} {l.pieces === 1 ? 'piece' : 'pieces'}
                    {dims ? ` of ${inchSize(...dims)}` : ''} · {l.thicknessMm} mm {l.finish.toLowerCase()} · {CITIES[l.cityKey]?.name}
                </p>

                <WhereItGoes family={l.family} className="mt-3" />

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                    <dt className="text-ink-3">Yard (never shown to buyers)</dt>
                    <dd className="font-semibold">
                        <button
                            type="button"
                            onClick={() => onOpenYard(l.phone)}
                            className="font-bold underline underline-offset-2 hover:text-clay"
                            title="All this yard's details and lots"
                        >
                            {y.yardName}
                        </button>{' '}
                        · {y.contact}
                    </dd>
                    <dt className="text-ink-3">Phone · GSTIN</dt>
                    <dd className="font-semibold tabular-nums">
                        +91 {l.phone} · {y.gstin ? `${y.gstin}${y.gstinOk ? '' : ' (not confirmed)'}` : 'no GSTIN yet'}
                    </dd>
                    <dt className="text-ink-3">Yard address</dt>
                    <dd className="font-semibold">
                        {y.address || 'Not given'}
                        {CITIES[y.cityKey] && !(y.address || '').toLowerCase().includes(CITIES[y.cityKey].name.toLowerCase())
                            ? `, ${CITIES[y.cityKey].name}`
                            : ''}
                    </dd>
                    <dt className="text-ink-3">Yard&apos;s price (what it gets)</dt>
                    <dd className="font-semibold tabular-nums">
                        {inr(l.yardPrice)} /sq ft · {inr(l.yardPrice * l.sqft)} whole lot
                    </dd>
                    <dt className="text-ink-3">Market rate</dt>
                    <dd className="font-semibold tabular-nums">{inr(l.marketRate)} /sq ft</dd>
                </dl>

                <div className="mt-4">
                    <MarginEditor l={l} margin={margin} onChange={setMargin} />
                </div>

                <ul className="mt-3 space-y-1 text-[13px]">
                    {checks.map(([ok, text]) => (
                        <li key={text} className={`flex gap-2 ${ok === null ? 'text-ink-3' : ok ? 'text-moss' : 'text-clay font-semibold'}`}>
                            {ok ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <span className="w-4 text-center shrink-0">{ok === null ? '–' : '!'}</span>}
                            {text}
                        </li>
                    ))}
                </ul>

                {deciding ? (
                    <div className={`mt-4 rounded-xl p-3.5 ${deciding === 'cancel' ? 'bg-clay-soft/70' : 'bg-paper-2/70'}`}>
                        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-3">
                            {deciding === 'back' ? 'Send it back to fix: what is wrong?' : 'Cancel this listing: why?'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {(deciding === 'back' ? SEND_BACK_REASONS : CANCEL_REASONS).map((r) => (
                                <Chip key={r} active={reasons.includes(r)} onClick={() => toggle(r)}>
                                    {r}
                                </Chip>
                            ))}
                        </div>
                        <label className="mt-3 block">
                            <span className="text-[12.5px] font-bold">Remarks for the yard{deciding === 'cancel' ? '' : ' (optional)'}</span>
                            <textarea
                                rows={3}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={
                                    deciding === 'back'
                                        ? 'What to change, in plain words. E.g. "Please add a photo of the whole slab in daylight, and check the piece size."'
                                        : 'Why it cannot go on the site. E.g. "The photos are from a catalogue, not your yard."'
                                }
                                className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-[13.5px] outline-none focus:border-ink resize-none"
                            />
                            <span className="block text-[12px] text-ink-3">The yard sees these remarks exactly as written, under the lot in My lots.</span>
                        </label>
                        {(reasons.length > 0 || note.trim()) && (
                            <div className="mt-3 rounded-lg bg-white/80 border border-ink/10 px-3 py-2 text-[12.5px]">
                                <p className="font-bold text-ink-3 uppercase tracking-[0.1em] text-[11px]">The yard will see</p>
                                <p className="mt-0.5 font-semibold text-clay">{deciding === 'back' ? 'Needs a fix' : 'Cancelled by our team'}</p>
                                {reasons.map((r) => (
                                    <p key={r} className="text-clay">
                                        · {r}
                                    </p>
                                ))}
                                {note.trim() && <p className="mt-0.5 text-ink-2">“{note.trim()}”</p>}
                            </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                            {deciding === 'back' ? (
                                <button
                                    type="button"
                                    disabled={!reasons.length && !note.trim()}
                                    onClick={() => yard.sendBack(l.id, reasons, note.trim())}
                                    className="h-10 px-4 rounded-full bg-clay text-paper text-[13px] font-bold disabled:opacity-40"
                                >
                                    Send back to the yard
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={!note.trim()}
                                    onClick={() => yard.cancelListing(l.id, reasons, note.trim())}
                                    className="h-10 px-4 rounded-full bg-clay text-paper text-[13px] font-bold disabled:opacity-40"
                                    title={note.trim() ? '' : 'Write remarks for the yard first'}
                                >
                                    Cancel the listing
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setDeciding(null);
                                    setReasons([]);
                                    setNote('');
                                }}
                                className="h-10 px-3 rounded-full text-[13px] font-bold text-ink-2 hover:text-ink"
                            >
                                Back
                            </button>
                        </div>
                        {deciding === 'cancel' && !note.trim() && (
                            <p className="mt-1.5 text-[12px] text-clay">Remarks are needed to cancel: the yard should know why.</p>
                        )}
                        {deciding === 'back' && !reasons.length && !note.trim() && (
                            <p className="mt-1.5 text-[12px] text-ink-3">Pick a reason or write remarks, so the yard knows what to fix.</p>
                        )}
                    </div>
                ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => yard.approve(l.id, { ...margin, value: Number(margin.value) || 0 })}
                            className="h-11 px-5 rounded-full bg-moss text-paper text-[14px] font-bold hover:bg-moss/90"
                        >
                            Approve at {inr(list)}/sq ft, put it live
                        </button>
                        <button
                            type="button"
                            onClick={() => setDeciding('back')}
                            className="h-11 px-4 rounded-full border border-ink/20 text-[14px] font-bold hover:border-ink"
                        >
                            Send back to fix
                        </button>
                        <button
                            type="button"
                            onClick={() => setDeciding('cancel')}
                            className="h-11 px-4 rounded-full text-[14px] font-bold text-clay hover:bg-clay-soft"
                        >
                            Cancel listing
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
}

/**
 * Our margin on one lot: a percentage or a flat ₹ a sq ft on top of the
 * yard's price, with what buyers will see and what we make, as it is typed.
 */
function MarginEditor({ l, margin, onChange }) {
    const list = listPriceFor(l.yardPrice, margin);
    const off = Math.round((1 - list / l.marketRate) * 100);
    const perSqft = list - l.yardPrice;
    const set = (patch) => onChange({ ...margin, ...patch });
    return (
        <div className="rounded-xl bg-paper-2/70 p-3.5">
            <div className="flex flex-wrap items-center gap-2">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-3 mr-1">Our margin</p>
                <div className="inline-flex rounded-full bg-white p-0.5 border border-ink/10" role="radiogroup" aria-label="Margin as">
                    {[
                        ['pct', '%'],
                        ['flat', '₹ / sq ft'],
                    ].map(([t, label]) => (
                        <button
                            key={t}
                            type="button"
                            role="radio"
                            aria-checked={margin.type === t}
                            onClick={() =>
                                set({
                                    type: t,
                                    value: t === 'pct' ? DEFAULT_MARGIN.value : Math.max(5, Math.round((l.yardPrice * DEFAULT_MARGIN.value) / 100 / 5) * 5),
                                })
                            }
                            className={`h-8 px-3 rounded-full text-[12.5px] font-bold ${margin.type === t ? 'bg-ink text-paper' : 'text-ink-2'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <label className="inline-flex items-center gap-1.5">
                    <input
                        inputMode="decimal"
                        value={margin.value}
                        onChange={(e) => set({ value: e.target.value.replace(/[^\d.]/g, '') })}
                        className="w-20 h-9 rounded-lg border border-ink/15 bg-white px-2.5 text-[14px] font-bold tabular-nums outline-none focus:border-ink"
                        aria-label={margin.type === 'pct' ? 'Margin in percent' : 'Margin in rupees per sq ft'}
                    />
                    <span className="text-[13px] text-ink-2">{margin.type === 'pct' ? '%' : '₹/sq ft'}</span>
                </label>
                {margin.type === 'pct' && (
                    <span className="flex flex-wrap gap-1">
                        {MARGIN_STEPS.map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => set({ value: v })}
                                className={`h-8 px-2.5 rounded-full border text-[12px] font-bold ${Number(margin.value) === v ? 'border-ink bg-white' : 'border-ink/15 text-ink-2 hover:border-ink/40'}`}
                            >
                                {v}%
                            </button>
                        ))}
                    </span>
                )}
            </div>
            <p className="mt-2 text-[13px] tabular-nums">
                Buyers see <b>{inr(list)}/sq ft</b> whole lot · {inr(partRateOf(list))} for part ·{' '}
                <span className={off >= 30 ? 'text-moss font-semibold' : 'text-clay font-semibold'}>{Math.max(0, off)}% under market</span>
            </p>
            <p className="text-[12.5px] text-ink-2 tabular-nums">
                We make {inr(perSqft)}/sq ft · {inr(perSqft * l.sqft)} on the whole lot ({inr(list * l.sqft)} to buyers, {inr(l.yardPrice * l.sqft)} to the
                yard)
            </p>
        </div>
    );
}

/** A live lot's price, and changing our margin on it. */
function LivePrice({ l, now, yardName, onViewLot, onOpen }) {
    const [editing, setEditing] = useState(false);
    const [margin, setMargin] = useState(l.margin || DEFAULT_MARGIN);
    const list = l.listPrice || l.yardPrice;
    const changed = l.marginChangedAt ? ago(l.marginChangedAt, Math.max(now, l.marginChangedAt)) : null;
    return (
        <li className="rounded-2xl border border-ink/10 bg-white/70 p-3.5">
            <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={onOpen} className="shrink-0" aria-label={`Open ${l.name} and its yard`}>
                    <img src={l.photos[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                </button>
                <div className="min-w-0 flex-1">
                    <p className="font-bold text-[14.5px] truncate">
                        <button type="button" onClick={onOpen} className="font-bold hover:underline underline-offset-2" title="Open the lot and its yard">
                            {l.name}
                        </button>{' '}
                        <span className="font-normal text-ink-3">
                            · {yardName} · {l.sqft} sq ft
                        </span>
                    </p>
                    <p className="text-[12.5px] text-ink-2 tabular-nums">
                        Yard {inr(l.yardPrice)} · margin <b>{marginLabel(l.margin)}</b> · site <b>{inr(list)}</b> whole / {inr(partRateOf(list))} part ·{' '}
                        {Math.max(0, Math.round((1 - list / l.marketRate) * 100))}% under market · we make {inr((list - l.yardPrice) * l.sqft)}
                        {changed ? ` · margin changed ${changed}` : ''}
                    </p>
                </div>
                {!editing && onViewLot && (
                    <button type="button" onClick={() => onViewLot(l.id)} className="h-9 px-3 rounded-full text-[12.5px] font-bold text-ink-2 hover:text-ink">
                        On the site
                    </button>
                )}
                {!editing && (
                    <button
                        type="button"
                        onClick={() => {
                            setMargin(l.margin || DEFAULT_MARGIN);
                            setEditing(true);
                        }}
                        className="h-9 px-3.5 rounded-full border border-ink/20 text-[12.5px] font-bold hover:border-ink"
                    >
                        Change margin
                    </button>
                )}
            </div>
            {editing && (
                <div className="mt-3">
                    <MarginEditor l={l} margin={margin} onChange={setMargin} />
                    <div className="mt-2 flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                yard.setMargin(l.id, { ...margin, value: Number(margin.value) || 0 });
                                setEditing(false);
                            }}
                            className="h-9 px-4 rounded-full bg-ink text-paper text-[12.5px] font-bold"
                        >
                            Save: {inr(listPriceFor(l.yardPrice, margin))}/sq ft on the site now
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditing(false)}
                            className="h-9 px-3 rounded-full text-[12.5px] font-bold text-ink-2 hover:text-ink"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </li>
    );
}
