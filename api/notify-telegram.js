/**
 * Server-side Telegram notification proxy.
 *
 * Keeps the bot token secret (never exposed to browser).
 * Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from Vercel env vars.
 *
 * POST { text: "...", parseMode?: "HTML"|"Markdown" }
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TOKEN || !CHAT_ID) {
        console.warn('[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars — skipping notification.');
        return res.status(200).json({ ok: false, skipped: true, reason: 'env vars not set' });
    }

    try {
        const { text, parseMode = 'HTML' } = req.body || {};
        if (!text) return res.status(400).json({ error: 'text required' });

        const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
        const tgRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text,
                parse_mode: parseMode,
                disable_web_page_preview: true
            })
        });

        const data = await tgRes.json();
        if (!data.ok) {
            console.error('[Telegram] API error:', data);
            return res.status(500).json({ ok: false, error: data.description || 'Telegram API error' });
        }
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('[Telegram] Error:', err);
        return res.status(500).json({ ok: false, error: err.message });
    }
}
