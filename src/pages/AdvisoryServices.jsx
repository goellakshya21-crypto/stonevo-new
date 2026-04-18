import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheck, Search, Shield, Gem, ArrowRight, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import StoneSelectionForm from '../components/StoneSelectionForm';
import { useRequirements } from '../context/RequirementsContext';

const AdvisoryServices = () => {
    const [auditFormInfo, setAuditFormInfo] = useState({ name: '', phone: '', quoteDetails: '' });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [inventory, setInventory] = useState([]);

    const { 
        isConfiguratorOpen, 
        setIsConfiguratorOpen, 
        saveRequirements, 
        updateActiveDraft,
        stoneCount,
        activeDraft
    } = useRequirements();

    useEffect(() => {
        fetchInventory();
    }, []);

    // Centralized fetch handled by context

    const fetchInventory = async () => {
        try {
            const { data, error } = await supabase
                .from('stones')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            const transformedData = (data || []).map(item => ({
                ...item,
                application: item.application || (item.type === 'Marble' ? 'Flooring' : item.type)
            }));
            setInventory(transformedData);
        } catch (err) {
            console.error('Error fetching inventory:', err);
        }
    };

    const handleSaveRequirements = async (data) => {
        const result = await saveRequirements(data);
        if (result.success) {
            alert("Requirements saved successfully to our institutional database.");
        } else {
            alert(`Save failed: ${result.error}`);
        }
    };


    const handleAuditSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        // Simple submission to project_requirements or leads logic would go here.
        // Assuming we have a standard leads mechanism or we just log to project_requirements.
        const leadId = localStorage.getItem('stonevo_lead_id') || 'GUEST_' + Math.random().toString(36).substring(7);
        
        try {
             // For now, we reuse project_requirements as a generic inbox for inquiries
             const { error } = await supabase.from('project_requirements').upsert({
                lead_id: leadId,
                status: 'audit_requested',
                data: {
                    ...auditFormInfo,
                    service: 'Stone Audit Inquiry'
                },
                updated_at: new Date().toISOString()
            }, { onConflict: 'lead_id' });

            if (error) throw error;
            setSubmitted(true);
        } catch (err) {
            console.error("Error submitting audit request:", err);
            alert("Failed to submit request. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-stone-950 text-stone-200 font-sans selection:bg-luxury-bronze/30">
            {/* Navigation Header */}
            <header className="w-full border-b border-white/5 bg-stone-950/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-6 h-6 text-luxury-bronze border border-luxury-bronze flex items-center justify-center transform rotate-45">
                             <div className="w-3 h-3 border-[0.5px] border-luxury-bronze transform -rotate-45" />
                        </div>
                        <h1 className="font-serif text-xl font-semibold tracking-widest text-white">STONEVO</h1>
                    </Link>
                    <nav className="hidden md:flex items-center gap-10">
                        <Link to="/" className="text-xs uppercase tracking-[0.2em] text-stone-400 hover:text-white transition-colors">Gallery</Link>
                        <button 
                            onClick={() => setIsConfiguratorOpen(true)} 
                            className="bg-luxury-bronze text-stone-950 px-5 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-bronze transition-all flex items-center gap-2"
                        >
                            {stoneCount > 0 ? `Requirements (${stoneCount})` : 'Add Requirement'}
                        </button>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative py-24 md:py-32 overflow-hidden flex flex-col items-center justify-center">
                <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuA8V6FefDxODr-gE99KmfKBpOaa7ttQxkZ43OooLIpRStirrlnpEbS74TLoks1cTJC7WIE05o0WSG1rrobP6A11bk4cdMgnZc3C8vmpO02BkFSzx2EBW-SHM-x_k8sPmgLv28tIpN7XsPjzR0044NOm-tdNaobs0RJZt9yLnddY2-82SmOdaItBgqdiMXLbbJVFuQ2K8_r67GJq2rLXJtBzohjaCvwJjo_0DsFjPUboYWOcOscR61Go52debRHXQR7AtYtvl2TNuyrv')] bg-cover bg-center mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-stone-950 via-transparent to-stone-950"></div>
                
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-serif text-5xl md:text-7xl text-luxury-cream mb-6"
                    >
                        Advisory & Execution
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-lg md:text-xl text-stone-400 font-light max-w-2xl mx-auto leading-relaxed"
                    >
                        From risk mitigation to white-glove delivery, our expertise ensures your architectural vision is executed with flawless material integrity.
                    </motion.p>
                </div>
            </section>

            {/* Services Funnel */}
            <section className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Tier 1: Stone Audit */}
                    <div className="bg-stone-900 border border-luxury-bronze/30 p-8 rounded-2xl relative overflow-hidden group hover:border-luxury-bronze transition-colors duration-500">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Search size={120} />
                        </div>
                        <div className="inline-flex items-center justify-center p-3 bg-luxury-bronze/10 text-luxury-bronze rounded-xl mb-6">
                            <ShieldCheck size={28} />
                        </div>
                        <h3 className="font-serif text-3xl text-white mb-2">1. Stone Audit</h3>
                        <p className="text-stone-400 text-sm mb-6 min-h-[60px]">
                            Quality check, price benchmarking, alternative suggestions, and critical risk flags for your existing quotes.
                        </p>
                        <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-3 text-sm text-stone-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-luxury-bronze" /> <span>Quality Verification</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-stone-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-luxury-bronze" /> <span>Price Benchmarking</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-stone-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-luxury-bronze" /> <span>Risk Identification</span>
                            </div>
                        </div>
                        <div className="pt-6 border-t border-white/10 mb-8">
                            <p className="text-luxury-bronze font-serif text-xl">₹5,000 - ₹25,000</p>
                        </div>
                        
                        <div className="bg-stone-950 p-6 rounded-xl border border-white/5">
                            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-widest">Request an Audit</h4>
                            {submitted ? (
                                <div className="text-center py-4">
                                    <ShieldCheck className="mx-auto text-green-500 mb-2" size={32} />
                                    <p className="text-sm text-stone-300">Request received. Our team will contact you shortly.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleAuditSubmit} className="space-y-4">
                                    <input required placeholder="Name / Firm" value={auditFormInfo.name} onChange={e => setAuditFormInfo({...auditFormInfo, name: e.target.value})} className="w-full bg-stone-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-luxury-bronze text-white" />
                                    <input required type="tel" placeholder="Phone Number" value={auditFormInfo.phone} onChange={e => setAuditFormInfo({...auditFormInfo, phone: e.target.value})} className="w-full bg-stone-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-luxury-bronze text-white" />
                                    <textarea placeholder="Briefly describe the stone/quote you want audited..." value={auditFormInfo.quoteDetails} onChange={e => setAuditFormInfo({...auditFormInfo, quoteDetails: e.target.value})} className="w-full bg-stone-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-luxury-bronze text-white h-24 resize-none" />
                                    <button disabled={submitting} type="submit" className="w-full bg-luxury-bronze hover:bg-bronze text-stone-950 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                                        {submitting ? 'Submitting...' : 'Initiate Audit'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Tier 2: Curated Sourcing */}
                    <div className="bg-stone-900 border border-white/5 p-8 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-colors duration-500 flex flex-col">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Gem size={120} />
                        </div>
                        <div className="inline-flex items-center justify-center p-3 bg-white/5 text-stone-300 rounded-xl mb-6">
                             <Search size={28} />
                        </div>
                        <h3 className="font-serif text-3xl text-white mb-2">2. Curated Sourcing</h3>
                        <p className="text-stone-400 text-sm mb-6 min-h-[60px]">
                            We shortlist the best slabs, arrange viewings, and relentlessly negotiate on your behalf.
                        </p>
                        <div className="space-y-3 mb-8 flex-1">
                            <div className="flex items-center gap-3 text-sm text-stone-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-stone-500" /> <span>Curated Shortlisting</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-stone-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-stone-500" /> <span>Exclusive Viewings</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-stone-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-stone-500" /> <span>Handling Negotiation</span>
                            </div>
                        </div>
                         <div className="pt-6 border-t border-white/10 mb-8">
                            <p className="text-stone-300 font-serif text-xl">Deducted if deal closes</p>
                        </div>
                        <button onClick={() => setIsConfiguratorOpen(true)} className="w-full border border-white/20 hover:border-white hover:bg-white text-white hover:text-stone-950 font-bold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 mt-auto group">
                            {stoneCount > 0 ? (
                                <>View Project Requirements ({stoneCount}) <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></>
                            ) : (
                                <>Add Project Requirements <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></>
                            )}
                        </button>
                    </div>

                    {/* Tier 3: End-to-End Execution */}
                    <div className="bg-stone-900 border border-white/5 p-8 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-colors duration-500 flex flex-col">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Shield size={120} />
                        </div>
                         <div className="inline-flex items-center justify-center p-3 bg-white/5 text-stone-300 rounded-xl mb-6">
                            <Shield size={28} />
                        </div>
                        <h3 className="font-serif text-3xl text-white mb-2">3. End-to-End</h3>
                        <p className="text-stone-400 text-sm mb-6 min-h-[60px]">
                            Our premium white-glove service. We source, negotiate, deliver, and manage everything.
                        </p>
                        <div className="space-y-3 mb-8 flex-1">
                            <div className="flex items-center gap-3 text-sm text-stone-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-stone-500" /> <span>Complete Sourcing</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-stone-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-stone-500" /> <span>Logistics & Delivery</span>
                            </div>
                             <div className="flex items-center gap-3 text-sm text-stone-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-stone-500" /> <span>Installation Management</span>
                            </div>
                        </div>
                         <div className="pt-6 border-t border-white/10 mb-8">
                            <p className="text-stone-300 font-serif text-xl">Premium Margin Structure</p>
                        </div>
                         <button onClick={() => window.location.href='mailto:contact@stonevo.com'} className="w-full border border-white/20 hover:border-white hover:bg-white text-white hover:text-stone-950 font-bold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 mt-auto">
                            Contact Us <ChevronRight size={18} />
                        </button>
                    </div>

                </div>
            </section>

            <StoneSelectionForm
                isOpen={isConfiguratorOpen}
                onClose={() => setIsConfiguratorOpen(false)}
                onSubmit={handleSaveRequirements}
                onChange={(data) => {
                    updateActiveDraft(data);
                }}
                initialData={activeDraft}
                inventory={inventory}
            />
        </div>
    );
};

export default AdvisoryServices;
