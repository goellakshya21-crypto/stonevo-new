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

async function checkNumber(phone) {
    console.log(`Checking status for: ${phone}`);

    // Check Whitelist
    const { data: whitelist, error: wError } = await supabase
        .from('architect_whitelist')
        .select('*')
        .eq('phone_number', phone);

    console.log('--- Whitelist Entry ---');
    console.log(JSON.stringify(whitelist, null, 2));

    // Check Leads
    const { data: leads, error: lError } = await supabase
        .from('leads')
        .select('*')
        .eq('phone', phone);

    console.log('\n--- Leads Entry ---');
    console.log(JSON.stringify(leads, null, 2));
}

const targetNumber = process.argv[2] || '6574893240';
checkNumber(targetNumber);
