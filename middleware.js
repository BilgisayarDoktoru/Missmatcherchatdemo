import { NextResponse } from 'next/server';

/**
 * Next.js Middleware - Tüm istekler burada geçer
 * Vercel Edge Runtime'da çalışır → çok hızlı
 */
export function middleware(request) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // ── Temel Güvenlik Başlıkları ──────────────────────────────────────────────
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ── API Endpoint Koruması ──────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    // Cache'leme engelle - her API isteği taze olsun
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    // Çok büyük User-Agent'ları engelle (buffer overflow girişimleri)
    const ua = request.headers.get('user-agent') || '';
    if (ua.length > 512) {
      return new NextResponse(JSON.stringify({ error: 'Bad Request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Belirli HTTP methodlarına izin ver
    const allowedMethods = ['GET', 'POST', 'OPTIONS', 'HEAD'];
    if (!allowedMethods.includes(request.method)) {
      return new NextResponse(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          Allow: allowedMethods.join(', '),
        },
      });
    }
  }

  // ── Statik Dosyalar için Cache ─────────────────────────────────────────────
  if (pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/image|favicon.ico).*)',
  ],
};
