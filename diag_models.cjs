
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkModels() {
    const apiKey = "AIzaSyBBfoSHCthUnkdm1b3BLFkNIWVmXA_n6Rg";
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        console.log("Fetching models...");
        // In the Node SDK, listModels is standard
        const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // This is a bit tricky in the SDK but let's try a direct fetch or a common one
        console.log("Testing gemini-1.5-flash...");
        try {
            await result.generateContent("test");
            console.log("SUCCESS: gemini-1.5-flash works");
        } catch (e) {
            console.log("FAILED: gemini-1.5-flash", e.message);
        }

        console.log("Testing gemini-2.0-flash-exp...");
        try {
            const r2 = await genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            await r2.generateContent("test");
            console.log("SUCCESS: gemini-2.0-flash-exp works");
        } catch (e) {
            console.log("FAILED: gemini-2.0-flash-exp", e.message);
        }

        console.log("Testing gemini-2.5-flash...");
        try {
            const r3 = await genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            await r3.generateContent("test");
            console.log("SUCCESS: gemini-2.5-flash works");
        } catch (e) {
            console.log("FAILED: gemini-2.5-flash", e.message);
        }
    } catch (error) {
        console.error("Global Error:", error);
    }
}

checkModels();
