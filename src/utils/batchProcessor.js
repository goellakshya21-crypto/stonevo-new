import { GoogleGenerativeAI } from "@google/generative-ai";
import { compressImage } from "./imageOptimizer";

export class BatchProcessor {
    constructor(apiKey, onProgress, onError, globalType = 'Auto-detect') {
        this.apiKey = apiKey;
        this.onProgress = onProgress;
        this.onError = onError;
        this.globalType = globalType;
        this.isPaused = false;
        this.isStopped = false;
        this.delay = 4000;
    }

    async processImages(images) {
        const results = [];
        const genAI = new GoogleGenerativeAI(this.apiKey);

        for (let i = 0; i < images.length; i++) {
            if (this.isStopped) break;

            // Wait if paused
            while (this.isPaused && !this.isStopped) {
                await this.sleep(500);
            }

            try {
                const result = await this.analyzeImage(genAI, images[i]);
                results.push({
                    success: true,
                    data: result.data,
                    image: result.optimizedFile,
                    fileName: images[i].name
                });

                this.onProgress({
                    current: i + 1,
                    total: images.length,
                    status: 'processing',
                    currentFile: images[i].name,
                    result: result
                });
            } catch (error) {
                const errorResult = {
                    success: false,
                    error: error.message,
                    image: images[i],
                    fileName: images[i].name
                };
                results.push(errorResult);

                this.onError(errorResult);

                this.onProgress({
                    current: i + 1,
                    total: images.length,
                    status: 'error',
                    currentFile: images[i].name,
                    error: error.message
                });
            }

            // Add delay between requests (except for the last one)
            if (i < images.length - 1 && !this.isStopped) {
                await this.sleep(this.delay);
            }
        }

        return results;
    }

    async analyzeImage(genAI, imageFile) {
        // Optimize image before sending to AI (reduces bandwidth and token usage)
        const optimizedFile = await compressImage(imageFile);
        const imagePart = await this.fileToGenerativePart(optimizedFile);
        const extractedName = this.cleanFileName(optimizedFile);

        const typeInstruction = this.globalType === 'Auto-detect'
            ? 'Geological type (Marble, Granite, Onyx, Quartzite, Travertine, Sandstone, or Limestone)'
            : `THIS IS A ${this.globalType.toUpperCase()}. Set "type" to "${this.globalType}".`;

        const prompt = `Analyze this stone image (Name: ${extractedName}) for an architectural database.
    Return ONLY a raw JSON object (no markdown formatting) with the following structure:
    {
        "name": "${extractedName}",
        "physical_properties": {
        "color": "ONLY the single most dominant base color (e.g. White, Black, Blue, Beige, Green, Yellow, Grey, Pink). Do NOT include secondary colors or veining colors.",
        "priceRange": "Pending",
        "type": "${typeInstruction}",
        "pattern": "CRITICAL: Set to 'Yes' ONLY if there are repetitive, rhythmic lines running through the entire stone (like parallel veins or linear stripes). If there are only random spots, irregular clouds, or scattered veining, set to 'No'. Focus on linear repetition.",
        "brightness": "Overall brightness based on the dominant color (Light or Dark)"
        },
        "description": "A short, elegant architectural description of the stone's appearance, veining, and character (max 2 sentences). It should match the name ${extractedName}.",
        "tags": ["tag1", "tag2", "tag3", "etc"] // Include all secondary colors, veining colors, and architectural style keywords here.
    }`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown if present
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return {
            data: JSON.parse(cleanedText),
            optimizedFile: optimizedFile
        };
    }

    async fileToGenerativePart(file) {
        const base64EncodedDataPromise = new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
        });
        return {
            inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
        };
    }

    cleanFileName(file) {
        if (!file) return "";
        let name = file.name.replace(/\.[^/.]+$/, "");
        name = name.replace(/[_-]/g, " ");
        return name.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    stop() {
        this.isStopped = true;
        this.isPaused = false;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
