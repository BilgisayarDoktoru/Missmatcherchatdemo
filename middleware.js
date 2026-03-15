/**
 * Next.js Middleware - Tüm istekler burada geçer
 * Vercel Edge Runtime (native Web APIs - next/server import'u YOK)
 *
 * Neden native API? next/server ESM→CJS derlemesinde
 * "unsupported module" hatasına yol açıyor.
 * native Response/Headers Edge Runtime'da her zaman mevcut.
 */

/** Ortak güvenlik başlıkları */
const SECURITY_HEADERS = {
  'X-Content-Type-Options':  'nosniff',
  'X-Frame-Options':         'DENY',
  'X-XSS-Protection':        '1; mode=block',
  'Referrer-Policy':         'strict-origin-when-cross-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
};

/** JSON hata yanıtı döndür (native Response) */
function jsonError(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

export function middleware(request) {
  const url   = new URL(request.url);
  const { pathname } = url;

  // ── 1. API Endpoint Koruması ─────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    // Çok büyük User-Agent → buffer overflow girişimi
    const ua = request.headers.get('user-agent') || '';
    if (ua.length > 512) {
      return jsonError({ error: 'Bad Request', code: 'UA_TOO_LONG' }, 400);
    }

    // Desteklenmeyen HTTP metodları
    const ALLOWED = ['GET', 'POST', 'OPTIONS', 'HEAD'];
    if (!ALLOWED.includes(request.method)) {
      return jsonError(
        { error: 'Method Not Allowed' },
        405,
        { Allow: ALLOWED.join(', ') }
      );
    }
  }

  // ── 2. İsteği pass-through et, başlık ekle ──────────────────────────────
  // next/server olmadan başlık enjeksiyonu:
  // Response.next() yok → isteği olduğu gibi geçirip
  // next.config.js'deki headers() kuralları devreye girer.
  // Ek dinamik başlıklar için request header'a yaz, API handler okur.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-middleware-timestamp', Date.now().toString());
  requestHeaders.set('x-real-pathname', pathname);

  // ── 3. Statik varlıkları atla ───────────────────────────────────────────
  if (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/_next/image/')  ||
    pathname === '/favicon.ico'
  ) {
    return; // undefined döndürmek = dokunmadan geç
  }

  // pass-through (undefined = Edge'e bırak)
  return;
}

export const config = {
  matcher: [
    /*
     * Şunları HARİÇ tut:
     *  - _next/static   (statik dosyalar)
     *  - _next/image    (görüntü optimizasyonu)
     *  - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};
