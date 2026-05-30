/**
 * Telegram notification helper — fires-and-forgets, never blocks UX.
 *
 * Sends formatted login / signup / request alerts to the Stonevo Alerts group.
 *
 * All calls go through /api/notify-telegram (server-side, token-safe).
 */

// Internal dev/test numbers — skip notifications for these to avoid spam during testing.
const SKIP_NUMBERS = new Set(['7678320944', '7042353166']);

const escapeHtml = (s) => {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

const formatTime = () => {
    const now = new Date();
    return now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

const roleEmoji = (role) => {
    const r = (role || '').toLowerCase();
    if (r === 'architect') return '🏛';
    if (r === 'admin') return '👑';
    if (r === 'builder' || r === 'client') return '🏠';
    return '👤';
};

const roleLabel = (role) => {
    const r = (role || '').toLowerCase();
    if (r === 'architect') return 'Architect';
    if (r === 'admin') return 'Admin';
    if (r === 'builder' || r === 'client') return 'Project Owner';
    return role || 'User';
};

/**
 * Low-level fire-and-forget send. Never throws — failures are silently logged.
 */
const sendToTelegram = (text) => {
    try {
        fetch('/api/notify-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, parseMode: 'HTML' })
        }).catch(err => console.warn('[Telegram] notify failed (non-blocking):', err));
    } catch (err) {
        console.warn('[Telegram] notify error:', err);
    }
};

/**
 * Login notification — fires when a known user logs in (returning or new).
 *
 * @param {object} info
 * @param {string} info.phone        - 10-digit phone
 * @param {string} info.name         - Full name
 * @param {string} info.role         - architect | builder | client | admin
 * @param {string} [info.firm]       - Firm name (architects)
 * @param {string} [info.status]     - approved | pending | rejected
 * @param {boolean} [info.isFirstLogin] - True for first-ever login
 */
export const notifyLogin = ({ phone, name, role, firm, status, isFirstLogin }) => {
    const clean = (phone || '').replace(/\D/g, '').slice(-10);
    if (SKIP_NUMBERS.has(clean)) return; // skip internal test numbers

    const header = isFirstLogin ? '🎉 <b>FIRST LOGIN</b>' : '🪨 <b>NEW LOGIN</b>';
    const lines = [
        header,
        '',
        `${roleEmoji(role)} <b>${escapeHtml(name || 'Unknown')}</b>`,
        `📞 +91 ${escapeHtml(clean)}`,
        `${roleEmoji(role)} ${escapeHtml(roleLabel(role))}${status ? ` · ${escapeHtml(status)}` : ''}`,
    ];
    if (firm) lines.push(`🏢 ${escapeHtml(firm)}`);
    lines.push(`⏰ ${formatTime()} IST`);

    sendToTelegram(lines.join('\n'));
};

/**
 * New architect signup — fires when an architect completes registration.
 */
export const notifyArchitectSignup = ({ phone, name, firm, email, website }) => {
    const clean = (phone || '').replace(/\D/g, '').slice(-10);
    if (SKIP_NUMBERS.has(clean)) return;

    const lines = [
        '🆕 <b>NEW ARCHITECT SIGNUP</b>',
        '⚠️ Action needed — review in admin panel',
        '',
        `🏛 <b>${escapeHtml(name || 'Unknown')}</b>`,
        `📞 +91 ${escapeHtml(clean)}`,
    ];
    if (firm) lines.push(`🏢 ${escapeHtml(firm)}`);
    if (email) lines.push(`📧 ${escapeHtml(email)}`);
    if (website) lines.push(`🌐 ${escapeHtml(website)}`);
    lines.push(`⏰ ${formatTime()} IST`);

    sendToTelegram(lines.join('\n'));
};

/**
 * New client request — fires when a client asks to join an architect's workspace.
 */
export const notifyClientRequest = ({ phone, name, architectPhone, architectName }) => {
    const clean = (phone || '').replace(/\D/g, '').slice(-10);
    if (SKIP_NUMBERS.has(clean)) return;

    const lines = [
        '🤝 <b>NEW CLIENT REQUEST</b>',
        '',
        `🏠 <b>${escapeHtml(name || 'Unknown')}</b>`,
        `📞 +91 ${escapeHtml(clean)}`,
    ];
    if (architectName || architectPhone) {
        lines.push(`🔗 Requesting architect: ${escapeHtml(architectName || 'Unknown')}${architectPhone ? ` (${escapeHtml(architectPhone)})` : ''}`);
    }
    lines.push(`⏰ ${formatTime()} IST`);

    sendToTelegram(lines.join('\n'));
};

/**
 * Generic — send a custom message (debug / future events).
 */
export const notifyTelegram = (text) => sendToTelegram(text);
