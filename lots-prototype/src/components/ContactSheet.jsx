import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BRAND } from '../lib/brand';
import { lotLine, meetingDays, meetingMessage, timesOn, WHATSAPP_NUMBER, whatsappLink } from '../lib/contact';
import { ChatIcon, Check, Chip, Close, PhoneIcon } from './ui';

/**
 * "Talk to us": ways to reach a person, side by side.
 *   1. Meet on WhatsApp: pick a day and time, and WhatsApp opens with the
 *      request written. The lead lands in the business WhatsApp inbox.
 *   2. We call you back: Find your Stone (RequirementSheet).
 *   And, first and wide: plan a whole project (ProjectSheet), for a whole home
 *   or several rooms, with a project lead and every kind of stone, not only
 *   small lots.
 * The video call and "Buy direct" were taken out on 2026-11-17: the 2% booking
 * advance (BookingSheet) now gives a buyer the yard's details to visit.
 *
 * `lot`: the lot they were looking at, if any, written into both messages.
 * `focus`: which way to point at first ('whatsapp' | 'call' | 'video').
 *
 * Prototype: the video-call form sends nothing. In production it saves to
 * `contact_requests` through a server route after phone OTP, and alerts the
 * team on Telegram, like the requirement.
 */
export default function ContactSheet({ lot, focus, onRequirement, onProject, onClose }) {
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
                    <h2 className="mt-1 font-brand text-[34px] md:text-[42px] leading-[1.02]">Three ways to work with us.</h2>
                    <p className="mt-2 text-[14px] text-ink-2 max-w-[620px]">
                        {lot ? `About ${lot.name}, or anything else. ` : ''}Talk to a person. Our team answers every day, 10 am to 8 pm.
                    </p>
                </div>

                <div className="px-5 md:px-8 pb-6 md:pb-8 grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 gap-4 items-start">
                    <ProjectCard innerRef={refFor('project')} pointed={focus === 'project'} onProject={onProject} />
                    <WhatsAppCard innerRef={refFor('whatsapp')} lot={lot} pointed={focus === 'whatsapp'} />
                    <CallBackCard innerRef={refFor('call')} pointed={focus === 'call'} onRequirement={onRequirement} />
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
            <a
                href={whatsappLink(hello)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-center text-[12.5px] font-bold text-ink-2 underline underline-offset-4 decoration-ink/20 hover:decoration-ink"
            >
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
                Find your Stone
            </button>
            <p className="mt-2 text-[12px] text-ink-3 text-center">About two minutes. No payment.</p>
        </Card>
    );
}

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
                    A project lead plans the stone for every space: full slabs and blocks as well as small lots, samples, a site visit if it helps, and one
                    delivery schedule. Bring your plans or your architect.
                </p>
            </div>
            <button onClick={onProject} className="h-11 px-5 rounded-full bg-paper text-ink font-bold text-[14px] shrink-0 hover:bg-white">
                Start a project
            </button>
        </section>
    );
}
