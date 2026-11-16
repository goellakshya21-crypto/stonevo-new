// Stage the prototype for its separate preview link (a Vercel project of its
// own, never the live site's stonevo-v5). Builds, then copies the build and
// the saved room renders into ./ston-lots-preview, which is what gets deployed.
//
//   node lots-prototype/stage-preview.mjs
//   cd lots-prototype/ston-lots-preview && vercel deploy --prod --yes
//
// Static only: everything works except making NEW AI pictures (those need the
// dev server's render routes). The page and robots.txt ask search engines not
// to index it; anyone with the link can still open it.
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'ston-lots-preview');

execSync('npx vite build --config lots-prototype/vite.config.js', { cwd: path.resolve(here, '..'), stdio: 'inherit' });

// Keep the Vercel link (.vercel) between stagings; replace everything else.
fs.mkdirSync(out, { recursive: true });
for (const name of fs.readdirSync(out)) if (name !== '.vercel') fs.rmSync(path.join(out, name), { recursive: true, force: true });
fs.cpSync(path.join(here, 'dist'), out, { recursive: true });
fs.cpSync(path.join(here, 'renders'), path.join(out, 'renders'), { recursive: true });

const index = path.join(out, 'index.html');
fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace('<head>', '<head>\n    <meta name="robots" content="noindex, nofollow" />'));
fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

console.log(`Staged ${out}`);
