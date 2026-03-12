import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * AI Visualizer Service
 * Uses Gemini to generate architectural descriptions and reimagined room contexts.
 */
export const aiVisualizer = {
    async generateVisualDescription(stoneName, roomType, stoneType, application) {
        const fallback = {
            description: `A stunning ${roomType} featuring the elegant ${stoneName}. The natural veining of the ${stoneType} as a ${application} creates a unique sense of movement and luxury.`,
            style_keywords: ["Luxury", "Architectural", "Elegant"],
            lighting: "Warm Ambient"
        };

        if (!genAI) return fallback;

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `You are a high-end luxury interior architect. 
            Describe how a ${roomType} would look if we used ${stoneName} (${stoneType}) specifically for the ${application}.
            Focus on the interplay of light, the shadows on the stone surface, and the overall atmospheric "vibe" (e.g., quiet luxury, dramatic brutalism, organic modernism).
            Emphasize the ${application} as the focal point of the ${roomType}.
            Keep it to 2-3 evocative sentences. 
            
            Format: Return a JSON object: { "description": "...", "style_keywords": ["...", "..."], "lighting": "..." }`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean JSON
            const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            console.error("Visualizer Error:", error);
            return {
                description: `A stunning ${roomType} featuring the elegant ${stoneName}. The natural veining of the ${stoneType} creates a unique sense of movement and luxury.`,
                style_keywords: ["Luxury", "Architectural", "Elegant"],
                lighting: "Warm Ambient"
            };
        }
    },

    /**
     * Generate a contextual image using Pollinations AI, guided by Gemini Vision
     */
    async generateRoomImage(stoneName, roomType, stoneType, application, imageUrl) {
        let visualDescription = `made of ${stoneName} (${stoneType}) marble. The marble features rich, natural veining and a polished finish.`;

        // If we have genAI and an image URL, let's ask Gemini to describe the stone exactly
        if (genAI && imageUrl) {
            try {
                console.log("[AI Visualizer] Analyzing stone image via Gemini Vision...");
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

                const imageResp = await fetch(imageUrl);
                const blob = await imageResp.blob();

                // Safer base64 conversion for large images
                const base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(blob);
                });

                const visionPrompt = `You are an expert interior designer. Describe this slab of ${stoneName}. Focus on exactly how LIGHT or DARK the base color is (e.g. "very pale ice blue", "dark charcoal"). Describe the vein pattern briefly. 1 sentence only.`;

                const result = await model.generateContent([
                    visionPrompt,
                    {
                        inlineData: {
                            data: base64,
                            mimeType: blob.type || "image/jpeg"
                        }
                    }
                ]);

                const response = await result.response;
                const text = response.text().trim();
                visualDescription = `with these EXACT characteristics: ${text}`;
                console.log("[AI Visualizer] Gemini Vision Success:", text);
            } catch (visionError) {
                console.warn("[AI Visualizer] Gemini Vision skipped:", visionError.message);
            }
        }

        // Extremely aggressive prompt to break the AI's training bias for words like "Blue Onyx" which usually trigger dark colors
        const promptText = `A bright, luxurious kitchen with a massive island countertop made of THIS EXACT STONE: ${visualDescription}. IT IS CRITICAL THAT YOU USE THE EXACT LIGHTNESS AND DARKNESS DESCRIBED. If the description says "light" or "pale", do NOT make it dark or saturated. Natural daylight, bright, airy, photorealistic, cinematic, highly detailed.`;

        console.log(`[AI Visualizer] Sending tuned prompt and subject reference to Vertex AI via secure proxy...`);

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Send the image reference again so the veins are correct, but rely on the backend's new negativePrompt to stop the darkening
                body: JSON.stringify({ promptText, referenceImage: typeof base64 !== 'undefined' ? base64 : null })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Proxy error: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            return data.url; // Returns the base64 data URL from our proxy

        } catch (error) {
            console.error(`[AI Visualizer] Vertex AI fetch failed:`, error);
            throw error; // Let the UI component handle the fallback
        }
    }
};
