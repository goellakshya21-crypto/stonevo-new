import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// ─── Data ────────────────────────────────────────────────────────────────────
const MEMBERS = [
  {
    id: "munish", first: "Munish", last: "Goel",
    role: "Vision & Strategic Coordination",
    tagline: "Creating a more structured ecosystem around stone selection, sourcing and project coordination through advisory-led thinking and long-term industry relationships.",
    focus: "Advisory · Coordination", tone: "ridge",
    tasks: [
      { label: "Long-range vision", body: "Sets the direction for how Stonevo participates in the stone industry — what kinds of projects, partners and markets we move toward, and what we step back from." },
      { label: "Strategic coordination", body: "Aligns sourcing, design and commercial efforts so that what reaches a client desk has already passed through the right hands in the right order." },
      { label: "Advisory engagements", body: "Acts as a senior counterpart for architects, principals and developers who want a considered point of view before committing to material directions." },
      { label: "Relationship stewardship", body: "Holds the long-term industry relationships — quarries, fabricators, ateliers — that take years to build and minutes to lose." },
    ],
  },
  {
    id: "neeti", first: "Neeti", last: "Chawla",
    role: "Design-Led Selections",
    tagline: "Bringing together material understanding, aesthetics and thoughtful curation to help create more refined and design-aligned stone selections.",
    focus: "Curation · Aesthetic", tone: "ash",
    tasks: [
      { label: "Material reading", body: "Studies each lot for veining behaviour, undertone, finish response and how a slab will sit beside the surfaces around it." },
      { label: "Design alignment", body: "Translates a project's design intent — restrained, sculptural, warm, monumental — into a tight short-list of stones that actually carry it." },
      { label: "Editorial curation", body: "Maintains a curated reference library so selections feel intentional rather than catalogued." },
      { label: "Specification support", body: "Works with design teams on finish, edge, book-matching and layout decisions before stone is cut." },
    ],
  },
  {
    id: "saurabh", first: "Saurabh", last: "Anand",
    role: "Building Relationships & Trust",
    tagline: "Focused on creating strong relationships and long-term trust among clients, architects and project stakeholders.",
    focus: "Clients · Stakeholders", tone: "sand",
    tasks: [
      { label: "Client relationships", body: "First point of continuity for clients across the life of a project — from first conversation to final installation." },
      { label: "Architect partnerships", body: "Builds the kind of relationship with design studios where they call early, not late, and the work is better for it." },
      { label: "Trust-keeping", body: "Holds commitments on timing, pricing and material — the unglamorous part of trust that quietly compounds." },
      { label: "Stakeholder alignment", body: "Keeps owners, designers and contractors on the same page so material decisions don't become friction points downstream." },
    ],
  },
  {
    id: "hemant", first: "Hemant", last: "Tuteja",
    role: "Strategic Market Expansion",
    tagline: "Focused on strengthening Stonevo's market presence through meaningful industry connections, project opportunities and long-term business relationships.",
    focus: "Markets · Growth", tone: "clay",
    tasks: [
      { label: "Market presence", body: "Develops Stonevo's footprint in the cities and segments where considered material work is being commissioned." },
      { label: "Industry connections", body: "Builds the network of developers, contractors and design houses through which the next decade of work will arrive." },
      { label: "Project opportunities", body: "Identifies and qualifies projects where Stonevo's approach is a fit — and politely walks away from the ones where it isn't." },
      { label: "Business relationships", body: "Cultivates partnerships intended to outlast any single transaction." },
    ],
  },
  {
    id: "mithilesh", first: "Mithilesh", last: "",
    role: "Material Curation & Vendor Alignment",
    tagline: "Focused on identifying premium-grade selections, maintaining strong vendor relationships and ensuring access to well-curated lots across projects.",
    focus: "Sourcing · Vendors", tone: "moss",
    tasks: [
      { label: "Premium selection", body: "On the ground at quarries and yards, identifying the lots worth holding for Stonevo's projects." },
      { label: "Vendor alignment", body: "Maintains close working relationships with quarry owners and processors so we hear about the right blocks first." },
      { label: "Lot curation", body: "Reserves and books slabs against upcoming projects — protecting consistency across a single specification." },
      { label: "Quality control", body: "Reviews material before it ships: thickness, finish, repair, colour match against the agreed reference." },
    ],
  },
];

