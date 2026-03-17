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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getAllColumns() {
    const { data, error } = await supabase
        .from('stones')
        .select('*')
        .limit(1);

    if (error) {
        fs.writeFileSync('schema_debug.json', JSON.stringify({ error: error.message }, null, 2));
    } else if (data && data.length > 0) {
        fs.writeFileSync('schema_debug.json', JSON.stringify({ columns: Object.keys(data[0]) }, null, 2));
    } else {
        fs.writeFileSync('schema_debug.json', JSON.stringify({ message: 'No data found' }, null, 2));
    }
}

getAllColumns();
