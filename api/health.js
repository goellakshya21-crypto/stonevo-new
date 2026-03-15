export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasApiKey: !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
    envKeys: Object.keys(process.env).filter(k => k.includes('GEMINI'))
  });
}
