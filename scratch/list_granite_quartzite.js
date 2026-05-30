import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function listGraniteQuartzite() {
    const { data, error } = await supabase
        .from('stones')
        .select('name, type, color')
        .order('name');

    if (error) { console.error('Error:', error); return; }

    const matches = data.filter(s => {
        const t = Array.isArray(s.type) ? s.type : (s.type ? [s.type] : []);
        return t.some(x => {
            const low = (x || '').toLowerCase();
            return low.includes('granite') || low.includes('quartzite');
        });
    });

    console.log(`\n=== Granite & Quartzite stones: ${matches.length} found ===\n`);
    matches.forEach((s, i) => {
        const colors = Array.isArray(s.color) ? s.color.join(', ') : (s.color || '—');
        const type = Array.isArray(s.type) ? s.type.join(', ') : s.type;
        console.log(`${(i + 1).toString().padStart(3)}. ${s.name}  —  ${type}  (${colors})`);
    });
    console.log('');
}

listGraniteQuartzite();
