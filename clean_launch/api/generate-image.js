export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { stoneImageUrl, roomType, application, stoneName, roomStyle } = req.body;

        if (!stoneImageUrl) {
            return res.status(400).json({ error: 'Stone image URL is required.' });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            const keys = Object.keys(process.env).filter(k => k.includes('GEMINI')).join(', ');
            return res.status(500).json({ error: `Gemini API Key missing. Found keys: [${keys}]` });
        }

        // DEFINITIVE MODEL: Gemini 2.5 Flash Image (Nano Banana)
        // This is the verified model on your account for high-end image-to-image.
        const modelId = "gemini-2.5-flash-image";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

        console.log(`[Gemini Proxy] Connected to Gemini 2.5 Flash Image (Nano Banana)...`);

        // Fetch stone image
        const imgResp = await fetch(stoneImageUrl);
        if (!imgResp.ok) throw new Error(`Stone image fetch failed: ${imgResp.status}`);
        const arrayBuffer = await imgResp.arrayBuffer();
        const stoneBase64 = Buffer.from(arrayBuffer).toString('base64');
        const stoneMime = imgResp.headers.get('content-type') || 'image/jpeg';

        // Optimized prompt for "Nano Banana" to ensure high-end 8K architectural output
        const promptText = `
        You are a master architectural photographer and AI renderer specialized in ${roomStyle || 'Modern'} design.
        SLAB REFERENCE: The attached image is a natural stone slab called "${stoneName}".
        INSTRUCTION: Generate a photorealistic 8K interior architectural rendering of a luxury ${roomType || 'kitchen'} in a ${roomStyle || 'Modern'} architectural style.
        REQUIRED MAPPING: You MUST map the EXACT colors, vein patterns, and mineral textures of the attached slab onto the ${application || 'countertop and island'}.
        STYLE DETAILS: Emphasize the unique characteristics of ${roomStyle || 'Modern'} architecture (e.g., specific lighting, materials, and furniture associated with this style).
        QUALITY: High-end architectural photography, cinematic soft lighting, polished surfaces, 8K ultra-hdr resolution.
        COMPOSITION: Wide-angle interior shot.
        `;

        const payload = {
            contents: [{
                parts: [
                    { text: promptText },
                    {
                        inlineData: {
                            mimeType: stoneMime,
                            data: stoneBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.5,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 2048,
            }
        };

        const apiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiRes.ok) {
            const errorText = await apiRes.text();
            throw new Error(`Gemini API failed (${apiRes.status}): ${errorText}`);
        }

        const result = await apiRes.json();
        
        // Extract the generated image from the Nano Banana response
        const candidate = result.candidates?.[0];
        const imagePart = candidate?.content?.parts?.find(p => p.inlineData);

        if (imagePart) {
            console.log('[Gemini Proxy] SUCCESS: High-end 8K image generated.');
            return res.status(200).json({ 
                url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` 
            });
        }

        // If the model returned text instead (unexpected for Banana but possible), we log it.
        const textResponse = candidate?.content?.parts?.find(p => p.text)?.text;
        throw new Error(`Model returned text analysis instead of an image: ${textResponse?.substring(0, 100)}...`);

    } catch (error) {
        console.error('[Gemini Proxy] FATAL ERROR:', error.message);
        res.status(500).json({ error: error.message, canRetry: true });
    }
}
