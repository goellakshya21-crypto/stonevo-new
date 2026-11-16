/* global process, Buffer */
// Stand-alone prototype for the small-lots storefront.
//
// It lives beside the live app but shares nothing with its build: Vercel builds
// ../index.html + ../src only, and this config points Vite at this folder alone.
// Packages resolve from ../node_modules (same React / Tailwind / Supabase versions
// as the live site, so components port across unchanged), and env comes from
// ../.env.
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
// Renders live outside public/ on purpose: Vite reloads the page when a public
// file changes, which would kill a batch running in the render studio.
const rendersDir = path.join(here, 'renders');
const manifestPath = path.join(rendersDir, 'manifest.json');

const MAX_BODY_BYTES = 12 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCENE_RE = /^[a-z]{3,16}$/;

const readBody = (req) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (c) => {
            size += c.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error('Request body too large'));
                req.destroy();
                return;
            }
            chunks.push(c);
        });
        req.on('end', () => {
            if (!chunks.length) return resolve({});
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
            } catch (err) {
                reject(new Error('Body is not valid JSON: ' + err.message));
            }
        });
        req.on('error', reject);
    });

const readManifest = () => {
    try {
        return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
        return {};
    }
};

/**
 * Dev-only bridge to the live site's visualiser.
 *
 *  POST /api/generate-image   the live api/generate-image.js handler, unchanged
 *                             (same prompt path, model, cost log and rate limit)
 *  POST /__renders/save       write a finished render to ./renders + manifest
 *  GET  /renders/*            serve those files
 *
 * Only generate-image is bridged: it is the one endpoint the prototype needs.
 */
