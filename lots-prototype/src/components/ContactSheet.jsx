import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BRAND } from '../lib/brand';
import { directFee, DIRECT_FEE, lotLine, meetingDays, meetingMessage, timesOn, VIDEO_CALL_FEE, VIDEO_CREDIT_DAYS, WHATSAPP_NUMBER, whatsappLink } from '../lib/contact';
import { inr } from '../lib/lots';
import { ChatIcon, Check, Chip, Close, KeyIcon, PhoneIcon, VideoIcon } from './ui';

/**
 * "Talk to us": three ways to reach a person, side by side.
 *   1. Meet on WhatsApp: pick a day and time, and WhatsApp opens with the
 *      request written. The lead lands in the business WhatsApp inbox.
 *   2. We call you back: the requirement form (RequirementSheet).
 *   3. See the slab on a video call: name, number, a slot and a fee paid when
 *      booking (credited if they buy); the team shows the actual pieces on camera.
 *   4. Buy direct from the yard: a one-time fee for the yard's details
 *      (DirectSheet), for a buyer who has found their lot.
 *   And, first and wide: plan a whole project (ProjectSheet), for a whole home
 *   or several rooms, with a project lead and every kind of stone, not only
 *   small lots.
 *
 * `lot`: the lot they were looking at, if any, written into both messages.
 * `focus`: which way to point at first ('whatsapp' | 'call' | 'video').
 *
 * Prototype: the video-call form sends nothing. In production it saves to
 * `contact_requests` through a server route after phone OTP, and alerts the
 * team on Telegram, like the requirement.
 */
