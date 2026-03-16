export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    
    let geminiStatus = "Checking...";
    let latency = null;
    let modelUsed = "gemini-1.5-flash"; 

    try {
        const start = Date.now();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelUsed}:generateContent?key=${apiKey}`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] })
        });
        
        latency = Date.now() - start;
        if (resp.ok) {
            geminiStatus = "Connected";
        } else {
            const errText = await resp.text();
            geminiStatus = `API Error: ${resp.status} - ${errText.substring(0, 50)}...`;
        }
    } catch (err) {
        geminiStatus = `Fetch Error: ${err.message}`;
    }

    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        gemini: {
            status: geminiStatus,
            latency_ms: latency,
            model: modelUsed
        },
        envKeys: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('SUPABASE')),
        hasApiKey: !!apiKey
    });
}
