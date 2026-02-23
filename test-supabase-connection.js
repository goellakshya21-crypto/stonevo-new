import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('_dummy_').select('*').limit(1);
    // Even if the table doesn't exist, a successful request (or a specific error like 404) implies the client is configured correctly
    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      console.error('Connection error:', error.message);
      process.exit(1);
    }
    console.log('Supabase connection verified successfully (Client is talking to the server)');
  } catch (err) {
    console.error('Error during connection test:', err.message);
    process.exit(1);
  }
}

testConnection();
