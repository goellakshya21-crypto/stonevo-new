const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function revertCapri() {
    try {
        console.log('Fetching Capri record for reversal...');
        const { data: current, error: getError } = await supabase
            .from('stones')
            .select('id, tags')
            .ilike('name', 'Capri')
            .single();

        if (getError) throw getError;

        // Original tags: we know we added 'black veins', 'veined', 'bluish'
        const tagsToRemove = ['black veins', 'veined', 'bluish'];
        const revertedTags = current.tags.filter(tag => !tagsToRemove.includes(tag));

        const { error: updateError } = await supabase
            .from('stones')
            .update({
                pattern: 'No',
                tags: revertedTags
            })
            .eq('id', current.id);

        if (updateError) throw updateError;

        console.log('SUCCESS: Capri metadata reverted to original non-veined status.');
    } catch (err) {
        console.error('Reversal Error:', err);
    }
}

revertCapri();
