import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, ArrowRight, FileText, Plus } from 'lucide-react';
import ImageModal from '../components/ImageModal';
import StoneSelectionForm from '../components/StoneSelectionForm';

const SYNTHETIC_LOTS = [
    { id: 'syn-1', name: 'Statuario Extra Premium', image_url: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?auto=format&fit=crop&q=80&w=800', price_range: '1250', lot_size_sqft: 1850, vendor_address: 'Kishangarh, Rajasthan', description: 'Rare extra-white Statuario with bold dramatic veining.', color: 'White', application: 'Flooring', variation: 'High', brightness: 95, luminous_grade: 98, quarry: 'Carrara, Italy' },
    { id: 'syn-2', name: 'Calacatta Gold Select', image_url: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?auto=format&fit=crop&q=80&w=800', price_range: '950', lot_size_sqft: 1200, vendor_address: 'Makrana Heritage Block', description: 'Classic Calacatta with warm gold undertones.', color: 'Golden White', application: 'Bathroom', variation: 'Medium', brightness: 90, luminous_grade: 92, quarry: 'Vagli, Italy' },
    { id: 'syn-3', name: 'Armani Grey Luxury', image_url: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&q=80&w=800', price_range: '450', lot_size_sqft: 2400, vendor_address: 'Silvassa Processing Unit', description: 'Sophisticated grey marble with a velvet finish.', color: 'Grey', application: 'Flooring', variation: 'Low', brightness: 80, luminous_grade: 75, quarry: 'Iran Premium' },
    { id: 'syn-4', name: 'Michaelangelo White', image_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=800', price_range: '850', lot_size_sqft: 950, vendor_address: 'Bangalore Export Hub', description: 'Artistic white marble with painterly grey swirls.', color: 'White/Grey', application: 'Wall Cladding', variation: 'High', brightness: 88, luminous_grade: 85, quarry: 'Makrana, India' },
    { id: 'syn-5', name: 'Nero Marquina Classic', image_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800', price_range: '380', lot_size_sqft: 3100, vendor_address: 'Spain Imported Stock', description: 'Deep black marble with striking white lightning veins.', color: 'Black', application: 'Exterior', variation: 'Medium', brightness: 10, luminous_grade: 15, quarry: 'Spain' },
    { id: 'syn-6', name: 'Botoccino Royal', image_url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800', price_range: '320', lot_size_sqft: 4500, vendor_address: 'Italy Direct Import', description: 'Creamy beige marble with subtle earth tones.', color: 'Beige', application: 'Flooring', variation: 'Low', brightness: 85, luminous_grade: 80, quarry: 'Italy' },
    { id: 'syn-7', name: 'Blue Pearl Granite', image_url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800', price_range: '550', lot_size_sqft: 1500, vendor_address: 'Norway Premium Quarries', description: 'Stunning blue crystals embedded in a dark matrix.', color: 'Blue/Grey', application: 'Countertop', variation: 'Medium', brightness: 60, luminous_grade: 65, quarry: 'Norway' },
    { id: 'syn-8', name: 'Alaska White Granite', image_url: 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&q=80&w=800', price_range: '280', lot_size_sqft: 2800, vendor_address: 'Brazil Sourced Lot', description: 'Frosty white background with translucent quartz fragments.', color: 'White/Silver', application: 'Exterior', variation: 'High', brightness: 82, luminous_grade: 80, quarry: 'Brazil' },
    { id: 'syn-9', name: 'Rosso Verona', image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800', price_range: '420', lot_size_sqft: 1100, vendor_address: 'Verona, Italy', description: 'Warm reddish-orange marble with historical charm.', color: 'Red', application: 'Wall Cladding', variation: 'Medium', brightness: 40, luminous_grade: 35, quarry: 'Italy' }
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
        <div className="min-h-screen bg-[#070707] text-stone-200 font-sans selection:bg-bronze/30">
            {/* Background Texture Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-20 mix-blend-soft-light bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>

            {/* Command Header */}
            <header className="h-24 px-10 flex items-center justify-between border-b border-white/5 bg-black/80 backdrop-blur-2xl sticky top-0 z-[60]">
                <div className="flex items-center gap-12">
                    <div className="relative group cursor-pointer">
                        <h1 className="text-3xl font-serif italic text-[#eca413] tracking-tight">Stonevo Builder Hub</h1>
                        <div className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#eca413] transition-all group-hover:w-full"></div>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-stone-500 mt-1 font-bold">Institutional Procurement</p>
                    </div>

                </div>

                <div className="flex items-center gap-8">
                    {/* Glowing CTA */}
                    <div className="flex flex-col items-end gap-1">
                        <button
                            onClick={() => setIsConfiguratorOpen(true)}
                            className="relative group px-10 py-3.5 bg-[#eca413] text-black rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(236,164,19,0.2)]"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            <span className="relative flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] font-black">
                                {projectRequirements ? (
                                    <FileText size={18} strokeWidth={3} className="transition-transform duration-500" />
                                ) : (
                                    <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
                                )}
                                {projectRequirements ? "Edit Saved Draft" : "Add Requirement"}
                            </span>
                        </button>
                        {lastUpdated && (
                            <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold px-2">
                                Last Saved: {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-6rem)] relative">
                {/* Main Content: Full Width Grid */}
                <main className="flex-1 overflow-y-auto p-12 custom-scrollbar relative">
                    <div className="max-w-7xl mx-auto space-y-12">
                        <header className="flex flex-col md:flex-row justify-between items-center gap-8">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-serif italic text-white flex items-center gap-4">
                                    Strategic Inventory
                                    <span className="text-sm font-mono text-stone-500 not-italic align-middle h-6 px-3 bg-white/5 rounded-full flex items-center border border-white/10 uppercase tracking-widest">
                                        {filteredLots.length} OPPORTUNITIES
                                    </span>
                                </h2>
                                <p className="text-stone-500 text-xs tracking-[0.2em] uppercase text-center md:text-left">Verified Institutional Marble & Granite Stock</p>
                            </div>

                            {/* Top Filter Bar */}
                            <div className="flex flex-wrap items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
                                {filters.map(filter => (
                                    <button
                                        key={filter}
                                        onClick={() => setActiveFilter(filter)}
                                        className={`px-6 py-2.5 rounded-xl text-[10px] tracking-widest uppercase transition-all flex items-center gap-2 group ${activeFilter === filter
                                            ? 'bg-[#eca413] text-black font-bold shadow-lg shadow-[#eca413]/10'
                                            : 'hover:bg-white/5 text-stone-500 hover:text-white'
                                            }`}
                                    >
                                        {filter}
                                        <div className={`w-1 h-1 rounded-full ${activeFilter === filter ? 'bg-black' : 'bg-stone-700 group-hover:bg-[#eca413]'} transition-colors`}></div>
                                    </button>
                                ))}
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            <AnimatePresence mode='popLayout'>
                                {filteredLots.map((lot) => (
                                    <motion.div
                                        key={lot.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-white/10 border border-white/10 rounded-[2rem] overflow-hidden group hover:border-[#eca413] transition-all duration-500 flex flex-col shadow-2xl hover:shadow-[#eca413]/5"
                                    >
                                        <div
                                            className="h-64 overflow-hidden cursor-zoom-in relative"
                                            onClick={() => setSelectedSlot(lot)}
                                        >
                                            <img src={lot.image_url} alt={lot.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />

                                            {/* Top Overlay Badge */}
                                            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
                                                <div className="p-1.5 bg-[#eca413]/20 rounded-lg">
                                                    <Tag size={14} className="text-[#eca413]" />
                                                </div>
                                                <div>
                                                    <p className="text-[8px] uppercase tracking-widest text-stone-500 font-bold">List Price</p>
                                                    <p className="text-xs font-mono font-black text-white">₹{lot.price_range}<span className="text-[9px] text-stone-400 font-normal">/SF</span></p>
                                                </div>
                                            </div>

                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                                        </div>

                                        <div className="p-7 flex-1 flex flex-col justify-between space-y-6">
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-serif italic text-2xl text-white group-hover:text-[#eca413] transition-colors">{lot.name}</h3>
                                                        <p className="text-[10px] text-[#eca413] uppercase tracking-[0.2em] mt-1 font-bold">{lot.application || lot.type}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-white/5">
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">Lot Volume</p>
                                                        <p className="text-sm font-mono text-stone-200">{lot.lot_size_sqft} SQ.FT</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">Quarry</p>
                                                        <p className="text-sm font-mono text-stone-200 truncate">{lot.quarry || 'Italy'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] uppercase tracking-widest text-stone-500 font-black mb-1">Luminous Grade</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-[#eca413] transition-all duration-1000"
                                                                style={{ width: `${lot.luminous_grade || 85}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-mono text-[#eca413]">{lot.luminous_grade || 85}%</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedSlot(lot)}
                                                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-stone-400 group-hover:text-[#eca413] group-hover:border-[#eca413]/30 transition-all"
                                                >
                                                    <ArrowRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </main>
            </div>

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
        </div>
    );
};

export default BuilderPortal;
