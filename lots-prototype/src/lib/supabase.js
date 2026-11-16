import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Read-only use: this prototype never inserts, updates or deletes.
export const supabase = url && key ? createClient(url, key) : null;
