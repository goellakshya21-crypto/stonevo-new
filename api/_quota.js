// Per-user visualisation limits.
//
// Each lead can be given a cap on how many renders they may generate (see
// VISUALIZATION_LIMITS_SETUP.sql). Enforced HERE rather than in the browser,
// because a check the client performs is a check the client can skip.
//
// FAILS OPEN throughout. If Supabase is unreachable, or the SQL has not been
// run yet, renders keep working rather than the whole feature going dark over a
// counter. A limit is a cost guard, not a safety interlock.
//
// What it is not: proof of identity. The browser tells the server which lead it
// is and nothing verifies that, so this bounds ordinary use rather than
// defeating someone determined to get around it. Fixing that means RLS on
// `leads` and a signed identity, not a change here.
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = (url && anon) ? createClient(url, anon) : null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Only a real UUID reaches the database. Guest sessions carry ids like
 * "GUEST_x7f2q", which would otherwise make Postgres throw on the uuid cast and
 * turn a missing counter into a failed render.
 */
export const asLeadId = (value) =>
    (typeof value === 'string' && UUID_RE.test(value)) ? value : null;

/**
 * Claim one render up front, before any money is spent.
 * @returns {Promise<{allowed:boolean, used?:number, limit?:number, reason?:string}>}
 */
export async function consumeVisualization(leadId) {
    if (!supabase || !leadId) return { allowed: true, reason: 'not_enforced' };
    try {
        const { data, error } = await supabase.rpc('consume_visualization', { p_lead_id: leadId });
        if (error) {
            console.warn('[quota] consume failed, allowing:', error.message);
            return { allowed: true, reason: 'rpc_error' };
        }
        return data || { allowed: true, reason: 'no_data' };
    } catch (err) {
        console.warn('[quota] consume failed, allowing:', err?.message || err);
        return { allowed: true, reason: 'rpc_error' };
    }
}

/**
 * Hand the credit back when the render did not happen. A user must never pay
 * for our failure -- and a quota error is our failure more often than theirs.
 */
export async function refundVisualization(leadId) {
    if (!supabase || !leadId) return;
    try {
        const { error } = await supabase.rpc('refund_visualization', { p_lead_id: leadId });
        if (error) console.warn('[quota] refund failed:', error.message);
    } catch (err) {
        console.warn('[quota] refund failed:', err?.message || err);
    }
}
