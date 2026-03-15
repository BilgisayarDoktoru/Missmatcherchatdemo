/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Clickjacking koruması
  { key: 'X-Frame-Options', value: 'DENY' },
  // MIME sniffing koruması
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // XSS koruması (eski tarayıcılar için)
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Referrer politikası
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // HTTPS zorlaması (HSTS)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // İzin politikası
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://api.anthropic.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // "X-Powered-By: Next.js" başlığını gizle
  compress: true,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // API body boyutu sınırla (DDoS önlemi)
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
};

module.exports = nextConfig;
