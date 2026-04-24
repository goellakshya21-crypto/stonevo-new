import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * AI Visualizer Service
 * Uses Gemini to generate a textual architectural description,
 * and then sends the stone's imageUrl + room context to the server
 * for true image-based compositing (server fetches image, no CORS issues).
 */
export const aiVisualizer = {
    async generateVisualDescription(stoneName, roomType, stoneType, application, roomStyle = 'Modern') {
        const fallback = {
            description: `A stunning ${roomType} featuring the elegant ${stoneName}. The natural veining of the ${stoneType} as a ${application} creates a unique sense of movement and luxury.`,
            style_keywords: ["Luxury", "Architectural", "Elegant"],
            lighting: "Warm Ambient"
        };

        try {
            const prompt = `You are a high-end luxury interior architect specialized in ${roomStyle} design. 
            Describe how a ${roomStyle} style ${roomType} would look if we used ${stoneName} (${stoneType}) specifically for the ${application}.
            Focus on the interplay of light, the shadows on the stone surface, and the overall atmospheric "vibe" (e.g., quiet luxury, dramatic brutalism, organic modernism).
            Emphasize the ${application} as the focal point of the ${roomType}.
            Keep it to 2-3 evocative sentences. 
            
            Format: Return a JSON object: { "description": "...", "style_keywords": ["...", "..."], "lighting": "..." }`;

            const response = await fetch('/api/gemini-vertex', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: prompt,
                    model: 'gemini-2.5-flash'
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server error: ${response.status}`);
            }

            const vertexData = await response.json();
            const text = vertexData.text;
            const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            console.error("Visualizer Error:", error);
            return fallback;
        }
    },

    /**
     * Generate room image by sending the stone imageUrl to the server.
     * The server fetches the image (no CORS), then uses Gemini's image editing
     * to composite the EXACT stone texture into the room scene.
     */
    async generateRoomImage(stoneName, roomType, stoneType, application, imageUrl, roomStyle = 'Modern', userRoomImage = null, stonePattern = '') {
        const isOutdoor = (roomType.toLowerCase().includes('exterior') || 
                          roomType.toLowerCase().includes('facade') || 
                          roomType.toLowerCase().includes('balcony') || 
                          roomType.toLowerCase().includes('entrance'));

        const name = (stoneName || '').toLowerCase();
        const type = (stoneType || '').toLowerCase();
        const isPlain = name.includes('plain') || name.includes('solid') || name.includes('uniform') || 
                        type.includes('plain') || name.includes('pure') || name.includes('limestone') ||
                        name.includes('homogenous') || name.includes('minimal') ||
                        (stonePattern || '').toLowerCase().includes('plain') || 
                        (stonePattern || '').toLowerCase().includes('solid') ||
                        (stonePattern || '').toLowerCase().includes('uniform');

        const fidelityRule = isPlain 
            ? `TEXTURE FIDELITY: This stone is a solid, uniform material. STRICTLY FORBIDDEN: Do NOT add any synthetic veins, patterns, grain, or textures. Maintain the smooth, consistent, and mono-chromatic appearance of the source image exactly.`
            : `TEXTURE FIDELITY: Respect the natural vein structure and grain. Do NOT add extra synthetic veins that are not in the source image.`;

        const seamlessInstruction = isPlain
            ? `SEAMLESS ARCHITECTURE: This is a large-format natural stone slab, NOT a floor tile. STRICTLY FORBIDDEN: Do NOT add any grout lines, grid patterns, square segregations, or tile seams. The entire ${application} must appear as one continuous, seamless mono-block surface with the uniform, consistent texture flowing uninterrupted from edge to edge.`
            : `SEAMLESS ARCHITECTURE: This is a large-format natural stone slab, NOT a floor tile. STRICTLY FORBIDDEN: Do NOT add any grout lines, grid patterns, square segregations, or tile seams. The entire ${application} must appear as one continuous, seamless mono-block surface with uninterrupted natural veining and patterns flowing from edge to edge.`;

        const contextShot = isOutdoor 
            ? `photorealistic, wide-angle residential exterior shot — luxury home architecture, bright natural daylight, 8K resolution, architectural magazine style.`
            : `photorealistic, wide-angle architectural interior shot — high-end design, soft ambient lighting, 8K resolution, architectural magazine style.`;

        const compositePrompt = `This is a high-resolution source photograph of the natural stone "${stoneName}".
CRITICAL REQUIREMENT: Use the EXACT texture, grain, and colors from this specific image. ${fidelityRule}
Do NOT generate a new stone pattern. Do NOT re-interpret the stone's appearance. 
Map this precise slab onto the ${application} in a ${roomStyle} ${roomType} using pixel-perfect perspective.
The stone in the final render must be the IDENTICAL twin of the source image: same hue, same grain, same translucency.
${seamlessInstruction}
STRICTLY FORBIDDEN: Do NOT place any rugs, mats, carpets, or floor coverings in the scene. The entire ${application} MUST be 100% exposed and completely visible, from corner to corner. Do not obscure the stone with furniture unless strictly structural.
The rest of the scene should be a ${contextShot}.
Maintain 100% structural faithfulness to the material source.`;

        const fallbackPrompt = `A ultra-high-end, photorealistic wide-angle ${isOutdoor ? 'exterior' : 'interior'} shot of a ${roomType}.
The focal point is the ${application} made of "${stoneName}" — a natural ${stoneType} with authentic textures and patterns. ${fidelityRule}
${seamlessInstruction}
STRICTLY FORBIDDEN: Do NOT place any rugs, mats, carpets, or floor coverings in the scene. The entire ${application} MUST be completely exposed.
Maintain strict adherence to the visual characteristics of this specific luxury material.
${isOutdoor ? 'Bright sunlight' : 'Soft architectural lighting'}, 8k resolution, architectural magazine style, realistic natural stone texture.`;

        console.log(`[AI Visualizer] Sending stone image URL to server for compositing... Custom Image: ${!!userRoomImage}`);

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    promptText: imageUrl ? compositePrompt : fallbackPrompt,
                    stoneImageUrl: imageUrl || null,   // Server will fetch this — no CORS issue
                    roomType,
                    application,
                    stoneName,
                    roomStyle,
                    userRoomImage
                })
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.error("[AI Visualizer] API Route not found (404). Use 'vercel dev' instead of 'npm run dev'.");
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Proxy error: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            return data.url;
        } catch (error) {
            console.error(`[AI Visualizer] Vertex AI fetch failed:`, error);
            throw error;
        }
    }
};
