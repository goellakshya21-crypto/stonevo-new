import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { promptText, referenceImage } = req.body;

        if (!promptText) {
            return res.status(400).json({ error: 'Prompt text is required' });
        }

        console.log('[Imagen Proxy] Authenticating with Google Cloud...');

        // Initialize authentication
        const authConfig = process.env.VERTEX_CREDENTIALS_JSON ? {
            credentials: JSON.parse(process.env.VERTEX_CREDENTIALS_JSON),
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        } : {
            keyFile: 'D:\\papa2\\papa\\stonevo-ea344bfee23b.json',
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        };

        const auth = new GoogleAuth(authConfig);
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        const projectId = 'stonevo';
        const location = 'us-central1';
        const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`;

        console.log('[Imagen Proxy] Sending prompt to Vertex AI:', promptText);

        // Build the instance payload
        let instanceData = { prompt: promptText };

        // We MUST include the reference image to get the Onyx pattern right
        if (referenceImage) {
            console.log('[Imagen Proxy] Including reference image for material accuracy.');
            instanceData.referenceImages = [{
                referenceId: 1,
                referenceType: "SUBJECT",
                image: {
                    bytesBase64Encoded: referenceImage
                }
            }];
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                instances: [instanceData],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: "16:9",
                    // STRONGLY repel the AI's urge to turn light onyx into dark navy
                    negativePrompt: "dark, navy, black, shadowy, dim, poorly lit, gothic, moody, saturated blue, dark blue, deep ocean"
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('[Imagen Proxy] Error from Google Cloud:', errText);
            return res.status(500).json({ error: 'Failed to generate image from Google Cloud' });
        }

        const data = await response.json();
        const base64Image = data.predictions[0]?.bytesBase64Encoded;

        if (!base64Image) {
            console.error('[Imagen Proxy] No image was returned. Response:', JSON.stringify(data));
            return res.status(500).json({ error: 'No image data returned from Google Cloud' });
        }

        console.log('[Imagen Proxy] Successfully generated image.');

        // Construct a data URL to send back to the client
        const dataUrl = `data:image/png;base64,${base64Image}`;
        res.status(200).json({ url: dataUrl });

    } catch (error) {
        console.error('[Imagen Proxy] Fatal Error Generating Image:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
