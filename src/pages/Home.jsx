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

const ITEMS_PER_PAGE = 50;
const SYNTHETIC_MARBLES = [];

function Home() {
    const [marbles, setMarbles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStone, setSelectedStone] = useState(null);
    const [visualizationData, setVisualizationData] = useState(null);
    const [stoneContextList, setStoneContextList] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    
    const { 
        isConfiguratorOpen, 
        setIsConfiguratorOpen, 
        addToRequirements, 
        saveRequirements, 
        updateActiveDraft,
        stoneCount,
        activeDraft
    } = useRequirements();

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
        return result.filter(marble => {
            const p = marble.physical_properties;
            const hasOverlap = (filterArr, stoneArr) =>
                filterArr.length === 0 || filterArr.some(v => [].concat(stoneArr || []).includes(v));
            if (!hasOverlap(filters.marble, p.marble)) return false;
            if (!hasOverlap(filters.color, p.color)) return false;
            if (!hasOverlap(filters.finish, p.finish)) return false;
            if (!hasOverlap(filters.priceRange, p.priceRange)) return false;
            if (!hasOverlap(filters.application, p.application)) return false;
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
    };

    return (
        <div className="min-h-screen bg-stone-950 text-stone-200 font-sans selection:bg-luxury-bronze/30">
            <header className="absolute top-0 w-full z-50 py-6 px-8 flex justify-between items-center">
                <div />
                <nav className="flex items-center gap-6">
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
        </div>
    );
}

export default Home;
