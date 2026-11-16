// The small-lots prototype's server routes, for ston.co.in/lots (decided
// 2026-11-16). vercel.json rewrites the prototype's dev-server paths here:
//
//   /__proto/swap-stone  -> ?route=swap    one stone onto one surface of a picture
//   /__proto/locate      -> ?route=locate  where each surface is in a picture, as boxes
//   /__proto/mix-stones  -> ?route=mix     several stones in one picture (Design a room)
//   /__renders/save      -> ?route=save    a finished room render (handed straight back)
//   /__renders/tour      -> ?route=tour    the render studio's hero tour (localhost only)
//
// The image work is the same code the prototype's dev server runs
// (lots-prototype/server/), behind the live per-visitor rate limiter and the
// AI cost log. The prototype's own room renders still go through the live
// /api/generate-image, unchanged.
import { swapStone } from '../lots-prototype/server/swapStone.js';
import { locateSurfaces } from '../lots-prototype/server/locateSurfaces.js';
import { mixStones } from '../lots-prototype/server/mixStones.js';
import { clientIp, rateLimit } from './_rateLimit.js';
import * as aiLog from './_aiLog.js';

// Billed image calls per visitor per hour, across swap, locate and mix.
const PER_HOUR = 60;
const AI = { swap: swapStone, locate: locateSurfaces, mix: mixStones };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCENE_RE = /^[a-z]{3,16}$/;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const route = String(req.query?.route || '');
    const body = req.body || {};

    // On the dev server a finished room render is written to disk so everyone
    // sees it. A function has no disk to keep it on, so it goes straight back
    // and shows for the visitor who made it (saving for all needs a bucket).
    if (route === 'save') {
        const { lotId, scene, dataUrl } = body;
        if (!UUID_RE.test(lotId || '') && !/^yard-[a-z0-9-]+$/.test(lotId || '')) return res.status(400).json({ error: 'Bad lot' });
        if (!SCENE_RE.test(scene || '')) return res.status(400).json({ error: 'Bad scene' });
        if (!/^data:image\/(jpeg|png|webp);base64,/.test(String(dataUrl || ''))) return res.status(400).json({ error: 'Expected an image data URL' });
        return res.status(200).json({ url: dataUrl, saved: false });
    }
    if (route === 'tour') return res.status(501).json({ error: 'Saving the tour only works on localhost.' });

    const run = AI[route];
    if (!run) return res.status(404).json({ error: 'Unknown route' });
    if (!(await rateLimit(`lots:${clientIp(req)}`, PER_HOUR, 3600))) {
        return res.status(429).json({ error: 'Too many pictures in an hour from here. Please try again a little later.' });
    }
    try {
        const out = await run(body, aiLog);
        return res.status(out.status).json(out.body);
    } catch (err) {
        console.error(`[lots-proto:${route}] failed:`, err);
        return res.status(500).json({ error: err.message || 'Something went wrong' });
    }
}
