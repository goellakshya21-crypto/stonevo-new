/* global process, Buffer */
// Prototype-only: put a stone onto one surface of an existing photo.
//
// Used for every "edit a picture" job in the prototype: comparing two lots in
// one of our rooms (the second stone goes into the first one's render), and
// anything in the buyer's own room photo. Same model, credentials and cost log
// as the live api/generate-image.js, which is NOT changed; only the prompt is
// different.
//
// Why not the live own-photo prompt: it is written to protect the buyer's room
// ("keep the room identical", "only the surface is updated", "do not add
// anything"), and it never says the surface must end up looking different. On
// a render whose surface already shows a pale stone, or where the surface is a
// small part of the frame (a table top seen edge-on), the model takes the safe
// way out and hands the photo back almost untouched. The comparison then shows
// the same stone on both sides of the slider.
//
// This prompt:
//   - gives the photo to edit FIRST and names it, then the new stone;
//   - when we know what the surface is made of now (comparisons in our rooms),
//     sends that stone too, so the model can find every patch of it;
//   - says what the surface must look like afterwards, in words as well as by
//     picture, and that returning the photo unchanged is a failure;
//   - on a second attempt (`insist`), says the first came back unchanged.
// The client measures whether the surface really changed and asks again once.

import { GoogleGenAI } from '@google/genai';

export const MODEL = 'gemini-2.5-flash-image';

export const isQuota = (err) => err?.status === 429 || /429|RESOURCE_EXHAUSTED/i.test(String(err?.message || err));

export const parseDataUrl = (s) => {
    const [, mime, data] = String(s || '').match(/^data:(image\/[\w+.-]+);base64,(.+)$/) || [];
    return mime && data ? { mimeType: mime, data } : null;
};

async function imagePart(dataUrl, url) {
    const inline = parseDataUrl(dataUrl);
    if (inline) return { inlineData: inline };
    if (!url) return null;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Stone image fetch failed: ${r.status}`);
    return { inlineData: { mimeType: r.headers.get('content-type') || 'image/jpeg', data: Buffer.from(await r.arrayBuffer()).toString('base64') } };
}

// Plain words for a stone, from what the storefront knows about it.
export const describe = (s) => {
    const colours = (s.colors || []).filter(Boolean).map((c) => c.toLowerCase());
    const pattern = (s.pattern || []).filter(Boolean).map((p) => p.toLowerCase());
    return [
        colours.length ? colours.join(' and ') : null,
        s.family ? s.family.toLowerCase() : 'natural stone',
        pattern.length ? `(${pattern.join(', ')})` : null,
    ]
        .filter(Boolean)
        .join(' ');
};

// Where the joints of a cols x rows book-matched panel fall, in words.
const jointsOf = ({ cols = 1, rows = 1 } = {}) => {
    const v = cols - 1;
    const h = rows - 1;
    if (!v && !h) return 'no joints at all';
    const parts = [];
    if (v) parts.push(v === 1 ? 'one vertical joint down the middle' : `${v} vertical joints`);
    if (h) parts.push(h === 1 ? 'one horizontal joint across the middle' : `${h} horizontal joints`);
    return parts.join(' and ');
};

export function buildSwapPrompt({ stone, current, surface, where, panel, panelGrid, insist, hasCurrentImage }) {
    const s = surface.toLowerCase();
    const newDesc = `"${stone.name}", a ${describe(stone)}`;
    const lines = [
        `Edit a photograph. You are given ${hasCurrentImage ? 'three' : 'two'} images.`,
        `IMAGE 1 is the photograph to edit: a room.`,
        `IMAGE 2 is a sample of the NEW stone, ${newDesc}.`,
    ];
    if (hasCurrentImage)
        lines.push(
            `IMAGE 3 is a sample of the stone the ${s} is made of RIGHT NOW in image 1, "${current.name}", a ${describe(current)}. Use it to find the ${s}: every area of image 1 that shows this stone must be replaced.`,
        );
    lines.push(
        '',
        `TASK: re-surface the ${s} in image 1 with the stone from image 2.`,
        `Which surface: ${where}. Cover ALL of its visible area, including its visible edges and sides, not just part of it.`,
        current
            ? `It is currently ${current.name} (${describe(current)}). That material must be completely gone from the ${s}; no trace of it may remain.`
            : `Whatever material the ${s} has now must be completely replaced.`,
        `New material: copy image 2 exactly: its background colour, its vein colour, the direction, thickness and spacing of its veins, and its grain. Do not invent veins, colours or patterns that are not in image 2.`,
        // Measured 2026-11-14: a 2-slab panel of landscape slabs is about 3:1,
        // and on a squarer wall the model stacked copies of it to fill the
        // height, so 2 slabs came back as 4 or 6. Cropping is fine (real slabs
        // run past a wall's edges); repeating is not.
        panel
            ? [
                  `Image 2 is ONE finished book-matched panel: ${panel.replace(/^a finished panel of /, '')}.`,
                  `Put this one panel on the ${s} exactly once, in the surface's perspective. If its shape does not match the surface, scale the whole panel up until it covers the surface and let what does not fit run off the edges.`,
                  `Never repeat, stack, tile or mirror the panel again to fill space.`,
                  panelGrid?.count > 1
                      ? `The finished ${s} shows exactly ${panelGrid.count} slabs, no more: ${jointsOf(panelGrid)}, each a hairline. Count them before you answer.`
                      : `The finished ${s} shows one slab: no joints, seams or grout lines.`,
              ].join(' ')
            : `Lay it as one continuous slab in the surface's perspective. No grout lines, tiles, borders or seams.`,
        `Finish: polished natural stone that catches the room's existing light, with soft reflections of what is around it.`,
        '',
        `KEEP everything else exactly as in image 1: the camera position and framing, the furniture, the objects (anything standing on the ${s} stays where it is), the walls, floor and ceiling that are not the ${s}, the lighting and the shadows. Do not add, remove or move anything.`,
        '',
        `The change must be obvious. Anyone comparing the result with image 1 must see at once that the ${s} is now ${stone.name}, ${describe(stone)}. Returning image 1 unchanged, or with the ${s} still looking like the old material, is a failure.`,
        // Measured: without this line the first answer came back with the
        // surface untouched most of the time; with it (it was the retry's
        // wording) the surface changed.
        `This edit is often returned with the ${s} unchanged. Do not do that: the ${s} MUST visibly show the new stone from image 2.`,
    );
    if (insist)
        lines.push(
            `A previous attempt returned the photo with the ${s} unchanged. This time the ${s} MUST be re-surfaced with the new stone from image 2, clearly and completely.`,
        );
    lines.push('', 'Return one photorealistic image with exactly the same framing and aspect ratio as image 1.');
    return lines.join('\n');
}

