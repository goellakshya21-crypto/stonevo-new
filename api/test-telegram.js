/**
 * Debug endpoint — hit this in browser to verify Telegram setup.
 * GET /api/test-telegram
 *
 * Returns JSON showing:
 *  - Whether env vars are configured
 *  - The result of trying to send a test message
 *  - Any error from Telegram's API
 *
 * Token/chat ID are partially masked in the response so it's safe to share screenshots.
 *
 * Build trigger: forcing fresh deploy to pick up env vars.
 */
export default async function handler(req, res) {
    const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    const mask = (s) => {
        if (!s) return null;
        if (s.length < 8) return '****';
        return s.slice(0, 4) + '...' + s.slice(-4);
    };

    const diagnostics = {
        env: {
            TELEGRAM_BOT_TOKEN: TOKEN ? `SET (${mask(TOKEN)})` : '❌ NOT SET',
            TELEGRAM_CHAT_ID: CHAT_ID ? `SET (${CHAT_ID})` : '❌ NOT SET',
        },
        timestamp: new Date().toISOString()
    };

    if (!TOKEN || !CHAT_ID) {
        return res.status(200).json({
            ok: false,
            reason: 'Missing env vars — add them in Vercel → Settings → Environment Variables, then redeploy.',
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
