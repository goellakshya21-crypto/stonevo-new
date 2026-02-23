const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkMetadata() {
    try {
        const { data, error } = await supabase
            .from('stones')
            .select('*');

        if (error) throw error;

        console.log('--- STONE METADATA AUDIT ---');
        data.forEach(s => {
            console.log(`[${s.name}]`);
            console.log(`  Color: ${s.color}`);
            console.log(`  Pattern: ${s.pattern}`);
            console.log(`  Tags: ${JSON.stringify(s.tags)}`);
            console.log(`  Description: ${s.description?.substring(0, 100)}...`);
            console.log('---------------------------');
        });
    } catch (err) {
        console.error('Audit Error:', err);
    }
}

checkMetadata();
