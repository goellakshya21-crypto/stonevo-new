const API_KEY = "AIzaSyBBfoSHCthUnkdm1b3BLFkNIWVmXA_n6Rg";

async function testModels() {
    const models = [
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro"
    ];

    for (const modelName of models) {
        try {
            console.log(`\nTesting ${modelName}...`);

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: "Say hello" }]
                    }]
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`✅ ${modelName} WORKS!`);
                console.log(`Response: ${JSON.stringify(data).substring(0, 100)}`);
                return; // Stop after first success
            } else {
                console.log(`❌ ${modelName} failed: ${data.error?.message || JSON.stringify(data)}`);
            }
        } catch (error) {
            console.log(`❌ ${modelName} error: ${error.message}`);
        }
    }
}

testModels();
