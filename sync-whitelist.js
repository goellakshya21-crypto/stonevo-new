import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function syncLeadsToWhitelist() {
    console.log('Fetching approved leads...');
    const { data: leads, error } = await supabase
        .from('leads')
        .select('phone, full_name, role')
        .eq('status', 'approved');

    if (error) {
        console.error('Error fetching leads:', error.message);
        return;
    }

    console.log(`Found ${leads.length} approved leads. Syncing to whitelist...`);

    for (const lead of leads) {
        const { error: upsertError } = await supabase
            .from('architect_whitelist')
            .upsert({
                phone_number: lead.phone,
                full_name: lead.full_name,
                role: lead.role || 'architect'
            }, { onConflict: 'phone_number' });

        if (upsertError) {
            console.error(`Error syncing ${lead.phone}: ${upsertError.message}`);
        } else {
            console.log(`Successfully synced: ${lead.phone} (${lead.full_name})`);
        }
    }

    console.log('Sync complete.');
}

syncLeadsToWhitelist();
