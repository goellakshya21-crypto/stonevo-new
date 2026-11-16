/* global process */
// Prototype-only: several stones on several surfaces of one picture, in ONE
// render. "Floor in stone 1, dining table top in stone 2, highlighter wall in
// stone 3."
//
// The image model takes at most 3 images per request, so whatever the number
// of stones, the request is always:
//   IMAGE 1  the photo to edit (already in one of the model's native frames, so
//            it comes back in exactly the same frame; see toFrame in renders.js)
//   IMAGE 2  the same photo with a coloured, numbered box over each surface the
//            buyer marked (sent only when at least one was marked)
//   IMAGE 3  a materials board: every stone side by side, each framed in its
//            colour and numbered
// and the prompt ties colour + number + surface + stone together in words.
//
// Same model, credentials and cost log as the live api/generate-image.js,
// which is not changed.

import { GoogleGenAI } from '@google/genai';
import { describe, isQuota, MODEL, parseDataUrl } from './swapStone.js';

export function buildMixPrompt({ items, hasGuide, insist }) {
    const n = items.length;
    const lines = [
        `Edit a photograph. You are given ${hasGuide ? 'three' : 'two'} images.`,
        `IMAGE 1 is the photograph to edit: a room.`,
    ];
    if (hasGuide) {
        lines.push(
            `IMAGE 2 is NOT a photograph. It is a colour map with the same shape as image 1: a black canvas where each coloured rectangle shows where a surface is in image 1 (${items
                .filter((it) => it.hasRegion)
                .map((it) => `the ${it.colorName} area is the ${it.surface.toLowerCase()}`)
                .join('; ')}). Where rectangles overlap, the smaller one is on top. Use it only to find the surfaces.`,
        );
    }
    lines.push(
        `IMAGE ${hasGuide ? 3 : 2} is a materials board of ${n} natural stone ${n === 1 ? 'sample' : 'samples'}, each framed in a colour and numbered: ${items
            .map((it) => `${it.number} (${it.colorName}) is "${it.stone.name}", a ${describe(it.stone)}`)
            .join('; ')}.`,
        '',
        `TASK: in ONE edit of image 1, re-surface ${n === 1 ? 'this surface' : `these ${n} surfaces`}, each with its own stone from the board:`,
    );
    items.forEach((it) => {
        // A boxed surface is exactly its map area: that decides WHICH wall or
        // floor, even when two surfaces have the same kind ("feature wall 1"
        // and "feature wall 2").
        const where =
            it.hasRegion && hasGuide
                ? `${it.where}: exactly the ${it.colorName} area of the map in image 2. Re-surface the existing ${String(it.kind || it.surface).toLowerCase()} inside that area only; do not change any other ${String(it.kind || it.surface).toLowerCase()}, and do not build anything new there`
                : it.where;
        lines.push(`${it.number}. The ${it.surface.toLowerCase()} (${where}): stone ${it.number}, "${it.stone.name}".`);
    });
    lines.push(
        '',
        `For every surface: cover ALL of its visible area, including visible edges and sides. Copy its stone from the board exactly: background colour, vein colour, the direction, thickness and spacing of the veins, and the grain. Do not invent veins or colours. Lay it as large-format natural stone slabs that follow the surface's perspective, with no grout lines, tiles, borders or seams. Polished, catching the room's existing light.`,
        `Each stone goes ONLY on its own surface. Do not mix the stones, swap them, or put any of them anywhere else.`,
        '',
        `KEEP everything else exactly as in image 1: the camera position and framing, the furniture and objects (anything standing on a surface stays where it is), every wall, floor and surface not listed above, the lighting and the shadows. Do not add, remove or move anything.`,
        hasGuide
            ? `Copy NOTHING from image 2 into the result: no rectangles, outlines, lines, numbers or colour tints. Its colours are only labels; nothing in the result (a TV, a wall, furniture) may take on its red, blue or green.`
            : '',
        '',
        `The change must be obvious. Anyone comparing the result with image 1 must see at once that ${n === 1 ? 'the surface is' : 'each of these surfaces is'} now the new stone. This edit is often returned unchanged; that is a failure.`,
        // Measured: with two unmarked surfaces the model changed the floor and
        // left the wall, so the count is spelled out.
        n > 1 ? `Make ALL ${n} changes listed above in this one image. A result where any one of the ${n} surfaces still shows its old material is a failure.` : '',
    );
    if (insist) lines.push(`A previous attempt returned the photo with the surfaces unchanged. This time every listed surface MUST visibly show its new stone.`);
    lines.push('', 'Return one photorealistic image with exactly the same framing and aspect ratio as image 1.');
    return lines.filter((l) => l !== undefined).join('\n');
}

export async function mixStones(body, { logAiCall, usageOf }) {
    const startedAt = Date.now();
    const { roomImage, guideImage, boardImage, items, aspectRatio, insist } = body || {};
    const room = parseDataUrl(roomImage);
    const board = parseDataUrl(boardImage);
    const guide = parseDataUrl(guideImage);
    if (!room || !board) return { status: 400, body: { error: 'roomImage and boardImage must be image data URLs.' } };
    if (!Array.isArray(items) || !items.length || items.length > 3) return { status: 400, body: { error: 'Between 1 and 3 surfaces.' } };

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
            meta: { prototype: 'mix_stones', surfaces: items.length, guided: !!guide, insist: !!insist },
            ...extra,
        });

    try {
        const keyData = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || 'null');
        if (!keyData) throw new Error('Service account credentials not found.');
        const ai = new GoogleGenAI({
            vertexai: true,
            project: keyData.project_id,
            location: 'us-central1',
            googleAuthOptions: { credentials: { client_email: keyData.client_email, private_key: keyData.private_key } },
            httpOptions: { timeout: 90000 },
        });
        const prompt = buildMixPrompt({ items, hasGuide: !!guide, insist });
        const parts = [{ text: prompt }, { inlineData: room }];
        if (guide) parts.push({ inlineData: guide });
        parts.push({ inlineData: board });

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
                if (!isQuota(err) || attempts >= 3) throw err;
                const wait = Math.round((attempts === 1 ? 3000 : 7000) * (0.75 + Math.random() * 0.5));
                console.warn(`[mix-stones] quota 429, retrying in ${wait}ms`);
                await new Promise((r) => setTimeout(r, wait));
            }
        }
        usage = usageOf(response);
        const img = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
        if (!img) {
            const text = response.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
            throw new Error(`The model returned text instead of an image: ${String(text || '').slice(0, 100)}`);
        }
        console.log(`[mix-stones] ${items.length} surfaces${guide ? ' (guided)' : ''}${insist ? ' (insist)' : ''}: ok in ${Date.now() - startedAt} ms`);
        await record({ success: true, status: 200 });
        return { status: 200, body: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` } };
    } catch (err) {
        console.error('[mix-stones] failed:', err?.message || err);
        await record({ success: false, status: isQuota(err) ? 429 : 500, error: err?.message || String(err) });
        return isQuota(err)
            ? { status: 429, body: { error: 'The image service is busy right now. Please wait a few seconds and try again.' } }
            : { status: 500, body: { error: err?.message || String(err) } };
    }
}
