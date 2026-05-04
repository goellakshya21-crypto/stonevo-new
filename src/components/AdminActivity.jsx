import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Activity, RefreshCw, Clock, User, Shield } from 'lucide-react';

const ROLE_STYLES = {
    architect: 'bg-amber-100 text-amber-800 border border-amber-200',
    builder:   'bg-blue-100 text-blue-700 border border-blue-200',
    client:    'bg-purple-100 text-purple-700 border border-purple-200',
    admin:     'bg-red-100 text-red-700 border border-red-200',
};

const fmt = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

const AdminActivity = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tableExists, setTableExists] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('login_events')
                .select('*')
                .order('logged_in_at', { ascending: false })
                .limit(200);

            if (error) {
                if (error.code === '42P01') {
                    setTableExists(false);
                } else {
                    throw error;
                }
            } else {
                setTableExists(true);
                setEvents(data || []);
            }
        } catch (err) {
            console.error('Error fetching login events:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEvents(); }, []);

    const filtered = filter === 'all' ? events : events.filter(e => e.role === filter);

    if (!tableExists) {
        return (
            <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-6">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                    <Activity className="text-amber-500" size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-serif text-stone-800 mb-2">Login Events Table Not Found</h3>
                    <p className="text-stone-500 text-sm mb-6">Run this SQL in your Supabase dashboard to enable login tracking:</p>
                </div>
                <pre className="bg-stone-900 text-green-400 text-xs text-left rounded-xl p-6 overflow-x-auto leading-relaxed">
{`CREATE TABLE IF NOT EXISTS login_events (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number text NOT NULL,
  user_name    text,
  role         text,
  logged_in_at timestamptz DEFAULT now()
);
ALTER TABLE login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_insert_login_events"
  ON login_events FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "allow_read_login_events"
  ON login_events FOR SELECT TO public USING (true);`}
                </pre>
                <p className="text-stone-400 text-xs">After running the SQL, new logins will appear here automatically.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-serif text-stone-800 flex items-center gap-2">
                            <Activity className="text-bronze" size={22} />
                            Login Activity
                        </h2>
                        <p className="text-stone-500 text-sm mt-1">
                            {events.length} total events recorded
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Role filter pills */}
                        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs font-bold uppercase tracking-widest">
                            {['all', 'architect', 'builder', 'client'].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setFilter(r)}
                                    className={`px-3 py-1.5 rounded-md transition-all ${filter === r ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={fetchEvents}
                            className="p-2 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-stone-500"
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Events Table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-stone-50 text-stone-600 text-[10px] uppercase font-bold tracking-widest border-b border-stone-200">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Phone</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">
                                <span className="flex items-center gap-1"><Clock size={11} /> Logged In At</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {loading ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-stone-400 text-sm">
                                    Loading activity...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Shield className="text-stone-300" size={32} />
                                        <p className="text-stone-400 text-sm">No login events yet.</p>
                                        <p className="text-stone-300 text-xs">Events will appear here after users log in.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((ev) => (
                                <tr key={ev.id} className="hover:bg-stone-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                                                <User size={13} className="text-stone-500" />
                                            </div>
                                            <span className="font-medium text-stone-800">
                                                {ev.user_name || 'Unknown'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-stone-500 text-xs">
                                        {ev.phone_number || '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${ROLE_STYLES[ev.role] || 'bg-stone-100 text-stone-600'}`}>
                                            {ev.role || 'unknown'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-stone-500 text-xs">
                                        {fmt(ev.logged_in_at)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminActivity;
