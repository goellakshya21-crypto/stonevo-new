import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FilterBar from '../components/FilterBar';
import MarbleGrid from '../components/MarbleGrid';
import ImageModal from '../components/ImageModal';
import AIVisualizationModal from '../components/AIVisualizationModal';
import { supabase } from '../lib/supabaseClient';
import Fuse from 'fuse.js';
import ChatAssistant from '../components/ChatAssistant';
import { Menu } from 'lucide-react';
import { motion } from 'framer-motion';

// Deploy sync: 2026-03-16T19:10:00
const SYNTHETIC_MARBLES = [];

function Home() {
    const [marbles, setMarbles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStone, setSelectedStone] = useState(null);
    const [visualizationData, setVisualizationData] = useState(null);
    const [stoneContextList, setStoneContextList] = useState([]);
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
    const [appliedFilters, setAppliedFilters] = useState({
        name: '',
        marble: [],
        color: [],
        finish: [],
        priceRange: [],
        application: [],
        pattern: [],
        temperature: []
    });

    // Lead Activity Tracking: Explicit search logging
    const handleSearch = () => {
        setAppliedFilters(filters);
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
    };

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

            // Merge live data with synthetic data
            setMarbles([...transformedData, ...SYNTHETIC_MARBLES]);
        } catch (err) {
            console.error('Error fetching stones:', err);
            // Fallback to only synthetic data if Supabase fails
            setMarbles(SYNTHETIC_MARBLES);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMarbles();
    }, []);

    const filteredMarbles = useMemo(() => {
        let result = marbles;

        // Apply fuzzy search if a name is typed
        if (appliedFilters.name.trim()) {
            const fuse = new Fuse(marbles, {
                keys: ['name', 'physical_properties.application', 'tags', 'description'],
                threshold: 0.35,
                distance: 100,
                minMatchCharLength: 2,
                includeScore: true
            });
            const searchResults = fuse.search(appliedFilters.name);
            result = searchResults.map(res => res.item);
        }

        return result.filter(marble => {
            const p = marble.physical_properties;
            const hasOverlap = (filterArr, stoneArr) =>
                filterArr.length === 0 || filterArr.some(v => [].concat(stoneArr || []).includes(v));
            if (!hasOverlap(appliedFilters.marble, p.marble)) return false;
            if (!hasOverlap(appliedFilters.color, p.color)) return false;
            if (!hasOverlap(appliedFilters.finish, p.finish)) return false;
            if (!hasOverlap(appliedFilters.priceRange, p.priceRange)) return false;
            if (!hasOverlap(appliedFilters.application, p.application)) return false;
            if (!hasOverlap(appliedFilters.pattern, p.pattern)) return false;
            if (!hasOverlap(appliedFilters.temperature, p.temperature)) return false;
            return true;
        });
    }, [appliedFilters, marbles]);

    const handleReset = () => {
        const emptyFilters = {
            name: '',
            marble: [],
            color: [],
            finish: [],
            priceRange: [],
            application: [],
            pattern: [],
            temperature: []
        };
        setFilters(emptyFilters);
        setAppliedFilters(emptyFilters);
    };

    const handleStoneClick = (stone, contextStones = []) => {
        setStoneContextList(contextStones.length > 0 ? contextStones : [stone]);
        setSelectedStone(stone);
    };

    return (
        <div className="min-h-screen bg-stone-950 text-stone-200 font-sans selection:bg-luxury-bronze/30">

            {/* Immersive Hero & AI Concierge */}
            <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-20 pb-32">
                {/* Geological Background Image Wrapper (Clipping contained here) */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <img
                        alt="Rare veined marble slab background"
                        className="w-full h-full object-cover transform scale-110 motion-safe:animate-[pulse_10s_ease-in-out_infinite]"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8V6FefDxODr-gE99KmfKBpOaa7ttQxkZ43OooLIpRStirrlnpEbS74TLoks1cTJC7WIE05o0WSG1rrobP6A11bk4cdMgnZc3C8vmpO02BkFSzx2EBW-SHM-x_k8sPmgLv28tIpN7XsPjzR0044NOm-tdNaobs0RJZt9yLnddY2-82SmOdaItBgqdiMXLbbJVFuQ2K8_r67GJq2rLXJtBzohjaCvwJjo_0DsFjPUboYWOcOscR61Go52debRHXQR7AtYtvl2TNuyrv"
                    />
                    {/* Multi-layered cinematic gradient */}
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-taupe" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
                </div>

                <div className="max-w-7xl mx-auto px-6 text-center space-y-8 relative z-40 w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        className=""
                    >
                        <h1 className="font-serif text-6xl md:text-8xl text-luxury-cream text-shadow-sm tracking-tighter leading-none">Stonevo</h1>
                        <p className="font-serif italic text-xl md:text-2xl text-bronze mt-6 tracking-normal text-shadow-sm opacity-100">Your stone procurement and consulting partner</p>
                    </motion.div>

                    <div className="max-w-4xl mx-auto w-full">
                        <ChatAssistant 
                            marbles={marbles} 
                            onStoneClick={handleStoneClick} 
                            onVisualizeRequest={(data) => {
                                setVisualizationData(data);
                            }}
                        />
                    </div>

                    {/* Integrated Premium Filter Bar */}
                    <div className="pt-8 px-4 w-full max-w-6xl mx-auto">
                        <FilterBar
                            filters={filters}
                            setFilters={setFilters}
                            onSearch={handleSearch}
                            onReset={handleReset}
                        />
                    </div>

                    {/* Visual Buffer for Gallery Transition */}
                    <div className="h-12" />
                </div>
            </section>

            {/* Main Gallery Content */}
            <main className="max-w-[100vw] px-6 py-24 bg-taupe rounded-t-[4rem] border-t border-white/5 shadow-[0_-80px_150px_rgba(0,0,0,0.6)] -mt-16 relative z-10 group/gallery">
                <div className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-12">
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-bold text-bronze uppercase tracking-[0.4em] italic opacity-60">Archives</h3>
                        <p className="text-luxury-cream font-serif text-3xl italic tracking-wide">{filteredMarbles.length} Curated Specimens Available</p>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto">
                    <MarbleGrid
                        marbles={filteredMarbles}
                        loading={loading}
                        onEnlarge={(stone) => handleStoneClick(stone, filteredMarbles)}
                    />
                </div>
            </main>

            {/* Image Modal */}
            {selectedStone && (
                <ImageModal
                    stone={selectedStone}
                    allStones={stoneContextList}
                    onClose={() => { setSelectedStone(null); setStoneContextList([]); }}
                    onNavigate={setSelectedStone}
                />
            )}

            {/* Direct AI Visualization (triggered from Chat) */}
            {visualizationData && (
                <AIVisualizationModal
                    isOpen={true}
                    stone={visualizationData.stone}
                    roomName={visualizationData.roomType}
                    initialStyle={visualizationData.roomStyle}
                    onClose={() => setVisualizationData(null)}
                />
            )}

            {/* Premium Footer */}
            <footer className="bg-stone-900 py-24 mt-20 text-stone-400">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-16 border-b border-stone-800 pb-16 mb-16">
                        <div className="col-span-1 md:col-span-1 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 border border-stone-700 flex items-center justify-center transform rotate-45">
                                    <div className="w-5 h-5 border-[0.5px] border-stone-700 transform -rotate-45" />
                                </div>
                                <h1 className="text-xl font-serif tracking-[0.1em] text-white">STONEVO</h1>
                            </div>
                            <p className="text-xs leading-relaxed max-w-xs">Curating the world's most evocative natural surfaces for architectural distinction.</p>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Sitemap</h4>
                            <ul className="text-sm space-y-4 text-stone-300">
                                <li className="hover:text-luxury-bronze cursor-pointer transition-colors">Origins</li>
                                <li className="hover:text-luxury-bronze cursor-pointer transition-colors">Specimens</li>
                                <Link to="/internal-management-stonevo-9921" className="block hover:text-luxury-bronze cursor-pointer transition-colors">Admin Management</Link>
                                <li className="hover:text-luxury-bronze cursor-pointer transition-colors">Legal Archives</li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Connection</h4>
                            <ul className="text-sm space-y-4 text-stone-300">
                                <li className="hover:text-luxury-bronze cursor-pointer transition-colors">Inquire</li>
                                <li className="hover:text-luxury-bronze cursor-pointer transition-colors">Newsletter</li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] uppercase tracking-widest font-bold">
                        <p>© 2026 Stonevo Architectural. Artifact of Nature.</p>
                        {import.meta.env.VITE_ENABLE_ADMIN === 'true' && (
                            <Link to="/internal-management-stonevo-9921" className="text-stone-700 hover:text-luxury-bronze transition-colors py-2 px-4 border border-stone-800/50">Admin Interface</Link>
                        )}
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Home;
