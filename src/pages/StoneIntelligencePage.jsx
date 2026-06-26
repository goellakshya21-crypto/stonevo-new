import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Stone Intelligence — editorial long-read about natural stone
// Ported from the Stone Intelligence.html design 1:1.
function useScrollReveal() {
    useEffect(() => {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('si-vis');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.si').forEach(el => io.observe(el));

        document.querySelectorAll('#si-hero .si').forEach((el, i) => {
            setTimeout(() => el.classList.add('si-vis'), 250 + i * 110);
        });

        return () => io.disconnect();
    }, []);
}

const NavTab = ({ to, active, children }) => (
    <Link
        to={to}
        style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: active ? '#0d0c0a' : 'rgba(253,252,248,0.55)',
            background: active ? '#A37D4B' : 'transparent',
            textDecoration: 'none',
            padding: '10px 22px',
            borderRadius: 100,
            whiteSpace: 'nowrap',
            transition: 'color 0.3s, background 0.3s'
        }}
        onMouseEnter={e => { if (!active) e.target.style.color = '#FDFCF8'; }}
        onMouseLeave={e => { if (!active) e.target.style.color = 'rgba(253,252,248,0.55)'; }}
    >
        {children}
    </Link>
);

const StoneIntelligencePage = () => {
    const navigate = useNavigate();
    const [activeApp, setActiveApp] = useState('flooring');
    useScrollReveal();

    const enter = () => {
        sessionStorage.setItem('sv_enter', '1');
        navigate('/');
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&family=Manrope:wght@300;400;500;700;800&display=swap');

                .si-root { background: #0d0c0a; color: #FDFCF8; font-family: 'Manrope', sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; }
                .si-root *, .si-root *::before, .si-root *::after { box-sizing: border-box; }
                .si-root ::selection { background: rgba(163,125,75,0.25); }

                /* Reveal */
                .si { opacity: 0; transform: translateY(28px); transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1); }
                .si.si-vis { opacity: 1; transform: none; }
                .si-d1 { transition-delay: 0.08s; }
                .si-d2 { transition-delay: 0.16s; }
                .si-d3 { transition-delay: 0.24s; }
                .si-d4 { transition-delay: 0.32s; }

                /* Hero watermark */
                .si-hero-watermark {
                    position: absolute;
                    bottom: -0.18em;
                    left: -0.04em;
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(120px, 18vw, 240px);
                    font-weight: 700;
                    letter-spacing: -0.05em;
                    line-height: 1;
                    color: transparent;
                    -webkit-text-stroke: 1px rgba(163,125,75,0.07);
                    pointer-events: none;
                    user-select: none;
                    z-index: 0;
                }

                .si-eyebrow {
                    font-family: 'Manrope', sans-serif;
                    font-size: 10px; font-weight: 800;
                    letter-spacing: 0.45em; text-transform: uppercase;
                    color: #A37D4B; opacity: 0.75;
                }

                .si-headline {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(48px, 7vw, 92px);
                    font-weight: 300;
                    letter-spacing: -0.03em;
                    line-height: 1.0;
                    color: #FDFCF8;
                }
                .si-headline em { font-style: italic; color: #A37D4B; }

                .si-section-title {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(36px, 5vw, 72px);
                    font-weight: 300;
                    letter-spacing: -0.03em;
                    line-height: 1.1;
                    color: #FDFCF8;
                    margin-bottom: 32px;
                    max-width: 22ch;
                }
                .si-section-title em { font-style: italic; color: #A37D4B; }

                .si-section-intro {
                    font-family: 'Manrope', sans-serif;
                    font-size: 16px; font-weight: 300;
                    line-height: 1.8; color: #a89e8d;
                    max-width: 64ch; margin-bottom: 72px;
                }
                .si-section-intro strong { color: #FDFCF8; font-weight: 500; }
                .si-section-intro em { color: #A37D4B; font-style: italic; }

                /* Understanding list */
                .si-und-list { margin: 28px 0 20px; border-top: 1px solid rgba(163,125,75,0.2); border-bottom: 1px solid rgba(163,125,75,0.2); list-style: none; padding: 0; }
                .si-und-list li {
                    padding: 14px 0;
                    font-family: 'Noto Serif', serif;
                    font-size: 18px; font-style: italic;
                    color: #FDFCF8;
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                    display: flex; align-items: center; gap: 18px;
                }
                .si-und-list li:last-child { border-bottom: none; }
                .si-und-list li::before { content: ''; width: 6px; height: 6px; background: #A37D4B; border-radius: 50%; flex-shrink: 0; }

                /* Advisory note */
                .si-advisory {
                    max-width: 1100px; margin: 80px auto 0;
                    padding: 48px 60px;
                    background: linear-gradient(135deg, rgba(163,125,75,0.08) 0%, rgba(163,125,75,0.02) 100%);
                    border: 1px solid rgba(163,125,75,0.3);
                    border-radius: 24px; position: relative;
                }
                .si-advisory::before {
                    content: '"'; position: absolute; top: 12px; left: 32px;
                    font-family: 'Noto Serif', serif; font-size: 100px;
                    line-height: 1; color: #A37D4B; opacity: 0.2;
                }
                .si-advisory-label {
                    font-family: 'Manrope', sans-serif;
                    font-size: 9.5px; font-weight: 800;
                    letter-spacing: 0.35em; text-transform: uppercase;
                    color: #A37D4B; margin-bottom: 18px;
                    display: flex; align-items: center; gap: 14px;
                }
                .si-advisory-label::before { content: ''; width: 24px; height: 1px; background: #A37D4B; }
                .si-advisory-body {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(20px, 2.3vw, 28px);
                    font-weight: 300; font-style: italic;
                    line-height: 1.45; color: #FDFCF8; letter-spacing: -0.01em;
                }
                .si-advisory-body em { color: #A37D4B; font-style: italic; }

                /* Application tabs */
                .si-app-tab {
                    font-family: 'Manrope', sans-serif;
                    font-size: 10px; font-weight: 800;
                    letter-spacing: 0.25em; text-transform: uppercase;
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #a89e8d;
                    padding: 14px 28px; border-radius: 100px;
                    cursor: pointer; transition: background 0.3s, color 0.3s, border-color 0.3s;
                }
                .si-app-tab:hover { color: #FDFCF8; border-color: rgba(163,125,75,0.4); }
                .si-app-tab.active { background: #A37D4B; color: #0d0c0a; border-color: #A37D4B; }

                .si-app-panel {
                    display: grid;
                    grid-template-columns: 5fr 7fr;
                    gap: 80px;
                    animation: si-appfade 0.5s ease;
                }
                @keyframes si-appfade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }

                .si-app-headline {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(32px, 4vw, 56px);
                    font-weight: 300; letter-spacing: -0.025em;
                    line-height: 1.1; color: #FDFCF8; margin-bottom: 24px;
                }
                .si-app-headline em { font-style: italic; color: #A37D4B; }
                .si-app-body p {
                    font-family: 'Manrope', sans-serif;
                    font-size: 15px; font-weight: 300;
                    line-height: 1.8; color: #a89e8d; margin-bottom: 18px;
                }
                .si-app-body strong { color: #FDFCF8; font-weight: 500; }

                .si-app-considerations {
                    display: grid; grid-template-columns: 1fr; gap: 1px;
                    background: rgba(255,255,255,0.06);
                    border-radius: 16px; overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .si-app-block { background: #1c1814; padding: 28px 32px; }
                .si-app-block-label {
                    font-family: 'Manrope', sans-serif;
                    font-size: 10px; font-weight: 800;
                    letter-spacing: 0.3em; text-transform: uppercase;
                    color: #A37D4B; opacity: 0.8; margin-bottom: 16px;
                }
                .si-app-list { list-style: none; display: flex; flex-wrap: wrap; gap: 8px; padding: 0; margin: 0; }
                .si-app-list li {
                    font-family: 'Noto Serif', serif;
                    font-size: 15px; font-style: italic; color: #FDFCF8;
                    padding: 8px 16px;
                    background: rgba(163,125,75,0.08);
                    border: 1px solid rgba(163,125,75,0.18);
                    border-radius: 100px;
                }
                .si-app-q-list { list-style: none; padding: 0; margin: 0; }
                .si-app-q-list li {
                    font-family: 'Noto Serif', serif;
                    font-size: 16px; font-style: italic;
                    color: #FDFCF8; line-height: 1.5;
                    padding: 10px 0 10px 28px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    position: relative;
                }
                .si-app-q-list li:last-child { border-bottom: none; }
                .si-app-q-list li::before {
                    content: '→'; position: absolute; left: 0; top: 10px;
                    color: #A37D4B; font-style: normal; font-weight: 700;
                }

                /* Categories */
                .si-cat-grid {
                    display: grid; grid-template-columns: repeat(4, 1fr);
                    gap: 1px; background: rgba(255,255,255,0.05);
                    border-radius: 20px; overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .si-cat-card {
                    background: #1c1814;
                    padding: 36px 28px 32px;
                    display: flex; flex-direction: column; gap: 16px;
                    min-height: 380px; transition: background 0.4s;
                }
                .si-cat-card:hover { background: #221e18; }
                .si-cat-swatch {
                    width: 100%; aspect-ratio: 1.6 / 1;
                    border-radius: 10px; position: relative; overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.06);
                }

                .si-sw-marble { background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.18) 22%, transparent 28%, transparent 50%, rgba(255,255,255,0.10) 60%, transparent 68%), linear-gradient(135deg, #d4ccbe 0%, #b4a791 100%); }
                .si-sw-quartzite { background: linear-gradient(120deg, transparent 0%, rgba(180,200,210,0.35) 15%, transparent 22%, transparent 55%, rgba(255,255,255,0.2) 68%, transparent 78%), linear-gradient(135deg, #8ea4ac 0%, #b3c0c4 100%); }
                .si-sw-granite { background: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 8%), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.25) 0%, transparent 6%), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.2) 0%, transparent 5%), radial-gradient(circle at 80% 20%, rgba(0,0,0,0.3) 0%, transparent 7%), linear-gradient(135deg, #5a544c 0%, #3d3833 100%); }
                .si-sw-onyx { background: linear-gradient(125deg, rgba(255,200,150,0.4) 0%, transparent 25%), linear-gradient(60deg, transparent 30%, rgba(255,180,120,0.35) 50%, transparent 75%), linear-gradient(135deg, #c08856 0%, #8a5530 60%, #4f2e18 100%); }
                .si-sw-limestone { background: linear-gradient(135deg, #d6cfc0 0%, #beb6a5 100%); }
                .si-sw-travertine { background: radial-gradient(ellipse at 30% 40%, rgba(140,100,70,0.3) 0%, transparent 30%), radial-gradient(ellipse at 70% 70%, rgba(140,100,70,0.25) 0%, transparent 35%), repeating-linear-gradient(90deg, transparent 0px, rgba(0,0,0,0.04) 2px, transparent 4px, transparent 12px), linear-gradient(135deg, #ccb091 0%, #a88a6a 100%); }
                .si-sw-sandstone { background: repeating-linear-gradient(95deg, transparent 0px, rgba(160,110,70,0.15) 2px, transparent 5px, transparent 20px), linear-gradient(135deg, #c89968 0%, #a17343 100%); }
                .si-sw-quartz { background: linear-gradient(135deg, #ebe6dd 0%, #d2cbbf 100%); }

                .si-cat-name { font-family: 'Noto Serif', serif; font-size: 24px; font-weight: 400; color: #FDFCF8; letter-spacing: -0.01em; }
                .si-cat-num { font-family: 'Manrope', sans-serif; font-size: 10px; font-weight: 800; letter-spacing: 0.25em; color: #A37D4B; opacity: 0.6; }
                .si-cat-tagline { font-family: 'Noto Serif', serif; font-size: 14px; font-style: italic; color: #A37D4B; opacity: 0.85; line-height: 1.4; }
                .si-cat-body { font-family: 'Manrope', sans-serif; font-size: 12.5px; font-weight: 300; line-height: 1.7; color: #a89e8d; }
                .si-cat-suited { margin-top: auto; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); }
                .si-cat-suited-label { font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 800; letter-spacing: 0.3em; text-transform: uppercase; color: #A37D4B; opacity: 0.6; margin-bottom: 6px; }
                .si-cat-suited-list { font-family: 'Noto Serif', serif; font-size: 12px; font-style: italic; color: #a89e8d; line-height: 1.5; }

                /* Moods */
                .si-mood-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
                .si-mood-card {
                    background: #1c1814;
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 20px;
                    padding: 44px 40px;
                    transition: border-color 0.4s, background 0.4s;
                    display: grid; grid-template-columns: 80px 1fr;
                    gap: 32px; align-items: start;
                }
                .si-mood-card:hover { border-color: rgba(163,125,75,0.3); background: #211d18; }
                .si-mood-icon {
                    width: 80px; height: 80px; border-radius: 50%;
                    border: 1px solid rgba(163,125,75,0.35);
                    display: flex; align-items: center; justify-content: center;
                    background: linear-gradient(135deg, rgba(163,125,75,0.1) 0%, transparent 100%);
                }
                .si-mood-icon span { font-family: 'Noto Serif', serif; font-size: 32px; font-style: italic; color: #A37D4B; }
                .si-mood-name { font-family: 'Noto Serif', serif; font-size: 28px; font-weight: 400; letter-spacing: -0.015em; color: #FDFCF8; margin-bottom: 14px; }
                .si-mood-name em { font-style: italic; color: #A37D4B; }
                .si-mood-materials { font-family: 'Noto Serif', serif; font-size: 14px; font-style: italic; color: #a89e8d; line-height: 1.6; margin-bottom: 18px; }
                .si-mood-pills { display: flex; flex-wrap: wrap; gap: 6px; }
                .si-mood-pill {
                    font-family: 'Manrope', sans-serif;
                    font-size: 10px; font-weight: 700;
                    letter-spacing: 0.2em; text-transform: uppercase;
                    color: #A37D4B; padding: 6px 14px;
                    background: rgba(163,125,75,0.08);
                    border: 1px solid rgba(163,125,75,0.2);
                    border-radius: 100px;
                }

                /* Mistakes */
                .si-mistake-list { counter-reset: si-mistake; list-style: none; border-top: 1px solid rgba(255,255,255,0.06); padding: 0; margin: 0; }
                .si-mistake-item {
                    display: grid; grid-template-columns: 100px 1fr 2fr;
                    gap: 48px; padding: 44px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    align-items: start; counter-increment: si-mistake;
                }
                .si-mistake-num { font-family: 'Noto Serif', serif; font-size: 14px; font-style: italic; color: #A37D4B; }
                .si-mistake-num::before { content: counter(si-mistake, decimal-leading-zero); margin-right: 8px; }
                .si-mistake-title { font-family: 'Noto Serif', serif; font-size: clamp(20px, 1.9vw, 26px); font-weight: 400; letter-spacing: -0.01em; color: #FDFCF8; line-height: 1.3; }
                .si-mistake-body { font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 300; line-height: 1.75; color: #a89e8d; }
                .si-mistake-body strong { color: #FDFCF8; font-weight: 500; }
                .si-mistake-body em { color: #A37D4B; font-style: italic; }
                .si-mistake-body ul { margin-top: 12px; padding-left: 18px; }
                .si-mistake-body ul li { margin-bottom: 4px; }

                /* Checklist */
                .si-checklist-grid { display: grid; grid-template-columns: 5fr 7fr; gap: 80px; align-items: start; }
                .si-checklist-items {
                    display: flex; flex-direction: column; gap: 1px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 20px; overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .si-checklist-item {
                    background: #1c1814; padding: 24px 28px;
                    display: flex; gap: 20px; align-items: center;
                    transition: background 0.3s;
                }
                .si-checklist-item:hover { background: #221e18; }
                .si-checklist-mark {
                    width: 28px; height: 28px;
                    border: 1px solid rgba(163,125,75,0.5);
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-family: 'Manrope', sans-serif;
                    font-size: 10px; font-weight: 800; color: #A37D4B;
                    flex-shrink: 0;
                }
                .si-checklist-text { font-family: 'Noto Serif', serif; font-size: 16px; color: #FDFCF8; line-height: 1.5; letter-spacing: -0.005em; }
                .si-checklist-text em { font-style: italic; color: #A37D4B; }

                /* Closing */
                .si-closing-rule { width: 1px; height: 60px; background: linear-gradient(to bottom, transparent, #A37D4B); margin: 0 auto 32px; }
                .si-closing-headline { font-family: 'Noto Serif', serif; font-size: clamp(32px, 4.2vw, 56px); font-weight: 300; letter-spacing: -0.025em; line-height: 1.15; color: #FDFCF8; margin-bottom: 24px; }
                .si-closing-headline em { font-style: italic; color: #A37D4B; }
                .si-closing-cta {
                    display: inline-flex; align-items: center; gap: 14px;
                    font-family: 'Manrope', sans-serif;
                    font-size: 11px; font-weight: 800;
                    letter-spacing: 0.3em; text-transform: uppercase;
                    color: #0d0c0a; background: #A37D4B;
                    border: none; cursor: pointer;
                    padding: 20px 44px; border-radius: 100px;
                    text-decoration: none;
                    transition: background 0.3s, transform 0.2s, box-shadow 0.3s;
                    box-shadow: 0 8px 48px rgba(163,125,75,0.4);
                }
                .si-closing-cta:hover { background: #FDFCF8; transform: scale(1.04); box-shadow: 0 12px 64px rgba(163,125,75,0.55); }

                /* Responsive */
                @media (max-width: 1100px) {
                    .si-cat-grid { grid-template-columns: repeat(2, 1fr) !important; }
                    .si-mood-grid { grid-template-columns: 1fr !important; }
                    .si-hero-inner { grid-template-columns: 1fr !important; gap: 40px !important; }
                    .si-hero-right { border-left: none !important; padding-left: 0 !important; border-top: 1px solid rgba(163,125,75,0.25); padding-top: 36px !important; }
                    .si-und-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
                    .si-app-panel { grid-template-columns: 1fr !important; gap: 48px !important; }
                    .si-checklist-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
                }
                @media (max-width: 760px) {
                    .si-nav { padding: 20px 24px !important; }
                    .si-nav-tabs { padding: 4px !important; gap: 0 !important; }
                    .si-section, .si-hero { padding: 70px 24px !important; }
                    .si-closing { padding: 80px 24px !important; }
                    .si-cat-grid { grid-template-columns: 1fr !important; }
                    .si-mistake-item { grid-template-columns: 1fr !important; gap: 12px !important; padding: 28px 0 !important; }
                    .si-advisory { padding: 32px 28px !important; }
                    .si-footer { padding: 24px !important; flex-direction: column !important; gap: 12px !important; }
                }
            `}</style>

            <div className="si-root">
                {/* NAV */}
                <nav className="si-nav" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '28px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,12,10,0.85) 0%, transparent 100%)', pointerEvents: 'none' }} />
                    <Link to="/" style={{ position: 'relative', zIndex: 1, fontFamily: 'Noto Serif, serif', fontSize: 18, letterSpacing: '0.2em', color: '#FDFCF8', textDecoration: 'none' }}>STON</Link>
                    <div className="si-nav-tabs" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(28,24,20,0.55)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 100, padding: 5 }}>
                        <NavTab to="/about">About</NavTab>
                        <NavTab to="/stone-intelligence" active>Stone Intelligence</NavTab>
                        <NavTab to="/team">Our Team</NavTab>
                        <NavTab to="/advisory">Audit & Advisory</NavTab>
                    </div>
                </nav>

                {/* HERO */}
                <section id="si-hero" className="si-hero" style={{ position: 'relative', minHeight: '80vh', display: 'flex', alignItems: 'center', padding: '160px 48px 80px', background: '#0d0c0a', overflow: 'hidden' }}>
                    <div className="si-hero-watermark">INTELLIGENCE</div>
                    <div className="si-hero-inner" style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '6fr 5fr', gap: 80, alignItems: 'center' }}>
                        <div>
                            <p className="si si-eyebrow" style={{ opacity: 0.85, marginBottom: 28 }}>Stone Intelligence</p>
                            <h1 className="si si-d1 si-headline" style={{ marginBottom: 24 }}>
                                A more <em>thoughtful</em><br />way to understand<br />natural stone.
                            </h1>
                            <p className="si si-d2" style={{ fontFamily: 'Noto Serif, serif', fontSize: 22, fontStyle: 'italic', color: '#A37D4B', opacity: 0.9, maxWidth: '32ch', lineHeight: 1.4 }}>
                                Not what stone is — but how to think about stone correctly.
                            </p>
                        </div>
                        <aside className="si si-d2 si-hero-right" style={{ borderLeft: '1px solid rgba(163,125,75,0.25)', paddingLeft: 40, paddingBottom: 8 }}>
                            <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 300, lineHeight: 1.8, color: '#a89e8d', marginBottom: 28 }}>
                                Most people begin stone selection by looking at colors, photos or small samples. <strong style={{ color: '#FDFCF8', fontWeight: 500 }}>Very few understand how deeply stone affects</strong> the feeling of a space, long-term maintenance, visual continuity, project coordination, and execution quality.
                            </p>
                            <div style={{ display: 'flex', gap: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                {[
                                    ['Applications', '4 areas'],
                                    ['Categories', '8 stones'],
                                    ['Read', '~ 10 min']
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 9, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#A37D4B', opacity: 0.7, marginBottom: 6 }}>{label}</p>
                                        <p style={{ fontFamily: 'Noto Serif, serif', fontSize: 18, fontStyle: 'italic', color: '#FDFCF8' }}>{value}</p>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>
                </section>

                {/* UNDERSTANDING */}
                <section className="si-section" style={{ padding: '120px 48px', background: '#171410', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                        <p className="si si-eyebrow" style={{ marginBottom: 24 }}>Understanding Natural Stone</p>
                        <div className="si-und-grid" style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 100, alignItems: 'start' }}>
                            <div className="si si-d1" style={{ fontFamily: 'Noto Serif, serif', fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 300, lineHeight: 1.2, letterSpacing: '-0.025em', color: '#FDFCF8' }}>
                                Natural stone is not <em style={{ fontStyle: 'italic', color: '#A37D4B' }}>manufactured perfection.</em><br /><br />
                                Its beauty lies in <em style={{ fontStyle: 'italic', color: '#A37D4B' }}>variation, movement and individuality.</em>
                            </div>
                            <div className="si si-d2">
                                <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 300, lineHeight: 1.8, color: '#a89e8d', marginBottom: 20 }}>Every slab carries:</p>
                                <ul className="si-und-list">
                                    <li>Unique mineral formations</li>
                                    <li>Natural textures</li>
                                    <li>Movement patterns</li>
                                    <li>Tonal variation</li>
                                    <li>Character developed over thousands of years</li>
                                </ul>
                                <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 300, lineHeight: 1.8, color: '#a89e8d', marginBottom: 20 }}>
                                    <strong style={{ color: '#FDFCF8', fontWeight: 500 }}>No two slabs are ever completely identical.</strong> This is exactly what makes natural stone timeless — and also why selection requires careful understanding.
                                </p>
                            </div>
                        </div>

                        <div className="si si-advisory">
                            <p className="si-advisory-label">Ston Advisory Note</p>
                            <p className="si-advisory-body">
                                Many premium projects fail to achieve the desired outcome not because the stone was poor — but because the <em>wrong slab was selected, coordinated or applied incorrectly.</em>
                            </p>
                        </div>
                    </div>
                </section>

                {/* APPLICATIONS */}
                <section className="si-section" style={{ padding: '120px 48px', background: '#0d0c0a' }}>
                    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                        <p className="si si-eyebrow" style={{ marginBottom: 24 }}>Stone by Application</p>
                        <h2 className="si si-d1 si-section-title">
                            Where the stone goes<br />changes <em>everything.</em>
                        </h2>
                        <p className="si si-d2 si-section-intro">
                            Different applications demand different thinking. Flooring is not feature wall. A washroom is not a staircase. Each context has its own logic — and the right stone is the one that respects it.
                        </p>

                        <div className="si si-d2" style={{ display: 'flex', gap: 8, marginBottom: 48, flexWrap: 'wrap' }}>
                            {[
                                ['flooring', 'Flooring'],
                                ['washrooms', 'Washrooms'],
                                ['staircases', 'Staircases'],
                                ['features', 'Feature Walls']
                            ].map(([id, label]) => (
                                <button
                                    key={id}
                                    className={`si-app-tab ${activeApp === id ? 'active' : ''}`}
                                    onClick={() => setActiveApp(id)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {activeApp === 'flooring' && (
                            <div className="si-app-panel">
                                <div>
                                    <h3 className="si-app-headline">Flooring is not a surface.<br />It is the <em>visual foundation</em> of the space.</h3>
                                    <div className="si-app-body">
                                        <p>The right flooring stone creates <strong>continuity, calmness, scale, and timelessness.</strong></p>
                                        <p>The wrong flooring choice can make even a premium home feel visually fragmented.</p>
                                    </div>
                                </div>
                                <div className="si-app-considerations">
                                    <div className="si-app-block">
                                        <p className="si-app-block-label">What matters in selection</p>
                                        <ul className="si-app-list">
                                            <li>Consistency across slabs</li>
                                            <li>Movement intensity</li>
                                            <li>Finish selection</li>
                                            <li>Maintenance expectations</li>
                                            <li>Lot continuity</li>
                                            <li>Natural light interaction</li>
                                        </ul>
                                    </div>
                                    <div className="si-app-block">
                                        <p className="si-app-block-label">Before selecting, ask</p>
                                        <ul className="si-app-q-list">
                                            <li>Do I want calmness or dramatic movement?</li>
                                            <li>Will this feel timeless after ten years?</li>
                                            <li>Can this material maintain continuity across large areas?</li>
                                            <li>Does this fit the architectural language of the home?</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeApp === 'washrooms' && (
                            <div className="si-app-panel">
                                <div>
                                    <h3 className="si-app-headline">Less about size.<br />More about <em>precision.</em></h3>
                                    <div className="si-app-body">
                                        <p>Washrooms require a different mindset because spaces are smaller, moisture exposure is higher, detailing becomes more visible, and continuity matters more.</p>
                                        <p><strong>Many clients over-invest visually but under-think practicality.</strong></p>
                                    </div>
                                </div>
                                <div className="si-app-considerations">
                                    <div className="si-app-block">
                                        <p className="si-app-block-label">Ideal selection considers</p>
                                        <ul className="si-app-list">
                                            <li>Moisture behavior</li>
                                            <li>Anti-slip finish</li>
                                            <li>Edge detailing</li>
                                            <li>Smaller matching lots</li>
                                            <li>Stain sensitivity</li>
                                            <li>Maintenance expectations</li>
                                        </ul>
                                    </div>
                                    <div className="si-advisory" style={{ margin: 0, padding: '32px 36px' }}>
                                        <p className="si-advisory-label">Ston Advisory Note</p>
                                        <p className="si-advisory-body" style={{ fontSize: 18 }}>
                                            A beautiful washroom is rarely created by expensive stone alone. It is created through <em>coordinated material selection, detailing and execution.</em>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeApp === 'staircases' && (
                            <div className="si-app-panel">
                                <div>
                                    <h3 className="si-app-headline">Staircases reveal <em>execution quality</em> more than almost any other area.</h3>
                                    <div className="si-app-body">
                                        <p>A staircase should feel <strong>seamless, balanced, and visually flowing.</strong></p>
                                        <p>Poor matching, inconsistent lots or weak edge detailing become immediately noticeable.</p>
                                    </div>
                                </div>
                                <div className="si-app-considerations">
                                    <div className="si-app-block">
                                        <p className="si-app-block-label">Key considerations</p>
                                        <ul className="si-app-list">
                                            <li>Slab continuity</li>
                                            <li>Edge finishing</li>
                                            <li>Movement flow</li>
                                            <li>Joint visibility</li>
                                            <li>Staircase lighting</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeApp === 'features' && (
                            <div className="si-app-panel">
                                <div>
                                    <h3 className="si-app-headline">Some stones blend in.<br />Others become the <em>soul of the space.</em></h3>
                                    <div className="si-app-body">
                                        <p>Feature walls allow natural stone to become expressive and architectural — where <strong>bookmatching, dramatic movement, translucency, and texture</strong> create extraordinary visual impact.</p>
                                    </div>
                                </div>
                                <div className="si-app-considerations">
                                    <div className="si-app-block">
                                        <p className="si-app-block-label">Common feature wall materials</p>
                                        <ul className="si-app-list">
                                            <li>Onyx</li>
                                            <li>Expressive marble</li>
                                            <li>Textured quartzite</li>
                                            <li>Backlit applications</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* CATEGORIES */}
                <section className="si-section" style={{ padding: '120px 48px', background: '#171410', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                        <p className="si si-eyebrow" style={{ marginBottom: 24 }}>Understanding Stone Categories</p>
                        <h2 className="si si-d1 si-section-title">
                            Eight materials.<br /><em>Eight personalities.</em>
                        </h2>
                        <p className="si si-d2 si-section-intro">
                            Each natural stone carries its own emotional register. Knowing the difference is the first step to selecting well.
                        </p>

                        <div className="si-cat-grid">
                            {[
                                { sw: 'si-sw-marble', name: 'Marble', num: '01', tag: 'Not luxury. Emotion.', body: 'Softness, depth, timelessness, quiet elegance. Natural movement gives spaces warmth and individuality impossible to replicate.', best: 'flooring · premium interiors · washrooms · feature spaces', delay: '' },
                                { sw: 'si-sw-quartzite', name: 'Quartzite', num: '02', tag: 'Beauty with strength.', body: 'Marble-like movement with better durability for high-use applications. Architectural, confident, contemporary, refined.', best: 'kitchen countertops · flooring · high-traffic areas', delay: 'si-d1' },
                                { sw: 'si-sw-granite', name: 'Granite', num: '03', tag: 'Performance over poetry.', body: 'Visually controlled, structurally reliable. Long-term practicality and durability — strong, dependable, structured.', best: 'kitchens · commercial spaces · outdoor applications', delay: 'si-d2' },
                                { sw: 'si-sw-onyx', name: 'Onyx', num: '04', tag: 'Not subtle. Expressive luxury.', body: 'Translucency and dramatic formations make it one of the most visually striking natural stones. Artistic, dramatic, bold.', best: 'feature walls · backlit panels · statement areas', delay: 'si-d3' },
                                { sw: 'si-sw-limestone', name: 'Limestone', num: '05', tag: 'Calm architecture.', body: 'Selected for balance, not attention. Minimal, calm, earthy, timeless — understated sophistication.', best: 'contemporary homes · muted interiors · soft architectural spaces', delay: '' },
                                { sw: 'si-sw-travertine', name: 'Travertine', num: '06', tag: 'Warmth, character, time.', body: 'Natural texture grounds the space architecturally. Warm, earthy, timeless, natural.', best: 'luxury hospitality aesthetics · wall cladding · warm minimal interiors', delay: 'si-d1' },
                                { sw: 'si-sw-sandstone', name: 'Sandstone', num: '07', tag: 'Architecture meets nature.', body: 'Texture and earthy character — ideal for spaces requiring warmth and tactility. Textured, grounded, natural.', best: 'outdoor applications · facades · landscape areas', delay: 'si-d2' },
                                { sw: 'si-sw-quartz', name: 'Quartz', num: '08', tag: 'Designed consistency.', body: 'Unlike natural stone, quartz offers controlled patterns and lower maintenance. Clean, modern, practical, controlled.', best: 'kitchens · modern interiors · low-maintenance spaces', delay: 'si-d3' }
                            ].map(c => (
                                <div key={c.name} className={`si si-cat-card ${c.delay}`}>
                                    <div className={`si-cat-swatch ${c.sw}`} />
                                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                                        <span className="si-cat-name">{c.name}</span>
                                        <span className="si-cat-num">{c.num}</span>
                                    </div>
                                    <p className="si-cat-tagline">{c.tag}</p>
                                    <p className="si-cat-body">{c.body}</p>
                                    <div className="si-cat-suited">
                                        <p className="si-cat-suited-label">Best for</p>
                                        <p className="si-cat-suited-list">{c.best}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* MOODS */}
                <section className="si-section" style={{ padding: '120px 48px', background: '#0d0c0a' }}>
                    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                        <p className="si si-eyebrow" style={{ marginBottom: 24 }}>Material Personality Guide</p>
                        <h2 className="si si-d1 si-section-title">
                            What do you want<br />the space to <em>feel like?</em>
                        </h2>
                        <p className="si si-d2 si-section-intro">Start from the emotion. Stone follows.</p>

                        <div className="si-mood-grid">
                            {[
                                { mark: '◯', name: 'Calm &', italic: 'Minimal', materials: 'Limestone · soft marble · light travertine', pills: ['Quiet luxury', 'Softness', 'Visual calmness'], delay: '' },
                                { mark: '◆', name: 'Bold &', italic: 'Dramatic', materials: 'Onyx · heavy-vein marble · expressive quartzite', pills: ['Visual impact', 'Artistic expression', 'Statement spaces'], delay: 'si-d1' },
                                { mark: '~', name: 'Warm &', italic: 'Earthy', materials: 'Travertine · sandstone · textured limestone', pills: ['Warmth', 'Grounded spaces', 'Natural depth'], delay: 'si-d2' },
                                { mark: '⏐', name: 'Sharp &', italic: 'Contemporary', materials: 'Quartzite · granite · engineered quartz', pills: ['Precision', 'Modernity', 'Architectural sharpness'], delay: 'si-d3' }
                            ].map(m => (
                                <div key={m.italic} className={`si si-mood-card ${m.delay}`}>
                                    <div className="si-mood-icon"><span>{m.mark}</span></div>
                                    <div>
                                        <h3 className="si-mood-name">{m.name} <em>{m.italic}</em></h3>
                                        <p className="si-mood-materials">{m.materials}</p>
                                        <div className="si-mood-pills">
                                            {m.pills.map(p => <span key={p} className="si-mood-pill">{p}</span>)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* MISTAKES */}
                <section className="si-section" style={{ padding: '120px 48px', background: '#171410', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                        <p className="si si-eyebrow" style={{ marginBottom: 24 }}>Common Mistakes</p>
                        <h2 className="si si-d1 si-section-title">
                            Four ways stone selection<br /><em>goes wrong.</em>
                        </h2>

                        <ol className="si-mistake-list">
                            <li className="si si-mistake-item">
                                <span className="si-mistake-num" />
                                <h3 className="si-mistake-title">Selecting from small samples only</h3>
                                <div className="si-mistake-body">A sample can never represent the movement and character of a full slab. <em>Many materials look completely different at full scale.</em></div>
                            </li>
                            <li className="si si-mistake-item">
                                <span className="si-mistake-num" />
                                <h3 className="si-mistake-title">Prioritizing price over suitability</h3>
                                <div className="si-mistake-body">
                                    The cheapest stone often becomes expensive through:
                                    <ul>
                                        <li>maintenance</li>
                                        <li>replacement</li>
                                        <li>poor coordination</li>
                                        <li>visual inconsistency</li>
                                    </ul>
                                </div>
                            </li>
                            <li className="si si-mistake-item">
                                <span className="si-mistake-num" />
                                <h3 className="si-mistake-title">Ignoring lot continuity</h3>
                                <div className="si-mistake-body">Large areas require slab consistency. Mixed lots can create tonal mismatch, uneven movement, and broken visual flow.</div>
                            </li>
                            <li className="si si-mistake-item">
                                <span className="si-mistake-num" />
                                <h3 className="si-mistake-title">Depending entirely on contractor suggestions</h3>
                                <div className="si-mistake-body">Contractors often prioritize <strong>ease of installation, availability, and familiarity</strong> — not always design alignment or long-term outcome.</div>
                            </li>
                        </ol>
                    </div>
                </section>

                {/* CHECKLIST */}
                <section className="si-section" style={{ padding: '120px 48px', background: '#0d0c0a' }}>
                    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                        <div className="si-checklist-grid">
                            <div>
                                <p className="si si-eyebrow" style={{ marginBottom: 24 }}>Before You Visit a Stone Yard</p>
                                <h2 className="si si-d1 si-section-title" style={{ marginBottom: 28 }}>
                                    A stone yard can create<br /><em>clarity — or confusion.</em>
                                </h2>
                                <p className="si si-d2 si-section-intro" style={{ marginBottom: 0 }}>
                                    Walking in without clarity guarantees walking out with more questions than answers. Five things to know first.
                                </p>
                            </div>

                            <div className="si-checklist-items">
                                {[
                                    { num: '01', text: <>What <em>mood</em> you want the space to create</>, delay: '' },
                                    { num: '02', text: <>Where the stone will be <em>applied</em></>, delay: 'si-d1' },
                                    { num: '03', text: <>Whether you prefer <em>subtle or expressive</em> movement</>, delay: 'si-d2' },
                                    { num: '04', text: <>Your <em>maintenance</em> expectations</>, delay: 'si-d3' },
                                    { num: '05', text: <><em>Lighting</em> conditions of the space</>, delay: 'si-d4' }
                                ].map(item => (
                                    <div key={item.num} className={`si si-checklist-item ${item.delay}`}>
                                        <span className="si-checklist-mark">{item.num}</span>
                                        <span className="si-checklist-text">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="si si-advisory" style={{ marginTop: 80 }}>
                            <p className="si-advisory-label">Ston Advisory Note</p>
                            <p className="si-advisory-body">
                                Stone selection becomes significantly easier when viewed within the context of <em>architecture, application, lighting, continuity, and execution realities.</em>
                            </p>
                        </div>
                    </div>
                </section>

                {/* WHY ADVISORY */}
                <section className="si-section" style={{ padding: '120px 48px', background: '#171410', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                        <p className="si si-eyebrow" style={{ marginBottom: 24 }}>Why Stone Advisory Matters</p>
                        <h2 className="si si-d1 si-section-title">
                            Natural stone is not <em>purchased.</em><br />It is <em>coordinated.</em>
                        </h2>
                        <p className="si si-d2 si-section-intro">
                            A successful stone outcome depends on correct material selection, slab understanding, sourcing quality, lot continuity, execution coordination, and design alignment.<br /><br />
                            <strong>Without structure, even expensive materials can lead to disappointing outcomes.</strong>
                        </p>
                    </div>
                </section>

                {/* CLOSING */}
                <section className="si-closing" style={{ padding: '140px 48px', textAlign: 'center', background: '#0d0c0a' }}>
                    <div style={{ maxWidth: 820, margin: '0 auto' }}>
                        <div className="si si-closing-rule" />
                        <p className="si si-d1 si-eyebrow" style={{ marginBottom: 24, opacity: 0.8 }}>The Ston Perspective</p>
                        <h2 className="si si-d2 si-closing-headline">
                            Spaces that feel<br /><em>timeless, balanced, beautifully resolved.</em>
                        </h2>
                        <p className="si si-d3" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 300, lineHeight: 1.75, color: '#a89e8d', marginBottom: 40 }}>
                            Selecting stone should feel informed, calm, collaborative, and thoughtfully guided. The goal is not simply to help choose a material — it is to help create spaces that last.
                        </p>
                        <button onClick={enter} className="si si-d4 si-closing-cta">
                            Enter the Platform
                            <span>→</span>
                        </button>
                    </div>
                </section>

                {/* FOOTER */}
                <footer className="si-footer" style={{ background: '#0d0c0a', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#6b6357' }}>Ston</span>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#6b6357' }}>© 2026 Ston Architectural. Artifact of Nature.</span>
                </footer>
            </div>
        </>
    );
};

export default StoneIntelligencePage;
