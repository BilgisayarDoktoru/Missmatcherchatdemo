/**
 * Güvenlik Yardımcıları
 * XSS, injection ve diğer saldırılara karşı koruma
 */

// Tehlikeli kalıplar - SQL Injection, XSS, Command Injection
const DANGEROUS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:text\/html/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /vbscript:/gi,
  /expression\s*\(/gi,
];

// SQL injection kalıpları
const SQL_PATTERNS = [
  /(\b)(union|select|insert|update|delete|drop|create|alter|exec|execute)(\b)/gi,
  /('|--|;|\/\*|\*\/)/g,
];

/**
 * Kullanıcı mesajını sanitize et
 * @param {string} input
 * @returns {{ safe: boolean, cleaned: string, threats: string[] }}
 */
export function sanitizeMessage(input) {
  if (typeof input !== 'string') {
    return { safe: false, cleaned: '', threats: ['invalid_type'] };
  }

  const threats = [];

  // Uzunluk kontrolü
  if (input.length > 2000) {
    return { safe: false, cleaned: '', threats: ['message_too_long'] };
  }

  // XSS kalıplarını kontrol et
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      threats.push('xss_attempt');
      break;
    }
  }

  // SQL injection kalıplarını kontrol et
  for (const pattern of SQL_PATTERNS) {
    if (pattern.test(input)) {
      threats.push('sql_injection_attempt');
      break;
    }
  }

  // Null bytes temizle
  let cleaned = input.replace(/\0/g, '');

  // HTML karakterlerini escape et
  cleaned = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return {
    safe: threats.length === 0,
    cleaned,
    threats,
  };
}

/**
 * Gerçek IP adresini al (Vercel / proxy arkasında)
 * @param {import('next').NextApiRequest} req
 * @returns {string}
 */
export function getRealIP(req) {
  // Vercel'in verdiği gerçek IP
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Birden fazla proxy varsa ilk IP gerçek kullanıcının IP'si
    const ips = forwardedFor.split(',').map((ip) => ip.trim());
    return ips[0];
  }

  return (
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] || // Cloudflare
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * User-Agent'ı analiz et - bot tespiti
 * @param {string} userAgent
 * @returns {{ isBot: boolean, isSuspicious: boolean, score: number }}
 */
export function analyzeUserAgent(userAgent) {
  if (!userAgent) return { isBot: true, isSuspicious: true, score: 1 };

  const ua = userAgent.toLowerCase();

  // Bilinen kötü botlar
  const badBots = [
    'sqlmap',
    'nikto',
    'nmap',
    'masscan',
    'zgrab',
    'nuclei',
    'dirbuster',
    'gobuster',
    'wfuzz',
    'hydra',
    'medusa',
    'curl/',
    'python-requests',
    'go-http-client',
    'scrapy',
    'wget/',
  ];

  for (const bot of badBots) {
    if (ua.includes(bot)) {
      return { isBot: true, isSuspicious: true, score: 1.0 };
    }
  }

  // Çok kısa user-agent şüpheli
  if (userAgent.length < 20) {
    return { isBot: false, isSuspicious: true, score: 0.6 };
  }

  return { isBot: false, isSuspicious: false, score: 0 };
}

/**
 * CORS kontrolü
 * @param {string} origin
 * @param {string[]} allowedOrigins
 */
export function validateOrigin(origin, allowedOrigins) {
  if (!origin) return true; // Same-origin istekler
  return allowedOrigins.some((allowed) => {
    if (allowed === '*') return true;
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain);
    }
    return origin === allowed;
  });
}

/**
 * API yanıtı için standart hata formatı
 */
export function errorResponse(res, status, message, details = {}) {
  return res.status(status).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    ...details,
  });
}
