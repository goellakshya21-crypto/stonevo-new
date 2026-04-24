import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { stoneImageUrl, roomType, application, stoneName, roomStyle, promptText, userRoomImage, modelId = 'gemini-2.5-flash-image' } = req.body;

        if (!stoneImageUrl) {
            return res.status(400).json({ error: 'Stone image URL is required.' });
        }

        // ... (Service Account loading stays the same)
        let keyData;
        if (process.env.GOOGLE_SERVICE_ACCOUNT) {
            keyData = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        } else {
            const keyPath = path.join(process.cwd(), 'hi.json');
            if (fs.existsSync(keyPath)) {
                keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
            } else {
                return res.status(500).json({ error: 'Service account credentials not found.' });
            }
        }

        const vertexAI = new VertexAI({ 
            project: keyData.project_id, 
            location: 'us-central1',
            googleAuthOptions: { credentials: { client_email: keyData.client_email, private_key: keyData.private_key } } 
        });

        // Refined Prompt for Multi-Modal Inpainting
        let finalPrompt;
        if (userRoomImage) {
            finalPrompt = `
            CONTEXT: You are performing high-end architectural inpainting and material replacement. 
            MATERIAL SOURCE: The first attached image is the natural stone slab "${stoneName}". Use this EXACT texture, vein structure, and color.
            USER ORIGINAL SPACE: The second attached image is a photograph of a user's actual room.
            
            INSTRUCTION: 
            1. Identify every instance of the ${application || 'primary surface'} in the second (user) image.
            2. Replace the identified ${application || 'primary surface'} with the stone texture from the first image.
            3. SEAMLESS FINISH: The stone must be applied as a single, continuous, and uninterrupted slab. 
            4. TEXTURE PRESERVATION: STRICTLY FORBIDDEN: Do NOT add any synthetic veins, patterns, or textures that do not exist in the first (source) image. If the source stone is solid or uniform, maintain that exact plain appearance.
            5. STRICTLY FORBIDDEN: Do NOT add any grout lines, grid patterns, square tile segments, or visible seams.
            6. Apply realistic perspective, depth, and specular highlights based on the original room's geometry.
            7. IMPORTANT: Maintain the original lighting, shadows cast by furniture, and environmental reflections perfectly.
            8. The resulting image must be an 8K photorealistic composite where ONLY the ${application} has been updated.
            9. DO NOT add any rugs, furniture, or decor. Keep the room layout identical to the user's photo.
            10. Return the final edited photograph.
            `;
        } else {
            finalPrompt = `
            ${promptText || ''}
            You are a master architectural photographer. Generate a photorealistic 8K interior of a luxury ${roomType} in a ${roomStyle} style.
            Map the EXACT colors and vein patterns of the attached stone slab "${stoneName}" onto the ${application}.
            SEAMLESS SLAB: The ${application} MUST be one continuous, monolithic piece of stone. 
            TEXTURE INTEGRITY: STRICTLY FORBIDDEN: Do NOT hallucinate extra veins or patterns. If the reference stone is plain or uniform, the final render must be equally plain and uniform.
            STRICTLY FORBIDDEN: Do NOT add any grout lines, grid patterns, tile joins, or repeating segments. Use large-format slab logic.
            The stone must be a 1:1 identical match to the reference image.
            No rugs or furniture should obscure the stone surface. High-contrast architectural lighting.
            `;
        }

        // Fetch stone image as base64
        const imgResp = await fetch(stoneImageUrl);
        if (!imgResp.ok) throw new Error(`Stone image fetch failed: ${imgResp.status}`);
        const arrayBuffer = await imgResp.arrayBuffer();
        const stoneBase64 = Buffer.from(arrayBuffer).toString('base64');
        const stoneMime = imgResp.headers.get('content-type') || 'image/jpeg';

        const model = vertexAI.preview.getGenerativeModel({ model: modelId });
        console.log(`[Vertex AI Image] Generating render. Custom Room: ${!!userRoomImage}`);

        const parts = [
            { text: finalPrompt },
            { inlineData: { mimeType: stoneMime, data: stoneBase64 } }
        ];

        // Add user room image if present
        if (userRoomImage) {
            // Fix destructuring: match() returns [fullMatch, group1, group2]
            const [, mimeMatch, base64Data] = userRoomImage.match(/^data:(image\/\w+);base64,(.+)$/) || [];
            if (mimeMatch && base64Data) {
                parts.push({ inlineData: { mimeType: mimeMatch, data: base64Data } });
            } else {
                console.warn('[Vertex AI Image] userRoomImage provided but regex match failed.');
            }
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }]
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
