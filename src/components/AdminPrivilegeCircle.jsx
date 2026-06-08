import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    computeBilling, summarize, fmtINR, fmtPoints, CIRCLES,
} from '../lib/loyalty';
import { Plus, Loader2, FileText, Award, Gift, ChevronDown, Check, X } from 'lucide-react';

const AdminPrivilegeCircle = () => {
    const [tab, setTab] = useState('billing'); // 'billing' | 'ledger' | 'redemptions'
    const [architects, setArchitects] = useState([]);
    const [tablesMissing, setTablesMissing] = useState(false);

    useEffect(() => { fetchArchitects(); }, []);

    const fetchArchitects = async () => {
        const { data } = await supabase
            .from('leads')
            .select('id, full_name, phone, status')
            .eq('role', 'architect')
            .eq('status', 'approved')
            .order('full_name');
        setArchitects(data || []);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Award className="text-bronze" size={22} />
                <div>
                    <h3 className="text-xl font-serif text-stone-800">Privilege Circle</h3>
                    <p className="text-stone-500 text-sm">Verified billing → Stone Points → Experience Wallet → Circle tier.</p>
                </div>
            </div>

            {tablesMissing && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                    <p className="font-bold mb-1">Loyalty tables not found.</p>
                    <p>Run <span className="font-mono bg-amber-100 px-1 rounded">LOYALTY_SETUP.sql</span> in your Supabase SQL editor, then refresh.</p>
                </div>
            )}

            {/* Sub-tabs */}
            <div className="flex gap-1 bg-stone-200/50 p-1 rounded-lg w-fit">
                {[
                    { id: 'billing', label: 'Add Billing', icon: Plus },
                    { id: 'ledger', label: 'Architect Ledger', icon: FileText },
                    { id: 'redemptions', label: 'Redemptions', icon: Gift },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${tab === t.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                        <t.icon size={13} /> {t.label}
                    </button>
                ))}
            </div>

            {tab === 'billing' && <BillingForm architects={architects} onMissing={() => setTablesMissing(true)} />}
            {tab === 'ledger' && <ArchitectLedger architects={architects} onMissing={() => setTablesMissing(true)} />}
            {tab === 'redemptions' && <RedemptionQueue onMissing={() => setTablesMissing(true)} />}
        </div>
    );
};

