/**
 * Server-side Telegram notification proxy.
 *
 * Keeps the bot token secret. Reads TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID from env.
 *
 * Optional env vars:
 *  - TELEGRAM_TEAM_PHONES: comma-separated 10-digit phone numbers to skip
 *  - TELEGRAM_QUIET_START: hour 0-23 IST when quiet starts (default 23)
 *  - TELEGRAM_QUIET_END:   hour 0-23 IST when quiet ends   (default 8)
 *  - TELEGRAM_COOLDOWN_MIN: min minutes between pings for same phone (default 60)
 *
 * POST body fields:
 *  - event:      'login' | 'signup' | 'request'   (controls formatting + cooldown rules)
 *  - phone:      10-digit phone (for skip + cooldown)
 *  - leadId:     optional UUID — used to fetch recent activity + build admin URL
 *  - name, role, firm, status, isFirstLogin, email, website, architectPhone
 *  - bypassCooldown: true for SIGNUP / REQUEST (always notify regardless of cooldown)
 */
import { createClient } from '@supabase/supabase-js';

const SUPER_WHITELIST = ['7678320944', '7042353166'];

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatTimeIST = () => new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
});

const getISTHour = () => {
    const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return ist.getHours();
};

const roleEmoji = (r) => {
    const role = (r || '').toLowerCase();
    if (role === 'architect') return '🏛';
    if (role === 'vendor') return '📦';
    if (role === 'admin') return '👑';
    if (role === 'builder' || role === 'client') return '🏠';
    return '👤';
};

const roleLabel = (r) => {
    const role = (r || '').toLowerCase();
    if (role === 'architect') return 'Architect';
    if (role === 'vendor') return 'Vendor';
    if (role === 'admin') return 'Admin';
    if (role === 'builder' || role === 'client') return 'Project Owner';
    return r || 'User';
};

const STONEVO_BASE = 'https://stonevo.in';
const ADMIN_PATH = '/internal-management-stonevo-9921';

/** Cooldown — skip if same phone notified within COOLDOWN_MIN window */
async function shouldSkipForCooldown(phone, cooldownMin) {
    if (!phone) return false;
    const cutoff = new Date(Date.now() - cooldownMin * 60_000).toISOString();
    try {
        const { data } = await supabase
            .from('login_events')
            .select('logged_in_at')
            .eq('phone_number', phone)
            .gte('logged_in_at', cutoff)
            .order('logged_in_at', { ascending: false })
            .limit(2);
        // The CURRENT login is the most recent row. If any PREVIOUS one is within cooldown → skip.
        return (data || []).length >= 2;
    } catch {
        return false;
    }
}

/** Fetch the lead's last 3 activity entries (stones viewed, AI queries etc.) */
async function fetchRecentActivity(leadId) {
    if (!leadId) return [];
    try {
        const { data } = await supabase
            .from('activity_logs')
            .select('action_type, details, created_at')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })
            .limit(3);
        return (data || []).map(a => {
            if (a.action_type === 'view_stone' && a.details?.stone_name) return `👁 Viewed ${a.details.stone_name}`;
            if (a.action_type === 'visualize' && a.details?.stone_name) return `✨ Visualized ${a.details.stone_name}${a.details.application ? ` as ${a.details.application}` : ''}`;
            if (a.action_type === 'ai_query' && a.details?.query) return `💬 Asked: "${String(a.details.query).slice(0, 50)}"`;
            if (a.action_type === 'search' && a.details?.filters) {
                const f = a.details.filters;
                const bits = [];
                if (f.marble?.length) bits.push(f.marble.join(','));
                if (f.color?.length) bits.push(f.color.join(','));
                return `🔍 Filtered: ${bits.join(' · ') || 'collection'}`;
            }
            return null;
        }).filter(Boolean);
    } catch {
        return [];
    }
}

