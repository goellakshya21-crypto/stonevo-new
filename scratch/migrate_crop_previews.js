// One-off: move base64 crop previews out of leads.custom_stones into Storage.
//
// Each custom stone's cropped_image_url used to be a ~2 MB data URL stored in
// the row itself (leads was 55% of the database). This uploads each one to the
// chat-files bucket and swaps in the public URL.
//
// Needs the service-role key (RLS blocks writing other people's rows):
//   SUPABASE_SERVICE_ROLE_KEY=... node scratch/migrate_crop_previews.js          (dry run)
//   SUPABASE_SERVICE_ROLE_KEY=... node scratch/migrate_crop_previews.js --apply  (write)
//
// Afterwards, run `VACUUM FULL public.leads;` in the SQL editor to hand the
// space back.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
    console.error('Set SUPABASE_SERVICE_ROLE_KEY (Dashboard → Project Settings → API).');
    process.exit(1);
}
const supabase = createClient(process.env.VITE_SUPABASE_URL, key, { auth: { persistSession: false } });

const { data: leads, error } = await supabase
    .from('leads')
    .select('id, full_name, custom_stones')
    .not('custom_stones', 'is', null);
if (error) throw error;

let moved = 0, bytes = 0;
for (const lead of leads) {
    const stones = Array.isArray(lead.custom_stones) ? lead.custom_stones : [];
    let changed = false;
    const updated = [];

    for (const stone of stones) {
        const src = stone.cropped_image_url;
        const m = typeof src === 'string' && src.match(/^data:([^;]+);base64,(.+)$/);
        if (!m) { updated.push(stone); continue; }

        const buf = Buffer.from(m[2], 'base64');
        const ext = m[1].split('/')[1] || 'png';
        const path = `custom-stones/${stone.id}_crop.${ext}`;
        console.log(`${lead.full_name} | ${stone.name} → ${path} (${(src.length / 1024).toFixed(0)} KB)`);
        bytes += src.length;

        if (!APPLY) { updated.push(stone); continue; }

        const { error: upErr } = await supabase.storage
            .from('chat-files')
            .upload(path, buf, { upsert: true, contentType: m[1] });
        if (upErr) {
            // Leave this stone untouched rather than lose its preview.
            console.error('  upload failed, keeping inline:', upErr.message);
            updated.push(stone);
            continue;
        }
        const { publicUrl } = supabase.storage.from('chat-files').getPublicUrl(path).data;
        updated.push({ ...stone, cropped_image_url: publicUrl });
        changed = true;
        moved++;
    }

    if (APPLY && changed) {
        const { error: updErr } = await supabase
            .from('leads')
            .update({ custom_stones: updated })
            .eq('id', lead.id);
        if (updErr) console.error(`  saving ${lead.full_name} failed:`, updErr.message);
        else console.log(`  saved ${lead.full_name}`);
    }
}

console.log(APPLY
    ? `\nMoved ${moved} previews (${(bytes / 1024 / 1024).toFixed(1)} MB). Now run: VACUUM FULL public.leads;`
    : `\nDry run: ${(bytes / 1024 / 1024).toFixed(1)} MB of inline previews found. Re-run with --apply to migrate.`);
