import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { compressImage } from '../utils/imageOptimizer';
import { Phone, ShieldCheck, Plus, Upload, Trash2, Edit3, X, LogOut, Image as ImageIcon } from 'lucide-react';
import { notifyLogin } from '../utils/notifyTelegram';

const DEV_NUMBERS = ['7678320944', '7042353166']; // OTP bypass with 000000

const STONE_TYPES = ['Marble', 'Quartzite', 'Granite', 'Onyx', 'Limestone', 'Travertine', 'Sandstone', 'Quartz'];

// ── Helpers ──────────────────────────────────────────────────────────────
const uploadImage = async (file) => {
    const optimized = await compressImage(file);
    const ext = optimized.name.split('.').pop();
    const path = `vendor/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const { error } = await supabase.storage.from('marble-images').upload(path, optimized, {
        contentType: optimized.type, cacheControl: '3600', upsert: false
    });
    if (error) throw error;
    const { data } = supabase.storage.from('marble-images').getPublicUrl(path);
    return data.publicUrl;
};

// ── Add/Edit stone form ──────────────────────────────────────────────────
const StoneForm = ({ vendorId, existing, onClose, onSaved }) => {
    const [form, setForm] = useState({
        name: existing?.name || '',
        stone_type: existing?.stone_type || '',
        origin: existing?.origin || '',
        price_per_sqft: existing?.price_per_sqft || '',
        lot_size_sqft: existing?.lot_size_sqft || '',
        slab_length: existing?.slab_length || '',
        slab_width: existing?.slab_width || '',
        notes: existing?.notes || ''
    });
    const [mainImage, setMainImage] = useState(existing?.image_url || null);
    const [additional, setAdditional] = useState(existing?.additional_images || []);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleMain = async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setUploading(true); setError(null);
        try { setMainImage(await uploadImage(f)); }
        catch (err) { setError('Upload failed: ' + err.message); }
        finally { setUploading(false); }
    };
    const handleAdditional = async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (additional.length >= 4) { setError('Maximum 4 additional images'); return; }
        setUploading(true); setError(null);
        try { setAdditional([...additional, await uploadImage(f)]); }
        catch (err) { setError('Upload failed: ' + err.message); }
        finally { setUploading(false); }
    };

    const save = async () => {
        if (!form.name.trim()) { setError('Stone name is required'); return; }
        if (!mainImage) { setError('Main image is required'); return; }
        setSaving(true); setError(null);
        try {
            const payload = {
                vendor_id: vendorId,
                name: form.name.trim(),
                image_url: mainImage,
                additional_images: additional,
                stone_type: form.stone_type || null,
                origin: form.origin.trim() || null,
                price_per_sqft: form.price_per_sqft ? Number(form.price_per_sqft) : null,
                lot_size_sqft: form.lot_size_sqft ? Number(form.lot_size_sqft) : null,
                slab_length: form.slab_length ? Number(form.slab_length) : null,
                slab_width: form.slab_width ? Number(form.slab_width) : null,
                notes: form.notes.trim() || null
            };
            if (existing) {
                const { error } = await supabase.from('vendor_stones').update(payload).eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('vendor_stones').insert(payload);
                if (error) throw error;
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[400] bg-black/85 backdrop-blur-md flex items-start justify-center overflow-y-auto p-4 md:p-10">
            <div className="bg-stone-900 border border-white/10 rounded-2xl w-full max-w-3xl my-auto">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                        <h3 className="text-2xl font-serif text-white italic">{existing ? 'Edit Stone' : 'Add Stone'}</h3>
                        <p className="text-xs text-stone-500 mt-1">Photos and details for your stones.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-stone-400 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Main image */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block mb-2">Main image <span className="text-bronze">*</span></label>
                        {mainImage ? (
                            <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden border border-white/10 group">
                                <img src={mainImage} alt="" className="w-full h-full object-cover" />
                                <button onClick={() => setMainImage(null)} className="absolute top-3 right-3 bg-black/70 hover:bg-red-500/80 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ) : (
                            <label className="block aspect-[3/2] rounded-xl border-2 border-dashed border-white/15 hover:border-bronze/40 cursor-pointer flex flex-col items-center justify-center text-stone-500 hover:text-bronze transition-all">
                                <Upload size={24} className="mb-2" />
                                <span className="text-xs font-bold uppercase tracking-widest">{uploading ? 'Uploading…' : 'Click to upload'}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleMain} disabled={uploading} />
                            </label>
                        )}
                    </div>

                    {/* Additional images */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block mb-2">Additional images <span className="text-stone-600 font-normal normal-case">(optional — up to 4)</span></label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {additional.map((url, i) => (
                                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                                    <img src={url} className="w-full h-full object-cover" alt="" />
                                    <button onClick={() => setAdditional(additional.filter((_, j) => j !== i))}
                                        className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-500/80 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            ))}
                            {additional.length < 4 && (
                                <label className="aspect-square rounded-lg border border-dashed border-white/15 hover:border-bronze/40 cursor-pointer flex items-center justify-center text-stone-500 hover:text-bronze transition-all">
                                    <Plus size={20} />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAdditional} disabled={uploading} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Text fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Stone name *" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Calacatta Borghini" />
                        <SelectField label="Stone type" value={form.stone_type} onChange={v => setForm({ ...form, stone_type: v })} options={STONE_TYPES} />
                        <Field label="Origin" value={form.origin} onChange={v => setForm({ ...form, origin: v })} placeholder="e.g. Carrara, Italy" />
                        <Field label="Price / sqft (₹)" type="number" value={form.price_per_sqft} onChange={v => setForm({ ...form, price_per_sqft: v })} placeholder="e.g. 850" />
                        <Field label="Lot size (sqft available)" type="number" value={form.lot_size_sqft} onChange={v => setForm({ ...form, lot_size_sqft: v })} placeholder="e.g. 4200" />
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Slab L" type="number" value={form.slab_length} onChange={v => setForm({ ...form, slab_length: v })} placeholder="cm" />
                            <Field label="Slab W" type="number" value={form.slab_width} onChange={v => setForm({ ...form, slab_width: v })} placeholder="cm" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block mb-2">Notes</label>
                        <textarea
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            rows={3}
                            placeholder="Anything Stonevo should know about this stone…"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-bronze focus:outline-none resize-none"
                        />
                    </div>

                    {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-lg">{error}</div>}
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-stone-950/40 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-white">Cancel</button>
                    <button onClick={save} disabled={saving || uploading} className="px-6 py-3 bg-bronze text-stone-950 text-xs font-bold uppercase tracking-widest rounded-full hover:bg-white transition-colors disabled:opacity-50">
                        {saving ? 'Saving…' : existing ? 'Save changes' : 'Add stone'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Field = ({ label, value, onChange, placeholder, type = 'text' }) => (
    <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block mb-2">{label}</label>
        <input
            type={type} value={value} placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:border-bronze focus:outline-none"
        />
    </div>
);
const SelectField = ({ label, value, onChange, options }) => (
    <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block mb-2">{label}</label>
        <select
            value={value} onChange={e => onChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-bronze focus:outline-none"
        >
            <option value="">— Select —</option>
            {options.map(o => <option key={o} value={o} className="bg-stone-900">{o}</option>)}
        </select>
    </div>
);

// ── Stone card ───────────────────────────────────────────────────────────
const StoneCard = ({ stone, onEdit, onDelete }) => (
    <div className="bg-stone-900 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
        <div className="aspect-[3/2] relative overflow-hidden bg-stone-950">
            {stone.image_url ? <img src={stone.image_url} alt={stone.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-700"><ImageIcon size={32} /></div>}
        </div>
        <div className="p-5 space-y-3 flex-1 flex flex-col">
            <div>
                <h4 className="font-serif text-lg text-white">{stone.name}</h4>
                {stone.stone_type && <p className="text-[10px] uppercase tracking-widest text-bronze mt-0.5">{stone.stone_type}{stone.origin ? ` · ${stone.origin}` : ''}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
                {stone.price_per_sqft != null && <div><p className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">Price/sqft</p><p className="text-white font-serif">₹ {stone.price_per_sqft}</p></div>}
                {stone.lot_size_sqft != null && <div><p className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">Lot size</p><p className="text-white font-serif">{stone.lot_size_sqft} sqft</p></div>}
                {(stone.slab_length || stone.slab_width) && <div className="col-span-2"><p className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">Slab</p><p className="text-white font-serif">{stone.slab_length || '—'} × {stone.slab_width || '—'} cm</p></div>}
            </div>
            <div className="flex items-center gap-2 pt-3 mt-auto border-t border-white/5">
                <button onClick={() => onEdit(stone)} className="flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-bronze border border-white/10 hover:border-bronze/40 rounded-lg transition-colors">
                    <Edit3 size={12} /> Edit
                </button>
                <button onClick={() => onDelete(stone)} className="px-3 py-2 text-stone-500 hover:text-red-400 border border-white/10 hover:border-red-500/40 rounded-lg transition-colors">
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    </div>
);

// ── Dashboard ────────────────────────────────────────────────────────────
const VendorDashboard = ({ vendor, onLogout }) => {
    const [stones, setStones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);

    const fetchStones = async () => {
        setLoading(true);
        const { data } = await supabase.from('vendor_stones').select('*').eq('vendor_id', vendor.id).order('created_at', { ascending: false });
        setStones(data || []);
        setLoading(false);
    };
    useEffect(() => { fetchStones(); }, [vendor.id]);

    const handleDelete = async (stone) => {
        if (!confirm(`Delete "${stone.name}"? This cannot be undone.`)) return;
        await supabase.from('vendor_stones').delete().eq('id', stone.id);
        fetchStones();
    };

    return (
        <div className="min-h-screen bg-stone-950 text-stone-200">
            {/* Header */}
            <header className="border-b border-white/5 bg-stone-950/95 backdrop-blur-md sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link to="/" className="font-serif tracking-[0.2em] text-white">STONEVO</Link>
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-bronze border border-bronze/30 px-3 py-1 rounded-full">Vendor Portal</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-sm text-white font-serif italic">{vendor.full_name || 'Vendor'}</p>
                            <p className="text-[10px] text-stone-500 font-mono">+91 {vendor.phone}</p>
                        </div>
                        <button onClick={onLogout} className="p-2 rounded-full border border-white/10 hover:border-red-400/40 hover:text-red-400 text-stone-400 transition-colors" title="Log out"><LogOut size={14} /></button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10">
                {/* Hero row */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-bronze mb-2">Your Stones</p>
                        <h1 className="font-serif text-4xl text-white italic">Photos & details.</h1>
                        <p className="text-stone-500 text-sm mt-3 max-w-xl">Add your stones with photos and details. Stonevo will reach out about anything they're interested in.</p>
                    </div>
                    <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-6 py-3 bg-bronze text-stone-950 text-xs font-bold uppercase tracking-widest rounded-full hover:bg-white transition-colors shadow-lg shadow-bronze/20">
                        <Plus size={14} /> Add stone
                    </button>
                </div>

                {/* Grid */}
                {loading ? (
                    <p className="text-stone-500 text-sm">Loading…</p>
                ) : stones.length === 0 ? (
                    <div className="border-2 border-dashed border-white/10 rounded-2xl py-20 text-center">
                        <ImageIcon size={32} className="mx-auto text-stone-700 mb-3" />
                        <p className="text-stone-500 text-sm mb-4">No stones added yet.</p>
                        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-5 py-2.5 border border-bronze/30 hover:bg-bronze hover:text-stone-950 text-bronze text-[10px] font-bold uppercase tracking-widest rounded-full transition-colors">
                            <Plus size={12} /> Add your first stone
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {stones.map(s => (
                            <StoneCard key={s.id} stone={s} onEdit={(st) => { setEditing(st); setShowForm(true); }} onDelete={handleDelete} />
                        ))}
                    </div>
                )}
            </main>

            {showForm && <StoneForm vendorId={vendor.id} existing={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={fetchStones} />}
        </div>
    );
};

// ── Phone OTP gate ───────────────────────────────────────────────────────
const VendorGate = ({ onAuthorized }) => {
    const [step, setStep] = useState('phone'); // phone | otp | unauthorized
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [unauthorizedPhone, setUnauthorizedPhone] = useState('');

    const sendOtp = async (e) => {
        e.preventDefault();
        const clean = phone.replace(/\D/g, '').slice(-10);
        if (clean.length < 10) { setError('Enter a valid 10-digit number'); return; }
        setSubmitting(true); setError(null);
        try {
            if (DEV_NUMBERS.includes(clean)) { setStep('otp'); return; }
            const { data, error: fnErr } = await supabase.functions.invoke('send-otp', { body: { phone: clean } });
            if (fnErr) throw new Error(fnErr.message);
            if (data?.error) throw new Error(data.error);
            setStep('otp');
        } catch (err) { setError(err.message); }
        finally { setSubmitting(false); }
    };

    const [unauthorizedDetail, setUnauthorizedDetail] = useState('');

    const verify = async (e) => {
        e.preventDefault();
        const clean = phone.replace(/\D/g, '').slice(-10);
        setSubmitting(true); setError(null);
        try {
            const { data, error: fnErr } = await supabase.functions.invoke('verify-otp', { body: { phone: clean, otp: otp.trim() } });
            if (fnErr) throw new Error(fnErr.message);
            if (data?.error) throw new Error(data.error);

            // Look up the vendor row. Use .limit(1) ordered by updated_at desc to
            // be robust against duplicate rows for the same phone.
            const { data: vendorRows, error: vendorErr } = await supabase
                .from('leads')
                .select('id, phone, full_name, role, status')
                .eq('phone', clean)
                .eq('role', 'vendor')
                .order('updated_at', { ascending: false, nullsFirst: false })
                .limit(1);
            console.log('[Vendor login] vendor query', { clean, vendorRows, vendorErr });
            if (vendorErr) throw vendorErr;

            const vendor = vendorRows?.[0];
            if (!vendor) {
                // Helpful diagnostic: maybe a row exists but with a different role
                const { data: anyRows } = await supabase
                    .from('leads')
                    .select('id, role, status')
                    .eq('phone', clean)
                    .limit(5);
                console.log('[Vendor login] all leads rows for this phone', anyRows);
                if (anyRows?.length) {
                    const roles = anyRows.map(r => r.role || '(no role)').join(', ');
                    setUnauthorizedDetail(`We found an account for +91 ${clean} but its role is "${roles}" — the admin needs to set it to "vendor".`);
                } else {
                    setUnauthorizedDetail(`No account exists for +91 ${clean}. Ask Stonevo to invite this number first.`);
                }
                setUnauthorizedPhone(clean);
                setStep('unauthorized');
                return;
            }
            localStorage.setItem('stonevo_vendor_id', vendor.id);
            // Ping Telegram (fire-and-forget, never blocks login)
            try {
                notifyLogin({
                    phone: vendor.phone,
                    name: vendor.full_name,
                    role: 'vendor',
                    status: vendor.status,
                    leadId: vendor.id
                });
            } catch { /* silent */ }
            onAuthorized(vendor);
        } catch (err) { setError(err.message); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(163,125,75,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(163,125,75,0.15) 0%, transparent 50%)' }} />

            <div className="relative w-full max-w-md bg-stone-900/80 border border-white/10 rounded-3xl p-10 backdrop-blur-xl shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-bronze/10 border border-bronze/30 rounded-full flex items-center justify-center mx-auto mb-5">
                        <ShieldCheck className="text-bronze" size={26} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-bronze mb-2">Vendor Portal</p>
                    <h1 className="text-3xl font-serif text-white italic">Sign in to upload stones</h1>
                </div>

                {step === 'phone' && (
                    <form onSubmit={sendOtp} className="space-y-5">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2 mb-2"><Phone size={11} className="text-bronze" /> Mobile number</label>
                            <input
                                type="tel" required value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="10-digit mobile"
                                className="w-full bg-white/5 border-b border-white/10 py-3 text-xl text-white focus:border-bronze focus:outline-none placeholder:text-stone-700"
                            />
                        </div>
                        {error && <p className="text-red-400 text-xs italic bg-red-500/10 p-3 rounded">{error}</p>}
                        <button type="submit" disabled={submitting} className="w-full py-4 bg-bronze text-stone-950 font-bold text-xs uppercase tracking-[0.2em] rounded-full hover:bg-white transition-colors disabled:opacity-50">
                            {submitting ? 'Sending…' : 'Send verification code'}
                        </button>
                        <p className="text-[10px] text-stone-600 text-center">Vendor accounts are invite-only. Contact Stonevo if you need access.</p>
                    </form>
                )}

                {step === 'otp' && (
                    <form onSubmit={verify} className="space-y-5">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2 block">Verification code</label>
                            <input
                                type="text" required maxLength={6} value={otp}
                                onChange={e => setOtp(e.target.value)}
                                placeholder="······"
                                className="w-full bg-white/5 border-b border-white/10 py-3 text-3xl tracking-[0.5em] text-center text-white focus:border-bronze focus:outline-none placeholder:text-stone-700"
                            />
                            <p className="text-[10px] text-stone-500 mt-2">Code sent to <span className="font-mono text-stone-300">+91 {phone.replace(/\D/g, '').slice(-10)}</span></p>
                        </div>
                        {error && <p className="text-red-400 text-xs italic bg-red-500/10 p-3 rounded">{error}</p>}
                        <button type="submit" disabled={submitting} className="w-full py-4 bg-bronze text-stone-950 font-bold text-xs uppercase tracking-[0.2em] rounded-full hover:bg-white transition-colors disabled:opacity-50">
                            {submitting ? 'Verifying…' : 'Verify & enter'}
                        </button>
                        <button type="button" onClick={() => { setStep('phone'); setOtp(''); setError(null); }} className="w-full text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-bronze">Change number</button>
                    </form>
                )}

                {step === 'unauthorized' && (
                    <div className="text-center space-y-5">
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm text-left">
                            <p className="font-bold mb-1">Couldn't sign you in</p>
                            <p className="text-xs leading-relaxed">{unauthorizedDetail || `+91 ${unauthorizedPhone} isn't authorized as a vendor yet.`}</p>
                        </div>
                        <button onClick={() => { setStep('phone'); setOtp(''); setError(null); setUnauthorizedPhone(''); setUnauthorizedDetail(''); }} className="w-full py-3 border border-white/10 hover:border-bronze/40 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-bronze rounded-full">Try a different number</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Top-level component ──────────────────────────────────────────────────
const VendorPortal = () => {
    const [vendor, setVendor] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const stored = localStorage.getItem('stonevo_vendor_id');
            if (!stored) { setLoading(false); return; }
            const { data } = await supabase.from('leads').select('id, phone, full_name, role, status').eq('id', stored).eq('role', 'vendor').maybeSingle();
            if (data) setVendor(data); else localStorage.removeItem('stonevo_vendor_id');
            setLoading(false);
        })();
    }, []);

    const logout = () => { localStorage.removeItem('stonevo_vendor_id'); setVendor(null); };

    if (loading) return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="w-10 h-10 border-2 border-bronze/30 border-t-bronze rounded-full animate-spin" /></div>;
    if (!vendor) return <VendorGate onAuthorized={setVendor} />;
    return <VendorDashboard vendor={vendor} onLogout={logout} />;
};

export default VendorPortal;
