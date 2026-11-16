import React, { useEffect, useRef, useState } from 'react';
import { Check, Chip, Close } from './ui';

const KINDS = ['Whole house', 'Several rooms', 'One room', 'Office or shop'];
const STAGES = ['Planning', 'Under construction', 'Renovating'];
const AREAS = ['Living & dining', 'Kitchen', 'Bathrooms', 'Bedrooms', 'Pooja room', 'Staircase', 'Floors throughout', 'Outside & facade', 'Something else'];
const BUDGETS = ['Under ₹2 lakh', '₹2–5 lakh', '₹5–10 lakh', '₹10–25 lakh', 'Over ₹25 lakh', 'Not sure yet'];

/**
 * "Plan a whole project": for a buyer doing up a whole home (or several rooms,
 * or a shop), not one surface. A project lead takes it from there: goes through
 * the plans, visits the site if it helps, and puts together stone for every
 * space, full slabs and blocks as well as small lots, with samples and one
 * delivery schedule. The biggest lead the site gets, so it asks for what the
 * team needs to call back prepared, and nothing that can wait for the call.
 *
 * Prototype: nothing is sent or stored. Production: `project_requests` (and the
 * files in a private bucket) through a server route after phone OTP, with a
 * Telegram alert to the team.
 */
export default function ProjectSheet({ onClose }) {
    const [kind, setKind] = useState(KINDS[0]);
    const [stage, setStage] = useState(STAGES[0]);
    const [areas, setAreas] = useState(['Living & dining', 'Kitchen', 'Bathrooms']);
    const [budget, setBudget] = useState(BUDGETS[5]);
    const [designer, setDesigner] = useState('no');
    const [files, setFiles] = useState([]); // names only: shown here, never uploaded
    const [sent, setSent] = useState(null);
    const city = useRef(null);

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

    const toggleArea = (a) => setAreas((as) => (as.includes(a) ? as.filter((x) => x !== a) : [...as, a]));
    const box = 'w-full h-11 rounded-xl border border-ink/15 bg-white px-3 text-[14px] outline-none focus:border-ink';
    const input = `mt-1 ${box}`;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label="Plan a whole project">
            <button className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] scene-fade" onClick={onClose} aria-label="Close" />
            <div className="relative sheet-in bg-paper w-full md:w-[min(980px,94vw)] max-h-[94svh] md:max-h-[92vh] rounded-t-[26px] md:rounded-[26px] overflow-y-auto shadow-float">
                <div className="p-5 md:p-8 pr-14">
                    <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-clay">Plan a whole project</p>
                    <h2 className="mt-1 font-brand text-[34px] md:text-[42px] leading-[1.02]">Stone for the whole home, planned with you.</h2>
                    <p className="mt-2 text-[14px] text-ink-2 max-w-[640px]">
                        Tell us about the project. A project lead calls you, goes through your plans, and puts together stone for every space: full slabs and blocks as well as
                        small lots, with samples and one delivery schedule.
                    </p>
                </div>

                <div className="px-5 md:px-8 pb-6 md:pb-8 grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6 md:gap-8 items-start">
                    {sent ? (
                        <div className="rounded-[20px] bg-moss-soft p-5 md:p-6 fade-up" role="status">
                            <p className="font-bold text-moss text-[16px]">Project shared (demo)</p>
                            <p className="mt-1 text-[14px] text-ink-2">
                                {sent.kind} in {sent.city || 'your city'}, {sent.stage.toLowerCase()}: {sent.areas.join(', ').toLowerCase() || 'all spaces'}. Stone budget:{' '}
                                {sent.budget.toLowerCase()}.{sent.files ? ` ${sent.files} ${sent.files === 1 ? 'file' : 'files'} attached.` : ''}
                            </p>
                            <ul className="mt-4 space-y-2 text-[13.5px] text-ink-2">
                                {[
                                    'A project lead calls you within a day to go through the plans.',
                                    'If it helps, they visit the site to measure and see the light.',
                                    'You get a stone plan for every space, with samples, prices and one delivery schedule.',
                                ].map((t) => (
                                    <li key={t} className="flex gap-2">
                                        <Check className="w-4 h-4 text-moss shrink-0 mt-0.5" /> {t}
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-3 text-[12px] text-ink-3">This is how the live version would work. Nothing was sent from this prototype.</p>
                            <button onClick={onClose} className="mt-4 h-10 px-4 rounded-full border border-ink/20 text-[13px] font-bold hover:border-ink">
                                Done
                            </button>
                        </div>
                    ) : (
                        <form
                            className="space-y-6"
                            onSubmit={(e) => {
                                e.preventDefault();
                                setSent({ kind, stage, areas, budget, city: city.current?.value.trim(), files: files.length });
                            }}
                        >
                            <Field label="What is the project?">
                                <div className="flex flex-wrap gap-1.5">
                                    {KINDS.map((k) => (
                                        <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
                                            {k}
                                        </Chip>
                                    ))}
                                </div>
                            </Field>
                            <Field label="Which spaces need stone?" hint="Pick all that apply.">
                                <div className="flex flex-wrap gap-1.5">
                                    {AREAS.map((a) => (
                                        <Chip key={a} active={areas.includes(a)} onClick={() => toggleArea(a)}>
                                            {areas.includes(a) && <Check className="w-3 h-3" />}
                                            {a}
                                        </Chip>
                                    ))}
                                </div>
                            </Field>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <Field label="Where is it?">
                                    <input ref={city} placeholder="City" className={input} />
                                </Field>
                                <Field label="Total area (optional)">
                                    <div className="flex items-center gap-2">
                                        <input inputMode="numeric" placeholder="e.g. 2,400" className={box} />
                                        <span className="text-[14px] text-ink-2 shrink-0">sq ft</span>
                                    </div>
                                </Field>
                            </div>
                            <Field label="Where are you with it?">
                                <div className="flex flex-wrap gap-1.5">
                                    {STAGES.map((s) => (
                                        <Chip key={s} active={stage === s} onClick={() => setStage(s)}>
                                            {s}
                                        </Chip>
                                    ))}
                                </div>
                            </Field>
                            <Field label="Budget for the stone">
                                <div className="flex flex-wrap gap-1.5">
                                    {BUDGETS.map((b) => (
                                        <Chip key={b} active={budget === b} onClick={() => setBudget(b)}>
                                            {b}
                                        </Chip>
                                    ))}
                                </div>
                            </Field>
                            <Field label="Working with an architect or interior designer?">
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        ['yes', 'Yes'],
                                        ['no', 'No'],
                                    ].map(([v, l]) => (
                                        <Chip key={v} active={designer === v} onClick={() => setDesigner(v)}>
                                            {l}
                                        </Chip>
                                    ))}
                                </div>
                                {designer === 'yes' && <input placeholder="Their name or studio (optional): we can work with them directly" className={input} />}
                            </Field>
                            <Field label="Plans, drawings or photos (optional)" hint="Floor plans, elevations, a mood board, photos of the site. Shared only with your project lead.">
                                <label className="flex items-center gap-3 rounded-xl border-2 border-dashed border-ink/20 bg-white/50 px-4 py-3 cursor-pointer hover:bg-white transition-colors">
                                    <span className="text-[22px] leading-none text-ink-3" aria-hidden="true">
                                        +
                                    </span>
                                    <span className="text-[13.5px]">
                                        <b>{files.length ? `${files.length} ${files.length === 1 ? 'file' : 'files'} added` : 'Add files'}</b>
                                        {files.length > 0 && <span className="block text-[12px] text-ink-3 truncate max-w-[420px]">{files.join(', ')}</span>}
                                    </span>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,application/pdf"
                                        className="sr-only"
                                        onChange={(e) => {
                                            const names = [...(e.target.files || [])].map((f) => f.name);
                                            e.target.value = '';
                                            if (names.length) setFiles((fs) => [...fs, ...names].slice(0, 10));
                                        }}
                                    />
                                </label>
                            </Field>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <label className="block">
                                    <span className="text-[12px] font-semibold text-ink-3">Your name</span>
                                    <input required className={input} />
                                </label>
                                <label className="block">
                                    <span className="text-[12px] font-semibold text-ink-3">Mobile number</span>
                                    <div className="mt-1 flex h-11 rounded-xl border border-ink/15 bg-white focus-within:border-ink">
                                        <span className="px-3 grid place-items-center text-[14px] text-ink-3 border-r border-ink/10">+91</span>
                                        <input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} title="10-digit mobile number" className="flex-1 min-w-0 px-3 text-[14px] outline-none bg-transparent" />
                                    </div>
                                </label>
                                <label className="block sm:col-span-2">
                                    <span className="text-[12px] font-semibold text-ink-3">Anything we should know? (optional)</span>
                                    <textarea
                                        rows={2}
                                        placeholder="The look you want, stones you like, a move-in date…"
                                        className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-[14px] outline-none focus:border-ink resize-none"
                                    />
                                </label>
                            </div>
                            <div>
                                <button className="w-full h-12 rounded-full bg-ink text-paper font-bold text-[15px] hover:bg-ink/90">Share the project</button>
                                <p className="mt-2 text-[12px] text-ink-3 text-center">Free, no obligation. Demo: nothing is sent from this prototype.</p>
                            </div>
                        </form>
                    )}

                    <aside className="rounded-[20px] bg-ink text-paper p-5 md:p-6 md:sticky md:top-4">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#E7A27F]">What you get</p>
                        <ul className="mt-3 space-y-3 text-[14px] text-paper/85">
                            {[
                                ['One project lead', 'One person for the whole job, from the first call to the last delivery.'],
                                ['Every kind of stone', 'Full slabs and blocks from our yards as well as small lots, so every space gets the right stone, not only what is left over.'],
                                ['A stone plan per space', 'Options for each room with prices, so the whole home works together.'],
                                ['Samples and a site visit', 'Pieces to see in your own light, and measuring on site when it helps.'],
                                ['One delivery schedule', 'Delivered in the order the site needs it.'],
                            ].map(([t, d]) => (
                                <li key={t} className="flex gap-2.5">
                                    <Check className="w-4 h-4 text-[#E7A27F] shrink-0 mt-1" />
                                    <span>
                                        <b className="text-paper">{t}.</b> {d}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </aside>
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

const Field = ({ label, hint, children }) => (
    <div>
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">{label}</p>
        <div className="mt-2">{children}</div>
        {hint && <p className="mt-1.5 text-[12.5px] text-ink-3">{hint}</p>}
    </div>
);
