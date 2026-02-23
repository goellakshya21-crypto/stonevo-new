import { supabase } from '../lib/supabaseClient';

/**
 * Logs a lead's activity to Supabase if a lead_id exists in localStorage.
 * @param {string} actionType - 'search', 'view_stone', 'ai_query'
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

    } catch (err) {
        console.error('Activity tracking error:', err);
    }
};
