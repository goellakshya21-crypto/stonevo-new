import React, { useEffect, useState } from 'react';
import { directFee } from '../lib/contact';
import { inr } from '../lib/lots';
import { Check, Close, Pin } from './ui';

/**
 * "Buy direct from the yard": the buyer has found the lot they want, pays a
 * one-time fee, and gets the yard's details to deal with it themselves.
 *
 * This is the one place a yard's identity is ever shown, and only after
 * payment. In production: phone OTP, then Razorpay (UPI, cards, netbanking);
 * the payment webhook marks the request paid and only then does a server
 * route return the yard's details from `lot_private`; the team is alerted on
 * Telegram to tell the yard a buyer is coming. Only lots whose yard has agreed
 * to direct buyers offer it (`lots.direct_ok`).
 *
 * Prototype: no payment is taken and no yard details exist, so the "paid"
 * step shows where they would appear, not made-up ones.
 */
export default function DirectSheet({ lot, onReserve, onClose }) {
    const fee = directFee(lot);
    const [step, setStep] = useState('offer'); // offer | paid
    const [name, setName] = useState('');

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

    // When the whole lot through us costs less than the fee, say so.
    const cheaperWithUs = lot.lotTotal <= fee;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label="Buy direct from the yard">
            <button className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] scene-fade" onClick={onClose} aria-label="Close" />
            <div className="relative sheet-in bg-paper w-full md:w-[min(920px,94vw)] max-h-[94svh] md:max-h-[92vh] rounded-t-[26px] md:rounded-[26px] overflow-y-auto shadow-float">
                <div className="p-5 md:p-8 pr-14">
                    <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-clay">Buy direct from the yard</p>
                    <h2 className="mt-1 font-brand text-[32px] md:text-[40px] leading-[1.04]">Get the yard&apos;s details for {inr(fee)}.</h2>
                    <p className="mt-2 text-[14px] text-ink-2 max-w-[600px]">
                        Like this lot? Pay a one-time fee and deal with the yard that has it yourself: see the slabs, agree the price, take this lot and anything else they have.
                    </p>
                </div>

                <div className="px-5 md:px-8 pb-6 md:pb-8 grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 items-start">
                    {/* The lot and what the fee gets */}
                    <div className="space-y-4">
                        <div className="rounded-[20px] bg-white/80 border border-ink/10 p-3 flex items-center gap-3">
                            <img src={lot.image} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                            <div className="min-w-0">
                                <p className="font-bold text-[15px] truncate">{lot.name}</p>
                                <p className="text-[12.5px] text-ink-3">
                                    {lot.family} · <Pin className="w-3 h-3 inline -mt-0.5" /> {lot.city.name} · {lot.sqft} sq ft
                                </p>
                                <p className="text-[12.5px] text-ink-3">Whole lot through us: {inr(lot.lotTotal)}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-3">You get</p>
                            <ul className="mt-2 space-y-2 text-[13.5px] text-ink-2">
                                {[
                                    "The yard's name and full address, with a map pin",
                                    'The contact person and their phone number',
                                    'Where this lot is in the yard, and its reference',
                                    'A call from us to the yard, so they expect you',
                                ].map((t) => (
                                    <li key={t} className="flex gap-2">
                                        <Check className="w-4 h-4 text-moss shrink-0 mt-0.5" /> {t}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <p className="rounded-xl bg-moss-soft px-3.5 py-2.5 text-[12.5px] text-moss font-semibold">
                            Full refund if the lot is already gone when you contact the yard, or the details are wrong.
                        </p>
                        {/* Always the honest comparison: direct is the fee PLUS the yard's price. */}
                        <div className={`rounded-xl px-3.5 py-3 text-[12.5px] ${cheaperWithUs ? 'bg-clay-soft text-clay' : 'bg-paper-2 text-ink-2'}`} role="note">
                            <p className="font-bold">{cheaperWithUs ? 'Only want this lot? Reserving it is cheaper.' : 'Only want this lot?'}</p>
                            <p className="mt-0.5">
                                Through us it is {inr(lot.lotTotal)} for the whole lot, and we handle pickup and delivery. Direct, you pay {inr(fee)} plus the yard&apos;s price for the stone, so
                                the fee pays off when you want more from this yard.
                            </p>
                            <button
                                onClick={onReserve}
                                className={`mt-2 h-9 px-3.5 rounded-full text-[12.5px] font-bold ${cheaperWithUs ? 'bg-clay text-paper' : 'border border-ink/20 hover:border-ink'}`}
                            >
                                Reserve it through us instead
                            </button>
                        </div>
                    </div>

                    {/* Pay, then the details */}
                    {step === 'offer' ? (
                        <form
                            className="rounded-[20px] bg-white/80 border border-ink/10 p-5 space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                setStep('paid');
                            }}
                        >
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-3">One-time fee</span>
                                <span className="text-[30px] font-extrabold tracking-tight tabular-nums">{inr(fee)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="block">
                                    <span className="text-[12px] font-semibold text-ink-3">Your name</span>
                                    <input
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mt-1 w-full h-11 rounded-xl border border-ink/15 bg-white px-3 text-[14px] outline-none focus:border-ink"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[12px] font-semibold text-ink-3">Mobile number</span>
                                    <div className="mt-1 flex h-11 rounded-xl border border-ink/15 bg-white focus-within:border-ink">
                                        <span className="px-2.5 grid place-items-center text-[14px] text-ink-3 border-r border-ink/10">+91</span>
                                        <input
                                            required
                                            inputMode="numeric"
                                            pattern="[0-9]{10}"
                                            maxLength={10}
                                            title="10-digit mobile number"
                                            className="flex-1 min-w-0 px-3 text-[14px] outline-none bg-transparent"
                                        />
                                    </div>
                                </label>
                                <label className="block col-span-2">
                                    <span className="text-[12px] font-semibold text-ink-3">GSTIN for the invoice (optional)</span>
                                    <input className="mt-1 w-full h-11 rounded-xl border border-ink/15 bg-white px-3 text-[14px] uppercase outline-none focus:border-ink" maxLength={15} />
                                </label>
                            </div>
                            <label className="flex gap-2.5 text-[12.5px] text-ink-2 leading-snug cursor-pointer">
                                <input type="checkbox" required className="mt-0.5 w-4 h-4 accent-[#1C1915] shrink-0" />
                                The details are for my own purchase. I won&apos;t share or publish them.
                            </label>
                            <button className="w-full h-12 rounded-full bg-ink text-paper font-bold text-[15px] hover:bg-ink/90">Pay {inr(fee)} and get the details</button>
                            <p className="text-[12px] text-ink-3 text-center">
                                Your number is verified by OTP, then UPI, card or netbanking. Demo: no payment is taken in this prototype.
                            </p>
                        </form>
                    ) : (
                        <div className="rounded-[20px] bg-white/80 border border-ink/10 p-5 fade-up" role="status">
                            <p className="font-bold text-moss text-[16px]">Payment received (demo)</p>
                            <p className="mt-1 text-[13.5px] text-ink-2">
                                {name ? `Thanks, ${name.trim().split(/\s+/)[0]}. ` : ''}Here is the yard with {lot.name}. The same details go to your WhatsApp, and we call the yard
                                today so they expect you.
                            </p>
                            <dl className="mt-4 divide-y divide-ink/10 rounded-xl border border-ink/10 bg-paper/60">
                                {[
                                    ['Yard', 'Name'],
                                    ['Address', `Full address in ${lot.city.name}, with a map pin`],
                                    ['Contact', 'Person and phone number'],
                                    ['This lot', 'Where it is in the yard, and its reference'],
                                ].map(([k, v]) => (
                                    <div key={k} className="px-3.5 py-2.5 grid grid-cols-[88px_minmax(0,1fr)] gap-2 text-[13px]">
                                        <dt className="font-semibold text-ink-3">{k}</dt>
                                        <dd className="text-ink-3 italic">{v}</dd>
                                    </div>
                                ))}
                            </dl>
                            <p className="mt-3 text-[11.5px] text-ink-3">
                                Prototype: no payment was taken, and no yard details exist yet. In the live site this card shows the real ones, only after payment.
                            </p>
                            <button onClick={onClose} className="mt-4 h-10 px-4 rounded-full border border-ink/20 text-[13px] font-bold hover:border-ink">
                                Done
                            </button>
                        </div>
                    )}
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
