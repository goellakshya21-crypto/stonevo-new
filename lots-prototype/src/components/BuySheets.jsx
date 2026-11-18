import React, { useEffect, useState } from 'react';
import { CITIES, inr, jobLabel } from '../lib/lots';
import { useYard, yardOf } from '../lib/vendor';
import {
    ADVANCE_PCT,
    advanceFor,
    BUYER_CITIES,
    buyCreditPack,
    clearCart,
    CREDIT_PACK,
    CREDIT_REFUND_SQFT,
    createBooking,
    creditsLeft,
    isOpenBooking,
    lineFor,
    removeFromCart,
    setBuyerLocation,
    useBookings,
    useBuyerLocation,
    useCart,
    useCredits,
} from '../lib/commerce';
import { Check, Close, Pin } from './ui';

// The buyer side of buying (decided 2026-11-17): where they are, a cart, the
// 2% booking that gives them the yard's details to visit, and credits for
// "Your room" renders. Demo: no payment is taken and nothing is sent.

/** A sheet over the page, closed by the backdrop, the X or Escape. */
function Sheet({ label, onClose, width = 'md:w-[min(760px,94vw)]', children }) {
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
    return (
        <div className="fixed inset-0 z-[55] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={label}>
            <button className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] scene-fade" onClick={onClose} aria-label="Close" />
            <div
                className={`relative sheet-in bg-paper w-full ${width} max-h-[94svh] md:max-h-[90vh] rounded-t-[26px] md:rounded-[26px] overflow-y-auto shadow-float`}
            >
                {children}
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

const input = 'mt-1 w-full h-11 rounded-xl border border-ink/15 bg-white px-3 text-[14px] outline-none focus:border-ink';

// ─── Where is the project? (first visit) ───────────────────────────────────

export function LocationPrompt({ onClose }) {
    const loc = useBuyerLocation();
    const [city, setCity] = useState(loc?.city || '');
    const [pincode, setPincode] = useState(loc?.pincode || '');
    const save = (e) => {
        e.preventDefault();
        if (!city.trim()) return;
        setBuyerLocation({ city: city.trim(), pincode: pincode.trim() });
        onClose();
    };
    const skip = () => {
        if (!loc?.city) setBuyerLocation({ skipped: true });
        onClose();
    };
    return (
        <Sheet label="Where is your project?" onClose={skip} width="md:w-[min(520px,94vw)]">
            <form className="p-6 md:p-8" onSubmit={save}>
                <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-clay">Welcome</p>
                <h2 className="mt-1 font-brand text-[32px] leading-[1.05] pr-10">Where is your project?</h2>
                <p className="mt-2 text-[14px] text-ink-2">So our team knows where you are when you book a lot or ask for stone. Only our team sees it.</p>
                <div className="mt-5 grid grid-cols-[minmax(0,1fr)_140px] gap-3">
                    <label className="block">
                        <span className="text-[12px] font-semibold text-ink-3">City</span>
                        <input
                            autoFocus
                            list="buyer-cities"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. Jaipur"
                            className={input}
                        />
                        <datalist id="buyer-cities">
                            {BUYER_CITIES.map((c) => (
                                <option key={c} value={c} />
                            ))}
                        </datalist>
                    </label>
                    <label className="block">
                        <span className="text-[12px] font-semibold text-ink-3">Pincode (optional)</span>
                        <input
                            inputMode="numeric"
                            maxLength={6}
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                            className={`${input} tabular-nums`}
                        />
                    </label>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                    <button disabled={!city.trim()} className="h-11 px-5 rounded-full bg-ink text-paper font-bold text-[14px] disabled:opacity-40">
                        Continue
                    </button>
                    <button type="button" onClick={skip} className="h-11 px-4 rounded-full text-[13.5px] font-bold text-ink-2 hover:text-ink">
                        Skip for now
                    </button>
                </div>
            </form>
        </Sheet>
    );
}

// ─── Cart ──────────────────────────────────────────────────────────────────

export function CartSheet({ lots, onOpenLot, onBook, onClose }) {
    const cart = useCart();
    const bookings = useBookings();
    const booked = new Set(bookings.filter(isOpenBooking).flatMap((b) => b.items.map((i) => i.lotId)));
    const rows = cart.map((c) => ({ c, lot: lots.find((l) => l.id === c.lotId) }));
    const ready = rows.filter((r) => r.lot && !booked.has(r.lot.id)).map((r) => lineFor(r.lot, r.c.need));
    const total = ready.reduce((n, l) => n + l.cost, 0);
    return (
        <Sheet label="Your cart" onClose={onClose}>
            <div className="p-6 md:p-8">
                <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-clay">Your cart</p>
                <h2 className="mt-1 font-brand text-[34px] leading-[1.04] pr-10">
                    {cart.length ? `${cart.length} ${cart.length === 1 ? 'lot' : 'lots'}` : 'Nothing here yet'}
                </h2>
                {!cart.length && <p className="mt-2 text-[14px] text-ink-2">Open a lot and choose “Add to cart”. Book them all at once with one 2% advance.</p>}
                <ul className="mt-5 space-y-2">
                    {rows.map(({ c, lot }) => {
                        const line = lot ? lineFor(lot, c.need) : null;
                        const gone = !lot;
                        const taken = lot && booked.has(lot.id);
                        return (
                            <li key={c.lotId} className="rounded-2xl bg-white/80 border border-ink/10 p-3 flex items-center gap-3">
                                {lot ? (
                                    <button type="button" onClick={() => onOpenLot(lot)} className="shrink-0">
                                        <img src={lot.image} alt="" className="w-16 h-16 rounded-xl object-cover" />
                                    </button>
                                ) : (
                                    <span className="w-16 h-16 rounded-xl bg-paper-2 shrink-0" />
                                )}
                                <span className="min-w-0 flex-1">
                                    <span className="block font-bold text-[14.5px] truncate">{lot ? lot.name : 'This lot'}</span>
                                    <span className="block text-[12.5px] text-ink-3">
                                        {gone
                                            ? 'No longer available'
                                            : taken
                                              ? 'Already booked'
                                              : `${line.need ? `You need ${line.need} sq ft: ` : ''}${jobLabel(line)} · ${lot.city.name}`}
                                    </span>
                                </span>
                                {line && !taken && <span className="font-extrabold text-[15px] tabular-nums shrink-0">{inr(line.cost)}</span>}
                                <button
                                    type="button"
                                    onClick={() => removeFromCart(c.lotId)}
                                    aria-label={`Remove ${lot?.name || 'this lot'}`}
                                    className="w-9 h-9 rounded-full grid place-items-center text-ink-3 hover:text-ink hover:bg-paper-2 shrink-0"
                                >
                                    <Close className="w-4 h-4" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
                {ready.length > 0 && (
                    <div className="mt-5 rounded-2xl bg-paper-2/70 p-4">
                        <div className="flex justify-between text-[14px]">
                            <span className="text-ink-2">Total for {ready.length === 1 ? 'this lot' : `these ${ready.length} lots`}</span>
                            <b className="tabular-nums">{inr(total)}</b>
                        </div>
                        <div className="mt-1 flex justify-between text-[14px]">
                            <span className="text-ink-2">Booking advance ({ADVANCE_PCT}%), counted toward what you buy</span>
                            <b className="tabular-nums">{inr(advanceFor(total))}</b>
                        </div>
                        <button onClick={() => onBook(ready)} className="mt-4 w-full h-12 rounded-full bg-ink text-paper font-bold text-[15px] hover:bg-ink/90">
                            Book with a {inr(advanceFor(total))} advance
                        </button>
                    </div>
                )}
            </div>
        </Sheet>
    );
}

// ─── Booking: 2% advance, then the yard's details ──────────────────────────

const mapsLink = (address, cityName) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, cityName].filter(Boolean).join(', '))}`;

export function BookingSheet({ lines, user, onBooked, onClose }) {
    const loc = useBuyerLocation();
    const credits = useCredits();
    const { listings, yards } = useYard();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState(user?.phone || '');
    const [city, setCity] = useState(loc?.city || '');
    const [pincode, setPincode] = useState(loc?.pincode || '');
    const [booking, setBooking] = useState(null);
    const total = lines.reduce((n, l) => n + l.cost, 0);
    const advance = advanceFor(total);

    // The yard behind each lot, kept with the booking. Sample lots from the
    // catalogue have no yard yet: the booking says so.
    const yardFor = (lot) => {
        if (!lot.fromYard) return null;
        const listing = listings.find((x) => x.id === lot.id);
        if (!listing) return null;
        const y = yardOf(listing, yards);
        return { yardName: y.yardName, contact: y.contact, phone: y.phone, address: y.address, cityName: CITIES[y.cityKey]?.name || lot.city.name };
    };

    const pay = (e) => {
        e.preventDefault();
        if (city.trim()) setBuyerLocation({ city: city.trim(), pincode: pincode.trim() });
        const b = createBooking({
            customer: { name: name.trim(), phone },
            location: city.trim() ? { city: city.trim(), pincode: pincode.trim() } : null,
            creditsSpent: credits.spent,
            items: lines.map((l) => ({
                lotId: l.lot.id,
                name: l.lot.name,
                image: l.lot.image,
                family: l.lot.family,
                cityName: l.lot.city.name,
                need: l.need,
                slabs: l.slabs,
                sqft: l.sqft,
                cost: l.cost,
                whole: l.whole,
                yard: yardFor(l.lot),
            })),
        });
        clearCart(lines.map((l) => l.lot.id));
        setBooking(b);
        onBooked?.(b);
    };

    if (booking) {
        return (
            <Sheet label="Booking confirmed" onClose={onClose}>
                <div className="p-6 md:p-8">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-moss-soft text-moss text-[12px] font-bold px-2.5 py-1">
                        <Check className="w-3.5 h-3.5" /> Booked · {booking.id}
                    </p>
                    <h2 className="mt-2 font-brand text-[32px] md:text-[38px] leading-[1.04] pr-10">Here is where to see your stone.</h2>
                    <p className="mt-2 text-[14px] text-ink-2">
                        We have sent these details to +91 {booking.customer.phone} on WhatsApp (demo: nothing is sent from this prototype). The yard knows you
                        are coming.
                    </p>
                    <ul className="mt-5 space-y-3">
                        {booking.items.map((i) => (
                            <li key={i.lotId} className="rounded-2xl bg-white/85 border border-ink/10 p-4">
                                <div className="flex items-center gap-3">
                                    <img src={i.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-bold text-[15px] truncate">{i.name}</span>
                                        <span className="block text-[12.5px] text-ink-3 tabular-nums">
                                            {i.whole ? `The whole lot, ${i.sqft} sq ft` : `${i.slabs} ${i.slabs === 1 ? 'slab' : 'slabs'}, ${i.sqft} sq ft`} ·{' '}
                                            {inr(i.cost)}
                                        </span>
                                    </span>
                                </div>
                                {i.yard ? (
                                    <dl className="mt-3 grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13.5px]">
                                        <dt className="text-ink-3">Yard</dt>
                                        <dd className="font-bold">{i.yard.yardName}</dd>
                                        <dt className="text-ink-3">Ask for</dt>
                                        <dd className="font-semibold">
                                            {i.yard.contact} ·{' '}
                                            <a href={`tel:+91${i.yard.phone}`} className="underline underline-offset-2 tabular-nums">
                                                +91 {i.yard.phone}
                                            </a>
                                        </dd>
                                        <dt className="text-ink-3">Address</dt>
                                        <dd className="font-semibold">
                                            {i.yard.address || i.yard.cityName}{' '}
                                            <a
                                                href={mapsLink(i.yard.address, i.yard.cityName)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="ml-1 inline-flex items-center gap-1 text-clay underline underline-offset-2"
                                            >
                                                <Pin className="w-3 h-3" /> Map
                                            </a>
                                        </dd>
                                    </dl>
                                ) : (
                                    <p className="mt-3 rounded-xl bg-paper-2/80 px-3 py-2 text-[12.5px] text-ink-2">
                                        Sample lot in {i.cityName}: for a real lot this shows the yard&apos;s name, address with a map, and who to ask for.
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-5 rounded-2xl bg-paper-2/70 p-4 text-[13.5px] text-ink-2 space-y-1.5">
                        <p className="font-bold text-ink">What happens next</p>
                        <p>1. Visit the yard and see the slabs.</p>
                        <p>2. Buy all of it or part of it: your {inr(booking.advance)} advance counts toward it.</p>
                        <p>3. Buy nothing: your {inr(booking.advance)} is refunded in full.</p>
                    </div>
                    <button onClick={onClose} className="mt-5 w-full h-12 rounded-full bg-ink text-paper font-bold text-[15px]">
                        Done
                    </button>
                </div>
            </Sheet>
        );
    }

    return (
        <Sheet label="Book with a 2% advance" onClose={onClose}>
            <form className="p-6 md:p-8" onSubmit={pay}>
                <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-clay">Book with a {ADVANCE_PCT}% advance</p>
                <h2 className="mt-1 font-brand text-[30px] md:text-[36px] leading-[1.05] pr-10">Pay {inr(advance)} and visit the yard.</h2>
                <p className="mt-2 text-[14px] text-ink-2">
                    You get the yard&apos;s name, address and who to ask for, here and on WhatsApp. The advance counts toward what you buy, and is refunded in
                    full if you buy nothing.
                </p>
                <ul className="mt-5 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white/70">
                    {lines.map((l) => (
                        <li key={l.lot.id} className="px-4 py-3 flex items-center gap-3 text-[14px]">
                            <img src={l.lot.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            <span className="min-w-0 flex-1">
                                <b className="block truncate">{l.lot.name}</b>
                                <span className="text-[12.5px] text-ink-3">
                                    {jobLabel(l)} · {l.lot.city.name}
                                </span>
                            </span>
                            <b className="tabular-nums">{inr(l.cost)}</b>
                        </li>
                    ))}
                    <li className="px-4 py-3 flex justify-between text-[14px]">
                        <span className="text-ink-2">Total</span>
                        <b className="tabular-nums">{inr(total)}</b>
                    </li>
                    <li className="px-4 py-3 flex justify-between text-[14px] bg-paper-2/60">
                        <span className="font-bold">Advance now ({ADVANCE_PCT}%)</span>
                        <b className="tabular-nums">{inr(advance)}</b>
                    </li>
                </ul>
                <div className="mt-5 grid sm:grid-cols-2 gap-3">
                    <label className="block">
                        <span className="text-[12px] font-semibold text-ink-3">Your name</span>
                        <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
                    </label>
                    <label className="block">
                        <span className="text-[12px] font-semibold text-ink-3">WhatsApp number</span>
                        <div className="mt-1 flex h-11 rounded-xl border border-ink/15 bg-white focus-within:border-ink">
                            <span className="px-3 grid place-items-center text-[14px] text-ink-3 border-r border-ink/10">+91</span>
                            <input
                                required
                                inputMode="numeric"
                                pattern="[0-9]{10}"
                                maxLength={10}
                                title="10-digit mobile number"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                className="flex-1 min-w-0 px-3 text-[14px] outline-none bg-transparent tabular-nums"
                            />
                        </div>
                    </label>
                    <label className="block">
                        <span className="text-[12px] font-semibold text-ink-3">City</span>
                        <input required list="buyer-cities-booking" value={city} onChange={(e) => setCity(e.target.value)} className={input} />
                        <datalist id="buyer-cities-booking">
                            {BUYER_CITIES.map((c) => (
                                <option key={c} value={c} />
                            ))}
                        </datalist>
                    </label>
                    <label className="block">
                        <span className="text-[12px] font-semibold text-ink-3">Pincode</span>
                        <input
                            inputMode="numeric"
                            maxLength={6}
                            pattern="[0-9]{6}"
                            title="6-digit pincode"
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                            className={`${input} tabular-nums`}
                        />
                    </label>
                </div>
                <button className="mt-5 w-full h-12 rounded-full bg-ink text-paper font-bold text-[15px] hover:bg-ink/90">
                    Pay {inr(advance)} advance (demo)
                </button>
                <p className="mt-2 text-[12px] text-ink-3 text-center">
                    Demo: no payment is taken. Live, this is UPI or card through Razorpay, after a one-time code to your number.
                </p>
            </form>
        </Sheet>
    );
}

// ─── Credits for "Your room" renders ───────────────────────────────────────

export function CreditsSheet({ onClose }) {
    const credits = useCredits();
    const [bought, setBought] = useState(false);
    const left = creditsLeft(credits);
    return (
        <Sheet label="Credits for your room" onClose={onClose} width="md:w-[min(520px,94vw)]">
            <div className="p-6 md:p-8">
                <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-clay">Your room renders</p>
                <h2 className="mt-1 font-brand text-[30px] leading-[1.05] pr-10">
                    {bought
                        ? `${CREDIT_PACK.renders} renders added.`
                        : left
                          ? `${left} ${left === 1 ? 'render' : 'renders'} left.`
                          : 'You have used your free renders.'}
                </h2>
                <p className="mt-2 text-[14px] text-ink-2">
                    Each new picture of your own room, or of a design, takes one credit. Our ready-made rooms, the slab photo and the book-match are always
                    free.
                </p>
                <div className="mt-5 rounded-2xl border border-ink/10 bg-white/80 p-4 flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                        <b className="block text-[16px]">{CREDIT_PACK.renders} more renders</b>
                        <span className="text-[13px] text-ink-3 tabular-nums">{inr(CREDIT_PACK.price)}</span>
                    </span>
                    <button
                        onClick={() => {
                            buyCreditPack();
                            setBought(true);
                        }}
                        className="h-11 px-5 rounded-full bg-ink text-paper font-bold text-[14px] shrink-0"
                    >
                        Add credits (demo)
                    </button>
                </div>
                <p className="mt-3 rounded-xl bg-moss-soft/70 text-moss px-3.5 py-2.5 text-[13px] font-semibold">
                    Refundable: buy more than {CREDIT_REFUND_SQFT} sq ft of stone from us and we refund what you paid for credits.
                </p>
                <button onClick={onClose} className="mt-5 w-full h-11 rounded-full border border-ink/20 font-bold text-[14px] hover:border-ink">
                    {bought || left ? 'Back to your room' : 'Not now'}
                </button>
            </div>
        </Sheet>
    );
}
