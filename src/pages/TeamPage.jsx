import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Team page — editorial layout with founder spotlight + 4-card grid.
// Ported 1:1 from the Team.html design bundle.
function useScrollReveal() {
    useEffect(() => {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('tp-vis');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.tp').forEach(el => io.observe(el));

        document.querySelectorAll('#tp-hero .tp').forEach((el, i) => {
            setTimeout(() => el.classList.add('tp-vis'), 250 + i * 110);
        });

        return () => io.disconnect();
    }, []);
}

const TeamPage = () => {
    const navigate = useNavigate();
    useScrollReveal();

    const enter = () => {
        sessionStorage.setItem('sv_enter', '1');
        navigate('/');
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&family=Manrope:wght@300;400;500;700;800&display=swap');

                .tp-root { background: #0d0c0a; color: #FDFCF8; font-family: 'Manrope', sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; overflow-x: hidden; }
                .tp-root *, .tp-root *::before, .tp-root *::after { box-sizing: border-box; }
                .tp-root ::selection { background: rgba(163,125,75,0.25); }

                /* Reveal */
                .tp { opacity: 0; transform: translateY(28px); transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1); }
                .tp.tp-vis { opacity: 1; transform: none; }
                .tp-d1 { transition-delay: 0.08s; }
                .tp-d2 { transition-delay: 0.16s; }
                .tp-d3 { transition-delay: 0.24s; }
                .tp-d4 { transition-delay: 0.32s; }
                .tp-d5 { transition-delay: 0.40s; }

                /* Nav tabs */
                .tp-tab {
                    font-family: 'Manrope', sans-serif;
                    font-size: 10px; font-weight: 800;
                    letter-spacing: 0.28em; text-transform: uppercase;
                    color: rgba(253,252,248,0.55);
                    text-decoration: none;
                    padding: 10px 22px;
                    border-radius: 100px;
                    white-space: nowrap;
                    transition: color 0.3s, background 0.3s;
                }
                .tp-tab:hover { color: #FDFCF8; }
                .tp-tab.active { background: #A37D4B; color: #0d0c0a; }

                /* Hero */
                .tp-hero-watermark {
                    position: absolute;
                    top: 50%; right: -0.04em;
                    transform: translateY(-40%);
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(140px, 22vw, 320px);
                    font-weight: 700;
                    letter-spacing: -0.05em;
                    line-height: 1;
                    color: transparent;
                    -webkit-text-stroke: 1px rgba(163,125,75,0.07);
                    pointer-events: none; user-select: none;
                    z-index: 0;
                }
                .tp-eyebrow {
                    font-family: 'Manrope', sans-serif;
                    font-size: 10px; font-weight: 800;
                    letter-spacing: 0.45em; text-transform: uppercase;
                    color: #A37D4B; opacity: 0.85;
                    margin-bottom: 28px;
                }
                .tp-hero-headline {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(48px, 7vw, 96px);
                    font-weight: 300;
                    letter-spacing: -0.03em;
                    line-height: 1.05;
                    color: #FDFCF8;
                    max-width: 16ch;
                    margin-bottom: 36px;
                }
                .tp-hero-headline em { font-style: italic; color: #A37D4B; }
                .tp-hero-lead {
                    display: grid;
                    grid-template-columns: 60px 1fr;
                    gap: 40px;
                    align-items: start;
                    max-width: 880px;
                }
                .tp-hero-lead-rule { height: 1px; background: #A37D4B; margin-top: 16px; opacity: 0.7; }
                .tp-hero-lead-text {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(18px, 1.8vw, 24px);
                    font-weight: 300;
                    line-height: 1.55;
                    color: #FDFCF8;
                    letter-spacing: -0.005em;
                }
                .tp-hero-lead-text em { font-style: italic; color: #A37D4B; font-weight: 400; }
                .tp-hero-chapter-row {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-top: 80px; padding-top: 28px;
                    border-top: 1px solid rgba(255,255,255,0.06);
                }
                .tp-hero-chapter { font-family: 'Noto Serif', serif; font-size: 12px; letter-spacing: 0.3em; color: #6b6357; text-transform: uppercase; }
                .tp-hero-count { font-family: 'Noto Serif', serif; font-size: 14px; font-style: italic; color: #A37D4B; opacity: 0.8; }

                /* Founder card */
                .tp-founder-card {
                    display: grid;
                    grid-template-columns: 360px 1fr;
                    gap: 80px;
                    align-items: center;
                    padding: 72px;
                    background: linear-gradient(135deg, #1c1814 0%, #1a1612 100%);
                    border: 1px solid rgba(163,125,75,0.22);
                    border-radius: 28px;
                    position: relative;
                    overflow: hidden;
                }
                .tp-founder-card::before {
                    content: '';
                    position: absolute;
                    top: -30%; right: -10%;
                    width: 700px; height: 700px;
                    background: radial-gradient(circle, rgba(163,125,75,0.14) 0%, transparent 55%);
                    pointer-events: none;
                }
                .tp-founder-card::after {
                    content: '';
                    position: absolute;
                    bottom: -50%; left: -20%;
                    width: 500px; height: 500px;
                    background: radial-gradient(circle, rgba(197,160,89,0.06) 0%, transparent 55%);
                    pointer-events: none;
                }
                .tp-founder-portrait {
                    width: 280px; height: 280px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #2a241d 0%, #1a1612 100%);
                    border: 1px solid rgba(163,125,75,0.4);
                    display: flex; align-items: center; justify-content: center;
                    position: relative; overflow: hidden; flex-shrink: 0;
                }
                .tp-founder-portrait::before {
                    content: '';
                    position: absolute; inset: 0;
                    background:
                        radial-gradient(ellipse at 28% 22%, rgba(163,125,75,0.22) 0%, transparent 60%),
                        radial-gradient(ellipse at 75% 78%, rgba(197,160,89,0.12) 0%, transparent 60%);
                }
                .tp-founder-portrait::after {
                    content: '';
                    position: absolute; inset: -2px;
                    border-radius: 50%;
                    background: conic-gradient(from 200deg, transparent 0deg, rgba(163,125,75,0.5) 90deg, transparent 200deg);
                    z-index: -1; filter: blur(12px);
                }
                .tp-founder-portrait-mark {
                    font-family: 'Noto Serif', serif;
                    font-size: 96px; font-weight: 300; font-style: italic;
                    color: #A37D4B; letter-spacing: 0.02em;
                    position: relative; z-index: 1;
                }
                .tp-founder-text { position: relative; z-index: 1; }
                .tp-founder-tag {
                    display: inline-flex; align-items: center; gap: 10px;
                    font-family: 'Manrope', sans-serif;
                    font-size: 9px; font-weight: 800;
                    letter-spacing: 0.3em; text-transform: uppercase;
                    color: #A37D4B;
                    border: 1px solid rgba(163,125,75,0.4);
                    background: rgba(163,125,75,0.06);
                    padding: 8px 16px; border-radius: 100px;
                    margin-bottom: 24px;
                }
                .tp-founder-tag::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #A37D4B; }
                .tp-founder-role {
                    font-family: 'Manrope', sans-serif;
                    font-size: 10px; font-weight: 800;
                    letter-spacing: 0.35em; text-transform: uppercase;
                    color: #a89e8d; margin-bottom: 20px;
                }
                .tp-founder-name {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(40px, 4.5vw, 64px);
                    font-weight: 400; letter-spacing: -0.025em;
                    line-height: 1; color: #FDFCF8; margin-bottom: 28px;
                }
                .tp-founder-bio {
                    font-family: 'Manrope', sans-serif;
                    font-size: 16px; font-weight: 300;
                    line-height: 1.8; color: #a89e8d;
                    max-width: 54ch;
                }

                /* Team grid */
                .tp-grid-title {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(34px, 4.5vw, 60px);
                    font-weight: 300; letter-spacing: -0.025em;
                    line-height: 1.1; color: #FDFCF8;
                    max-width: 22ch; margin-bottom: 64px;
                }
                .tp-grid-title em { font-style: italic; color: #A37D4B; }
                .tp-team-grid {
                    display: grid; grid-template-columns: repeat(3, 1fr);
                    gap: 1px; background: rgba(255,255,255,0.05);
                    border-radius: 24px; overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .tp-team-card {
                    background: #1c1814;
                    padding: 44px 32px;
                    transition: background 0.4s;
                    display: flex; flex-direction: column;
                    gap: 16px; min-height: 380px;
                }
                .tp-team-tag {
                    display: inline-flex; align-items: center; gap: 8px;
                    font-family: 'Manrope', sans-serif;
                    font-size: 9px; font-weight: 800;
                    letter-spacing: 0.3em; text-transform: uppercase;
                    color: #A37D4B;
                    border: 1px solid rgba(163,125,75,0.4);
                    background: rgba(163,125,75,0.06);
                    padding: 6px 12px; border-radius: 100px;
                    width: fit-content;
                }
                .tp-team-tag::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: #A37D4B; }
                .tp-team-tag.co::before { background: rgba(163,125,75,0.5); }
                .tp-team-card:hover { background: #221e18; }
                .tp-team-portrait {
                    width: 96px; height: 96px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #2a241d 0%, #1a1612 100%);
                    border: 1px solid rgba(163,125,75,0.3);
                    display: flex; align-items: center; justify-content: center;
                    position: relative; overflow: hidden;
                    flex-shrink: 0; margin-bottom: 4px;
                }
                .tp-team-portrait::before {
                    content: ''; position: absolute; inset: 0;
                    background:
                        radial-gradient(ellipse at 30% 20%, rgba(163,125,75,0.2) 0%, transparent 60%),
                        radial-gradient(ellipse at 70% 80%, rgba(197,160,89,0.1) 0%, transparent 60%);
                }
                .tp-team-portrait-mark {
                    font-family: 'Noto Serif', serif;
                    font-size: 32px; font-weight: 300; font-style: italic;
                    color: #A37D4B; position: relative; z-index: 1;
                }
                .tp-team-role {
                    font-family: 'Manrope', sans-serif;
                    font-size: 9.5px; font-weight: 800;
                    letter-spacing: 0.28em; text-transform: uppercase;
                    color: #A37D4B; opacity: 0.8; line-height: 1.5;
                }
                .tp-team-name {
                    font-family: 'Noto Serif', serif;
                    font-size: 24px; font-weight: 400;
                    letter-spacing: -0.01em; color: #FDFCF8; line-height: 1.15;
                }
                .tp-team-bio {
                    font-family: 'Manrope', sans-serif;
                    font-size: 13px; font-weight: 300;
                    line-height: 1.7; color: #a89e8d; margin-top: auto;
                }

                /* Closing */
                .tp-closing-rule { width: 1px; height: 60px; background: linear-gradient(to bottom, transparent, #A37D4B); margin: 0 auto 36px; }
                .tp-closing-headline {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(32px, 4.2vw, 56px);
                    font-weight: 300; letter-spacing: -0.025em;
                    line-height: 1.15; color: #FDFCF8; margin-bottom: 24px;
                }
                .tp-closing-headline em { font-style: italic; color: #A37D4B; }
                .tp-closing-cta {
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
                .tp-closing-cta:hover { background: #FDFCF8; transform: scale(1.04); box-shadow: 0 12px 64px rgba(163,125,75,0.55); }
                .tp-closing-cta-arrow { transition: transform 0.25s; display: inline-block; }
                .tp-closing-cta:hover .tp-closing-cta-arrow { transform: translateX(5px); }

                /* Responsive */
                @media (max-width: 1100px) {
                    .tp-team-grid { grid-template-columns: 1fr 1fr !important; }
                }
                @media (max-width: 900px) {
                    .tp-nav { padding: 20px 24px !important; }
                    .tp-nav-tabs { gap: 0 !important; padding: 4px !important; }
                    .tp-tab { padding: 8px 14px !important; font-size: 9px !important; letter-spacing: 0.22em !important; }
                    .tp-hero { padding: 110px 24px 60px !important; }
                    .tp-grid-section, .tp-closing { padding: 60px 24px !important; }
                    .tp-footer { padding: 24px !important; flex-direction: column !important; gap: 12px !important; }
                    .tp-hero-lead { grid-template-columns: 1fr !important; gap: 20px !important; }
                    .tp-hero-lead-rule { width: 60px !important; }
                }
                @media (max-width: 640px) {
                    .tp-team-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>

            <div className="tp-root">
                {/* NAV */}
                <nav className="tp-nav" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '28px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,12,10,0.7) 0%, transparent 100%)', pointerEvents: 'none' }} />
                    <Link to="/" style={{ position: 'relative', zIndex: 1, fontFamily: 'Noto Serif, serif', fontSize: 18, letterSpacing: '0.2em', color: '#FDFCF8', textDecoration: 'none', transition: 'color 0.3s' }}
                        onMouseEnter={e => e.target.style.color = '#A37D4B'}
                        onMouseLeave={e => e.target.style.color = '#FDFCF8'}
                    >STONEVO</Link>
                    <div className="tp-nav-tabs" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(28,24,20,0.55)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 100, padding: 5 }}>
                        <Link to="/about" className="tp-tab">About</Link>
                        <Link to="/stone-intelligence" className="tp-tab">Stone Intelligence</Link>
                        <Link to="/team" className="tp-tab active">Our Team</Link>
                    </div>
                </nav>

                {/* HERO */}
                <section id="tp-hero" className="tp-hero" style={{ position: 'relative', minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '140px 48px 100px', background: '#0d0c0a', overflow: 'hidden' }}>
                    <div className="tp-hero-watermark">PEOPLE</div>
                    <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
                        <p className="tp tp-eyebrow">The People Behind Stonevo</p>
                        <h1 className="tp tp-d1 tp-hero-headline">
                            Built around<br /><em>relationships,</em><br />not transactions.
                        </h1>
                        <div className="tp tp-d2 tp-hero-lead">
                            <div className="tp-hero-lead-rule"></div>
                            <p className="tp-hero-lead-text">
                                Built on <em>years of experience</em> across premium natural stone projects, sourcing ecosystems and design-led collaborations — the Stonevo team brings together diverse industry perspectives with a <em>shared vision</em> of creating a more structured approach to stone selection and coordination.
                            </p>
                        </div>
                        <div className="tp tp-d3 tp-hero-chapter-row">
                            <span className="tp-hero-chapter">Five &nbsp;—&nbsp; together</span>
                            <span className="tp-hero-count">A founding circle</span>
                        </div>
                    </div>
                </section>

                {/* TEAM GRID — Munish included alongside the co-founders */}
                <section className="tp-grid-section" style={{ background: '#171410', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '120px 48px' }}>
                    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                        <p className="tp tp-eyebrow" style={{ marginBottom: 20, opacity: 0.75 }}>The Founding Circle</p>
                        <h2 className="tp tp-d1 tp-grid-title">
                            Each voice covers<br />a different <em>stretch of the journey.</em>
                        </h2>

                        <div className="tp-team-grid">
                            {[
                                { mark: 'MG', tag: 'Founder',    tagClass: '',   role: <>Vision &amp; Strategic<br />Coordination</>,         name: 'Munish Goel',    bio: "Creating a more structured ecosystem around stone selection, sourcing and project coordination — through advisory-led thinking and long-term industry relationships. Munish leads Stonevo's vision and shapes how every project is approached.", delay: '' },
                                { mark: 'NC', tag: 'Co-founder', tagClass: 'co', role: <>Design-Led<br />Selections</>,                       name: 'Neeti Chawla',   bio: 'Bringing together material understanding, aesthetics and thoughtful curation to help create more refined and design-aligned stone selections.', delay: 'tp-d1' },
                                { mark: 'SA', tag: 'Co-founder', tagClass: 'co', role: <>Building Relationships<br />&amp; Trust</>,           name: 'Saurabh Anand',  bio: 'Focused on creating strong relationships and long-term trust among clients, architects and project stakeholders.', delay: 'tp-d2' },
                                { mark: 'M',  tag: 'Co-founder', tagClass: 'co', role: <>Material Curation<br />&amp; Vendor Alignment</>,    name: 'Mithilesh',      bio: 'Identifying premium-grade selections, maintaining strong vendor relationships and ensuring access to well-curated lots across projects.', delay: 'tp-d3' }
                            ].map(m => (
                                <article key={m.name} className={`tp tp-team-card ${m.delay}`}>
                                    <div className="tp-team-portrait">
                                        <div className="tp-team-portrait-mark">{m.mark}</div>
                                    </div>
                                    <span className={`tp-team-tag ${m.tagClass}`}>{m.tag}</span>
                                    <p className="tp-team-role">{m.role}</p>
                                    <h3 className="tp-team-name">{m.name}</h3>
                                    <p className="tp-team-bio">{m.bio}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CLOSING */}
                <section className="tp-closing" style={{ padding: '120px 48px', textAlign: 'center', background: '#0d0c0a' }}>
                    <div style={{ maxWidth: 720, margin: '0 auto' }}>
                        <div className="tp tp-closing-rule" />
                        <p className="tp tp-d1 tp-eyebrow" style={{ marginBottom: 24, opacity: 0.8 }}>Work With Us</p>
                        <h2 className="tp tp-d2 tp-closing-headline">
                            Have a project in mind?<br /><em>We'd love to hear from you.</em>
                        </h2>
                        <p className="tp tp-d3" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 300, lineHeight: 1.75, color: '#a89e8d', marginBottom: 40 }}>
                            Reach out — whether you're early in design intent or deep into selection. We engage where we can add the most clarity.
                        </p>
                        <button onClick={enter} className="tp tp-d4 tp-closing-cta">
                            Enter the Platform
                            <span className="tp-closing-cta-arrow">→</span>
                        </button>
                    </div>
                </section>

                {/* FOOTER */}
                <footer className="tp-footer" style={{ background: '#0d0c0a', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#6b6357' }}>Stonevo</span>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#6b6357' }}>© 2026 Stonevo Architectural. Artifact of Nature.</span>
                </footer>
            </div>
        </>
    );
};

export default TeamPage;
