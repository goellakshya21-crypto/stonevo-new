import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

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
  const id = `grad-${tone}-${index}`;
  const veinId = `vein-${tone}-${index}`;
  return (
    <svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={pal[0]} />
          <stop offset="45%" stopColor={pal[1]} />
          <stop offset="100%" stopColor={pal[2]} />
        </linearGradient>
        <pattern id={veinId} width="400" height="520" patternUnits="userSpaceOnUse">
          <path d="M -20 80 C 100 60, 180 120, 280 90 S 420 140, 460 110" stroke={pal[3]} strokeWidth="0.7" fill="none" opacity="0.55" />
          <path d="M -20 180 C 120 200, 200 150, 300 200 S 440 230, 460 210" stroke={pal[3]} strokeWidth="0.5" fill="none" opacity="0.4" />
          <path d="M -20 280 C 80 260, 200 330, 320 290 S 440 320, 460 300" stroke={pal[3]} strokeWidth="0.9" fill="none" opacity="0.5" />
          <path d="M -20 360 C 140 380, 220 340, 320 380 S 440 420, 460 400" stroke={pal[3]} strokeWidth="0.4" fill="none" opacity="0.35" />
          <path d="M -20 440 C 100 460, 220 430, 320 470 S 440 490, 460 480" stroke={pal[3]} strokeWidth="0.6" fill="none" opacity="0.45" />
          <path d="M 80 0 C 90 80, 60 160, 110 240 S 80 400, 130 520" stroke={pal[3]} strokeWidth="0.4" fill="none" opacity="0.35" />
          <path d="M 260 0 C 240 90, 290 180, 250 270 S 290 420, 270 520" stroke={pal[3]} strokeWidth="0.4" fill="none" opacity="0.3" />
        </pattern>
        <radialGradient id={`vig-${index}`} cx="0.5" cy="0.5" r="0.7">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      <rect width="400" height="520" fill={`url(#${id})`} />
      <rect width="400" height="520" fill={`url(#${veinId})`} />
      <rect width="400" height="520" fill={`url(#vig-${index})`} opacity="0.2" />
      <text x="20" y="494" fontFamily="JetBrains Mono, monospace" fontSize="10" fill={pal[3]} letterSpacing="1.2">
        {`SLAB · ${String(index + 1).padStart(2, "0")} · ${tone.toUpperCase()}`}
      </text>
      <text x="380" y="494" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="10" fill={pal[3]} letterSpacing="1.2">
        {name.toUpperCase()}
      </text>
    </svg>
  );
}

