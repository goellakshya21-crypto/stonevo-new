import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

async function checkLatestStones() {
    const { data, error } = await supabase
        .from('stones')
        .select('id, name, type, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        fs.writeFileSync('stones_debug.json', JSON.stringify({ error: error.message }, null, 2));
    } else {
        fs.writeFileSync('stones_debug.json', JSON.stringify(data, null, 2));
    }
    console.log('Results written to stones_debug.json');
}

checkLatestStones();
