/**
 * /api/chat - Ana chat API endpoint'i
 * Tam güvenlik koruması ile
 */

import { rateLimit, suspicionScore } from '../../lib/rateLimit';
import { sanitizeMessage, getRealIP, analyzeUserAgent, errorResponse } from '../../lib/security';
import { addMessage, getMessages } from '../../lib/messageStore';

// API body boyutu sınırı (DDoS önlemi)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10kb', // Max 10KB
    },
  },
};

export default async function handler(req, res) {
  // ── 1. CORS Başlıkları ──────────────────────────────────────────────────────
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || '',
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (!origin || allowedOrigins.some((o) => origin === o || o === '')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-ID, X-Client-Token');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // ── 2. Bot Tespiti ──────────────────────────────────────────────────────────
  const userAgent = req.headers['user-agent'] || '';
  const { isBot, isSuspicious } = analyzeUserAgent(userAgent);

  if (isBot) {
    return errorResponse(res, 403, 'Forbidden', { code: 'BOT_DETECTED' });
  }

  // ── 3. IP Rate Limiting ─────────────────────────────────────────────────────
  const ip = getRealIP(req);
  const { success, remaining, resetAt } = rateLimit(ip, {
    limit: 30,
    windowMs: 60_000, // 1 dakikada 30 istek
  });

  res.setHeader('X-RateLimit-Limit', '30');
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', resetAt.toString());

  if (!success) {
    res.setHeader('Retry-After', Math.ceil((resetAt - Date.now()) / 1000).toString());
    return errorResponse(res, 429, 'Too Many Requests', {
      code: 'RATE_LIMITED',
      retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
    });
  }

  // ── 4. Şüpheli Davranış Uyarısı ──────────────────────────────────────────
  const suspicion = suspicionScore(ip);
  if (suspicion > 0.8) {
    // Yavaşlat (honeypot delay)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // ── 5. GET - Mesajları Getir ────────────────────────────────────────────────
  if (req.method === 'GET') {
    const roomId = sanitizeRoomId(req.query.room || 'general');
    const messages = getMessages(roomId);

    return res.status(200).json({
      success: true,
      messages,
      timestamp: Date.now(),
    });
  }

  // ── 6. POST - Mesaj Gönder ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { content, sender, senderColor, room, clientToken } = req.body || {};

    // Boş mesaj kontrolü
    if (!content || typeof content !== 'string') {
      return errorResponse(res, 400, 'Message content is required', { code: 'INVALID_BODY' });
    }

    // İçerik sanitizasyonu
    const { safe, cleaned, threats } = sanitizeMessage(content);

    if (!safe) {
      // Güvenlik olayını logla (production'da bu bir alerting sistemine gidebilir)
      console.warn(`[SECURITY] Threat detected from IP ${ip}:`, threats);
      return errorResponse(res, 400, 'Invalid message content', {
        code: 'CONTENT_REJECTED',
        reason: threats[0],
      });
    }

    // Sender adını sanitize et
    const safeSender = typeof sender === 'string'
      ? sender.replace(/[<>]/g, '').substring(0, 30) || 'Anonim'
      : 'Anonim';

    const roomId = sanitizeRoomId(room || 'general');

    const message = addMessage(roomId, {
      content: cleaned,
      sender: safeSender,
      senderColor: validateColor(senderColor) ? senderColor : '#7C3AED',
      type: 'text',
    });

    return res.status(201).json({
      success: true,
      message,
    });
  }

  return errorResponse(res, 405, 'Method Not Allowed');
}

// Oda ID'sini güvenli hale getir
function sanitizeRoomId(id) {
  if (typeof id !== 'string') return 'general';
  return id.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50) || 'general';
}

// Renk kodunu doğrula
function validateColor(color) {
  if (typeof color !== 'string') return false;
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}
