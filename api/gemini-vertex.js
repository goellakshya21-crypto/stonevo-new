import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { message, history, model: modelId = 'gemini-1.5-flash' } = req.body;

        // Secure Service Account Loading
        let keyData;
        if (process.env.GOOGLE_SERVICE_ACCOUNT) {
            console.log('[Vertex AI] Loading credentials from GOOGLE_SERVICE_ACCOUNT Env Var.');
            keyData = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        } else {
            const keyPath = path.join(process.cwd(), 'hi.json');
            if (fs.existsSync(keyPath)) {
                console.log('[Vertex AI] Loading credentials from local hi.json.');
                keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
            } else {
                return res.status(500).json({ error: 'Service account credentials not found. Set GOOGLE_SERVICE_ACCOUNT or provide hi.json.' });
            }
        }
        
        // Initialize Vertex AI
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

        // Use the Gemini model
        const generativeModel = vertexAI.getGenerativeModel({
            model: modelId,
        });

        console.log(`[Vertex AI] Using model: ${modelId}`);

        // Format history for Vertex AI (parts instead of raw strings)
        const chat = generativeModel.startChat({
            history: history ? history.map(h => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.content }]
            })) : []
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const candidate = response.candidates?.[0];
        const text = candidate?.content?.parts?.find(p => p.text)?.text || "No response generated.";

        return res.status(200).json({ text });

    } catch (error) {
        console.error('[Vertex AI Error]:', error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        });
    }
}
