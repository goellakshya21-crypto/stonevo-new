import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Minimal env loader since we can't use vite's import.meta.env here
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.log("Could not load .env.local");
}

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("No API KEY found in VITE_GEMINI_API_KEY");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log("Fetching available models...");
        // For some reason listModels isn't directly on genAI in some versions, 
        // but usually it is model. 
        // Actually, in the latest SDK, it is managed via the ModelManager or similar, 
        // but standard REST call is safest if SDK is confusing.
        // Let's try the SDK first assuming it's up to date.
        // Wait, the SDK doesn't expose listModels on the top level class in all versions.
        // Let's try a direct fetch if SDK fails, but let's try to just hit the generateContent with a known old model.

        // Actually, let's just try to generate with gemini-1.5-flash and print error if it fails
        // But we want to LIST.

        // Since I'm not 100% sure of the Node SDK's listModels signature right now, 
        // I'll try to infer it from the error: "Call ListModels to see...".
        // I will use a simple fetch to the REST API which is foolproof.

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            fs.writeFileSync('models.json', JSON.stringify(data.models, null, 2));
            console.log("Saved models to models.json");
        } else {
            console.log("❌ Error listing models:", data);
        }

    } catch (error) {
        console.error("Fatal error:", error);
    }
}

listModels();
