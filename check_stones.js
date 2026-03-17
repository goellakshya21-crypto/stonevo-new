import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function deepDive() {
    const { data, error } = await supabase
        .from('stones')
        .select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Total stones:', data.length);
    
    const noApp = data.filter(s => !s.application || (Array.isArray(s.application) && s.application.length === 0));
    console.log('Stones with NO application:', noApp.length);

    const withApp = data.filter(s => s.application && (Array.isArray(s.application) ? s.application.length > 0 : true));
    
    const appCounts = {};
    withApp.forEach(s => {
        const apps = Array.isArray(s.application) ? s.application : [s.application];
        apps.forEach(a => {
            appCounts[a] = (appCounts[a] || 0) + 1;
        });
    });

    console.log('Application Counts:');
    console.table(appCounts);

    if (noApp.length > 0) {
        console.log('Sample stones with NO application:');
        console.table(noApp.slice(0, 5).map(s => ({ name: s.name, created: s.created_at })));
    }
}

deepDive();
