import { GoogleGenerativeAI } from "@google/generative-ai";
import { compressImage } from "./imageOptimizer";

export class BatchProcessor {
    constructor(apiKey, supabase, onProgress, onError, globalApplication = 'Auto-detect') {
        this.apiKey = apiKey;
        this.supabase = supabase;
        this.onProgress = onProgress;
        this.onError = onError;
        this.globalApplication = globalApplication;
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
                const extractedName = this.cleanFileName(images[i]);
                let resultData;
                let optimizedFile;

                // Check Supabase first
                const { data: existingStone } = await this.supabase
                    .from('stones')
                    .select('*')
                    .eq('name', extractedName)
                    .maybeSingle();

                if (existingStone) {
                    resultData = {
                        description: existingStone.description,
                        tags: existingStone.tags,
                        physical_properties: {
                            marble: existingStone.type,
                            finish: existingStone.finish,
                            color: existingStone.color,
                            temperature: existingStone.temperature,
                            application: existingStone.application,
                            pattern: existingStone.pattern,
                            priceRange: existingStone.price_range
                        }
                    };
                    optimizedFile = images[i]; // Skip compression if we already have it? 
                    // Actually, keep images[i] as is.
                } else {
                    const analysis = await this.analyzeImage(genAI, images[i]);
                    resultData = analysis.data;
                    optimizedFile = analysis.optimizedFile;
                }

                results.push({
                    success: true,
                    data: resultData,
                    image: optimizedFile,
                    fileName: images[i].name,
                    isExisting: !!existingStone
                });

                this.onProgress({
                    current: i + 1,
                    total: images.length,
                    status: 'processing',
                    currentFile: images[i].name,
                    result: { data: resultData, optimizedFile: optimizedFile, isExisting: !!existingStone }
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

        const prompt = `Analyze this stone image (Name: ${extractedName}) for an architectural database.
    Return ONLY a raw JSON object (no markdown formatting) with the following structure:
    {
        "description": "A short, elegant architectural description of the stone's appearance, veining, and character (max 2 sentences). It should match the character of a stone named ${extractedName}.",
        "tags": ["tag1", "tag2", "tag3", "etc"] // Include visual colors, descriptive textures, and style keywords.
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
