import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ShieldAlert, Loader2 } from 'lucide-react';
import StonWordmark from './StonWordmark';

// ── Who may open the internal admin panel ────────────────────────────────────
// Checked against leads.phone for the CURRENTLY LOGGED-IN session, so an admin
// must have passed phone-OTP login first -- knowing the URL alone is no longer
// enough. Add numbers here to grant access.
const ADMIN_PHONES = ['7678320944'];

const last10 = (v) => String(v || '').replace(/\D/g, '').slice(-10);

/**
 * Wraps the admin page. Resolves the logged-in lead from localStorage, looks up
 * its phone in the database, and only renders children when that phone is in
 * ADMIN_PHONES.
 *
 * IMPORTANT, and deliberately not overstated: this gates the admin *interface*,
 * not the *data*. Every table the panel touches is still reachable directly via
 * the public REST API with the anon key that ships in the JS bundle, so this
 * stops someone stumbling onto the URL -- it does NOT stop a technical attacker.
 * Locking the data down requires the RLS work in SECURITY_RLS_STEP1.sql plus a
 * real auth migration.
 */
const AdminGate = ({ children }) => {
    const [state, setState] = useState('checking'); // checking | granted | denied | anonymous

    useEffect(() => {
        let cancelled = false;

        (async () => {
            let leadId = null;
            try { leadId = localStorage.getItem('stonevo_lead_id'); } catch { /* storage blocked */ }

            if (!leadId) {
                if (!cancelled) setState('anonymous');
                return;
            }

            // Reject malformed ids before querying (same shield LeadGate uses)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(leadId)) {
                if (!cancelled) setState('anonymous');
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

    if (state === 'granted') return children;

    if (state === 'checking') {
        return (
            <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-bronze" size={22} />
                <p className="text-stone-500 text-[10px] uppercase tracking-[0.3em] font-bold">
                    Verifying credentials
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center px-6">
            <div className="text-center max-w-md space-y-6">
                <StonWordmark height={22} />
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                    <ShieldAlert className="text-red-400" size={20} />
                </div>
                <h1 className="font-serif text-2xl text-stone-100">Restricted area</h1>
                <p className="text-stone-400 text-sm leading-relaxed">
                    {state === 'anonymous'
                        ? 'Sign in with an authorised number to continue.'
                        : 'This account does not have access to the internal panel.'}
                </p>
                <Link
                    to="/"
                    className="inline-block px-6 py-3 bg-bronze text-stone-950 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white transition-colors"
                >
                    {state === 'anonymous' ? 'Go to sign in' : 'Back to site'}
                </Link>
            </div>
        </div>
    );
};

export default AdminGate;
