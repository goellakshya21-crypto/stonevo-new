import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserCheck, UserX, ExternalLink, Calendar, Building, Globe, Mail, Phone, Search, Eye, Activity, MessageSquare, Search as SearchIcon, Clock } from 'lucide-react';

const AdminLeads = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
    const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'architect', 'builder'
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingActivity, setViewingActivity] = useState(null); // ID of lead being viewed
    const [activities, setActivities] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeads(data);
        } catch (err) {
            console.error('Failed to fetch leads:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivity = async (leadId) => {
        setActivityLoading(true);
        setViewingActivity(leadId);
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setActivities(data);
        } catch (err) {
            console.error('Failed to fetch activity:', err);
        } finally {
            setActivityLoading(false);
        }
    };

    const handleStatusUpdate = async (id, newStatus, role = null) => {
        const updateData = { status: newStatus };
        if (role) updateData.role = role;

        try {
            const { error } = await supabase
                .from('leads')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            // Sync to professional whitelist if approved
            if (newStatus === 'approved') {
                const lead = leads.find(l => l.id === id);
                if (lead) {
                    await supabase
                        .from('architect_whitelist')
                        .upsert({
                            phone_number: lead.phone,
                            full_name: lead.full_name,
                            role: role || lead.role || 'architect'
                        }, { onConflict: 'phone_number' });
                }
            }

            setLeads(leads.map(lead =>
                lead.id === id ? { ...lead, ...updateData } : lead
            ));
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Failed to update status: ' + err.message);
        }
    };

    const filteredLeads = leads.filter(lead => {
        const matchesFilter = filter === 'all' || lead.status === filter;
        const matchesRole = roleFilter === 'all' || lead.role === roleFilter;
        const matchesSearch =
            (lead.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lead.email?.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesFilter && matchesRole && matchesSearch;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200';
        }
    };

    const formatActivityDetails = (actionType, details) => {
        if (actionType === 'search') {
            const f = details.filters || details; // Handle both nested and flat structures
            const summary = [];

            if (f.name) summary.push(`Name: "${f.name}"`);
            if (f.type?.length) summary.push(`Type: ${f.type.join(', ')}`);
            if (f.color?.length) summary.push(`Color: ${f.color.join(', ')}`);
            if (f.priceRange?.length) summary.push(`Price: ${f.priceRange.join(', ')}`);
            if (f.pattern?.length) summary.push(`Pattern: ${f.pattern.join(', ')}`);
            if (f.brightness?.length) summary.push(`Brightness: ${f.brightness.join(', ')}`);

            return summary.join(' | ') || 'Default collection view';
        }
        if (actionType === 'ai_query') {
            return `"${details.query}"`;
        }
        return JSON.stringify(details);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div>
                <p className="text-stone-400 text-[10px] uppercase font-bold tracking-widest">Retrieving Architect Leads...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-lg">
                            {['all', 'pending', 'approved', 'rejected'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${filter === f
                                        ? 'bg-white text-stone-900 shadow-sm'
                                        : 'text-stone-500 hover:text-stone-700'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Role Filter */}
                        <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-lg border border-bronze/10">
                            {['all', 'architect', 'builder'].map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setRoleFilter(r)}
                                    className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${roleFilter === r
                                        ? 'bg-stone-900 text-white shadow-sm'
                                        : 'text-stone-500 hover:text-stone-700'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative w-full md:w-72">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search Leads..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {filteredLeads.length === 0 ? (
                    <div className="text-center py-12 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                        <p className="text-stone-400 text-sm">No leads match your criteria.</p>
                    </div>
                ) : (
                    filteredLeads.map((lead) => (
                        <div key={lead.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-stone-300 transition-all shadow-sm">
                            <div className="flex flex-col md:flex-row">
                                {/* Identity Section */}
                                <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-stone-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center text-white font-serif text-lg">
                                            {lead.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <h3 className="font-serif font-bold text-stone-900 text-lg leading-tight">{lead.full_name}</h3>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusColor(lead.status)}`}>
                                                    {lead.status}
                                                </span>
                                                {lead.role && (
                                                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border border-stone-200 bg-stone-50 text-stone-600">
                                                        {lead.role}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-xs text-stone-600">
                                        <p className="flex items-center gap-2"><Mail size={12} className="text-stone-400" /> {lead.email}</p>
                                        <p className="flex items-center gap-2"><Phone size={12} className="text-stone-400" /> {lead.phone}</p>
                                    </div>
                                </div>

                                {/* Firm Details Section */}
                                <div className="p-6 md:flex-1 bg-stone-50/30">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-stone-400 tracking-widest">Firm Name</label>
                                            <p className="text-sm font-medium text-stone-800 flex items-center gap-2">
                                                <Building size={14} className="text-stone-400" /> {lead.company_name}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-stone-400 tracking-widest">Professional Website</label>
                                            <a
                                                href={lead.website?.startsWith('http') ? lead.website : `https://${lead.website}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-2 transition-colors"
                                            >
                                                <Globe size={14} className="text-stone-400" />
                                                {lead.website?.replace(/^https?:\/\//, '')}
                                                <ExternalLink size={10} />
                                            </a>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-stone-400 tracking-widest">Registered Date</label>
                                            <p className="text-sm font-medium text-stone-800 flex items-center gap-2">
                                                <Calendar size={14} className="text-stone-400" />
                                                {new Date(lead.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-stone-400 tracking-widest">Interaction Timeline</label>
                                            <button
                                                onClick={() => viewingActivity === lead.id ? setViewingActivity(null) : fetchActivity(lead.id)}
                                                className="flex items-center gap-2 text-[10px] font-bold uppercase text-stone-600 hover:text-stone-900 transition-colors"
                                            >
                                                <Activity size={12} /> {viewingActivity === lead.id ? 'Hide Activity' : 'View Movements'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Section */}
                                <div className="p-6 md:w-56 bg-white flex flex-row md:flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-stone-100">
                                    {lead.status === 'pending' || lead.status === 'rejected' ? (
                                        <>
                                            <button
                                                onClick={() => handleStatusUpdate(lead.id, 'approved', 'architect')}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all outline-none"
                                            >
                                                <UserCheck size={14} /> Architect
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate(lead.id, 'approved', 'builder')}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-black active:scale-95 transition-all outline-none"
                                            >
                                                <UserCheck size={14} /> Builder
                                            </button>
                                        </>
                                    ) : null}

                                    {lead.status === 'pending' || lead.status === 'approved' ? (
                                        <button
                                            onClick={() => handleStatusUpdate(lead.id, 'rejected')}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-stone-100 text-stone-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-600 active:scale-95 transition-all outline-none"
                                        >
                                            <UserX size={14} /> Reject
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            {/* Activity Section Expandable */}
                            {viewingActivity === lead.id && (
                                <div className="border-t border-stone-100 bg-stone-50/50 p-6 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Activity size={14} className="text-stone-500" />
                                        <h4 className="text-[10px] uppercase font-bold tracking-widest text-stone-500">Movement Timeline</h4>
                                    </div>

                                    {activityLoading ? (
                                        <div className="flex items-center gap-2 py-4">
                                            <div className="w-3 h-3 border border-stone-300 border-t-stone-800 rounded-full animate-spin"></div>
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Scanning logs...</p>
                                        </div>
                                    ) : activities.length === 0 ? (
                                        <p className="text-xs text-stone-400 italic py-2">No activity recorded yet.</p>
                                    ) : (
                                        <div className="space-y-3 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-stone-200">
                                            {activities.map((act) => (
                                                <div key={act.id} className="pl-6 relative">
                                                    <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${act.action_type === 'ai_query' ? 'bg-amber-400' : 'bg-stone-800'
                                                        }`}>
                                                        {act.action_type === 'ai_query' ? <MessageSquare size={8} className="text-white" /> : <SearchIcon size={8} className="text-white" />}
                                                    </div>
                                                    <div className="flex flex-col md:flex-row md:items-center gap-2 justify-between">
                                                        <div className="space-y-0.5">
                                                            <p className="text-xs font-medium text-stone-800">
                                                                {act.action_type === 'ai_query' ? 'Inquired Stonevo Archivist' : 'Refined Collection Filters'}
                                                            </p>
                                                            <p className="text-[10px] text-stone-500 italic">
                                                                {formatActivityDetails(act.action_type, act.details)}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-stone-400 uppercase tracking-widest bg-white px-2 py-1 rounded border border-stone-100 shadow-sm whitespace-nowrap">
                                                            <Clock size={10} />
                                                            {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            <span className="mx-1">·</span>
                                                            {new Date(act.created_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminLeads;
