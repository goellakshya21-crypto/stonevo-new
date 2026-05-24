import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FilterBar from '../components/FilterBar';
import MarbleGrid from '../components/MarbleGrid';
import ImageModal from '../components/ImageModal';
import AIVisualizationModal from '../components/AIVisualizationModal';
import { supabase } from '../lib/supabaseClient';
import Fuse from 'fuse.js';
import ChatAssistant from '../components/ChatAssistant';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import StoneSelectionForm from '../components/StoneSelectionForm';
import { useRequirements } from '../context/RequirementsContext';
import ProjectChat from '../components/ProjectChat';
import ClientManager from '../components/ClientManager';
import { PowerOff, ChevronDown, Link as LinkIcon, Upload, Sparkles, Trash2, Pencil, Check, X as XIcon, Phone } from 'lucide-react';

// Floating prompt for clients who haven't linked an architect yet
const LinkArchitectPrompt = ({ leadId, onLinked }) => {
    const [open, setOpen] = useState(false);
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const [done, setDone] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        const clean = phone.replace(/\D/g, '').slice(-10);
        if (clean.length < 10) { setErr('Enter a valid 10-digit number'); return; }
        setSaving(true); setErr('');
        try {
            const superWhitelist = ['7678320944', '7042353166'];
            const isSuper = superWhitelist.includes(clean);
            let tag;
            if (isSuper) {
                tag = `PENDING_REQUEST:${clean}`;
            } else {
                const { data: arch } = await supabase
                    .from('leads').select('id').eq('phone', clean).eq('role', 'architect').maybeSingle();
                tag = arch ? `PENDING_REQUEST:${clean}` : `UNVERIFIED_ARCHITECT:${clean}`;
            }
            await supabase.from('leads').update({ company_name: tag, status: 'pending' }).eq('id', leadId);
            setDone(true);
            setTimeout(() => { setOpen(false); if (onLinked) onLinked(); }, 1500);
        } catch (e) {
            setErr(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (done) return null;

    return (
        <div className="fixed bottom-24 left-4 z-[290]">
            {open ? (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="bg-stone-900 border border-white/10 rounded-2xl p-5 shadow-2xl w-72"
                >
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-white text-sm font-serif italic">Link your Architect</p>
                        <button onClick={() => setOpen(false)} className="text-stone-500 hover:text-white">
                            <XIcon size={16} />
                        </button>
                    </div>
                    <p className="text-stone-400 text-xs mb-4 leading-relaxed">
                        Enter your architect's phone number to connect your project room.
                    </p>
                    <form onSubmit={submit} className="space-y-3">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                            <Phone size={14} className="text-bronze shrink-0" />
                            <input
                                type="tel"
                                placeholder="Architect's mobile number"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-stone-600"
                            />
                        </div>
                        {err && <p className="text-red-400 text-xs">{err}</p>}
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-2.5 bg-bronze text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-white hover:text-stone-900 transition-all"
                        >
                            {saving ? 'Linking…' : 'Send Request'}
                        </button>
                    </form>
                </motion.div>
            ) : (
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-stone-900/90 border border-white/10 rounded-full text-[10px] text-stone-400 hover:text-bronze uppercase tracking-widest transition-all backdrop-blur-md shadow-xl"
                >
                    <LinkIcon size={12} className="text-bronze" />
                    Link your Architect
                </motion.button>
            )}
        </div>
    );
};

const ITEMS_PER_PAGE = 50;
const SYNTHETIC_MARBLES = [];

function Home({ role }) {
    const [marbles, setMarbles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStone, setSelectedStone] = useState(null);
    const [visualizationData, setVisualizationData] = useState(null);
    const [stoneContextList, setStoneContextList] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isClientManagerOpen, setIsClientManagerOpen] = useState(false);
    const [clients, setClients] = useState([]);
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const [pendingRequestCount, setPendingRequestCount] = useState(0);
    const [customStoneOpen, setCustomStoneOpen] = useState(false);
    const [stoneToVisualize, setStoneToVisualize] = useState(null); // re-visualize a saved stone
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    const [customStones, setCustomStones] = useState([]);

    // Persist stones to both localStorage (fast cache) and Supabase (cross-device sync)
    const syncCustomStones = async (updated, currentLeadId) => {
        const key = `stonevo_custom_stones_${currentLeadId || 'guest'}`;
        try { localStorage.setItem(key, JSON.stringify(updated)); } catch {}
        if (currentLeadId && !currentLeadId.startsWith('GUEST_')) {
            await supabase.from('leads').update({ custom_stones: updated }).eq('id', currentLeadId);
        }
    };

    const saveCustomStone = (stone) => {
        setCustomStones(prev => {
            const updated = [stone, ...prev.filter(s => s.id !== stone.id)];
            syncCustomStones(updated, leadId);
            return updated;
        });
    };

    const deleteCustomStone = (id) => {
        setCustomStones(prev => {
            const updated = prev.filter(s => s.id !== id);
            syncCustomStones(updated, leadId);
            return updated;
        });
    };

    const renameCustomStone = (id, newName) => {
        if (!newName.trim()) return;
        setCustomStones(prev => {
            const updated = prev.map(s => s.id === id ? { ...s, name: newName.trim() } : s);
            syncCustomStones(updated, leadId);
            return updated;
        });
        setRenamingId(null);
    };

    const {
        isConfiguratorOpen,
        setIsConfiguratorOpen,
        addToRequirements,
        saveRequirements,
        updateActiveDraft,
        stoneCount,
        activeDraft,
        activeRoomId,
        leadId,
        activeProjectName,
        linkToClient,
        isLinked,
        clearSession
    } = useRequirements();

    // Who is currently logged in — shown in header so it's always obvious
    const loggedInName = (() => { try { return localStorage.getItem('stonevo_user_name') || ''; } catch { return ''; } })();
    const loggedInPhone = (() => { try { return localStorage.getItem('stonevo_user_phone') || ''; } catch { return ''; } })();

    const handleSwitchAccount = () => {
        clearSession();
        window.location.reload();
    };

    const customStonesKey = `stonevo_custom_stones_${leadId || 'guest'}`;

    useEffect(() => {
        const loadCustomStones = async () => {
            // Try Supabase first (cross-device), fall back to localStorage cache
            if (leadId && !leadId.startsWith('GUEST_')) {
                const { data } = await supabase
                    .from('leads')
                    .select('custom_stones')
                    .eq('id', leadId)
                    .single();
                if (data?.custom_stones?.length > 0) {
                    setCustomStones(data.custom_stones);
                    // Keep localStorage in sync as cache
                    try { localStorage.setItem(customStonesKey, JSON.stringify(data.custom_stones)); } catch {}
                    return;
                }
            }
            // Fallback: localStorage (guest or first load before Supabase responds)
            try {
                setCustomStones(JSON.parse(localStorage.getItem(customStonesKey) || '[]'));
            } catch { setCustomStones([]); }
        };
        loadCustomStones();
    }, [customStonesKey, leadId]);

    // Resolve Chat Identity Safely
    let isAdmin = false;
    let userPhone = null;
    try {
        isAdmin = localStorage.getItem('stonevo_admin') === 'true';
        userPhone = localStorage.getItem('stonevo_user_phone');
    } catch (e) {
        console.warn("[Chat] Storage access restricted");
    }
    const chatRole = isAdmin ? 'admin' : role;
    const chatName = isAdmin ? 'Stonevo Team' : (activeProjectName || userPhone || 'User');
    
    const [filters, setFilters] = useState({
        name: '',
        marble: [],
        color: [],
        finish: [],
        priceRange: [],
        application: [],
        pattern: [],
        temperature: []
    });

    useEffect(() => {
        const hasActiveFilters = filters.name ||
            filters.marble.length > 0 ||
            filters.color.length > 0 ||
            filters.finish.length > 0 ||
            filters.priceRange.length > 0 ||
            filters.application.length > 0 ||
            filters.pattern.length > 0 ||
            filters.temperature.length > 0;

        if (hasActiveFilters) {
            import('../utils/activityTracker').then(({ logActivity }) => {
                logActivity('search', { filters });
            });
        }
    }, [filters]);

    const fetchMarbles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('stones')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const transformedData = (data || []).map(item => ({
                id: item.id,
                name: item.name,
                imageUrl: item.image_url,
                physical_properties: {
                    marble: item.type || [],
                    color: item.color || [],
                    finish: item.finish || [],
                    priceRange: item.price_range || [],
                    application: item.application || [],
                    pattern: item.pattern || [],
                    temperature: item.temperature || []
                },
                description: item.description,
                tags: item.tags
            }));

            setMarbles([...transformedData, ...SYNTHETIC_MARBLES]);
        } catch (err) {
            console.error('Error fetching stones:', err);
            setMarbles(SYNTHETIC_MARBLES);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMarbles();
    }, []);

    // Fetch clients for architect switcher
    useEffect(() => {
        if (chatRole !== 'architect' && chatRole !== 'admin') return;
        const fetchClients = async () => {
            try {
                const leadId = localStorage.getItem('stonevo_lead_id');
                if (!leadId) return;
                const { data: leadData } = await supabase.from('leads').select('phone').eq('id', leadId).single();
                if (!leadData?.phone) return;
                const { data: whitelist } = await supabase.from('client_whitelist').select('*').eq('architect_phone', leadData.phone);
                if (!whitelist?.length) return;
                // c.id (client_whitelist row UUID) is the shared group room — no lead lookup needed
                setClients(whitelist);
            } catch (err) {
                console.error('Error fetching clients for switcher:', err);
            }
        };
        fetchClients();
    }, [chatRole]);

    // Auto-discover the shared room for clients whose architect has linked them
    useEffect(() => {
        if (chatRole !== 'client' || isLinked || !leadId) return;
        const discoverRoom = async () => {
            try {
                const { data: lead } = await supabase.from('leads').select('phone').eq('id', leadId).single();
                if (!lead?.phone) return;
                const phone = lead.phone.replace(/\D/g, '').slice(-10);
                const { data: wl } = await supabase
                    .from('client_whitelist')
                    .select('id, client_name')
                    .ilike('phone_number', `%${phone}`)
                    .maybeSingle();
                if (wl?.id) linkToClient(wl.id, wl.client_name || 'Project Room');
            } catch (err) {
                console.error('[Chat] Client room discovery error:', err);
            }
        };
        discoverRoom();
    }, [chatRole, leadId, isLinked]);

    // Pending client requests badge
    useEffect(() => {
        if (chatRole !== 'architect' && chatRole !== 'admin') return;

        let archPhone = null;

        const fetchPending = async (phone) => {
            const { data } = await supabase
                .from('leads')
                .select('id', { count: 'exact' })
                .eq('status', 'pending')
                .eq('company_name', `PENDING_REQUEST:${phone}`);
            setPendingRequestCount(data?.length || 0);
        };

        const init = async () => {
            const lid = localStorage.getItem('stonevo_lead_id');
            if (!lid) return;
            const { data } = await supabase.from('leads').select('phone').eq('id', lid).single();
            if (!data?.phone) return;
            archPhone = data.phone;
            await fetchPending(archPhone);

            // Live ping — re-fetch when any lead row changes
            const channel = supabase
                .channel('pending_requests_badge')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
                    if (archPhone) fetchPending(archPhone);
                })
                .subscribe();

            return () => supabase.removeChannel(channel);
        };

        const cleanup = init();
        return () => { cleanup.then(fn => fn && fn()); };
    }, [chatRole]);

    // Close switcher on outside click
    useEffect(() => {
        if (!isSwitcherOpen) return;
        const handler = () => setIsSwitcherOpen(false);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, [isSwitcherOpen]);

    const handleSaveRequirements = async (data) => {
        const result = await saveRequirements(data);
        if (result.success) {
            alert("Requirements saved successfully to our institutional database.");
        } else {
            alert(`Save failed: ${result.error}`);
        }
    };

    const handleAddToRequirements = (stone) => {
        addToRequirements(stone);
    };

    const filteredMarbles = useMemo(() => {
        let result = marbles;
        if (filters.name.trim()) {
            const fuse = new Fuse(marbles, {
                keys: ['name', 'physical_properties.application', 'tags', 'description'],
                threshold: 0.35,
                distance: 100,
                minMatchCharLength: 2,
                includeScore: true
            });
            const searchResults = fuse.search(filters.name);
            result = searchResults.map(res => res.item);
        }
        // Linked applications: filtering by one also shows stones tagged with the other
        const LINKED_APPS = { 'Washroom': 'Flooring' }; // Washroom filter also shows Flooring stones, not vice versa
        const expandAppFilter = (arr) => {
            const extra = arr.flatMap(v => LINKED_APPS[v] ? [LINKED_APPS[v]] : []);
            return [...new Set([...arr, ...extra])];
        };

        return result.filter(marble => {
            const p = marble.physical_properties;
            const hasOverlap = (filterArr, stoneArr) =>
                filterArr.length === 0 || filterArr.some(v => [].concat(stoneArr || []).includes(v));
            if (!hasOverlap(filters.marble, p.marble)) return false;
            if (!hasOverlap(filters.color, p.color)) return false;
            if (!hasOverlap(filters.finish, p.finish)) return false;
            if (!hasOverlap(filters.priceRange, p.priceRange)) return false;
            if (!hasOverlap(expandAppFilter(filters.application), p.application)) return false;
            if (!hasOverlap(filters.pattern, p.pattern)) return false;
            if (!hasOverlap(filters.temperature, p.temperature)) return false;
            return true;
        });
    }, [filters, marbles]);

    const totalPages = Math.ceil(filteredMarbles.length / ITEMS_PER_PAGE);
    const paginatedMarbles = filteredMarbles.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    const handleReset = () => {
        setFilters({ name: '', marble: [], color: [], finish: [], priceRange: [], application: [], pattern: [], temperature: [] });
    };

    const handleStoneClick = (stone, contextStones = []) => {
        setStoneContextList(contextStones.length > 0 ? contextStones : [stone]);
        setSelectedStone(stone);
        // Log stone view for lead intelligence
        import('../utils/activityTracker').then(({ logActivity }) => {
            logActivity('view_stone', {
                stone_name: stone?.name,
                stone_type: stone?.type || stone?.marble,
                color: stone?.colour || stone?.color,
                finish: stone?.finish,
                pattern: stone?.pattern,
                stone_id: stone?.id
            });
        });
    };

    return (
        <div className="min-h-screen bg-stone-950 text-stone-200 font-sans selection:bg-luxury-bronze/30">
            <header className="absolute top-0 w-full z-50 py-6 px-8 flex justify-between items-center">
                <div className="flex items-center gap-12">
                    <h1 className="text-xl font-serif tracking-[0.2em] text-white">STONEVO</h1>
                    {(chatRole === 'architect' || chatRole === 'admin') && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => { setIsClientManagerOpen(true); setPendingRequestCount(0); }}
                                className="relative px-5 py-2 border border-bronze/30 rounded-full text-[10px] uppercase tracking-widest text-bronze hover:bg-bronze hover:text-white transition-all font-bold backdrop-blur-md"
                            >
                                Client Dashboard
                                {pendingRequestCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bronze opacity-75" />
                                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-bronze text-[8px] font-bold text-black items-center justify-center">
                                            {pendingRequestCount}
                                        </span>
                                    </span>
                                )}
                            </button>

                            {/* Client Switcher Dropdown */}
                            {clients.length > 0 && (
                                <div className="relative" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => setIsSwitcherOpen(o => !o)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold border transition-all backdrop-blur-md ${isLinked ? 'bg-bronze/10 border-bronze/30 text-bronze' : 'border-white/10 text-stone-400 hover:text-white hover:border-white/20'}`}
                                    >
                                        <LinkIcon size={11} />
                                        <span>{isLinked ? activeProjectName : 'Switch Client'}</span>
                                        <ChevronDown size={11} className={`transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isSwitcherOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-52 bg-stone-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                                            {clients.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => { linkToClient(c.id, c.client_name); setIsSwitcherOpen(false); }}
                                                    className={`w-full text-left px-4 py-3 text-xs hover:bg-white/5 transition-colors flex items-center justify-between ${activeRoomId === c.id ? 'text-bronze' : 'text-stone-300'}`}
                                                >
                                                    <span>{c.client_name || 'Unnamed'}</span>
                                                    {activeRoomId === c.id && <span className="w-1.5 h-1.5 rounded-full bg-bronze" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </div>
                <nav className="flex items-center gap-4">
                    <Link to="/advisory" className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-white transition-colors font-bold py-2 px-4 border border-stone-800/50 rounded-full bg-stone-900/50 backdrop-blur-sm">Audit & Advisory</Link>
                    <button
                        onClick={() => setIsConfiguratorOpen(true)}
                        className="group flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-white font-bold py-2 px-6 rounded-full bg-luxury-bronze hover:bg-bronze transition-all shadow-lg shadow-luxury-bronze/20"
                    >
                        {stoneCount > 0 ? (
                            <>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stone-950 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-stone-950"></span>
                                </span>
                                <span>Requirements ({stoneCount})</span>
                            </>
                        ) : (
                            <span>Add Requirement</span>
                        )}
                    </button>

                    {/* Logged-in identity — always visible so users know which account is active */}
                    {(loggedInName || loggedInPhone) && (
                        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                            <div className="flex flex-col items-end">
                                {loggedInName && <span className="text-[9px] text-stone-300 font-semibold leading-tight">{loggedInName}</span>}
                                {loggedInPhone && <span className="text-[8px] text-stone-600 leading-tight">+91 {loggedInPhone}</span>}
                            </div>
                            <button
                                onClick={handleSwitchAccount}
                                title="Switch Account"
                                className="w-7 h-7 rounded-full bg-stone-900 border border-white/10 flex items-center justify-center hover:border-red-500/40 hover:bg-red-500/10 transition-all group"
                            >
                                <PowerOff size={11} className="text-stone-500 group-hover:text-red-400 transition-colors" />
                            </button>
                        </div>
                    )}
                </nav>
            </header>

            <section className="relative min-h-[60vh] md:min-h-[85vh] flex flex-col items-center justify-center pt-16 md:pt-20 pb-20 md:pb-32">
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <img alt="background" className="w-full h-full object-cover transform scale-110 motion-safe:animate-[pulse_10s_ease-in-out_infinite]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8V6FefDxODr-gE99KmfKBpOaa7ttQxkZ43OooLIpRStirrlnpEbS74TLoks1cTJC7WIE05o0WSG1rrobP6A11bk4cdMgnZc3C8vmpO02BkFSzx2EBW-SHM-x_k8sPmgLv28tIpN7XsPjzR0044NOm-tdNaobs0RJZt9yLnddY2-82SmOdaItBgqdiMXLbbJVFuQ2K8_r67GJq2rLXJtBzohjaCvwJjo_0DsFjPUboYWOcOscR61Go52debRHXQR7AtYtvl2TNuyrv" />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-stone-950" />
                </div>
                <div className="max-w-7xl mx-auto px-6 text-center space-y-6 md:space-y-8 relative z-40 w-full">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2 }}>
                        <h1 className="font-serif text-5xl md:text-8xl text-luxury-cream tracking-tighter leading-tight">Stonevo</h1>
                        <p className="font-serif italic text-lg md:text-2xl text-bronze mt-4 tracking-normal opacity-90">Your stone procurement and consulting partner</p>
                    </motion.div>
                    <div className="max-w-4xl mx-auto w-full">
                        <ChatAssistant marbles={marbles} onStoneClick={handleStoneClick} onVisualizeRequest={setVisualizationData} />
                    </div>
                    <div className="pt-8 px-4 w-full max-w-6xl mx-auto">
                        <FilterBar filters={filters} setFilters={setFilters} onReset={handleReset} />
                    </div>
                </div>
            </section>

            <main className="max-w-[100vw] px-6 py-24 bg-stone-900 rounded-t-[4rem] border-t border-white/5 shadow-[0_-80px_150px_rgba(0,0,0,0.6)] -mt-16 relative z-10 group/gallery">
                {/* ── Your Stones ── */}
                {customStones.length > 0 && (
                    <div className="max-w-7xl mx-auto mb-16">
                        <div className="flex items-end justify-between mb-6">
                            <div>
                                <p className="text-[10px] font-bold text-[#eca413] uppercase tracking-[0.4em] italic opacity-70 mb-1">Personal Collection</p>
                                <h3 className="text-luxury-cream font-serif text-2xl italic">Your Stones</h3>
                            </div>
                            <button
                                onClick={() => setCustomStoneOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-[#eca413]/10 border border-white/10 hover:border-[#eca413]/30 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-[#eca413]"
                            >
                                <Upload size={12} /> Add Stone
                            </button>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                            {customStones.map(cs => (
                                <div key={cs.id} className="group/cs relative flex-shrink-0 w-44 rounded-2xl overflow-hidden border border-white/10 hover:border-[#eca413]/40 bg-stone-950 transition-all duration-300">
                                    {/* Thumbnail — shows AI-cropped version if available */}
                                    <div className="relative aspect-square overflow-hidden">
                                        <img
                                            src={cs.cropped_image_url || cs.image_url}
                                            alt={cs.name}
                                            className="w-full h-full object-cover group-hover/cs:scale-105 transition-transform duration-500"
                                        />
                                        {/* On hover: split original vs cropped comparison */}
                                        {cs.cropped_image_url && (
                                            <div className="absolute inset-0 opacity-0 group-hover/cs:opacity-100 transition-opacity duration-300 pointer-events-none">
                                                <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
                                                    <img src={cs.image_url} alt="Original" className="w-[200%] h-full object-cover" />
                                                    <span className="absolute bottom-1 left-1 text-[7px] font-bold uppercase tracking-wider bg-black/70 text-white/80 px-1 rounded">Original</span>
                                                </div>
                                                <div className="absolute inset-y-0 left-1/2 w-px bg-white/60 z-10" />
                                                <span className="absolute bottom-1 right-1 text-[7px] font-bold uppercase tracking-wider bg-[#eca413]/90 text-black px-1 rounded">AI Crop</span>
                                            </div>
                                        )}
                                        {cs.cropped_image_url && (
                                            <span className="absolute top-2 left-2 text-[7px] font-bold uppercase tracking-wider bg-[#eca413]/80 text-black px-1.5 py-0.5 rounded">✂</span>
                                        )}
                                        {/* Hover overlay with Visualize button */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/cs:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => setStoneToVisualize(cs)}
                                                className="flex items-center gap-2 px-4 py-2 bg-[#eca413] text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-white transition-all shadow-xl"
                                            >
                                                <Sparkles size={11} /> Visualize
                                            </button>
                                        </div>
                                        {/* Delete button */}
                                        <button
                                            onClick={() => deleteCustomStone(cs.id)}
                                            className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover/cs:opacity-100 transition-all"
                                            title="Remove"
                                        >
                                            <Trash2 size={11} color="white" />
                                        </button>
                                    </div>
                                    {/* Name row */}
                                    <div className="px-3 py-2.5">
                                        {renamingId === cs.id ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    autoFocus
                                                    value={renameValue}
                                                    onChange={e => setRenameValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') renameCustomStone(cs.id, renameValue);
                                                        if (e.key === 'Escape') setRenamingId(null);
                                                    }}
                                                    className="flex-1 bg-white/10 border border-[#eca413]/40 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none min-w-0"
                                                />
                                                <button onClick={() => renameCustomStone(cs.id, renameValue)} className="text-[#eca413] shrink-0"><Check size={12} /></button>
                                                <button onClick={() => setRenamingId(null)} className="text-white/40 shrink-0"><XIcon size={12} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 group/name">
                                                <p className="text-white/80 text-xs font-medium truncate flex-1">{cs.name}</p>
                                                <button
                                                    onClick={() => { setRenamingId(cs.id); setRenameValue(cs.name); }}
                                                    className="opacity-0 group-hover/name:opacity-100 transition-opacity text-white/30 hover:text-[#eca413] shrink-0"
                                                >
                                                    <Pencil size={10} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-12">
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-bold text-bronze uppercase tracking-[0.4em] italic opacity-60">Archives</h3>
                        <p className="text-luxury-cream font-serif text-3xl italic tracking-wide">
                            {filteredMarbles.length} Curated Specimens
                        </p>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-4 mt-6">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                                <span className="text-xs text-stone-500">{currentPage}/{totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        )}
                    </div>
                    {/* Visualize Your Own Stone CTA */}
                    <button
                        onClick={() => setCustomStoneOpen(true)}
                        className="group flex items-center gap-3 px-6 py-4 bg-white/[0.03] hover:bg-[#eca413]/10 border border-white/10 hover:border-[#eca413]/40 rounded-2xl transition-all duration-300 text-left"
                    >
                        <div className="w-10 h-10 bg-[#eca413]/10 group-hover:bg-[#eca413]/20 rounded-xl flex items-center justify-center transition-all shrink-0">
                            <Upload size={18} className="text-[#eca413]" />
                        </div>
                        <div>
                            <p className="text-white text-sm font-serif italic leading-tight">Visualize Your Stone</p>
                            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">Upload any sample · AI renders it</p>
                        </div>
                    </button>
                </div>

                <div className="max-w-7xl mx-auto">
                    <MarbleGrid marbles={paginatedMarbles} loading={loading} onEnlarge={(stone) => handleStoneClick(stone, paginatedMarbles)} />
                </div>
            </main>

            {selectedStone && (
                <ImageModal
                    stone={selectedStone}
                    allStones={stoneContextList}
                    onClose={() => { setSelectedStone(null); setStoneContextList([]); }}
                    onNavigate={setSelectedStone}
                    onAddToRequirements={handleAddToRequirements}
                />
            )}

            {visualizationData && (
                <AIVisualizationModal
                    isOpen={true}
                    stone={visualizationData.stone}
                    roomName={visualizationData.roomType}
                    initialStyle={visualizationData.roomStyle}
                    intendedApp={visualizationData.intendedApplication}
                    onClose={() => setVisualizationData(null)}
                />
            )}

            {/* Custom stone visualizer — user uploads their own stone sample */}
            <AIVisualizationModal
                isOpen={customStoneOpen}
                stone={null}
                allowCustomStone={true}
                onStoneUploaded={saveCustomStone}
                onClose={() => setCustomStoneOpen(false)}
            />

            {/* Re-visualize a previously uploaded stone */}
            {stoneToVisualize && (
                <AIVisualizationModal
                    isOpen={true}
                    stone={stoneToVisualize}
                    onClose={() => setStoneToVisualize(null)}
                />
            )}

            <footer className="bg-stone-950 py-24 mt-20 text-stone-400">
                <div className="max-w-7xl mx-auto px-6 text-center border-t border-white/5 pt-16">
                    <h1 className="text-xl font-serif tracking-[0.1em] text-white">STONEVO</h1>
                    <p className="text-[10px] uppercase tracking-widest font-bold mt-4">© 2026 Stonevo Architectural. Artifact of Nature.</p>
                </div>
            </footer>

            <StoneSelectionForm
                isOpen={isConfiguratorOpen}
                onClose={() => setIsConfiguratorOpen(false)}
                onSubmit={handleSaveRequirements}
                onChange={updateActiveDraft}
                initialData={activeDraft}
                inventory={stoneContextList.length > 0 ? stoneContextList : marbles}
            />
            {/* Project Room Chat (Safety Shielded) */}
            <ProjectChat
                key={activeRoomId || leadId || 'personal_workspace'}
                projectId={activeRoomId || leadId || 'personal_workspace'}
                role={chatRole}
                userName={chatName}
                isLinked={chatRole === 'client' ? !!leadId : isLinked}
            />

            <ClientManager
                isOpen={isClientManagerOpen}
                onClose={() => setIsClientManagerOpen(false)}
            />

            {/* Prompt unlinked clients to connect their architect */}
            {chatRole === 'client' && !isLinked && leadId && (
                <LinkArchitectPrompt leadId={leadId} onLinked={() => window.location.reload()} />
            )}
        </div>
    );
}

export default Home;
