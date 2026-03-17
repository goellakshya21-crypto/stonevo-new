import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkZenithBlue() {
    const { data, error } = await supabase
        .from('stones')
        .select('*')
        .ilike('name', '%zenith blue%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    fs.writeFileSync('zenith_dump.json', JSON.stringify(data, null, 2));
    console.log('Saved to zenith_dump.json');
}

checkZenithBlue();
