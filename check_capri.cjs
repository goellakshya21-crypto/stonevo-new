const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkCapri() {
    try {
        const { data, error } = await supabase
            .from('stones')
            .select('*')
            .ilike('name', '%Capri%');

        if (error) throw error;

        console.log('--- CAPRI DATA ---');
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Audit Error:', err);
    }
}

checkCapri();
