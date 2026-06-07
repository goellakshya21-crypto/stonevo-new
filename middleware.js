// Hard-block every request — site offline by user request.
// To restore: delete this file and push.
export const config = { matcher: ['/((?!_next/static|favicon.ico).*)'] };
export default function middleware() {
    return new Response('', {
        status: 503,
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
            'retry-after': '3600',
        },
    });
}
