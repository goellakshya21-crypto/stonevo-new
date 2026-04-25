import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8V6FefDxODr-gE99KmfKBpOaa7ttQxkZ43OooLIpRStirrlnpEbS74TLoks1cTJC7WIE05o0WSG1rrobP6A11bk4cdMgnZc3C8vmpO02BkFSzx2EBW-SHM-x_k8sPmgLv28tIpN7XsPjzR0044NOm-tdNaobs0RJZt9yLnddY2-82SmOdaItBgqdiMXLbbJVFuQ2K8_r67GJq2rLXJtBzohjaCvwJjo_0DsFjPUboYWOcOscR61Go52debRHXQR7AtYtvl2TNuyrv';

function useScrollReveal() {
    useEffect(() => {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('sv-vis');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.sv').forEach(el => io.observe(el));

        document.querySelectorAll('#sv-hero .sv').forEach((el, i) => {
            setTimeout(() => el.classList.add('sv-vis'), 280 + i * 110);
        });

        return () => io.disconnect();
    }, []);
}

const AboutPage = () => {
    const navigate = useNavigate();
    useScrollReveal();

    const enter = () => {
        sessionStorage.setItem('sv_enter', '1');
        navigate('/');
    };

    return (
        <>
            <style>{`
                .sv {
                    opacity: 0;
                    transform: translateY(28px);
                    transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1);
                }
                .sv.sv-vis { opacity: 1; transform: none; }
                .sv-d1 { transition-delay: 0.10s; }
                .sv-d2 { transition-delay: 0.20s; }
                .sv-d3 { transition-delay: 0.30s; }
                .sv-d4 { transition-delay: 0.45s; }

                @keyframes sv-drift {
                    from { transform: scale(1.08) translateX(0); }
                    to   { transform: scale(1.08) translateX(-1.5%); }
                }
                .sv-drift { animation: sv-drift 18s ease-in-out infinite alternate; }

                .sv-watermark {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(120px, 20vw, 280px);
                    font-weight: 700;
                    letter-spacing: -0.04em;
                    line-height: 1;
                    color: transparent;
                    -webkit-text-stroke: 1px rgba(253,252,248,0.06);
                    user-select: none;
                    pointer-events: none;
                }

                .sv-headline {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(52px, 8vw, 108px);
                    font-weight: 300;
                    letter-spacing: -0.03em;
                    line-height: 1.0;
                    color: #FDFCF8;
                    max-width: 14ch;
                    margin-bottom: 36px;
                }

                .sv-manifesto-text {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(32px, 4.5vw, 68px);
                    font-weight: 300;
                    letter-spacing: -0.02em;
                    line-height: 1.15;
                    color: #FDFCF8;
                }

                .sv-problem-stmt {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(18px, 2.2vw, 30px);
                    font-weight: 300;
                    color: #FDFCF8;
                    line-height: 1.3;
                    letter-spacing: -0.01em;
                }

                .sv-phil-h2 {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(38px, 5vw, 72px);
                    font-weight: 300;
                    letter-spacing: -0.03em;
                    line-height: 1.1;
                    color: #FDFCF8;
                }

                .sv-diff-title {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(36px, 4.5vw, 66px);
                    font-weight: 300;
                    letter-spacing: -0.03em;
                    line-height: 1.1;
                    color: #FDFCF8;
                    max-width: 16ch;
                    margin-bottom: 72px;
                }

                .sv-built-h2 {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(40px, 5vw, 72px);
                    font-weight: 300;
                    letter-spacing: -0.03em;
                    line-height: 1.1;
                    color: #FDFCF8;
                    margin-bottom: 28px;
                }

                .sv-closing-h2 {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(36px, 5vw, 72px);
                    font-weight: 300;
                    letter-spacing: -0.03em;
                    line-height: 1.1;
                    color: #FDFCF8;
                    max-width: 18ch;
                }

                .sv-phil-num {
                    font-family: 'Noto Serif', serif;
                    font-size: 72px;
                    font-weight: 300;
                    color: transparent;
                    -webkit-text-stroke: 1px rgba(163,125,75,0.2);
                    line-height: 1;
                    margin-bottom: 28px;
                    display: block;
                    letter-spacing: -0.04em;
                }

                .sv-ghost-num {
                    font-family: 'Noto Serif', serif;
                    font-size: clamp(100px, 16vw, 220px);
                    font-weight: 700;
                    letter-spacing: -0.05em;
                    color: transparent;
                    -webkit-text-stroke: 1px rgba(163,125,75,0.08);
                    line-height: 1;
                    user-select: none;
                    pointer-events: none;
                }

                .sv-diff-row:hover { background: rgba(255,255,255,0.012); }
                .sv-prob-item:hover { background: rgba(255,255,255,0.01); }
                .sv-phil-card:hover { background: #201c18; }
                .sv-built-card:hover { background: #201c18; }
                .sv-cta:hover { background: #FDFCF8; transform: scale(1.04); box-shadow: 0 12px 64px rgba(163,125,75,0.65); }
                .sv-nav-enter:hover { background: #FDFCF8; transform: scale(1.03); }

                @media (max-width: 900px) {
                    .sv-manifesto-grid { grid-template-columns: 1fr !important; }
                    .sv-manifesto-followup { grid-template-columns: 1fr !important; }
                    .sv-phil-grid { grid-template-columns: 1fr 1fr !important; }
                    .sv-phil-header { grid-template-columns: 1fr !important; }
                    .sv-diff-row { grid-template-columns: 1fr !important; gap: 8px !important; }
                    .sv-diff-arrow { display: none !important; }
                    .sv-built-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
                    .sv-prob-item { grid-template-columns: 48px 1fr !important; }
                    .sv-prob-tag { display: none !important; }
                }
            `}</style>

            {/* NAV */}
            <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, padding:'28px 48px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(to bottom, rgba(13,12,10,0.7) 0%, transparent 100%)' }}>
                <Link to="/" style={{ fontFamily:'Noto Serif, serif', fontSize:18, letterSpacing:'0.2em', color:'#FDFCF8', textDecoration:'none', transition:'color 0.3s' }}
                    onMouseEnter={e=>e.target.style.color='#A37D4B'}
                    onMouseLeave={e=>e.target.style.color='#FDFCF8'}
                >STONEVO</Link>
            </nav>

            {/* HERO */}
            <section id="sv-hero" style={{ position:'relative', minHeight:'100vh', display:'grid', gridTemplateRows:'1fr auto', overflow:'hidden', background:'#0d0c0a' }}>
                {/* bg */}
                <div style={{ position:'absolute', inset:0, zIndex:0 }}>
                    <img src={IMG} alt="Stone texture" className="sv-drift" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(160deg, rgba(13,12,10,0.55) 0%, rgba(13,12,10,0.2) 45%, rgba(13,12,10,0.92) 100%)' }} />
                </div>

                {/* watermark */}
                <div className="sv-watermark" style={{ position:'absolute', bottom:'-0.1em', right:'-0.02em', zIndex:1 }}>STONE</div>

                {/* content */}
                <div style={{ position:'relative', zIndex:2, padding:'120px 48px 60px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                    <p className="sv" style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:800, letterSpacing:'0.45em', textTransform:'uppercase', color:'#A37D4B', opacity:0.85, marginBottom:28 }}>About Stonevo</p>
                    <h1 className="sv sv-headline sv-d1">
                        The&nbsp;evolution<br />of <em style={{ fontStyle:'italic', color:'#A37D4B' }}>stone</em><br />selection.
                    </h1>
                    <p className="sv sv-d2" style={{ fontFamily:'Manrope, sans-serif', fontSize:15, fontWeight:300, color:'#a89e8d', maxWidth:'38ch', lineHeight:1.7, marginBottom:44 }}>
                        Redefining how stone is selected, sourced, and experienced — in alignment with design intent.
                    </p>
                    <div className="sv sv-d3" style={{ display:'flex', alignItems:'center', gap:28, flexWrap:'wrap' }}>
                        <button onClick={enter} className="sv-cta" style={{ display:'inline-flex', alignItems:'center', gap:14, fontFamily:'Manrope, sans-serif', fontSize:12, fontWeight:800, letterSpacing:'0.22em', textTransform:'uppercase', color:'#0d0c0a', background:'#A37D4B', border:'none', cursor:'pointer', padding:'20px 44px', borderRadius:100, transition:'background 0.3s, transform 0.2s, box-shadow 0.3s', boxShadow:'0 8px 48px rgba(163,125,75,0.5), 0 2px 12px rgba(0,0,0,0.4)' }}>
                            Enter Platform
                            <span style={{ fontSize:16, transition:'transform 0.25s', display:'inline-block' }}>→</span>
                        </button>
                        <p style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:500, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(253,252,248,0.28)', lineHeight:1.8 }}>
                            Stone archive · AI assistant · Advisory
                        </p>
                    </div>
                </div>

                {/* bottom bar */}
                <div style={{ position:'relative', zIndex:2, padding:'0 48px 48px', display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                    <span className="sv" style={{ fontFamily:'Noto Serif, serif', fontSize:11, letterSpacing:'0.3em', color:'#6b6357', textTransform:'uppercase' }}>Chapter I — Origin</span>
                    <div className="sv" style={{ display:'flex', alignItems:'center', gap:12, fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', color:'#6b6357' }}>
                        <div style={{ width:40, height:1, background:'#6b6357' }} />
                        Scroll
                    </div>
                </div>
            </section>

            {/* MANIFESTO */}
            <section style={{ padding:'140px 48px', background:'#0d0c0a' }}>
                <div className="sv-manifesto-grid" style={{ maxWidth:1400, margin:'0 auto', display:'grid', gridTemplateColumns:'200px 1fr', gap:48, alignItems:'start' }}>
                    <p className="sv" style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:800, letterSpacing:'0.45em', textTransform:'uppercase', color:'#A37D4B', opacity:0.75, paddingTop:14 }}>Our Story</p>
                    <div>
                        <p className="sv sv-manifesto-text sv-d1">
                            Stone is one of the most defining elements of a space. Yet the process of selecting it is&nbsp;<em style={{ fontStyle:'italic', color:'#A37D4B' }}>fragmented, uncertain, and misaligned.</em>
                        </p>
                        <div className="sv-manifesto-followup" style={{ marginTop:40, borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:32, display:'grid', gridTemplateColumns:'1fr 1fr', gap:48 }}>
                            <p className="sv sv-d2" style={{ fontFamily:'Manrope, sans-serif', fontSize:15, fontWeight:300, lineHeight:1.75, color:'#a89e8d' }}>
                                <strong style={{ color:'#FDFCF8', fontWeight:500 }}>Multiple yard visits. Endless options. Unclear pricing.</strong> Decisions made without full design alignment — and outcomes that rarely match the original intent.
                            </p>
                            <p className="sv sv-d3" style={{ fontFamily:'Manrope, sans-serif', fontSize:15, fontWeight:300, lineHeight:1.75, color:'#a89e8d' }}>
                                Stonevo was created to change this. Not as a marketplace, not as a supplier — but as a <strong style={{ color:'#FDFCF8', fontWeight:500 }}>structured partner</strong> in the design and procurement process.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* PROBLEM */}
            <section style={{ background:'#171410', borderTop:'1px solid rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.04)', padding:'140px 48px', overflow:'hidden', position:'relative' }}>
                <div className="sv-ghost-num" style={{ position:'absolute', top:60, right:48 }}>02</div>
                <div style={{ maxWidth:1400, margin:'0 auto' }}>
                    <p className="sv" style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:800, letterSpacing:'0.45em', textTransform:'uppercase', color:'#A37D4B', opacity:0.75, marginBottom:60 }}>The Problem</p>
                    <ul style={{ listStyle:'none', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                        {[
                            ['01.', 'Stone shapes a space more than almost any other material choice.', 'Foundation', false],
                            ['02.', 'The selection process is fragmented, exhausting, and unclear.', 'Challenge', true],
                            ['03.', 'Vendor-driven decisions replace design-driven ones.', 'Consequence', true],
                            ['04.', 'Architecture and material rarely speak the same language.', 'Misalignment', true],
                        ].map(([num, stmt, tag, muted], i) => (
                            <li key={i} className={`sv sv-prob-item sv-d${i}`} style={{ display:'grid', gridTemplateColumns:'80px 1fr auto', alignItems:'center', gap:32, padding:'36px 0', borderBottom:'1px solid rgba(255,255,255,0.06)', transition:'background 0.3s' }}>
                                <span style={{ fontFamily:'Noto Serif, serif', fontSize:13, color:'#6b6357', fontStyle:'italic' }}>{num}</span>
                                <span className="sv-problem-stmt" style={{ color: muted ? '#a89e8d' : '#FDFCF8', fontStyle: muted ? 'italic' : 'normal' }}>{stmt}</span>
                                <span className="sv-prob-tag" style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'#A37D4B', opacity:0.6, whiteSpace:'nowrap' }}>{tag}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="sv sv-d4" style={{ marginTop:80, display:'flex', alignItems:'center', gap:24 }}>
                        <div style={{ width:60, height:1, background:'#A37D4B', flexShrink:0 }} />
                        <p style={{ fontFamily:'Noto Serif, serif', fontSize:'clamp(22px, 2.8vw, 38px)', fontWeight:400, color:'#FDFCF8', lineHeight:1.25, letterSpacing:'-0.01em' }}>
                            Stonevo was created to <em style={{ fontStyle:'italic', color:'#A37D4B' }}>change this.</em>
                        </p>
                    </div>
                </div>
            </section>

            {/* PHILOSOPHY */}
            <section style={{ padding:'140px 48px', background:'#0d0c0a' }}>
                <div style={{ maxWidth:1400, margin:'0 auto' }}>
                    <div className="sv-phil-header" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, marginBottom:80, alignItems:'end' }}>
                        <div>
                            <p className="sv" style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:800, letterSpacing:'0.45em', textTransform:'uppercase', color:'#A37D4B', opacity:0.75, marginBottom:20 }}>Our Philosophy</p>
                            <h2 className="sv sv-phil-h2 sv-d1">
                                Stone should not be selected<br /><em style={{ fontStyle:'italic', color:'#A37D4B' }}>in isolation.</em>
                            </h2>
                        </div>
                        <p className="sv sv-d2" style={{ fontFamily:'Manrope, sans-serif', fontSize:15, fontWeight:300, lineHeight:1.75, color:'#a89e8d', alignSelf:'end' }}>
                            Every selection should reflect the design, the space, and the intent it belongs to. Our approach is guided by clarity — not options, not noise.
                        </p>
                    </div>
                    <div className="sv-phil-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'rgba(255,255,255,0.04)', borderRadius:20, overflow:'hidden' }}>
                        {[
                            ['01', 'In context', 'Every selection should reflect the design, space, and intent it belongs to — not what happens to be available.'],
                            ['02', 'Design-led', 'Our approach is guided by clarity — not options, not confusion. Material follows vision, not the other way around.'],
                            ['03', 'End-to-end', 'From validation to sourcing to final slab selection, we coordinate every step so nothing is left to chance.'],
                            ['04', 'Aligned', 'Architecture and material must speak the same language. We make sure they do, at every stage of the project.'],
                        ].map(([num, title, body], i) => (
                            <div key={i} className={`sv sv-phil-card sv-d${i}`} style={{ background:'#1c1814', padding:'48px 36px', transition:'background 0.4s' }}>
                                <span className="sv-phil-num">{num}</span>
                                <p style={{ fontFamily:'Noto Serif, serif', fontSize:22, fontWeight:400, fontStyle:'italic', color:'#A37D4B', marginBottom:16 }}>{title}</p>
                                <p style={{ fontFamily:'Manrope, sans-serif', fontSize:13, fontWeight:300, lineHeight:1.7, color:'#a89e8d' }}>{body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* WHAT WE DO DIFFERENTLY */}
            <section style={{ background:'#171410', borderTop:'1px solid rgba(255,255,255,0.04)', padding:'140px 48px' }}>
                <div style={{ maxWidth:1400, margin:'0 auto' }}>
                    <p className="sv" style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:800, letterSpacing:'0.45em', textTransform:'uppercase', color:'#A37D4B', opacity:0.75, marginBottom:20 }}>What We Do Differently</p>
                    <h2 className="sv sv-diff-title sv-d1">
                        We bring focus<br /><em style={{ fontStyle:'italic', color:'#A37D4B' }}>where there is noise.</em>
                    </h2>
                    <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                        {[
                            ['Overwhelming you with options', 'We bring focus.'],
                            ['Vendor-driven decisions', 'We create structure.'],
                            ['Running across suppliers', 'We coordinate end-to-end.'],
                            ['Uncertainty at every stage', 'Every step is clear, efficient, aligned.'],
                        ].map(([before, after], i) => (
                            <div key={i} className={`sv sv-diff-row sv-d${i}`} style={{ display:'grid', gridTemplateColumns:'1fr 24px 1fr', alignItems:'center', gap:'0 48px', padding:'40px 0', borderBottom:'1px solid rgba(255,255,255,0.06)', transition:'background 0.3s' }}>
                                <span style={{ fontFamily:'Manrope, sans-serif', fontSize:'clamp(14px,1.4vw,17px)', fontWeight:300, color:'#6b6357', textDecoration:'line-through', textDecorationColor:'rgba(107,99,87,0.4)' }}>{before}</span>
                                <span className="sv-diff-arrow" style={{ fontSize:16, color:'#A37D4B', opacity:0.5, textAlign:'center' }}>→</span>
                                <span style={{ fontFamily:'Noto Serif, serif', fontSize:'clamp(20px,2vw,28px)', fontStyle:'italic', fontWeight:400, color:'#FDFCF8', letterSpacing:'-0.01em' }}>{after}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* BUILT AROUND DESIGN */}
            <section style={{ padding:'140px 48px', background:'#0d0c0a' }}>
                <div className="sv-built-grid" style={{ maxWidth:1400, margin:'0 auto', display:'grid', gridTemplateColumns:'5fr 4fr', gap:100, alignItems:'start' }}>
                    <div>
                        <p className="sv" style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:800, letterSpacing:'0.45em', textTransform:'uppercase', color:'#A37D4B', opacity:0.75, marginBottom:28 }}>Built Around Design</p>
                        <h2 className="sv sv-built-h2 sv-d1">
                            Every space begins<br />with <em style={{ fontStyle:'italic', color:'#A37D4B' }}>intent.</em>
                        </h2>
                        <p className="sv sv-d2" style={{ fontFamily:'Manrope, sans-serif', fontSize:15, fontWeight:300, lineHeight:1.8, color:'#a89e8d', maxWidth:'44ch' }}>
                            Stonevo works in alignment with architects and designers to ensure material selection fits seamlessly into the overall vision, proportions, and detailing of each space. We don't just source stone — we help define its role.
                        </p>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:1, background:'rgba(255,255,255,0.04)', borderRadius:20, overflow:'hidden', marginTop:4 }}>
                        {[
                            ['Better decisions', 'Material choices that reflect design intent, not convenience or availability.'],
                            ['Faster alignment', 'Fewer back-and-forths. A structured process from day one that keeps teams moving.'],
                            ['Stronger outcomes', 'The right stone in the right space, every time. Results that match the original vision.'],
                        ].map(([title, body], i) => (
                            <div key={i} className={`sv sv-built-card sv-d${i}`} style={{ background:'#1c1814', padding:'36px 32px', display:'flex', gap:20, alignItems:'flex-start', transition:'background 0.3s' }}>
                                <div style={{ width:2, height:48, background:'linear-gradient(to bottom, #A37D4B, rgba(163,125,75,0.1))', flexShrink:0, borderRadius:2, marginTop:4 }} />
                                <div>
                                    <p style={{ fontFamily:'Noto Serif, serif', fontSize:18, fontStyle:'italic', color:'#FDFCF8', marginBottom:8 }}>{title}</p>
                                    <p style={{ fontFamily:'Manrope, sans-serif', fontSize:13, fontWeight:300, lineHeight:1.65, color:'#6b6357' }}>{body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CLOSING */}
            <section style={{ position:'relative', minHeight:'80vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', overflow:'hidden', padding:'140px 48px' }}>
                <div style={{ position:'absolute', inset:0, zIndex:0 }}>
                    <img src={IMG} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.18, transform:'scale(1.05)' }} />
                    <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center, rgba(13,12,10,0.4) 0%, rgba(13,12,10,0.92) 100%)' }} />
                </div>
                <div style={{ position:'relative', zIndex:2, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:32 }}>
                    <div className="sv" style={{ width:1, height:60, background:'linear-gradient(to bottom, transparent, #A37D4B)', marginBottom:8 }} />
                    <p className="sv sv-d1" style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:800, letterSpacing:'0.45em', textTransform:'uppercase', color:'#A37D4B', opacity:0.75 }}>Our Intent</p>
                    <h2 className="sv sv-closing-h2 sv-d2">
                        Stonevo is not about <em style={{ fontStyle:'italic', color:'#A37D4B' }}>selling stone.</em>
                    </h2>
                    <p className="sv sv-d3" style={{ fontFamily:'Manrope, sans-serif', fontSize:15, fontWeight:300, lineHeight:1.7, color:'#a89e8d', maxWidth:'40ch' }}>
                        It is about bringing clarity, control, and confidence to every decision — from the first sketch to the final slab.
                    </p>
                    <button onClick={enter} className="sv sv-cta sv-d4" style={{ fontFamily:'Manrope, sans-serif', fontSize:11, fontWeight:800, letterSpacing:'0.3em', textTransform:'uppercase', color:'#0d0c0a', background:'#A37D4B', border:'none', cursor:'pointer', padding:'18px 44px', borderRadius:100, marginTop:16, transition:'background 0.3s, transform 0.2s, box-shadow 0.3s', boxShadow:'0 8px 40px rgba(163,125,75,0.35)' }}>
                        Enter the Platform
                    </button>
                </div>
            </section>

            {/* FOOTER */}
            <footer style={{ background:'#0d0c0a', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'32px 48px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', color:'#6b6357' }}>Stonevo</span>
                <span style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', color:'#6b6357' }}>© {new Date().getFullYear()} Stonevo Architectural. Artifact of Nature.</span>
            </footer>
        </>
    );
};

export default AboutPage;
