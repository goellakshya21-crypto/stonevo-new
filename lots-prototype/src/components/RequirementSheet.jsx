import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FAMILIES, inr, jobFor, jobLabel, SPACES } from '../lib/lots';
import { COLOUR_GROUPS, lotsNamed, matchLots } from '../lib/requirements';
import { CameraIcon } from './RoomUpload';
import { Arrow, Check, Chip, Close, Pin } from './ui';

// Decided 2026-11-17: 'Within 1 week' added (we answer those within 24 hours); 'Just exploring' became '3 months +'.
const TIMELINES = ['Within 1 week', 'This month', 'In 1–3 months', '3 months +'];
const OTHER = { id: 'other', label: 'Something else', sqft: 40, hint: 'Tell us in the note' };
const CHOICES = [...SPACES, OTHER];
// Three ways to say which stone: whichever the buyer has.
const IDEAS = [
    { id: 'name', label: 'Its name' },
    { id: 'photo', label: 'A photo' },
    { id: 'colour', label: 'Its colour' },
];
// Requirements in one share (a vanity top, a kitchen counter, a pooja room…).
const MAX_ITEMS = 5;

// One requirement. A new one starts on a space the buyer has not picked yet.
let seq = 0;
const newItem = (prefill = {}, taken = []) => {
    const spaceId = prefill.space || (taken.length ? SPACES.find((s) => !taken.includes(s.id))?.id : null) || 'bath';
    const space = CHOICES.find((s) => s.id === spaceId) || OTHER;
    return {
        key: `${Date.now().toString(36)}-${++seq}`,
        spaceId,
        sqft: prefill.sqft || space.sqft,
        families: [],
        idea: 'name',
        stoneName: '',
        photo: null, // { url, name }
        colours: [],
    };
};

/** Everything the sheet shows about one requirement, worked out from it. */
function analyse(lots, it) {
    const space = CHOICES.find((s) => s.id === it.spaceId) || OTHER;
    const need = Math.max(1, Number(it.sqft) || space.sqft);
    const reqSpace = it.spaceId === 'other' ? '' : it.spaceId;
    const named = lotsNamed(lots, it.stoneName);
    // A name we have in stock narrows the list to it; one we don't is still
    // shared with the team, who look for it.
    const ids = named.length ? new Set(named.map((l) => l.id)) : null;
    const nameTyped = it.stoneName.trim().length >= 3;
    const colourNames = COLOUR_GROUPS.filter((g) => it.colours.includes(g.id)).map((g) => g.label.toLowerCase());
    const req = { spaceId: reqSpace, sqft: need, families: it.families, colours: it.colours, ids };
    // No budget (decided 2026-11-15): the buyer says the space, the size and
    // the stone; the price of each lot that fits is shown for their size.
    const matches = matchLots(lots, req);
    return {
        space,
        need,
        reqSpace,
        named,
        ids,
        nameTyped,
        colourNames,
        matches,
        what: it.spaceId === 'other' ? 'your space' : `a ${space.label.toLowerCase()}`,
        stone: [nameTyped && `“${it.stoneName.trim()}”`, it.photo && 'your photo', colourNames.length && colourNames.join(' or ')].filter(Boolean),
        filled: { name: nameTyped, photo: !!it.photo, colour: it.colours.length > 0 },
    };
}

/**
 * "Share your requirement": one or more requirements (the space, its size,
 * the stone in mind), with the lots that fit the one being edited
 * shown live, and a way to leave a number once for all of them so the team
 * can call or send a match later.
 *
 * Prototype form: nothing is sent or stored. In production it saves one
 * `lot_requests` row per requirement through a server route after phone OTP
 * (the existing flow), alerts the team on Telegram, and each is matched
 * against every new lot.
 */
