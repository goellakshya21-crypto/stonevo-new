import { supabase } from '../lib/supabaseClient';

/**
 * Activity tracking: one row per meaningful thing a lead does, and nothing else.
 *
 * INSERT-ONLY, deliberately. Tracking used to do three more jobs on every event:
 *
 *   - count(*) the lead's whole history, every time, to decide the next job;
 *   - once that count reached 100, ask Gemini to summarise the logs...
 *   - ...then DELETE the raw logs and keep only the summary.
 *
 * The deletion was the real cost. It made every lead's history irreversible --
 * nothing could be re-analysed, and the paragraph could not be checked against
 * what had actually happened. It also never worked: the summary column was never
 * created, so the save failed and the logs were never deleted. Instead each
 * event past 100 paid for another Gemini call, until a cooldown stopped it.
 *
 * Raw logs are now kept. Behavioural summaries are made on demand in the admin
 * panel (AdminLeads), where they are read and saved, rather than being
 * triggered by what users click. At the rate events arrive now that searches
 * are debounced, keeping them costs nothing worth measuring.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// last_active drives "when was this lead last here", which does not need
// updating every second while they click around. Once a couple of minutes is
// enough, and saves a write per event.
const LAST_ACTIVE_EVERY_MS = 2 * 60 * 1000;

const lastActiveDue = (leadId) => {
    const key = `ston_last_active_write_${leadId}`;
    try {
        const last = Number(localStorage.getItem(key) || 0);
        if (Date.now() - last < LAST_ACTIVE_EVERY_MS) return false;
        localStorage.setItem(key, String(Date.now()));
        return true;
    } catch {
        return true; // no storage: fall back to the old always-write behaviour
    }
};

/**
 * Record one action for the signed-in lead. Never throws, never blocks the UI.
 * @param {string} actionType  'search' | 'view_stone' | 'visualize' | 'ai_query'
 * @param {object} details     what the action was about
 */
export const logActivity = async (actionType, details = {}) => {
    let leadId = null;
    try { leadId = localStorage.getItem('stonevo_lead_id'); } catch { return; }

    // Guest ids ("GUEST_x7f2q") are not uuids, and activity_logs.lead_id is.
    // Those inserts could only ever fail, so they are not attempted.
    if (!leadId || !UUID_RE.test(leadId)) return;

    try {
        const { error } = await supabase
            .from('activity_logs')
            .insert([{ lead_id: leadId, action_type: actionType, details }]);
        if (error) console.error('Failed to log activity:', error.message);

        if (lastActiveDue(leadId)) {
            await supabase
                .from('leads')
                .update({ last_active: new Date().toISOString() })
                .eq('id', leadId);
        }
    } catch (err) {
        console.error('Activity tracking error:', err?.message || err);
    }
};
