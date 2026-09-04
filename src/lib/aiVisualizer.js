// NOTE: no Gemini SDK / API key here on purpose. Anything prefixed VITE_ is
// inlined into the public JS bundle by Vite, so a client-side key is readable
// by anyone via DevTools and billable to us. Every AI call goes through the
// /api/* proxies, which authenticate with a server-side Vertex service account.

/**
 * AI Visualizer Service
 * Uses Gemini to generate a textual architectural description,
 * and then sends the stone's imageUrl + room context to the server
 * for true image-based compositing (server fetches image, no CORS issues).
 */
export const aiVisualizer = {

    /**
     * Analyse a custom-uploaded stone image.
     * Returns { isBookmatched: bool }
     * isBookmatched = true  → image already shows two mirrored slabs; don't bookmatch again
     */
    async detectCustomStoneInfo(imageUrl) {
        if (!imageUrl) return { isBookmatched: false };
        try {
            // The server fetches the image itself (imageUrl), so no key is needed
            // client-side and no large base64 payload crosses the wire.
            const response = await fetch('/api/gemini-vertex', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gemini-2.5-flash',
                    imageUrl,
                    message: `Look at this stone/marble image carefully.
Does it show a BOOKMATCH pattern — two slabs placed side by side (or top-to-bottom) that are mirror images of each other, with veining that meets symmetrically at a central seam?
Answer with ONLY the word "yes" or "no".`
                })
            });

            if (!response.ok) return { isBookmatched: false };
            const { text } = await response.json();
            const answer = (text || '').toLowerCase().trim();
            console.log('[AI Visualizer] Bookmatch detection result:', answer);
            return { isBookmatched: answer.startsWith('yes') };
        } catch (err) {
            console.error('[AI Visualizer] detectCustomStoneInfo failed:', err);
            return { isBookmatched: false };
        }
    },

    /**
     * Generate a clean cropped-stone preview image (background removed).
     * Returns a data-URL string or null on failure.
     */
    async generateCroppedStonePreview(imageUrl) {
        if (!imageUrl) return null;
        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stoneImageUrl: imageUrl, cropMode: true, stoneName: 'Stone Sample' })
            });
            if (!response.ok) return null;
            const data = await response.json();
            return data.url || null;
        } catch (err) {
            console.error('[AI Visualizer] Crop preview generation failed:', err);
            return null;
        }
    },

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
     * Adjust a render the user is already looking at: "add a rug", "warmer
     * light", "remove the chairs".
     *
     * Separate from generateRoomImage because the inputs are genuinely
     * different -- there is no stone to map and no room to invent, only an
     * existing image and one instruction -- and because conflating them would
     * mean threading a mode flag through fourteen fields that no longer apply.
     *
     * @param {string} baseImage    the current render, as a data URL
     * @param {string} instruction  what the user typed
     * @returns {Promise<string>} data URL of the edited render
     */
    async refineRender({ baseImage, instruction }) {
        if (!baseImage || !String(baseImage).startsWith('data:')) {
            throw new Error('This render cannot be refined.');
        }
        if (!instruction || !instruction.trim()) {
            throw new Error('Describe the change you want.');
        }

        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                refineMode: true,
                baseImage,
                refineInstruction: instruction.trim(),
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Proxy error: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.url) throw new Error('No image came back from the edit.');
        return data.url;
    },

    /**
     * Generate room image by sending the stone imageUrl to the server.
     * The server fetches the image (no CORS), then uses Gemini's image editing
     * to composite the EXACT stone texture into the room scene.
     *
     * Takes an OPTIONS OBJECT. It used to take fourteen positional arguments,
     * which meant callers passing '' as a placeholder and trailing comments to
     * say which boolean was which — and any caller that wanted only the last
     * parameter had to type eight nulls to reach it.
     */
    async generateRoomImage(options = {}) {
        // Migration guard. The failure mode being caught here is silent, not
        // loud: a stale positional caller passes a string, every field below
        // destructures to undefined, and we go on to make a billed Vertex call
        // for a garbage render. Better to throw.
        if (typeof options === 'string') {
            throw new Error('generateRoomImage: takes an options object now, not positional args');
        }

        const {
            stoneName, roomType, stoneType, application, imageUrl,
            roomStyle = 'Modern',
            userRoomImage = null,
            stonePattern = '',
            isCustomStone = false,
            regionMaskImage = null,
            regionDescription = null,
            // Set only on a second pass, after the client measured that the
            // marked band came back unclad. Makes the server lean on the edit.
            regionInsist = false,
            // Pre-composed bookmatched slab panel (utils/slabGrid.js) plus its
            // shape and a worded description. See the slab layout block below.
            slabPanelImage = null,
            slabGrid = null,
            slabDescription = null,
        } = options;

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

        // When the user uploaded their own stone photo, tell the AI to strip the background
        const backgroundExtractionInstruction = isCustomStone
            ? `STONE ISOLATION: The source image is a photo taken by a user and may contain background surfaces, hands, floors, walls, or other surroundings. Extract and use ONLY the pure stone/marble texture from the centre of the image. Completely ignore and discard any non-stone background elements, shadows cast by surroundings, or edges where the stone meets other surfaces.`
            : '';

        // ── Slab layout ────────────────────────────────────────────────────
        // The material source is a panel this app already composed on canvas:
        // the architect's chosen number of slabs, mirrored in place. So the
        // model is never asked to COUNT anything — only to reproduce an
        // arrangement it can see. That is the whole reason the panel is built
        // client-side rather than described in words.
        //
        // Gated on the panel image actually being present, never on the grid
        // alone: telling the model "this is eight slabs" while handing it one
        // slab is the exact bug this feature exists to avoid, in reverse.
        const gridActive = !!(slabPanelImage && slabGrid && slabGrid.count > 1);

        const slabLayoutInstruction = gridActive
            ? `SLAB LAYOUT — REPRODUCE, DO NOT REDESIGN: The source image is already a finished bookmatched panel: ${slabDescription || `${slabGrid.count} slabs, ${slabGrid.cols} by ${slabGrid.rows}`}. Treat it as ONE ready-made piece of artwork, not as a texture to be tiled.
Map the ENTIRE panel onto the ${application} exactly once, edge to edge, in correct perspective. Do NOT crop it, do NOT repeat it, do NOT tile it, do NOT rearrange it, and do NOT change how many slabs it contains.
The joints between slabs are TIGHT BUTT JOINTS: at most a hairline, the same tone as the stone, narrowing with the perspective of the surface. STRICTLY FORBIDDEN: grout lines, mortar, dark or light joint fills, tile borders, grid overlays, kite outlines, cross lines, bevelled edges, or any joint that is wider or darker than a hairline. The symmetry of the veining is what reveals where the slabs meet — not a drawn line.
STRICTLY FORBIDDEN: do NOT add any additional seams, subdivisions, repeats or panel edges beyond the arrangement already present in the source image.`
            : '';
        // ──────────────────────────────────────────────────────────────────

        const fidelityRule = isPlain
            ? `TEXTURE FIDELITY: This stone is a solid, uniform material. STRICTLY FORBIDDEN: Do NOT add any synthetic veins, patterns, grain, or textures. Maintain the smooth, consistent, and mono-chromatic appearance of the source image exactly.`
            : `TEXTURE FIDELITY: Respect the natural vein structure and grain. Do NOT add extra synthetic veins that are not in the source image.`;

        // With a slab grid the surface IS several slabs with real joints, so the
        // "one seamless mono-block" wording would directly contradict
        // slabLayoutInstruction. Suppress it and let that block speak alone.
        const seamlessInstruction = gridActive
            ? ''
            : isPlain
                ? `SEAMLESS ARCHITECTURE: This is a large-format natural stone slab, NOT a floor tile. STRICTLY FORBIDDEN: Do NOT add any grout lines, grid patterns, square segregations, or tile seams. The entire ${application} must appear as one continuous, seamless mono-block surface with the uniform, consistent texture flowing uninterrupted from edge to edge.`
                : `SEAMLESS ARCHITECTURE: This is a large-format natural stone slab, NOT a floor tile. STRICTLY FORBIDDEN: Do NOT add any grout lines, grid patterns, square segregations, or tile seams. The entire ${application} must appear as one continuous, seamless mono-block surface with uninterrupted natural veining and patterns flowing from edge to edge.`;

        // A facade is a specific shot: the whole building elevation, straight on.
        // The generic "exterior" wording drifted toward balconies and patios,
        // which is what made the Facade application unusable before.
        const isFacade = roomType.toLowerCase().includes('facade') ||
                         roomType.toLowerCase().includes('elevation');

        const contextShot = isFacade
            ? `photorealistic architectural photograph of the FULL EXTERIOR ELEVATION of a one-to-two storey private residence, photographed straight-on from across the street so the whole house is in frame from ground to roofline. Bright natural daylight, clear sky, 8K resolution, architectural magazine style. This is an EXTERIOR of a building — do NOT show any interior room, balcony interior, patio seating or terrace furniture.`
            : isOutdoor
                ? `photorealistic, wide-angle residential exterior shot — luxury home architecture, bright natural daylight, 8K resolution, architectural magazine style.`
                : `photorealistic, wide-angle architectural interior shot — high-end design, soft ambient lighting, 8K resolution, architectural magazine style.`;

        // Clad the walls, not the ground: without this the model tends to put the
        // stone on the driveway or path instead of the building itself.
        const facadeInstruction = isFacade
            ? `FACADE APPLICATION: Clad the EXTERIOR WALLS of the house with this stone — the vertical wall surfaces of the elevation across its storeys. Windows, doors, roof, sky and landscaping must remain natural and untouched. Do NOT apply the stone to the driveway, path or ground.`
            : '';

        const compositePrompt = `This is a high-resolution source photograph of the natural stone "${stoneName}".
CRITICAL REQUIREMENT: Use the EXACT texture, grain, and colors from this specific image. ${fidelityRule}
Do NOT generate a new stone pattern. Do NOT re-interpret the stone's appearance.
${backgroundExtractionInstruction}
Map this precise slab onto the ${application} in a ${roomStyle} ${roomType} using pixel-perfect perspective.
The stone in the final render must be the IDENTICAL twin of the source image: same hue, same grain, same translucency.
${seamlessInstruction}
${slabLayoutInstruction}
${facadeInstruction}
STRICTLY FORBIDDEN: Do NOT place any rugs, mats, carpets, or floor coverings in the scene. The entire ${application} MUST be 100% exposed and completely visible, from corner to corner. Do not obscure the stone with furniture unless strictly structural.
The rest of the scene should be a ${contextShot}.
Maintain 100% structural faithfulness to the material source.`;

        const fallbackPrompt = `A ultra-high-end, photorealistic wide-angle ${isOutdoor ? 'exterior' : 'interior'} shot of a ${roomType}.
The focal point is the ${application} made of "${stoneName}" — a natural ${stoneType} with authentic textures and patterns. ${fidelityRule}
${backgroundExtractionInstruction}
${seamlessInstruction}
${slabLayoutInstruction}
${facadeInstruction}
STRICTLY FORBIDDEN: Do NOT place any rugs, mats, carpets, or floor coverings in the scene. The entire ${application} MUST be completely exposed.
Maintain strict adherence to the visual characteristics of this specific luxury material.
${isOutdoor ? 'Bright sunlight' : 'Soft architectural lighting'}, 8k resolution, architectural magazine style, realistic natural stone texture.`;

        console.log(`[AI Visualizer] Sending stone image URL to server for compositing... Custom Image: ${!!userRoomImage}, Slab grid: ${gridActive ? `${slabGrid.cols}x${slabGrid.rows}` : 'none'}`);

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    promptText: imageUrl ? compositePrompt : fallbackPrompt,
                    stoneImageUrl: imageUrl || null,   // Server will fetch this — no CORS issue
                    // The composed slab panel, when there is one. Sent ALONGSIDE
                    // stoneImageUrl rather than in place of it: the server prefers
                    // this when present and falls back to fetching the URL when it
                    // can't be parsed, so one field never has to mean two things.
                    stoneImageData: gridActive ? slabPanelImage : null,
                    slabGrid: gridActive ? slabGrid : null,
                    slabDescription: gridActive ? slabDescription : null,
                    roomType,
                    application,
                    stoneName,
                    roomStyle,
                    userRoomImage,
                    regionMaskImage,
                    regionDescription,
                    regionInsist
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
