import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env
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
    console.error("❌ No API KEY found in VITE_GEMINI_API_KEY");
    process.exit(1);
}

console.log("🔑 Testing API Key:", apiKey.substring(0, 10) + "...");

async function testKey() {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Test with a simple text prompt (no image)
    const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

    for (const modelName of models) {
        try {
            console.log(`\n🧪 Testing ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say 'Hello' in JSON format: {\"message\": \"...\"}");
            const response = await result.response;
            console.log(`✅ ${modelName} WORKS!`);
            console.log(`   Response: ${response.text().substring(0, 50)}...`);
            break; // Stop after first success
        } catch (error) {
            console.log(`❌ ${modelName} failed: ${error.message.substring(0, 100)}`);
        }
    }
}

testKey();
