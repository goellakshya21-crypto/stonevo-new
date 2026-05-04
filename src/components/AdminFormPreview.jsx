import React, { useState } from 'react';
import { User, Mail, Building, Globe, Phone, Eye, Compass, Hammer } from 'lucide-react';

// Standalone previews of the onboarding forms — read-only, no submission

const ArchitectForm = () => {
    const [form, setForm] = useState({
        full_name: '', email: '', company_name: '', gst_number: '', website: ''
    });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div className="bg-stone-900 rounded-2xl border border-white/10 p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-bronze/10 rounded-full flex items-center justify-center">
                    <Compass size={20} className="text-bronze" />
                </div>
                <div>
                    <h3 className="text-white font-serif text-lg italic">Architect Registration</h3>
                    <p className="text-stone-500 text-[10px] uppercase tracking-widest">What a new architect sees after OTP</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2">
                        <User size={12} className="text-bronze" /> Full Name
                        <span className="text-bronze ml-1">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Required"
                        value={form.full_name}
                        onChange={e => set('full_name', e.target.value)}
                        className="w-full bg-white/5 border-b border-white/10 py-2 text-luxury-cream focus:outline-none focus:border-bronze transition-colors placeholder:text-stone-700"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2">
                        <Mail size={12} className="text-bronze" /> Email
                        <span className="text-stone-600 normal-case font-normal ml-1">(optional)</span>
                    </label>
                    <input
                        type="email"
                        placeholder="Optional"
                        value={form.email}
                        onChange={e => set('email', e.target.value)}
                        className="w-full bg-white/5 border-b border-white/10 py-2 text-luxury-cream focus:outline-none focus:border-bronze transition-colors placeholder:text-stone-700"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2">
                        <Building size={12} className="text-bronze" /> Firm Name
                        <span className="text-stone-600 normal-case font-normal ml-1">(optional)</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Optional"
                        value={form.company_name}
                        onChange={e => set('company_name', e.target.value)}
                        className="w-full bg-white/5 border-b border-white/10 py-2 text-luxury-cream focus:outline-none focus:border-bronze transition-colors placeholder:text-stone-700"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest">
                        GST Number
                        <span className="text-stone-600 normal-case font-normal ml-1">(optional)</span>
                    </label>
                    <input
                        type="text"
                        placeholder="22AAAAA0000A1Z5"
                        value={form.gst_number}
                        onChange={e => set('gst_number', e.target.value)}
                        className="w-full bg-white/5 border-b border-white/10 py-2 text-luxury-cream focus:outline-none focus:border-bronze transition-colors placeholder:text-stone-700"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2">
                    <Globe size={12} className="text-bronze" /> Website
                    <span className="text-stone-600 normal-case font-normal ml-1">(optional)</span>
                </label>
                <input
                    type="url"
                    placeholder="https://"
                    value={form.website}
                    onChange={e => set('website', e.target.value)}
                    className="w-full bg-white/5 border-b border-white/10 py-2 text-luxury-cream focus:outline-none focus:border-bronze transition-colors placeholder:text-stone-700"
                />
            </div>

            <button
                type="button"
                onClick={() => alert('Preview only — no submission in admin panel.')}
                className="w-full py-4 bg-bronze text-white font-serif tracking-[0.2em] uppercase text-sm hover:bg-white hover:text-stone-950 transition-all"
            >
                Complete Registration
            </button>

            <p className="text-center text-stone-600 text-[10px] uppercase tracking-widest">
                — Preview only, not submitted —
            </p>
        </div>
    );
};

const ClientRequestForm = () => {
    const [form, setForm] = useState({ full_name: '', architect_phone: '' });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div className="bg-stone-900 rounded-2xl border border-white/10 p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-stone-700 rounded-full flex items-center justify-center">
                    <Hammer size={20} className="text-stone-300" />
                </div>
                <div>
                    <h3 className="text-white font-serif text-lg italic">Client Access Request</h3>
                    <p className="text-stone-500 text-[10px] uppercase tracking-widest">What a new client sees after OTP</p>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2">
                    <User size={12} className="text-bronze" /> Your Name
                    <span className="text-bronze ml-1">*</span>
                </label>
                <input
                    type="text"
                    placeholder="Required"
                    value={form.full_name}
                    onChange={e => set('full_name', e.target.value)}
                    className="w-full bg-white/5 border-b border-white/10 py-3 text-luxury-cream focus:outline-none focus:border-bronze transition-colors placeholder:text-stone-700"
                />
            </div>

            <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2">
                    <Phone size={12} className="text-bronze" /> Architect's Phone Number
                    <span className="text-bronze ml-1">*</span>
                </label>
                <input
                    type="tel"
                    placeholder="Enter your architect's mobile number"
                    value={form.architect_phone}
                    onChange={e => set('architect_phone', e.target.value)}
                    className="w-full bg-white/5 border-b border-white/10 py-3 text-luxury-cream focus:outline-none focus:border-bronze transition-colors placeholder:text-stone-700"
                />
            </div>

            <button
                type="button"
                onClick={() => alert('Preview only — no submission in admin panel.')}
                className="w-full py-4 bg-bronze text-white font-serif tracking-[0.2em] uppercase text-sm hover:bg-white hover:text-stone-950 transition-all"
            >
                Send Access Request
            </button>

            <p className="text-center text-stone-600 text-[10px] uppercase tracking-widest">
                — Preview only, not submitted —
            </p>
        </div>
    );
};

const AdminFormPreview = () => {
    const [active, setActive] = useState('architect');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <div className="flex items-center gap-3 mb-1">
                    <Eye className="text-bronze" size={22} />
                    <h2 className="text-xl font-serif text-stone-800">Onboarding Form Preview</h2>
                </div>
                <p className="text-stone-500 text-sm">
                    Exactly what new users see after OTP verification. Fields are interactive but nothing is submitted.
                </p>
            </div>

            {/* Toggle */}
            <div className="flex gap-3">
                <button
                    onClick={() => setActive('architect')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${active === 'architect' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'}`}
                >
                    <Compass size={14} /> Architect Form
                </button>
                <button
                    onClick={() => setActive('client')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${active === 'client' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'}`}
                >
                    <Hammer size={14} /> Client Form
                </button>
            </div>

            {/* Form Preview */}
            <div className="max-w-2xl">
                {active === 'architect' ? <ArchitectForm /> : <ClientRequestForm />}
            </div>
        </div>
    );
};

export default AdminFormPreview;
