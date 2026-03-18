const API_KEY = process.env.VITE_GEMINI_API_KEY;

async function listModels() {
    try {
        console.log('📋 Fetching list of available models...\n');

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.models) {
            console.log(`✅ Found ${data.models.length} models:\n`);

            const generateModels = data.models.filter(m =>
                m.supportedGenerationMethods &&
                m.supportedGenerationMethods.includes('generateContent')
            );

            console.log(`🎯 Models that support generateContent (${generateModels.length}):\n`);
            generateModels.forEach(model => {
                console.log(`  - ${model.name}`);
            });

            if (generateModels.length > 0) {
                console.log(`\n✨ TRY THIS MODEL: ${generateModels[0].name.replace('models/', '')}`);
            }
        } else {
            console.log('❌ Error:', data.error?.message || JSON.stringify(data));
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

listModels();