// ── Add Billing Record ──────────────────────────────────────────────────────
function BillingForm({ architects, onMissing }) {
    const [phone, setPhone] = useState('');
    const [project, setProject] = useState('');
    const [sqft, setSqft] = useState('');
    const [rate, setRate] = useState('');
    const [billedAt, setBilledAt] = useState(new Date().toISOString().slice(0, 10));
    const [invoiceRef, setInvoiceRef] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState(null);
    const [dupWarn, setDupWarn] = useState('');

    const preview = computeBilling(sqft, rate);
    const selectedArch = architects.find(a => a.phone === phone);

    // Warn if this project name is already billed to a DIFFERENT architect
    useEffect(() => {
        setDupWarn('');
        if (!project.trim()) return;
        const t = setTimeout(async () => {
            const { data } = await supabase
                .from('loyalty_billing')
                .select('architect_name, architect_phone')
                .ilike('project_name', project.trim());
            const others = (data || []).filter(r => r.architect_phone !== phone);
            if (others.length) {
                setDupWarn(`⚠️ "${project.trim()}" is already billed to ${others[0].architect_name || others[0].architect_phone}.`);
            }
        }, 400);
        return () => clearTimeout(t);
    }, [project, phone]);

    const save = async () => {
        if (!phone) { setResult({ ok: false, msg: 'Select an architect.' }); return; }
        if (!preview.sqft || !preview.ratePerSqft) { setResult({ ok: false, msg: 'Enter sqft and rate.' }); return; }
        setSaving(true);
        setResult(null);
        try {
            const payload = {
                architect_phone: phone,
                architect_lead_id: selectedArch?.id || null,
                architect_name: selectedArch?.full_name || null,
                project_name: project.trim() || null,
                sqft: preview.sqft,
                rate_per_sqft: preview.ratePerSqft,
                material_value: preview.materialValue,
                collection_tier: preview.collectionTier,
                points_per_sqft: preview.pointsPerSqft,
                points_earned: preview.pointsEarned,
                wallet_per_sqft: preview.walletPerSqft,
                wallet_earned: preview.walletEarned,
                billed_at: billedAt,
                invoice_ref: invoiceRef.trim() || null,
                notes: notes.trim() || null,
                created_by: 'admin',
            };
            const { error } = await supabase.from('loyalty_billing').insert(payload);
            if (error) {
                if (error.code === '42P01') { onMissing(); throw new Error('Loyalty tables not set up yet.'); }
                throw error;
            }
            setResult({ ok: true, msg: `✓ Recorded ${fmtINR(preview.materialValue)} for ${selectedArch?.full_name}. +${fmtPoints(preview.pointsEarned)} pts, +${fmtINR(preview.walletEarned)} wallet.` });
            setProject(''); setSqft(''); setRate(''); setInvoiceRef(''); setNotes('');
        } catch (err) {
            setResult({ ok: false, msg: err.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
            {/* Form */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Architect</label>
                    <select value={phone} onChange={e => setPhone(e.target.value)}
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bronze">
                        <option value="">— Select architect —</option>
                        {architects.map(a => (
                            <option key={a.id} value={a.phone}>{a.full_name || '(no name)'} · {a.phone}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Project Name</label>
                    <input type="text" value={project} onChange={e => setProject(e.target.value)}
                        placeholder="e.g. Mehta Residence, DLF Phase 2"
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bronze" />
                    {dupWarn && <p className="text-[11px] text-amber-600 font-medium">{dupWarn}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Area (sqft)</label>
                        <input type="number" value={sqft} onChange={e => setSqft(e.target.value)}
                            placeholder="5000"
                            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bronze" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Rate (₹/sqft)</label>
                        <input type="number" value={rate} onChange={e => setRate(e.target.value)}
                            placeholder="1200"
                            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bronze" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Billed Date</label>
                        <input type="date" value={billedAt} onChange={e => setBilledAt(e.target.value)}
                            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bronze" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Invoice Ref (optional)</label>
                        <input type="text" value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)}
                            placeholder="INV-0042"
                            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bronze" />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Notes (optional)</label>
                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bronze" />
                </div>

                <button onClick={save} disabled={saving}
                    className="w-full py-2.5 bg-stone-900 text-white rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Plus size={14} /> Record Billing</>}
                </button>

                {result && (
                    <p className={`text-sm font-medium ${result.ok ? 'text-green-600' : 'text-red-500'}`}>{result.msg}</p>
                )}
            </div>

            {/* Live preview */}
            <div className="bg-stone-900 rounded-2xl p-6 text-white space-y-4 h-fit">
                <p className="text-[10px] font-bold text-bronze uppercase tracking-[0.3em]">Earning Preview</p>
                <div className="grid grid-cols-2 gap-4">
                    <Stat label="Material Value" value={fmtINR(preview.materialValue)} />
                    <Stat label="Collection" value={preview.collectionLabel} />
                    <Stat label="Stone Points" value={`+${fmtPoints(preview.pointsEarned)}`} accent />
                    <Stat label="Wallet Earned" value={`+${fmtINR(preview.walletEarned)}`} accent />
                </div>
                <div className="pt-3 border-t border-white/10 text-[11px] text-stone-400 leading-relaxed">
                    {preview.ratePerSqft > 0 ? (
                        <>At {fmtINR(preview.ratePerSqft)}/sqft → <span className="text-bronze">{preview.pointsPerSqft} pts</span> & <span className="text-bronze">{fmtINR(preview.walletPerSqft)}</span> per sqft.</>
                    ) : 'Enter rate to see the collection tier.'}
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, accent }) {
    return (
        <div>
            <p className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1">{label}</p>
            <p className={`font-serif text-2xl ${accent ? 'text-bronze' : 'text-white'}`}>{value}</p>
        </div>
    );
}

// ── Architect Ledger ────────────────────────────────────────────────────────
function ArchitectLedger({ architects, onMissing }) {
    const [phone, setPhone] = useState('');
    const [billing, setBilling] = useState([]);
    const [redemptions, setRedemptions] = useState([]);
    const [loading, setLoading] = useState(false);

    const load = async (ph) => {
        if (!ph) return;
        setLoading(true);
        try {
            const [{ data: b, error: be }, { data: r }] = await Promise.all([
                supabase.from('loyalty_billing').select('*').eq('architect_phone', ph).order('billed_at', { ascending: false }),
                supabase.from('loyalty_redemptions').select('*').eq('architect_phone', ph),
            ]);
            if (be?.code === '42P01') { onMissing(); return; }
            setBilling(b || []);
            setRedemptions(r || []);
        } finally {
            setLoading(false);
        }
    };

    const summary = summarize(billing, redemptions);
    const selectedArch = architects.find(a => a.phone === phone);

    return (
        <div className="space-y-5 max-w-4xl">
            <select value={phone} onChange={e => { setPhone(e.target.value); load(e.target.value); }}
                className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bronze">
                <option value="">— Select architect —</option>
                {architects.map(a => <option key={a.id} value={a.phone}>{a.full_name} · {a.phone}</option>)}
            </select>

            {loading && <p className="text-stone-400 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</p>}

            {phone && !loading && (
                <>
                    {/* Summary strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <SummaryCard label="Revenue" value={fmtINR(summary.revenue)} />
                        <SummaryCard label="Stone Points" value={fmtPoints(summary.points)} />
                        <SummaryCard label="Wallet Balance" value={fmtINR(summary.walletBalance)} sub={`Earned ${fmtINR(summary.walletEarned)} · Spent ${fmtINR(summary.walletSpent)}`} />
                        <SummaryCard label="Circle" value={summary.circle.current.label} circle={summary.circle.current} />
                    </div>

                    {/* Billing rows */}
                    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-stone-50 text-[9px] font-bold uppercase tracking-widest text-stone-400">
                            <div className="col-span-3">Project</div>
                            <div className="col-span-2 text-right">Sqft</div>
                            <div className="col-span-2 text-right">Rate</div>
                            <div className="col-span-2 text-right">Value</div>
                            <div className="col-span-1 text-right">Pts</div>
                            <div className="col-span-2 text-right">Wallet</div>
                        </div>
                        {billing.length === 0 ? (
                            <p className="px-4 py-6 text-sm text-stone-400 italic">No billing recorded yet.</p>
                        ) : billing.map(b => (
                            <div key={b.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-t border-stone-100 text-xs text-stone-700">
                                <div className="col-span-3 font-medium truncate">{b.project_name || '—'}</div>
                                <div className="col-span-2 text-right">{Number(b.sqft).toLocaleString('en-IN')}</div>
                                <div className="col-span-2 text-right">{fmtINR(b.rate_per_sqft)}</div>
                                <div className="col-span-2 text-right">{fmtINR(b.material_value)}</div>
                                <div className="col-span-1 text-right text-bronze font-bold">{fmtPoints(b.points_earned)}</div>
                                <div className="col-span-2 text-right text-bronze">{fmtINR(b.wallet_earned)}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function SummaryCard({ label, value, sub, circle }) {
    return (
        <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="font-serif text-xl text-stone-900 flex items-center gap-2">
                {circle && <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: circle.accent }} />}
                {value}
            </p>
            {sub && <p className="text-[10px] text-stone-400 mt-1">{sub}</p>}
        </div>
    );
}

// ── Redemption Queue ────────────────────────────────────────────────────────
function RedemptionQueue({ onMissing }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('requested');

    const load = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('loyalty_redemptions')
            .select('*')
            .order('requested_at', { ascending: false });
        if (error?.code === '42P01') { onMissing(); setLoading(false); return; }
        setRows(data || []);
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const resolve = async (id, status) => {
        await supabase.from('loyalty_redemptions').update({ status, resolved_at: new Date().toISOString() }).eq('id', id);
        load();
    };

    const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter);

    return (
        <div className="space-y-4 max-w-4xl">
            <div className="flex gap-1 bg-stone-200/50 p-1 rounded-lg w-fit">
                {['requested', 'approved', 'fulfilled', 'rejected', 'all'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md ${filter === f ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
                        {f}
                    </button>
                ))}
            </div>

            {loading ? <p className="text-stone-400 text-sm">Loading…</p> : filtered.length === 0 ? (
                <p className="text-stone-400 text-sm italic">No {filter} redemptions.</p>
            ) : (
                <div className="space-y-2">
                    {filtered.map(r => (
                        <div key={r.id} className="bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between gap-4">
                            <div>
                                <p className="font-serif text-stone-900">{r.experience_name} <span className="text-bronze">{fmtINR(r.wallet_amount)}</span></p>
                                <p className="text-xs text-stone-500">{r.architect_name || r.architect_phone} · {new Date(r.requested_at).toLocaleDateString('en-IN')} · <span className="uppercase">{r.status}</span></p>
                            </div>
                            {r.status === 'requested' && (
                                <div className="flex gap-2">
                                    <button onClick={() => resolve(r.id, 'approved')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"><Check size={12} /> Approve</button>
                                    <button onClick={() => resolve(r.id, 'rejected')} className="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-lg text-xs font-bold flex items-center gap-1"><X size={12} /> Reject</button>
                                </div>
                            )}
                            {r.status === 'approved' && (
                                <button onClick={() => resolve(r.id, 'fulfilled')} className="px-3 py-1.5 bg-bronze text-white rounded-lg text-xs font-bold">Mark Fulfilled</button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AdminPrivilegeCircle;
