/**
 * Debug endpoint — hit this in browser to verify Telegram setup.
 * GET /api/test-telegram
 *
 * Returns JSON showing:
 *  - Whether env vars are configured
 *  - The result of trying to send a test message
 *  - Any error from Telegram's API
 */
export default async function handler(req, res) {
    // Prevent any caching of this debug response
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    const mask = (s) => {
        if (!s) return null;
        if (s.length < 8) return '****';
        return s.slice(0, 4) + '...' + s.slice(-4);
    };

    // Show ALL env keys starting with TELEGRAM so we can spot typos / wrong names
    const allTelegramKeys = Object.keys(process.env).filter(k => k.toUpperCase().includes('TELEGRAM'));

    const diagnostics = {
        env: {
            TELEGRAM_BOT_TOKEN: TOKEN ? `SET (${mask(TOKEN)}, length=${TOKEN.length})` : '❌ NOT SET',
            TELEGRAM_CHAT_ID: CHAT_ID ? `SET (${CHAT_ID})` : '❌ NOT SET',
        },
        allKeysContainingTelegram: allTelegramKeys.length > 0 ? allTelegramKeys : '(none found)',
        envVarsTotal: Object.keys(process.env).length,
        runtime: process.env.VERCEL_ENV || 'unknown',
        region: process.env.VERCEL_REGION || 'unknown',
        deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'unknown',
        timestamp: new Date().toISOString()
    };

    if (!TOKEN || !CHAT_ID) {
        return res.status(200).json({
            ok: false,
            reason: 'Missing env vars',
            hint: 'In Vercel: 1) Make sure vars are NOT marked "Sensitive" — try un-checking, 2) Apply to Production environment, 3) Redeploy.',
            diagnostics
        });
    }

    try {
        const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
        const tgRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: '🧪 Stonevo test ping — if you see this, Telegram is wired up correctly!',
                disable_web_page_preview: true
            })
        });
        const data = await tgRes.json();

        return res.status(200).json({
            ok: data.ok === true,
            telegramResponse: data,
            diagnostics
        });
    } catch (err) {
        return res.status(200).json({
            ok: false,
            reason: 'Fetch failed',
            error: err.message,
            diagnostics
        });
    }
}
