import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const TEAM = [
    {
        name: 'Munish Goel',
        role: 'Vision & Strategic Coordination',
        bio: 'Creating a more structured ecosystem around stone selection, sourcing and project coordination through advisory-led thinking and long-term industry relationships.',
        initial: 'M',
        index: '01',
    },
    {
        name: 'Neeti Chawla',
        role: 'Design-Led Selections',
        bio: 'Bringing together material understanding, aesthetics and thoughtful curation to help create more refined and design-aligned stone selections.',
        initial: 'N',
        index: '02',
    },
    {
        name: 'Saurabh Anand',
        role: 'Building Relationships & Trust',
        bio: 'Focused on creating strong relationships and long-term trust among clients, architects and project stakeholders.',
        initial: 'S',
        index: '03',
    },
    {
        name: 'Hemant Tuteja',
        role: 'Strategic Market Expansion',
        bio: 'Focused on strengthening Stonevo\'s market presence through meaningful industry connections, project opportunities and long-term business relationships.',
        initial: 'H',
        index: '04',
    },
    {
        name: 'Mithilesh',
        role: 'Material Curation & Vendor Alignment',
        bio: 'Focused on identifying premium-grade selections, maintaining strong vendor relationships and ensuring access to well-curated lots across projects.',
        initial: 'M',
        index: '05',
    },
];

function useScrollReveal() {
    useEffect(() => {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('sv-vis');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.sv').forEach(el => io.observe(el));

        document.querySelectorAll('#tp-hero .sv').forEach((el, i) => {
            setTimeout(() => el.classList.add('sv-vis'), 260 + i * 100);
        });

        return () => io.disconnect();
    }, []);
}

