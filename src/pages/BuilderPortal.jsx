import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, ArrowRight, FileText, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import ImageModal from '../components/ImageModal';
import StoneSelectionForm from '../components/StoneSelectionForm';
import ProjectChat from '../components/ProjectChat';

const SYNTHETIC_LOTS = [];

const BuilderPortal = () => {
    const [lots, setLots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
    const [projectRequirements, setProjectRequirements] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;
    const [chatRoomId, setChatRoomId] = useState(null);
    const [chatUserName, setChatUserName] = useState('');

    useEffect(() => {
        const leadId = localStorage.getItem('stonevo_lead_id');
        if (!leadId) return;
        // Read identity + room directly from the lead record — no phone matching,
        // no cross-session leaks. room_id is stamped when admin whitelists the client.
        const loadRoom = async () => {
            const { data: lead } = await supabase
                .from('leads')
                .select('phone, full_name, room_id')
                .eq('id', leadId)
                .single();
            if (!lead) return;
            const displayName = lead.full_name || lead.phone || '';
            setChatUserName(displayName);
            if (lead.phone) localStorage.setItem('stonevo_user_phone', lead.phone);
            if (lead.full_name) localStorage.setItem('stonevo_user_name', lead.full_name);
            if (lead.room_id) setChatRoomId(lead.room_id);
        };
        loadRoom();
    }, []);

    useEffect(() => {
        fetchSmallLots();
        fetchProjectRequirements();
    }, []);

    const fetchProjectRequirements = async () => {
        const leadId = localStorage.getItem('stonevo_lead_id');
        if (!leadId) return;

        try {
            const { data, error } = await supabase
                .from('project_requirements')
                .select('*')
                .eq('lead_id', leadId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (data) {
                setProjectRequirements(data.data);
            }
        } catch (err) {
            console.error('Error fetching project requirements:', err);
        }
    };

    const handleSaveRequirements = async (data) => {
        const leadId = localStorage.getItem('stonevo_lead_id');
        if (!leadId) {
            alert("Error: No active lead session found.");
            return;
        }

        // Calculate total area for database optimization
        const floors = data.floors || (Array.isArray(data) ? data : []);
        const totalArea = floors.reduce((acc, floor) => {
            return acc + (floor.rooms || []).reduce((rAcc, room) => {
                return rAcc + (room.stones || []).reduce((sAcc, stone) => {
                    return sAcc + (Number(stone.area) || 0);
                }, 0);
            }, 0);
        }, 0) + (Number(data.flooring?.area) || 0);

        const timestamp = new Date().toISOString();
        try {
            const { error } = await supabase
                .from('project_requirements')
                .upsert({
                    lead_id: leadId,
                    data: data,
                    total_area: totalArea,
                    status: 'draft',
                    updated_at: timestamp
                }, { onConflict: 'lead_id' });

            if (error) throw error;

            setProjectRequirements(data);
            alert("Draft saved successfully to our institutional database.");
            setIsConfiguratorOpen(false);
        } catch (err) {
            console.error('Error saving requirements:', err);
            alert(`Save failed: ${err.message}. Please ensured the database table exists.`);
        }
    };

    const fetchSmallLots = async () => {
        try {
            const { data, error } = await supabase
                .from('stones')
                .select('*')
                .eq('lot_type', 'small_lot')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform live data to include application mapping
            const transformedData = (data || []).map(item => ({
                ...item,
                application: item.application || (item.type === 'Marble' ? 'Flooring' : item.type)
            }));

            // Merge live data with synthetic data
            setLots([...transformedData, ...SYNTHETIC_LOTS]);
        } catch (err) {
            console.error('Error fetching small lots:', err);
            // Fallback to only synthetic data if Supabase fails
            setLots(SYNTHETIC_LOTS);
        }
    };


    const [activeCategory, setActiveCategory] = useState('application');
    const categories = [
        { id: 'application', label: 'Applications' },
        { id: 'type', label: 'Stone Type' },
        { id: 'color', label: 'Color' },
        { id: 'finish', label: 'Finish' },
        { id: 'temperature', label: 'Temperature' },
        { id: 'pattern', label: 'Veining' }
    ];

    const [activeFilter, setActiveFilter] = useState('All');

    // Reset to page 1 when category or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeCategory, activeFilter]);

    const getFilterOptions = () => {
        const uniqueValues = [...new Set(lots.flatMap(lot => {
            const val = activeCategory === 'type' ? lot.type : lot[activeCategory];
            return Array.isArray(val) ? val : (val ? [val] : []);
        }))].filter(Boolean);
        return ['All', ...uniqueValues];
    };

    const filters = getFilterOptions();

    const filteredLots = activeFilter === 'All'
        ? lots
        : lots.filter(lot => {
            const val = activeCategory === 'type' ? lot.type : lot[activeCategory];
            return Array.isArray(val) ? val.includes(activeFilter) : val === activeFilter;
        });

    // Pagination Logic
    const totalPages = Math.ceil(filteredLots.length / ITEMS_PER_PAGE);
    const paginatedLots = filteredLots.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="min-h-screen bg-[#f2f0ed] dark:bg-[#221c10] text-[#181611] dark:text-slate-100 font-sans selection:bg-[#eca413]/30">
            {/* Top Navigation Bar */}
            <header className="w-full border-b border-[#897c61]/10 bg-[#f2f0ed]/80 dark:bg-[#221c10]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-6 text-[#eca413]">
                            <svg fill="currentColor" viewbox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path clip-rule="evenodd" d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" fill-rule="evenodd"></path>
                            </svg>
                        </div>
                        <h1 className="font-serif text-xl font-semibold tracking-tight">Stonevo</h1>
                    </div>
                    <nav className="hidden md:flex items-center gap-10">
                        <a className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#181611]/60 hover:text-[#181611] dark:text-slate-400 dark:hover:text-white transition-colors" href="/">Gallery</a>
                        <a className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#181611]/60 hover:text-[#181611] dark:text-slate-400 dark:hover:text-white transition-colors" href="/internal-management-stonevo-9921">Admin</a>
                        <a className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#181611]/60 hover:text-[#181611] dark:text-slate-400 dark:hover:text-white transition-colors" href="/advisory">Advisory</a>
                    </nav>
                    <div className="flex items-center gap-6">
                        {chatUserName && (
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#181611]/5 dark:bg-white/5 rounded-full border border-[#897c61]/20">
                                <div className="w-2 h-2 rounded-full bg-[#eca413]" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#897c61] truncate max-w-[120px]">{chatUserName}</span>
                                <button
                                    onClick={() => { ['stonevo_lead_id','stonevo_user_phone','stonevo_user_name'].forEach(k => localStorage.removeItem(k)); window.location.reload(); }}
                                    className="text-[#897c61] hover:text-red-400 transition-colors text-[10px] font-bold uppercase tracking-widest ml-1"
                                    title="Switch account"
                                >✕</button>
                            </div>
                        )}
                        <button
                            onClick={() => setIsConfiguratorOpen(true)}
                            className="px-6 py-2.5 bg-[#eca413] text-[#181611] text-[10px] sm:text-xs uppercase tracking-[0.15em] font-black rounded-md hover:bg-[#d99510] transition-all duration-300 flex items-center gap-2 shadow-[0_0_15px_rgba(236,164,19,0.3)] hover:shadow-[0_0_20px_rgba(236,164,19,0.5)] transform hover:-translate-y-0.5"
                        >
                            {projectRequirements ? (
                                <><FileText size={16} /> Edit Draft</>
                            ) : (
                                <><Plus size={16} /> Requirements</>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1200px] mx-auto px-6 py-12 md:py-20 flex-1 overflow-y-auto custom-scrollbar">
                {/* Header & Filtering */}
                <div className="mb-16 text-center">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-serif text-4xl md:text-5xl mb-12 italic text-[#181611] dark:text-white"
                    >
                        The Exclusive Selection
                    </motion.h2>
                    <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => { setActiveCategory(cat.id); setActiveFilter('All'); }}
                                className={`px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest font-bold transition-all border ${activeCategory === cat.id
                                    ? 'bg-[#181611] text-white border-transparent shadow-lg'
                                    : 'bg-white/50 text-[#897c61] border-[#897c61]/20 hover:border-[#897c61]/40'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 border-b border-[#897c61]/10 pb-4 min-h-[40px]">
                        {filters.map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`relative text-[10px] uppercase tracking-[0.2em] font-bold transition-colors ${activeFilter === filter
                                    ? 'text-[#181611] dark:text-white'
                                    : 'text-[#897c61] hover:text-[#181611] dark:hover:text-white'
                                    }`}
                            >
                                {filter === 'All' ? 'Everything' : filter}
                                {activeFilter === filter && (
                                    <motion.span
                                        layoutId="activeFilterUnderline"
                                        className="absolute -bottom-[17px] left-0 w-full h-0.5 bg-[#eca413]"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List Container */}
                <div className="flex flex-col gap-1">
                    <AnimatePresence mode="popLayout">
                        {paginatedLots.map((lot) => (
                            <motion.div
                                key={lot.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="group flex items-center justify-between p-4 bg-white/20 dark:bg-white/5 rounded-lg hover:bg-white dark:hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-[#897c61]/10"
                            >
                                <div className="flex items-center gap-8">
                                    <div className="size-[100px] shrink-0 rounded-md overflow-hidden bg-[#e5e7eb] dark:bg-[#374151]">
                                        <img
                                            src={lot.image_url}
                                            alt={lot.name}
                                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-out scale-105 group-hover:scale-100"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-serif italic text-2xl text-[#181611] dark:text-slate-100">{lot.name}</h3>
                                            {lot.status === 'Limited' && (
                                                <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[8px] font-bold uppercase tracking-widest rounded">Limited</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-[#897c61] uppercase tracking-[0.2em] mt-1 font-bold">
                                            {lot.application || lot.type} • {lot.quarry}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-12 pr-4">
                                    <div className="hidden lg:flex flex-col items-end gap-1">
                                        <span className="text-[10px] uppercase tracking-widest text-[#897c61]/60">Stock Status</span>
                                        <span className="text-[10px] uppercase tracking-widest text-[#181611] dark:text-white font-bold">{lot.status || 'In Stock'}</span>
                                    </div>
                                    <div className="hidden md:flex flex-col items-end gap-1">
                                        <span className="text-[10px] uppercase tracking-widest text-[#897c61]/60">Pricing</span>
                                        <span className="text-[10px] uppercase tracking-widest text-[#eca413] font-bold">₹{lot.price_range}/SF</span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedSlot(lot)}
                                        className="px-8 py-3 rounded-md bg-[#eca413]/10 border border-[#eca413]/20 text-[#eca413] text-[10px] uppercase tracking-[0.2em] font-black hover:bg-[#eca413] hover:text-[#181611] transition-all duration-300 min-w-[120px]"
                                    >
                                        Select
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-12 flex items-center justify-center gap-8">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-3 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-[#eca413] hover:border-[#eca413]/50 disabled:opacity-20 disabled:hover:text-white/40 disabled:hover:border-white/10 transition-all active:scale-90"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        <div className="flex items-center gap-3">
                            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#eca413]">
                                Page {currentPage}
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/20">
                                of {totalPages}
                            </span>
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-3 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-[#eca413] hover:border-[#eca413]/50 disabled:opacity-20 disabled:hover:text-white/40 disabled:hover:border-white/10 transition-all active:scale-90"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>
                )}

                {/* Pagination / Load More Footer */}
                <div className="mt-20 mb-12 flex flex-col items-center">
                    <button className="group flex items-center gap-4 text-[10px] uppercase tracking-[0.3em] font-bold text-[#897c61] hover:text-[#181611] dark:hover:text-white transition-colors">
                        View All Materials
                        <motion.span
                            animate={{ x: [0, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            <ArrowRight size={14} />
                        </motion.span>
                    </button>
                    <div className="mt-12 h-px w-24 bg-[#897c61]/20"></div>
                </div>
            </main>

            <StoneSelectionForm
                isOpen={isConfiguratorOpen}
                onClose={() => setIsConfiguratorOpen(false)}
                onSubmit={handleSaveRequirements}
                initialData={projectRequirements}
                inventory={lots}
            />

            <ProjectChat
                projectId={chatRoomId}
                role="client"
                userName={chatUserName}
                isLinked={!!chatRoomId}
            />

            <ImageModal
                isOpen={!!selectedSlot}
                stone={selectedSlot ? {
                    id: selectedSlot.id,
                    name: selectedSlot.name,
                    imageUrl: selectedSlot.image_url,
                    description: selectedSlot.description,
                    physical_properties: {
                        marble: selectedSlot.type,
                        color: selectedSlot.color,
                        finish: selectedSlot.finish,
                        priceRange: selectedSlot.price_range,
                        application: selectedSlot.application || selectedSlot.type,
                        pattern: selectedSlot.pattern || selectedSlot.variation,
                        temperature: selectedSlot.temperature
                    }
                } : null}
                onClose={() => setSelectedSlot(null)}
            />
        </div >
    );
};

export default BuilderPortal;
