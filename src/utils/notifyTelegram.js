/**
 * Telegram notification helper — fires-and-forgets, never blocks UX.
 *
 * Sends raw event data to /api/notify-telegram, which handles:
 *   - team skip list
 *   - quiet hours
 *   - cooldown per phone
 *   - activity context fetch
 *   - message formatting
 *   - inline buttons
 */

const send = (payload) => {
    try {
        fetch('/api/notify-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.warn('[Telegram] notify failed (non-blocking):', err));
    } catch (err) {
        console.warn('[Telegram] notify error:', err);
    }
};

/**
 * Plain login event (returning architect/client/vendor/etc.)
 * Server applies cooldown — won't ping more than once per hour per phone.
 */
export const notifyLogin = ({ phone, name, role, firm, status, isFirstLogin, leadId }) => {
    send({
        event: 'login',
        phone, name, role, firm, status, isFirstLogin, leadId
    });
};

/**
 * New architect signup — always pings (bypasses cooldown + quiet hours).
 */
export const notifyArchitectSignup = ({ phone, name, firm, email, website, leadId }) => {
    send({
        event: 'signup',
        phone, name, role: 'architect', firm, email, website, leadId,
        isFirstLogin: true
    });
};

/**
 * New client request — always pings.
 */
export const notifyClientRequest = ({ phone, name, architectPhone, leadId }) => {
    send({
        event: 'request',
        phone, name, role: 'builder', architectPhone, leadId,
        isFirstLogin: true
    });
};

/**
 * Generic — send a custom message (debug / future events).
 */
export const notifyTelegram = (text) => send({ event: 'custom', text });
