import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { STONE_ALIASES, getAliases } from '../src/lib/stoneAliases.js';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const normalize = (s) => (s || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();

async function verify() {
    const { data, error } = await supabase.from('stones').select('name').order('name');
    if (error) { console.error(error); return; }

    const allNames = data.map(s => s.name);
    console.log(`\nTotal stones in DB: ${allNames.length}\n`);

    // 1. For each canonical → which DB stones contain it?
    console.log('═'.repeat(80));
    console.log('CANONICAL → DB MATCHES (contains-based)');
    console.log('═'.repeat(80));
    const noMatch = [];
    for (const canonical of Object.keys(STONE_ALIASES)) {
        const c = normalize(canonical);
        const matches = allNames.filter(n => normalize(n).includes(c));
        const status = matches.length === 0 ? '❌' : matches.length === 1 ? '✓' : `✓ (${matches.length})`;
        console.log(`\n${status}  "${canonical}"`);
        if (matches.length === 0) {
            console.log('     → NO MATCHES in DB');
            noMatch.push(canonical);
        } else {
            matches.slice(0, 5).forEach(m => console.log(`     • ${m}`));
            if (matches.length > 5) console.log(`     ... +${matches.length - 5} more`);
        }
    }

    // 2. Reverse: for each alias, simulate a search → what would surface?
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('ALIAS → SIMULATED SEARCH RESULTS (what user sees when typing alias)');
    console.log('═'.repeat(80));
    const allAliases = new Set();
    for (const aliases of Object.values(STONE_ALIASES)) {
        aliases.forEach(a => allAliases.add(a));
    }

    for (const alias of Array.from(allAliases).sort()) {
        // Stones surfaced = any stone whose getAliases() includes this alias
        const surfaced = allNames.filter(n => getAliases(n).map(normalize).includes(normalize(alias)));
        const status = surfaced.length === 0 ? '❌' : `${surfaced.length}`;
        console.log(`\n[${status}] "${alias}"`);
        if (surfaced.length === 0) {
            console.log('     → no DB stones would surface');
        } else {
            surfaced.slice(0, 6).forEach(m => console.log(`     • ${m}`));
            if (surfaced.length > 6) console.log(`     ... +${surfaced.length - 6} more`);
        }
    }

    // 3. Summary
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Canonicals with NO DB match: ${noMatch.length}`);
    if (noMatch.length) {
        noMatch.forEach(c => console.log(`  ❌  "${c}"`));
    }
    console.log(`\nTotal unique aliases: ${allAliases.size}`);
    console.log(`Total canonicals in map: ${Object.keys(STONE_ALIASES).length}`);
}

verify();
