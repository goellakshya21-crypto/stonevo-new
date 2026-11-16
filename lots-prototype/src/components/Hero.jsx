import React, { useMemo, useRef, useState } from 'react';
import PhotoStage from './PhotoStage';
import { costFor, inr, wholeIsCheaper } from '../lib/lots';
import { RENDER_SCENES, ROOM_TABS, styleName } from '../lib/renders';
import { canDo, placeOf } from '../lib/applications';
import { Arrow, Check, DownloadButton, LiveDot, Pin } from './ui';
import { fileNameFor } from '../lib/download';
import { useIsDesktop, useReducedMotion } from '../lib/hooks';

const SLIDE_MS = 7000;
const FADE_LEFT = 'linear-gradient(to right, transparent 0, rgba(0,0,0,.55) 9%, #000 22%)';

// Deterministic shuffle so the hero shows a varied, stable run of lots.
const shuffleKey = (id) => {
    let h = 7;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000003;
    return h;
};

/**
 * The landing experience: real lots, rendered into real-looking rooms by the
 * live visualiser, with the price of doing exactly that surface in exactly that
 * lot. Only lots big enough for the surface are shown.
 *
 * Opens on the TOUR when there is one (renders/tour.json, made in the render
 * studio): every slide a different space, lot and architectural style. The
 * room tabs then show every render of one room.
 */