export async function swapStone(body, { logAiCall, usageOf }) {
    const startedAt = Date.now();
    const { roomImage, stoneImage, stoneImageUrl, currentImageUrl, stone, current, surface, where, panel, panelGrid, insist, aspectRatio } = body || {};
    // Test knobs: which Vertex endpoint ('us-central1' | 'global'), or the
    // Gemini API with the API key ('gemini-api'), and how many tries on "busy".
    const location = body?.location === 'global' ? 'global' : body?.location === 'gemini-api' ? 'gemini-api' : 'us-central1';
    const maxAttempts = Math.min(3, Math.max(1, Number(body?.maxAttempts) || 3));
    const room = parseDataUrl(roomImage);
    if (!room) return { status: 400, body: { error: 'roomImage must be an image data URL.' } };
    if (!stone?.name || !surface) return { status: 400, body: { error: 'stone and surface are required.' } };

    let attempts = 0;
    let usage = {};
    const record = (extra) =>
        logAiCall({
            endpoint: 'generate-image',
            callType: 'own_photo',
            model: MODEL,
            latencyMs: Date.now() - startedAt,
            attempts: attempts || 1,
            ...usage,
            meta: { prototype: 'stone_swap', surface: String(surface).slice(0, 40), insist: !!insist, has_current: !!currentImageUrl, location },
            ...extra,
        });

    try {
        // A request that never answers would hang the buyer's screen forever;
        // a render takes 10–25 s, so 90 s is plenty.
        const httpOptions = { timeout: 90000 };
        let ai;
        if (location === 'gemini-api') {
            const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error('No Gemini API key configured.');
            ai = new GoogleGenAI({ vertexai: false, apiKey, httpOptions });
        } else {
            const keyData = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || 'null');
            if (!keyData) throw new Error('Service account credentials not found.');
            ai = new GoogleGenAI({
                vertexai: true,
                project: keyData.project_id,
                location,
                googleAuthOptions: { credentials: { client_email: keyData.client_email, private_key: keyData.private_key } },
                httpOptions,
            });
        }

        const newStone = await imagePart(stoneImage, stoneImageUrl);
        if (!newStone) throw new Error('No stone image.');
        const currentStone = current && currentImageUrl ? await imagePart(null, currentImageUrl).catch(() => null) : null;

        const prompt = buildSwapPrompt({ stone, current, surface, where: where || surface, panel, panelGrid, insist, hasCurrentImage: !!currentStone });
        const parts = [{ text: prompt }, { inlineData: room }, newStone];
        if (currentStone) parts.push(currentStone);

        let response;
        for (;;) {
            attempts++;
            try {
                response = await ai.models.generateContent({
                    model: MODEL,
                    contents: [{ role: 'user', parts }],
                    ...(aspectRatio ? { config: { imageConfig: { aspectRatio } } } : {}),
                });
                break;
            } catch (err) {
                if (!isQuota(err) || attempts >= maxAttempts) throw err;
                const wait = Math.round((attempts === 1 ? 3000 : 7000) * (0.75 + Math.random() * 0.5));
                console.warn(`[stone-swap] quota 429, retrying in ${wait}ms`);
                await new Promise((r) => setTimeout(r, wait));
            }
        }
        usage = usageOf(response);
        const img = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
        if (!img) {
            const text = response.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
            throw new Error(`The model returned text instead of an image: ${String(text || '').slice(0, 100)}`);
        }
        console.log(`[stone-swap] ${stone.name} -> ${surface}${insist ? ' (insist)' : ''}: ok in ${Date.now() - startedAt} ms`);
        await record({ success: true, status: 200 });
        return { status: 200, body: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` } };
    } catch (err) {
        console.error('[stone-swap] failed:', err?.message || err);
        await record({ success: false, status: isQuota(err) ? 429 : 500, error: err?.message || String(err) });
        return isQuota(err)
            ? { status: 429, body: { error: 'The image service is busy right now. Please wait a few seconds and try again.' } }
            : { status: 500, body: { error: err?.message || String(err) } };
    }
}
