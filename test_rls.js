import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testSimpleUpdate() {
    const { data: existingStone } = await supabase.from('stones').select('*').limit(1).single();

    if (!existingStone) {
        console.log('No stones found.');
        return;
    }

    console.log(`Trying to update stone ${existingStone.name} (${existingStone.id}) using ANON_KEY...`);

    const dbResponse = await supabase
         .from('stones')
         .update({ lot_type: existingStone.lot_type })
         .eq('id', existingStone.id)
         .select();
    
    console.log('Update Error?', dbResponse.error);
    console.log('Updated Rows Returned:', dbResponse.data);

    if (dbResponse.data && dbResponse.data.length === 0) {
        console.log('CONCLUSION: RLS IS BLOCKING ANON_KEY FROM UPDATING ROWS!');
    }
}

testSimpleUpdate();
