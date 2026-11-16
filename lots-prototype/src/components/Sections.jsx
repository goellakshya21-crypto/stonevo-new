import React, { useEffect, useMemo, useState } from 'react';
import LotCard from './LotCard';
import { CITIES, compactInr, inr, SPACES, suitsSpace } from '../lib/lots';
import { Arrow, Brand, ChatIcon, Check, Heart, KeyIcon, PhoneIcon, Pin, VideoIcon } from './ui';
import { DIRECT_FEE, VIDEO_CALL_FEE } from '../lib/contact';
import { useIsDesktop } from '../lib/hooks';
import { BRAND } from '../lib/brand';

export function Nav({ onHome, onBrowse, savedCount, onSaved, onRequirement, onDesign, onContact, user, onLogout, solid }) {
    const isDesktop = useIsDesktop();
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const on = () => setScrolled(window.scrollY > 40);
        on();
        window.addEventListener('scroll', on, { passive: true });
        return () => window.removeEventListener('scroll', on);
    }, []);
    // Phones get a solid bar from the start: there is no room behind it to show through.
    const filled = solid || scrolled || !isDesktop;
    const link = 'text-[13.5px] font-bold text-ink-2 hover:text-ink transition-colors';
    return (
        <header className={`fixed top-0 inset-x-0 z-40 transition-colors ${filled ? 'bg-paper/90 backdrop-blur-md border-b border-ink/10' : ''}`}>
            <div className="max-w-[1440px] mx-auto h-[60px] md:h-[68px] px-4 md:px-10 flex items-center justify-between gap-4">
                <button onClick={onHome} aria-label={`${BRAND.name} ${BRAND.tag} home`}>
                    <Brand />
                </button>
                <nav
                    className={`hidden lg:flex items-center gap-7 rounded-full px-5 py-2 transition-colors ${filled ? '' : 'bg-paper/75 backdrop-blur-md shadow-sm'}`}
                    aria-label="Main"
                >
                    <button className={link} onClick={onBrowse}>
                        Shop lots
                    </button>
                    <a className={link} href="#spaces" onClick={onHome}>
                        Shop by space
                    </a>
                    <button className={link} onClick={onDesign}>
                        Design a room
                    </button>
                    <button className={link} onClick={onRequirement}>
                        Share your requirement
                    </button>
                    <a className={link} href="#yards" onClick={onHome}>
                        For stone yards
                    </a>
                </nav>
                <div className="flex items-center gap-2">
                    {/* On phones this is the only way to the team from the bar. */}
                    <button
                        onClick={onContact}
                        className="h-10 px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold text-ink-2 hover:text-ink bg-white/60 backdrop-blur"
                        aria-label="Talk to us"
                    >
                        <ChatIcon /> <span className="hidden sm:inline">Talk to us</span>
                    </button>
                    <button
                        onClick={onSaved}
                        className="h-10 px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold text-ink-2 hover:text-ink bg-white/60 backdrop-blur"
                        aria-label={`Saved lots (${savedCount})`}
                    >
                        <Heart filled={savedCount > 0} /> <span className="tabular-nums">{savedCount}</span>
                    </button>
                    {user && (
                        <button
                            onClick={onLogout}
                            className="hidden sm:inline-flex h-10 px-3 rounded-full items-center text-[12.5px] font-bold text-ink-3 hover:text-ink"
                            title={`Logged in as +91 ${user.phone}`}
                        >
                            Log out
                        </button>
                    )}
                    <button onClick={onBrowse} className="h-10 px-4 rounded-full bg-ink text-paper text-[13px] font-bold hover:bg-ink/90">
                        Shop lots
                    </button>
                </div>
            </div>
        </header>
    );
}

const Eyebrow = ({ children }) => <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-clay">{children}</p>;