// ─── Stone portrait SVG ───────────────────────────────────────────────────────
function StonePortrait({ tone = "ridge", index = 0, name = "" }) {
  const palettes = {
    ridge: ["#3a342c", "#5a4f42", "#8a7a66", "#b5a48d"],
    ash:   ["#2c2c2c", "#4a4a48", "#7e7c77", "#b8b4ab"],
    sand:  ["#3d2f22", "#7a5e44", "#b08a64", "#d9c2a1"],
    clay:  ["#3a1f14", "#7a3b22", "#a85d3a", "#caa183"],
    moss:  ["#1f2a1c", "#3d4a32", "#6b7556", "#a8ad8e"],
  };
  const pal = palettes[tone] || palettes.ridge;
  const gId = `grad-${tone}-${index}`;
  const vId = `vein-${tone}-${index}`;
  const vigId = `vig-${index}`;
  return (
    <svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" style={{ width:"100%", height:"100%", display:"block" }}>
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={pal[0]} />
          <stop offset="45%" stopColor={pal[1]} />
          <stop offset="100%" stopColor={pal[2]} />
        </linearGradient>
        <pattern id={vId} width="400" height="520" patternUnits="userSpaceOnUse">
          <path d="M -20 80 C 100 60, 180 120, 280 90 S 420 140, 460 110" stroke={pal[3]} strokeWidth="0.7" fill="none" opacity="0.55" />
          <path d="M -20 180 C 120 200, 200 150, 300 200 S 440 230, 460 210" stroke={pal[3]} strokeWidth="0.5" fill="none" opacity="0.4" />
          <path d="M -20 280 C 80 260, 200 330, 320 290 S 440 320, 460 300" stroke={pal[3]} strokeWidth="0.9" fill="none" opacity="0.5" />
          <path d="M -20 360 C 140 380, 220 340, 320 380 S 440 420, 460 400" stroke={pal[3]} strokeWidth="0.4" fill="none" opacity="0.35" />
          <path d="M -20 440 C 100 460, 220 430, 320 470 S 440 490, 460 480" stroke={pal[3]} strokeWidth="0.6" fill="none" opacity="0.45" />
          <path d="M 80 0 C 90 80, 60 160, 110 240 S 80 400, 130 520" stroke={pal[3]} strokeWidth="0.4" fill="none" opacity="0.35" />
          <path d="M 260 0 C 240 90, 290 180, 250 270 S 290 420, 270 520" stroke={pal[3]} strokeWidth="0.4" fill="none" opacity="0.3" />
        </pattern>
        <radialGradient id={vigId} cx="0.5" cy="0.5" r="0.7">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <rect width="400" height="520" fill={`url(#${gId})`} />
      <rect width="400" height="520" fill={`url(#${vId})`} />
      <rect width="400" height="520" fill={`url(#${vigId})`} />
      <text x="20" y="494" fontFamily="Manrope, sans-serif" fontSize="9" fill={pal[3]} letterSpacing="2" opacity="0.7">
        {`SLAB · ${String(index + 1).padStart(2,"0")} · ${tone.toUpperCase()}`}
      </text>
      <text x="380" y="494" textAnchor="end" fontFamily="Manrope, sans-serif" fontSize="9" fill={pal[3]} letterSpacing="2" opacity="0.7">
        {name.toUpperCase()}
      </text>
    </svg>
  );
}

// ─── Scroll reveal ────────────────────────────────────────────────────────────
function useScrollReveal(dep) {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('sv-vis'); io.unobserve(e.target); }
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.sv').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [dep]);
}

