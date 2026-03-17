import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
        .limit(10);

    if (error) {
        console.error('Error:', error.message);
    } else if (data && data.length > 0) {
        const columns = new Set();
        data.forEach(row => {
            Object.keys(row).forEach(key => columns.add(key));
        });
        console.log('Columns list:', Array.from(columns).join(', '));
    } else {
        console.log('No data found in stones table.');
    }
}

getAllColumns();
