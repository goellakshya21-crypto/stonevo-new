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

async function describeTable(tableName) {
    console.log(`Describing table: ${tableName}`);

    // We can't easily query information_schema via RPC without special permissions
    // So we'll try to get one row and check keys
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

    if (error) {
        console.error(`Error: ${error.message}`);
    } else if (data && data.length > 0) {
        console.log('Columns found from sample row:', Object.keys(data[0]));
    } else {
        console.log('Table is empty. Cannot determine columns via selection.');
    }
}

const table = process.argv[2] || 'architect_whitelist';
describeTable(table);
