import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 240;
const FRAME_PATH = (i) => `/about-frames/frame_${String(i).padStart(4, '0')}.webp`;
const FRAME_SPEED = 2.0;
const IMAGE_SCALE = 0.85;

const SECTIONS = [
    {
        id: 'purpose',
        label: '001 / Purpose',
        heading: 'One integrated\nexperience.',
        body: 'Ston bridges the gap — combining advisory thinking, sourcing understanding, design sensitivity and coordination structure into one integrated experience.',
        align: 'left',
        animation: 'slide-left',
        enter: 20, leave: 34,
    },
    {
        id: 'belief',
        label: '002 / Belief',
        heading: 'Not a material\nselection. A long-term\ndecision.',
        body: 'Natural stone should align with the design language of a project, its functionality, maintenance expectations, and the realities of execution.',
        align: 'right',
        animation: 'slide-right',
        enter: 34, leave: 48,
    },
];

const DISCIPLINES = [
    { n: 1, title: 'Advisory', body: 'Aligning material selections with design intent.' },
    { n: 2, title: 'Sourcing', body: 'Curated slab selection — the right lots for the right projects.' },
    { n: 3, title: 'Coordination', body: 'Vendor alignment from brief through to installation.' },
    { n: 4, title: 'Guidance', body: 'Navigating the full stone journey with clarity.' },
];

const HELP_LINES = [
    'Understanding project intent first — not overwhelming clients with random options.',
    'Narrowing to meaningful, value-for-money selections — not generic vendor-driven picks.',
    'Simplifying coordination throughout, so the design vision survives execution.',
];

