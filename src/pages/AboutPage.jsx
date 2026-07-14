import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import StonWordmark from '../components/StonWordmark';

gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 361;
const FRAME_PATH = (i) => `/about-frames/frame_${String(i).padStart(4, '0')}.webp`;
const FRAME_SPEED = 1.3;
// Only play the full liquid-fill intro once per browser session — frames are
// cached after the first visit, so replaying it on every SPA nav back to
// /about is just an annoying repeat, not a real load.
const LOADER_SEEN_KEY = 'ston_about_loader_seen';
// Full-bleed cover — frames fill the entire viewport edge-to-edge, no side bars.
const IMAGE_SCALE = 1.0;

const SECTIONS = [
    {
        id: 'purpose',
        label: '001 / Purpose',
        heading: 'One integrated experience.',
        body: 'Ston bridges that gap by combining advisory thinking, sourcing understanding, design sensitivity and coordination structure into one integrated experience.',
        align: 'left',
        animation: 'slide-left',
        enter: 8, leave: 22,
    },
    {
        id: 'belief',
        label: '002 / Belief',
        heading: 'Not a material selection. A long-term decision.',
        body: 'Natural stone should align with the design language of a project, its functionality, maintenance expectations, and the realities of execution.',
        align: 'right',
        animation: 'slide-right',
        enter: 24, leave: 38,
    },
];

const DISCIPLINES = [
    { n: 1, title: 'Advisory', body: 'Aligning material selections with design intent.' },
    { n: 2, title: 'Sourcing', body: 'Curated slab selection, matching the right lots to the right projects.' },
    { n: 3, title: 'Coordination', body: 'Vendor alignment from brief through to installation.' },
    { n: 4, title: 'Guidance', body: 'Navigating the full stone journey with clarity.' },
];

const HELP_LINES = [
    'Understanding project intent first, instead of overwhelming clients with random options.',
    'Narrowing things down to meaningful, value-for-money selections instead of generic, vendor-driven picks.',
    'Simplifying coordination throughout, so the design vision survives execution.',
];

