const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkHighRes() {
    try {
        const { data, error } = await supabase
            .from('stones')
            .select('name, color, type, pattern, tags, description')
            .ilike('name', '%Capri%');

        if (error) throw error;

        console.log('--- CAPRI FULL METADATA ---');
        console.log(JSON.stringify(data[0], null, 2));
    } catch (err) {
        console.error('Audit Error:', err);
    }
}

checkHighRes();