export function HowItWorks({ lots }) {
    const stats = useMemo(() => {
        if (!lots.length) return null;
        const cities = new Set(lots.map((l) => l.cityKey)).size;
        const avg = Math.round(lots.reduce((a, l) => a + l.discountPct, 0) / lots.length);
        const saved = lots.reduce((a, l) => a + l.sqft * (l.marketPrice - l.price), 0);
        return [
            [lots.length, 'lots live now'],
            [cities, 'stone hubs'],
            [`${avg}%`, 'average under market'],
            [compactInr(saved), 'in savings on the shelf'],
        ];
    }, [lots]);

    const steps = [
        [
            'A yard is left holding a small lot',
            'Big orders leave a few slabs behind. Too little for a builder, they sit in the yard for months and take up room.',
        ],
        [
            'We list it, well under market',
            'Our team measures and photographs the lot and prices it 40–60% under the going rate. The yard gets paid and gets its space back.',
        ],
        [
            'You get premium stone for a small space',
            'A bathroom wall, a TV wall, a dining table, a staircase, a pooja room. The spaces where a small lot is all you need.',
        ],
    ];

    return (
        <section id="how" className="max-w-[1320px] mx-auto px-4 md:px-8 py-20 md:py-28 scroll-mt-20">
            <div className="grid md:grid-cols-[1fr_1.4fr] gap-10 md:gap-16 items-start">
                <div>
                    <Eyebrow>Why it's cheaper</Eyebrow>
                    <h2 className="mt-3 font-brand text-[40px] md:text-[54px] leading-[1.02]">
                        The stone is premium.
                        <br />
                        The lot is just small.
                    </h2>
                    <p className="mt-4 text-ink-2 text-[16px] leading-relaxed max-w-[420px]">
                        Nothing is wrong with these slabs. They are the end of a bigger order, and nobody wants to buy a few hundred square feet. That is
                        exactly what a bathroom needs.
                    </p>
                </div>
                <ol className="grid gap-3">
                    {steps.map(([t, d], i) => (
                        <li key={t} className="rounded-[20px] bg-white/60 border border-ink/10 p-5 md:p-6 flex gap-5">
                            <span className="font-brand text-[34px] leading-none text-clay w-8 shrink-0">{i + 1}</span>
                            <div>
                                <h3 className="font-bold text-[17px]">{t}</h3>
                                <p className="mt-1 text-ink-2 text-[14.5px] leading-relaxed">{d}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
            {stats && (
                <dl className="mt-12 grid grid-cols-2 md:grid-cols-4 rounded-[20px] border border-ink/10 divide-x divide-y md:divide-y-0 divide-ink/10 overflow-hidden bg-white/40">
                    {stats.map(([v, k]) => (
                        <div key={k} className="p-5 md:p-6">
                            <dd className="text-[28px] md:text-[34px] font-extrabold tracking-tight tabular-nums">{v}</dd>
                            <dt className="text-[13px] text-ink-3 font-semibold">{k}</dt>
                        </div>
                    ))}
                </dl>
            )}
        </section>
    );
}

// Two targets, because the card shows two things: a photo of ONE stone, and a
// space with many lots. Clicking the photo opens that stone in that room;
// clicking the text opens the gallery for the space, with that stone pinned
// first. (One big button sent people to the gallery when they had clicked a
// stone, and the stone they clicked was lost somewhere in the list.)
function SpaceCard({ space, lot, photo, isRender, count, from, onPick, onOpenLot }) {
    return (
        <article className="rounded-[22px] overflow-hidden bg-white/70 border border-ink/10 hover:shadow-card transition-shadow flex flex-col">
            <button
                type="button"
                disabled={!lot}
                onClick={() => onOpenLot(lot, { sceneId: space.room })}
                aria-label={lot ? `Open ${lot.name}${isRender ? `, shown as a ${space.label.toLowerCase()}` : ''}` : undefined}
                className="group relative block w-full aspect-[4/3] bg-paper-3 overflow-hidden"
            >
                {photo && (
                    <img
                        src={photo}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                )}
                {lot && (
                    <span className="absolute left-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-ink-2 group-hover:bg-ink group-hover:text-paper transition-colors">
                        {lot.name} <Arrow className="w-3 h-3" />
                    </span>
                )}
            </button>
            <button type="button" onClick={() => onPick(space.id, lot?.id)} className="group flex-1 text-left p-4 md:p-5 hover:bg-white/60 transition-colors">
                <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-brand text-[24px] md:text-[26px] leading-none">{space.label}</h3>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-3 font-medium">{space.hint}</p>
                <p className="mt-3 flex items-center justify-between gap-2 text-[13.5px]">
                    <span>
                        {count ? (
                            <>
                                See all {count} · from <b>{inr(from)}</b>/sq ft
                            </>
                        ) : (
                            'No lot for this right now'
                        )}
                    </span>
                    <Arrow className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors shrink-0" />
                </p>
            </button>
        </article>
    );
}

export function ShopBySpace({ lots, renders, onPick, onOpenLot }) {
    const cards = useMemo(() => {
        const used = new Set();
        return SPACES.map((s) => {
            const room = s.room;
            // Lots whose stone may go here; the buyer's own size is asked in the gallery.
            const fit = lots.filter((l) => suitsSpace(l, s));
            const cheapest = fit.reduce((best, l) => (!best || l.price < best.price ? l : best), null);
            // A rendered lot big enough for this space, a different one per card
            // where possible; otherwise the best-discounted lot's slab photo.
            const rendered = fit.filter((l) => renders[l.id]?.[room]).sort((a, b) => b.discountPct - a.discountPct);
            const pick = rendered.find((l) => !used.has(l.id)) || rendered[0];
            if (pick) used.add(pick.id);
            const lot = pick || [...fit].sort((a, b) => b.discountPct - a.discountPct)[0];
            return {
                space: s,
                lot,
                photo: pick ? renders[pick.id][room] : lot?.image,
                isRender: !!pick,
                count: fit.length,
                from: cheapest ? cheapest.price : null,
            };
        });
    }, [lots, renders]);
    return (
        <section id="spaces" className="bg-paper-2/70 py-20 md:py-28 scroll-mt-16">
            <div className="max-w-[1320px] mx-auto px-4 md:px-8">
                <Eyebrow>Shop by space</Eyebrow>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                    <h2 className="font-brand text-[40px] md:text-[54px] leading-[1.02] max-w-[640px]">Start with the space, not the stone.</h2>
                    <p className="text-ink-2 text-[15px] max-w-[380px]">
                        {SPACES.length} places a small lot can go. Each card shows one lot in place: tap the picture to see that lot, or the card to see every
                        lot that fits.
                    </p>
                </div>
                <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                    {cards.map((c) => (
                        <SpaceCard key={c.space.id} {...c} onPick={onPick} onOpenLot={onOpenLot} />
                    ))}
                </div>
            </div>
        </section>
    );
}

export function Regions({ lots, onPick, onOpenLot }) {
    const hubs = useMemo(() => {
        const m = {};
        lots.forEach((l) => {
            (m[l.cityKey] ||= []).push(l);
        });
        return Object.entries(m)
            .map(([k, list]) => ({ key: k, ...CITIES[k], count: list.length, lot: list[0] }))
            .sort((a, b) => b.count - a.count);
    }, [lots]);

    return (
        <section id="regions" className="py-20 md:py-28">
            <div className="max-w-[1320px] mx-auto px-4 md:px-8">
                <Eyebrow>From India's stone belt</Eyebrow>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                    <h2 className="font-brand text-[40px] md:text-[54px] leading-[1.02] max-w-[640px]">Lots from {hubs.length} stone hubs.</h2>
                    <p className="text-ink-2 text-[15px] max-w-[380px]">
                        Every lot shows the city it ships from. Which yard it sits in stays with us. We collect it, check it and bring it to you.
                    </p>
                </div>
            </div>
            <div className="mt-10 flex gap-3 md:gap-4 overflow-x-auto no-scrollbar px-4 scroll-px-4 md:px-[max(2rem,calc((100vw_-_1320px)/2_+_2rem))] md:scroll-px-8 snap-x snap-mandatory pb-2">
                {hubs.map((h) => (
                    <article key={h.key} className="snap-start shrink-0 w-[180px] md:w-[230px] rounded-[20px] overflow-hidden bg-white/60 border border-ink/10">
                        <button
                            type="button"
                            onClick={() => onOpenLot(h.lot)}
                            aria-label={`Open ${h.lot.name}, from ${h.name}`}
                            className="group relative block w-full aspect-[5/4] overflow-hidden bg-paper-3"
                        >
                            <img
                                src={h.lot.image}
                                alt=""
                                loading="lazy"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <span className="absolute left-2.5 bottom-2.5 max-w-[calc(100%-20px)] inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[11px] font-bold text-ink-2 group-hover:bg-ink group-hover:text-paper transition-colors">
                                <span className="truncate">{h.lot.name}</span> <Arrow className="w-3 h-3 shrink-0" />
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onPick(h.key, h.lot.id)}
                            className="group block w-full text-left p-4 hover:bg-white/70 transition-colors"
                        >
                            <p className="flex items-center gap-1 font-bold text-[15.5px]">
                                <Pin /> {h.name}
                            </p>
                            <p className="flex items-center justify-between gap-2 text-[12.5px] text-ink-3 font-semibold">
                                <span>
                                    {h.state} · {h.count} {h.count === 1 ? 'lot' : 'lots'}
                                </span>
                                <Arrow className="w-3.5 h-3.5 group-hover:text-ink transition-colors" />
                            </p>
                        </button>
                    </article>
                ))}
            </div>
        </section>
    );
}

export function JustListed({ lots, renders, saved, onToggleSave, onOpen, onBrowse }) {
    const fresh = useMemo(() => [...lots].sort((a, b) => a.listedDaysAgo - b.listedDaysAgo).slice(0, 8), [lots]);
    return (
        <section className="bg-paper-2/70 py-20 md:py-28">
            <div className="max-w-[1320px] mx-auto px-4 md:px-8">
                <Eyebrow>Just listed</Eyebrow>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                    <h2 className="font-brand text-[40px] md:text-[54px] leading-[1.02]">Each lot sells once.</h2>
                    <button onClick={onBrowse} className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-ink text-paper font-bold text-[14px]">
                        See all {lots.length} lots <Arrow />
                    </button>
                </div>
                <div className="mt-10 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-8">
                    {fresh.map((l) => (
                        <LotCard key={l.id} lot={l} renders={renders} saved={saved.has(l.id)} onToggleSave={onToggleSave} onOpen={onOpen} />
                    ))}
                </div>
            </div>
        </section>
    );
}

// The home page's way in to "Share your requirement", with a few one-tap
// starting points so a buyer sees a real answer before typing anything.
const QUICK_ASKS = [
    { space: 'bathroom', budget: 25000, label: 'A bathroom wall under ₹25,000' },
    { space: 'kitchen', budget: 15000, label: 'A kitchen counter under ₹15,000' },
    { space: 'pooja', budget: 20000, label: 'A pooja room under ₹20,000' },
    { space: 'dining', budget: 10000, label: 'A dining table under ₹10,000' },
];

/**
 * "Talk to us" on the home page: the three ways to reach a person, side by
 * side (see ContactSheet). The requirement keeps its one-tap starting points.
 */
export function ContactBand({ onRequirement, onContact, onBrowse, onProject }) {
    const ways = [
        {
            id: 'whatsapp',
            icon: <ChatIcon className="w-5 h-5" />,
            title: 'Meet on WhatsApp',
            text: 'Pick a day and time for a call or a visit. WhatsApp opens with the request written.',
            cta: 'Set up a meeting',
            onClick: () => onContact('whatsapp'),
        },
        {
            id: 'call',
            icon: <PhoneIcon className="w-5 h-5" />,
            title: 'We call you back',
            text: 'Share the space, your budget and the stone you have in mind. We call within a day with lots that fit.',
            cta: 'Share your requirement',
            onClick: () => onRequirement(),
            primary: true,
        },
        {
            id: 'video',
            icon: <VideoIcon className="w-5 h-5" />,
            title: 'See the slab on video',
            text: `A 15-minute WhatsApp video call: we show you the actual pieces in daylight and measure them while you watch. ${inr(VIDEO_CALL_FEE)}, counted towards your stone if you buy.`,
            cta: 'Book a video call',
            onClick: () => onContact('video'),
        },
        {
            id: 'direct',
            icon: <KeyIcon className="w-5 h-5" />,
            title: 'Buy direct from the yard',
            text: `Found the lot you want? Pay a one-time fee from ${inr(DIRECT_FEE.base)} for the yard's details and deal with them yourself. Open any lot and choose "Buy direct".`,
            cta: 'Find your lot',
            onClick: () => onBrowse(),
        },
    ];
    return (
        <section id="requirement" className="py-20 md:py-24 scroll-mt-16">
            <div className="max-w-[1320px] mx-auto px-4 md:px-8">
                <Eyebrow>Talk to us</Eyebrow>
                <h2 className="mt-3 font-brand text-[36px] md:text-[48px] leading-[1.02]">Five ways to work with us.</h2>
                <p className="mt-3 text-ink-2 text-[15px] leading-relaxed max-w-[560px]">
                    Talk to a person, or buy direct from the yard. Our team answers every day, 10 am to 8 pm.
                </p>
                {/* The whole-home project first: the biggest job, and not only small lots. */}
                <div className="mt-8 rounded-[22px] bg-ink text-paper p-6 md:p-8 grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 md:gap-10 items-center">
                    <div>
                        <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#E7A27F]">Doing up a whole home?</p>
                        <h3 className="mt-2 font-brand text-[30px] md:text-[40px] leading-[1.05]">Plan the stone for every room with one person.</h3>
                        <p className="mt-3 text-[15px] text-paper/75 leading-relaxed max-w-[560px]">
                            A project lead goes through your plans and puts together stone for every space: full slabs and blocks as well as small lots,
                            samples, a site visit if it helps, and one delivery schedule.
                        </p>
                        <button
                            onClick={() => onProject()}
                            className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-paper text-ink font-bold text-[14px] hover:bg-white"
                        >
                            Start a project <Arrow />
                        </button>
                    </div>
                    <ul className="space-y-2.5 text-[14px] text-paper/85">
                        {[
                            'Whole house, several rooms, or a shop',
                            'Every kind of stone, not only what is left over',
                            'Works with your architect or designer',
                            'Free, no obligation',
                        ].map((t) => (
                            <li key={t} className="flex gap-2.5 rounded-xl bg-paper/[0.06] border border-paper/10 px-4 py-3">
                                <Check className="w-4 h-4 text-[#E7A27F] shrink-0 mt-0.5" /> {t}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {ways.map((w) => (
                        <div
                            key={w.id}
                            className={`rounded-[22px] border p-6 flex flex-col ${w.primary ? 'bg-white border-ink/15 shadow-card' : 'bg-white/60 border-ink/10'}`}
                        >
                            <span className="w-10 h-10 rounded-full bg-paper-2 grid place-items-center">{w.icon}</span>
                            <h3 className="mt-4 font-bold text-[19px]">{w.title}</h3>
                            <div className="flex-1">
                                <p className="mt-1.5 text-[14px] text-ink-2 leading-relaxed">{w.text}</p>
                                {w.id === 'call' && (
                                    <div className="mt-4">
                                        <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-3">Or start from</p>
                                        <ul className="mt-1.5">
                                            {QUICK_ASKS.map((q) => (
                                                <li key={q.label}>
                                                    <button
                                                        onClick={() => onRequirement({ space: q.space, budget: q.budget })}
                                                        className="w-full text-left text-[13.5px] font-semibold text-ink-2 hover:text-ink flex items-center justify-between gap-2 py-1"
                                                    >
                                                        {q.label} <Arrow className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={w.onClick}
                                className={`mt-5 h-11 px-5 rounded-full font-bold text-[14px] inline-flex items-center justify-center gap-2 ${
                                    w.primary ? 'bg-ink text-paper hover:bg-ink/90' : 'border border-ink/20 hover:border-ink'
                                }`}
                            >
                                {w.cta} <Arrow />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function ForYards({ onOpen }) {
    const points = [
        'List a lot from your phone in five minutes: photos, size, your price.',
        // "Buy direct" (DirectSheet) only shows a yard to a buyer who has paid,
        // and only for yards that agree to it.
        'Your yard name and address stay private. Want direct buyers? They pay us a fee first, and only then see your details.',
        'We find the buyer, collect payment and send the pickup truck.',
    ];
    return (
        <section id="yards" className="bg-ink text-paper scroll-mt-16">
            <div className="max-w-[1320px] mx-auto px-4 md:px-8 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
                <div>
                    <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#E7A27F]">For stone yards</p>
                    <h2 className="mt-3 font-brand text-[40px] md:text-[56px] leading-[1.02]">
                        Turn the lots in your yard
                        <br />
                        into cash and space.
                    </h2>
                    <button
                        onClick={onOpen}
                        className="mt-8 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-paper text-ink font-bold text-[14px] hover:bg-white"
                    >
                        List your small lots <Arrow />
                    </button>
                    <p className="mt-3 text-[13px] text-paper/60">Already listing? The same button logs you in.</p>
                </div>
                <ul className="space-y-3">
                    {points.map((p) => (
                        <li key={p} className="flex gap-3 rounded-[18px] bg-paper/[0.06] border border-paper/10 p-5">
                            <span className="w-6 h-6 rounded-full bg-[#E7A27F] text-ink grid place-items-center shrink-0">
                                <Check className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-[15px] leading-relaxed text-paper/85">{p}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

export function Footer() {
    return (
        <footer className="max-w-[1320px] mx-auto px-4 md:px-8 py-12 flex flex-col md:flex-row gap-6 md:items-center justify-between text-[13px] text-ink-3">
            <Brand />
            <p className="max-w-[640px]">
                Prototype. Stone names and photos are live from the Ston database; rooms are rendered from them by the live visualiser. Lot sizes, prices and
                cities are sample data until vendors list real lots.{' '}
                <a href="#/studio" className="font-bold underline underline-offset-4">
                    Render studio
                </a>
                {' · '}
                <a href="#/review" className="font-bold underline underline-offset-4">
                    Team panel
                </a>
            </p>
        </footer>
    );
}
