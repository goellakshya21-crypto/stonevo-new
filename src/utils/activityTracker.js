import { supabase } from '../lib/supabaseClient';

// At most one compaction attempt per lead per day, recorded BEFORE the attempt.
//
// Compaction only stops being due once it succeeds, and it used to be retried
// on every single event after a lead passed 100 logs -- so any persistent
// failure became a billed Gemini call on every click. That is what happened:
// leads.behavioral_compaction was never created, the save always failed, the
// logs were never purged, and on 2026-09-17 four leads were re-billing on every
// action at 142-257 logs. Recording the attempt first also stops a burst of
// events in the same second from each firing a call of its own.
const COMPACTION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const compactionAllowed = (leadId) => {
    const key = `ston_compaction_attempt_${leadId}`;
    try {
        const last = Number(localStorage.getItem(key) || 0);
        if (Date.now() - last < COMPACTION_COOLDOWN_MS) return false;
        localStorage.setItem(key, String(Date.now()));
        return true;
    } catch {
        // No storage means no way to remember the attempt, and so no way to
        // bound the loop. Skipping one summary is far cheaper than risking it.
        return false;
    }
};

/**
 * Logs a lead's activity to Supabase if a lead_id exists in localStorage.
 * @param {string} actionType - 'search', 'view_stone', 'ai_query', 'visualize'
 * @param {object} details - Any metadata about the action
 */
export const logActivity = async (actionType, details = {}) => {
    const leadId = localStorage.getItem('stonevo_lead_id');

    if (!leadId) return;

    try {
        const { error } = await supabase
            .from('activity_logs')
            .insert([{
                lead_id: leadId,
                action_type: actionType,
                details: details
            }]);

        if (error) {
            console.error('Failed to log activity:', error);
        }

        // Update last_active on the lead record
        await supabase
            .from('leads')
            .update({ last_active: new Date().toISOString() })
            .eq('id', leadId);

        // --- AUTO-COMPACTION PROTOCOL ---
        // Every 100 logs, we summarize and purge to save Supabase space
        const { count, error: countErr } = await supabase
            .from('activity_logs')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', leadId);

        if (!countErr && count >= 100 && compactionAllowed(leadId)) {
            console.log(`[Auto-Compaction] Log limit reached (${count}/100) for ${leadId}. Commencing AI compression...`);
            await compactLeadLogs(leadId);
        }

    } catch (err) {
        console.error('Activity tracking error:', err);
    }
};

/**
 * Summarizes the last 100 logs into a behavioral JSON and deletes individual records.
 */
const compactLeadLogs = async (leadId) => {
    try {
        // 1. Fetch the logs
        const { data: logs, error: fetchErr } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: true })
            .limit(100);

        if (fetchErr || !logs.length) return;

        // 2. Format logs for AI
        const logContent = logs.map(l => `${l.action_type}: ${JSON.stringify(l.details)}`).join('\n');

        // 3. Call AI for analytical compression
        const prompt = `Analyze these 100 user interaction logs and compress them into a factual behavioral summary JSON.
        Logs:
        ${logContent}

        Return ONLY a JSON object in this format:
        {
          "summary_para": "One paragraph analysis of their project intent and preferences",
          "frequent_colors": ["color1", "color2"],
          "preferred_marbles": ["type1", "type2"],
          "intent_score": 1-100,
          "data_points_compressed": 100
        }`;

        const response = await fetch('/api/gemini-vertex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt, model: 'gemini-2.5-flash', purpose: 'activity_compaction' })
        });

        if (!response.ok) throw new Error('AI Compaction failed');
        const aiData = await response.json();
        
        // Ensure we parse the AI response if it's a string
        let compressedJson = aiData.text;
        try {
            const match = aiData.text.match(/\{[\s\S]*\}/);
            if (match) compressedJson = JSON.parse(match[0]);
        } catch (e) {
            console.warn("[Compaction] AI didn't return valid JSON, using raw text.");
        }

        // 4. Store the compressed intelligence in the lead profile
        // We use a field called 'behavioral_compaction' (assumed to exist as JSONB)
        const { error: updateErr } = await supabase
            .from('leads')
            .update({ 
                behavioral_compaction: compressedJson 
            })
            .eq('id', leadId);

        if (updateErr) throw updateErr;

        // 5. PURGE the logs to free up space
        const logIdsToDelete = logs.map(l => l.id);
        const { error: deleteErr } = await supabase
            .from('activity_logs')
            .delete()
            .in('id', logIdsToDelete);

        if (!deleteErr) {
            console.log(`[Auto-Compaction] SUCCESS: 100 logs purged for ${leadId}. Data compressed into behavioral profile.`);
        }

    } catch (err) {
        console.error('[Auto-Compaction Error]:', err);
    }
};
