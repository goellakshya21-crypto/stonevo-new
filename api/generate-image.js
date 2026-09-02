import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs';
import path from 'path';
import { rateLimit, clientIp } from './_rateLimit.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Rate limit — this endpoint costs real money per call (Vertex AI image gen).
    // 200 renders/hour per IP. Was 50, which proved too tight in practice for two
    // reasons: the limit is per IP, so everyone on one office/venue connection
    // shares a single bucket; and a custom-stone visualize spends TWO of them
    // (generateCroppedStonePreview + generateRoomImage), not one. Still blocks
    // scripted abuse, which is the actual point.
    const ip = clientIp(req);
    if (!(await rateLimit(`genimg:${ip}`, 200, 3600))) {
        return res.status(429).json({ error: 'Too many image requests from this network. Please slow down and try again shortly.' });
    }

    try {
        const { stoneImageUrl, roomType, application, stoneName, roomStyle, promptText, userRoomImage, regionMaskImage, regionDescription, stoneImageData, slabGrid, slabDescription, modelId = 'gemini-2.5-flash-image', cropMode = false } = req.body;

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

        // ── Resolve the material source BEFORE building the prompt ──────────
        // The client may send a pre-composed bookmatched slab panel
        // (stoneImageData) instead of a single slab. It still sends the real
        // stoneImageUrl too, so the required-field guard above keeps its
        // original meaning and we always have something to fall back to.
        //
        // This has to happen before the prompt is written, because the prompt
        // must describe what we ACTUALLY ended up sending. If a malformed
        // stoneImageData drops us back to the single-slab URL while the prompt
        // still claims "this is an eight-slab panel", we have reintroduced the
        // very mismatch the client-side compositing exists to prevent.
        let stoneBase64, stoneMime, usedPanel = false;

        if (stoneImageData) {
            // Same parsing idiom as userRoomImage and regionMaskImage below.
            const [, panelMime, panelData] = stoneImageData.match(/^data:(image\/\w+);base64,(.+)$/) || [];
            if (panelMime && panelData) {
                stoneMime = panelMime;
                stoneBase64 = panelData;
                usedPanel = true;
            } else {
                console.warn('[Vertex AI Image] stoneImageData provided but regex match failed — falling back to stoneImageUrl.');
            }
        }

        if (!usedPanel) {
            const imgResp = await fetch(stoneImageUrl);
            if (!imgResp.ok) throw new Error(`Stone image fetch failed: ${imgResp.status}`);
            const arrayBuffer = await imgResp.arrayBuffer();
            stoneBase64 = Buffer.from(arrayBuffer).toString('base64');
            stoneMime = imgResp.headers.get('content-type') || 'image/jpeg';
        }

        // Gated on the OUTCOME, not the request: slab wording only applies if a
        // slab panel is genuinely what we're about to send.
        const gridActive = !!(slabGrid && slabGrid.count > 1 && usedPanel);
        // Empty unless the grid is genuinely active, so it can't leak a slab
        // count into a prompt whose image is a single slab.
        const panelPhrase = !gridActive ? ''
            : (slabDescription || `a finished bookmatched panel of ${slabGrid.count} slabs, ${slabGrid.cols} by ${slabGrid.rows}`);

        // Refined Prompt for Multi-Modal Inpainting
        let finalPrompt;

        if (cropMode) {
            // Stone isolation mode — extract only the stone surface, remove all background
            finalPrompt = `You are given a photograph of a natural stone or marble sample taken by a user.
Your task: Extract and display ONLY the pure stone/marble surface texture.
Fill the ENTIRE image frame with just the stone material — no background, no hands, no floor, no surrounding props, no shadows from other objects.
Preserve the EXACT colours, veining, grain, and natural patterns of the stone with 100% fidelity.
The output must be a clean, flat, catalogue-quality stone texture swatch suitable for material selection.
If the stone has natural veining, keep it exactly as it appears. Do not add or remove any patterns.`;
        } else if (userRoomImage && regionMaskImage) {
            // Facade region mode. The generic branch below finds surfaces
            // semantically ("every instance of the flooring"), which cannot say
            // "only the middle storey" -- so the target is given twice over: as a
            // magenta-flooded guide image, and as worded bounds. Independent
            // signals, so one under-weighted cue doesn't lose the region.
            finalPrompt = `
            CONTEXT: You are performing precise, region-limited architectural material replacement on a photograph of a building exterior.

            IMAGE 1 - MATERIAL SOURCE: the natural stone slab "${stoneName}". Use this EXACT texture, vein structure and colour.
            IMAGE 2 - THE PHOTOGRAPH: the user's real building. This is the image you edit and return.
            IMAGE 3 - REGION GUIDE ONLY: an identical copy of image 2 with one area flooded and outlined in bright magenta. It marks WHERE to work. It is an instruction, NOT content.

            TARGET REGION: ${regionDescription || 'the area marked in magenta in image 3'}.

            INSTRUCTION:
            1. Clad ONLY the wall surfaces inside the marked region with the stone from image 1.
            2. ABSOLUTE REQUIREMENT: every pixel OUTSIDE the marked region must be returned completely unchanged -- other storeys, roof, sky, ground, landscaping and neighbouring buildings stay exactly as photographed.
            3. STRICTLY FORBIDDEN: do NOT draw magenta, pink or any highlight colour anywhere in the output. Image 3 is a guide; its colour must never appear in the result.
            4. Within the region, preserve windows, doors, balconies, drainpipes and trim -- clad the WALL around them, do not paint over them.
            5. ${gridActive
                ? `PANEL LAYOUT: image 1 is ${panelPhrase}. Clad the marked region with that panel applied ONCE, at architectural scale, with tight hairline butt joints at the slab boundaries and nowhere else. Do NOT tile, repeat or crop it, and do NOT change how many slabs it contains. STRICTLY FORBIDDEN: grout lines, mortar, grid patterns, tile segments, or any joint not already present in image 1.`
                : `SEAMLESS FINISH: the stone reads as large-format cladding. STRICTLY FORBIDDEN: no grout lines, grid patterns, tile segments or visible seams.`}
            6. TEXTURE PRESERVATION: STRICTLY FORBIDDEN: do NOT invent veins or patterns absent from image 1. If the source stone is plain, keep it plain.
            7. Match the photograph's existing perspective, lighting direction, shadows and weathering so the cladding looks genuinely built, not pasted.
            8. The boundary where the new cladding meets the untouched storeys must be a clean, believable architectural junction.
            9. Return the edited photograph at full 8K photorealistic quality.
            `;
        } else if (userRoomImage) {
            finalPrompt = `
            CONTEXT: You are performing high-end architectural inpainting and material replacement. 
            MATERIAL SOURCE: The first attached image is the natural stone slab "${stoneName}". Use this EXACT texture, vein structure, and color.
            USER ORIGINAL SPACE: The second attached image is a photograph of a user's actual room.
            
            INSTRUCTION: 
            1. Identify every instance of the ${application || 'primary surface'} in the second (user) image.
            2. Replace the identified ${application || 'primary surface'} with the stone texture from the first image.
            3. ${gridActive
                ? `PANEL LAYOUT: the first image is ${panelPhrase}. Apply that panel to the ${application || 'primary surface'} as ONE piece, exactly once, edge to edge, in the surface's own perspective. Do NOT tile it, repeat it, crop it, or change the number of slabs it contains.`
                : `SEAMLESS FINISH: The stone must be applied as a single, continuous, and uninterrupted slab.`}
            4. TEXTURE PRESERVATION: STRICTLY FORBIDDEN: Do NOT add any synthetic veins, patterns, or textures that do not exist in the first (source) image. If the source stone is solid or uniform, maintain that exact plain appearance.
            5. ${gridActive
                ? `JOINTS: reproduce ONLY the joints already present in the first image, rendered as tight hairline butt joints following the surface's perspective. STRICTLY FORBIDDEN: grout lines, mortar, dark joint fills, tile grids, extra subdivisions, panel outlines, or any joint wider or darker than a hairline.`
                : `STRICTLY FORBIDDEN: Do NOT add any grout lines, grid patterns, square tile segments, or visible seams.`}
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
            ${gridActive
                ? `PANEL LAYOUT: the attached image is ${panelPhrase}. Apply it to the ${application} as ONE piece, exactly once, edge to edge. Do NOT tile, repeat, crop or rearrange it, and do NOT change how many slabs it contains.
            TEXTURE INTEGRITY: STRICTLY FORBIDDEN: Do NOT hallucinate extra veins or patterns. If the reference stone is plain or uniform, the final render must be equally plain and uniform.
            JOINTS: reproduce ONLY the joints already present in the attached image, as tight hairline butt joints in correct perspective. STRICTLY FORBIDDEN: grout lines, mortar, grid patterns, tile joins, repeating segments, or any joint wider or darker than a hairline.`
                : `SEAMLESS SLAB: The ${application} MUST be one continuous, monolithic piece of stone.
            TEXTURE INTEGRITY: STRICTLY FORBIDDEN: Do NOT hallucinate extra veins or patterns. If the reference stone is plain or uniform, the final render must be equally plain and uniform.
            STRICTLY FORBIDDEN: Do NOT add any grout lines, grid patterns, tile joins, or repeating segments. Use large-format slab logic.`}
            The stone must be a 1:1 identical match to the reference image.
            No rugs or furniture should obscure the stone surface. High-contrast architectural lighting.
            `;
        }

        // (The stone image was resolved above, before the prompt was built.)

        const model = vertexAI.preview.getGenerativeModel({ model: modelId });
        console.log(`[Vertex AI Image] Generating render. Custom Room: ${!!userRoomImage}, Slab panel: ${usedPanel ? `${slabGrid?.cols}x${slabGrid?.rows}` : 'no'}`);

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

        // Facade region guide: same photo, target band flooded magenta. Must come
        // AFTER the clean photo so "second image" / "third image" in the prompt
        // line up with what the model actually receives.
        if (userRoomImage && regionMaskImage) {
            const [, maskMime, maskData] = regionMaskImage.match(/^data:(image\/\w+);base64,(.+)$/) || [];
            if (maskMime && maskData) {
                parts.push({ inlineData: { mimeType: maskMime, data: maskData } });
            } else {
                console.warn('[Vertex AI Image] regionMaskImage provided but regex match failed.');
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
