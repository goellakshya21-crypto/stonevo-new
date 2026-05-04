import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Users, RefreshCw, ChevronDown, ChevronRight, Phone, Link as LinkIcon } from 'lucide-react';

const fmt = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

const AdminClientLinks = () => {
    const [grouped, setGrouped] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all client_whitelist entries
            const { data: links, error: linksErr } = await supabase
                .from('client_whitelist')
                .select('*')
                .order('created_at', { ascending: false });

            if (linksErr) throw linksErr;

            // Fetch architect names from architect_whitelist
            const archPhones = [...new Set((links || []).map(l => l.architect_phone).filter(Boolean))];
            let archMap = {};
            if (archPhones.length > 0) {
                const { data: archs } = await supabase
                    .from('architect_whitelist')
                    .select('phone_number, full_name')
                    .in('phone_number', archPhones);
                (archs || []).forEach(a => { archMap[a.phone_number] = a.full_name; });
            }

            // Group by architect_phone
            const groups = {};
            (links || []).forEach(link => {
                const phone = link.architect_phone || 'unknown';
                if (!groups[phone]) {
                    groups[phone] = {
                        architect_phone: phone,
                        architect_name: archMap[phone] || null,
                        clients: []
                    };
                }
                groups[phone].clients.push(link);
            });

            const result = Object.values(groups).sort((a, b) =>
                (b.clients.length - a.clients.length)
            );
            setGrouped(result);

            // Auto-expand if few groups
            if (result.length <= 3) {
                const exp = {};
                result.forEach(g => { exp[g.architect_phone] = true; });
                setExpanded(exp);
            }
        } catch (err) {
            console.error('Error fetching client links:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const toggle = (phone) => setExpanded(prev => ({ ...prev, [phone]: !prev[phone] }));

    const filtered = grouped.filter(g => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            (g.architect_name || '').toLowerCase().includes(q) ||
            g.architect_phone.includes(q) ||
            g.clients.some(c =>
                (c.client_name || '').toLowerCase().includes(q) ||
                (c.phone_number || '').includes(q)
            )
        );
    });

    const totalClients = grouped.reduce((sum, g) => sum + g.clients.length, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-serif text-stone-800 flex items-center gap-2">
                            <LinkIcon className="text-bronze" size={22} />
                            Architect → Client Links
                        </h2>
                        <p className="text-stone-500 text-sm mt-1">
                            {grouped.length} architects · {totalClients} clients whitelisted
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="Search architect or client..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="border border-stone-200 rounded-lg px-4 py-2 text-sm text-stone-700 bg-stone-50 focus:outline-none focus:border-bronze w-64"
                        />
                        <button
                            onClick={fetchData}
                            className="p-2 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-stone-500"
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Groups */}
            {loading ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
                    Loading...
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                    <Users className="text-stone-300 mx-auto mb-3" size={36} />
                    <p className="text-stone-400 text-sm">No client links found.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(group => (
                        <div key={group.architect_phone} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                            {/* Architect Header */}
                            <button
                                onClick={() => toggle(group.architect_phone)}
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                                        <Users size={16} className="text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-stone-800">
                                            {group.architect_name || <span className="text-stone-400 italic">Unknown Architect</span>}
                                        </p>
                                        <p className="text-stone-400 text-xs font-mono flex items-center gap-1">
                                            <Phone size={10} /> {group.architect_phone}
                                        </p>
                                    </div>
                                    <span className="ml-2 px-2.5 py-0.5 bg-stone-100 text-stone-600 text-[10px] font-bold rounded-full uppercase tracking-widest">
                                        {group.clients.length} client{group.clients.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                {expanded[group.architect_phone]
                                    ? <ChevronDown size={16} className="text-stone-400 shrink-0" />
                                    : <ChevronRight size={16} className="text-stone-400 shrink-0" />
                                }
                            </button>

                            {/* Clients List */}
                            {expanded[group.architect_phone] && (
                                <div className="border-t border-stone-100">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-stone-50 text-[10px] uppercase font-bold tracking-widest text-stone-500">
                                            <tr>
                                                <th className="px-6 py-3">Client Name</th>
                                                <th className="px-6 py-3">Phone</th>
                                                <th className="px-6 py-3">Project Address</th>
                                                <th className="px-6 py-3">Whitelisted On</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-50">
                                            {group.clients.map(c => (
                                                <tr key={c.id} className="hover:bg-stone-50/50 transition-colors">
                                                    <td className="px-6 py-3 font-medium text-stone-800">
                                                        {c.client_name || <span className="text-stone-400 italic">Unnamed</span>}
                                                    </td>
                                                    <td className="px-6 py-3 font-mono text-stone-500 text-xs">
                                                        {c.phone_number || '—'}
                                                    </td>
                                                    <td className="px-6 py-3 text-stone-500 text-xs max-w-[200px]">
                                                        {c.project_address || <span className="text-stone-300">—</span>}
                                                    </td>
                                                    <td className="px-6 py-3 text-stone-400 text-xs">
                                                        {fmt(c.created_at)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminClientLinks;