const AboutPage = () => {
    const navigate = useNavigate();

    const [loadProgress, setLoadProgress] = useState(0);
    const [ready, setReady] = useState(false);

    const canvasRef = useRef(null);
    const canvasWrapRef = useRef(null);
    const heroRef = useRef(null);
    const darkOverlayRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const marqueeWrapRef = useRef(null);

    const framesRef = useRef([]);
    const currentFrameRef = useRef(0);
    const bgColorRef = useRef('#0d0c0a');

    const enter = () => {
        sessionStorage.setItem('sv_enter', '1');
        navigate('/');
    };

    // ── Frame preload ────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        const frames = new Array(FRAME_COUNT);
        framesRef.current = frames;
        let loadedCount = 0;

        const onOneLoaded = () => {
            loadedCount += 1;
            if (!cancelled) setLoadProgress(Math.round((loadedCount / FRAME_COUNT) * 100));
            if (loadedCount === FRAME_COUNT && !cancelled) setReady(true);
        };

        const loadFrame = (i) => {
            const img = new Image();
            img.onload = onOneLoaded;
            img.onerror = onOneLoaded;
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
    }, []);

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
            duration: 1.2,
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
                const accelerated = Math.min(p * FRAME_SPEED, 1);
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

                // Marquee fade window
                if (marqueeWrap) {
                    let mOpacity = 0;
                    if (p >= 0.07 && p < 0.11) mOpacity = (p - 0.07) / 0.04;
                    else if (p >= 0.11 && p < 0.18) mOpacity = 1;
                    else if (p >= 0.18 && p < 0.22) mOpacity = 1 - (p - 0.18) / 0.04;
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
                .ab-loader-brand { font-family: var(--serif); font-size: 20px; letter-spacing: 0.3em; color: var(--cream); }
                .ab-loader-barwrap { width: 220px; height: 2px; background: rgba(255,255,255,0.08); margin-top: 28px; overflow: hidden; }
                .ab-loader-bar { height: 100%; background: var(--bronze); transition: width 0.2s linear; }
                .ab-loader-percent { font-family: var(--sans); font-size: 10px; font-weight: 700; letter-spacing: 0.3em; color: var(--text-dim); margin-top: 14px; }

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
                .ab-nav-tabs { position: relative; z-index: 1; display: flex; align-items: center; gap: 4px; background: rgba(28,24,20,0.55); border: 1px solid rgba(255,255,255,0.06); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 100px; padding: 5px; }
                .ab-nav-tab { font-family: var(--sans); font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(253,252,248,0.55); text-decoration: none; padding: 10px 16px; border-radius: 100px; white-space: nowrap; transition: color 0.3s, background 0.3s; }
                .ab-nav-tab:hover { color: var(--cream); }
                .ab-nav-tab.active { background: var(--bronze); color: var(--bg); }

                /* HERO */
                .ab-hero {
                    position: relative; z-index: 20;
                    min-height: 100vh;
                    background: var(--bg);
                    display: flex; flex-direction: column; justify-content: center;
                    padding: 140px 48px 80px;
                    overflow: hidden;
                }
                .ab-hero-label { font-family: var(--sans); font-size: 10px; font-weight: 800; letter-spacing: 0.45em; text-transform: uppercase; color: var(--bronze); opacity: 0.85; margin-bottom: 24px; }
                .ab-hero-heading { font-family: var(--serif); font-weight: 300; letter-spacing: -0.03em; line-height: 0.98; font-size: clamp(52px, 10vw, 168px); margin-bottom: 32px; }
                .ab-hero-word { display: inline-block; }
                .ab-hero-heading em { font-style: italic; color: var(--bronze); }
                .ab-hero-tagline { font-family: var(--sans); font-size: 16px; font-weight: 300; line-height: 1.75; color: var(--text-mid); max-width: 42ch; margin-bottom: 36px; }
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
                .ab-scroll-container { position: relative; z-index: 10; height: 900vh; }
                .scroll-section { position: absolute; left: 0; right: 0; padding: 0 48px; }
                .align-left { padding-left: 8vw; padding-right: 50vw; }
                .align-right { padding-left: 50vw; padding-right: 8vw; }
                .align-left .section-inner, .align-right .section-inner {
                    max-width: 42vw;
                    background: rgba(253,252,248,0.92);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    padding: 40px 44px;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.35);
                }
                .section-label { display: block; font-family: var(--sans); font-size: 10px; font-weight: 800; letter-spacing: 0.4em; text-transform: uppercase; color: var(--bronze); opacity: 1; margin-bottom: 24px; }
                .section-heading { font-family: var(--serif); font-weight: 300; letter-spacing: -0.03em; line-height: 1.08; font-size: clamp(34px, 4.6vw, 68px); color: #0d0c0a; margin-bottom: 24px; white-space: pre-line; }
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
                    background: rgba(253,252,248,0.92);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    padding: 48px 44px;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.35);
                }
                .section-cta .section-heading { color: #0d0c0a; }
                .section-cta .section-body { color: #2a2620; }

                @media (max-width: 900px) {
                    .ab-hero-heading { font-size: clamp(40px, 13vw, 84px); }
                    .align-left, .align-right { padding-left: 8vw; padding-right: 8vw; text-align: center; }
                    .align-left .section-inner, .align-right .section-inner { max-width: 100%; margin: 0 auto; padding: 28px 20px; }
                    .stats-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
                }
            `}</style>

            {/* LOADER */}
            <div className={`ab-loader ${ready ? 'ab-loader-hidden' : ''}`}>
                <div className="ab-loader-brand">STON</div>
                <div className="ab-loader-barwrap"><div className="ab-loader-bar" style={{ width: `${loadProgress}%` }} /></div>
                <div className="ab-loader-percent">{loadProgress}%</div>
            </div>

            {/* HEADER */}
            <nav className="ab-header">
                <Link to="/" className="ab-logo">STON</Link>
                <div className="ab-nav-tabs">
                    <Link to="/about" className="ab-nav-tab active">About</Link>
                    <Link to="/stone-intelligence" className="ab-nav-tab">Stone Intelligence</Link>
                    <Link to="/advisory" className="ab-nav-tab">Audit &amp; Advisory</Link>
                </div>
            </nav>

            {/* HERO */}
            <section className="ab-hero" ref={heroRef}>
                <p className="ab-hero-label">Chapter I — Purpose</p>
                <h1 className="ab-hero-heading">
                    <span className="ab-hero-word">Why</span>{' '}
                    <span className="ab-hero-word">Ston</span>{' '}
                    <span className="ab-hero-word"><em>exists.</em></span>
                </h1>
                <p className="ab-hero-tagline">
                    The natural stone industry has extraordinary materials, craftsmanship and possibilities — but the process around selection and coordination often remains unstructured.
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
                    data-enter="50" data-leave="64" data-animation="stagger-up"
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
                    data-enter="66" data-leave="80" data-animation="fade-up"
                >
                    <div className="section-inner">
                        <span className="section-label">004 / Approach</span>
                        <h2 className="section-heading">{'Not hundreds of options.\nMeaningful choices.'}</h2>
                        <ul className="help-list">
                            {HELP_LINES.map((l, i) => <li key={i}>{l}</li>)}
                        </ul>
                    </div>
                </section>

                {/* OUR APPROACH */}
                <section
                    className="scroll-section section-content align-right"
                    data-enter="82" data-leave="94" data-animation="clip-reveal"
                >
                    <div className="section-inner">
                        <span className="section-label">005 / Method</span>
                        <h2 className="section-heading">{'A better overall\nproject experience.'}</h2>
                        <p className="section-body">
                            We do not believe in overwhelming clients with hundreds of random options. Our role is to understand, narrow, and align — so the right stone finds the right space: meaningful choices, sourcing clarity, and a design that survives all the way from brief to final slab.
                        </p>
                    </div>
                </section>

                {/* CTA — persists */}
                <section
                    className="scroll-section section-cta"
                    data-enter="94" data-leave="100" data-animation="rotate-in" data-persist="true"
                >
                    <div className="section-inner">
                        <span className="section-label">006 / Objective</span>
                        <h2 className="section-heading">Not just to <em style={{ fontStyle: 'italic', color: 'var(--bronze)' }}>select a stone.</em></h2>
                        <p className="section-body">
                            The objective is to create a better overall project experience — guided, curated, informed, coordinated.
                        </p>
                        <button onClick={enter} className="cta-button ab-hero-cta">Enter the Platform</button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AboutPage;
