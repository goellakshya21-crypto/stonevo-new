export default function handler(req, res) {
  // Deliberately does NOT echo env var names. This previously returned
  // envKeys: Object.keys(process.env).filter(k => k.includes('GEMINI')),
  // publicly confirming which credentials exist on the deployment.
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
