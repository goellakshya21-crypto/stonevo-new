import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { stoneId, imageUrl } = req.body || {};

    if (!stoneId) {
        return res.status(400).json({ error: 'stoneId is required.' });
    }

    // Use service role key — bypasses RLS so admin can delete any row
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        return res.status(500).json({ error: 'Supabase service credentials not configured. Add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    try {
        // 1. Delete the DB row
        const { error: dbError } = await supabaseAdmin
            .from('stones')
            .delete()
            .eq('id', stoneId);

        if (dbError) throw dbError;

        // 2. Best-effort: delete the image from storage
        if (imageUrl) {
            try {
                const parts = imageUrl.split('/marble-images/');
                if (parts[1]) {
                    const filePath = decodeURIComponent(parts[1].split('?')[0]);
                    await supabaseAdmin.storage.from('marble-images').remove([filePath]);
                }
            } catch (storageErr) {
                // Non-fatal — DB row is already gone
                console.warn('[admin-delete-stone] Storage delete failed (non-fatal):', storageErr.message);
            }
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('[admin-delete-stone] Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
