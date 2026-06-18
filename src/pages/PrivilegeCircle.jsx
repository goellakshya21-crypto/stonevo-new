import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
    summarize, fmtPoints, CIRCLES,
    EXPERIENCE_TYPES, DESTINATION_TYPES, MONTHS,
    DESTINATIONS, NIGHTS_MIN, NIGHTS_MAX, NIGHTS_DEFAULT, PEAK_BUFFER,
    computeExperienceCost, costBreakdown, minCircleForExperienceType,
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
    const [travellers, setTravellers] = useState(1);   // up to circle max
    const [nights, setNights] = useState(NIGHTS_DEFAULT);

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
    const maxTravellers = summary.circle.current.maxTravellers || 0;
    // Clamp travellers to the architect's current circle ceiling
    const effTravellers = Math.min(Math.max(1, travellers), Math.max(1, maxTravellers));

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
            const bd = costBreakdown(dest, effTravellers, nights);
            await supabase.from('loyalty_redemptions').insert({
                architect_phone: phone,
                architect_name: name,
                experience_name: expName,
                region: `${dest.band} · ${bd.travellers} pax · ${bd.nights} nights`,
                wallet_amount: bd.total, // point cost (column reused); admin confirms on approval
                status: 'requested',
            });
            // Fire Telegram alert (fire-and-forget)
            try {
                fetch('/api/notify-telegram', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'custom',
                        text: `🎁 <b>EXPERIENCE REQUEST</b>\n\n${name || phone} requested <b>${expName}</b>\n📍 ${dest.band} · ${bd.travellers} pax · ${bd.nights} nights\n✈️ Flights ${fmtPoints(bd.flights)} + 🏨 Hotel ${fmtPoints(bd.hotels)}\n◆ Total: ${fmtPoints(bd.total)} pts · Balance: ${fmtPoints(summary.pointsBalance)}\n⭐ ${summary.circle.current.label}`,
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

                    {/* THE CIRCLES — full ladder so architects see what's ahead */}
                    <section style={S.section}>
                        <p style={S.eyebrow}><span style={S.tick} />The Circles</p>
                        <h2 style={S.h2}>Every tier, and what it unlocks</h2>
                        <div style={S.ladder}>
                            {CIRCLES.filter(c => c.key !== 'member').map(c => {
                                const isCurrent = c.key === circle.current.key;
                                const achieved = summary.pointsBalance >= c.min;
                                const toGo = Math.max(0, c.min - summary.pointsBalance);
                                return (
                                    <div key={c.key} style={S.ladderCard(isCurrent, achieved, c)}>
                                        {isCurrent && <span style={S.ladderBadge(c)}>You're here</span>}
                                        <span style={S.ladderDot(c)} />
                                        <p style={S.ladderName}>{c.label}</p>
                                        <p style={S.ladderThreshold}>{fmtPoints(c.min)} pts</p>
                                        <div style={S.ladderDivider} />
                                        <p style={S.ladderGroupNum}>{c.maxTravellers}</p>
                                        <p style={S.ladderGroupLabel}>{c.travelStyle}</p>
                                        <p style={S.ladderStatus(achieved)}>
                                            {achieved ? '✓ Unlocked' : `${fmtPoints(toGo)} pts to go`}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                        <p style={S.ladderFoot}>
                            Each circle lets you bring more people — from a solo escape to a full team offsite.
                            Your circle is set by your current points balance and rises as you generate more business through Stonevo.
                        </p>
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
                        <p style={S.eyebrow}><span style={S.tick} />Plan Your Experience</p>
                        <h2 style={S.h2}>Flights + hotel, priced live</h2>

                        {maxTravellers === 0 ? (
                            <div style={S.emptyExp}>
                                <p style={{ color: '#9A938A', fontSize: 15, lineHeight: 1.7 }}>
                                    Your Stone Points are building. Once you reach <strong style={{ color: '#C8A86E' }}>{fmtPoints(25000)} points</strong> (Silver Circle),
                                    you can plan your first <strong>solo experience</strong> here.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Configurator: travellers + nights */}
                                <div style={S.configBar}>
                                    <div style={S.configGroup}>
                                        <span style={S.configLabel}>Travellers <span style={{ color: '#6A645B' }}>(max {maxTravellers})</span></span>
                                        <div style={S.stepper}>
                                            <button style={S.stepBtn} onClick={() => setTravellers(t => Math.max(1, Math.min(maxTravellers, t) - 1))}>−</button>
                                            <span style={S.stepVal}>{effTravellers}</span>
                                            <button style={S.stepBtn} onClick={() => setTravellers(t => Math.min(maxTravellers, Math.max(1, t) + 1))}>+</button>
                                        </div>
                                    </div>
                                    <div style={S.configGroup}>
                                        <span style={S.configLabel}>Nights <span style={{ color: '#6A645B' }}>({NIGHTS_MIN}–{NIGHTS_MAX})</span></span>
                                        <div style={S.stepper}>
                                            <button style={S.stepBtn} onClick={() => setNights(n => Math.max(NIGHTS_MIN, n - 1))}>−</button>
                                            <span style={S.stepVal}>{nights}</span>
                                            <button style={S.stepBtn} onClick={() => setNights(n => Math.min(NIGHTS_MAX, n + 1))}>+</button>
                                        </div>
                                    </div>
                                    <p style={S.configHint}>
                                        {Math.ceil(effTravellers / 2)} room(s) · costs include a {Math.round((PEAK_BUFFER - 1) * 100)}% seasonal buffer so your points always cover peak fares.<br />
                                        Available: <strong style={{ color: '#C8A86E' }}>{fmtPoints(summary.pointsAvailable)} pts</strong>
                                        {summary.pointsReserved > 0 && <span style={{ color: '#9A938A' }}> · {fmtPoints(summary.pointsReserved)} pts reserved by pending requests</span>}
                                    </p>
                                </div>

                                {/* Destination cards, costed for the chosen config */}
                                {DESTINATIONS.map(d => {
                                    const bd = costBreakdown(d, effTravellers, nights);
                                    const affordable = summary.pointsAvailable >= bd.total;
                                    return (
                                        <div key={d.band} style={{ ...S.bandBlock, opacity: affordable ? 1 : 0.55 }}>
                                            <div style={S.bandHead}>
                                                <span style={S.bandName}>{d.band}{!affordable && ' 🔒'}</span>
                                                <span style={S.bandRange}>
                                                    ✈️ {fmtPoints(bd.flights)} + 🏨 {fmtPoints(bd.hotels)} ({bd.rooms} rm) + season {fmtPoints(bd.buffer)} = <strong style={{ color: affordable ? '#C8A86E' : '#9A938A' }}>{fmtPoints(bd.total)} pts</strong>
                                                </span>
                                            </div>
                                            <div style={S.expGrid}>
                                                {d.experiences.map(exp => (
                                                    <div key={exp} style={{ ...S.expCard, cursor: affordable ? 'pointer' : 'default' }}>
                                                        <span style={S.expName}>{exp}</span>
                                                        <span style={S.expCost}>{effTravellers} pax · {nights}n · {fmtPoints(bd.total)} pts</span>
                                                        {affordable ? (
                                                            <button
                                                                onClick={() => requestExperience(exp, d)}
                                                                disabled={requesting === exp}
                                                                style={S.expBtn}>
                                                                {requesting === exp ? 'Requesting…' : 'Request'}
                                                            </button>
                                                        ) : (
                                                            <span style={{ ...S.expCost, color: '#6A645B' }}>Need {fmtPoints(bd.total - summary.pointsAvailable)} more</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
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
    ladder: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 },
    ladderCard: (current, achieved, c) => ({
        position: 'relative', textAlign: 'center',
        background: current ? `linear-gradient(160deg, rgba(200,168,110,0.14), rgba(22,20,18,1))` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${current ? c.accent : achieved ? 'rgba(200,168,110,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 18, padding: '28px 20px 22px',
        opacity: achieved || current ? 1 : 0.7,
    }),
    ladderBadge: (c) => ({ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: BG, background: c.accent, padding: '4px 12px', borderRadius: 100 }),
    ladderDot: (c) => ({ display: 'block', width: 12, height: 12, borderRadius: '50%', background: c.accent, margin: '0 auto 14px' }),
    ladderName: { fontFamily: 'Noto Serif, serif', fontSize: 19, margin: 0, color: INK },
    ladderThreshold: { fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: ACCENT, margin: '6px 0 0' },
    ladderDivider: { height: 1, background: 'rgba(255,255,255,0.08)', margin: '16px 0' },
    ladderGroupNum: { fontFamily: 'Noto Serif, serif', fontSize: 36, color: INK, margin: 0, lineHeight: 1 },
    ladderGroupLabel: { fontSize: 11, color: MUTED, margin: '6px 0 0', lineHeight: 1.4 },
    ladderStatus: (achieved) => ({ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: achieved ? '#7BC47F' : MUTED, margin: '16px 0 0' }),
    ladderFoot: { fontSize: 13, color: MUTED, lineHeight: 1.7, marginTop: 24, maxWidth: '70ch' },
    prefDesc: { fontSize: 12, color: MUTED, lineHeight: 1.5, margin: '6px 0 0' },
    prefRow: { display: 'flex', gap: 24, marginTop: 28 },
    miniLabel: { fontSize: 10, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: MUTED, marginBottom: 12 },
    monthRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    monthChip: (active) => ({ padding: '8px 14px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: active ? ACCENT : 'rgba(255,255,255,0.04)', color: active ? BG : MUTED, border: `1px solid ${active ? ACCENT : 'rgba(255,255,255,0.08)'}` }),
    destRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    destChip: (active) => ({ padding: '10px 18px', borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: active ? 'rgba(200,168,110,0.15)' : 'rgba(255,255,255,0.04)', color: active ? ACCENT : MUTED, border: `1px solid ${active ? ACCENT : 'rgba(255,255,255,0.08)'}` }),
    saveBtn: { marginTop: 28, padding: '14px 36px', background: BRONZE, color: BG, border: 'none', borderRadius: 100, fontSize: 11, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer' },
    emptyExp: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 32 },
    configBar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 28, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', marginBottom: 32 },
    configGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
    configLabel: { fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED },
    stepper: { display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 100, padding: 4 },
    stepBtn: { width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(200,168,110,0.15)', color: ACCENT, fontSize: 18, cursor: 'pointer', lineHeight: 1 },
    stepVal: { minWidth: 40, textAlign: 'center', fontFamily: 'Noto Serif, serif', fontSize: 22, color: INK },
    configHint: { flex: '1 1 200px', fontSize: 12, color: MUTED, lineHeight: 1.5, textAlign: 'right' },
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
