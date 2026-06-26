// Shared rate limiter for Vercel serverless functions.
// Backed by Supabase (check_rate_limit RPC) so the limit is shared across all
// serverless instances. Fails OPEN on any error so a limiter hiccup never takes
// the app down — the goal is abuse mitigation, not a hard gate.
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = (url && anon) ? createClient(url, anon) : null;

/** Best-effort client IP from Vercel's forwarding headers. */
export function clientIp(req) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
    return req.headers['x-real-ip'] || 'unknown';
}

/**
 * @returns {Promise<boolean>} true if allowed, false if over the limit.
 */
export async function rateLimit(key, limit, windowSeconds) {
    if (!supabase) return true; // not configured → don't block
    try {
        const { data, error } = await supabase.rpc('check_rate_limit', {
            p_key: key, p_limit: limit, p_window: windowSeconds,
        });
        if (error) { console.warn('[rateLimit] rpc error:', error.message); return true; }
        return data === true;
    } catch (e) {
        console.warn('[rateLimit] error:', e?.message || e);
        return true;
    }
}
