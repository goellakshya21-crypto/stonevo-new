require('dotenv').config();
const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkApplications() {
    console.log("Fetching unique stone applications...");
    const { data, error } = await supabase
        .from('stones')
        .select('application');

    if (error) {
        console.error("Error:", error);
        return;
    }

    const apps = new Set();
    data.forEach(item => {
        if (Array.isArray(item.application)) {
            item.application.forEach(a => apps.add(a));
        } else if (item.application) {
            apps.add(item.application);
        }
    });

    console.log("Unique Applications found:", Array.from(apps).join(', '));
}

checkApplications();
