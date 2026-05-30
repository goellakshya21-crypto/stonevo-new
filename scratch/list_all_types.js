import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function listAllTypes() {
    const { data, error } = await supabase.from('stones').select('name, marble').order('name');
    if (error) { console.error(error); return; }

    console.log(`\nTotal stones: ${data.length}\n`);

    const counts = {};
    data.forEach(s => {
        const m = Array.isArray(s.marble) ? s.marble : (s.marble ? [s.marble] : ['__NULL__']);
        m.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
    });

    console.log('All marble/type values:');
    Object.entries(counts).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => {
        console.log(`  ${v.toString().padStart(4)}  ${k}`);
    });
    console.log('');

    // Sample first stone to see structure
    console.log('Sample stone structure:');
    console.log(JSON.stringify(data[0], null, 2));
}

listAllTypes();