// ─── Member card ──────────────────────────────────────────────────────────────
function Member({ member, index, registerRef }) {
  const [openTask, setOpenTask] = useState(0);
  const ref = useRef(null);
  useEffect(() => { if (ref.current) registerRef(member.id, ref.current); }, []);

  return (
    <article ref={ref} id={`m-${member.id}`} style={{ borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)', padding: index === 0 ? '0 0 80px' : '80px 0' }}>
      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:56, alignItems:'start' }}>

        {/* Portrait */}
        <div className="sv" style={{ aspectRatio:'4/5.2', overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)', borderRadius:4 }}>
          <StonePortrait tone={member.tone} index={index} name={`${member.first} ${member.last}`.trim()} />
        </div>

        {/* Body */}
        <div>
          <div className="sv" style={{ display:'flex', gap:10, alignItems:'baseline', marginBottom:18, fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', color:'#6b6357' }}>
            <span>FIG. {String(index + 1).padStart(2,"0")}</span>
            <span style={{ color:'rgba(255,255,255,0.1)' }}>·</span>
            <span>{member.focus}</span>
          </div>

          <h2 className="sv" style={{ fontFamily:'Noto Serif, serif', fontWeight:300, fontSize:'clamp(40px,5vw,72px)', lineHeight:0.98, letterSpacing:'-0.02em', margin:'0 0 12px', color:'#FDFCF8' }}>
            {member.first}
            {member.last && <span style={{ color:'#6b6357', fontStyle:'italic' }}> {member.last}</span>}
          </h2>
          <p className="sv" style={{ fontFamily:'Noto Serif, serif', fontStyle:'italic', fontSize:'clamp(16px,1.4vw,20px)', margin:'0 0 20px', color:'#A37D4B' }}>
            {member.role}
          </p>
          <p className="sv" style={{ fontFamily:'Manrope, sans-serif', fontSize:14, fontWeight:300, lineHeight:1.7, color:'#a89e8d', margin:'0 0 36px', maxWidth:'58ch' }}>
            {member.tagline}
          </p>

          {/* Tasks */}
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', color:'#6b6357' }}>
              <span>Responsibilities</span><span>04</span>
            </div>
            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {member.tasks.map((t, ti) => {
                const isOpen = openTask === ti;
                return (
                  <li key={ti} style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                    <button
                      onClick={() => setOpenTask(isOpen ? -1 : ti)}
                      style={{ display:'grid', gridTemplateColumns:'36px 1fr 20px', alignItems:'center', gap:16, width:'100%', padding:'18px 0', textAlign:'left', background:'none', border:'none', cursor:'pointer', color: isOpen ? '#A37D4B' : '#FDFCF8', transition:'color .2s' }}
                    >
                      <span style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.2em', color: isOpen ? '#A37D4B' : '#6b6357', transition:'color .2s' }}>
                        {String(ti + 1).padStart(2,"0")}
                      </span>
                      <span style={{ fontFamily:'Noto Serif, serif', fontSize:'clamp(18px,1.6vw,24px)', letterSpacing:'-0.005em', fontWeight:400 }}>
                        {t.label}
                      </span>
                      <span style={{ color:'#6b6357', display:'flex', justifyContent:'flex-end' }} aria-hidden="true">
                        <svg viewBox="0 0 16 16" width="13" height="13">
                          <path d={isOpen ? "M3 8 L13 8" : "M3 8 L13 8 M8 3 L8 13"} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      </span>
                    </button>
                    <div style={{ display:'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition:'grid-template-rows .35s ease' }}>
                      <p style={{ overflow:'hidden', margin:0, padding: isOpen ? '0 0 22px 52px' : '0 0 0 52px', fontFamily:'Manrope, sans-serif', fontSize:14, fontWeight:300, lineHeight:1.7, color:'#a89e8d', maxWidth:'60ch', transition:'padding .35s ease' }}>
                        {t.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef({});
  useScrollReveal(activeIndex);

  const registerRef = (id, el) => { refs.current[id] = el; };

  // Active roster tracking
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id.replace("m-", "");
          const idx = MEMBERS.findIndex(m => m.id === id);
          if (idx >= 0) setActiveIndex(idx);
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    Object.values(refs.current).forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const jumpTo = (id) => {
    const el = refs.current[id] || document.getElementById(`m-${id}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
  };

  const enter = () => { sessionStorage.setItem('sv_enter','1'); navigate('/'); };

  return (
    <>
      <style>{`
        .sv { opacity:0; transform:translateY(26px); transition:opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1); }
        .sv.sv-vis { opacity:1; transform:none; }
        .sv-d1 { transition-delay:0.10s; }
        .sv-d2 { transition-delay:0.22s; }
        .sv-d3 { transition-delay:0.34s; }

        @keyframes sv-drift {
          from { transform: scale(1.08) translateX(0); }
          to   { transform: scale(1.08) translateX(-1.5%); }
        }
        .sv-drift { animation: sv-drift 18s ease-in-out infinite alternate; }

        .tp-watermark {
          font-family: 'Noto Serif', serif;
          font-size: clamp(120px, 20vw, 280px);
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 1;
          color: transparent;
          -webkit-text-stroke: 1px rgba(253,252,248,0.045);
          user-select: none;
          pointer-events: none;
        }

        .tp-cta-btn:hover { background: #FDFCF8 !important; transform: scale(1.04); box-shadow: 0 12px 64px rgba(163,125,75,0.65) !important; }

        .tp-roster-btn { opacity: 0.45; transition: opacity .2s; }
        .tp-roster-btn:hover { opacity: 1; }
        .tp-roster-li.is-active .tp-roster-btn { opacity: 1; }
        .tp-roster-li.is-active .tp-roster-name::before { content: "→ "; color: #A37D4B; }

        @media (max-width: 1000px) {
          .tp-people-grid { grid-template-columns: 1fr !important; }
          .tp-roster { position: relative !important; top: 0 !important; }
          .tp-roster-list { display: grid; grid-template-columns: repeat(2,1fr); gap: 0 24px; }
          .tp-roster-foot { display: none !important; }
          .tp-member-frame { grid-template-columns: 1fr !important; gap: 28px !important; }
          .tp-portrait { aspect-ratio: 5/4 !important; max-width: 360px; }
        }
        @media (max-width: 700px) {
          .tp-hero-pad { padding-left: 24px !important; padding-right: 24px !important; }
          .tp-section-pad { padding-left: 24px !important; padding-right: 24px !important; }
        }
      `}</style>

      <div style={{ background:'#0d0c0a', color:'#FDFCF8', minHeight:'100vh' }}>

        {/* ── NAV ── */}
        <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, padding:'28px 48px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(to bottom, rgba(13,12,10,0.75) 0%, transparent 100%)' }}>
          <Link to="/" style={{ fontFamily:'Noto Serif, serif', fontSize:18, letterSpacing:'0.2em', color:'#FDFCF8', textDecoration:'none', transition:'color 0.3s' }}
            onMouseEnter={e=>e.target.style.color='#A37D4B'} onMouseLeave={e=>e.target.style.color='#FDFCF8'}>
            STONEVO
          </Link>
          <Link to="/about" style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.28em', textTransform:'uppercase', color:'rgba(253,252,248,0.35)', textDecoration:'none', transition:'color 0.3s' }}
            onMouseEnter={e=>e.target.style.color='#A37D4B'} onMouseLeave={e=>e.target.style.color='rgba(253,252,248,0.35)'}>
            About
          </Link>
        </nav>

        {/* ── HERO ── */}
        <section style={{ position:'relative', minHeight:'100vh', display:'grid', gridTemplateRows:'1fr auto', overflow:'hidden', background:'#0d0c0a', padding:'0 48px' }} className="tp-hero-pad">
          <div className="tp-watermark" style={{ position:'absolute', bottom:'-0.1em', right:'-0.02em', zIndex:1 }}>PEOPLE</div>

          <div style={{ position:'relative', zIndex:2, paddingTop:160, display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <p className="sv" style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:800, letterSpacing:'0.45em', textTransform:'uppercase', color:'#A37D4B', opacity:0.85, marginBottom:16 }}>
              The People Behind Stonevo
            </p>
            <h1 className="sv sv-d1" style={{ fontFamily:'Noto Serif, serif', fontWeight:300, fontSize:'clamp(44px,6.5vw,88px)', lineHeight:1.0, letterSpacing:'-0.03em', color:'#FDFCF8', maxWidth:'14ch', marginBottom:24 }}>
              The people behind the <em style={{ fontStyle:'italic', color:'#A37D4B' }}>work.</em>
            </h1>
            <p className="sv sv-d2" style={{ fontFamily:'Manrope, sans-serif', fontSize:15, fontWeight:300, color:'#a89e8d', maxWidth:'44ch', lineHeight:1.7, marginBottom:36 }}>
              Stonevo is held together by a small group of people, each carrying a distinct part of the work — from how a project is shaped to how a single slab gets selected.
            </p>
            <div className="sv sv-d3" style={{ display:'flex', gap:40, flexWrap:'wrap', borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:28 }}>
              {[['05','Partners & specialists'],['04','Disciplines covered'],['∞','Relationships, not transactions']].map(([n,l]) => (
                <div key={n}>
                  <div style={{ fontFamily:'Noto Serif, serif', fontSize:40, fontWeight:300, color:'#FDFCF8', letterSpacing:'-0.01em', lineHeight:1 }}>{n}</div>
                  <div style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'#6b6357', marginTop:10 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position:'relative', zIndex:2, paddingBottom:48, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
            <span className="sv" style={{ fontFamily:'Noto Serif, serif', fontSize:11, letterSpacing:'0.3em', color:'#6b6357', textTransform:'uppercase' }}>Chapter II — People</span>
            <div className="sv" style={{ display:'flex', alignItems:'center', gap:12, fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', color:'#6b6357' }}>
              <div style={{ width:40, height:1, background:'#6b6357' }} /> Scroll
            </div>
          </div>
        </section>

        {/* ── PEOPLE ── */}
        <section style={{ maxWidth:1400, margin:'0 auto', padding:'80px 48px 60px' }} className="tp-section-pad">

          {/* Stream header */}
          <div style={{ paddingBottom:40, borderBottom:'1px solid rgba(255,255,255,0.06)', marginBottom:8 }}>
            <h3 className="sv" style={{ fontFamily:'Noto Serif, serif', fontWeight:300, fontSize:'clamp(26px,3vw,40px)', margin:'0 0 12px', letterSpacing:'-0.01em', color:'#FDFCF8' }}>
              Five threads of one practice
            </h3>
            <p className="sv sv-d1" style={{ fontFamily:'Manrope, sans-serif', fontSize:14, fontWeight:300, color:'#6b6357', margin:0, maxWidth:'52ch' }}>
              Click any responsibility to read more. Use the roster below to jump between people.
            </p>
          </div>

          <div className="tp-people-grid" style={{ display:'grid', gridTemplateColumns:'180px 1fr', gap:60, alignItems:'start', marginTop:40 }}>

            {/* Sticky roster */}
            <aside className="tp-roster" style={{ position:'sticky', top:90, alignSelf:'start' }}>
              <div style={{ marginBottom:16, paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,0.06)', fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', color:'#6b6357' }}>
                Roster · 05
              </div>
              <ol className="tp-roster-list" style={{ listStyle:'none', padding:0, margin:'0 0 24px' }}>
                {MEMBERS.map((m, i) => (
                  <li key={m.id} className={`tp-roster-li${i === activeIndex ? ' is-active' : ''}`} style={{ padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <button className="tp-roster-btn" onClick={() => jumpTo(m.id)} style={{ display:'grid', gridTemplateColumns:'26px 1fr', gap:8, width:'100%', textAlign:'left', alignItems:'baseline', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                      <span style={{ fontFamily:'Manrope, sans-serif', fontSize:10, color:'#6b6357', fontWeight:700, letterSpacing:'0.15em' }}>{String(i+1).padStart(2,"0")}</span>
                      <span>
                        <span className="tp-roster-name" style={{ fontFamily:'Noto Serif, serif', fontSize:16, color:'#FDFCF8', display:'block', lineHeight:1.1 }}>{m.first} {m.last}</span>
                        <span style={{ fontFamily:'Manrope, sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:'#6b6357', marginTop:2, display:'block' }}>{m.focus}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="tp-roster-foot" style={{ fontFamily:'Manrope, sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'#3a3530', lineHeight:1.6 }}>
                Scroll or click<br />to browse
              </div>
            </aside>

            {/* Members stream */}
            <div>
              {MEMBERS.map((m, i) => (
                <Member key={m.id} member={m} index={i} registerRef={registerRef} />
              ))}
            </div>

          </div>
        </section>

        {/* ── CLOSING ── */}
        <section style={{ position:'relative', minHeight:'60vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', overflow:'hidden', padding:'120px 48px', background:'#0d0c0a' }}>
          <div style={{ position:'relative', zIndex:2, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:28 }}>
            <div className="sv" style={{ width:1, height:60, background:'linear-gradient(to bottom, transparent, #A37D4B)', marginBottom:8 }} />
            <p className="sv sv-d1" style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:800, letterSpacing:'0.45em', textTransform:'uppercase', color:'#A37D4B', opacity:0.75 }}>
              A Shared Purpose
            </p>
            <h2 className="sv sv-d2" style={{ fontFamily:'Noto Serif, serif', fontWeight:300, fontSize:'clamp(32px,4.5vw,64px)', letterSpacing:'-0.03em', lineHeight:1.1, color:'#FDFCF8', maxWidth:'20ch' }}>
              Different roles.<br />One <em style={{ fontStyle:'italic', color:'#A37D4B' }}>direction.</em>
            </h2>
            <p className="sv sv-d3" style={{ fontFamily:'Manrope, sans-serif', fontSize:15, fontWeight:300, lineHeight:1.7, color:'#a89e8d', maxWidth:'40ch' }}>
              The work of selecting stone is rarely about one decision. It is a long, careful conversation between vision, design, trust, market and material — and the practice exists in the way these five people pull together.
            </p>
            <button onClick={enter} className="sv tp-cta-btn" style={{ fontFamily:'Manrope, sans-serif', fontSize:11, fontWeight:800, letterSpacing:'0.3em', textTransform:'uppercase', color:'#0d0c0a', background:'#A37D4B', border:'none', cursor:'pointer', padding:'18px 44px', borderRadius:100, marginTop:16, transition:'background 0.3s, transform 0.2s, box-shadow 0.3s', boxShadow:'0 8px 40px rgba(163,125,75,0.35)' }}>
              Enter the Platform
            </button>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ background:'#0d0c0a', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'32px 48px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', color:'#6b6357' }}>Stonevo</span>
          <span style={{ fontFamily:'Manrope, sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', color:'#6b6357' }}>© {new Date().getFullYear()} Stonevo Architectural. Artifact of Nature.</span>
        </footer>

      </div>
    </>
  );
}