// ─── Member card ──────────────────────────────────────────────────────────────
function Member({ member, index, registerRef }) {
  const [openTask, setOpenTask] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) registerRef(member.id, ref.current);
  }, []);

  return (
    <article ref={ref} id={`m-${member.id}`} className="tp-member" data-tone={member.tone}>
      <div className="tp-member-frame">
        {/* Stone portrait */}
        <div className="tp-portrait">
          <StonePortrait tone={member.tone} index={index} name={`${member.first} ${member.last}`.trim()} />
        </div>

        {/* Body */}
        <div className="tp-member-body">
          <div className="tp-member-meta tp-mono">
            <span>FIG. {String(index + 1).padStart(2, "0")}</span>
            <span className="tp-dot-sep">·</span>
            <span>{member.role.toUpperCase()}</span>
          </div>
          <h2 className="tp-member-name">
            {member.first}
            {member.last && <> <span className="tp-name-last">{member.last}</span></>}
          </h2>
          <p className="tp-member-role">{member.role}</p>
          <p className="tp-member-tagline">{member.tagline}</p>

          <div className="tp-tasks">
            <div className="tp-tasks-head tp-mono">
              <span>RESPONSIBILITIES</span>
              <span>04</span>
            </div>
            <ul className="tp-task-list">
              {member.tasks.map((t, ti) => {
                const isOpen = openTask === ti;
                return (
                  <li key={ti} className={`tp-task${isOpen ? " is-open" : ""}`}>
                    <button className="tp-task-head" onClick={() => setOpenTask(isOpen ? -1 : ti)}>
                      <span className="tp-task-index tp-mono">{String(ti + 1).padStart(2, "0")}</span>
                      <span className="tp-task-label">{t.label}</span>
                      <span className="tp-task-toggle" aria-hidden="true">
                        <svg viewBox="0 0 16 16" width="14" height="14">
                          <path d={isOpen ? "M3 8 L13 8" : "M3 8 L13 8 M8 3 L8 13"} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      </span>
                    </button>
                    <div className="tp-task-body-wrap">
                      <p className="tp-task-body">{t.body}</p>
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
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef({});

  // Inject Google Fonts
  useEffect(() => {
    const existing = document.getElementById('tp-fonts');
    if (existing) return;
    const link = document.createElement('link');
    link.id = 'tp-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
  }, []);

  const registerRef = (id, el) => { refs.current[id] = el; };

  // Active roster tracking via IntersectionObserver
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const id = e.target.id.replace("m-", "");
          const idx = MEMBERS.findIndex((m) => m.id === id);
          if (idx >= 0) setActiveIndex(idx);
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    Object.values(refs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const jumpTo = (id) => {
    const el = refs.current[id] || document.getElementById(`m-${id}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        /* ── Reset / tokens ─────────────────────────────── */
        .tp-root {
          --bg: #f1ece2;
          --ink: #1b1814;
          --muted: #7a6f5e;
          --rule: #d8d0bf;
          --accent: #8a3a1f;
          --display: "Instrument Serif", "Cormorant Garamond", Georgia, serif;
          --body: "Geist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
          background: var(--bg);
          color: var(--ink);
          font-family: var(--body);
          font-weight: 400;
          font-size: 15.5px;
          line-height: 1.55;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          letter-spacing: 0.005em;
          min-height: 100vh;
        }
        .tp-root * { box-sizing: border-box; }
        .tp-root a { color: inherit; text-decoration: none; }
        .tp-root button { background: none; border: 0; padding: 0; font: inherit; color: inherit; cursor: pointer; }

        .tp-mono { font-family: var(--mono); font-size: 11px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--muted); }

        /* ── Header ─────────────────────────────────────── */
        .tp-header {
          position: sticky; top: 0; z-index: 50;
          display: grid; grid-template-columns: 1fr auto 1fr;
          align-items: center; padding: 18px 40px;
          background: rgba(241,236,226,0.88);
          backdrop-filter: saturate(140%) blur(10px);
          -webkit-backdrop-filter: saturate(140%) blur(10px);
          border-bottom: 1px solid var(--rule);
        }
        .tp-brand { display: flex; align-items: center; gap: 10px; }
        .tp-brand-word { font-family: var(--display); font-size: 22px; letter-spacing: 0.005em; }
        .tp-nav { display: flex; gap: 28px; }
        .tp-nav a { font-size: 13px; color: var(--ink); position: relative; padding: 4px 0; opacity: 0.78; transition: opacity .2s; }
        .tp-nav a:hover { opacity: 1; }
        .tp-header-meta { display: flex; justify-content: flex-end; align-items: center; gap: 8px; font-family: var(--mono); font-size: 11px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; }
        .tp-status-dot { width: 7px; height: 7px; border-radius: 50%; background: #5b8c5a; box-shadow: 0 0 0 3px rgba(91,140,90,0.22); }

        /* ── Hero ───────────────────────────────────────── */
        .tp-hero {
          max-width: 1400px; margin: 0 auto;
          padding: 110px 40px 80px;
          position: relative;
        }
        .tp-hero::after {
          content: ""; position: absolute; left: 40px; right: 40px; bottom: 0; height: 1px; background: var(--rule);
        }
        .tp-hero-eyebrow { display: flex; gap: 14px; margin-bottom: 60px; }
        .tp-hero-title {
          font-family: var(--display); font-weight: 400;
          font-size: clamp(56px, 9vw, 132px);
          line-height: 0.96; letter-spacing: -0.015em;
          margin: 0 0 40px; max-width: 14ch;
        }
        .tp-hero-title em { font-style: italic; color: var(--accent); }
        .tp-hero-lede {
          font-family: var(--display);
          font-size: clamp(20px, 2vw, 26px);
          line-height: 1.35; max-width: 56ch; margin: 0 0 70px;
        }
        .tp-hero-meta {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 40px; border-top: 1px solid var(--rule); padding-top: 28px;
        }
        .tp-meta-num {
          font-family: var(--display); font-size: 44px; color: var(--ink);
          letter-spacing: -0.01em; font-weight: 400; line-height: 1;
        }
        .tp-meta-label { font-family: var(--mono); font-size: 11px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--muted); margin-top: 12px; }

        /* ── People section ─────────────────────────────── */
        .tp-people { max-width: 1400px; margin: 0 auto; padding: 80px 40px 40px; }
        .tp-people-grid { display: grid; grid-template-columns: 200px 1fr; gap: 60px; align-items: start; }
        .tp-stream-head { padding-bottom: 36px; border-bottom: 1px solid var(--rule); margin-bottom: 12px; }
        .tp-stream-title { font-family: var(--display); font-size: clamp(28px, 3vw, 40px); margin: 0 0 12px; font-weight: 400; letter-spacing: -0.01em; }
        .tp-stream-sub { color: var(--muted); margin: 0; max-width: 56ch; }

        /* ── Roster ─────────────────────────────────────── */
        .tp-roster { position: sticky; top: 80px; align-self: start; }
        .tp-roster-label { margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid var(--rule); }
        .tp-roster-list { list-style: none; padding: 0; margin: 0 0 24px; }
        .tp-roster-list li { padding: 10px 0; border-bottom: 1px dashed rgba(216,208,191,0.7); }
        .tp-roster-list li:last-child { border-bottom: 0; }
        .tp-roster-list button { display: grid; grid-template-columns: 28px 1fr; gap: 8px; width: 100%; text-align: left; align-items: baseline; opacity: 0.55; transition: opacity .2s; }
        .tp-roster-list button:hover { opacity: 1; }
        .tp-roster-list li.is-active button { opacity: 1; }
        .tp-roster-list li.is-active .tp-r-name::before { content: "→ "; color: var(--accent); }
        .tp-r-index { color: var(--muted); }
        .tp-r-body { display: flex; flex-direction: column; gap: 2px; }
        .tp-r-name { font-family: var(--display); font-size: 17px; line-height: 1.1; }
        .tp-r-focus { font-size: 9.5px; letter-spacing: 0.13em; font-family: var(--mono); text-transform: uppercase; color: var(--muted); }
        .tp-roster-foot { color: var(--muted); line-height: 1.5; }

        /* ── Member ─────────────────────────────────────── */
        .tp-member { border-top: 1px solid var(--rule); padding: 70px 0; }
        .tp-member:first-of-type { border-top: 0; padding-top: 24px; }
        .tp-member-frame { display: grid; grid-template-columns: 280px 1fr; gap: 56px; align-items: start; }
        .tp-portrait { position: relative; aspect-ratio: 4 / 5.2; overflow: hidden; background: #2a2520; border: 1px solid var(--rule); }
        .tp-member-meta { display: flex; gap: 10px; align-items: baseline; margin-bottom: 18px; }
        .tp-dot-sep { color: var(--rule); }
        .tp-member-name {
          font-family: var(--display); font-weight: 400;
          font-size: clamp(48px, 6vw, 84px);
          line-height: 0.98; letter-spacing: -0.018em;
          margin: 0 0 12px;
        }
        .tp-name-last { color: var(--muted); font-style: italic; }
        .tp-member-role { font-family: var(--display); font-style: italic; font-size: clamp(18px, 1.6vw, 22px); margin: 0 0 24px; }
        .tp-member-tagline { font-size: 16px; line-height: 1.55; color: rgba(27,24,20,0.78); margin: 0 0 36px; max-width: 60ch; }

        /* ── Tasks ──────────────────────────────────────── */
        .tp-tasks { border-top: 1px solid var(--rule); padding-top: 18px; }
        .tp-tasks-head { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .tp-task-list { list-style: none; padding: 0; margin: 0; }
        .tp-task { border-bottom: 1px solid var(--rule); }
        .tp-task-head {
          display: grid; grid-template-columns: 36px 1fr 20px;
          align-items: center; gap: 16px;
          width: 100%; padding: 18px 0; text-align: left;
          transition: color .2s;
        }
        .tp-task-head:hover { color: var(--accent); }
        .tp-task-head:hover .tp-task-index { color: var(--accent); }
        .tp-task-index { color: var(--muted); transition: color .2s; }
        .tp-task-label { font-family: var(--display); font-size: clamp(20px, 1.8vw, 26px); letter-spacing: -0.005em; }
        .tp-task-toggle { color: var(--muted); display: flex; justify-content: flex-end; }
        .tp-task-body-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .35s ease; }
        .tp-task.is-open .tp-task-body-wrap { grid-template-rows: 1fr; }
        .tp-task-body { overflow: hidden; margin: 0; padding: 0 0 22px 52px; color: rgba(27,24,20,0.8); max-width: 64ch; }

        /* ── Closing ────────────────────────────────────── */
        .tp-closing { border-top: 1px solid var(--rule); padding: 90px 40px 80px; max-width: 1400px; margin: 0 auto; }
        .tp-closing-inner { max-width: 880px; }
        .tp-closing-eyebrow { margin-bottom: 36px; }
        .tp-closing-text {
          font-family: var(--display);
          font-size: clamp(26px, 3vw, 38px);
          line-height: 1.25; letter-spacing: -0.005em;
          margin: 0 0 64px;
        }
        .tp-closing-foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; flex-wrap: wrap; border-top: 1px solid var(--rule); padding-top: 28px; }
        .tp-closing-mark { font-family: var(--display); font-style: italic; font-size: 22px; margin-top: 6px; }
        .tp-closing-contact { text-align: right; display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
        .tp-contact-link { font-family: var(--display); font-size: 24px; border-bottom: 1px solid var(--ink); padding-bottom: 2px; transition: color .2s, border-color .2s; }
        .tp-contact-link:hover { color: var(--accent); border-color: var(--accent); }

        /* ── Responsive ─────────────────────────────────── */
        @media (max-width: 1000px) {
          .tp-people-grid { grid-template-columns: 1fr; gap: 32px; }
          .tp-roster { position: relative; top: 0; }
          .tp-roster-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 24px; }
          .tp-roster-foot { display: none; }
          .tp-member-frame { grid-template-columns: 1fr; gap: 28px; }
          .tp-portrait { aspect-ratio: 5 / 4; max-width: 360px; }
          .tp-header { grid-template-columns: 1fr auto; padding: 14px 20px; }
          .tp-nav, .tp-header-meta { display: none; }
          .tp-hero, .tp-people, .tp-closing { padding-left: 20px; padding-right: 20px; }
          .tp-hero-meta { grid-template-columns: 1fr; gap: 14px; }
        }
      `}</style>

      <div className="tp-root">
        {/* ── Header ── */}
        <header className="tp-header">
          <div className="tp-brand">
            <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
              <path d="M4 22 L12 8 L20 16 L28 6 L28 26 L4 26 Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            <Link to="/" className="tp-brand-word">Stonevo</Link>
          </div>
          <nav className="tp-nav">
            <Link to="/about">About</Link>
            <a href="#people" onClick={e => { e.preventDefault(); jumpTo("munish"); }}>People</a>
            <a href="#contact" onClick={e => { e.preventDefault(); document.getElementById("tp-contact")?.scrollIntoView({ behavior: "smooth" }); }}>Contact</a>
          </nav>
          <div className="tp-header-meta">
            <span className="tp-status-dot" />
            <span>Currently taking projects · 2026</span>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="tp-hero">
          <div className="tp-hero-eyebrow">
            <span className="tp-mono">VOL. 01</span>
            <span className="tp-mono">— THE PEOPLE BEHIND</span>
          </div>
          <h1 className="tp-hero-title">The people behind <em>Stonevo</em>.</h1>
          <p className="tp-hero-lede">
            Stonevo is held together by a small group of people, each carrying a distinct part of the work — from how a project is shaped to how a single slab gets selected. This is what each of them actually does.
          </p>
          <div className="tp-hero-meta">
            <div>
              <div className="tp-meta-num">05</div>
              <div className="tp-meta-label">Partners &amp; specialists</div>
            </div>
            <div>
              <div className="tp-meta-num">04</div>
              <div className="tp-meta-label">Disciplines covered</div>
            </div>
            <div>
              <div className="tp-meta-num">∞</div>
              <div className="tp-meta-label">Relationships, not transactions</div>
            </div>
          </div>
        </section>

        {/* ── People ── */}
        <section className="tp-people" id="people">
          <div className="tp-people-grid">
            {/* Sticky roster */}
            <aside className="tp-roster" aria-label="Team roster">
              <div className="tp-roster-label tp-mono">ROSTER · 05</div>
              <ol className="tp-roster-list">
                {MEMBERS.map((m, i) => (
                  <li key={m.id} className={i === activeIndex ? "is-active" : ""}>
                    <button onClick={() => jumpTo(m.id)}>
                      <span className="tp-r-index tp-mono">{String(i + 1).padStart(2, "0")}</span>
                      <span className="tp-r-body">
                        <span className="tp-r-name">{m.first} {m.last}</span>
                        <span className="tp-r-focus">{m.focus}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="tp-roster-foot tp-mono">SCROLL OR CLICK<br />TO BROWSE</div>
            </aside>

            {/* Member stream */}
            <div>
              <div className="tp-stream-head">
                <h3 className="tp-stream-title">Five threads of one practice</h3>
                <p className="tp-stream-sub">Click any responsibility to read more. Use the roster on the left to jump between people.</p>
              </div>
              {MEMBERS.map((m, i) => (
                <Member key={m.id} member={m} index={i} registerRef={registerRef} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Closing ── */}
        <section className="tp-closing">
          <div className="tp-closing-inner">
            <div className="tp-closing-eyebrow tp-mono">— A NOTE ON HOW WE WORK</div>
            <p className="tp-closing-text">
              The work of selecting stone is rarely about one decision. It is a long, careful conversation between vision, design, trust, market and material. Each of the five people above carries one of those threads — and the practice exists in the way they pull together.
            </p>
            <div className="tp-closing-foot">
              <div>
                <div className="tp-mono" style={{ fontSize: 10 }}>STONEVO</div>
                <div className="tp-closing-mark">Considered stone, considered people.</div>
              </div>
              <div className="tp-closing-contact" id="tp-contact">
                <a href="mailto:studio@stonevo.in" className="tp-contact-link">studio@stonevo.in</a>
                <span className="tp-mono" style={{ fontSize: 10 }}>FOR PROJECTS &amp; INTRODUCTIONS</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
