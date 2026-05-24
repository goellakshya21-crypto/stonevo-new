import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Phone, Mail, Building, Globe, User, ShieldCheck, Compass, Hammer, X } from 'lucide-react';
import { useRequirements } from '../context/RequirementsContext';

const LeadGate = ({ children }) => {
    const { setLeadId: setContextLeadId, clearSession } = useRequirements();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // 'loading', 'unregistered', 'otp_sent', 'whitelist_check', 'registration', 'pending', 'welcome', 'approved'
    const [step, setStep] = useState('PHONE'); // 'PHONE', 'OTP', 'NEW_USER_ROLE', 'FORM', 'CLIENT_REQUEST', 'ROLE_SELECTION'
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
    const [pendingLead, setPendingLead] = useState(null); // Data after verification but before role choice

    useEffect(() => {
        checkLeadStatus();
    }, []);

    const logLogin = async (phone, name, role) => {
        try {
            await supabase.from('login_events').insert({
                phone_number: phone,
                user_name: name,
                role,
                logged_in_at: new Date().toISOString()
            });
        } catch {
            // Silently skip — table may not exist yet
        }
    };

    const promoteUnverifiedRequests = async (archPhone) => {
        try {
            const { data: unverified } = await supabase
                .from('leads')
                .select('id')
                .eq('company_name', `UNVERIFIED_ARCHITECT:${archPhone}`);

            if (unverified?.length) {
                await supabase
                    .from('leads')
                    .update({ company_name: `PENDING_REQUEST:${archPhone}` })
                    .eq('company_name', `UNVERIFIED_ARCHITECT:${archPhone}`);
            }
        } catch (err) {
            console.error('Failed to promote unverified requests:', err);
        }
    };

    const checkLeadStatus = async () => {
        const storedLeadId = localStorage.getItem('stonevo_lead_id');

        if (!storedLeadId) {
            // Brand-new visitor — send to About page unless they came from there
            if (!sessionStorage.getItem('sv_enter')) {
                navigate('/about', { replace: true });
                return;
            }
            setStatus('unregistered');
            return;
        }

        // --- SELF-CLEANING SHIELD ---
        // If the stored ID is not a valid UUID (like '1234567890'), delete it to prevent a crash.
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(storedLeadId)) {
            localStorage.removeItem('stonevo_lead_id');
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
            setRoleState(data.role || 'architect');
            if ((data.role === 'architect' || !data.role) && data.phone) {
                promoteUnverifiedRequests(data.phone);
            }
            // Log every visit where the session is already active
            if (data.status === 'approved') {
                logLogin(data.phone, data.full_name, data.role || 'architect');
            }
            setStatus(data.status);
        } catch (err) {
            console.error('Status check failed:', err);
            setStatus('unregistered');
        }
    };

    // ── Numbers that skip SMS entirely — no charge, use OTP 000000 ────────────
    const DEV_NUMBERS = ['7678320944', '7042353166'];

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const digits = formData.phone.replace(/\D/g, '');
            if (digits.length < 10) throw new Error('Please enter a valid 10-digit phone number');
            const cleanPhone = digits.slice(-10);

            // Dev numbers — skip SMS, go straight to OTP screen
            if (DEV_NUMBERS.includes(cleanPhone)) {
                setStep('OTP');
                return;
            }

            const { data, error } = await supabase.functions.invoke('send-otp', {
                body: { phone: cleanPhone },
            });
            if (error) {
                let msg = error.message;
                try { const b = await error.context?.json?.(); if (b?.error) msg = b.error; } catch {}
                throw new Error(msg);
            }
            if (data?.error) throw new Error(data.error);

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
            // Normalize: remove all non-digits and take last 10 digits
            const digits = formData.phone.replace(/\D/g, '');
            const cleanPhone = digits.slice(-10);

            // Verify OTP via Edge Function
            const { data: verifyData, error: fnError } = await supabase.functions.invoke('verify-otp', {
                body: { phone: cleanPhone, otp: otp.trim() },
            });
            if (fnError) {
                let msg = fnError.message;
                try { const b = await fnError.context?.json?.(); if (b?.error) msg = b.error; } catch {}
                throw new Error(msg);
            }
            if (verifyData?.error) throw new Error(verifyData.error);

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

            // Check if they already have an approved account with a role
            const { data: existingLead } = await supabase
                .from('leads')
                .select('*')
                .eq('phone', cleanPhone)
                .eq('status', 'approved')
                .maybeSingle();

            if (existingLead?.role) {
                // Already registered with a role — skip role selection, log straight in
                setDiagnostics(`RETURNING USER: ${existingLead.full_name} (${existingLead.role})`);
                await supabase.from('leads').update({ last_active: new Date().toISOString() }).eq('id', existingLead.id);
                await logLogin(cleanPhone, existingLead.full_name, existingLead.role);
                localStorage.setItem('stonevo_lead_id', existingLead.id);
                localStorage.setItem('stonevo_user_phone', existingLead.phone || cleanPhone);
                localStorage.setItem('stonevo_user_name', existingLead.full_name);
                setContextLeadId(existingLead.id);
                setRoleState(existingLead.role);
                setWelcomeName(existingLead.full_name);
                setStatus('welcome');
                setTimeout(() => setStatus('approved'), 2500);
            } else if (whitelistData || existingLead) {
                // New/incomplete account — ask for role
                setPendingLead(existingLead || {
                    phone: cleanPhone,
                    full_name: finalName,
                    email: `${cleanPhone}@stonevo.pro`
                });
                setWelcomeName(finalName || existingLead?.full_name);
                setStep('ROLE_SELECTION');
            } else {
                setDiagnostics(`NO MATCH for phone "${cleanPhone}" in any database.`);
                setStep('NEW_USER_ROLE');
            }
        } catch (err) {
            setError(err.message || 'Verification failed');
            setDiagnostics(`CRITICAL FAILURE: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRoleChoice = async (chosenRole) => {
        if (!pendingLead) return;
        setSubmitting(true);
        setError(null);

        try {
            const { data, error: upsertError } = await supabase
                .from('leads')
                .upsert({
                    ...pendingLead,
                    role: chosenRole,
                    status: 'approved',
                    last_active: new Date().toISOString()
                }, { onConflict: 'phone' })
                .select()
                .single();

            if (upsertError) throw upsertError;

            await logLogin(data.phone || pendingLead.phone, data.full_name || pendingLead.full_name, chosenRole);
            localStorage.setItem('stonevo_lead_id', data.id);
            localStorage.setItem('stonevo_user_phone', data.phone || pendingLead.phone || '');
            localStorage.setItem('stonevo_user_name', data.full_name || pendingLead.full_name || '');
            setContextLeadId(data.id);
            setRoleState(chosenRole);
            if (chosenRole === 'architect' && pendingLead?.phone) {
                promoteUnverifiedRequests(pendingLead.phone);
            }
            setStatus('welcome');
            setTimeout(() => setStatus('approved'), 2500);
        } catch (err) {
            setError(err.message);
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
            setContextLeadId(data.id);

            // Success! Stay in pending state for vetting.
            setStatus('pending');
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const [clientRequest, setClientRequest] = useState({ full_name: '', architect_phone: '' });
    const [showPendingBanner, setShowPendingBanner] = useState(false);

    const finalizeClientRequest = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const cleanPhone = formData.phone.replace(/\D/g, '');
            const cleanArchPhone = clientRequest.architect_phone.replace(/\D/g, '').slice(-10);

            // Super whitelist — these numbers are always valid architects
            const superWhitelist = ['7678320944', '7042353166'];

            let requestTag = null;
            let hasArchitect = false;

            if (cleanArchPhone.length === 10) {
                hasArchitect = true;
                // Check super whitelist first, then leads table
                const isSuper = superWhitelist.includes(cleanArchPhone);
                if (isSuper) {
                    requestTag = `PENDING_REQUEST:${cleanArchPhone}`;
                } else {
                    const { data: archCheck } = await supabase
                        .from('leads')
                        .select('id')
                        .eq('phone', cleanArchPhone)
                        .eq('role', 'architect')
                        .maybeSingle();
                    requestTag = archCheck
                        ? `PENDING_REQUEST:${cleanArchPhone}`
                        : `UNVERIFIED_ARCHITECT:${cleanArchPhone}`;
                }
            }

            const upsertPayload = {
                phone: cleanPhone,
                full_name: clientRequest.full_name,
                email: `${cleanPhone}@stonevo.pro`,
                role: 'builder',
                // pending if waiting for architect approval, approved if no architect given
                status: hasArchitect ? 'pending' : 'approved',
            };
            if (requestTag) upsertPayload.company_name = requestTag;

            const { data, error } = await supabase
                .from('leads')
                .upsert(upsertPayload, { onConflict: 'phone' })
                .select()
                .single();

            if (error) throw error;
            await logLogin(cleanPhone, clientRequest.full_name, 'builder');
            localStorage.setItem('stonevo_lead_id', data.id);
            localStorage.setItem('stonevo_user_phone', cleanPhone);
            localStorage.setItem('stonevo_user_name', clientRequest.full_name);
            setContextLeadId(data.id);
            setRoleState('builder');
            setWelcomeName(clientRequest.full_name);
            if (hasArchitect) {
                // Wait for architect approval — show pending screen
                setShowPendingBanner(true);
                setStatus('pending');
            } else {
                // No architect given — go straight in
                setStatus('welcome');
                setTimeout(() => setStatus('approved'), 2500);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const resetSession = () => {
        clearSession();
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
                                        <motion.p
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3, duration: 0.8 }}
                                            className="text-bronze/80 font-display text-[11px] uppercase tracking-[0.6em] font-semibold"
                                        >
                                            Welcome to Stonevo
                                        </motion.p>
                                        <motion.h2
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.5, duration: 0.8 }}
                                            className="text-5xl md:text-6xl font-serif text-white italic drop-shadow-sm"
                                        >
                                            {welcomeName?.split(' ')[0]}
                                        </motion.h2>
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.9, duration: 1 }}
                                            className="text-base text-stone-400 font-light tracking-wide"
                                        >
                                            Let's simplify your stone selection
                                        </motion.p>
                                    </div>

                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 1.2, duration: 1 }}
                                        className="pt-6"
                                    >
                                        <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-bronze/60 to-transparent mx-auto"></div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {showPendingBanner && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-lg mx-4 px-6 py-4 bg-stone-900/95 border border-bronze/30 rounded-2xl shadow-2xl backdrop-blur-xl flex items-start gap-4"
                    >
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-bronze animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1">
                            <p className="text-white text-sm font-serif italic">Architect details received</p>
                            <p className="text-stone-400 text-xs leading-relaxed">We'll confirm your architect's details shortly. In the meantime, feel free to browse our collection.</p>
                        </div>
                        <button onClick={() => setShowPendingBanner(false)} className="text-stone-600 hover:text-white transition-colors mt-0.5 shrink-0">
                            <X size={14} />
                        </button>
                    </motion.div>
                )}

                {/* Switch Account — always accessible so a different person can log in on the same device */}
                <div className="fixed bottom-4 left-4 z-[300] flex items-center gap-2 group">
                    <div className="flex items-center gap-2 px-3 py-2 bg-black/60 border border-white/10 rounded-full backdrop-blur-md shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
                        <div className="w-5 h-5 rounded-full bg-bronze/20 flex items-center justify-center shrink-0">
                            <User size={10} className="text-bronze" />
                        </div>
                        <span className="text-[9px] text-stone-400 font-semibold uppercase tracking-widest whitespace-nowrap">
                            {localStorage.getItem('stonevo_user_name') || 'Account'}
                        </span>
                        <span className="text-stone-700">·</span>
                        <button
                            onClick={resetSession}
                            className="text-[9px] text-stone-400 hover:text-bronze uppercase tracking-widest transition-colors font-bold whitespace-nowrap"
                        >
                            Switch Account
                        </button>
                    </div>
                    <button
                        onClick={resetSession}
                        className="w-7 h-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-xl hover:border-bronze/40 transition-all"
                        title="Switch Account"
                    >
                        <User size={12} className="text-stone-600 group-hover:text-bronze transition-colors" />
                    </button>
                </div>
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

                            {step === 'ROLE_SELECTION' && (
                                <motion.div 
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="text-center space-y-2">
                                        <h3 className="text-2xl font-serif text-luxury-cream italic">Choose your Identity</h3>
                                        <p className="text-stone-500 text-xs uppercase tracking-widest font-bold">How would you like to enter the portal?</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <button 
                                            onClick={() => handleRoleChoice('architect')}
                                            className="group relative p-8 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-bronze/10 hover:border-bronze transition-all"
                                        >
                                            <div className="w-12 h-12 bg-bronze/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                <Compass size={24} className="text-bronze" />
                                            </div>
                                            <h4 className="text-lg font-serif text-white mb-2">Design Professional</h4>
                                            <p className="text-[10px] text-stone-500 leading-relaxed uppercase tracking-tighter">Manage clients, curate collections, and visualize institutional projects.</p>
                                        </button>

                                        <button 
                                            onClick={() => handleRoleChoice('builder')}
                                            className="group relative p-8 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-bronze/10 hover:border-bronze transition-all"
                                        >
                                            <div className="w-12 h-12 bg-bronze/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                <User size={24} className="text-bronze" />
                                            </div>
                                            <h4 className="text-lg font-serif text-white mb-2">Project Owner</h4>
                                            <p className="text-[10px] text-stone-500 leading-relaxed uppercase tracking-tighter">Explore curated stones and visualize choices for your personal space.</p>
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'NEW_USER_ROLE' && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="text-center space-y-2">
                                        <h3 className="text-2xl font-serif text-luxury-cream italic">How are you joining?</h3>
                                        <p className="text-stone-500 text-xs uppercase tracking-widest font-bold">Select your role to continue</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <button
                                            onClick={() => setStep('FORM')}
                                            className="group relative p-8 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-bronze/10 hover:border-bronze transition-all"
                                        >
                                            <div className="w-12 h-12 bg-bronze/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                <Compass size={24} className="text-bronze" />
                                            </div>
                                            <h4 className="text-lg font-serif text-white mb-2">Design Professional</h4>
                                            <p className="text-[10px] text-stone-500 leading-relaxed uppercase tracking-tighter">Register your firm to manage clients and curate collections.</p>
                                        </button>
                                        <button
                                            onClick={() => setStep('CLIENT_REQUEST')}
                                            className="group relative p-8 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-bronze/10 hover:border-bronze transition-all"
                                        >
                                            <div className="w-12 h-12 bg-bronze/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                <User size={24} className="text-bronze" />
                                            </div>
                                            <h4 className="text-lg font-serif text-white mb-2">Project Owner</h4>
                                            <p className="text-[10px] text-stone-500 leading-relaxed uppercase tracking-tighter">Request access through your architect to explore the collection.</p>
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'CLIENT_REQUEST' && (
                                <form onSubmit={finalizeClientRequest} className="space-y-6">
                                    <div className="text-center space-y-1 mb-2">
                                        <h3 className="text-xl font-serif text-luxury-cream italic">Request Access</h3>
                                        <p className="text-stone-500 text-xs uppercase tracking-widest">Your architect will approve your entry</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2"><User size={12} className="text-bronze" /> Your Name</label>
                                        <input required type="text" className="w-full bg-white/5 border-b border-white/10 py-3 text-luxury-cream focus:outline-none focus:border-bronze transition-colors" value={clientRequest.full_name} onChange={(e) => setClientRequest(p => ({ ...p, full_name: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2">
                                            <Phone size={12} className="text-bronze" /> Architect's Phone Number
                                            <span className="text-stone-600 normal-case font-normal">(optional)</span>
                                        </label>
                                        <input type="tel" placeholder="You can add this later from the site" className="w-full bg-white/5 border-b border-white/10 py-3 text-luxury-cream focus:outline-none focus:border-bronze transition-colors placeholder:text-stone-700" value={clientRequest.architect_phone} onChange={(e) => setClientRequest(p => ({ ...p, architect_phone: e.target.value }))} />
                                    </div>
                                    <button type="submit" disabled={submitting} className="w-full py-5 bg-bronze text-white font-serif tracking-[0.2em] uppercase text-sm hover:bg-white hover:text-stone-950 transition-all shadow-xl shadow-bronze/10">
                                        {submitting ? 'Sending Request...' : 'Send Access Request'}
                                    </button>
                                    <button type="button" onClick={() => setStep('NEW_USER_ROLE')} className="w-full text-[10px] font-bold text-stone-500 uppercase tracking-widest hover:text-bronze">Back</button>
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
                                            <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2"><Mail size={12} className="text-bronze" /> Email <span className="text-stone-600 normal-case font-normal">(optional)</span></label>
                                            <input type="email" className="w-full bg-white/5 border-b border-white/10 py-2 text-luxury-cream focus:outline-none focus:border-bronze transition-colors" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2"><Building size={12} className="text-bronze" /> Firm Name <span className="text-stone-600 normal-case font-normal">(optional)</span></label>
                                            <input type="text" className="w-full bg-white/5 border-b border-white/10 py-2 text-luxury-cream focus:outline-none focus:border-bronze transition-colors" value={formData.company_name} onChange={(e) => handleInputChange('company_name', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2">GST Number <span className="text-stone-600 normal-case font-normal">(optional)</span></label>
                                            <input type="text" placeholder="22AAAAA0000A1Z5" className="w-full bg-white/5 border-b border-white/10 py-2 text-luxury-cream focus:outline-none focus:border-bronze transition-colors" value={formData.gst_number} onChange={(e) => handleInputChange('gst_number', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-2"><Globe size={12} className="text-bronze" /> Website <span className="text-stone-600 normal-case font-normal">(optional)</span></label>
                                        <input type="url" placeholder="https://" className="w-full bg-white/5 border-b border-white/10 py-2 text-luxury-cream focus:outline-none focus:border-bronze transition-colors placeholder:text-stone-700" value={formData.website} onChange={(e) => handleInputChange('website', e.target.value)} />
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

        </div>
    );
};

export default LeadGate;
