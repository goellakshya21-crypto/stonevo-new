/**
 * Stonevo maintenance middleware.
 *
 * When MAINTENANCE_MODE=true is set in Vercel env vars, every request returns
 * a branded 503 maintenance page — EXCEPT:
 *   - Requests with ?bypass=<MAINTENANCE_BYPASS_KEY> set the bypass cookie
 *     (so you/your team can still preview the live site)
 *   - Requests carrying the bypass cookie pass through normally
 *
 * To enable maintenance:
 *   1. Set MAINTENANCE_MODE=true   in Vercel env vars
 *   2. Redeploy (or any git push)
 *   3. Site shows the maintenance page to the public
 *   4. Visit stonevo.in/?bypass=<key> to preview as normal
 *
 * To disable:
 *   - Remove MAINTENANCE_MODE (or set it to false)
 *   - Redeploy
 *
 * The bypass key is stored in MAINTENANCE_BYPASS_KEY env var.
 */

export const config = {
    // Run on every request, except static assets / fonts
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|fonts/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)).*)',
    ],
};

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Stonevo — Temporarily Unavailable</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,300;0,400;1,300&family=Manrope:wght@400;700;800&display=swap" rel="stylesheet" />
<style>
  :root {
    --bg: #0d0c0a;
    --ink: #FDFCF8;
    --bronze: #A37D4B;
    --muted: rgba(253,252,248,0.55);
    --line: rgba(163,125,75,0.25);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    background: var(--bg);
    color: var(--ink);
    font-family: 'Manrope', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    text-align: center;
  }
  .wordmark {
    font-family: 'Noto Serif', serif;
    font-size: 22px;
    letter-spacing: 0.3em;
    color: var(--ink);
    margin-bottom: 80px;
  }
  .eyebrow {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.45em;
    text-transform: uppercase;
    color: var(--bronze);
    margin-bottom: 32px;
    display: flex;
    align-items: center;
    gap: 14px;
    justify-content: center;
  }
  .eyebrow::before, .eyebrow::after {
    content: '';
    width: 32px;
    height: 1px;
    background: var(--bronze);
    opacity: 0.6;
  }
  h1 {
    font-family: 'Noto Serif', serif;
    font-size: clamp(42px, 6vw, 76px);
    font-weight: 300;
    letter-spacing: -0.025em;
    line-height: 1.05;
    margin-bottom: 24px;
    max-width: 18ch;
  }
  h1 em { font-style: italic; color: var(--bronze); }
  p {
    font-size: 15px;
    font-weight: 300;
    line-height: 1.75;
    color: var(--muted);
    max-width: 50ch;
    margin-bottom: 40px;
  }
  .contact {
    display: flex;
    gap: 36px;
    margin-top: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .contact a {
    color: var(--ink);
    text-decoration: none;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 14px 28px;
    border: 1px solid var(--line);
    border-radius: 100px;
    background: rgba(163,125,75,0.05);
    transition: background 0.3s, border-color 0.3s, color 0.3s;
  }
  .contact a:hover {
    background: var(--bronze);
    color: var(--bg);
    border-color: var(--bronze);
  }
  .footer {
    position: absolute;
    bottom: 32px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: rgba(253,252,248,0.25);
  }
</style>
</head>
<body>
  <div class="wordmark">STONEVO</div>
  <div class="eyebrow">Temporarily Offline</div>
  <h1>The atelier is <em>resting.</em></h1>
  <p>Stonevo is briefly unavailable while we refine a few details. Please check back shortly — or reach out for private enquiries.</p>
  <div class="contact">
    <a href="mailto:advisory@stonevo.in">advisory@stonevo.in</a>
  </div>
  <div class="footer">© 2026 Stonevo Architectural · Artifact of Nature</div>
</body>
</html>`;

export default function middleware(request) {
    const url = new URL(request.url);

    // If maintenance isn't on, do nothing — request continues normally
    const maintenance = process.env.MAINTENANCE_MODE;
    if (maintenance !== 'true' && maintenance !== '1') {
        return Response.next ? Response.next() : new Response(null, { headers: { 'x-stonevo-pass': '1' } });
    }

    const bypassKey = process.env.MAINTENANCE_BYPASS_KEY || '';

    // 1) Bypass via query string — sets cookie + redirects to clean URL
    const queryBypass = url.searchParams.get('bypass');
    if (queryBypass && bypassKey && queryBypass === bypassKey) {
        url.searchParams.delete('bypass');
        const cleanUrl = url.toString();
        return new Response(null, {
            status: 302,
            headers: {
                location: cleanUrl,
                'set-cookie': `stonevo_bypass=${encodeURIComponent(bypassKey)}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax`,
            },
        });
    }

    // 2) Bypass via cookie set from a previous query-string visit
    const cookieHeader = request.headers.get('cookie') || '';
    const cookieBypass = (cookieHeader.match(/stonevo_bypass=([^;]+)/) || [])[1];
    if (cookieBypass && bypassKey && decodeURIComponent(cookieBypass) === bypassKey) {
        return Response.next ? Response.next() : new Response(null);
    }

    // 3) Otherwise — show the maintenance page
    return new Response(MAINTENANCE_HTML, {
        status: 503,
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store, no-cache, must-revalidate',
            'retry-after': '3600',
        },
    });
}
