import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Audit & Advisory — implemented from Claude Design handoff (Advisory.html).
 * Editorial dark-luxury layout with bronze accents, three pricing tier cards,
 * perspective manifesto, and closing CTA back to the gallery.
 */
const AdvisoryServices = () => {
    // Reveal-on-scroll via IntersectionObserver — matches the design's behavior
    useEffect(() => {
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add('visible');
                        io.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
        );
        document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

        // Hero elements: stagger in immediately (don't wait for scroll)
        document.querySelectorAll('#hero .reveal').forEach((el, i) => {
            setTimeout(() => el.classList.add('visible'), 250 + i * 110);
        });

        return () => io.disconnect();
    }, []);

    return (
        <div className="adv-root">
            <style>{`
                .adv-root {
                    --bronze: #A37D4B;
                    --bronze-light: #C5A059;
                    --cream: #FDFCF8;
                    --bg: #0d0c0a;
                    --bg-mid: #171410;
                    --bg-card: #1c1814;
                    --text-dim: #6b6357;
                    --text-mid: #a89e8d;
                    --serif: 'Noto Serif', serif;
                    --sans: 'Manrope', sans-serif;
                    background: #0d0c0a;
                    color: var(--cream);
                    font-family: var(--sans);
                    overflow-x: hidden;
                    -webkit-font-smoothing: antialiased;
                    min-height: 100vh;
                }
                .adv-root ::selection { background: rgba(163,125,75,0.25); }

                /* REVEAL */
                .adv-root .reveal {
                    opacity: 0;
                    transform: translateY(28px);
                    transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1);
                }
                .adv-root .reveal.visible { opacity: 1; transform: none; }
                .adv-root .reveal-delay-1 { transition-delay: 0.08s; }
                .adv-root .reveal-delay-2 { transition-delay: 0.16s; }
                .adv-root .reveal-delay-3 { transition-delay: 0.24s; }
                .adv-root .reveal-delay-4 { transition-delay: 0.32s; }

                /* NAV */
                .adv-nav {
                    position: fixed;
                    top: 0; left: 0; right: 0;
                    z-index: 100;
                    padding: 28px 48px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .adv-nav::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to bottom, rgba(13,12,10,0.85) 0%, transparent 100%);
                    pointer-events: none;
                }
                .adv-nav-logo {
                    font-family: var(--serif);
                    font-size: 18px;
                    letter-spacing: 0.2em;
                    color: var(--cream);
                    text-decoration: none;
                    position: relative;
                    z-index: 1;
                    transition: color 0.3s;
                }
                .adv-nav-logo:hover { color: var(--bronze); }
                .adv-nav-tabs {
                    position: relative; z-index: 1;
                    display: flex; align-items: center; gap: 4px;
                    background: rgba(28,24,20,0.55);
                    border: 1px solid rgba(255,255,255,0.06);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 100px;
                    padding: 5px;
                }
                .adv-nav-tab {
                    font-family: var(--sans);
                    font-size: 9.5px;
                    font-weight: 800;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    color: rgba(253,252,248,0.55);
                    text-decoration: none;
                    padding: 10px 16px;
                    border-radius: 100px;
                    white-space: nowrap;
                    transition: color 0.3s, background 0.3s;
                }
                .adv-nav-tab:hover { color: var(--cream); }
                .adv-nav-tab.active { background: var(--bronze); color: #0d0c0a; }

                /* HERO */
                .adv-hero {
                    position: relative;
                    min-height: 72vh;
                    display: flex;
                    align-items: center;
                    padding: 160px 48px 90px;
                    background: #0d0c0a;
                    overflow: hidden;
                }
                .adv-hero-watermark {
                    position: absolute;
                    bottom: -0.16em;
                    right: -0.04em;
                    font-family: var(--serif);
                    font-size: clamp(120px, 17vw, 230px);
                    font-weight: 700;
                    letter-spacing: -0.05em;
                    line-height: 1;
                    color: transparent;
                    -webkit-text-stroke: 1px rgba(163,125,75,0.07);
                    pointer-events: none;
                    user-select: none;
                    z-index: 0;
                }
                .adv-hero-inner {
                    position: relative; z-index: 1;
                    max-width: 1280px;
                    margin: 0 auto;
                    width: 100%;
                    display: grid;
                    grid-template-columns: 6fr 5fr;
                    gap: 80px;
                    align-items: center;
                }
                .adv-hero-eyebrow {
                    font-family: var(--sans);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.45em;
                    text-transform: uppercase;
                    color: var(--bronze);
                    opacity: 0.85;
                    margin-bottom: 28px;
                }
                .adv-hero-headline {
                    font-family: var(--serif);
                    font-size: clamp(44px, 6.2vw, 84px);
                    font-weight: 300;
                    letter-spacing: -0.03em;
                    line-height: 1.03;
                    color: var(--cream);
                    margin-bottom: 24px;
                }
                .adv-hero-headline em { font-style: italic; color: var(--bronze); }
                .adv-hero-right {
                    border-left: 1px solid rgba(163,125,75,0.25);
                    padding-left: 40px;
                }
                .adv-hero-lead {
                    font-family: var(--sans);
                    font-size: 15px;
                    font-weight: 300;
                    line-height: 1.8;
                    color: var(--text-mid);
                }
                .adv-hero-lead strong { color: var(--cream); font-weight: 500; }
                .adv-hero-lead em { color: var(--bronze); font-style: italic; }
                .adv-hero-lead p { margin-bottom: 18px; }
                .adv-hero-lead p:last-child { margin-bottom: 0; }

                /* TIERS */
                .adv-tiers {
                    padding: 110px 48px;
                    background: #171410;
                    border-top: 1px solid rgba(255,255,255,0.04);
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                }
                .adv-tiers-inner { max-width: 1320px; margin: 0 auto; }
                .adv-tiers-head {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 40px;
                    margin-bottom: 64px;
                    flex-wrap: wrap;
                }
                .adv-section-eyebrow {
                    font-family: var(--sans);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.45em;
                    text-transform: uppercase;
                    color: var(--bronze);
                    opacity: 0.75;
                    margin-bottom: 22px;
                }
                .adv-section-title {
                    font-family: var(--serif);
                    font-size: clamp(32px, 4vw, 56px);
                    font-weight: 300;
                    letter-spacing: -0.025em;
                    line-height: 1.1;
                    color: var(--cream);
                    max-width: 18ch;
                }
                .adv-section-title em { font-style: italic; color: var(--bronze); }
                .adv-tiers-head-note {
                    font-family: var(--sans);
                    font-size: 13px;
                    font-weight: 300;
                    line-height: 1.7;
                    color: var(--text-mid);
                    max-width: 34ch;
                    padding-bottom: 6px;
                }

                .adv-tiers-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    align-items: stretch;
                }

                .adv-tier {
                    background: #1c1814;
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 24px;
                    padding: 44px 40px;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                    transition: border-color 0.4s, transform 0.4s, background 0.4s;
                }
                .adv-tier:hover {
                    border-color: rgba(163,125,75,0.35);
                    transform: translateY(-4px);
                }
                .adv-tier-featured {
                    background: linear-gradient(160deg, #211b15 0%, #1a1511 100%);
                    border-color: rgba(163,125,75,0.4);
                }
                .adv-tier-featured::before {
                    content: '';
                    position: absolute;
                    top: -40%; right: -30%;
                    width: 480px; height: 480px;
                    background: radial-gradient(circle, rgba(163,125,75,0.12) 0%, transparent 60%);
                    pointer-events: none;
                }

                .adv-tier-index {
                    font-family: var(--serif);
                    font-size: 13px;
                    font-style: italic;
                    color: var(--bronze);
                    opacity: 0.7;
                    margin-bottom: 18px;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .adv-tier-index::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: rgba(163,125,75,0.2);
                }
                .adv-tier-badge {
                    position: absolute;
                    top: 36px; right: 36px;
                    font-family: var(--sans);
                    font-size: 8.5px;
                    font-weight: 800;
                    letter-spacing: 0.28em;
                    text-transform: uppercase;
                    color: #0d0c0a;
                    background: var(--bronze);
                    padding: 6px 12px;
                    border-radius: 100px;
                    z-index: 2;
                }
                .adv-tier-name {
                    font-family: var(--serif);
                    font-size: clamp(26px, 2.4vw, 32px);
                    font-weight: 400;
                    letter-spacing: -0.015em;
                    line-height: 1.1;
                    color: var(--cream);
                    margin-bottom: 14px;
                }
                .adv-tier-name em { font-style: italic; color: var(--bronze); }
                .adv-tier-for {
                    font-family: var(--serif);
                    font-size: 15px;
                    font-style: italic;
                    line-height: 1.5;
                    color: var(--text-mid);
                    margin-bottom: 32px;
                    min-height: 44px;
                }

                .adv-tier-section-label {
                    font-family: var(--sans);
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 0.32em;
                    text-transform: uppercase;
                    color: var(--bronze);
                    opacity: 0.7;
                    margin-bottom: 16px;
                }

                .adv-tier-list { list-style: none; margin: 0 0 28px 0; padding: 0; }
                .adv-tier-list li {
                    font-family: var(--sans);
                    font-size: 13.5px;
                    font-weight: 300;
                    line-height: 1.5;
                    color: var(--text-mid);
                    padding: 9px 0 9px 24px;
                    position: relative;
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                }
                .adv-tier-list li:last-child { border-bottom: none; }
                .adv-tier-list li::before {
                    content: '';
                    position: absolute;
                    left: 2px; top: 16px;
                    width: 5px; height: 5px;
                    border-radius: 50%;
                    background: var(--bronze);
                    opacity: 0.7;
                }

                .adv-tier-includes {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 16px;
                    padding: 22px 24px;
                    margin-bottom: 28px;
                }
                .adv-tier-includes-list { list-style: none; margin: 0; padding: 0; }
                .adv-tier-includes-list li {
                    font-family: var(--sans);
                    font-size: 13px;
                    font-weight: 400;
                    line-height: 1.5;
                    color: var(--cream);
                    padding: 7px 0 7px 26px;
                    position: relative;
                }
                .adv-tier-includes-list li::before {
                    content: '✓';
                    position: absolute;
                    left: 0; top: 6px;
                    color: var(--bronze);
                    font-size: 12px;
                    font-weight: 700;
                }

                .adv-tier-spacer { flex: 1; }

                .adv-tier-pricing {
                    border-top: 1px solid rgba(255,255,255,0.08);
                    padding-top: 26px;
                    margin-top: 4px;
                }
                .adv-tier-price-row { margin-bottom: 18px; }
                .adv-tier-price-row:last-of-type { margin-bottom: 0; }
                .adv-tier-price-label {
                    font-family: var(--sans);
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 0.3em;
                    text-transform: uppercase;
                    color: var(--text-dim);
                    margin-bottom: 6px;
                }
                .adv-tier-price-value {
                    font-family: var(--serif);
                    font-size: clamp(34px, 3.4vw, 44px);
                    font-weight: 400;
                    letter-spacing: -0.02em;
                    color: var(--cream);
                    line-height: 1;
                }
                .adv-tier-price-value .plus { color: var(--bronze); }
                .adv-tier-price-sub {
                    font-family: var(--sans);
                    font-size: 12px;
                    font-weight: 400;
                    font-style: italic;
                    color: var(--text-mid);
                    line-height: 1.4;
                }

                .adv-tier-note {
                    margin-top: 24px;
                    padding: 18px 20px;
                    background: rgba(163,125,75,0.07);
                    border: 1px solid rgba(163,125,75,0.22);
                    border-radius: 14px;
                }
                .adv-tier-note-label {
                    font-family: var(--sans);
                    font-size: 8.5px;
                    font-weight: 800;
                    letter-spacing: 0.28em;
                    text-transform: uppercase;
                    color: var(--bronze);
                    margin-bottom: 8px;
                }
                .adv-tier-note-text {
                    font-family: var(--serif);
                    font-size: 13.5px;
                    font-style: italic;
                    line-height: 1.5;
                    color: var(--text-mid);
                }

                /* PERSPECTIVE */
                .adv-perspective {
                    padding: 130px 48px;
                    background: #0d0c0a;
                }
                .adv-perspective-inner {
                    max-width: 1000px;
                    margin: 0 auto;
                    text-align: center;
                }
                .adv-perspective-rule {
                    width: 1px; height: 56px;
                    background: linear-gradient(to bottom, transparent, var(--bronze));
                    margin: 0 auto 36px;
                }
                .adv-perspective-eyebrow {
                    font-family: var(--sans);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.45em;
                    text-transform: uppercase;
                    color: var(--bronze);
                    opacity: 0.8;
                    margin-bottom: 32px;
                }
                .adv-perspective-quote {
                    font-family: var(--serif);
                    font-size: clamp(28px, 3.6vw, 48px);
                    font-weight: 300;
                    letter-spacing: -0.025em;
                    line-height: 1.2;
                    color: var(--cream);
                    margin-bottom: 48px;
                }
                .adv-perspective-quote em { font-style: italic; color: var(--bronze); }
                .adv-perspective-pills {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 10px;
                    margin-bottom: 44px;
                }
                .adv-perspective-pill {
                    font-family: var(--serif);
                    font-size: 16px;
                    font-style: italic;
                    color: var(--cream);
                    padding: 10px 22px;
                    border: 1px solid rgba(163,125,75,0.3);
                    background: rgba(163,125,75,0.05);
                    border-radius: 100px;
                }
                .adv-perspective-foot {
                    font-family: var(--sans);
                    font-size: 15px;
                    font-weight: 300;
                    line-height: 1.75;
                    color: var(--text-mid);
                    max-width: 56ch;
                    margin: 0 auto;
                }
                .adv-perspective-foot strong { color: var(--cream); font-weight: 500; }

                /* CLOSING */
                .adv-closing {
                    padding: 120px 48px;
                    text-align: center;
                    background: #171410;
                    border-top: 1px solid rgba(255,255,255,0.04);
                }
                .adv-closing-inner { max-width: 720px; margin: 0 auto; }
                .adv-closing-eyebrow {
                    font-family: var(--sans);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.45em;
                    text-transform: uppercase;
                    color: var(--bronze);
                    opacity: 0.8;
                    margin-bottom: 24px;
                }
                .adv-closing-headline {
                    font-family: var(--serif);
                    font-size: clamp(30px, 4vw, 52px);
                    font-weight: 300;
                    letter-spacing: -0.025em;
                    line-height: 1.15;
                    color: var(--cream);
                    margin-bottom: 24px;
                }
                .adv-closing-headline em { font-style: italic; color: var(--bronze); }
                .adv-closing-sub {
                    font-family: var(--sans);
                    font-size: 15px;
                    font-weight: 300;
                    line-height: 1.75;
                    color: var(--text-mid);
                    margin-bottom: 40px;
                }
                .adv-closing-cta {
                    display: inline-flex;
                    align-items: center;
                    gap: 14px;
                    font-family: var(--sans);
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.3em;
                    text-transform: uppercase;
                    color: #0d0c0a;
                    background: var(--bronze);
                    border: none;
                    cursor: pointer;
                    padding: 20px 44px;
                    border-radius: 100px;
                    text-decoration: none;
                    transition: background 0.3s, transform 0.2s, box-shadow 0.3s;
                    box-shadow: 0 8px 48px rgba(163,125,75,0.4);
                }
                .adv-closing-cta:hover {
                    background: var(--cream);
                    transform: scale(1.04);
                    box-shadow: 0 12px 64px rgba(163,125,75,0.55);
                }
                .adv-closing-cta-arrow { transition: transform 0.25s; }
                .adv-closing-cta:hover .adv-closing-cta-arrow { transform: translateX(5px); }

                /* FOOTER */
                .adv-footer {
                    background: #0d0c0a;
                    border-top: 1px solid rgba(255,255,255,0.05);
                    padding: 32px 48px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .adv-footer span {
                    font-family: var(--sans);
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.3em;
                    text-transform: uppercase;
                    color: var(--text-dim);
                }

                /* RESPONSIVE */
                @media (max-width: 1080px) {
                    .adv-tiers-grid { grid-template-columns: 1fr; max-width: 560px; margin: 0 auto; }
                    .adv-hero-inner { grid-template-columns: 1fr; gap: 40px; }
                    .adv-hero-right { border-left: none; padding-left: 0; border-top: 1px solid rgba(163,125,75,0.25); padding-top: 36px; }
                }
                @media (max-width: 760px) {
                    .adv-nav { padding: 18px 20px; flex-wrap: wrap; gap: 14px; }
                    .adv-nav-tabs { padding: 4px; gap: 0; overflow-x: auto; max-width: 100%; }
                    .adv-nav-tab { padding: 8px 12px; font-size: 9px; letter-spacing: 0.16em; }
                    .adv-hero { padding: 130px 24px 60px; }
                    .adv-tiers, .adv-perspective, .adv-closing { padding: 70px 24px; }
                    .adv-tier { padding: 36px 28px; }
                    .adv-footer { padding: 24px; flex-direction: column; gap: 12px; }
                }
            `}</style>

            {/* NAV */}
            <nav className="adv-nav">
                <Link to="/" className="adv-nav-logo">STONEVO</Link>
                <div className="adv-nav-tabs">
                    <Link to="/about" className="adv-nav-tab">About</Link>
                    <Link to="/stone-intelligence" className="adv-nav-tab">Stone Intelligence</Link>
                    <Link to="/advisory" className="adv-nav-tab active">Audit &amp; Advisory</Link>
                    <Link to="/team" className="adv-nav-tab">Our Team</Link>
                </div>
            </nav>

            {/* HERO */}
            <section id="hero" className="adv-hero">
                <div className="adv-hero-watermark">ADVISORY</div>
                <div className="adv-hero-inner">
                    <div>
                        <p className="adv-hero-eyebrow reveal">Stonevo Advisory Experiences</p>
                        <h1 className="adv-hero-headline reveal reveal-delay-1">
                            Every project<br />approaches stone<br /><em>differently.</em>
                        </h1>
                    </div>
                    <aside className="adv-hero-right reveal reveal-delay-2">
                        <div className="adv-hero-lead">
                            <p>Some clients require quick material guidance. Others prefer deeply curated sourcing and <strong>personalized slab experiences.</strong></p>
                            <p>Stonevo offers <em>structured advisory formats</em> designed around different levels of project involvement and coordination.</p>
                        </div>
                    </aside>
                </div>
            </section>

            {/* TIERS */}
            <section className="adv-tiers">
                <div className="adv-tiers-inner">
                    <div className="adv-tiers-head">
                        <div>
                            <p className="adv-section-eyebrow reveal">Three Advisory Formats</p>
                            <h2 className="adv-section-title reveal reveal-delay-1">
                                From a single review<br />to a <em>private curation.</em>
                            </h2>
                        </div>
                        <p className="adv-tiers-head-note reveal reveal-delay-2">
                            Each format scales with the depth of involvement and coordination your project needs.
                        </p>
                    </div>

                    <div className="adv-tiers-grid">
                        {/* TIER 1 */}
                        <article className="adv-tier reveal">
                            <p className="adv-tier-index">Format 01</p>
                            <h3 className="adv-tier-name">Stone Audit<br /><em>Advisory</em></h3>
                            <p className="adv-tier-for">For clients seeking clarity before making a material decision.</p>

                            <p className="adv-tier-section-label">Clients can share</p>
                            <ul className="adv-tier-list">
                                <li>Slab photographs</li>
                                <li>Stone references</li>
                                <li>Shortlisted materials</li>
                                <li>Site visuals</li>
                            </ul>

                            <p className="adv-tier-section-label">Structured advisory feedback on</p>
                            <ul className="adv-tier-list">
                                <li>Material suitability</li>
                                <li>Visual harmony</li>
                                <li>Application relevance</li>
                                <li>Maintenance understanding</li>
                                <li>Potential concerns</li>
                                <li>Alternative recommendations</li>
                            </ul>

                            <div className="adv-tier-includes">
                                <p className="adv-tier-section-label" style={{ marginBottom: 12 }}>Includes</p>
                                <ul className="adv-tier-includes-list">
                                    <li>3 structured advisory responses</li>
                                    <li>Image-based material review</li>
                                    <li>Expert guidance &amp; recommendations</li>
                                </ul>
                            </div>

                            <div className="adv-tier-spacer" />

                            <div className="adv-tier-pricing">
                                <div className="adv-tier-price-row">
                                    <p className="adv-tier-price-label">Advisory Fee</p>
                                    <p className="adv-tier-price-value">₹1,000</p>
                                </div>
                            </div>

                            <div className="adv-tier-note">
                                <p className="adv-tier-note-label">Stonevo Advisory Note</p>
                                <p className="adv-tier-note-text">A stone may look beautiful in isolation but may not align with the architecture, lighting or application of the project.</p>
                            </div>
                        </article>

                        {/* TIER 2 — FEATURED */}
                        <article className="adv-tier adv-tier-featured reveal reveal-delay-1">
                            <span className="adv-tier-badge">Most Chosen</span>
                            <p className="adv-tier-index">Format 02</p>
                            <h3 className="adv-tier-name">Curated Stone<br /><em>Sourcing</em></h3>
                            <p className="adv-tier-for">A guided sourcing experience for projects requiring deeper material involvement.</p>

                            <p className="adv-tier-section-label">Stonevo works closely with you to</p>
                            <ul className="adv-tier-list">
                                <li>Understand project intent</li>
                                <li>Curate suitable material directions</li>
                                <li>Shortlist relevant slabs</li>
                                <li>Coordinate sourcing journeys</li>
                                <li>Simplify final selection decisions</li>
                            </ul>

                            <div className="adv-tier-includes">
                                <p className="adv-tier-section-label" style={{ marginBottom: 12 }}>Includes</p>
                                <ul className="adv-tier-includes-list">
                                    <li>Guided stone sourcing</li>
                                    <li>Curated slab selections</li>
                                    <li>Vendor coordination</li>
                                    <li>Project-aligned recommendations</li>
                                    <li>Selection assistance</li>
                                </ul>
                            </div>

                            <p className="adv-tier-section-label">Designed for</p>
                            <ul className="adv-tier-list">
                                <li>Premium residences</li>
                                <li>Architect-led projects</li>
                                <li>Large-format selections</li>
                                <li>Coordinated material planning</li>
                            </ul>

                            <div className="adv-tier-spacer" />

                            <div className="adv-tier-pricing">
                                <div className="adv-tier-price-row">
                                    <p className="adv-tier-price-label">Professional Fee</p>
                                    <p className="adv-tier-price-value">₹25,000</p>
                                </div>
                                <div className="adv-tier-price-row">
                                    <p className="adv-tier-price-label">Coordination Fee</p>
                                    <p className="adv-tier-price-sub">Applicable on overall material value.</p>
                                </div>
                            </div>
                        </article>

                        {/* TIER 3 */}
                        <article className="adv-tier reveal reveal-delay-2">
                            <p className="adv-tier-index">Format 03</p>
                            <h3 className="adv-tier-name">Private Stone<br /><em>Curation</em></h3>
                            <p className="adv-tier-for">A highly personalized selection experience conducted at the client's location.</p>

                            <p className="adv-tier-section-label">For projects requiring</p>
                            <ul className="adv-tier-list">
                                <li>Deeper privacy &amp; convenience</li>
                                <li>Curated attention</li>
                            </ul>

                            <p className="adv-tier-section-label">Private slab presentations for</p>
                            <ul className="adv-tier-list">
                                <li>Contextual viewing</li>
                                <li>Lighting understanding</li>
                                <li>Architectural alignment</li>
                                <li>Final material confidence</li>
                            </ul>

                            <div className="adv-tier-includes">
                                <p className="adv-tier-section-label" style={{ marginBottom: 12 }}>Includes</p>
                                <ul className="adv-tier-includes-list">
                                    <li>Private slab presentation</li>
                                    <li>Curated material movement</li>
                                    <li>On-site viewing experience</li>
                                    <li>Premium coordination support</li>
                                    <li>Guided selection assistance</li>
                                </ul>
                            </div>

                            <div className="adv-tier-spacer" />

                            <div className="adv-tier-pricing">
                                <div className="adv-tier-price-row">
                                    <p className="adv-tier-price-label">Professional Fee</p>
                                    <p className="adv-tier-price-value">₹75,000<span className="plus"> +</span></p>
                                </div>
                                <div className="adv-tier-price-row">
                                    <p className="adv-tier-price-label">Coordination Fee</p>
                                    <p className="adv-tier-price-sub">Applicable on overall material value.</p>
                                </div>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            {/* PERSPECTIVE */}
            <section className="adv-perspective">
                <div className="adv-perspective-inner">
                    <div className="adv-perspective-rule reveal" />
                    <p className="adv-perspective-eyebrow reveal reveal-delay-1">The Stonevo Perspective</p>
                    <h2 className="adv-perspective-quote reveal reveal-delay-2">
                        The right stone is rarely selected through <em>random browsing</em> alone.
                    </h2>
                    <div className="adv-perspective-pills reveal reveal-delay-3">
                        <span className="adv-perspective-pill">Context</span>
                        <span className="adv-perspective-pill">Curation</span>
                        <span className="adv-perspective-pill">Coordination</span>
                        <span className="adv-perspective-pill">Application understanding</span>
                        <span className="adv-perspective-pill">Thoughtful guidance</span>
                    </div>
                    <p className="adv-perspective-foot reveal reveal-delay-3">
                        Meaningful material selection requires all of the above. <strong>Stonevo exists to simplify that process</strong> through a more structured and refined approach to stone advisory.
                    </p>
                </div>
            </section>

            {/* CLOSING */}
            <section className="adv-closing">
                <div className="adv-closing-inner">
                    <p className="adv-closing-eyebrow reveal reveal-delay-1">Begin an Advisory</p>
                    <h2 className="adv-closing-headline reveal reveal-delay-2">
                        Not sure which format<br /><em>fits your project?</em>
                    </h2>
                    <p className="adv-closing-sub reveal reveal-delay-3">
                        Start with a conversation. We'll help you find the level of involvement that brings the most clarity to your selection.
                    </p>
                    <Link to="/" className="adv-closing-cta reveal reveal-delay-4">
                        Enter the Platform
                        <span className="adv-closing-cta-arrow">→</span>
                    </Link>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="adv-footer">
                <span>Stonevo</span>
                <span>© 2026 Stonevo Architectural. Artifact of Nature.</span>
            </footer>
        </div>
    );
};

export default AdvisoryServices;