const TeamPage = () => {
    const navigate = useNavigate();
    useScrollReveal();

    return (
        <>
            <style>{`
                .sv {
                    opacity: 0;
                    transform: translateY(26px);
                    transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1);
                }
                .sv.sv-vis { opacity: 1; transform: none; }
                .sv-d1 { transition-delay: 0.10s; }
                .sv-d2 { transition-delay: 0.22s; }
                .sv-d3 { transition-delay: 0.34s; }
                .sv-d4 { transition-delay: 0.46s; }

                .tp-watermark {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(100px, 16vw, 220px);
                    font-weight: 700;
                    letter-spacing: -0.04em;
                    line-height: 1;
                    color: transparent;
                    -webkit-text-stroke: 1px rgba(253,252,248,0.045);
                    user-select: none;
                    pointer-events: none;
                    white-space: nowrap;
                }

                .tp-headline {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(42px, 6vw, 88px);
                    font-weight: 300;
                    letter-spacing: -0.03em;
                    line-height: 1.0;
                    color: #FDFCF8;
                }

                .tp-card {
                    background: #1a1713;
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 20px;
                    padding: 44px 40px 40px;
                    position: relative;
                    overflow: hidden;
                    transition: background 0.4s, border-color 0.4s, transform 0.4s;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                }
                .tp-card:hover {
                    background: #211d19;
                    border-color: rgba(163,125,75,0.18);
                    transform: translateY(-3px);
                }

                .tp-card-ghost {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(80px, 10vw, 140px);
                    font-weight: 700;
                    letter-spacing: -0.05em;
                    line-height: 1;
                    color: transparent;
                    -webkit-text-stroke: 1px rgba(163,125,75,0.08);
                    position: absolute;
                    bottom: -16px;
                    right: 24px;
                    user-select: none;
                    pointer-events: none;
                    transition: -webkit-text-stroke-color 0.4s;
                }
                .tp-card:hover .tp-card-ghost {
                    -webkit-text-stroke-color: rgba(163,125,75,0.14);
                }

                .tp-name {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(22px, 2.4vw, 32px);
                    font-weight: 400;
                    font-style: italic;
                    color: #FDFCF8;
                    letter-spacing: -0.02em;
                    line-height: 1.1;
                    margin-bottom: 10px;
                }

                .tp-role {
                    font-family: 'Manrope', sans-serif;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.3em;
                    text-transform: uppercase;
                    color: #A37D4B;
                    margin-bottom: 24px;
                }

                .tp-bio {
                    font-family: 'Manrope', sans-serif;
                    font-size: 13px;
                    font-weight: 300;
                    line-height: 1.75;
                    color: #7a7062;
                }

                .tp-card:hover .tp-bio {
                    color: #a89e8d;
                }

                .tp-index {
                    font-family: 'Noto Serif', serif;
                    font-size: 11px;
                    font-style: italic;
                    color: rgba(163,125,75,0.4);
                    margin-bottom: 28px;
                    display: block;
                }

                .tp-rule {
                    width: 36px;
                    height: 1px;
                    background: linear-gradient(to right, #A37D4B, rgba(163,125,75,0.1));
                    margin-bottom: 24px;
                    border-radius: 1px;
                }

                .tp-cta {
                    transition: background 0.3s, transform 0.2s, box-shadow 0.3s;
                }
                .tp-cta:hover {
                    background: #FDFCF8 !important;
                    transform: scale(1.04);
                    box-shadow: 0 12px 64px rgba(163,125,75,0.65);
                }

                @media (max-width: 900px) {
                    .tp-grid { grid-template-columns: 1fr 1fr !important; }
                }
                @media (max-width: 600px) {
                    .tp-grid { grid-template-columns: 1fr !important; }
                    .tp-hero-pad { padding: 100px 24px 60px !important; }
                    .tp-section-pad { padding: 80px 24px !important; }
                    .tp-footer-pad { padding: 28px 24px !important; }
                }
            `}</style>

            {/* ── NAV ─────────────────────────────────────────────────────────── */}
            <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, padding:'28px 48px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(to bottom, rgba(13,12,10,0.75) 0%, transparent 100%)' }}>
                <Link to="/" style={{ fontFamily:'Noto Serif, serif', fontSize:18, letterSpacing:'0.2em', color:'#FDFCF8', textDecoration:'none', transition:'color 0.3s' }}
                    onMouseEnter={e => e.target.style.color='#A37D4B'}
                    onMouseLeave={e => e.target.style.color='#FDFCF8'}
                >STONEVO</Link>
                <Link to="/about" style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.28em', textTransform:'uppercase', color:'rgba(253,252,248,0.35)', textDecoration:'none', transition:'color 0.3s' }}
                    onMouseEnter={e => e.target.style.color='#A37D4B'}
                    onMouseLeave={e => e.target.style.color='rgba(253,252,248,0.35)'}
                >About</Link>
            </nav>

            {/* ── HERO ────────────────────────────────────────────────────────── */}
            <section id="tp-hero" style={{ position:'relative', background:'#0d0c0a', overflow:'hidden', paddingTop:160, paddingBottom:100, paddingLeft:48, paddingRight:48 }} className="tp-hero-pad">
                {/* watermark */}
                <div className="tp-watermark" style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:0, opacity:1 }}>PEOPLE</div>

                <div style={{ position:'relative', zIndex:1, maxWidth:1400, margin:'0 auto' }}>
                    <p className="sv" style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:800, letterSpacing:'0.45em', textTransform:'uppercase', color:'#A37D4B', opacity:0.75, marginBottom:20 }}>
                        Stonevo
                    </p>
                    <h1 className="sv sv-d1 tp-headline">
                        The people<br />behind the <em style={{ fontStyle:'italic', color:'#A37D4B' }}>work.</em>
                    </h1>
                    <div style={{ marginTop:36, display:'flex', alignItems:'center', gap:24 }}>
                        <div className="sv sv-d2" style={{ width:60, height:1, background:'rgba(163,125,75,0.4)' }} />
                        <p className="sv sv-d2" style={{ fontFamily:'Manrope, sans-serif', fontSize:14, fontWeight:300, color:'#7a7062', lineHeight:1.7, maxWidth:'46ch' }}>
                            A small, focused team — each person bringing a distinct lens to how Stonevo thinks, works, and delivers.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── DIVIDER LINE ────────────────────────────────────────────────── */}
            <div style={{ height:1, background:'linear-gradient(to right, transparent, rgba(163,125,75,0.2), transparent)', margin:'0 48px' }} />

            {/* ── TEAM GRID ───────────────────────────────────────────────────── */}
            <section style={{ background:'#0d0c0a', padding:'80px 48px 140px' }} className="tp-section-pad">
                <div style={{ maxWidth:1400, margin:'0 auto' }}>

                    {/* Top row — 3 cards */}
                    <div className="tp-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:16 }}>
                        {TEAM.slice(0, 3).map((person, i) => (
                            <div key={person.index} className={`sv tp-card sv-d${i + 1}`}>
                                <span className="tp-index">{person.index}</span>
                                <div className="tp-rule" />
                                <p className="tp-name">{person.name}</p>
                                <p className="tp-role">{person.role}</p>
                                <p className="tp-bio">{person.bio}</p>
                                <span className="tp-card-ghost">{person.initial}</span>
                            </div>
                        ))}
                    </div>

                    {/* Bottom row — 2 cards centred */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16 }}>
                        <div />
                        {TEAM.slice(3).map((person, i) => (
                            <div key={person.index} className={`sv tp-card sv-d${i + 1}`}>
                                <span className="tp-index">{person.index}</span>
                                <div className="tp-rule" />
                                <p className="tp-name">{person.name}</p>
                                <p className="tp-role">{person.role}</p>
                                <p className="tp-bio">{person.bio}</p>
                                <span className="tp-card-ghost">{person.initial}</span>
                            </div>
                        ))}
                    </div>

                </div>
            </section>

            {/* ── CLOSING ─────────────────────────────────────────────────────── */}
            <section style={{ background:'#171410', borderTop:'1px solid rgba(255,255,255,0.04)', padding:'120px 48px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:28 }}>
                <div style={{ width:1, height:56, background:'linear-gradient(to bottom, transparent, #A37D4B)', marginBottom:8 }} />
                <p className="sv" style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:800, letterSpacing:'0.45em', textTransform:'uppercase', color:'#A37D4B', opacity:0.7 }}>A Shared Purpose</p>
                <h2 className="sv sv-d1" style={{ fontFamily:'Noto Serif, serif', fontSize:'clamp(32px,4.5vw,60px)', fontWeight:300, letterSpacing:'-0.03em', lineHeight:1.1, color:'#FDFCF8', maxWidth:'20ch' }}>
                    Different roles.<br />One <em style={{ fontStyle:'italic', color:'#A37D4B' }}>direction.</em>
                </h2>
                <p className="sv sv-d2" style={{ fontFamily:'Manrope, sans-serif', fontSize:14, fontWeight:300, lineHeight:1.75, color:'#a89e8d', maxWidth:'38ch' }}>
                    Together, we are building a more structured, design-aligned way to select and source stone — for every project, every brief, every space.
                </p>
                <button
                    onClick={() => { sessionStorage.setItem('sv_enter', '1'); navigate('/'); }}
                    className="sv sv-d3 tp-cta"
                    style={{ fontFamily:'Manrope, sans-serif', fontSize:11, fontWeight:800, letterSpacing:'0.28em', textTransform:'uppercase', color:'#0d0c0a', background:'#A37D4B', border:'none', cursor:'pointer', padding:'18px 44px', borderRadius:100, marginTop:8, boxShadow:'0 8px 40px rgba(163,125,75,0.35)' }}
                >
                    Enter the Platform
                </button>
            </section>

            {/* ── FOOTER ──────────────────────────────────────────────────────── */}
            <footer style={{ background:'#0d0c0a', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'32px 48px', display:'flex', justifyContent:'space-between', alignItems:'center' }} className="tp-footer-pad">
                <span style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', color:'#6b6357' }}>Stonevo</span>
                <span style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', color:'#6b6357' }}>© {new Date().getFullYear()} Stonevo Architectural. Artifact of Nature.</span>
            </footer>
        </>
    );
};

export default TeamPage;
