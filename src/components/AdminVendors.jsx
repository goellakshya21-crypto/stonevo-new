import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserPlus, X, Loader2, Trash2, Eye, Send } from 'lucide-react';

// Admin section: invite vendors + see what they've uploaded.
// No approval/moderation — submissions are NOT linked to the public gallery.
const AdminVendors = () => {
    const [tab, setTab] = useState('submissions'); // submissions | vendors | invite
    const [submissions, setSubmissions] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [preview, setPreview] = useState(null);

    const [invitePhone, setInvitePhone] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviting, setInviting] = useState(false);
    const [inviteStatus, setInviteStatus] = useState(null);

    const fetchAll = async () => {
        setLoading(true);
        const [{ data: subs }, { data: v }] = await Promise.all([
            supabase.from('vendor_stones').select('*, leads!vendor_stones_vendor_id_fkey(full_name, phone)').order('created_at', { ascending: false }),
            supabase.from('leads').select('id, phone, full_name, status, created_at').eq('role', 'vendor').order('created_at', { ascending: false })
        ]);
        setSubmissions(subs || []);
        setVendors(v || []);
        setLoading(false);
    };
    useEffect(() => { fetchAll(); }, []);

    const inviteVendor = async (e) => {
        e.preventDefault();
        const clean = invitePhone.replace(/\D/g, '').slice(-10);
        if (clean.length < 10) { setInviteStatus({ ok: false, msg: 'Enter a valid 10-digit phone' }); return; }
        if (!inviteName.trim()) { setInviteStatus({ ok: false, msg: 'Name required' }); return; }
        setInviting(true); setInviteStatus(null);
        try {
            const { data: existing } = await supabase.from('leads').select('id, role').eq('phone', clean).maybeSingle();
            if (existing) {
                if (existing.role === 'vendor') { setInviteStatus({ ok: false, msg: `+91 ${clean} is already a vendor.` }); setInviting(false); return; }
                await supabase.from('leads').update({ role: 'vendor', status: 'approved', full_name: inviteName.trim() }).eq('id', existing.id);
            } else {
                await supabase.from('leads').insert({
                    phone: clean, full_name: inviteName.trim(),
                    email: `${clean}@stonevo.pro`, role: 'vendor', status: 'approved'
                });
            }
            setInviteStatus({ ok: true, msg: `✓ ${inviteName} (+91 ${clean}) added as vendor` });
            setInvitePhone(''); setInviteName('');
            fetchAll();
        } catch (err) { setInviteStatus({ ok: false, msg: err.message }); }
        finally { setInviting(false); }
    };

    const revokeVendor = async (v) => {
        if (!confirm(`Revoke vendor access for ${v.full_name || v.phone}?\n\nTheir uploaded stones stay in the database but they can no longer log in to /vendor.`)) return;
        await supabase.from('leads').update({ role: null }).eq('id', v.id);
        fetchAll();
    };

    const deleteSubmission = async (sub) => {
        if (!confirm(`Delete "${sub.name}" from ${sub.leads?.full_name || 'vendor'}? This cannot be undone.`)) return;
        await supabase.from('vendor_stones').delete().eq('id', sub.id);
        fetchAll();
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-stone-200/50 p-1 rounded-lg w-fit">
                {[
                    ['submissions', `Vendor Stones (${submissions.length})`],
                    ['vendors', `Vendors (${vendors.length})`],
                    ['invite', 'Invite Vendor']
                ].map(([id, label]) => (
                    <button key={id} onClick={() => setTab(id)} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${tab === id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>{label}</button>
                ))}
            </div>

            {/* ─── INVITE TAB ─── */}
            {tab === 'invite' && (
                <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-xl space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-100 rounded-full"><UserPlus className="text-amber-700" size={20} /></div>
                        <div>
                            <h3 className="text-lg font-serif text-stone-800">Invite a vendor</h3>
                            <p className="text-stone-500 text-xs">Adds them to the leads registry with <code className="bg-stone-100 px-1 rounded text-[11px]">role: vendor</code>. They sign in at <code className="bg-stone-100 px-1 rounded text-[11px]">/vendor</code> using this phone + OTP.</p>
                        </div>
                    </div>
                    <form onSubmit={inviteVendor} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">Vendor name</label>
                            <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="e.g. Marble Junction" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-bronze" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">Phone number (10-digit)</label>
                            <input type="tel" value={invitePhone} onChange={e => setInvitePhone(e.target.value)} placeholder="9876543210" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-bronze" />
                        </div>
                        {inviteStatus && <p className={`text-sm ${inviteStatus.ok ? 'text-green-600' : 'text-red-500'}`}>{inviteStatus.msg}</p>}
                        <button type="submit" disabled={inviting} className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 disabled:opacity-50">
                            {inviting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Add vendor
                        </button>
                    </form>
                </div>
            )}

            {/* ─── VENDORS TAB ─── */}
            {tab === 'vendors' && (
                <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-stone-50 border-b border-stone-200">
                            <tr>
                                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Name</th>
                                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Phone</th>
                                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Added</th>
                                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Stones</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {vendors.length === 0 ? (
                                <tr><td colSpan={5} className="px-5 py-10 text-center text-stone-500 text-sm italic">No vendors yet — invite one to get started.</td></tr>
                            ) : vendors.map(v => {
                                const stoneCount = submissions.filter(s => s.vendor_id === v.id).length;
                                return (
                                    <tr key={v.id} className="border-b border-stone-100 last:border-0">
                                        <td className="px-5 py-3 font-medium text-stone-800">{v.full_name || '—'}</td>
                                        <td className="px-5 py-3 font-mono text-stone-600">+91 {v.phone}</td>
                                        <td className="px-5 py-3 text-stone-500 text-xs">{new Date(v.created_at).toLocaleDateString()}</td>
                                        <td className="px-5 py-3 text-stone-600">{stoneCount}</td>
                                        <td className="px-5 py-3 text-right">
                                            <button onClick={() => revokeVendor(v)} className="text-stone-400 hover:text-red-500 px-2 py-1 text-[10px] font-bold uppercase tracking-widest">Revoke</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ─── SUBMISSIONS TAB ─── */}
            {tab === 'submissions' && (
                <>
                    {loading ? (
                        <p className="text-stone-500 text-sm">Loading…</p>
                    ) : submissions.length === 0 ? (
                        <div className="border-2 border-dashed border-stone-200 rounded-xl py-16 text-center text-stone-500 text-sm">No vendor uploads yet.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {submissions.map(sub => (
                                <div key={sub.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden flex flex-col">
                                    <button onClick={() => setPreview(sub)} className="block aspect-[3/2] bg-stone-100 relative">
                                        {sub.image_url ? <img src={sub.image_url} alt={sub.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">No image</div>}
                                    </button>
                                    <div className="p-4 space-y-2 flex-1 flex flex-col">
                                        <div>
                                            <h4 className="font-serif text-stone-800 text-base leading-tight">{sub.name}</h4>
                                            <p className="text-[10px] uppercase tracking-widest text-stone-500 mt-1">
                                                {sub.leads?.full_name || '—'} · +91 {sub.leads?.phone || '—'}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                                            {sub.stone_type && <span><b className="text-stone-400">Type</b> {sub.stone_type}</span>}
                                            {sub.origin && <span><b className="text-stone-400">Origin</b> {sub.origin}</span>}
                                            {sub.price_per_sqft != null && <span><b className="text-stone-400">₹/sqft</b> {sub.price_per_sqft}</span>}
                                            {sub.lot_size_sqft != null && <span><b className="text-stone-400">Lot</b> {sub.lot_size_sqft} sqft</span>}
                                        </div>
                                        <div className="flex items-center gap-2 pt-3 mt-auto border-t border-stone-100">
                                            <button onClick={() => setPreview(sub)} className="flex-1 text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-stone-800 py-2 border border-stone-200 rounded-lg flex items-center justify-center gap-1.5"><Eye size={11} /> View</button>
                                            <button onClick={() => deleteSubmission(sub)} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-white hover:bg-red-500 py-2 px-3 border border-red-200 hover:border-red-500 rounded-lg"><Trash2 size={11} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Preview modal */}
            {preview && (
                <div className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center p-6" onClick={() => setPreview(null)}>
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-stone-200">
                            <h3 className="font-serif text-xl text-stone-800">{preview.name}</h3>
                            <button onClick={() => setPreview(null)} className="text-stone-400 hover:text-stone-800"><X size={20} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {preview.image_url && <img src={preview.image_url} alt={preview.name} className="w-full rounded-xl border border-stone-200" />}
                            {Array.isArray(preview.additional_images) && preview.additional_images.length > 0 && (
                                <div className="grid grid-cols-4 gap-2">
                                    {preview.additional_images.map((u, i) => <img key={i} src={u} className="aspect-square object-cover rounded-lg border border-stone-200" alt="" />)}
                                </div>
                            )}
                            <dl className="grid grid-cols-2 gap-3 text-sm">
                                {[
                                    ['Vendor', `${preview.leads?.full_name || '—'} (+91 ${preview.leads?.phone || '—'})`],
                                    ['Stone type', preview.stone_type],
                                    ['Origin', preview.origin],
                                    ['Price / sqft', preview.price_per_sqft != null ? `₹ ${preview.price_per_sqft}` : null],
                                    ['Lot size', preview.lot_size_sqft != null ? `${preview.lot_size_sqft} sqft` : null],
                                    ['Slab (cm)', (preview.slab_length || preview.slab_width) ? `${preview.slab_length || '—'} × ${preview.slab_width || '—'}` : null]
                                ].filter(([, v]) => v).map(([k, v]) => (
                                    <div key={k}>
                                        <dt className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{k}</dt>
                                        <dd className="text-stone-800">{v}</dd>
                                    </div>
                                ))}
                            </dl>
                            {preview.notes && <div><p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Notes</p><p className="text-sm text-stone-700">{preview.notes}</p></div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminVendors;