export default function Hero({ lots, renders, tour = [], totalLots, onOpenLot, paused: externallyPaused }) {
    const isDesktop = useIsDesktop();
    const reduced = useReducedMotion();
    const [tab, setTab] = useState(null); // null: the default (the tour, if any)
    const [currentKey, setCurrentKey] = useState(null);
    const [userPaused, setUserPaused] = useState(false);
    const [hovering, setHovering] = useState(false);

    const tourSlides = useMemo(() => {
        const byId = Object.fromEntries(lots.map((l) => [l.id, l]));
        return tour
            .map((t) => ({ lot: byId[t.lotId], sceneId: t.scene, styleId: t.style }))
            .filter((sl) => sl.lot && RENDER_SCENES[sl.sceneId] && renders[sl.lot.id]?.[sl.sceneId] && canDo(sl.lot, sl.sceneId));
    }, [tour, lots, renders]);
    const hasTour = tourSlides.length > 1;
    const activeTab = tab || (hasTour ? 'tour' : 'bathroom');

    const slides = useMemo(() => {
        if (activeTab === 'tour') return tourSlides;
        // canDo: big enough, and a stone that may go there (no marble kitchens).
        return lots
            .filter((l) => renders[l.id]?.[activeTab] && canDo(l, activeTab))
            .sort((a, b) => shuffleKey(a.id) - shuffleKey(b.id))
            .map((l) => ({ lot: l, sceneId: activeTab }));
    }, [activeTab, tourSlides, lots, renders]);

    const keyOf = (sl) => `${sl.lot.id}|${sl.sceneId}`;
    const slide = slides.find((sl) => keyOf(sl) === currentKey) || slides[0];
    const idx = slide ? slides.indexOf(slide) : 0;
    const lot = slide?.lot;
    const sceneId = slide?.sceneId || (activeTab === 'tour' ? 'bathroom' : activeTab);
    const scene = RENDER_SCENES[sceneId];
    const style = slide?.styleId ? styleName(slide.styleId) : '';
    const go = (step) => slides.length && setCurrentKey(keyOf(slides[(idx + step + slides.length) % slides.length]));
    const next = slides.length > 1 ? slides[(idx + 1) % slides.length] : null;

    // Swipe the photo on touch screens.
    const swipe = useRef(null);
    const onPointerDown = (e) => (swipe.current = e.clientX);
    const onPointerUp = (e) => {
        if (swipe.current == null) return;
        const dx = e.clientX - swipe.current;
        swipe.current = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    };

    const running = !reduced && !userPaused && !hovering && !externallyPaused && slides.length > 1;
    // The surface is usually part of the lot: part-lot rate, or the whole lot when cheaper.
    const total = lot ? costFor(lot, scene.sqft) : 0;
    const market = lot ? Math.min(scene.sqft, lot.sqft) * lot.marketPrice : 0;
    const whole = lot ? scene.sqft >= lot.sqft || wholeIsCheaper(lot, scene.sqft) : false;

    const headline = (
        <div className="fade-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur px-3 py-1.5 text-[12px] font-bold text-ink-2 shadow-sm">
                <LiveDot />
                {totalLots ? `${totalLots} small lots live right now` : 'Loading live lots…'}
            </div>
            <h1 className="mt-4 font-brand text-[44px] leading-[0.98] md:text-[56px] xl:text-[64px] tracking-[-0.01em] text-ink">
                Premium stone,
                <br />
                in small lots,
                <br />
                <em className="text-clay">at half the price.</em>
            </h1>
            <p className="mt-4 max-w-[400px] text-[15px] md:text-[16px] leading-relaxed text-ink-2">
                Stone yards across India are left with lots too small to sell. We bring them to you for bathrooms, kitchens, TV walls, staircases and
                pooja rooms, at up to 60% under market.
            </p>
        </div>
    );

    const tabs = (
        <div className="flex gap-1 p-1 rounded-full bg-paper-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Room">
            {[...(hasTour ? ['tour'] : []), ...ROOM_TABS].map((id) => (
                <button
                    key={id}
                    role="tab"
                    aria-selected={activeTab === id}
                    onClick={() => {
                        setTab(id);
                        setCurrentKey(null);
                    }}
                    className={`flex-1 shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-bold transition-colors ${
                        activeTab === id ? 'bg-white text-ink shadow-sm' : 'text-ink-3 hover:text-ink'
                    }`}
                >
                    {id === 'tour' ? 'All rooms' : RENDER_SCENES[id].label}
                </button>
            ))}
        </div>
    );

    const card = (
        <div
            className="rounded-[22px] bg-paper/95 backdrop-blur-xl shadow-float border border-white/60 overflow-hidden"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
        >
            {!isDesktop && <div className="px-3 pt-3">{tabs}</div>}
            {lot ? (
                <>
                    <div className="px-5 pt-4" key={lot.id + sceneId}>
                        <div className="flex items-start gap-3 fade-up">
                            <img src={lot.image} alt="" className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-brand text-[25px] leading-none truncate">{lot.name}</h2>
                                    <span className="shrink-0 rounded-md bg-clay-soft text-clay text-[11px] font-extrabold px-1.5 py-0.5">
                                        −{lot.discountPct}%
                                    </span>
                                </div>
                                <p className="mt-1 flex items-center gap-1 text-[12.5px] text-ink-3 font-semibold">
                                    {lot.family} <span className="opacity-40">·</span> <Pin className="w-3 h-3" /> {lot.city.name}, {lot.city.state}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 fade-up" style={{ animationDelay: '60ms' }}>
                            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-3">
                                {scene.surface} in this {style ? `${style} ` : ''}
                                {placeOf(scene)} · {scene.sqft} sq ft
                            </p>
                            <div className="mt-1 flex items-baseline gap-2.5 flex-wrap">
                                <span className="text-[34px] font-extrabold tracking-tight leading-none">{inr(total)}</span>
                                <span className="text-[15px] text-ink-3 line-through decoration-1">{inr(market)}</span>
                            </div>
                            <p className="mt-1.5 text-[13px] text-ink-2">
                                <b className="text-moss">You save {inr(market - total)}</b> · {whole ? `whole lot at ${inr(lot.price)}/sq ft` : `${inr(lot.partRate)}/sq ft for part of the lot`}
                            </p>
                            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold bg-moss-soft text-moss">
                                <Check className="w-3.5 h-3.5" />
                                This lot has {lot.sqft} sq ft, enough for it
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-5 pt-4">
                        <button
                            onClick={() => onOpenLot(lot, { sceneId })}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-ink text-paper h-11 text-[14px] font-bold hover:bg-ink/90 transition-colors"
                        >
                            See this lot <Arrow />
                        </button>
                        <button
                            aria-label="Previous stone"
                            onClick={() => go(-1)}
                            className="w-11 h-11 rounded-full border border-ink/15 grid place-items-center hover:border-ink/50"
                        >
                            <Arrow dir="left" />
                        </button>
                        <button aria-label="Next stone" onClick={() => go(1)} className="w-11 h-11 rounded-full border border-ink/15 grid place-items-center hover:border-ink/50">
                            <Arrow />
                        </button>
                        <DownloadButton
                            getSrc={() => renders[lot.id][sceneId]}
                            name={fileNameFor(lot.name, scene.surface, 'in a', placeOf(scene))}
                            label="Download this room"
                            className="!w-11 !h-11 !px-0 justify-center border border-ink/15 shadow-none [&>span]:hidden"
                        />
                    </div>
                    <button
                        onClick={() => onOpenLot(lot, { sceneId, view: 'own' })}
                        className="-mt-2 mb-3 mx-5 text-[13px] font-bold text-clay underline underline-offset-4 decoration-clay/40 hover:decoration-clay"
                    >
                        Try {lot.name} in a photo of your own room
                    </button>

                    {/* Autoplay progress; the bar's own animationend advances the slide. */}
                    <div className="relative h-[3px] bg-ink/5">
                        <div
                            key={lot.id + sceneId}
                            className={`absolute inset-0 origin-left bg-clay ${running ? 'progress-run' : ''}`}
                            style={{ animationDuration: `${SLIDE_MS}ms`, transform: running ? undefined : 'scaleX(0)' }}
                            onAnimationEnd={() => go(1)}
                        />
                    </div>
                </>
            ) : (
                <div className="p-5 text-[14px] text-ink-2">
                    No {scene.label.toLowerCase()} renders yet.{' '}
                    <a href="#/studio" className="font-bold underline underline-offset-4">
                        Open the render studio
                    </a>{' '}
                    to make some.
                </div>
            )}
        </div>
    );

    const controls = (
        <div className="flex items-center gap-2">
            <span className="hidden md:inline rounded-full bg-white/80 backdrop-blur px-3 py-1.5 text-[12px] font-semibold text-ink-2 shadow-sm">
                {style ? `${style} · ` : ''}Visualised with this lot's stone
            </span>
            <button
                onClick={() => setUserPaused((p) => !p)}
                className="rounded-full bg-white/80 backdrop-blur px-3 py-1.5 text-[12px] font-bold text-ink-2 shadow-sm hover:text-ink"
                aria-label={userPaused ? 'Resume slideshow' : 'Pause slideshow'}
            >
                {userPaused ? '▶ Play' : '❚❚ Pause'}
            </button>
            <span className="rounded-full bg-white/80 backdrop-blur px-3 py-1.5 text-[12px] font-bold text-ink-2 shadow-sm tabular-nums">
                {slides.length ? `${idx + 1} / ${slides.length}` : '–'}
            </span>
        </div>
    );

    const photo = (
        <PhotoStage
            url={lot ? renders[lot.id][sceneId] : null}
            fallback={lots[0]?.image}
            preload={next ? renders[next.lot.id][next.sceneId] : null}
            alt={lot ? `${lot.name} on the ${scene.surface.toLowerCase()} of a ${style ? `${style} ` : ''}${placeOf(scene)}` : ''}
            motion={!reduced}
            className="absolute inset-0"
        />
    );

    if (!isDesktop) {
        return (
            <section className="pt-20">
                <div className="px-4 pb-5">{headline}</div>
                <div className="relative h-[56svh] min-h-[340px] max-h-[540px] overflow-hidden bg-paper-3" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
                    {photo}
                    <div className="absolute right-3 top-3">{controls}</div>
                </div>
                <div className="px-3 -mt-10 relative z-10">{card}</div>
                <p className="px-5 pt-3 text-[12px] text-ink-3">Swipe the photo to see the next lot. Every room is visualised with that lot's own stone.</p>
            </section>
        );
    }

    return (
        <section className="relative h-[100svh] min-h-[740px] max-h-[1040px] overflow-hidden bg-paper-3" aria-label="Lots shown in real rooms">
            {/* The room fills the right of the screen and melts into the page on its
                left edge, so the copy sits on calm paper and the render's subject
                (centred in every shot) is never hidden behind the card. */}
            <div
                className="absolute inset-y-0 right-0 left-[33%]"
                style={{ WebkitMaskImage: FADE_LEFT, maskImage: FADE_LEFT }}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
            >
                {photo}
            </div>
            <div className="absolute inset-x-0 top-0 h-28 pointer-events-none bg-gradient-to-b from-paper/60 to-transparent" />
            <div className="absolute left-0 top-0 bottom-0 w-[min(470px,42vw)] flex flex-col justify-between pl-10 pr-4 pt-28 pb-8 pointer-events-none">
                <div className="pointer-events-auto">{headline}</div>
                <div className="pointer-events-auto">{card}</div>
            </div>
            <div className="absolute right-6 top-24 rounded-[18px] bg-paper/90 backdrop-blur-xl shadow-card border border-white/60 p-2 max-w-[min(600px,52vw)]">
                {tabs}
            </div>
            <div className="absolute right-6 bottom-6">{controls}</div>
        </section>
    );
}
