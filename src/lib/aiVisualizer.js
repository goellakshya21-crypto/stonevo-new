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

        if (!genAI) return fallback;

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `You are a high-end luxury interior architect specialized in ${roomStyle} design. 
            Describe how a ${roomStyle} style ${roomType} would look if we used ${stoneName} (${stoneType}) specifically for the ${application}.
            Focus on the interplay of light, the shadows on the stone surface, and the overall atmospheric "vibe" (e.g., quiet luxury, dramatic brutalism, organic modernism).
            Emphasize the ${application} as the focal point of the ${roomType}.
            Keep it to 2-3 evocative sentences. 
            
            Format: Return a JSON object: { "description": "...", "style_keywords": ["...", "..."], "lighting": "..." }`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
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
    async generateRoomImage(stoneName, roomType, stoneType, application, imageUrl, roomStyle = 'Modern') {
        const compositePrompt = `This is a photograph of a natural stone slab called "${stoneName}".
Take this exact stone — with its real colors, veining patterns, translucency, and texture — and show it applied as the ${application} in a luxury ${roomType}.
The stone must look IDENTICAL to the slab in the image: same hue, same vein patterns, same finish quality.
The rest of the room should be a photorealistic, wide-angle architectural interior shot — high-end design, soft natural lighting, 8K resolution, architectural magazine style.
Do NOT change the stone's color or pattern. Do NOT re-interpret it. Use the actual stone from the image.`;

        const fallbackPrompt = `A ultra-high-end, photorealistic wide-angle interior shot of a ${roomType}.
The centerpiece is a large-scale ${application} featuring ${stoneName} — a natural ${stoneType} with authentic veining and polished finish.
Soft architectural lighting, 8k resolution, architectural magazine style, realistic natural stone texture.
Integrated naturally into high-end architecture.`;

        console.log(`[AI Visualizer] Sending stone image URL to server for compositing...`);

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
                    roomStyle
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
