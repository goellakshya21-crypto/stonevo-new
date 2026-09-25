import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { TrendingUp, RefreshCw, Users, Eye, Sparkles, ClipboardList, Search } from 'lucide-react';

/**
 * What the gallery is actually telling you.
 *
 * activity_logs has recorded every stone view, render and search for months,
 * and nothing ever read it in aggregate -- the admin panel could show you what
 * ONE lead did, never which stones people keep coming back to, or how many who
 * look at a stone go on to render it. For a stone business that funnel is the
 * useful part, and the data for it was already there.
 *
 * Everything is computed here from the raw rows rather than in SQL, so it needs
 * no migration and no new tracking.
 */

// The team's own testing would otherwise dominate every chart: one person
// rendering the same black marble forty times reads as a hit product.
const TEAM_PHONES = [
    '7678320944', // Lakshya
    '7042353166',
    '9910978887',
    '8779473034', // Jaswant
];

// Searches from one person closer together than this are one search being
// typed or refined, not several. Needed for history recorded before searches
// were debounced, when "calacatta" was stored as nine rows.
const SEARCH_BURST_MS = 5000;

const WINDOWS = [
    { id: 7, label: '7 days' },
    { id: 30, label: '30 days' },
    { id: 90, label: '90 days' },
    { id: 0, label: 'All time' },
];

const PAGE = 1000; // PostgREST's per-request cap; anything longer is paged

const norm = (s) => String(s || '').trim();
const phone10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);

const tally = (items) => {
    const m = new Map();
    for (const k of items) if (k) m.set(k, (m.get(k) || 0) + 1);
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};

// Keep only the last search in each burst, per person.
const settledSearches = (searches) => {
    const byLead = new Map();
    for (const s of searches) {
        if (!byLead.has(s.lead_id)) byLead.set(s.lead_id, []);
        byLead.get(s.lead_id).push(s);
    }
    const kept = [];
    for (const list of byLead.values()) {
        list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        list.forEach((s, i) => {
            const next = list[i + 1];
            if (next && new Date(next.created_at) - new Date(s.created_at) < SEARCH_BURST_MS) return;
            kept.push(s);
        });
    }
    return kept;
};

const hasNamedStone = (data) => {
    const floors = Array.isArray(data) ? data : (data?.floors || []);
    return floors.some(f => (f?.rooms || []).some(r => (r?.stones || []).some(s => norm(s?.name))));
};

const BarList = ({ items, empty = 'Nothing yet', max = 8, suffix }) => {
    const shown = items.slice(0, max);
    const top = shown[0]?.value || 1;
    if (!shown.length) return <p className="text-xs text-stone-400 italic py-2">{empty}</p>;
    return (
        <ul className="space-y-2.5">
            {shown.map(({ label, value, note }) => (
                <li key={label}>
                    <div className="flex items-baseline justify-between gap-3 text-xs mb-1">
                        <span className="text-stone-700 truncate">{label}</span>
                        <span className="font-mono text-stone-500 shrink-0">
                            {value}{suffix}{note && <span className="text-stone-400"> · {note}</span>}
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                        <div className="h-full rounded-full bg-bronze/70" style={{ width: `${(value / top) * 100}%` }} />
                    </div>
                </li>
            ))}
        </ul>
    );
};

const Card = ({ title, hint, icon: Icon, children, className = '' }) => (
    <div className={`bg-white rounded-2xl border border-stone-200 p-6 ${className}`}>
        <div className="mb-5">
            <h3 className="text-sm font-serif text-stone-800 flex items-center gap-2">
                {Icon && <Icon size={15} className="text-bronze" />} {title}
            </h3>
            {hint && <p className="text-[11px] text-stone-400 mt-1">{hint}</p>}
        </div>
        {children}
    </div>
);