const liveVisualiser = () => ({
    name: 'live-visualiser',
    apply: 'serve',
    configureServer(server) {
        // The handlers read process.env, as on Vercel. Same mirroring the live
        // vite.config.js does, plus the service account file it falls back to.
        Object.assign(process.env, loadEnv('development', appRoot, ''));
        const keyFile = path.join(appRoot, 'hi.json');
        if (!process.env.GOOGLE_SERVICE_ACCOUNT && fs.existsSync(keyFile)) {
            process.env.GOOGLE_SERVICE_ACCOUNT = fs.readFileSync(keyFile, 'utf8');
        }

        server.middlewares.use(async (req, res, next) => {
            const url = (req.url || '').split('?')[0];
            const json = (code, obj) => {
                res.statusCode = code;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(obj));
            };

            if (url === '/api/generate-image') {
                res.status = (code) => {
                    res.statusCode = code;
                    return res;
                };
                res.json = (obj) => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(obj));
                    return res;
                };
                try {
                    const mod = await import(pathToFileURL(path.join(appRoot, 'api', 'generate-image.js')).href);
                    req.body = await readBody(req);
                    await mod.default(req, res);
                } catch (err) {
                    console.error('[live-visualiser] generate-image failed:', err);
                    if (!res.headersSent) json(500, { error: err.message });
                    else res.end();
                }
                return;
            }

            // Prototype-only stone swap (server/swapStone.js): its own prompt,
            // the live model, credentials and cost log. Imported per request
            // with a cache-buster so prompt edits apply without a restart.
            if (url === '/__proto/swap-stone' && req.method === 'POST') {
                try {
                    const v = Date.now();
                    const { swapStone } = await import(`${pathToFileURL(path.join(here, 'server', 'swapStone.js')).href}?v=${v}`);
                    const aiLog = await import(pathToFileURL(path.join(appRoot, 'api', '_aiLog.js')).href);
                    const out = await swapStone(await readBody(req), aiLog);
                    json(out.status, out.body);
                } catch (err) {
                    console.error('[stone-swap] route failed:', err);
                    json(500, { error: err.message });
                }
                return;
            }

            // Where named surfaces are in a photo, as boxes (server/locateSurfaces.js).
            if (url === '/__proto/locate' && req.method === 'POST') {
                try {
                    const v = Date.now();
                    const { locateSurfaces } = await import(`${pathToFileURL(path.join(here, 'server', 'locateSurfaces.js')).href}?v=${v}`);
                    const aiLog = await import(pathToFileURL(path.join(appRoot, 'api', '_aiLog.js')).href);
                    const out = await locateSurfaces(await readBody(req), aiLog);
                    json(out.status, out.body);
                } catch (err) {
                    console.error('[locate] route failed:', err);
                    json(500, { error: err.message });
                }
                return;
            }

            // Several stones on several surfaces in one render (server/mixStones.js).
            if (url === '/__proto/mix-stones' && req.method === 'POST') {
                try {
                    const v = Date.now();
                    const { mixStones } = await import(`${pathToFileURL(path.join(here, 'server', 'mixStones.js')).href}?v=${v}`);
                    const aiLog = await import(pathToFileURL(path.join(appRoot, 'api', '_aiLog.js')).href);
                    const out = await mixStones(await readBody(req), aiLog);
                    json(out.status, out.body);
                } catch (err) {
                    console.error('[mix-stones] route failed:', err);
                    json(500, { error: err.message });
                }
                return;
            }

            if (url === '/__renders/save' && req.method === 'POST') {
                try {
                    const { lotId, scene, name, dataUrl } = await readBody(req);
                    if (!UUID_RE.test(lotId || '') || !SCENE_RE.test(scene || '')) return json(400, { error: 'Bad lot or scene' });
                    const [, mime, b64] = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/) || [];
                    if (!b64) return json(400, { error: 'Expected an image data URL' });
                    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
                    const file = `${lotId}-${scene}.${ext}`;
                    fs.mkdirSync(rendersDir, { recursive: true });
                    fs.writeFileSync(path.join(rendersDir, file), Buffer.from(b64, 'base64'));
                    const manifest = readManifest();
                    // Versioned URL: a re-render keeps its file name, and browsers
                    // would otherwise keep showing the cached old picture.
                    const url = `/renders/${file}?v=${Date.now().toString(36)}`;
                    manifest[lotId] = { ...(manifest[lotId] || {}), name: name || manifest[lotId]?.name, [scene]: url };
                    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
                    return json(200, { url });
                } catch (err) {
                    return json(500, { error: err.message });
                }
            }

            // The hero tour: which saved renders the first screen shows by default.
            if (url === '/__renders/tour' && req.method === 'POST') {
                try {
                    const { items } = await readBody(req);
                    if (!Array.isArray(items) || items.length > 20) return json(400, { error: 'Expected up to 20 items' });
                    const clean = items
                        .filter((it) => UUID_RE.test(it?.lotId || '') && SCENE_RE.test(it?.scene || '') && /^[a-z-]{3,30}$/.test(it?.style || ''))
                        .map(({ lotId, scene, style }) => ({ lotId, scene, style }));
                    fs.mkdirSync(rendersDir, { recursive: true });
                    fs.writeFileSync(path.join(rendersDir, 'tour.json'), JSON.stringify({ items: clean, savedAt: new Date().toISOString() }, null, 2));
                    return json(200, { saved: clean.length });
                } catch (err) {
                    return json(500, { error: err.message });
                }
            }

            if (url.startsWith('/renders/') && req.method === 'GET') {
                const name = path.basename(url);
                const file = path.join(rendersDir, name);
                if (name === 'manifest.json') {
                    res.setHeader('Cache-Control', 'no-store');
                    return json(200, readManifest());
                }
                if (name === 'tour.json') {
                    res.setHeader('Cache-Control', 'no-store');
                    if (!fs.existsSync(file)) return json(200, { items: [] });
                    return json(200, JSON.parse(fs.readFileSync(file, 'utf8')));
                }
                if (!fs.existsSync(file)) return next();
                const ext = path.extname(name).slice(1);
                res.setHeader('Content-Type', ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=3600');
                return fs.createReadStream(file).pipe(res);
            }

            return next();
        });
    },
});

export default defineConfig({
    root: here,
    envDir: appRoot,
    // Own cache, so running this never invalidates the live app's dev cache.
    cacheDir: path.join(here, '.vite-cache'),
    plugins: [react(), liveVisualiser()],
    css: {
        postcss: {
            plugins: [tailwindcss(path.join(here, 'tailwind.config.js')), autoprefixer()],
        },
    },
    server: {
        port: 5180,
        strictPort: true,
        // The live visualiser modules are imported from ../src.
        fs: { allow: [appRoot] },
        watch: { ignored: [rendersDir.replace(/\\/g, '/') + '/**'] },
    },
    preview: { port: 4180, strictPort: true },
    build: { outDir: path.join(here, 'dist'), emptyOutDir: true },
});
