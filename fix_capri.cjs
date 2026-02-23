const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function updateCapri() {
    try {
        console.log('Fetching Capri record...');
        const { data: current, error: getError } = await supabase
            .from('stones')
            .select('id, tags')
            .ilike('name', 'Capri')
            .single();

        if (getError) throw getError;

        const newTags = Array.from(new Set([...current.tags, 'black veins', 'veined', 'bluish']));

        const { error: updateError } = await supabase
            .from('stones')
            .update({
                pattern: 'Yes',
                tags: newTags
            })
            .eq('id', current.id);

        if (updateError) throw updateError;

        console.log('SUCCESS: Capri metadata synchronized for veining and bluish tones.');
    } catch (err) {
        console.error('Update Error:', err);
    }
}

updateCapri();