const AdminInsights = () => {
    const [days, setDays] = useState(30);
    const [excludeTeam, setExcludeTeam] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [raw, setRaw] = useState({ logs: [], leads: [], reqs: [] });

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const since = days ? new Date(Date.now() - days * 86400000).toISOString() : null;

            const logs = [];
            for (let from = 0; from < 50000; from += PAGE) {
                let q = supabase.from('activity_logs')
                    .select('lead_id, action_type, details, created_at')
                    .order('created_at', { ascending: true })
                    .range(from, from + PAGE - 1);
                if (since) q = q.gte('created_at', since);
                const { data, error: e } = await q;
                if (e) throw e;
                logs.push(...(data || []));
                if (!data || data.length < PAGE) break;
            }

            const [{ data: leads, error: le }, { data: reqs, error: re }] = await Promise.all([
                supabase.from('leads').select('id, phone, full_name, role, last_active'),
                supabase.from('project_requirements').select('lead_id, data, updated_at'),
            ]);
            if (le) throw le;
            if (re) throw re;

            setRaw({ logs, leads: leads || [], reqs: reqs || [] });
        } catch (err) {
            console.error('[Insights] load failed:', err);
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => { load(); }, [load]);

    const stats = useMemo(() => {
        const leadById = new Map(raw.leads.map(l => [l.id, l]));
        const teamIds = new Set(raw.leads.filter(l => TEAM_PHONES.includes(phone10(l.phone))).map(l => l.id));
        const logs = excludeTeam ? raw.logs.filter(l => !teamIds.has(l.lead_id)) : raw.logs;

        const of = (t) => logs.filter(l => l.action_type === t);
        const views = of('view_stone');
        const renders = of('visualize');
        const searches = settledSearches(of('search'));
        const queries = of('ai_query');

        const active = new Set(logs.map(l => l.lead_id));
        const viewed = new Set(views.map(l => l.lead_id));
        const rendered = new Set(renders.map(l => l.lead_id));
        const withList = new Set(raw.reqs.filter(r => hasNamedStone(r.data)).map(r => r.lead_id));

        // A true funnel: each stage is a subset of the one before it.
        const s1 = [...active];
        const s2 = s1.filter(id => viewed.has(id));
        const s3 = s2.filter(id => rendered.has(id));
        const s4 = s3.filter(id => withList.has(id));

        const isCustom = (d) => String(d?.stone_id || '').startsWith('custom_') || d?.stone_name === 'Custom Upload';
        const viewCounts = tally(views.map(v => norm(v.details?.stone_name)));
        const renderCounts = tally(renders.filter(r => !isCustom(r.details)).map(r => norm(r.details?.stone_name)));

        // Renders per view, per stone. A ratio rather than a per-person funnel,
        // so it can pass 100 when a stone is rendered in several styles. Only
        // stones with enough views to mean something, or 1 view / 1 render
        // would top the list.
        const rendersBy = new Map(renderCounts.map(r => [r.label, r.value]));
        const conversion = viewCounts
            .filter(v => v.value >= 3)
            .map(v => ({ label: v.label, rate: (rendersBy.get(v.label) || 0) / v.value, views: v.value }))
            .filter(v => v.rate > 0)
            .sort((a, b) => b.rate - a.rate || b.views - a.views)
            .map(v => ({ label: v.label, value: Math.round(v.rate * 100), note: `${v.views} views` }));

        const facet = (key) => tally(searches.flatMap(s => [].concat((s.details?.filters || s.details || {})[key] || [])));
        const typed = tally(searches.map(s => norm((s.details?.filters || s.details || {}).name).toLowerCase()));

        const perLead = tally(logs.map(l => l.lead_id)).slice(0, 8).map(({ label, value }) => {
            const l = leadById.get(label);
            return {
                label: l?.full_name || `${label.slice(0, 8)}…`,
                value,
                note: l?.role || undefined,
            };
        });

        return {
            events: logs.length,
            activeLeads: active.size,
            renderCount: renders.length,
            customRenders: renders.filter(r => isCustom(r.details)).length,
            searchCount: searches.length,
            rawSearchCount: of('search').length,
            queryCount: queries.length,
            funnel: [
                { label: 'Active', value: s1.length },
                { label: 'Looked at a stone', value: s2.length },
                { label: 'Rendered it', value: s3.length },
                { label: 'Built a requirement list', value: s4.length },
            ],
            viewCounts, renderCounts, conversion,
            colours: facet('color'),
            applications: facet('application'),
            types: facet('marble'),
            typed,
            renderApps: tally(renders.map(r => norm(r.details?.application))),
            perLead,
            teamExcluded: excludeTeam ? raw.logs.length - logs.length : 0,
        };
    }, [raw, excludeTeam]);

    const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '—');

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-serif text-stone-800 flex items-center gap-2">
                            <TrendingUp className="text-bronze" size={22} /> Insights
                        </h2>
                        <p className="text-stone-500 text-sm mt-1">
                            What people look at, render, and search for.
                            {stats.teamExcluded > 0 && ` ${stats.teamExcluded} team events hidden.`}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs font-bold uppercase tracking-widest">
                            {WINDOWS.map(w => (
                                <button key={w.id} onClick={() => setDays(w.id)}
                                    className={`px-3 py-1.5 rounded-md transition-all ${days === w.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                                    {w.label}
                                </button>
                            ))}
                        </div>
                        <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer select-none">
                            <input type="checkbox" checked={excludeTeam} onChange={e => setExcludeTeam(e.target.checked)} />
                            Hide team
                        </label>
                        <button onClick={load} title="Refresh"
                            className="p-2 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-stone-500">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-6">
                    Could not load activity: {error}
                </div>
            ) : loading ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center text-stone-400 text-sm">
                    Reading activity…
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: Users, label: 'Active leads', value: stats.activeLeads },
                            { icon: Eye, label: 'Stone views', value: stats.viewCounts.reduce((a, b) => a + b.value, 0) },
                            { icon: Sparkles, label: 'Renders', value: stats.renderCount, sub: stats.customRenders ? `${stats.customRenders} of own stones` : null },
                            { icon: Search, label: 'Searches', value: stats.searchCount,
                              sub: stats.rawSearchCount > stats.searchCount ? `from ${stats.rawSearchCount} rows` : null },
                        ].map(({ icon: Icon, label, value, sub }) => (
                            <div key={label} className="bg-white rounded-2xl border border-stone-200 p-5">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400 flex items-center gap-1.5">
                                    {Icon && <Icon size={11} />} {label}
                                </p>
                                <p className="text-3xl font-serif text-stone-800 mt-2">{value}</p>
                                {sub && <p className="text-[11px] text-stone-400 mt-1">{sub}</p>}
                            </div>
                        ))}
                    </div>

                    <Card title="Funnel" icon={ClipboardList}
                        hint="Each step counts only the people who also did the step before it.">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            {stats.funnel.map((s, i) => (
                                <div key={s.label} className="rounded-xl bg-stone-50 border border-stone-100 p-4">
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">{s.label}</p>
                                    <p className="text-2xl font-serif text-stone-800 mt-1">{s.value}</p>
                                    {i > 0 && (
                                        <p className="text-[11px] text-bronze mt-1">
                                            {pct(s.value, stats.funnel[i - 1].value)} of previous
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Most viewed stones" icon={Eye}>
                            <BarList items={stats.viewCounts} />
                        </Card>
                        <Card title="Most rendered stones" icon={Sparkles}
                            hint="Gallery stones only; renders of uploaded samples are counted above.">
                            <BarList items={stats.renderCounts} />
                        </Card>
                        <Card title="Renders per 100 views" icon={TrendingUp}
                            hint="Stones with 3+ views. Over 100 means people render it repeatedly, e.g. in several styles.">
                            <BarList items={stats.conversion} suffix="%" empty="Not enough views yet" />
                        </Card>
                        <Card title="What people render onto" icon={Sparkles}>
                            <BarList items={stats.renderApps} />
                        </Card>
                        <Card title="Colours searched" icon={Search}>
                            <BarList items={stats.colours} />
                        </Card>
                        <Card title="Applications searched" icon={Search}>
                            <BarList items={stats.applications} />
                        </Card>
                        <Card title="Stone types searched" icon={Search}>
                            <BarList items={stats.types} />
                        </Card>
                        <Card title="Typed searches" icon={Search}
                            hint="What people typed into the name box, one per settled search.">
                            <BarList items={stats.typed} />
                        </Card>
                        <Card title="Most active leads" icon={Users} className="lg:col-span-2">
                            <BarList items={stats.perLead} suffix=" events" />
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminInsights;
