import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { Phone, Mail, Building, Globe, User, ShieldCheck, Compass, Hammer } from 'lucide-react';

const LeadGate = ({ children }) => {
    const [status, setStatus] = useState('loading'); // 'loading', 'unregistered', 'otp_sent', 'whitelist_check', 'registration', 'pending', 'welcome', 'approved'
    const [step, setStep] = useState('PHONE'); // 'PHONE', 'OTP', 'FORM', 'ROLE_SELECTION'
    const [role, setRoleState] = useState(null);
    const [welcomeName, setWelcomeName] = useState('');
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        company_name: '',
        website: '',
        gst_number: ''
    });
    const [otp, setOtp] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkLeadStatus();
    }, []);

    const checkLeadStatus = async () => {
        const storedLeadId = localStorage.getItem('stonevo_lead_id');

        if (!storedLeadId) {
            setStatus('unregistered');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('leads')
                .select('status, phone, full_name, company_name, email, website, gst_number, role')
                .eq('id', storedLeadId)
                .single();

            if (error || !data) {
                localStorage.removeItem('stonevo_lead_id');
                setStatus('unregistered');
                return;
            }

            setFormData(data);
            setRoleState(data.role || 'architect'); // Default to architect if no role
            setStatus(data.status);
        } catch (err) {
            console.error('Status check failed:', err);
            setStatus('unregistered');
        }
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            // Clean phone number (remove spaces, dashes)
            const cleanPhone = formData.phone.replace(/\D/g, '');
            if (cleanPhone.length < 10) throw new Error('Invalid phone number');

            // In Magic Code mode, we don't call Supabase Auth
            // We just proceed to the OTP entry screen
            setStep('OTP');
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const [diagnostics, setDiagnostics] = useState(null);

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setDiagnostics('Starting verification phase...');

        try {
            // MAGIC CODE CHECK (123456)
            if (otp !== '123456') {
                throw new Error('Invalid verification code. Please use 123456 for testing.');
            }

            // Normalize: remove all non-digits and take last 10 digits
            const digits = formData.phone.replace(/\D/g, '');
            const cleanPhone = digits.slice(-10);

            // SUPER WHITELIST (Hardcoded Fallback for testing)
            const superWhitelist = {
                '7678320944': { name: 'Lakshya', role: 'architect' },
                '7042353166': { name: 'JJ', role: 'builder' }
            };

            let whitelistData = null;
            let finalName = '';

            if (superWhitelist[cleanPhone]) {
                finalName = superWhitelist[cleanPhone].name;
                whitelistData = {
                    full_name: finalName,
                    role: superWhitelist[cleanPhone].role
                };
                setDiagnostics(`SUPER WHITELIST MATCH: ${finalName} (${whitelistData.role})!`);
            } else {
                setDiagnostics(`Checking professional database for ${cleanPhone}...`);
                const { data: dbData } = await supabase
                    .from('architect_whitelist')
                    .select('*')
                    .eq('phone_number', cleanPhone)
                    .single();

                if (dbData) {
                    whitelistData = dbData;
                    finalName = dbData.full_name;
                }
            }

            if (whitelistData) {
                // Auto-approve (FORCE status to 'approved' even if it was 'pending')
                const { data: leadData, error: leadError } = await supabase
                    .from('leads')
                    .upsert({
                        phone: cleanPhone,
                        full_name: finalName,
                        email: `${cleanPhone}@stonevo.pro`, // Dummy email to satisfy NOT NULL constraint
                        status: 'approved',
                        role: whitelistData.role || 'architect',
                        last_active: new Date().toISOString()
                    }, { onConflict: 'phone' })
                    .select()
                    .single();

                if (leadError) throw leadError;
                localStorage.setItem('stonevo_lead_id', leadData.id);

                setRoleState(whitelistData.role || 'architect');
                setWelcomeName(finalName);
                setStatus('welcome');
                setTimeout(() => setStatus('approved'), 2500);
            } else {
                // FALLBACK: Check if they are already in the Leads table and approved
                setDiagnostics(`Searching existing approved accounts for ${cleanPhone}...`);
                const { data: existingLead } = await supabase
                    .from('leads')
                    .select('*')
                    .eq('phone', cleanPhone)
                    .eq('status', 'approved')
                    .maybeSingle();

                if (existingLead) {
                    setDiagnostics(`RECOVERED: Approved account found for ${existingLead.full_name}!`);
                    localStorage.setItem('stonevo_lead_id', existingLead.id);
                    setRoleState(existingLead.role || 'architect');
                    setFormData(existingLead);
                    setWelcomeName(existingLead.full_name);
                    setStatus('welcome');
                    setTimeout(() => setStatus('approved'), 2500);
                } else {
                    setDiagnostics(`NO MATCH for phone "${cleanPhone}" in any database.`);
                    setStep('FORM');
                }
            }
        } catch (err) {
            setError(err.message || 'Verification failed');
            setDiagnostics(`CRITICAL FAILURE: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const finalizeRegistration = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const cleanPhone = formData.phone.replace(/\D/g, '');
            const { data, error } = await supabase
                .from('leads')
                .upsert({
                    ...formData,
                    phone: cleanPhone,
                    status: 'pending'
                }, { onConflict: 'phone' })
                .select()
                .single();

            if (error) throw error;

            localStorage.setItem('stonevo_lead_id', data.id);

            // Success! Stay in pending state for vetting.
            setStatus('pending');
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const resetSession = () => {
        localStorage.removeItem('stonevo_lead_id');
        window.location.reload();
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (status === 'loading') {
        return (
            <div className="fixed inset-0 bg-stone-950 flex items-center justify-center z-[100]">
                <div className="w-12 h-12 border-2 border-bronze/20 border-t-bronze rounded-full animate-spin"></div>
            </div>
        );
    }

    if (status === 'approved' || status === 'welcome') {
        return (
            <>
                <div className={`transition-all duration-1000 ${status === 'welcome' ? 'blur-xl scale-[1.02] pointer-events-none' : 'blur-0'}`}>
                    {typeof children === 'function' ? children(role) : children}
                </div>

                <AnimatePresence>
                    {status === 'welcome' && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/20 backdrop-blur-sm">
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                className="relative z-10 w-full max-w-lg mx-4 text-center"
                            >
                                <div className="glass-panel p-16 rounded-3xl border border-bronze/50 shadow-[0_0_60px_rgba(182,141,64,0.25)] backdrop-blur-3xl space-y-10 relative overflow-hidden group">
                                    {/* Decorative background glow */}
                                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-bronze/20 blur-[100px] rounded-full group-hover:bg-bronze/30 transition-all duration-1000" />
                                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-bronze/20 blur-[100px] rounded-full group-hover:bg-bronze/30 transition-all duration-1000" />
                                    
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.2, duration: 0.8 }}
                                        className="relative"
                                    >
                                        <div className="w-24 h-24 bg-gradient-to-br from-bronze/30 to-bronze/10 rounded-full flex items-center justify-center mx-auto mb-8 relative border border-bronze/40">
                                            <div className="absolute inset-0 rounded-full bg-bronze/10 animate-pulse" />
                                            <ShieldCheck size={48} className="text-bronze relative z-10" />
                                        </div>
                                    </motion.div>

                                    <div className="space-y-4 relative z-10">
                                        <motion.h2 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4, duration: 0.8 }}
                                            className="text-5xl md:text-6xl font-serif text-white italic drop-shadow-sm"
                                        >
                                            Welcome
                                        </motion.h2>
                                        <motion.p 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.7, duration: 1 }}
                                            className="text-3xl md:text-4xl font-light text-luxury-cream tracking-tight drop-shadow-md"
                                        >
                                            {welcomeName}
                                        </motion.p>
                                    </div>

                                    <motion.div 
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: '100%' }}
                                        transition={{ delay: 1, duration: 1.2 }}
                                        className="pt-10 space-y-4"
                                    >
                                        <div className="flex flex-col items-center gap-3">
                                            <p className="text-bronze/80 font-display text-[11px] uppercase tracking-[0.6em] font-semibold leading-none">
                                                Access Granted
                                            </p>
                                            <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-bronze/60 to-transparent"></div>
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <button
                    onClick={resetSession}
                    className="fixed bottom-4 left-4 z-[300] px-4 py-2 bg-black/80 border border-white/10 rounded-full text-[10px] text-stone-400 hover:text-bronze uppercase tracking-widest transition-all backdrop-blur-md opacity-50 hover:opacity-100 shadow-2xl"
                >
                    Reset Verification (Testing)
                </button>
            </>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-stone-950">
                <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8V6FefDxODr-gE99KmfKBpOaa7ttQxkZ43OooLIpRStirrlnpEbS74TLoks1cTJC7WIE05o0WSG1rrobP6A11bk4cdMgnZc3C8vmpO02BkFSzx2EBW-SHM-x_k8sPmgLv28tIpN7XsPjzR0044NOm-tdNaobs0RJZt9yLnddY2-82SmOdaItBgqdiMXLbbJVFuQ2K8_r67GJq2rLXJtBzohjaCvwJjo_0DsFjPUboYWOcOscR61Go52debRHXQR7AtYtvl2TNuyrv"
                    alt="Background"
                    className="w-full h-full object-cover opacity-20 scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-transparent to-stone-950" />
            </div>

            <AnimatePresence mode="wait">
                {status === 'pending' ? (
                    <motion.div
                        key="pending"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative z-10 w-full max-w-lg mx-4 text-center"
                    >
                        <div className="glass-panel p-16 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl space-y-8">
                            <div className="w-20 h-20 bg-bronze/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck size={40} className="text-bronze" />
                            </div>
                            <h2 className="text-4xl font-serif text-luxury-cream italic">Vetting in Progress</h2>
                            <p className="text-stone-400 text-sm leading-relaxed font-light">
                                Our curators are currently reviewing your professional credentials to ensure the integrity of the Stonevo collection.
                            </p>
                            <div className="space-y-2 pt-6">
                                <p className="text-bronze font-display text-[10px] uppercase tracking-[0.4em]">Status: Pending Verification</p>
                                <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-bronze to-transparent mx-auto"></div>
                            </div>
                            <button
                                onClick={checkLeadStatus}
                                className="mt-8 text-[10px] font-bold text-stone-400 hover:text-bronze transition-colors uppercase tracking-[0.3em]"
                            >
                                Re-verify Status
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="gate"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative z-10 w-full max-w-xl mx-4"
                    >
                        <div className="glass-panel p-10 md:p-14 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl">
                            <div className="text-center mb-10">
                                <h1 className="text-4xl md:text-5xl font-serif text-luxury-cream mb-4 italic">Architectural Gate</h1>
                                <p className="text-bronze font-display text-xs uppercase tracking-[0.3em]">Institutional Access Only</p>
                            </div>

                            {step === 'PHONE' && (
                                <form onSubmit={handleSendOTP} className="space-y-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2">
                                            <Phone size={12} className="text-bronze" /> Mobile Number
                                        </label>
                                        <input
                                            required
                                            type="tel"
                                            placeholder="Enter your registered mobile number"
                                            className="w-full bg-white/5 border-b border-white/10 py-4 text-2xl text-luxury-cream focus:outline-none focus:border-bronze transition-colors placeholder:text-stone-700"
                                            value={formData.phone}
                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-5 bg-bronze text-white font-serif tracking-[0.2em] uppercase text-sm hover:bg-white hover:text-stone-950 transition-all shadow-xl shadow-bronze/10 flex items-center justify-center gap-3"
                                    >
                                        {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Send Verification Code'}
                                    </button>
                                </form>
                            )}

                            {step === 'OTP' && (
                                <form onSubmit={handleVerifyOTP} className="space-y-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2">
                                            Verification Code
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            maxLength={6}
                                            placeholder="· · · · · ·"
                                            className="w-full bg-white/5 border-b border-white/10 py-4 text-4xl tracking-[0.5em] text-center text-luxury-cream focus:outline-none focus:border-bronze transition-colors placeholder:text-stone-700"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                        />
                                        <p className="text-[10px] text-stone-500 mt-2">Enter the 6-digit code sent to your phone.</p>

                                        {diagnostics && (
                                            <p className="mt-4 text-[9px] text-bronze/60 font-mono tracking-tighter uppercase italic bg-bronze/5 p-2 rounded border border-bronze/10">
                                                [Log] {diagnostics}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-5 bg-bronze text-white font-serif tracking-[0.2em] uppercase text-sm hover:bg-white hover:text-stone-950 transition-all shadow-xl shadow-bronze/10 flex items-center justify-center gap-3"
                                    >
                                        {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Verify & Enter'}
                                    </button>
                                    <button onClick={() => setStep('PHONE')} className="w-full text-[10px] font-bold text-stone-500 uppercase tracking-widest hover:text-bronze">Change Number</button>
                                </form>
                            )}

                            {step === 'FORM' && (
                                <form onSubmit={finalizeRegistration} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2"><User size={12} className="text-bronze" /> Full Name</label>
                                            <input required type="text" className="w-full bg-white/5 border-b border-white/10 py-2 text-luxury-cream focus:outline-none focus:border-bronze transition-colors" value={formData.full_name} onChange={(e) => handleInputChange('full_name', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2"><Mail size={12} className="text-bronze" /> Email</label>
                                            <input required type="email" className="w-full bg-white/5 border-b border-white/10 py-2 text-luxury-cream focus:outline-none focus:border-bronze transition-colors" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2"><Building size={12} className="text-bronze" /> Firm Name</label>
                                            <input required type="text" className="w-full bg-white/5 border-b border-white/10 py-2 text-luxury-cream focus:outline-none focus:border-bronze transition-colors" value={formData.company_name} onChange={(e) => handleInputChange('company_name', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2">GST Number</label>
                                            <input required type="text" placeholder="22AAAAA0000A1Z5" className="w-full bg-white/5 border-b border-white/10 py-2 text-luxury-cream focus:outline-none focus:border-bronze transition-colors" value={formData.gst_number} onChange={(e) => handleInputChange('gst_number', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2"><Globe size={12} className="text-bronze" /> Website</label>
                                        <input required type="url" className="w-full bg-white/5 border-b border-white/10 py-2 text-luxury-cream focus:outline-none focus:border-bronze transition-colors" value={formData.website} onChange={(e) => handleInputChange('website', e.target.value)} />
                                    </div>
                                    <button type="submit" disabled={submitting} className="w-full py-5 bg-bronze text-white font-serif tracking-[0.2em] uppercase text-sm hover:bg-white hover:text-stone-950 transition-all shadow-xl shadow-bronze/10">
                                        {submitting ? "Submitting..." : "Complete Registration"}
                                    </button>
                                </form>
                            )}

                            {error && <p className="mt-4 text-red-400 text-xs italic bg-red-400/10 p-3 rounded">{error}</p>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={resetSession}
                className="fixed bottom-4 left-4 z-[110] text-[8px] text-stone-700 hover:text-bronze uppercase tracking-widest transition-colors opacity-50 hover:opacity-100"
            >
                Reset Session (Testing)
            </button>
        </div>
    );
};

export default LeadGate;
