const API_KEY = "AIzaSyBBfoSHCthUnkdm1b3BLFkNIWVmXA_n6Rg";

async function testModels() {
    const models = [
        "gemini-1.5-flash-8b",
        "gemini-1.5-flash-002",
        "gemini-exp-1206",
        "gemini-2.0-flash-exp",
        "models/gemini-1.5-flash"
    ];

    for (const modelName of models) {
        try {
            console.log(`\n🧪 Testing ${modelName}...`);

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: "Respond with just the word 'SUCCESS'" }]
                    }]
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`✅ ${modelName} WORKS!`);
                console.log(`   Response: ${data.candidates[0].content.parts[0].text}`);
                console.log(`\n🎉 USE THIS MODEL: ${modelName}`);
                return modelName;
            } else {
                const errorMsg = data.error?.message || 'Unknown error';
                console.log(`❌ Failed: ${errorMsg.substring(0, 80)}`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }

    console.log('\n❌ NO MODELS WORKED - API Key may be invalid or restricted');
}

testModels();
