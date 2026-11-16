// Build the small-lots prototype into the live site's build, at ston.co.in/lots
// (decided 2026-11-16). Runs after the live `vite build` (package.json "build"),
// so Vercel builds both from one push to main:
//
//   dist/lots/      the prototype, built with base /lots/ (hash routes: /lots#/review)
//   dist/renders/   its saved room renders and their manifest, at the root path
//                   the prototype asks for (/renders/manifest.json)
//
// Its server routes are api/lots-proto.js, mapped in vercel.json. The mobile
// app build (app:build) does not run this, so /lots is website only.
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const out = path.join(appRoot, 'dist', 'lots');

execSync(`npx vite build --config lots-prototype/vite.config.js --base /lots/ --outDir "${out}" --emptyOutDir`, { cwd: appRoot, stdio: 'inherit' });

// Not for search engines: it is a prototype (vercel.json also sends X-Robots-Tag).
const index = path.join(out, 'index.html');
fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace('<head>', '<head>\n    <meta name="robots" content="noindex, nofollow" />'));

fs.cpSync(path.join(here, 'renders'), path.join(appRoot, 'dist', 'renders'), { recursive: true });
console.log('Built the lots prototype into dist/lots (and dist/renders).');
