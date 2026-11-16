/* global process */
// Prototype-only: find where named surfaces are in a room photo, as boxes.
//
// "Design a room" changes several surfaces in one render. When the buyer
// marks each one with a box, the render gets a colour-coded guide and every
// box is checked afterwards. When they don't, the model was left to find the
// surfaces itself, and it sometimes changed only one of them (floor yes, wall
// no) with nothing able to tell. So unmarked surfaces are located first with a
// cheap Gemini text call that returns bounding boxes, and then go through the
// same guided, checked path as marked ones.
//
// Gemini returns boxes as [ymin, xmin, ymax, xmax] on a 0–1000 scale.

import { GoogleGenAI } from '@google/genai';
import { isQuota, parseDataUrl } from './swapStone.js';

const MODEL = 'gemini-2.5-flash';

export async function locateSurfaces(body, { logAiCall, usageOf }) {
    const startedAt = Date.now();
    const image = parseDataUrl(body?.image);
    const surfaces = Array.isArray(body?.surfaces) ? body.surfaces.slice(0, 3) : [];
    if (!image || !surfaces.length) return { status: 400, body: { error: 'image and surfaces are required.' } };

    let usage = {};
    const record = (extra) =>
        logAiCall({
            endpoint: 'gemini-vertex',
            callType: 'locate_surfaces',
            model: MODEL,
            latencyMs: Date.now() - startedAt,
            attempts: 1,
            ...usage,
            meta: { prototype: 'locate_surfaces', surfaces: surfaces.length },
            ...extra,
        });

    const prompt = [
        'This is a photograph of a room. Find these surfaces in it:',
        ...surfaces.map((s) => `${s.number}. ${s.label}: ${s.where}`),
        '',
        'For each, give the bounding box around ALL of its visible area as [ymin, xmin, ymax, xmax], each a number from 0 to 1000 relative to the image height and width. If a surface is not visible in the photo, give null for its box.',
        'For a wall, box the main wall area the description refers to, not the ceiling or the floor. For a floor, box the visible floor. For a table or counter, box its top surface.',
        'Answer with JSON only, exactly in this form: [{"number": 1, "box": [ymin, xmin, ymax, xmax]}, ...]',
    ].join('\n');

    try {
        const keyData = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || 'null');
        if (!keyData) throw new Error('Service account credentials not found.');
        const ai = new GoogleGenAI({
            vertexai: true,
            project: keyData.project_id,
            location: 'us-central1',
            googleAuthOptions: { credentials: { client_email: keyData.client_email, private_key: keyData.private_key } },
            httpOptions: { timeout: 30000 },
        });
        const response = await ai.models.generateContent({
            model: MODEL,
            contents: [{ role: 'user', parts: [{ inlineData: image }, { text: prompt }] }],
            config: { responseMimeType: 'application/json', temperature: 0 },
        });
        usage = usageOf(response);
        const text = response.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '[]';
        const raw = JSON.parse(text);
        const boxes = (Array.isArray(raw) ? raw : [])
            .map((r) => {
                const b = Array.isArray(r?.box) ? r.box.map(Number) : null;
                if (!b || b.length !== 4 || b.some((v) => !Number.isFinite(v))) return { number: Number(r?.number), region: null };
                const [y0, x0, y1, x1] = b.map((v) => Math.min(1000, Math.max(0, v)) / 1000);
                const region = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
                return { number: Number(r?.number), region: region.w > 0.02 && region.h > 0.02 ? region : null };
            })
            .filter((r) => Number.isInteger(r.number));
        console.log(`[locate] ${surfaces.length} surfaces: ${boxes.filter((b) => b.region).length} found in ${Date.now() - startedAt} ms`);
        await record({ success: true, status: 200 });
        return { status: 200, body: { boxes } };
    } catch (err) {
        console.error('[locate] failed:', err?.message || err);
        await record({ success: false, status: isQuota(err) ? 429 : 500, error: err?.message || String(err) });
        return { status: isQuota(err) ? 429 : 500, body: { error: err?.message || String(err) } };
    }
}
