import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { stoneImageUrl, roomType, application, stoneName, roomStyle, modelId = 'gemini-2.5-flash-image' } = req.body;

        if (!stoneImageUrl) {
            return res.status(400).json({ error: 'Stone image URL is required.' });
        }

        // Secure Service Account Loading
        let keyData;
        if (process.env.GOOGLE_SERVICE_ACCOUNT) {
            console.log('[Vertex AI Image] Loading credentials from GOOGLE_SERVICE_ACCOUNT Env Var.');
            keyData = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        } else {
            const keyPath = path.join(process.cwd(), 'hi.json');
            if (fs.existsSync(keyPath)) {
                console.log('[Vertex AI Image] Loading credentials from local hi.json.');
                keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
            } else {
                return res.status(500).json({ error: 'Service account credentials not found. Set GOOGLE_SERVICE_ACCOUNT or provide hi.json.' });
            }
        }

        // Initialize Vertex AI
        const vertexAI = new VertexAI({ 
            project: keyData.project_id, 
            location: 'us-central1',
            googleAuthOptions: {
                credentials: {
                    client_email: keyData.client_email,
                    private_key: keyData.private_key,
                }
            } 
        });

        // Prompt from original code
        const promptText = `
        You are a master architectural photographer and AI renderer specialized in ${roomStyle || 'Modern'} design.
        SLAB REFERENCE: The attached image is a natural stone slab called "${stoneName}".
        INSTRUCTION: Generate a photorealistic 8K interior architectural rendering of a luxury ${roomType || 'kitchen'} in a ${roomStyle || 'Modern'} architectural style.
        REQUIRED MAPPING: You MUST map the EXACT colors and vein patterns of the attached slab onto the ${application || 'primary surfaces (e.g. islands, counters, walls)'}.
        STRUCTURAL REALISM: Natural stone is only applied to flat, rigid architectural planes. 
        FORBIDDEN: NEVER apply the stone pattern to curved bathtubs, round sinks, or complex organic shapes.
        WASHROOM LOGIC: If rendering a bathroom, apply the stone to the flat wall panels and vanity top ONLY. Keep the bathtub and sinks as pure white porcelain or matte ceramic.
        STYLE DETAILS: Emphasize the unique characteristics of ${roomStyle || 'Modern'} architecture (e.g., specific lighting, materials, and furniture associated with this style).
        QUALITY: High-end architectural photography, cinematic soft lighting, polished surfaces, 8K ultra-hdr resolution.
        COMPOSITION: Wide-angle interior shot.
        `;

        // Fetch stone image as base64
        const imgResp = await fetch(stoneImageUrl);
        if (!imgResp.ok) throw new Error(`Stone image fetch failed: ${imgResp.status}`);
        const arrayBuffer = await imgResp.arrayBuffer();
        const stoneBase64 = Buffer.from(arrayBuffer).toString('base64');
        const stoneMime = imgResp.headers.get('content-type') || 'image/jpeg';

        // NOTE: Standard Vertex AI Imagen 4 use case.
        // If the model is Imagen, we use the prediction service.
        const model = vertexAI.preview.getGenerativeModel({ model: modelId });

        console.log(`[Vertex AI Image] Generating render with model: ${modelId}`);

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { text: promptText },
                    { inlineData: { mimeType: stoneMime, data: stoneBase64 } }
                ]
            }]
        });

        const response = await result.response;
        const candidate = response.candidates?.[0];
        const imagePart = candidate?.content?.parts?.find(p => p.inlineData);

        if (imagePart) {
            console.log('[Vertex AI Image] SUCCESS: Architectural rendering generated.');
            return res.status(200).json({ 
                url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` 
            });
        }

        // Fallback for text-based response
        const textResponse = candidate?.content?.parts?.find(p => p.text)?.text;
        throw new Error(`Vertex model returned text instead of image: ${textResponse?.substring(0, 100)}...`);

    } catch (error) {
        console.error('[Vertex AI Image Error]:', error);
        res.status(500).json({ error: error.message, canRetry: true });
    }
}
