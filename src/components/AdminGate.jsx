import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ShieldAlert, Loader2, Phone, KeyRound, ArrowLeft } from 'lucide-react';
import StonWordmark from './StonWordmark';

// ── Who may open the internal admin panel ────────────────────────────────────
// Checked against leads.phone, so an admin must pass phone-OTP first -- knowing
// the URL alone is not enough. Add numbers here to grant access.
const ADMIN_PHONES = ['7678320944'];

const last10 = (v) => String(v || '').replace(/\D/g, '').slice(-10);

// Localhost only: accept 000000 without an SMS round-trip while developing.
// Deliberately NOT extended to specific phone numbers in production -- that
// would be a permanent backdoor into the admin panel.
const IS_LOCAL_DEV = typeof window !== 'undefined'
    && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

/**
 * Wraps the admin page: verifies the current session belongs to an allowlisted
 * phone, and offers sign-in inline so an admin never has to log in elsewhere
 * and navigate back.
 *
 * Scope, stated plainly: this gates the admin INTERFACE, not the DATA. Every
 * table the panel touches is still reachable through the public REST API with
 * the anon key that ships in the JS bundle. This stops casual discovery; it
 * does not stop a technical attacker. That needs the remaining RLS work.
 */
const AdminGate = ({ children }) => {
    const [state, setState] = useState('checking'); // checking | granted | denied | signin

    const [step, setStep] = useState('phone');      // phone | otp
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    // ── Resolve the existing session on mount ────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        (async () => {
            let leadId = null;
            try { leadId = localStorage.getItem('stonevo_lead_id'); } catch { /* storage blocked */ }

            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!leadId || !uuidRegex.test(leadId)) {
                if (!cancelled) setState('signin');
                return;
            }

            try {
                const { data } = await supabase
                    .from('leads')
                    .select('phone')
                    .eq('id', leadId)
                    .maybeSingle();

                if (cancelled) return;
                const allowed = !!data?.phone && ADMIN_PHONES.includes(last10(data.phone));
                setState(allowed ? 'granted' : 'denied');
            } catch {
                if (!cancelled) setState('denied');
            }
        })();

        return () => { cancelled = true; };
    }, []);

    // ── Step 1: send the code ────────────────────────────────────────────────
    const sendCode = async (e) => {
        e.preventDefault();
        setError('');
        const clean = last10(phone);

        if (clean.length < 10) { setError('Enter a valid 10-digit number.'); return; }
        // Refuse before spending an SMS on a number that could never get in.
        if (!ADMIN_PHONES.includes(clean)) { setError('This number is not authorised for the admin panel.'); return; }

        setBusy(true);
        try {
            if (IS_LOCAL_DEV) { setStep('otp'); return; }

            const { data, error: fnErr } = await supabase.functions.invoke('send-otp', { body: { phone: clean } });
            if (fnErr) {
                let msg = fnErr.message;
                try { const b = await fnErr.context?.json?.(); if (b?.error) msg = b.error; } catch { /* keep original */ }
                throw new Error(msg);
            }
            if (data?.error) throw new Error(data.error);
            setStep('otp');
        } catch (err) {
            setError(err.message || 'Could not send the code.');
        } finally {
            setBusy(false);
        }
    };

    // ── Step 2: verify, then attach the session ──────────────────────────────
    const verifyCode = async (e) => {
        e.preventDefault();
        setError('');
        const clean = last10(phone);
        const code = otp.trim();

        setBusy(true);
        try {
            const localBypass = IS_LOCAL_DEV && code === '000000';
            if (!localBypass) {
                const { data, error: fnErr } = await supabase.functions.invoke('verify-otp', {
                    body: { phone: clean, otp: code },
                });
                if (fnErr) {
                    let msg = fnErr.message;
                    try { const b = await fnErr.context?.json?.(); if (b?.error) msg = b.error; } catch { /* keep original */ }
                    throw new Error(msg);
                }
                if (data?.error) throw new Error(data.error);
            }

            // OTP is good. Attach the matching lead so the session survives reload.
            const { data: lead } = await supabase
                .from('leads')
                .select('id, phone, full_name')
                .eq('phone', clean)
                .maybeSingle();

            if (!lead?.id) {
                throw new Error('No account exists for this number yet. Sign in on the main site once, then return here.');
            }

            try {
                localStorage.setItem('stonevo_lead_id', lead.id);
                localStorage.setItem('stonevo_user_phone', lead.phone || clean);
                if (lead.full_name) localStorage.setItem('stonevo_user_name', lead.full_name);
            } catch { /* storage blocked -- session just won't persist */ }

            setState('granted');
        } catch (err) {
            setError(err.message || 'Verification failed.');
        } finally {
            setBusy(false);
        }
    };

    const signOutAndRetry = () => {
        try {
            localStorage.removeItem('stonevo_lead_id');
            localStorage.removeItem('stonevo_user_phone');
            localStorage.removeItem('stonevo_user_name');
        } catch { /* ignore */ }
        setPhone(''); setOtp(''); setError(''); setStep('phone');
        setState('signin');
    };

    if (state === 'granted') return children;

    if (state === 'checking') {
        return (
            <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-bronze" size={22} />
                <p className="text-stone-500 text-[10px] uppercase tracking-[0.3em] font-bold">Verifying credentials</p>
            </div>
        );
    }

    const primary = 'w-full py-3 bg-bronze text-stone-950 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center px-6 py-16">
            <div className="w-full max-w-sm text-center space-y-6">
                <StonWordmark height={22} />

                {state === 'denied' ? (
                    <>
                        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                            <ShieldAlert className="text-red-400" size={20} />
                        </div>
                        <h1 className="font-serif text-2xl text-stone-100">Restricted area</h1>
                        <p className="text-stone-400 text-sm leading-relaxed">
                            This account does not have access to the internal panel.
                        </p>
                        <div className="space-y-3 pt-2">
                            <button onClick={signOutAndRetry} className={primary}>Sign in with another number</button>
                            <Link to="/" className="block text-[10px] uppercase tracking-[0.2em] text-stone-500 hover:text-bronze transition-colors">
                                Back to site
                            </Link>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-bronze/80 text-[10px] uppercase tracking-[0.4em] font-bold">Internal Portal</p>
                        <h1 className="font-serif text-2xl text-stone-100">
                            {step === 'phone' ? 'Sign in' : 'Enter your code'}
                        </h1>

                        {step === 'phone' ? (
                            <form onSubmit={sendCode} className="space-y-4 text-left">
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 focus-within:border-bronze transition-colors">
                                    <Phone size={14} className="text-bronze shrink-0" />
                                    <input
                                        type="tel"
                                        autoFocus
                                        inputMode="numeric"
                                        placeholder="Authorised mobile number"
                                        value={phone}
                                        onChange={(e) => { setPhone(e.target.value); setError(''); }}
                                        className="flex-1 bg-transparent py-3 text-sm text-white placeholder:text-stone-600 focus:outline-none"
                                    />
                                </div>
                                {error && <p className="text-red-400 text-xs leading-relaxed">{error}</p>}
                                <button type="submit" disabled={busy} className={primary}>
                                    {busy ? 'Sending…' : 'Send code'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={verifyCode} className="space-y-4 text-left">
                                <p className="text-stone-500 text-xs">
                                    {IS_LOCAL_DEV ? 'Local dev — use 000000' : `Code sent to +91 ${last10(phone)}`}
                                </p>
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 focus-within:border-bronze transition-colors">
                                    <KeyRound size={14} className="text-bronze shrink-0" />
                                    <input
                                        type="text"
                                        autoFocus
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="6-digit code"
                                        value={otp}
                                        onChange={(e) => { setOtp(e.target.value); setError(''); }}
                                        className="flex-1 bg-transparent py-3 text-sm text-white tracking-[0.4em] placeholder:tracking-normal placeholder:text-stone-600 focus:outline-none"
                                    />
                                </div>
                                {error && <p className="text-red-400 text-xs leading-relaxed">{error}</p>}
                                <button type="submit" disabled={busy || otp.trim().length < 6} className={primary}>
                                    {busy ? 'Verifying…' : 'Verify & enter'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                                    className="flex items-center gap-2 mx-auto text-[10px] uppercase tracking-[0.2em] text-stone-500 hover:text-bronze transition-colors"
                                >
                                    <ArrowLeft size={11} /> Change number
                                </button>
                            </form>
                        )}

                        <Link to="/" className="block text-[10px] uppercase tracking-[0.2em] text-stone-600 hover:text-bronze transition-colors pt-2">
                            Back to site
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminGate;
