const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');

async function testImageGen() {
    const keyData = JSON.parse(fs.readFileSync('hi.json', 'utf8'));
    const vertexAI = new VertexAI({ 
        project: keyData.project_id, 
        location: 'us-central1',
        googleAuthOptions: {
            credentials: {
                client_email: keyData.client_email,
                private_key: keyData.private_key,
            }
        }
    });

    const modelId = 'gemini-2.5-flash-image'; // trying Nano Banana
    const model = vertexAI.preview.getGenerativeModel({ model: modelId });

    console.log(`Testing Image Gen with ${modelId}...`);

    try {
        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: 'Generate an image of a luxury kitchen with marble countertops.' }]
            }]
        });
        const response = await result.response;
        console.log('SUCCESS:', JSON.stringify(response, null, 2));
    } catch (e) {
        console.error('FAILED:', e.message);
    }
}

testImageGen();
