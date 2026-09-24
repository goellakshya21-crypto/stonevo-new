// @google/genai in Vertex mode. The previous SDK, @google-cloud/vertexai, was
// deprecated by Google with removal scheduled for 24 June 2026 -- a date already
// past when this was migrated. Same project, same service account, same billing:
// only the client library changed. Deliberately NOT the SDK's API-key mode,
// which talks to a different Google service with its own billing and quotas.
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { rateLimit, clientIp } from './_rateLimit.js';
import { logAiCall, usageOf, cleanLabel } from './_aiLog.js';

// Used only when a caller names no model. Every caller does today, but the old
// fallback was gemini-1.5-flash, which Google has retired -- a caller that
// forgot the field would have failed outright rather than degraded.
const DEFAULT_MODEL = 'gemini-2.5-flash';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Rate limit — Vertex AI text/vision calls. 200/hour per IP covers heavy
    // admin bulk uploads while blocking scripted abuse.
    const ip = clientIp(req);
    if (!(await rateLimit(`gemini:${ip}`, 200, 3600))) {
        return res.status(429).json({ error: 'Too many AI requests from this network. Please slow down and try again shortly.' });
    }

    const startedAt = Date.now();

    // ── Cost & latency log ───────────────────────────────────────────────────
    // Seven different features share this endpoint, so each caller sends a
    // `purpose` label. Without it every text call would land in one bucket and
    // nobody could tell a gallery chat from an admin bulk-tagging run. Callers
    // that don't send one still get a rough bucket rather than nothing.
    const b = req.body || {};
    const callType = cleanLabel(b.purpose)
        || (b.imageBase64 || b.imageUrl ? 'vision' : b.history ? 'chat' : 'text');
    let modelStartedAt = null, usage = {};
    const record = (extra) => logAiCall({
        endpoint: 'gemini-vertex',
        callType,
        model: b.model || DEFAULT_MODEL,
        latencyMs: Date.now() - startedAt,
        modelLatencyMs: modelStartedAt ? Date.now() - modelStartedAt : null,
        attempts: 1,
        ...usage,
        ...extra,
    });

    try {
        const { message, history, model: modelId = DEFAULT_MODEL, imageBase64, mimeType, imageUrl } = req.body;

        // Secure Service Account Loading
        let keyData;
        if (process.env.GOOGLE_SERVICE_ACCOUNT) {
            console.log('[Vertex AI] Loading credentials from GOOGLE_SERVICE_ACCOUNT Env Var.');
            keyData = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        } else {
            const keyPath = path.join(process.cwd(), 'hi.json');
            if (fs.existsSync(keyPath)) {
                console.log('[Vertex AI] Loading credentials from local hi.json.');
                keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
            } else {
                await record({ success: false, status: 500, error: 'Service account credentials not found.' });
                return res.status(500).json({ error: 'Service account credentials not found. Set GOOGLE_SERVICE_ACCOUNT or provide hi.json.' });
            }
        }
        
        const ai = new GoogleGenAI({
            vertexai: true,
            project: keyData.project_id,
            location: 'us-central1',
            googleAuthOptions: {
                credentials: {
                    client_email: keyData.client_email,
                    private_key: keyData.private_key,
                }
            }
        });

        console.log(`[Vertex AI] Using model: ${modelId}`);

        // Resolve an inline image from EITHER raw base64 (existing callers) or a
        // URL the server fetches itself. The URL path exists so the browser
        // doesn't have to base64 a whole photo into the request body — Vercel
        // caps bodies at ~4.5MB, which a large stone photo can exceed.
        let inlineImage = null;
        if (imageBase64) {
            inlineImage = { mimeType: mimeType || 'image/jpeg', data: imageBase64 };
        } else if (imageUrl) {
            const imgResp = await fetch(imageUrl);
            if (!imgResp.ok) throw new Error(`Image fetch failed: ${imgResp.status}`);
            const buf = await imgResp.arrayBuffer();
            inlineImage = {
                mimeType: imgResp.headers.get('content-type') || 'image/jpeg',
                data: Buffer.from(buf).toString('base64'),
            };
        }

        // If an image is supplied, use multimodal one-shot generation (no chat history)
        if (inlineImage) {
            console.log(`[Vertex AI] Multimodal request with image (${inlineImage.mimeType})`);
            modelStartedAt = Date.now();
            // The new SDK returns the response itself; there is no `.response`
            // promise to await as there was before.
            const response = await ai.models.generateContent({
                model: modelId,
                contents: [{
                    role: 'user',
                    parts: [
                        { text: message },
                        { inlineData: inlineImage }
                    ]
                }]
            });
            usage = usageOf(response);
            const candidate = response.candidates?.[0];
            const text = candidate?.content?.parts?.find(p => p.text)?.text || "No response generated.";
            await record({ success: true, status: 200 });
            return res.status(200).json({ text });
        }

        // Text-only chat (existing path)
        const chat = ai.chats.create({
            model: modelId,
            history: history ? history.map(h => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.content }]
            })) : []
        });

        modelStartedAt = Date.now();
        const response = await chat.sendMessage({ message });
        usage = usageOf(response);
        const candidate = response.candidates?.[0];
        const text = candidate?.content?.parts?.find(p => p.text)?.text || "No response generated.";

        await record({ success: true, status: 200 });
        return res.status(200).json({ text });

    } catch (error) {
        console.error('[Vertex AI Error]:', error);
        await record({ success: false, status: 500, error: error.message });
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        });
    }
}
