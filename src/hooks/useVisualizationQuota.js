import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads the counter. Pure: returns the value rather than setting state, so the
 * effect below can decide whether the answer is still wanted by the time it
 * arrives.
 *
 * Returns null whenever there is nothing worth showing -- no session, a guest
 * id, an uncapped account, or the RPC missing because the SQL has not been run.
 * Callers can then render on truthiness alone, and an uncapped user is never
 * shown a meter with no ceiling.
 *
 * Quiet on failure: before VISUALIZATION_LIMITS_SETUP.sql is run this errors on
 * every gallery load, and a console full of red over an optional counter helps
 * nobody.
 */
const fetchStatus = async (leadId) => {
    if (!leadId || !UUID_RE.test(leadId)) return null;
    try {
        const { data, error } = await supabase.rpc('visualization_status', { p_lead_id: leadId });
        if (error || !data || data.limit == null) return null;
        return data;
    } catch {
        return null;
    }
};

/**
 * How many renders this user has left, and a way to ask again.
 *
 * Read-only: this is the same counter the server enforces, never the authority
 * on it. The limit is applied in api/generate-image.js, so a stale or tampered
 * number here changes what the user SEES and not what they may spend.
 */
export const useVisualizationQuota = (leadId) => {
    const [quota, setQuota] = useState(null);

    const refresh = useCallback(async () => {
        setQuota(await fetchStatus(leadId));
    }, [leadId]);

    useEffect(() => {
        // Ignore a reply that lands after the lead changed, or a slow first
        // request would overwrite the newer account's count with the old one's.
        let cancelled = false;
        (async () => {
            const next = await fetchStatus(leadId);
            if (!cancelled) setQuota(next);
        })();
        return () => { cancelled = true; };
    }, [leadId]);

    return { quota, refresh };
};