export default function RequirementSheet({ lots, prefill, onOpenLot, onSeeAll, onClose }) {
    const [items, setItems] = useState(() => [newItem(prefill || {})]);
    const [active, setActive] = useState(0);
    const [timeline, setTimeline] = useState(TIMELINES[0]);
    const [sent, setSent] = useState(false);
    const [photoError, setPhotoError] = useState('');
    const formRef = useRef(null);

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

    // Photos are only previewed here (object URLs), never uploaded; freed when the sheet closes.
    const photoUrls = useRef(new Set());
    useEffect(() => {
        const urls = photoUrls.current;
        return () => urls.forEach((u) => URL.revokeObjectURL(u));
    }, []);

    const item = items[active] || items[0];
    const set = (patch) => setItems((its) => its.map((it, i) => (i === active ? { ...it, ...patch } : it)));
    const all = useMemo(() => items.map((it) => analyse(lots, it)), [lots, items]);
    const a = all[active] || all[0];
    const names = useMemo(() => [...new Set(lots.map((l) => l.name))].sort(), [lots]);
    const many = items.length > 1;

    const takePhoto = (file) => {
        if (!file.type.startsWith('image/')) {
            setPhotoError('That is not a picture. Choose a JPG or PNG.');
            return;
        }
        setPhotoError('');
        const url = URL.createObjectURL(file);
        photoUrls.current.add(url);
        set({ photo: { url, name: file.name } });
    };
    const pickSpace = (s) => set({ spaceId: s.id, sqft: s.sqft });
    const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
    const addItem = () => {
        if (items.length >= MAX_ITEMS) return;
        setItems((its) => [
            ...its,
            newItem(
                {},
                its.map((it) => it.spaceId),
            ),
        ]);
        setActive(items.length);
        setPhotoError('');
        formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
    const removeItem = (i) => {
        if (items.length < 2) return;
        setItems((its) => its.filter((_, j) => j !== i));
        setActive((cur) => (cur > i ? cur - 1 : cur === i ? Math.max(0, i - 1) : cur));
    };
    const switchTo = (i) => {
        setActive(i);
        setPhotoError('');
    };

    const matchesPanel = (
        <div className="rounded-[20px] bg-white/80 border border-ink/10 p-4 md:p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-clay">Options right now{many ? ` · requirement ${active + 1}` : ''}</p>
            <p className="mt-1 font-brand text-[30px] leading-none">
                {a.matches.length ? `${a.matches.length} ${a.matches.length === 1 ? 'option' : 'options'}` : 'No options yet'}
            </p>
            <p className="mt-1 text-[13px] text-ink-2">
                for {a.what} of {a.need} sq ft
                {a.ids && `, named “${item.stoneName.trim()}”`}
                {a.colourNames.length > 0 && `, in ${a.colourNames.join(' or ')}`}
            </p>

            {a.matches.length > 0 ? (
                <>
                    <ul className="mt-4 space-y-2">
                        {a.matches.slice(0, 4).map((l) => (
                            <li key={l.id}>
                                <button
                                    type="button"
                                    onClick={() => onOpenLot(l, { sceneId: SPACES.find((s) => s.id === item.spaceId)?.room })}
                                    className="w-full flex items-center gap-3 rounded-xl p-2 -mx-2 text-left hover:bg-paper-2 transition-colors"
                                >
                                    <img src={l.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-bold text-[14px] truncate">{l.name}</span>
                                        <span className="block text-[12px] text-ink-3 truncate">
                                            {l.family} · <Pin className="w-3 h-3 inline -mt-0.5" /> {l.city.name} · {l.discountPct}% under market
                                        </span>
                                    </span>
                                    <span className="text-right shrink-0">
                                        <span className="block font-extrabold text-[14px] tabular-nums">{inr(jobFor(l, a.need).cost)}</span>
                                        <span className="block text-[11.5px] text-ink-3 tabular-nums">{jobLabel(jobFor(l, a.need))}</span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        onClick={() => onSeeAll({ space: a.reqSpace, size: a.need })}
                        className="mt-3 w-full h-11 rounded-full border border-ink/20 font-bold text-[13.5px] inline-flex items-center justify-center gap-2 hover:border-ink"
                    >
                        See {a.matches.length > 4 ? `all ${a.matches.length}` : 'them'} in the gallery <Arrow />
                    </button>
                </>
            ) : (
                <div className="mt-4 text-[13.5px] text-ink-2 space-y-3">
                    <p className="font-semibold text-ink">No options available right now, but we will find the right stone for you within 48 hours.</p>
                    <p className="text-ink-3 text-[12.5px]">Share your requirement below and we&apos;ll message you with it.</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label="Find your Stone">
            <button className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] scene-fade" onClick={onClose} aria-label="Close" />
            <div className="relative sheet-in bg-paper w-full md:w-[min(1080px,94vw)] max-h-[94svh] md:max-h-[90vh] rounded-t-[26px] md:rounded-[26px] overflow-y-auto shadow-float">
                <div className="p-5 md:p-8 pr-14">
                    <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-clay">Find your Stone</p>
                    <h2 className="mt-1 font-brand text-[34px] md:text-[42px] leading-[1.02]">Tell us the space and the stone.</h2>
                    <p className="mt-2 text-[14px] text-ink-2 max-w-[560px]">
                        See the options right now, and leave your number: our team calls with options, and messages you when a new lot fits. Need stone for more
                        than one place? Add each one.
                    </p>
                </div>

                <div className="px-5 md:px-8 pb-6 md:pb-8 grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-6 md:gap-8 items-start">
                    {sent ? (
                        <Sent all={all} timeline={timeline} onSeeAll={(x) => onSeeAll({ space: x.reqSpace, size: x.need })} onClose={onClose} />
                    ) : (
                        <form
                            ref={formRef}
                            className="space-y-6 scroll-mt-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                setSent(true);
                            }}
                        >
                            <Field
                                label="Your requirements"
                                hint={
                                    many
                                        ? 'Each one is matched on its own. Pick one to change it.'
                                        : 'Several stones or places? Add each one; one number for all of them.'
                                }
                            >
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {items.map((it, i) => {
                                        const x = all[i];
                                        const on = i === active;
                                        return (
                                            <span
                                                key={it.key}
                                                className={`inline-flex items-center rounded-full border transition-colors ${on ? 'bg-ink text-paper border-ink' : 'bg-white/60 text-ink-2 border-ink/15 hover:border-ink/40'}`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => switchTo(i)}
                                                    aria-pressed={on}
                                                    className={`h-9 pl-1.5 ${many ? 'pr-1.5' : 'pr-3'} text-[12.5px] font-bold inline-flex items-center gap-1.5`}
                                                >
                                                    <span
                                                        className={`w-6 h-6 rounded-full grid place-items-center text-[11px] ${on ? 'bg-paper text-ink' : 'bg-paper-2 text-ink'}`}
                                                    >
                                                        {i + 1}
                                                    </span>
                                                    {x.space.id === 'other' ? 'Something else' : x.space.label}
                                                    <span className={`font-semibold tabular-nums ${on ? 'text-paper/70' : 'text-ink-3'}`}>
                                                        ·{' '}
                                                        {x.matches.length ? `${x.matches.length} ${x.matches.length === 1 ? 'option' : 'options'}` : 'none yet'}
                                                    </span>
                                                </button>
                                                {many && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(i)}
                                                        aria-label={`Remove requirement ${i + 1}`}
                                                        className={`h-9 pl-0.5 pr-2.5 grid place-items-center ${on ? 'text-paper/70 hover:text-paper' : 'text-ink-3 hover:text-ink'}`}
                                                    >
                                                        <Close className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </span>
                                        );
                                    })}
                                    {items.length < MAX_ITEMS && (
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="h-9 px-3.5 rounded-full border border-dashed border-ink/30 text-[12.5px] font-bold text-ink hover:border-ink"
                                        >
                                            + Add another stone
                                        </button>
                                    )}
                                </div>
                            </Field>

                            <Field label={many ? `What's requirement ${active + 1} for?` : "What's it for?"}>
                                <div className="flex flex-wrap gap-1.5">
                                    {CHOICES.map((s) => (
                                        <Chip key={s.id} active={item.spaceId === s.id} onClick={() => pickSpace(s)}>
                                            {s.label}
                                        </Chip>
                                    ))}
                                </div>
                            </Field>

                            <Field
                                label="How much stone?"
                                hint={
                                    item.spaceId === 'other'
                                        ? 'A rough figure is fine.'
                                        : `A typical ${a.space.label.toLowerCase()} is ${a.space.sqft} sq ft (${a.space.hint.toLowerCase()}). Change it if you know yours.`
                                }
                            >
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        inputMode="numeric"
                                        value={item.sqft}
                                        onChange={(e) => set({ sqft: e.target.value })}
                                        className="w-28 h-11 rounded-xl border border-ink/15 bg-white px-3 text-[15px] font-bold outline-none focus:border-ink tabular-nums"
                                        aria-label="Square feet"
                                    />
                                    <span className="text-[14px] text-ink-2">sq ft</span>
                                </div>
                            </Field>

                            {/* On phones the matches sit right under the size, where they react. */}
                            <div className="md:hidden">{matchesPanel}</div>

                            <Field label="Have a stone in mind?" hint="Optional. Any one helps: its name, a photo of it, or just the colour.">
                                <div role="tablist" aria-label="How to describe the stone" className="inline-flex flex-wrap rounded-full bg-paper-2 p-1 gap-1">
                                    {IDEAS.map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={item.idea === t.id}
                                            onClick={() => set({ idea: t.id })}
                                            className={`h-9 px-3.5 rounded-full text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors ${
                                                item.idea === t.id ? 'bg-white shadow-sm text-ink' : 'text-ink-2 hover:text-ink'
                                            }`}
                                        >
                                            {t.label}
                                            {a.filled[t.id] && <span className="w-1.5 h-1.5 rounded-full bg-moss" aria-label="(added)" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-3" role="tabpanel">
                                    {item.idea === 'name' && (
                                        <>
                                            <input
                                                list="lot-stone-names"
                                                value={item.stoneName}
                                                onChange={(e) => set({ stoneName: e.target.value })}
                                                placeholder="e.g. Statuario, Carrara, Kota"
                                                aria-label="Stone name"
                                                className="w-full h-11 rounded-xl border border-ink/15 bg-white px-3 text-[14px] outline-none focus:border-ink"
                                            />
                                            <datalist id="lot-stone-names">
                                                {names.map((n) => (
                                                    <option key={n} value={n} />
                                                ))}
                                            </datalist>
                                            <p className={`mt-1.5 text-[12.5px] ${a.nameTyped && !a.named.length ? 'text-clay font-semibold' : 'text-ink-3'}`}>
                                                {!a.nameTyped
                                                    ? 'Part of the name is fine.'
                                                    : a.named.length
                                                      ? `${a.named.length} in stock as ${a.named.length === 1 ? 'a lot' : 'lots'}: the list now shows only ${a.named.length === 1 ? 'that stone' : 'those'}.`
                                                      : "Not in a lot right now. We'll look for it and message you when one comes in."}
                                            </p>
                                        </>
                                    )}
                                    {item.idea === 'photo' &&
                                        (item.photo ? (
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={item.photo.url}
                                                    alt="The stone you have in mind"
                                                    className="w-20 h-20 rounded-xl object-cover border border-ink/10 shrink-0"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-[13.5px] truncate">{item.photo.name}</p>
                                                    <p className="text-[12.5px] text-ink-3">Our team matches it by eye and calls you with the closest lots.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => set({ photo: null })}
                                                    className="h-9 px-3 rounded-full border border-ink/20 text-[12.5px] font-bold hover:border-ink shrink-0"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center gap-3 rounded-xl border-2 border-dashed border-ink/20 bg-white/50 px-4 py-3 cursor-pointer hover:bg-white transition-colors">
                                                <CameraIcon className="w-5 h-5 text-ink-2 shrink-0" />
                                                <span>
                                                    <span className="block font-bold text-[13.5px]">Add a photo</span>
                                                    <span className="block text-[12.5px] text-ink-3">
                                                        Of the stone, a sample, or a room you liked. Best when you don&apos;t know its name.
                                                    </span>
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="sr-only"
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0];
                                                        e.target.value = '';
                                                        if (f) takePhoto(f);
                                                    }}
                                                />
                                            </label>
                                        ))}
                                    {item.idea === 'photo' && photoError && <p className="mt-1.5 text-[12.5px] text-clay font-semibold">{photoError}</p>}
                                    {item.idea === 'colour' && (
                                        <>
                                            <div className="flex flex-wrap gap-1.5">
                                                {COLOUR_GROUPS.map((g) => (
                                                    <Chip
                                                        key={g.id}
                                                        active={item.colours.includes(g.id)}
                                                        onClick={() => set({ colours: toggle(item.colours, g.id) })}
                                                    >
                                                        <span
                                                            className="w-3.5 h-3.5 rounded-full border border-ink/20"
                                                            style={{ background: g.hex }}
                                                            aria-hidden="true"
                                                        />
                                                        {g.label}
                                                    </Chip>
                                                ))}
                                            </div>
                                            <p className="mt-1.5 text-[12.5px] text-ink-3">Pick one or more. The list narrows to stones in those colours.</p>
                                        </>
                                    )}
                                </div>
                            </Field>

                            <Field label="Type of stone" hint="Optional. Leave it open to see every stone that suits the space.">
                                <div className="flex flex-wrap gap-1.5">
                                    {FAMILIES.map((f) => (
                                        <Chip key={f} active={item.families.includes(f)} onClick={() => set({ families: toggle(item.families, f) })}>
                                            {item.families.includes(f) && <Check className="w-3 h-3" />}
                                            {f}
                                        </Chip>
                                    ))}
                                </div>
                            </Field>

                            {items.length < MAX_ITEMS && (
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="w-full h-11 rounded-full border border-dashed border-ink/30 text-[13.5px] font-bold hover:border-ink"
                                >
                                    + Add another stone or place
                                </button>
                            )}

                            <div className="border-t border-ink/10 pt-6 space-y-6">
                                <Field
                                    label={many ? `When do you need them? (all ${items.length})` : 'When do you need it?'}
                                    hint={timeline === 'Within 1 week' ? 'We respond within 24 hours.' : undefined}
                                >
                                    <div className="flex flex-wrap gap-1.5">
                                        {TIMELINES.map((t) => (
                                            <Chip key={t} active={timeline === t} onClick={() => setTimeline(t)}>
                                                {t}
                                            </Chip>
                                        ))}
                                    </div>
                                </Field>

                                <div className="grid sm:grid-cols-2 gap-3">
                                    <label className="block">
                                        <span className="text-[12px] font-semibold text-ink-3">Your name</span>
                                        <input
                                            required
                                            className="mt-1 w-full h-11 rounded-xl border border-ink/15 bg-white px-3 text-[14px] outline-none focus:border-ink"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[12px] font-semibold text-ink-3">Mobile number</span>
                                        <div className="mt-1 flex h-11 rounded-xl border border-ink/15 bg-white focus-within:border-ink">
                                            <span className="px-3 grid place-items-center text-[14px] text-ink-3 border-r border-ink/10">+91</span>
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
                                    <label className="block">
                                        <span className="text-[12px] font-semibold text-ink-3">Delivery pincode</span>
                                        <input
                                            required
                                            inputMode="numeric"
                                            pattern="[0-9]{6}"
                                            maxLength={6}
                                            title="6-digit pincode"
                                            className="mt-1 w-full h-11 rounded-xl border border-ink/15 bg-white px-3 text-[14px] outline-none focus:border-ink"
                                        />
                                    </label>
                                    <label className="block sm:col-span-2">
                                        <span className="text-[12px] font-semibold text-ink-3">Anything else? (optional)</span>
                                        <textarea
                                            rows={2}
                                            placeholder="Finish, the room's size, a deadline…"
                                            className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-[14px] outline-none focus:border-ink resize-none"
                                        />
                                    </label>
                                </div>

                                <div>
                                    <button className="w-full h-12 rounded-full bg-ink text-paper font-bold text-[15px] hover:bg-ink/90 transition-colors">
                                        {many ? `Share my ${items.length} requirements` : 'Share my requirement'}
                                    </button>
                                    <p className="mt-2 text-[12px] text-ink-3 text-center">Free, and no payment. Demo: nothing is sent from this prototype.</p>
                                </div>
                            </div>
                        </form>
                    )}

                    <div className="hidden md:block md:sticky md:top-4">{matchesPanel}</div>
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

function Sent({ all, timeline, onSeeAll, onClose }) {
    const many = all.length > 1;
    const fitting = all.filter((x) => x.matches.length).length;
    const cap = (s) => s[0].toUpperCase() + s.slice(1);
    return (
        <div className="rounded-[20px] bg-moss-soft p-5 md:p-6 fade-up">
            <p className="font-bold text-moss text-[16px]">{many ? `${all.length} requirements shared (demo)` : 'Requirement shared (demo)'}</p>
            <ol className="mt-3 space-y-2">
                {all.map((x, i) => (
                    <li key={i} className="rounded-xl bg-white/70 px-3.5 py-2.5 flex items-start gap-3">
                        {many && (
                            <span className="w-6 h-6 rounded-full bg-moss text-paper grid place-items-center text-[11px] font-bold shrink-0 mt-0.5">
                                {i + 1}
                            </span>
                        )}
                        <span className="min-w-0 flex-1 text-[13.5px] text-ink-2">
                            <span className="font-bold text-ink">{cap(x.what)}</span>, {x.need} sq ft.
                            {x.stone.length > 0 && ` Stone: ${x.stone.join(', ')}.`}
                            <span className="block text-[12.5px] text-ink-3">
                                {x.matches.length
                                    ? `${x.matches.length} ${x.matches.length === 1 ? 'option' : 'options'} now`
                                    : 'No options yet: we will find the right stone within 48 hours'}
                            </span>
                        </span>
                        {x.matches.length > 0 && (
                            <button
                                onClick={() => onSeeAll(x)}
                                className="h-8 px-3 rounded-full border border-ink/20 text-[12px] font-bold hover:border-ink shrink-0"
                            >
                                See them
                            </button>
                        )}
                    </li>
                ))}
            </ol>
            <p className="mt-3 text-[13.5px] text-ink-2">{timeline === '3 months +' ? 'Needed in 3 months or more.' : `Needed ${timeline.toLowerCase()}.`}</p>
            <ul className="mt-3 space-y-2 text-[13.5px] text-ink-2">
                {[
                    `Your number is verified by OTP, and ${many ? 'the requirements are' : 'the requirement is'} saved for our team.`,
                    fitting
                        ? `Someone calls you within a day with the lots that fit${many ? ' each one' : ''}, and ${many ? 'one delivery quote for all of them' : 'a delivery quote'}.`
                        : 'Nothing fits yet, so it goes on our watch list.',
                    'When a new lot that fits is listed, you get a WhatsApp message before it goes on the site.',
                ].map((t) => (
                    <li key={t} className="flex gap-2">
                        <Check className="w-4 h-4 text-moss shrink-0 mt-0.5" /> {t}
                    </li>
                ))}
            </ul>
            <p className="mt-3 text-[12px] text-ink-3">This is how the live version would work. Nothing was sent from this prototype.</p>
            <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={onClose} className="h-10 px-4 rounded-full border border-ink/20 text-[13px] font-bold hover:border-ink">
                    Done
                </button>
            </div>
        </div>
    );
}
