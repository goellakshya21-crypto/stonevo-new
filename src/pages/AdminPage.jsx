import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminUpload from '../components/AdminUpload';
import AdminWhitelist from '../components/AdminWhitelist';
import AdminChatRooms from '../components/AdminChatRooms';
import AdminActivity from '../components/AdminActivity';
import AdminClientLinks from '../components/AdminClientLinks';
import AdminFormPreview from '../components/AdminFormPreview';
import AdminDossier from '../components/AdminDossier';
import AdminVendors from '../components/AdminVendors';
import AdminPrivilegeCircle from '../components/AdminPrivilegeCircle';
import { supabase } from '../lib/supabaseClient';

// ── Dev Tools panel ───────────────────────────────────────────────────────────
const DEV_NUMBERS = ['7678320944', '7042353166'];

function DevTools() {
    const [phone, setPhone] = useState('');
    const [status, setStatus] = useState(null); // null | 'loading' | { ok, msg }

    const resetLead = async (numToReset) => {
        const clean = (numToReset || phone).replace(/\D/g, '').slice(-10);
        if (clean.length < 10) { setStatus({ ok: false, msg: 'Enter a valid 10-digit number' }); return; }
        setStatus('loading');
        try {
            // Delete from leads table so they become a brand-new user
            const { error } = await supabase.from('leads').delete().eq('phone', clean);
            if (error) throw error;
            // Also clear from client_whitelist in case they were whitelisted
            await supabase.from('client_whitelist').delete().eq('phone_number', clean);
            setStatus({ ok: true, msg: `✓ ${clean} reset — they are now a new user` });
        } catch (err) {
            setStatus({ ok: false, msg: err.message });
        }
    };

    return (
        <div className="space-y-8 max-w-xl">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-serif text-stone-800 flex items-center gap-2">
                        🧪 Reset a Number to New User
                    </h3>
                    <p className="text-stone-500 text-sm mt-1">
                        Deletes the leads record so the number goes through full onboarding again. Use with the <span className="font-mono bg-stone-100 px-1 rounded">000000</span> OTP bypass.
                    </p>
                </div>

                {/* Quick-reset buttons for dev numbers */}
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Quick Reset</p>
                    <div className="flex gap-3 flex-wrap">
                        {DEV_NUMBERS.map(n => (
                            <button
                                key={n}
                                onClick={() => resetLead(n)}
                                className="px-4 py-2 bg-stone-100 hover:bg-red-50 hover:border-red-200 border border-stone-200 rounded-lg text-sm font-mono text-stone-700 hover:text-red-600 transition-all"
                            >
                                Reset {n}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom number */}
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Or enter any number</p>
                    <div className="flex gap-3">
                        <input
                            type="tel"
                            placeholder="10-digit phone number"
                            value={phone}
                            onChange={e => { setPhone(e.target.value); setStatus(null); }}
                            className="flex-1 border border-stone-200 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-red-400"
                        />
                        <button
                            onClick={() => resetLead()}
                            className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold uppercase tracking-widest transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {status === 'loading' && <p className="text-stone-400 text-sm">Resetting…</p>}
                {status && status !== 'loading' && (
                    <p className={`text-sm font-medium ${status.ok ? 'text-green-600' : 'text-red-500'}`}>
                        {status.msg}
                    </p>
                )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800 space-y-2">
                <p className="font-bold">Testing flow reminder:</p>
                <ol className="list-decimal list-inside space-y-1 text-amber-700">
                    <li>Click <strong>Quick Reset</strong> on the number you want to test with</li>
                    <li>Go to <strong>ston.co.in</strong>, enter that number</li>
                    <li>Type <strong>000000</strong> as the OTP — no SMS sent</li>
                    <li>You'll see the full new architect / new client onboarding flow</li>
                    <li>When done testing, reset again to start fresh</li>
                </ol>
            </div>
        </div>
    );
}

function AdminPage() {
    console.log('AdminPage rendering...');
    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'whitelist'

    return (
        <div className="min-h-screen bg-stone-100 font-sans selection:bg-stone-200 relative">
            <div className="absolute top-0 left-0 bg-red-500 text-white text-[8px] z-[999] px-1 pointer-events-none">ADMIN_LOADED_BOOTSTRAP</div>
            {/* Admin Header */}
            <header className="bg-stone-900 text-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-white rounded-none transform rotate-45"></div>
                        <h1 className="text-lg font-serif font-bold tracking-widest text-white uppercase italic">Ston Intelligence</h1>
                        <span className="hidden md:inline px-2 py-0.5 bg-stone-700 text-[10px] rounded text-stone-300 font-medium tracking-widest uppercase ml-2">Internal Portal</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-white transition-colors">View Public Site</Link>
                    </div>
                </div>
            </header>

            {/* Management Content */}
            <main className="max-w-6xl mx-auto px-4 py-12">
                <div className="mb-8 border-l-4 border-stone-900 pl-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-serif font-bold text-stone-800">Operational Management</h2>
                        <p className="text-stone-500 text-sm mt-1">High-accuracy stone analysis and inventory ingestion pipeline.</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-wrap items-center gap-1 bg-stone-200/50 p-1 rounded-lg">
                        {[
                            { id: 'inventory', label: 'Stone Inventory' },
                            { id: 'whitelist', label: 'Whitelist Registry' },
                            { id: 'chat',      label: 'Project Rooms' },
                            { id: 'activity',  label: 'Login Activity' },
                            { id: 'links',     label: 'Client Links' },
                            { id: 'preview',   label: 'Form Preview' },
                            { id: 'dossier',   label: '✦ Stone Dossier' },
                            { id: 'vendors',   label: '🧱 Vendors' },
                            { id: 'circle',    label: '◆ Privilege Circle' },
                            { id: 'devtools',  label: '🧪 Dev Tools' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-md ${activeTab === tab.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'inventory' ? (
                    <div className="border-2 border-dashed border-stone-200 p-4 min-h-[400px]">
                        <AdminUpload onCancel={() => { }} />
                    </div>
                ) : activeTab === 'whitelist' ? (
                    <div className="border-2 border-dashed border-bronze/20 p-4 min-h-[400px]">
                        <AdminWhitelist />
                    </div>
                ) : activeTab === 'chat' ? (
                    <AdminChatRooms />
                ) : activeTab === 'activity' ? (
                    <AdminActivity />
                ) : activeTab === 'links' ? (
                    <AdminClientLinks />
                ) : activeTab === 'preview' ? (
                    <AdminFormPreview />
                ) : activeTab === 'dossier' ? (
                    <AdminDossier />
                ) : activeTab === 'vendors' ? (
                    <AdminVendors />
                ) : activeTab === 'circle' ? (
                    <AdminPrivilegeCircle />
                ) : (
                    <DevTools />
                )}
            </main>

            <footer className="py-8 bg-stone-200 text-stone-500 text-[10px] text-center uppercase tracking-[0.2em]">
                Ston Intelligence Group • Precise • Architectural • Intelligent
            </footer>
        </div>
    );
}

export default AdminPage;
