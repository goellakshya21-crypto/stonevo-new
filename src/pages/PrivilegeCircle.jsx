import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
    summarize, fmtPoints, CIRCLES,
    EXPERIENCE_TYPES, DESTINATION_TYPES, MONTHS,
    suggestedExperiences, minCircleForExperienceType,
} from '../lib/loyalty';

/**
 * Stonevo Privilege Circle — architect dashboard at /circle.
 * Reads the logged-in architect's identity from localStorage (set by LeadGate),
 * loads their billing + redemptions, and renders the recognition dashboard.
 */
const PrivilegeCircle = () => {
    const navigate = useNavigate();
    const [phone, setPhone] = useState(null);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(true);
    const [billing, setBilling] = useState([]);
    const [redemptions, setRedemptions] = useState([]);
    const [prefs, setPrefs] = useState({ experience_type: '', preferred_month: '', destination_types: [] });
    const [prefsSaved, setPrefsSaved] = useState(false);
    const [requesting, setRequesting] = useState(null);

    useEffect(() => {
        const ph = (localStorage.getItem('stonevo_user_phone') || '').replace(/\D/g, '').slice(-10);
        const nm = localStorage.getItem('stonevo_user_name') || '';
        if (!ph) { navigate('/'); return; }
        setPhone(ph);
        setName(nm);
        load(ph);
    }, []);

    const load = async (ph) => {
        setLoading(true);
        try {
            const [{ data: b }, { data: r }, { data: p }] = await Promise.all([
                supabase.from('loyalty_billing').select('*').eq('architect_phone', ph).order('billed_at', { ascending: false }),
                supabase.from('loyalty_redemptions').select('*').eq('architect_phone', ph).order('requested_at', { ascending: false }),
                supabase.from('loyalty_preferences').select('*').eq('architect_phone', ph).maybeSingle(),
            ]);
            setBilling(b || []);
            setRedemptions(r || []);
            if (p) setPrefs({
                experience_type: p.experience_type || '',
                preferred_month: p.preferred_month || '',
                destination_types: p.destination_types || [],
            });
        } catch (e) {
            console.warn('Loyalty load failed', e);
        } finally {
            setLoading(false);
        }
    };

    const summary = summarize(billing, redemptions);
    const { unlocked, locked, group } = suggestedExperiences(summary.pointsBalance, summary.circle.current);

    const savePrefs = async () => {
        await supabase.from('loyalty_preferences').upsert({
            architect_phone: phone,
            experience_type: prefs.experience_type,
            preferred_month: prefs.preferred_month,
            destination_types: prefs.destination_types,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'architect_phone' });
        setPrefsSaved(true);
        setTimeout(() => setPrefsSaved(false), 2500);
    };

    const toggleDest = (d) => {
        setPrefs(p => ({
            ...p,
            destination_types: p.destination_types.includes(d)
                ? p.destination_types.filter(x => x !== d)
                : [...p.destination_types, d],
        }));
    };

    const requestExperience = async (expName, dest) => {
        setRequesting(expName);
        try {
            await supabase.from('loyalty_redemptions').insert({
                architect_phone: phone,
                architect_name: name,
                experience_name: expName,
                region: `${dest.band} · ${dest.group} pax`,
                wallet_amount: dest.cost, // point cost (column reused); admin confirms on approval
                status: 'requested',
            });
            // Fire Telegram alert (fire-and-forget)
            try {
                fetch('/api/notify-telegram', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'custom',
                        text: `🎁 <b>EXPERIENCE REQUEST</b>\n\n${name || phone} requested <b>${expName}</b>\n📍 ${dest.band} · ${dest.group} traveller(s)\n◆ Cost: ${fmtPoints(dest.cost)} pts · Balance: ${fmtPoints(summary.pointsBalance)}\n⭐ ${summary.circle.current.label}`,
                    }),
                }).catch(() => {});
            } catch {}
            await load(phone);
        } finally {
            setRequesting(null);
        }
    };

    const firstName = (name || '').split(' ')[0] || 'Architect';
    const circle = summary.circle;

    return (
        <div style={S.root}>
            <style>{CSS}</style>

            {/* NAV */}
            <nav style={S.nav}>
                <Link to="/" style={S.logo}>STONEVO</Link>
                <div style={S.navRight}>
                    <span style={S.circleBadge(circle.current)}>{circle.current.label}</span>
                    <Link to="/" style={S.backLink}>← Gallery</Link>
                </div>
            </nav>

            {/* HERO */}
            <section style={S.hero}>
                <p style={S.eyebrow}><span style={S.tick} />Stonevo Privilege Circle</p>
                <h1 style={S.h1}>Welcome back, <em style={S.em}>{firstName}.</em></h1>
                <p style={S.heroSub}>
                    Your recognition for the projects you bring to Stonevo — expressed as Stone Points,
                    your Circle, and access to curated experiences.
                </p>
            </section>

            {loading ? (
                <p style={S.loading}>Loading your circle…</p>
            ) : (
                <>
                    {/* STAT CARDS — no sale revenue shown (GST-safe) */}
                    <section style={S.statsWrap}>
                        <div style={S.statCard}>
                            <p style={S.statLabel}>Stone Sourced</p>
                            <p style={S.statValue}>{summary.totalSqft.toLocaleString('en-IN')}<span style={{ fontSize: 16, color: MUTED }}> sqft</span></p>
                        </div>
                        <div style={S.statCard}>
                            <p style={S.statLabel}>Points Earned</p>
                            <p style={S.statValue}>{fmtPoints(summary.pointsEarned)}</p>
                        </div>
                        <div style={S.statCard}>
                            <p style={S.statLabel}>Points Balance</p>
                            <p style={{ ...S.statValue, color: '#C8A86E' }}>{fmtPoints(summary.pointsBalance)}</p>
                        </div>
                        <div style={{ ...S.statCard, ...S.circleCard(circle.current) }}>
                            <p style={S.statLabel}>Your Circle</p>
                            <p style={S.statValue}>{circle.current.short}</p>
                        </div>
                    </section>

                    {/* PROGRESS TO NEXT CIRCLE */}
                    <section style={S.progressWrap}>
                        {circle.next ? (
                            <>
                                <div style={S.progressHead}>
                                    <span>{circle.current.label}</span>
                                    <span style={{ color: '#9A938A' }}>{fmtPoints(circle.toNext)} more points to {circle.next.label}</span>
                                </div>
                                <div style={S.progressTrack}>
                                    <div style={{ ...S.progressFill, width: `${circle.progressPct}%` }} />
                                </div>
                            </>
                        ) : (
                            <p style={S.maxedOut}>✦ You've reached <strong>{circle.current.label}</strong> — our highest tier of recognition.</p>
                        )}
                    </section>

                    {/* TRAVEL ENTITLEMENT BANNER */}
                    <section style={S.section}>
                        <div style={S.entitleCard(circle.current)}>
                            <div>
                                <p style={S.entitleLabel}>Your travel entitlement</p>
                                <p style={S.entitleValue}>
                                    {circle.current.maxTravellers > 0
                                        ? `${circle.current.travelStyle}`
                                        : 'Reach Silver Circle to unlock your first experience'}
                                </p>
                            </div>
                            {circle.current.maxTravellers > 0 && (
                                <div style={S.entitleCount}>
                                    <span style={S.entitleNum}>{circle.current.maxTravellers}</span>
                                    <span style={S.entitleNumLabel}>{circle.current.maxTravellers === 1 ? 'traveller' : 'travellers'}</span>
                                </div>
                            )}
                        </div>
                        {circle.next && (
                            <p style={S.entitleNext}>
                                Reach <strong>{circle.next.label}</strong> → bring up to <strong>{circle.next.maxTravellers}</strong> ({circle.next.travelStyle}).
                            </p>
                        )}
                    </section>

                    {/* EXPERIENCE PREFERENCES */}
                    <section style={S.section}>
                        <p style={S.eyebrow}><span style={S.tick} />Experience Preferences</p>
                        <h2 style={S.h2}>How would you prefer to redeem your points?</h2>

                        <div style={S.prefGrid}>
                            {EXPERIENCE_TYPES.map(t => {
                                // 'open' is always available; others gate on the circle that unlocks them
                                const reqCircle = t.key === 'open' ? null : minCircleForExperienceType(t.key);
                                const locked = reqCircle ? summary.pointsBalance < reqCircle.min : false;
                                return (
                                    <button key={t.key}
                                        onClick={() => !locked && setPrefs(p => ({ ...p, experience_type: t.key }))}
                                        disabled={locked}
                                        style={S.prefCard(prefs.experience_type === t.key, locked)}>
                                        <p style={S.prefTitle}>
                                            {t.label}{t.star && <span style={{ color: '#C8A86E' }}> ★</span>}
                                            {locked && <span style={S.lockTag}> · 🔒 {reqCircle.short}</span>}
                                        </p>
                                        <p style={S.prefDesc}>{t.desc}</p>
                                    </button>
                                );
                            })}
                        </div>

                        <div style={S.prefRow}>
                            <div style={{ flex: 1 }}>
                                <p style={S.miniLabel}>Preferred Month</p>
                                <div style={S.monthRow}>
                                    {MONTHS.map(m => (
                                        <button key={m}
                                            onClick={() => setPrefs(p => ({ ...p, preferred_month: p.preferred_month === m ? '' : m }))}
                                            style={S.monthChip(prefs.preferred_month === m)}>{m}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 24 }}>
                            <p style={S.miniLabel}>Preferred Destination Type</p>
                            <div style={S.destRow}>
                                {DESTINATION_TYPES.map(d => (
                                    <button key={d} onClick={() => toggleDest(d)}
                                        style={S.destChip(prefs.destination_types.includes(d))}>{d}</button>
                                ))}
                            </div>
                        </div>

                        <button onClick={savePrefs} style={S.saveBtn}>
                            {prefsSaved ? '✓ Saved' : 'Save Preferences'}
                        </button>
                    </section>

                    {/* SUGGESTED EXPERIENCES */}
                    <section style={S.section}>
                        <p style={S.eyebrow}><span style={S.tick} />Suggested Experiences</p>
                        <h2 style={S.h2}>Curated for your circle</h2>

                        {unlocked.length === 0 && (
                            <div style={S.emptyExp}>
                                <p style={{ color: '#9A938A', fontSize: 15, lineHeight: 1.7 }}>
                                    Your Stone Points are building. Once you reach <strong style={{ color: '#C8A86E' }}>{fmtPoints(5000)} points</strong> (Silver Circle),
                                    your first <strong>Solo experiences</strong> unlock here.
                                </p>
                            </div>
                        )}

                        {/* Unlocked — affordable now (cost = per-person × your group size) */}
                        {unlocked.map(d => (
                            <div key={d.band} style={S.bandBlock}>
                                <div style={S.bandHead}>
                                    <span style={S.bandName}>{d.band}</span>
                                    <span style={S.bandRange}>{group === 1 ? 'Solo' : `Up to ${group}`} · {fmtPoints(d.cost)} pts</span>
                                </div>
                                <div style={S.expGrid}>
                                    {d.experiences.map(exp => (
                                        <div key={exp} style={S.expCard}>
                                            <span style={S.expName}>{exp}</span>
                                            <span style={S.expCost}>{fmtPoints(d.cost)} pts · {group === 1 ? 'solo' : `${group} pax`}</span>
                                            <button
                                                onClick={() => requestExperience(exp, d)}
                                                disabled={requesting === exp}
                                                style={S.expBtn}>
                                                {requesting === exp ? 'Requesting…' : 'Request'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Locked — not affordable yet */}
                        {locked.map(d => (
                            <div key={d.band} style={{ ...S.bandBlock, opacity: 0.5 }}>
                                <div style={S.bandHead}>
                                    <span style={S.bandName}>{d.band} 🔒</span>
                                    <span style={S.bandRange}>{group === 1 ? 'Solo' : `Up to ${group}`} · needs {fmtPoints(d.cost)} pts</span>
                                </div>
                                <div style={S.expGrid}>
                                    {d.experiences.map(exp => (
                                        <div key={exp} style={{ ...S.expCard, cursor: 'default' }}>
                                            <span style={S.expName}>{exp}</span>
                                            <span style={S.expCost}>Keep earning</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* MY REQUESTS */}
                    {redemptions.length > 0 && (
                        <section style={S.section}>
                            <p style={S.eyebrow}><span style={S.tick} />Your Requests</p>
                            <div style={{ marginTop: 16 }}>
                                {redemptions.map(r => (
                                    <div key={r.id} style={S.reqRow}>
                                        <span>{r.experience_name}</span>
                                        <span style={S.reqStatus(r.status)}>{r.status}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* BILLING HISTORY */}
                    <section style={S.section}>
                        <p style={S.eyebrow}><span style={S.tick} />Your Projects</p>
                        {billing.length === 0 ? (
                            <p style={{ color: '#9A938A', fontSize: 14, marginTop: 12 }}>
                                No projects recorded yet. As you source stone through Stonevo, your verified projects appear here.
                            </p>
                        ) : (
                            <div style={S.histTable}>
                                {billing.map(b => (
                                    <div key={b.id} style={S.histRow}>
                                        <span style={{ flex: 2 }}>{b.notes?.replace(/^Stone:\s*/, '').split(' · ')[0] || b.project_name || '—'}</span>
                                        <span style={{ flex: 1, textAlign: 'right', color: ACCENT, fontFamily: 'Noto Serif, serif' }}>Tier {(b.collection_tier || '—').toUpperCase().slice(0, 1)}</span>
                                        <span style={{ flex: 1, textAlign: 'right', color: '#9A938A' }}>{Number(b.sqft).toLocaleString('en-IN')} sqft</span>
                                        <span style={{ flex: 1, textAlign: 'right', color: '#C8A86E' }}>+{fmtPoints(b.points_earned)} pts</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}

            <footer style={S.footer}>
                <span>STONEVO PRIVILEGE CIRCLE</span>
                <span>© 2026 Stonevo Architectural · Artifact of Nature</span>
            </footer>
        </div>
    );
};

// ── Styles (inline so it's self-contained, matches dark-luxury aesthetic) ─────
const BRONZE = '#A37D4B';
const ACCENT = '#C8A86E';
const BG = '#0d0c0a';
const INK = '#FDFCF8';
const MUTED = '#9A938A';

const S = {
    root: { minHeight: '100vh', background: BG, color: INK, fontFamily: 'Manrope, sans-serif', paddingBottom: 60 },
    nav: { position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 40px', background: 'rgba(13,12,10,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    logo: { fontFamily: 'Noto Serif, serif', fontSize: 18, letterSpacing: '0.2em', color: INK, textDecoration: 'none' },
    navRight: { display: 'flex', alignItems: 'center', gap: 16 },
    circleBadge: (c) => ({ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: BG, background: c.accent, padding: '6px 14px', borderRadius: 100 }),
    backLink: { fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED, textDecoration: 'none' },
    hero: { padding: '70px 40px 40px', maxWidth: 1200, margin: '0 auto' },
    eyebrow: { fontSize: 10, fontWeight: 800, letterSpacing: '0.4em', textTransform: 'uppercase', color: BRONZE, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 },
    tick: { width: 32, height: 1, background: BRONZE, display: 'inline-block' },
    h1: { fontFamily: 'Noto Serif, serif', fontSize: 'clamp(38px, 5vw, 62px)', fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0 },
    em: { fontStyle: 'italic', color: BRONZE },
    heroSub: { fontSize: 15, fontWeight: 300, lineHeight: 1.7, color: MUTED, maxWidth: '54ch', marginTop: 22 },
    loading: { textAlign: 'center', color: MUTED, padding: 80 },
    statsWrap: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 1200, margin: '0 auto', padding: '0 40px' },
    statCard: { background: '#161412', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '26px 28px' },
    circleCard: (c) => ({ background: `linear-gradient(160deg, rgba(200,168,110,0.12), rgba(22,20,18,1))`, borderColor: c.accent + '66' }),
    statLabel: { fontSize: 9, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: MUTED, margin: 0 },
    statValue: { fontFamily: 'Noto Serif, serif', fontSize: 34, fontWeight: 400, margin: '12px 0 0' },
    progressWrap: { maxWidth: 1200, margin: '28px auto 0', padding: '0 40px' },
    progressHead: { display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 },
    progressTrack: { height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 100, overflow: 'hidden' },
    progressFill: { height: '100%', background: `linear-gradient(90deg, ${BRONZE}, ${ACCENT})`, borderRadius: 100, transition: 'width 0.6s' },
    maxedOut: { fontSize: 14, color: ACCENT, fontFamily: 'Noto Serif, serif', fontStyle: 'italic' },
    section: { maxWidth: 1200, margin: '60px auto 0', padding: '0 40px' },
    h2: { fontFamily: 'Noto Serif, serif', fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 28px' },
    prefGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 },
    prefCard: (active, locked) => ({ textAlign: 'left', background: active ? 'rgba(200,168,110,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${active ? ACCENT : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '18px 20px', cursor: locked ? 'not-allowed' : 'pointer', transition: 'all 0.2s', color: INK, opacity: locked ? 0.45 : 1 }),
    prefTitle: { fontFamily: 'Noto Serif, serif', fontSize: 18, margin: 0 },
    lockTag: { fontFamily: 'Manrope, sans-serif', fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: MUTED },
    entitleCard: (c) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `linear-gradient(135deg, rgba(200,168,110,0.1), rgba(22,20,18,1))`, border: `1px solid ${c.accent}55`, borderRadius: 18, padding: '24px 28px' }),
    entitleLabel: { fontSize: 9, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: MUTED, margin: 0 },
    entitleValue: { fontFamily: 'Noto Serif, serif', fontSize: 26, margin: '8px 0 0', color: INK },
    entitleCount: { textAlign: 'center' },
    entitleNum: { display: 'block', fontFamily: 'Noto Serif, serif', fontSize: 44, color: ACCENT, lineHeight: 1 },
    entitleNumLabel: { display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED, marginTop: 4 },
    entitleNext: { fontSize: 12, color: MUTED, marginTop: 14, lineHeight: 1.6 },
    prefDesc: { fontSize: 12, color: MUTED, lineHeight: 1.5, margin: '6px 0 0' },
    prefRow: { display: 'flex', gap: 24, marginTop: 28 },
    miniLabel: { fontSize: 10, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: MUTED, marginBottom: 12 },
    monthRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    monthChip: (active) => ({ padding: '8px 14px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: active ? ACCENT : 'rgba(255,255,255,0.04)', color: active ? BG : MUTED, border: `1px solid ${active ? ACCENT : 'rgba(255,255,255,0.08)'}` }),
    destRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    destChip: (active) => ({ padding: '10px 18px', borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: active ? 'rgba(200,168,110,0.15)' : 'rgba(255,255,255,0.04)', color: active ? ACCENT : MUTED, border: `1px solid ${active ? ACCENT : 'rgba(255,255,255,0.08)'}` }),
    saveBtn: { marginTop: 28, padding: '14px 36px', background: BRONZE, color: BG, border: 'none', borderRadius: 100, fontSize: 11, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer' },
    emptyExp: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 32 },
    bandBlock: { marginBottom: 36 },
    bandHead: { display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' },
    bandName: { fontFamily: 'Noto Serif, serif', fontSize: 22, fontStyle: 'italic', color: ACCENT },
    bandRange: { fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: MUTED },
    expGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
    expCard: { background: '#161412', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 },
    expName: { fontFamily: 'Noto Serif, serif', fontSize: 20 },
    expCost: { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: ACCENT },
    expBtn: { padding: '10px', background: 'rgba(200,168,110,0.12)', border: `1px solid ${ACCENT}66`, color: ACCENT, borderRadius: 100, fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer' },
    reqRow: { display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 14 },
    reqStatus: (s) => ({ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: s === 'fulfilled' || s === 'approved' ? '#7BC47F' : s === 'rejected' ? '#C47B7B' : ACCENT }),
    histTable: { marginTop: 16 },
    histRow: { display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13 },
    footer: { maxWidth: 1200, margin: '80px auto 0', padding: '32px 40px 0', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#6A645B' },
};

const CSS = `
  @media (max-width: 640px) {
    nav { padding: 16px 20px !important; }
  }
`;

export default PrivilegeCircle;