function buildMessage({ event, phone, name, role, firm, status, isFirstLogin, email, website, architectPhone, recentActivity }) {
    const lines = [];
    const safeName = escapeHtml(name || 'Unknown');
    const safePhone = escapeHtml(phone || '');

    if (event === 'signup') {
        lines.push('🆕 <b>NEW ARCHITECT SIGNUP</b>');
        lines.push('⚠️ Action needed — review in admin panel');
        lines.push('');
        lines.push(`🏛 <b>${safeName}</b>`);
        lines.push(`📞 +91 ${safePhone}`);
        if (firm) lines.push(`🏢 ${escapeHtml(firm)}`);
        if (email) lines.push(`📧 ${escapeHtml(email)}`);
        if (website) lines.push(`🌐 ${escapeHtml(website)}`);
    } else if (event === 'request') {
        lines.push('🤝 <b>NEW CLIENT REQUEST</b>');
        lines.push('');
        lines.push(`🏠 <b>${safeName}</b>`);
        lines.push(`📞 +91 ${safePhone}`);
        if (architectPhone) lines.push(`🔗 Requesting architect: ${escapeHtml(architectPhone)}`);
    } else {
        lines.push(isFirstLogin ? '🎉 <b>FIRST LOGIN</b>' : '🪨 <b>NEW LOGIN</b>');
        lines.push('');
        lines.push(`${roleEmoji(role)} <b>${safeName}</b>`);
        lines.push(`📞 +91 ${safePhone}`);
        lines.push(`${roleEmoji(role)} ${escapeHtml(roleLabel(role))}${status ? ` · ${escapeHtml(status)}` : ''}`);
        if (firm) lines.push(`🏢 ${escapeHtml(firm)}`);
    }

    lines.push(`⏰ ${formatTimeIST()} IST`);

    if (recentActivity?.length) {
        lines.push('');
        lines.push('<i>Recent activity:</i>');
        recentActivity.forEach(a => lines.push(`  ${escapeHtml(a)}`));
    }

    return lines.join('\n');
}

function buildInlineKeyboard({ event, phone }) {
    const buttons = [];
    // "View Admin Panel" always
    buttons.push([{ text: '👁 View in Admin', url: `${STONEVO_BASE}${ADMIN_PATH}` }]);
    // "Message" via WhatsApp (works on phone)
    if (phone && phone.length === 10) {
        buttons.push([{ text: '💬 WhatsApp', url: `https://wa.me/91${phone}` }]);
    }
    return { inline_keyboard: buttons };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    if (!TOKEN || !CHAT_ID) {
        return res.status(200).json({ ok: false, skipped: true, reason: 'env vars not set' });
    }

    try {
        const body = req.body || {};
        const cleanPhone = (body.phone || '').replace(/\D/g, '').slice(-10);

        // 1. Team skip list (env-based + super whitelist)
        const teamPhones = new Set([
            ...SUPER_WHITELIST,
            ...(process.env.TELEGRAM_TEAM_PHONES || '').split(',').map(p => p.trim().replace(/\D/g, '').slice(-10)).filter(Boolean)
        ]);
        if (cleanPhone && teamPhones.has(cleanPhone)) {
            return res.status(200).json({ ok: true, skipped: true, reason: 'team phone' });
        }

        // 2. Quiet hours (default 23:00–08:00 IST)
        // Notification is still SENT — just silently (no buzz/ring on phone).
        // You'll see overnight activity in the morning when you open Telegram.
        const quietStart = parseInt(process.env.TELEGRAM_QUIET_START || '23', 10);
        const quietEnd = parseInt(process.env.TELEGRAM_QUIET_END || '8', 10);
        const hour = getISTHour();
        const inQuietHours = quietStart > quietEnd
            ? (hour >= quietStart || hour < quietEnd)
            : (hour >= quietStart && hour < quietEnd);
        // Signups and requests always notify with sound (high priority)
        // Routine logins during quiet hours go silent
        const silentNotification = inQuietHours && body.event === 'login' && !body.isFirstLogin;

        // 3. Cooldown — disabled by default (0 = ping every visit).
        // To enable: set TELEGRAM_COOLDOWN_MIN env var to a positive number of minutes.
        const cooldownMin = parseInt(process.env.TELEGRAM_COOLDOWN_MIN || '0', 10);
        if (cooldownMin > 0 && body.event === 'login' && !body.isFirstLogin && cleanPhone) {
            if (await shouldSkipForCooldown(cleanPhone, cooldownMin)) {
                return res.status(200).json({ ok: true, skipped: true, reason: 'cooldown' });
            }
        }

        // 4. Fetch recent activity context
        const recentActivity = await fetchRecentActivity(body.leadId);

        // 5. Build message (add 🌙 prefix during quiet hours so it's visually distinct in the morning)
        let text = buildMessage({ ...body, phone: cleanPhone, recentActivity });
        if (silentNotification) {
            text = '🌙 <i>Overnight</i>\n' + text;
        }
        const reply_markup = buildInlineKeyboard({ event: body.event, phone: cleanPhone });

        // 6. Send — silent during quiet hours (no buzz/ring), normal otherwise
        const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
        const tgRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                disable_notification: silentNotification,
                reply_markup
            })
        });
        const data = await tgRes.json();
        if (!data.ok) {
            console.error('[Telegram] API error:', data);
            return res.status(500).json({ ok: false, error: data.description });
        }
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('[Telegram] Error:', err);
        return res.status(500).json({ ok: false, error: err.message });
    }
}
