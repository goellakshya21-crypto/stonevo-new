import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkStorage() {
    const { data, error } = await supabase.storage.from('marble-images').list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
    });

    if (error) {
        console.error('Storage Error:', error);
        return;
    }

    console.log(`Total files in storage bucket 'marble-images': ${data.length}`);
    
    // Also let's check stones created today
    const { count: stonesTodayCount } = await supabase
        .from('stones')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString());

    console.log(`Total stones inserted into DB today: ${stonesTodayCount}`);
}

checkStorage();