export default function ContactSheet({ lot, focus, onRequirement, onDirect, onBrowse, onProject, onClose }) {
    const pointedRef = useRef(null);
    const refFor = (id) => (focus === id ? pointedRef : undefined);

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

    // On phones the cards stack, so bring the one asked for into view.
    useEffect(() => {
        pointedRef.current?.scrollIntoView({ block: 'nearest' });
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label="Talk to us">
            <button className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] scene-fade" onClick={onClose} aria-label="Close" />
            <div className="relative sheet-in bg-paper w-full md:w-[min(1180px,94vw)] max-h-[94svh] md:max-h-[92vh] rounded-t-[26px] md:rounded-[26px] overflow-y-auto shadow-float">
                <div className="p-5 md:p-8 pr-14">
                    <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-clay">Talk to us</p>
                    <h2 className="mt-1 font-brand text-[34px] md:text-[42px] leading-[1.02]">Five ways to work with us.</h2>
                    <p className="mt-2 text-[14px] text-ink-2 max-w-[620px]">
                        {lot ? `About ${lot.name}, or anything else. ` : ''}Talk to a person, or buy direct from the yard. Our team answers every day, 10 am to 8 pm.
                    </p>
                </div>

                <div className="px-5 md:px-8 pb-6 md:pb-8 grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 gap-4 items-start">
                    <ProjectCard innerRef={refFor('project')} pointed={focus === 'project'} onProject={onProject} />
                    <WhatsAppCard innerRef={refFor('whatsapp')} lot={lot} pointed={focus === 'whatsapp'} />
                    <CallBackCard innerRef={refFor('call')} pointed={focus === 'call'} onRequirement={onRequirement} />
                    <VideoCard innerRef={refFor('video')} lot={lot} pointed={focus === 'video'} />
                    <DirectCard innerRef={refFor('direct')} lot={lot} pointed={focus === 'direct'} onDirect={onDirect} onBrowse={onBrowse} />
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

const Card = ({ innerRef, pointed, n, icon, title, text, children }) => (
    <section
        ref={innerRef}
        className={`rounded-[20px] bg-white/80 border p-5 scroll-mt-4 ${pointed ? 'border-ink shadow-card' : 'border-ink/10'}`}
        aria-labelledby={`contact-${n}`}
    >
        <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-paper-2 grid place-items-center text-ink shrink-0">{icon}</span>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-3">Way {n}</p>
        </div>
        <h3 id={`contact-${n}`} className="mt-3 font-bold text-[18px] leading-snug">
            {title}
        </h3>
        <p className="mt-1 text-[13.5px] text-ink-2 leading-relaxed">{text}</p>
        <div className="mt-4">{children}</div>
    </section>
);

const Label = ({ children }) => <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-3">{children}</p>;

/** Day and time slot chips, shared by the WhatsApp and video-call cards. */
function useSlot() {
    const days = useMemo(() => meetingDays(), []);
    const [dayId, setDayId] = useState(days[0].id);
    const day = days.find((d) => d.id === dayId) || days[0];
    const slots = timesOn(day);
    const [timeId, setTimeId] = useState(null);
    const time = slots.find((t) => t.id === timeId) || slots[0];
    const picker = (
        <div className="space-y-3">
            <div>
                <Label>Day</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {days.map((d) => (
                        <Chip key={d.id} active={d.id === day.id} onClick={() => setDayId(d.id)}>
                            {d.short}
                        </Chip>
                    ))}
                </div>
            </div>
            <div>
                <Label>Time</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {slots.map((t) => (
                        <Chip key={t.id} active={t.id === time.id} onClick={() => setTimeId(t.id)}>
                            {t.label} <span className="font-normal opacity-70">{t.hours}</span>
                        </Chip>
                    ))}
                </div>
            </div>
        </div>
    );
    return { day, time, picker };
}

function WhatsAppCard({ innerRef, lot, pointed }) {
    const { day, time, picker } = useSlot();
    const [about, setAbout] = useState(lot ? lotLine(lot) : '');
    const message = meetingMessage({ day, time, about: about.trim() });
    const hello = `Hi ${BRAND.name}, I have a question${lot ? ` about ${lotLine(lot)}` : ''}.`;
    return (
        <Card
            innerRef={innerRef}
            pointed={pointed}
            n={1}
            icon={<ChatIcon />}
            title="Meet on WhatsApp"
            text="Pick a time for a call or a visit. WhatsApp opens with your request written; send it and we confirm."
        >
            {picker}
            <label className="mt-3 block">
                <Label>What about? (optional)</Label>
                <input
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="e.g. a kitchen counter, about 30 sq ft"
                    className="mt-1.5 w-full h-10 rounded-xl border border-ink/15 bg-white px-3 text-[13.5px] outline-none focus:border-ink"
                />
            </label>
            <a
                href={whatsappLink(message)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full h-11 rounded-full bg-moss text-paper font-bold text-[14px] inline-flex items-center justify-center gap-2 hover:bg-moss/90"
            >
                <ChatIcon /> Set it up on WhatsApp
            </a>
            <a href={whatsappLink(hello)} target="_blank" rel="noopener noreferrer" className="mt-2 block text-center text-[12.5px] font-bold text-ink-2 underline underline-offset-4 decoration-ink/20 hover:decoration-ink">
                Or just say hi on WhatsApp
            </a>
            {!WHATSAPP_NUMBER && (
                <p className="mt-2 text-[11.5px] text-ink-3 text-center">Prototype: no business number is set yet, so WhatsApp asks who to send it to.</p>
            )}
        </Card>
    );
}

function CallBackCard({ innerRef, pointed, onRequirement }) {
    return (
        <Card
            innerRef={innerRef}
            pointed={pointed}
            n={2}
            icon={<PhoneIcon />}
            title="We call you back"
            text="For one surface or a few: share your requirement and see what fits right now. We call within a day with options, and message you when a new lot fits."
        >
            <ul className="space-y-2 text-[13.5px] text-ink-2">
                {['The space and how much stone', 'Your budget', 'The stone you have in mind: a name, a photo or just a colour'].map((t) => (
                    <li key={t} className="flex gap-2">
                        <Check className="w-4 h-4 text-moss shrink-0 mt-0.5" /> {t}
                    </li>
                ))}
            </ul>
            <button onClick={() => onRequirement()} className="mt-5 w-full h-11 rounded-full bg-ink text-paper font-bold text-[14px] hover:bg-ink/90">
                Share your requirement
            </button>
            <p className="mt-2 text-[12px] text-ink-3 text-center">About two minutes. No payment.</p>
        </Card>
    );
}

function VideoCard({ innerRef, lot, pointed }) {
    const { day, time, picker } = useSlot();
    const [which, setWhich] = useState(lot ? lot.name : '');
    const [sent, setSent] = useState(null); // { day, time, which }
    // Paying is one step after the form (demo: no payment is taken).
    const [paying, setPaying] = useState(null); // { day, time, which } while paying
    const [method, setMethod] = useState('UPI');
    return (
        <Card
            innerRef={innerRef}
            pointed={pointed}
            n={3}
            icon={<VideoIcon />}
            title="See the slab on a video call"
            text="15 minutes on WhatsApp video. We show you the actual pieces in daylight, close up, and measure them while you watch. Only the stone is on camera."
        >
            <p className="-mt-1 mb-4 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-xl bg-paper-2/70 px-3 py-2">
                <span className="text-[18px] font-extrabold tabular-nums">{inr(VIDEO_CALL_FEE)}</span>
                <span className="text-[12.5px] text-ink-2">to book · counts towards your stone if you buy within {VIDEO_CREDIT_DAYS} days</span>
            </p>
            {sent ? (
                <div className="rounded-2xl bg-moss-soft p-4 fade-up" role="status">
                    <p className="font-bold text-moss text-[14.5px]">Video call booked · {inr(VIDEO_CALL_FEE)} paid (demo)</p>
                    <p className="mt-1 text-[13px] text-ink-2">
                        {sent.day.long}, {sent.time.label.toLowerCase()} ({sent.time.hours}){sent.which ? `, for ${sent.which}` : ''}. We message you on WhatsApp to fix the exact time,
                        then call on video. The {inr(VIDEO_CALL_FEE)} comes off your stone if you buy within {VIDEO_CREDIT_DAYS} days, and comes back to you if we miss the call.
                    </p>
                    <p className="mt-2 text-[11.5px] text-ink-3">Demo: no payment was taken and nothing was sent.</p>
                    <button onClick={() => setSent(null)} className="mt-3 h-9 px-3 rounded-full border border-ink/20 text-[12.5px] font-bold hover:border-ink">
                        Book another
                    </button>
                </div>
            ) : paying ? (
                <div className="rounded-2xl border border-ink/10 bg-paper/70 p-4 fade-up">
                    <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-3">Pay to book</p>
                    <p className="mt-1 text-[14px]">
                        <b>{inr(VIDEO_CALL_FEE)}</b> for a video call on {paying.day.long}, {paying.time.label.toLowerCase()} ({paying.time.hours})
                        {paying.which ? `, for ${paying.which}` : ''}.
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="How to pay">
                        {['UPI', 'Card', 'Netbanking'].map((m) => (
                            <button
                                key={m}
                                type="button"
                                role="radio"
                                aria-checked={method === m}
                                onClick={() => setMethod(m)}
                                className={`h-10 rounded-xl border text-[13px] font-bold ${method === m ? 'border-ink bg-white' : 'border-ink/15 bg-white/60 text-ink-2 hover:border-ink/40'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setSent(paying);
                            setPaying(null);
                        }}
                        className="mt-3 w-full h-11 rounded-full bg-ink text-paper font-bold text-[14px] hover:bg-ink/90"
                    >
                        Pay {inr(VIDEO_CALL_FEE)} by {method === 'Netbanking' ? 'netbanking' : method}
                    </button>
                    <button type="button" onClick={() => setPaying(null)} className="mt-1.5 w-full text-[12.5px] font-bold text-ink-2 hover:text-ink">
                        Back
                    </button>
                    <p className="mt-2 text-[11.5px] text-ink-3 text-center">Demo: no payment is taken. Live: Razorpay, after your number is checked by OTP.</p>
                </div>
            ) : (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setPaying({ day, time, which: which.trim() });
                    }}
                >
                    {picker}
                    <label className="mt-3 block">
                        <Label>Which lot? (optional)</Label>
                        <input
                            value={which}
                            onChange={(e) => setWhich(e.target.value)}
                            placeholder="Not sure yet? We'll show you a few"
                            className="mt-1.5 w-full h-10 rounded-xl border border-ink/15 bg-white px-3 text-[13.5px] outline-none focus:border-ink"
                        />
                    </label>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <label className="block">
                            <Label>Your name</Label>
                            <input required className="mt-1.5 w-full h-10 rounded-xl border border-ink/15 bg-white px-3 text-[13.5px] outline-none focus:border-ink" />
                        </label>
                        <label className="block">
                            <Label>Mobile</Label>
                            <input
                                required
                                inputMode="numeric"
                                pattern="[0-9]{10}"
                                maxLength={10}
                                title="10-digit mobile number"
                                className="mt-1.5 w-full h-10 rounded-xl border border-ink/15 bg-white px-3 text-[13.5px] outline-none focus:border-ink"
                            />
                        </label>
                    </div>
                    <button className="mt-4 w-full h-11 rounded-full bg-ink text-paper font-bold text-[14px] inline-flex items-center justify-center gap-2 hover:bg-ink/90">
                        <VideoIcon /> Book the call · {inr(VIDEO_CALL_FEE)}
                    </button>
                    <p className="mt-2 text-[12px] text-ink-3 text-center">Refunded in full if we miss the call.</p>
                </form>
            )}
        </Card>
    );
}

function DirectCard({ innerRef, lot, pointed, onDirect, onBrowse }) {
    const fee = lot ? directFee(lot) : DIRECT_FEE.base;
    return (
        <Card
            innerRef={innerRef}
            pointed={pointed}
            n={4}
            icon={<KeyIcon />}
            title="Buy direct from the yard"
            text={`Found the lot you want? Pay a one-time fee${lot ? '' : ' (from ' + inr(DIRECT_FEE.base) + ')'} and get the yard's name, address and contact to deal with them yourself: this lot and anything else they have.`}
        >
            <ul className="space-y-2 text-[13.5px] text-ink-2">
                {['Shown only after payment', 'Full refund if the lot is gone or the details are wrong', 'We tell the yard you are coming'].map((t) => (
                    <li key={t} className="flex gap-2">
                        <Check className="w-4 h-4 text-moss shrink-0 mt-0.5" /> {t}
                    </li>
                ))}
            </ul>
            {lot ? (
                <button onClick={() => onDirect(lot)} className="mt-5 w-full h-11 rounded-full bg-ink text-paper font-bold text-[14px] hover:bg-ink/90">
                    Get the yard&apos;s details · {inr(fee)}
                </button>
            ) : (
                <button onClick={onBrowse} className="mt-5 w-full h-11 rounded-full border border-ink/20 font-bold text-[14px] hover:border-ink">
                    Find your lot first
                </button>
            )}
            <p className="mt-2 text-[12px] text-ink-3 text-center">
                {lot ? `For ${lot.name}. UPI, card or netbanking.` : `Open any lot and choose "Buy direct". ${inr(DIRECT_FEE.base)}, or ${inr(DIRECT_FEE.large)} for lots worth ${inr(DIRECT_FEE.largeFrom)} or more.`}
            </p>
        </Card>
    );
}

/** The whole-project way: wide and dark, because it is the biggest job we take on. */
function ProjectCard({ innerRef, pointed, onProject }) {
    return (
        <section
            ref={innerRef}
            className={`md:col-span-2 rounded-[20px] bg-ink text-paper p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 scroll-mt-4 ${pointed ? 'ring-2 ring-clay ring-offset-2 ring-offset-paper' : ''}`}
            aria-labelledby="contact-project"
        >
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#E7A27F]">For a whole home or several rooms</p>
                <h3 id="contact-project" className="mt-1 font-bold text-[20px] leading-snug">
                    Plan a whole project with us
                </h3>
                <p className="mt-1 text-[13.5px] text-paper/75 leading-relaxed max-w-[620px]">
                    A project lead plans the stone for every space: full slabs and blocks as well as small lots, samples, a site visit if it helps, and one delivery
                    schedule. Bring your plans or your architect.
                </p>
            </div>
            <button onClick={onProject} className="h-11 px-5 rounded-full bg-paper text-ink font-bold text-[14px] shrink-0 hover:bg-white">
                Start a project
            </button>
        </section>
    );
}
