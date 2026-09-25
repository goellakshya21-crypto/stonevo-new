/**
 * Reload when the page is running code older than what is deployed.
 *
 * Why this exists: a user's phone kept an old copy of the site in memory, so a
 * fix that was already live -- adding his number to the launch allowlist --
 * never reached him. The server was doing everything right (no-cache headers,
 * no service worker). The problem is on the device, in two ways:
 *
 *   - A single-page app never re-downloads its code while the tab stays open,
 *     however many days that is. Coming back to it resumes the OLD code.
 *   - iOS Safari restores pages from its back/forward cache: reopening the
 *     browser brings the page back exactly as it was, without asking the server.
 *
 * So whenever the page is shown again, it asks the server which bundle is
 * current and reloads if that is not the one it is running.
 *
 * It only acts at that moment of coming back -- never while someone is using
 * the page -- so it cannot interrupt a render or a half-filled form.
 */

// The bundle this page is actually running, e.g. "index-BaV4vtv2.js".
const runningBundle = () => {
    for (const s of document.querySelectorAll('script[src]')) {
        const m = s.src.match(/\/assets\/(index-[^/]+\.js)/);
        if (m) return m[1];
    }
    return null;
};

let reloading = false;

// Set while the user is part-way through signing in. Leaving the page to read
// the SMS code and coming back is the NORMAL way to enter it -- and returning to
// the page is exactly what triggers this check. Reloading then wiped the code
// screen and sent people back to the phone form; asking for more codes then
// tripped the 3-per-10-minutes limit and locked them out entirely.
let held = false;
export const setReloadHold = (value) => { held = !!value; };

const checkForNewVersion = async () => {
    if (reloading || held) return;
    const mine = runningBundle();
    if (!mine) return;
    try {
        // no-store: the point is to ask the server, not a cache.
        const html = await (await fetch('/', { cache: 'no-store' })).text();
        const live = (html.match(/\/assets\/(index-[^"'/]+\.js)/) || [])[1];
        // Re-checked after the request: sign-in may have started while it ran.
        if (live && live !== mine && !held) {
            reloading = true;
            window.location.reload();
        }
    } catch {
        // Offline or a blip: carry on with what we have and try next time.
    }
};

export const startVersionCheck = () => {
    // Dev serves source files, not a hashed bundle, so there is nothing to compare.
    if (import.meta.env.DEV) return;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForNewVersion();
    });

    // Restored from the back/forward cache: the old page is back in memory as-is.
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) checkForNewVersion();
    });
};