const AboutPage = () => {
    const navigate = useNavigate();

    // Shown percent is min(actual frames loaded, timed ramp) so the fill
    // animation always plays for at least MIN_LOADER_MS, even fully cached —
    // but only the first time this browser session; skip straight to ready
    // on repeat visits (e.g. navigating back via the nav tabs).
    const [alreadySeenLoader] = useState(() => sessionStorage.getItem(LOADER_SEEN_KEY) === '1');
    const [displayProgress, setDisplayProgress] = useState(alreadySeenLoader ? 100 : 0);
    const [ready, setReady] = useState(alreadySeenLoader);

    const canvasRef = useRef(null);
    const canvasWrapRef = useRef(null);
    const heroRef = useRef(null);
    const darkOverlayRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const marqueeWrapRef = useRef(null);

    const framesRef = useRef([]);
    const currentFrameRef = useRef(0);
    const bgColorRef = useRef('#0d0c0a');
    const actualProgressRef = useRef(0);

    const enter = () => {
        sessionStorage.setItem('sv_enter', '1');
        navigate('/');
    };

    // ── Canvas draw ──────────────────────────────────────────────────────
    const sampleBgColor = (img) => {
        try {
            const c = document.createElement('canvas');
            c.width = 8; c.height = 8;
            const cx = c.getContext('2d');
            cx.drawImage(img, 0, 0, 8, 8);
            const d = cx.getImageData(0, 0, 1, 1).data;
            return `rgb(${d[0]},${d[1]},${d[2]})`;
        } catch {
            return bgColorRef.current;
        }
    };

    const drawFrame = useCallback((index) => {
        const canvas = canvasRef.current;
        const img = framesRef.current[index];
        if (!canvas || !img || !img.complete || !img.naturalWidth) return;
        const ctx = canvas.getContext('2d');
        const cw = canvas.width, ch = canvas.height;
        const iw = img.naturalWidth, ih = img.naturalHeight;
        const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
        const dw = iw * scale, dh = ih * scale;
        const dx = (cw - dw) / 2, dy = (ch - dh) / 2;

        if (index % 20 === 0) bgColorRef.current = sampleBgColor(img);

        ctx.fillStyle = bgColorRef.current;
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, dx, dy, dw, dh);
    }, []);

    // ── Frame preload ────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        const frames = new Array(FRAME_COUNT);
        framesRef.current = frames;
        let loadedCount = 0;

        const onOneLoaded = (i) => {
            loadedCount += 1;
            if (cancelled) return;
            actualProgressRef.current = (loadedCount / FRAME_COUNT) * 100;
            // Redraw once whichever frame is currently "on screen" finishes
            // loading — on a repeat visit (loader skipped) this is the only
            // thing that puts pixels on the canvas, since nothing else
            // triggers a draw until the user scrolls.
            if (i === currentFrameRef.current) drawFrame(i);
        };

        const loadFrame = (i) => {
            const img = new Image();
            img.onload = () => onOneLoaded(i);
            img.onerror = () => onOneLoaded(i);
            img.src = FRAME_PATH(i + 1);
            frames[i] = img;
        };

        // Phase 1: first frames immediately for fast first paint
        for (let i = 0; i < Math.min(15, FRAME_COUNT); i++) loadFrame(i);
        // Phase 2: rest in background
        setTimeout(() => {
            if (cancelled) return;
            for (let i = 15; i < FRAME_COUNT; i++) loadFrame(i);
        }, 30);

        return () => { cancelled = true; };
    }, [drawFrame]);

    // ── Loader pacing: time-gated fill so the liquid pour is always seen ──
    // setInterval, not rAF: rAF stops entirely in background tabs and the
    // loader would never complete there. Skipped entirely on repeat visits.
    useEffect(() => {
        if (alreadySeenLoader) return;
        const MIN_LOADER_MS = 2200;
        const start = performance.now();
        const iv = setInterval(() => {
            const t = Math.min(1, (performance.now() - start) / MIN_LOADER_MS);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
            const shown = Math.min(actualProgressRef.current, eased * 100);
            setDisplayProgress(Math.round(shown));
            if (shown >= 100) {
                clearInterval(iv);
                sessionStorage.setItem(LOADER_SEEN_KEY, '1');
                setReady(true);
            }
        }, 50);
        return () => clearInterval(iv);
    }, [alreadySeenLoader]);

    // ── Canvas sizing ────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            drawFrame(currentFrameRef.current);
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [drawFrame]);

    // ── Main scroll-driven system (Lenis + GSAP ScrollTrigger) ─────────────
    useEffect(() => {
        if (!ready) return;

        const lenis = new Lenis({
            duration: 1.6,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
        });
        lenis.on('scroll', ScrollTrigger.update);
        const rafCallback = (time) => lenis.raf(time * 1000);
        gsap.ticker.add(rafCallback);
        gsap.ticker.lagSmoothing(0);

        const scrollContainer = scrollContainerRef.current;
        const heroSection = heroRef.current;
        const canvasWrap = canvasWrapRef.current;
        const darkOverlay = darkOverlayRef.current;
        const marqueeWrap = marqueeWrapRef.current;

        // Phones get a shorter scroll container (1000vh vs 1300vh), which
        // would make the footage race; slow the scrub so pacing feels the same.
        const frameSpeed = window.matchMedia('(max-width: 900px)').matches ? 1.15 : FRAME_SPEED;

        // Draw first frame immediately
        drawFrame(0);

        // Hero entrance (plays once on load, not scroll-linked)
        const heroTl = gsap.timeline({ delay: 0.2 });
        heroTl.from('.ab-hero-label', { opacity: 0, y: 16, duration: 0.7, ease: 'power3.out' })
            .from('.ab-hero-word', { opacity: 0, y: 40, stagger: 0.09, duration: 0.9, ease: 'power3.out' }, '-=0.4')
            .from('.ab-hero-tagline', { opacity: 0, y: 20, duration: 0.8, ease: 'power3.out' }, '-=0.5')
            .from('.ab-hero-cta', { opacity: 0, y: 20, duration: 0.7, ease: 'power3.out' }, '-=0.5')
            .from('.ab-hero-scroll', { opacity: 0, duration: 0.6 }, '-=0.4');

        // Build per-section timelines
        const sectionEls = Array.from(scrollContainer.querySelectorAll('.scroll-section'));
        const sectionData = sectionEls.map((section) => {
            const enterFrac = parseFloat(section.dataset.enter) / 100;
            const leaveFrac = parseFloat(section.dataset.leave) / 100;
            const persist = section.dataset.persist === 'true';
            const type = section.dataset.animation;
            const mid = (enterFrac + leaveFrac) / 2;
            section.style.top = `${mid * 100}%`;
            section.style.transform = 'translateY(-50%)';

            const children = section.querySelectorAll(
                '.section-label, .section-heading, .section-body, .section-note, .cta-button, .stat'
            );
            const tl = gsap.timeline({ paused: true });
            switch (type) {
                case 'slide-left':
                    tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
                    break;
                case 'slide-right':
                    tl.from(children, { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
                    break;
                case 'fade-up':
                    tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' });
                    break;
                case 'scale-up':
                    tl.from(children, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1.0, ease: 'power2.out' });
                    break;
                case 'rotate-in':
                    tl.from(children, { y: 40, rotation: 3, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out' });
                    break;
                case 'stagger-up':
                    tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out' });
                    break;
                case 'clip-reveal':
                    tl.from(children, { clipPath: 'inset(100% 0 0 0)', opacity: 0, stagger: 0.15, duration: 1.2, ease: 'power4.inOut' });
                    break;
                default:
                    break;
            }
            if (section.classList.contains('section-stats')) {
                const nums = section.querySelectorAll('.stat-number');
                nums.forEach((el) => {
                    const target = parseFloat(el.dataset.value);
                    tl.to(el, {
                        textContent: target,
                        duration: 1.0,
                        ease: 'power1.out',
                        snap: { textContent: 1 },
                    }, '<0.1');
                });
            }
            return { el: section, enter: enterFrac, leave: leaveFrac, persist, tl };
        });

        const BAND = 0.05;
        const statsSection = sectionData.find((s) => s.el.classList.contains('section-stats'));

        const mainTrigger = ScrollTrigger.create({
            trigger: scrollContainer,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
            onUpdate: (self) => {
                const p = self.progress;

                // Hero fade + circle-wipe canvas reveal
                if (heroSection) heroSection.style.opacity = Math.max(0, 1 - p * 15);
                if (canvasWrap) {
                    const wipe = Math.min(1, Math.max(0, (p - 0.01) / 0.06));
                    canvasWrap.style.clipPath = `circle(${wipe * 75}% at 50% 50%)`;
                }

                // Frame playback
                const accelerated = Math.min(p * frameSpeed, 1);
                const index = Math.min(Math.floor(accelerated * FRAME_COUNT), FRAME_COUNT - 1);
                if (index !== currentFrameRef.current) {
                    currentFrameRef.current = index;
                    drawFrame(index);
                }

                // Section reveals
                sectionData.forEach(({ tl, enter: en, leave, persist }) => {
                    let prog;
                    if (p < en) prog = 0;
                    else if (p < en + BAND) prog = (p - en) / BAND;
                    else if (p < leave) prog = 1;
                    else if (!persist && p < leave + BAND) prog = 1 - (p - leave) / BAND;
                    else if (!persist) prog = 0;
                    else prog = 1;
                    tl.progress(Math.min(1, Math.max(0, prog)));
                });

                // Dark overlay synced to stats section
                if (darkOverlay && statsSection) {
                    const { enter: en, leave } = statsSection;
                    const fadeRange = 0.04;
                    let opacity = 0;
                    if (p >= en - fadeRange && p <= en) opacity = (p - (en - fadeRange)) / fadeRange;
                    else if (p > en && p < leave) opacity = 0.9;
                    else if (p >= leave && p <= leave + fadeRange) opacity = 0.9 * (1 - (p - leave) / fadeRange);
                    darkOverlay.style.opacity = opacity;
                }

                // Marquee fade window — brief pass right after the circle wipe,
                // before the first text section settles in
                if (marqueeWrap) {
                    let mOpacity = 0;
                    if (p >= 0.03 && p < 0.05) mOpacity = (p - 0.03) / 0.02;
                    else if (p >= 0.05 && p < 0.08) mOpacity = 1;
                    else if (p >= 0.08 && p < 0.11) mOpacity = 1 - (p - 0.08) / 0.03;
                    marqueeWrap.style.opacity = mOpacity;
                }
            },
        });

        // Marquee horizontal slide over full scroll length
        let marqueeTween = null;
        if (marqueeWrap) {
            const text = marqueeWrap.querySelector('.ab-marquee-text');
            marqueeTween = gsap.to(text, {
                xPercent: -25,
                ease: 'none',
                scrollTrigger: {
                    trigger: scrollContainer,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: true,
                },
            });
        }

        ScrollTrigger.refresh();

        return () => {
            heroTl.kill();
            mainTrigger.kill();
            if (marqueeTween?.scrollTrigger) marqueeTween.scrollTrigger.kill();
            if (marqueeTween) marqueeTween.kill();
            gsap.ticker.remove(rafCallback);
            lenis.destroy();
        };
    }, [ready, drawFrame]);

    return (
        <div className="ab-root">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&family=Manrope:wght@300;400;500;700;800&display=swap');

                .ab-root {
                    --bronze: #A37D4B;
                    --cream: #FDFCF8;
                    --bg: #0d0c0a;
                    --bg-mid: #171410;
                    --bg-card: #1c1814;
                    --text-dim: #6b6357;
                    --text-mid: #a89e8d;
                    --serif: 'Noto Serif', serif;
                    --sans: 'Manrope', sans-serif;
                    background: var(--bg);
                    color: var(--cream);
                    font-family: var(--sans);
                    position: relative;
                }

                /* LOADER */
                .ab-loader {
                    position: fixed; inset: 0; z-index: 300;
                    background: var(--bg);
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    transition: opacity 0.6s ease, visibility 0.6s;
                }
                .ab-loader.ab-loader-hidden { opacity: 0; visibility: hidden; pointer-events: none; }
                .ab-loader-s {
                    width: min(190px, 40vw); height: auto; display: block;
                    filter: drop-shadow(0 0 14px rgba(230,185,95,0.16)) drop-shadow(0 0 46px rgba(197,160,89,0.12));
                }
                @keyframes ab-wave-fwd { from { transform: translateX(0); } to { transform: translateX(-100px); } }
                @keyframes ab-wave-rev { from { transform: translateX(-100px); } to { transform: translateX(0); } }
                .ab-wave-front { animation: ab-wave-fwd 1.0s linear infinite; }
                .ab-wave-back { animation: ab-wave-rev 2.2s linear infinite; }
                .ab-wave-ripple { animation: ab-wave-fwd 0.7s linear infinite; }
                @keyframes ab-liquid-bob { from { transform: translateY(-2px); } to { transform: translateY(2px); } }
                .ab-liquid-bob { animation: ab-liquid-bob 1.2s ease-in-out infinite alternate; }
                @keyframes ab-glint-shimmer { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.5; } }
                .ab-glint { animation: ab-glint-shimmer 1.4s ease-in-out infinite; }
                @keyframes ab-sheen-sweep {
                    0% { transform: translateX(-90px); }
                    55% { transform: translateX(330px); }
                    100% { transform: translateX(330px); }
                }
                .ab-sheen { animation: ab-sheen-sweep 3s ease-in-out infinite; }
                @keyframes ab-glow-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
                .ab-loader-glow { animation: ab-glow-pulse 3.2s ease-in-out infinite; }
                .ab-loader-percent {
                    font-family: var(--serif); font-weight: 300; font-size: 34px;
                    letter-spacing: 0.02em; color: var(--cream); margin-top: 18px; line-height: 1;
                    font-variant-numeric: tabular-nums;
                }
                .ab-loader-percent span { font-size: 16px; color: var(--bronze); margin-left: 3px; }
                .ab-loader-tag {
                    font-family: var(--sans); font-size: 9px; font-weight: 800;
                    letter-spacing: 0.4em; text-transform: uppercase;
                    color: var(--text-dim); margin-top: 12px;
                }

                /* HEADER */
                .ab-header {
                    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
                    padding: 28px 48px; display: flex; justify-content: space-between; align-items: center;
                }
                .ab-header::before {
                    content: ''; position: absolute; inset: 0;
                    background: linear-gradient(to bottom, rgba(13,12,10,0.85) 0%, transparent 100%);
                    pointer-events: none;
                }
                .ab-logo { position: relative; z-index: 1; font-family: var(--serif); font-size: 18px; letter-spacing: 0.2em; color: var(--cream); text-decoration: none; transition: color 0.3s; }
                .ab-logo:hover { color: var(--bronze); }
                .ab-nav-tabs { position: relative; z-index: 1; display: flex; align-items: center; gap: 34px; }
                .ab-nav-tab { font-family: var(--sans); font-size: 10px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(253,252,248,0.75); text-decoration: none; padding: 10px 0; white-space: nowrap; transition: color 0.3s, background 0.3s, padding 0.3s; text-shadow: 0 2px 10px rgba(0,0,0,0.55); }
                .ab-nav-tab:hover { color: var(--cream); }
                .ab-nav-tab.active { background: var(--bronze); color: var(--bg); padding: 10px 22px; border-radius: 100px; text-shadow: none; }

                /* HERO */
                .ab-hero {
                    position: relative; z-index: 20;
                    min-height: 100vh;
                    background:
                        linear-gradient(100deg, rgba(13,12,10,0.95) 0%, rgba(13,12,10,0.86) 32%, rgba(13,12,10,0.5) 66%, rgba(13,12,10,0.32) 100%),
                        url('/about-hero-marble.jpg') center right / cover no-repeat,
                        var(--bg);
                    display: flex; flex-direction: column; justify-content: center;
                    padding: 120px 48px 100px;
                }
                .ab-hero-label { font-family: var(--sans); font-size: 10px; font-weight: 800; letter-spacing: 0.45em; text-transform: uppercase; color: var(--bronze); opacity: 0.85; margin-bottom: 16px; }
                .ab-hero-heading { font-family: var(--serif); font-weight: 300; letter-spacing: -0.03em; line-height: 0.98; font-size: clamp(44px, 8vw, 132px); margin-bottom: 22px; }
                .ab-hero-word { display: inline-block; }
                .ab-hero-heading em { font-style: italic; color: var(--bronze); }
                .ab-hero-tagline { font-family: var(--sans); font-size: 16px; font-weight: 300; line-height: 1.75; color: var(--text-mid); max-width: 42ch; margin-bottom: 24px; }
                .ab-hero-cta { display: inline-flex; align-items: center; gap: 14px; font-family: var(--sans); font-size: 12px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; color: var(--bg); background: var(--bronze); border: none; cursor: pointer; padding: 20px 44px; border-radius: 100px; width: fit-content; transition: background 0.3s, transform 0.2s, box-shadow 0.3s; box-shadow: 0 8px 48px rgba(163,125,75,0.5), 0 2px 12px rgba(0,0,0,0.4); }
                .ab-hero-cta:hover { background: var(--cream); transform: scale(1.04); }
                .ab-hero-scroll { position: absolute; bottom: 40px; left: 48px; display: flex; align-items: center; gap: 12px; font-family: var(--sans); font-size: 10px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: var(--text-dim); }
                .ab-hero-scroll-line { width: 40px; height: 1px; background: var(--text-dim); }

                /* CANVAS */
                .ab-canvas-wrap { position: fixed; inset: 0; z-index: 1; clip-path: circle(0% at 50% 50%); }
                .ab-canvas-wrap canvas { width: 100%; height: 100%; display: block; }

                .ab-dark-overlay { position: fixed; inset: 0; z-index: 5; background: var(--bg); pointer-events: none; opacity: 0; }

                /* MARQUEE */
                .ab-marquee-wrap { position: fixed; top: 50%; left: 0; right: 0; z-index: 6; overflow: hidden; pointer-events: none; opacity: 0; transform: translateY(-50%); }
                .ab-marquee-text { display: inline-flex; white-space: nowrap; font-family: var(--serif); font-style: italic; font-weight: 700; font-size: clamp(64px, 12vw, 190px); letter-spacing: -0.02em; color: transparent; -webkit-text-stroke: 1px rgba(163,125,75,0.35); }

                /* SCROLL CONTAINER */
                .ab-scroll-container { position: relative; z-index: 10; height: 1300vh; }
                .scroll-section { position: absolute; left: 0; right: 0; padding: 0 48px; }
                .align-left { padding-left: 8vw; padding-right: 50vw; }
                .align-right { padding-left: 50vw; padding-right: 8vw; }
                .align-left .section-inner, .align-right .section-inner {
                    max-width: 44vw;
                    padding: 56px 52px;
                    background: radial-gradient(ellipse 100% 90% at center, rgba(253,252,248,0.92) 0%, rgba(253,252,248,0.8) 40%, rgba(253,252,248,0.4) 70%, rgba(253,252,248,0) 100%);
                }
                .section-label { display: block; font-family: var(--sans); font-size: 10px; font-weight: 800; letter-spacing: 0.4em; text-transform: uppercase; color: var(--bronze); opacity: 1; margin-bottom: 24px; }
                .section-heading { font-family: var(--serif); font-weight: 700; letter-spacing: -0.015em; line-height: 1.2; font-size: clamp(26px, 3.2vw, 46px); color: #0d0c0a; margin-bottom: 22px; }
                .section-body { font-family: var(--sans); font-size: 16px; font-weight: 300; line-height: 1.75; color: #2a2620; }

                /* STATS SECTION */
                .section-stats { display: flex; align-items: center; justify-content: center; padding: 0 48px; }
                .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 56px; max-width: 1200px; width: 100%; }
                .stat { text-align: center; }
                .stat-number { display: block; font-family: var(--serif); font-weight: 300; font-size: clamp(56px, 7vw, 108px); color: var(--cream); letter-spacing: -0.03em; }
                .stat-title { display: block; font-family: var(--serif); font-style: italic; font-size: 20px; color: var(--bronze); margin-top: 8px; }
                .stat-label { display: block; font-family: var(--sans); font-size: 13px; font-weight: 300; line-height: 1.6; color: var(--text-mid); margin-top: 10px; }

                /* HOW WE HELP list */
                .help-list { list-style: none; margin-top: 8px; }
                .help-list li { font-family: var(--serif); font-size: clamp(18px, 1.7vw, 24px); font-weight: 300; font-style: italic; color: #0d0c0a; line-height: 1.5; padding: 14px 0; border-top: 1px solid rgba(13,12,10,0.12); }

                /* CTA SECTION */
                .section-cta { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 48px; }
                .section-cta .section-inner {
                    max-width: 56ch; display: flex; flex-direction: column; align-items: center; gap: 24px;
                    padding: 70px 64px;
                    background: radial-gradient(ellipse 100% 90% at center, rgba(253,252,248,0.92) 0%, rgba(253,252,248,0.8) 40%, rgba(253,252,248,0.4) 70%, rgba(253,252,248,0) 100%);
                }
                .section-cta .section-heading { color: #0d0c0a; }
                .section-cta .section-body { color: #2a2620; }

                @media (max-width: 900px) {
                    /* Stack the header: logo on top, all three tabs visible below */
                    .ab-header { padding: 12px 16px 10px; flex-direction: column; align-items: center; gap: 10px; }
                    .ab-nav-tabs { gap: 12px; max-width: 100%; justify-content: center; }
                    .ab-nav-tab { font-size: 8px; letter-spacing: 0.1em; padding: 7px 0; }
                    .ab-nav-tab.active { padding: 7px 12px; }
                    .ab-hero { padding: 100px 24px 80px; }
                    .ab-hero-heading { font-size: clamp(40px, 13vw, 84px); }
                    .ab-hero-scroll { left: 24px; }
                    /* Shorter scroll journey on phones than desktop's 1300vh,
                       but with enough runway that the video doesn't race. */
                    .ab-scroll-container { height: 1000vh; }
                    .scroll-section { padding: 0 24px; }
                    .align-left, .align-right { padding-left: 6vw; padding-right: 6vw; text-align: center; }
                    .align-left .section-inner, .align-right .section-inner { max-width: 100%; margin: 0 auto; padding: 28px 20px; }
                    .stats-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
                    .section-cta .section-inner { padding: 36px 22px; }
                }
            `}</style>

            {/* LOADER */}
            <div className={`ab-loader ${ready ? 'ab-loader-hidden' : ''}`}>
                <svg className="ab-loader-s" viewBox="0 0 200 260">
                    <defs>
                        {/* N mark traced from the logo: diagonal exactly stem-width,
                            tips flush with the letter box, hairline slits shearing
                            the left stem's top cap and right stem's bottom cap. */}
                        <clipPath id="abSClip">
                            <path d="M40,55 L60,55 L160,205 L140,205 Z" />
                            <path d="M40,71 L60,101 L60,205 L40,205 Z" />
                            <path d="M140,55 L160,55 L160,189 L140,159 Z" />
                        </clipPath>
                        <linearGradient id="abGoldBack" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#9C6D2E" />
                            <stop offset="100%" stopColor="#5C3F14" />
                        </linearGradient>
                        {/* The logo's gradient, anchored to the glyph box so the
                            filled N shows exactly the logo's coloring: dark amber
                            lower-left rising to rich gold upper-right. */}
                        <linearGradient id="abLogoGold" gradientUnits="userSpaceOnUse" x1="40" y1="205" x2="160" y2="55">
                            <stop offset="0%" stopColor="#6E4715" />
                            <stop offset="45%" stopColor="#B8842F" />
                            <stop offset="80%" stopColor="#E8B85C" />
                            <stop offset="100%" stopColor="#F2CD79" />
                        </linearGradient>
                        <linearGradient id="abSheenGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="rgba(242,205,121,0)" />
                            <stop offset="50%" stopColor="rgba(242,205,121,0.35)" />
                            <stop offset="100%" stopColor="rgba(242,205,121,0)" />
                        </linearGradient>
                        <linearGradient id="abCaustic" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(242,205,121,0.25)" />
                            <stop offset="100%" stopColor="rgba(242,205,121,0)" />
                        </linearGradient>
                        <radialGradient id="abGlow" cx="0.5" cy="0.5" r="0.5">
                            <stop offset="0%" stopColor="rgba(197,160,89,0.18)" />
                            <stop offset="100%" stopColor="rgba(197,160,89,0)" />
                        </radialGradient>
                        {/* Animated liquid surface used as a mask over the logo fill */}
                        <mask id="abLiquidMask" maskUnits="userSpaceOnUse" x="-100" y="-100" width="400" height="560">
                            <g style={{ transform: `translateY(${210 - 1.75 * displayProgress}px)` }}>
                                <g className="ab-liquid-bob">
                                    <g className="ab-wave-front">
                                        <path
                                            fill="#fff"
                                            d="M-100,10 C-75,5 -75,15 -50,10 C-25,5 -25,15 0,10 C25,5 25,15 50,10 C75,5 75,15 100,10 C125,5 125,15 150,10 C175,5 175,15 200,10 C225,5 225,15 250,10 C275,5 275,15 300,10 L300,430 L-100,430 Z"
                                        />
                                    </g>
                                </g>
                            </g>
                        </mask>
                    </defs>

                    {/* Soft pulsing glow behind the glyph */}
                    <circle className="ab-loader-glow" cx="100" cy="132" r="100" fill="url(#abGlow)" />

                    {/* Outline of the N in the logo gradient, always visible */}
                    <g fill="none" stroke="url(#abLogoGold)" strokeWidth="2" opacity="0.45">
                        <path d="M40,55 L60,55 L160,205 L140,205 Z" />
                        <path d="M40,71 L60,101 L60,205 L40,205 Z" />
                        <path d="M140,55 L160,55 L160,189 L140,159 Z" />
                    </g>

                    {/* Liquid, clipped inside the N */}
                    <g clipPath="url(#abSClip)">
                        {/* Back layer: darker swell peeking above the main surface */}
                        <g style={{ transform: `translateY(${210 - 1.75 * displayProgress}px)` }}>
                            <g className="ab-liquid-bob">
                                <g className="ab-wave-back">
                                    <path
                                        fill="url(#abGoldBack)" opacity="0.55"
                                        d="M-100,6 C-75,-4 -75,16 -50,6 C-25,-4 -25,16 0,6 C25,-4 25,16 50,6 C75,-4 75,16 100,6 C125,-4 125,16 150,6 C175,-4 175,16 200,6 C225,-4 225,16 250,6 C275,-4 275,16 300,6 L300,430 L-100,430 Z"
                                    />
                                </g>
                            </g>
                        </g>

                        {/* Main body: the logo's own gradient, revealed by the rising
                            liquid mask — so the filled N looks exactly like the logo */}
                        <rect x="30" y="45" width="140" height="170" fill="url(#abLogoGold)" mask="url(#abLiquidMask)" />

                        {/* Surface effects, tinted gold and kept subtle */}
                        <g style={{ transform: `translateY(${210 - 1.75 * displayProgress}px)` }}>
                            <g className="ab-liquid-bob">
                                <g className="ab-wave-front">
                                    <path
                                        className="ab-glint"
                                        fill="none" stroke="rgba(242,205,121,0.55)" strokeWidth="1.4"
                                        d="M-100,10 C-75,5 -75,15 -50,10 C-25,5 -25,15 0,10 C25,5 25,15 50,10 C75,5 75,15 100,10 C125,5 125,15 150,10 C175,5 175,15 200,10 C225,5 225,15 250,10 C275,5 275,15 300,10"
                                    />
                                </g>
                                {/* Light entering the liquid just below the surface */}
                                <rect x="-100" y="13" width="400" height="34" fill="url(#abCaustic)" />
                                {/* Fast ripple skimming the surface */}
                                <g className="ab-wave-ripple">
                                    <path
                                        fill="rgba(230,185,95,0.22)"
                                        d="M-100,8 C-87.5,4 -87.5,12 -75,8 C-62.5,4 -62.5,12 -50,8 C-37.5,4 -37.5,12 -25,8 C-12.5,4 -12.5,12 0,8 C12.5,4 12.5,12 25,8 C37.5,4 37.5,12 50,8 C62.5,4 62.5,12 75,8 C87.5,4 87.5,12 100,8 C112.5,4 112.5,12 125,8 C137.5,4 137.5,12 150,8 C162.5,4 162.5,12 175,8 C187.5,4 187.5,12 200,8 C212.5,4 212.5,12 225,8 C237.5,4 237.5,12 250,8 C262.5,4 262.5,12 275,8 C287.5,4 287.5,12 300,8 L300,26 L-100,26 Z"
                                    />
                                </g>
                                {/* Sheen sweeping across the liquid */}
                                <g className="ab-sheen">
                                    <rect x="-60" y="-20" width="46" height="480" fill="url(#abSheenGrad)" transform="skewX(-20)" />
                                </g>
                            </g>
                        </g>
                    </g>
                </svg>
                <div className="ab-loader-percent">{displayProgress}<span>%</span></div>
                <div className="ab-loader-tag">Preparing the experience</div>
            </div>

            {/* HEADER */}
            <nav className="ab-header">
                <Link to="/" className="ab-logo"><StonWordmark height={17} /></Link>
                <div className="ab-nav-tabs">
                    <Link to="/about" className="ab-nav-tab active">About</Link>
                    <Link to="/stone-intelligence" className="ab-nav-tab">Stone Intelligence</Link>
                    <Link to="/advisory" className="ab-nav-tab">Audit &amp; Advisory</Link>
                </div>
            </nav>

            {/* HERO */}
            <section className="ab-hero" ref={heroRef}>
                <p className="ab-hero-label">Chapter I · Purpose</p>
                <h1 className="ab-hero-heading">
                    <span className="ab-hero-word">Why</span>{' '}
                    <span className="ab-hero-word"><StonWordmark height="0.72em" /></span>{' '}
                    <span className="ab-hero-word"><em>exists.</em></span>
                </h1>
                <p className="ab-hero-tagline">
                    The natural stone industry has extraordinary materials, craftsmanship and possibilities, but the process around selection and coordination often remains unstructured.
                </p>
                <button onClick={enter} className="ab-hero-cta">
                    Enter Platform <span>→</span>
                </button>
                <div className="ab-hero-scroll"><div className="ab-hero-scroll-line" />Scroll</div>
            </section>

            {/* CANVAS */}
            <div className="ab-canvas-wrap" ref={canvasWrapRef}>
                <canvas ref={canvasRef} />
            </div>

            {/* DARK OVERLAY */}
            <div className="ab-dark-overlay" ref={darkOverlayRef} />

            {/* MARQUEE */}
            <div className="ab-marquee-wrap" ref={marqueeWrapRef}>
                <div className="ab-marquee-text">
                    ADVISORY &nbsp;·&nbsp; SOURCING &nbsp;·&nbsp; COORDINATION &nbsp;·&nbsp; GUIDANCE &nbsp;·&nbsp; ADVISORY &nbsp;·&nbsp; SOURCING &nbsp;·&nbsp; COORDINATION &nbsp;·&nbsp; GUIDANCE &nbsp;·&nbsp;
                </div>
            </div>

            {/* SCROLL CONTAINER */}
            <div className="ab-scroll-container" ref={scrollContainerRef}>
                {SECTIONS.map((s) => (
                    <section
                        key={s.id}
                        className={`scroll-section section-content align-${s.align}`}
                        data-enter={s.enter} data-leave={s.leave} data-animation={s.animation}
                    >
                        <div className="section-inner">
                            <span className="section-label">{s.label}</span>
                            <h2 className="section-heading">{s.heading}</h2>
                            <p className="section-body">{s.body}</p>
                        </div>
                    </section>
                ))}

                {/* STATS — Four Disciplines */}
                <section
                    className="scroll-section section-stats"
                    data-enter="40" data-leave="54" data-animation="stagger-up"
                >
                    <div className="stats-grid">
                        {DISCIPLINES.map((d) => (
                            <div className="stat" key={d.n}>
                                <span className="stat-number" data-value={d.n}>0</span>
                                <span className="stat-title">{d.title}</span>
                                <span className="stat-label">{d.body}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* HOW WE HELP */}
                <section
                    className="scroll-section section-content align-left"
                    data-enter="56" data-leave="70" data-animation="fade-up"
                >
                    <div className="section-inner">
                        <span className="section-label">004 / Approach</span>
                        <h2 className="section-heading">Not hundreds of options. Meaningful choices.</h2>
                        <ul className="help-list">
                            {HELP_LINES.map((l, i) => <li key={i}>{l}</li>)}
                        </ul>
                    </div>
                </section>

                {/* OUR APPROACH */}
                <section
                    className="scroll-section section-content align-right"
                    data-enter="72" data-leave="86" data-animation="clip-reveal"
                >
                    <div className="section-inner">
                        <span className="section-label">005 / Method</span>
                        <h2 className="section-heading">A better overall project experience.</h2>
                        <p className="section-body">
                            We don't believe in overwhelming clients with hundreds of random options. Our role is to understand, narrow and align, so the right stone finds the right space: meaningful choices, sourcing clarity, and a design that survives all the way from brief to final slab.
                        </p>
                    </div>
                </section>

                {/* CTA — persists */}
                <section
                    className="scroll-section section-cta"
                    data-enter="88" data-leave="100" data-animation="rotate-in" data-persist="true"
                >
                    <div className="section-inner">
                        <span className="section-label">006 / Objective</span>
                        <h2 className="section-heading">Not just to <em style={{ fontStyle: 'italic', color: 'var(--bronze)' }}>select a stone.</em></h2>
                        <p className="section-body">
                            The objective is to create a better overall project experience: guided, curated, informed and coordinated.
                        </p>
                        <button onClick={enter} className="cta-button ab-hero-cta">Enter the Platform</button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AboutPage;
