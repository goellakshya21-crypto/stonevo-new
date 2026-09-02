import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel accepts a 4.5MB request body; a facade render can carry the slab panel,
// the user's room photo AND the region mask at once, so allow headroom above that
// locally and fail loudly rather than truncating.
const MAX_BODY_BYTES = 10 * 1024 * 1024;

const readBody = (req) => new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY_BYTES) {
            reject(new Error(`Request body over ${MAX_BODY_BYTES} bytes`));
            req.destroy();
            return;
        }
        chunks.push(c);
    });
    req.on('end', () => {
        if (!chunks.length) { resolve({}); return; }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (err) { reject(new Error('Body is not valid JSON: ' + err.message)); }
    });
    req.on('error', reject);
});

/**
 * Serve the /api/* Vercel functions during `npm run dev`.
 *
 * Plain `vite` serves the client only, so every /api call 404s locally and the
 * whole AI render path can only be exercised on a deploy — which is a slow and
 * expensive way to find out a prompt is wrong. `vercel dev` does this properly
 * but needs CLI auth; this needs nothing.
 *
 * The handlers are real Vercel functions, so they expect Express-ish shapes that
 * node's http server does not provide: a parsed `req.body`, and `res.status().json()`.
 * Both are shimmed below. Modules load through ssrLoadModule so they get Vite's
 * resolution and are re-read on edit, same as client code.
 *
 * Dev only — `apply: 'serve'` keeps it out of the production build, where Vercel
 * runs these as genuine serverless functions.
 */
const vercelApiDev = () => ({
    name: 'vercel-api-dev',
    apply: 'serve',
    configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
            const url = req.url || '';
            if (!url.startsWith('/api/')) return next();

            const route = url.split('?')[0].slice('/api/'.length).replace(/\/+$/, '');
            // api/_rateLimit.js is a shared helper, not an endpoint. Vercel does not
            // route underscore-prefixed files either.
            if (!route || route.startsWith('_') || route.includes('..')) return next();

            // Express-ish surface the handlers are written against.
            res.status = (code) => { res.statusCode = code; return res; };
            res.json = (obj) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(obj));
                return res;
            };
            res.send = (data) => { res.end(data); return res; };

            let mod;
            try {
                mod = await server.ssrLoadModule(`/api/${route}.js`);
            } catch {
                // No such function — let Vite 404 it as it would any other path.
                return next();
            }

            const handler = mod?.default;
            if (typeof handler !== 'function') {
                res.status(500).json({ error: `api/${route}.js has no default export` });
                return;
            }

            try {
                req.body = await readBody(req);
                await handler(req, res);
            } catch (err) {
                console.error(`[vercel-api-dev] /api/${route} failed:`, err);
                if (!res.headersSent) res.status(500).json({ error: err.message });
                else res.end();
            }
        });
    },
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    // The api/* handlers read process.env (Vercel populates it for them). Vite only
    // exposes VITE_-prefixed vars to the client, so mirror the .env files into
    // process.env for the dev handlers. '' as the prefix loads every key, which is
    // what lets api/_rateLimit.js find VITE_SUPABASE_URL. GOOGLE_SERVICE_ACCOUNT is
    // not in .env; generate-image.js falls back to reading hi.json from the repo
    // root, which is how this works locally without it.
    Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

    return {
        plugins: [react(), vercelApiDev()],
    };
});
