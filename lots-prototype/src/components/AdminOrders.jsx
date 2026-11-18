import React, { useState } from 'react';
import { inr } from '../lib/lots';
import { shrinkPhoto, yard } from '../lib/vendor';
import { feedbackRequest } from '../lib/contact';
import { addStory, BOOKING_STATUS, CREDIT_REFUND_SQFT, removeStory, updateBooking, updateStory, useBookings, useStories } from '../lib/commerce';
import { ChatIcon, Chip, Close } from './ui';

// The team panel's order side (decided 2026-11-17): every booking (2% advance
// paid, the buyer visits the yard) and what came of it, and the customer
// stories that go on the site.

const when = (t) => (t ? new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
const waTo = (phone, text) => `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;

/** Bookings, newest first, with the outcome of each visit. */
export function BookingsTab() {
    const bookings = useBookings();
    const [filter, setFilter] = useState('');
    const shown = bookings.filter((b) => !filter || (filter === 'open' ? b.status === 'booked' || b.status === 'visited' : b.status === filter));
    return (
        <div>
            <div className="flex flex-wrap gap-1.5">
                <Chip active={!filter} onClick={() => setFilter('')}>
                    All ({bookings.length})
                </Chip>
                <Chip active={filter === 'open'} onClick={() => setFilter(filter === 'open' ? '' : 'open')}>
                    Waiting on a visit ({bookings.filter((b) => b.status === 'booked' || b.status === 'visited').length})
                </Chip>
                {['full', 'partial', 'none'].map((s) => (
                    <Chip key={s} active={filter === s} onClick={() => setFilter(filter === s ? '' : s)}>
                        {BOOKING_STATUS[s].label} ({bookings.filter((b) => b.status === s).length})
                    </Chip>
                ))}
            </div>
            <div className="mt-4 space-y-3">
                {!shown.length && (
                    <div className="rounded-2xl border-2 border-dashed border-ink/15 px-5 py-10 text-center">
                        <p className="font-bold text-[16px]">No bookings {filter ? 'here' : 'yet'}</p>
                        <p className="mt-1 text-[14px] text-ink-2">A buyer who reserves a lot, or books their cart, with a 2% advance appears here.</p>
                    </div>
                )}
                {shown.map((b) => (
                    <BookingCard key={b.id} b={b} />
                ))}
            </div>
        </div>
    );
}

function BookingCard({ b }) {
    const [part, setPart] = useState(null); // { amount, sqft } while entering a part purchase
    const st = BOOKING_STATUS[b.status];
    const bought = b.outcome?.sqft || 0;
    const creditRefund = (b.status === 'full' || b.status === 'partial') && bought > CREDIT_REFUND_SQFT && b.creditsSpent > 0;

    const settle = (status, outcome) => {
        updateBooking(b.id, { status, outcome: { ...outcome, at: Date.now() } });
        // A yard lot bought whole is sold: off the site and in the yard's Sold list.
        if (status === 'full') b.items.filter((i) => i.lotId.startsWith('yard-')).forEach((i) => yard.markSold(i.lotId));
    };

    return (
        <article className="rounded-[20px] bg-white/80 border border-ink/10 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[12px] text-ink-3 tabular-nums">
                        {b.id} · booked {when(b.at)}
                    </p>
                    <h3 className="font-brand text-[24px] leading-tight">
                        {b.customer.name} <span className="font-ui text-[13px] text-ink-3 tabular-nums">+91 {b.customer.phone}</span>
                    </h3>
                    <p className="text-[13px] text-ink-3">
                        {b.location?.city ? `${b.location.city}${b.location.pincode ? ` ${b.location.pincode}` : ''}` : 'Location not given'}
                    </p>
                </div>
                <span className={`rounded-md text-[11px] font-extrabold uppercase tracking-[0.08em] px-1.5 py-0.5 ${st.chip}`}>{st.label}</span>
            </div>

            <ul className="mt-3 divide-y divide-ink/10 rounded-xl border border-ink/10">
                {b.items.map((i) => (
                    <li key={i.lotId} className="px-3 py-2.5 flex items-center gap-3 text-[13.5px]">
                        <img src={i.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        <span className="min-w-0 flex-1">
                            <b className="block truncate">{i.name}</b>
                            <span className="block text-[12px] text-ink-3">
                                {i.whole ? `Whole lot, ${i.sqft} sq ft` : `${i.slabs} ${i.slabs === 1 ? 'slab' : 'slabs'}, ${i.sqft} sq ft`} ·{' '}
                                {i.yard ? `${i.yard.yardName}, ${i.yard.cityName}` : `sample lot, ${i.cityName}`}
                            </span>
                        </span>
                        <b className="tabular-nums">{inr(i.cost)}</b>
                    </li>
                ))}
            </ul>
            <p className="mt-2 text-[13px] text-ink-2 tabular-nums">
                Total {inr(b.total)} · advance paid <b>{inr(b.advance)}</b>
                {b.creditsSpent ? ` · paid ${inr(b.creditsSpent)} for render credits` : ''}
            </p>

            {(b.status === 'booked' || b.status === 'visited') && !part && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {b.status === 'booked' && (
                        <button
                            onClick={() => updateBooking(b.id, { status: 'visited', visitedAt: Date.now() })}
                            className="h-9 px-3.5 rounded-full border border-ink/20 text-[12.5px] font-bold hover:border-ink"
                        >
                            They visited
                        </button>
                    )}
                    <button
                        onClick={() => settle('full', { amount: b.total, sqft: b.items.reduce((n, i) => n + i.sqft, 0) })}
                        className="h-9 px-3.5 rounded-full bg-moss text-paper text-[12.5px] font-bold"
                    >
                        Bought it all
                    </button>
                    <button
                        onClick={() => setPart({ amount: '', sqft: '' })}
                        className="h-9 px-3.5 rounded-full border border-ink/20 text-[12.5px] font-bold hover:border-ink"
                    >
                        Bought part
                    </button>
                    <button
                        onClick={() => settle('none', { amount: 0, sqft: 0 })}
                        className="h-9 px-3.5 rounded-full text-clay text-[12.5px] font-bold hover:bg-clay-soft"
                    >
                        Bought nothing
                    </button>
                </div>
            )}
            {part && (
                <form
                    className="mt-3 rounded-xl bg-paper-2/70 p-3 flex flex-wrap items-end gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        settle('partial', { amount: Number(part.amount) || 0, sqft: Number(part.sqft) || 0 });
                        setPart(null);
                    }}
                >
                    <label className="block">
                        <span className="text-[12px] font-semibold text-ink-3">Sq ft bought</span>
                        <input
                            required
                            inputMode="numeric"
                            value={part.sqft}
                            onChange={(e) => setPart({ ...part, sqft: e.target.value.replace(/\D/g, '') })}
                            className="mt-1 w-24 h-9 rounded-lg border border-ink/15 bg-white px-2 text-[14px] tabular-nums outline-none focus:border-ink"
                        />
                    </label>
                    <label className="block">
                        <span className="text-[12px] font-semibold text-ink-3">Amount (₹)</span>
                        <input
                            required
                            inputMode="numeric"
                            value={part.amount}
                            onChange={(e) => setPart({ ...part, amount: e.target.value.replace(/\D/g, '') })}
                            className="mt-1 w-32 h-9 rounded-lg border border-ink/15 bg-white px-2 text-[14px] tabular-nums outline-none focus:border-ink"
                        />
                    </label>
                    <button className="h-9 px-3.5 rounded-full bg-ink text-paper text-[12.5px] font-bold">Save</button>
                    <button type="button" onClick={() => setPart(null)} className="h-9 px-3 rounded-full text-[12.5px] font-bold text-ink-2">
                        Cancel
                    </button>
                </form>
            )}

            {b.outcome && (
                <div className={`mt-3 rounded-xl px-3.5 py-2.5 text-[13px] ${b.status === 'none' ? 'bg-clay-soft/70 text-clay' : 'bg-moss-soft/70 text-moss'}`}>
                    {b.status === 'none' ? (
                        <p className="font-bold">Refund the {inr(b.advance)} advance in full.</p>
                    ) : (
                        <p className="font-bold tabular-nums">
                            Bought {b.outcome.sqft} sq ft for {inr(b.outcome.amount)}: the {inr(b.advance)} advance counts toward it,{' '}
                            {inr(Math.max(0, b.outcome.amount - b.advance))} to collect.
                        </p>
                    )}
                    {creditRefund && (
                        <p className="mt-0.5">
                            Over {CREDIT_REFUND_SQFT} sq ft: refund the {inr(b.creditsSpent)} they paid for render credits.
                        </p>
                    )}
                </div>
            )}
            {(b.status === 'full' || b.status === 'partial') && (
                <a
                    href={waTo(b.customer.phone, feedbackRequest(b.customer.name))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex h-9 px-3.5 rounded-full bg-moss text-paper text-[12.5px] font-bold items-center gap-1.5"
                >
                    <ChatIcon className="w-3.5 h-3.5" /> Ask for feedback on WhatsApp
                </a>
            )}
        </article>
    );
}

/** Customer stories for "Happy customers": added here, published only with permission. */
export function StoriesTab() {
    const stories = useStories();
    const blank = { name: '', city: '', quote: '', photo: null, source: 'WhatsApp', consent: false };
    const [draft, setDraft] = useState(blank);
    const [error, setError] = useState('');
    const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
    const field = 'mt-1 w-full h-10 rounded-xl border border-ink/15 bg-white px-3 text-[14px] outline-none focus:border-ink';
    return (
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
            <form
                className="rounded-[20px] bg-white/80 border border-ink/10 p-4 md:p-5 space-y-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!draft.consent) {
                        setError('Only with the customer’s permission: tick the box once they have said yes.');
                        return;
                    }
                    addStory({ ...draft, published: true });
                    setDraft(blank);
                    setError('');
                }}
            >
                <p className="font-bold text-[15px]">Add a customer story</p>
                <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="text-[12px] font-semibold text-ink-3">Name (as they want it shown)</span>
                        <input required value={draft.name} onChange={(e) => set({ name: e.target.value })} className={field} />
                    </label>
                    <label className="block">
                        <span className="text-[12px] font-semibold text-ink-3">City</span>
                        <input value={draft.city} onChange={(e) => set({ city: e.target.value })} className={field} />
                    </label>
                </div>
                <label className="block">
                    <span className="text-[12px] font-semibold text-ink-3">What they said, in their words</span>
                    <textarea
                        required
                        rows={3}
                        value={draft.quote}
                        onChange={(e) => set({ quote: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-[14px] outline-none focus:border-ink resize-none"
                    />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                    {['WhatsApp', 'Google review'].map((s) => (
                        <Chip key={s} active={draft.source === s} onClick={() => set({ source: s })}>
                            {s}
                        </Chip>
                    ))}
                    <label className="h-9 px-3 rounded-full border border-dashed border-ink/30 text-[12.5px] font-bold inline-flex items-center cursor-pointer hover:border-ink">
                        {draft.photo ? 'Change the photo' : 'Add a photo of the space'}
                        <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={async (e) => {
                                const f = e.target.files?.[0];
                                e.target.value = '';
                                if (!f) return;
                                try {
                                    set({ photo: await shrinkPhoto(f, 1200) });
                                } catch (err) {
                                    setError(err.message);
                                }
                            }}
                        />
                    </label>
                </div>
                {draft.photo && <img src={draft.photo} alt="" className="w-full max-h-48 object-cover rounded-xl" />}
                <label className="flex items-start gap-2 text-[13px]">
                    <input
                        type="checkbox"
                        checked={draft.consent}
                        onChange={(e) => set({ consent: e.target.checked })}
                        className="mt-0.5 w-4 h-4 accent-[#1C1915]"
                    />
                    <span>The customer said yes to us publishing this (and the photo) on the site.</span>
                </label>
                {error && <p className="text-[12.5px] text-clay font-semibold">{error}</p>}
                <button className="h-10 px-4 rounded-full bg-ink text-paper text-[13px] font-bold">Publish on the site</button>
            </form>

            <div className="space-y-3">
                {!stories.length && <p className="text-[14px] text-ink-2">No stories yet. Ask a customer for feedback from their booking, under Bookings.</p>}
                {stories.map((s) => (
                    <article key={s.id} className="rounded-[18px] bg-white/80 border border-ink/10 p-3.5 flex gap-3">
                        {s.photo && <img src={s.photo} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
                        <div className="min-w-0 flex-1 text-[13px]">
                            <p className="font-bold">
                                {s.name}
                                {s.city ? <span className="font-medium text-ink-3"> · {s.city}</span> : null}
                            </p>
                            <p className="text-ink-2 line-clamp-2">“{s.quote}”</p>
                            <div className="mt-1.5 flex gap-2">
                                <button
                                    onClick={() => updateStory(s.id, { published: !s.published })}
                                    className="text-[12px] font-bold underline underline-offset-2"
                                >
                                    {s.published ? 'Hide from the site' : 'Show on the site'}
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => removeStory(s.id)}
                            aria-label={`Delete ${s.name}'s story`}
                            className="w-8 h-8 rounded-full grid place-items-center text-ink-3 hover:text-ink hover:bg-paper-2 shrink-0"
                        >
                            <Close className="w-4 h-4" />
                        </button>
                    </article>
                ))}
            </div>
        </div>
    );
}
