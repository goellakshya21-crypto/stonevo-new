import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, ArrowRight, FileText, Plus } from 'lucide-react';
import ImageModal from '../components/ImageModal';
import StoneSelectionForm from '../components/StoneSelectionForm';

const SYNTHETIC_LOTS = [
    { id: 'syn-1', name: 'Statuario Extra Premium', image_url: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?auto=format&fit=crop&q=80&w=800', price_range: '1250', lot_size_sqft: 1850, vendor_address: 'Kishangarh, Rajasthan', description: 'Rare extra-white Statuario with bold dramatic veining.', color: 'White', application: 'Flooring', variation: 'High', brightness: 95, luminous_grade: 98, quarry: 'Carrara, Italy', status: 'In Stock' },
    { id: 'syn-2', name: 'Calacatta Gold Select', image_url: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?auto=format&fit=crop&q=80&w=800', price_range: '950', lot_size_sqft: 1200, vendor_address: 'Makrana Heritage Block', description: 'Classic Calacatta with warm gold undertones.', color: 'Golden White', application: 'Bathroom', variation: 'Medium', brightness: 90, luminous_grade: 92, quarry: 'Vagli, Italy', status: 'In Stock' },
    { id: 'syn-3', name: 'Armani Grey Luxury', image_url: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&q=80&w=800', price_range: '450', lot_size_sqft: 2400, vendor_address: 'Silvassa Processing Unit', description: 'Sophisticated grey marble with a velvet finish.', color: 'Grey', application: 'Flooring', variation: 'Low', brightness: 80, luminous_grade: 75, quarry: 'Iran Premium', status: '4 Week Lead' },
    { id: 'syn-4', name: 'Michaelangelo White', image_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=800', price_range: '850', lot_size_sqft: 950, vendor_address: 'Bangalore Export Hub', description: 'Artistic white marble with painterly grey swirls.', color: 'White/Grey', application: 'Wall Cladding', variation: 'High', brightness: 88, luminous_grade: 85, quarry: 'Makrana, India', status: 'In Stock' },
    { id: 'syn-5', name: 'Nero Marquina Classic', image_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800', price_range: '380', lot_size_sqft: 3100, vendor_address: 'Spain Imported Stock', description: 'Deep black marble with striking white lightning veins.', color: 'Black', application: 'Exterior', variation: 'Medium', brightness: 10, luminous_grade: 15, quarry: 'Spain', status: 'Limited' },
    { id: 'syn-6', name: 'Botoccino Royal', image_url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800', price_range: '320', lot_size_sqft: 4500, vendor_address: 'Italy Direct Import', description: 'Creamy beige marble with subtle earth tones.', color: 'Beige', application: 'Flooring', variation: 'Low', brightness: 85, luminous_grade: 80, quarry: 'Italy', status: 'In Stock' },
    { id: 'syn-7', name: 'Blue Pearl Granite', image_url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800', price_range: '550', lot_size_sqft: 1500, vendor_address: 'Norway Premium Quarries', description: 'Stunning blue crystals embedded in a dark matrix.', color: 'Blue/Grey', application: 'Countertop', variation: 'Medium', brightness: 60, luminous_grade: 65, quarry: 'Norway', status: '4 Week Lead' },
    { id: 'syn-8', name: 'Alaska White Granite', image_url: 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&q=80&w=800', price_range: '280', lot_size_sqft: 2800, vendor_address: 'Brazil Sourced Lot', description: 'Frosty white background with translucent quartz fragments.', color: 'White/Silver', application: 'Exterior', variation: 'High', brightness: 82, luminous_grade: 80, quarry: 'Brazil', status: 'In Stock' },
    { id: 'syn-9', name: 'Rosso Verona', image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800', price_range: '420', lot_size_sqft: 1100, vendor_address: 'Verona, Italy', description: 'Warm reddish-orange marble with historical charm.', color: 'Red', application: 'Wall Cladding', variation: 'Medium', brightness: 40, luminous_grade: 35, quarry: 'Italy', status: 'In Stock' }
];

const BuilderPortal = () => {
    const [lots, setLots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
    const [projectRequirements, setProjectRequirements] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

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
                setLastUpdated(data.updated_at);
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
            setLastUpdated(timestamp);
            alert("Draft saved successfully to our institutional database.");
            setIsConfiguratorOpen(false);
        } catch (err) {
            console.error('Error saving requirements:', err);
            alert(`Save failed: ${err.message}. Please ensured the database table exists.`);
        }
    };

    const fetchSmallLots = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('stones')
                .select('*')
                .eq('lot_type', 'small_lot')
                .order('created_at', { ascending: false });

            if (error) throw error;
            // Merge live data with synthetic data
            setLots([...(data || []), ...SYNTHETIC_LOTS]);
        } catch (err) {
            console.error('Error fetching small lots:', err);
            // Fallback to only synthetic data if Supabase fails
            setLots(SYNTHETIC_LOTS);
        } finally {
            setLoading(false);
        }
    };


    const [activeFilter, setActiveFilter] = useState('All');
    const filters = ['All', 'Flooring', 'Bathroom', 'Countertop', 'Wall Cladding', 'Exterior'];

    const filteredLots = activeFilter === 'All'
        ? lots
        : lots.filter(lot => {
            const app = lot.application || lot.type;
            return app === activeFilter;
        });

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
                        <a className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#181611]/60 hover:text-[#181611] dark:text-slate-400 dark:hover:text-white transition-colors" href="#">Gallery</a>
                        <a className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#181611]/60 hover:text-[#181611] dark:text-slate-400 dark:hover:text-white transition-colors" href="#">Projects</a>
                        <a className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#181611]/60 hover:text-[#181611] dark:text-slate-400 dark:hover:text-white transition-colors" href="#">About</a>
                    </nav>
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setIsConfiguratorOpen(true)}
                            className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#eca413] hover:text-[#eca413]/80 transition-colors flex items-center gap-2"
                        >
                            {projectRequirements ? (
                                <><FileText size={14} /> Edit Draft</>
                            ) : (
                                <><Plus size={14} /> Requirements</>
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
                        The Selection
                    </motion.h2>
                    <div className="flex items-center justify-center gap-8 md:gap-16 border-b border-[#897c61]/10 pb-4">
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
                        {filteredLots.map((lot) => (
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

            <ImageModal
                isOpen={!!selectedSlot}
                onClose={() => setSelectedSlot(null)}
                marble={selectedSlot ? {
                    name: selectedSlot.name,
                    imageUrl: selectedSlot.image_url,
                    description: selectedSlot.description,
                    physical_properties: {
                        color: selectedSlot.color,
                        priceRange: selectedSlot.price_range,
                        application: selectedSlot.application || selectedSlot.type,
                        pattern: selectedSlot.variation,
                        brightness: selectedSlot.brightness
                    }
                } : null}
            />
        </div >
    );
};

export default BuilderPortal;
