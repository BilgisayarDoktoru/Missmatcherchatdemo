/**
 * Rate Limiter - Sliding Window Algorithm
 * DDoS ve brute-force saldırılarına karşı koruma
 */

const ipRequestMap = new Map();

// Her 10 dakikada bir eski kayıtları temizle (memory leak önlemi)
if (typeof globalThis !== 'undefined') {
  if (!globalThis._rateLimitCleanup) {
    globalThis._rateLimitCleanup = setInterval(() => {
      const now = Date.now();
      for (const [key, data] of ipRequestMap.entries()) {
        if (now - data.windowStart > 60 * 1000 * 10) {
          ipRequestMap.delete(key);
        }
      }
    }, 10 * 60 * 1000);
  }
}

/**
 * @param {string} ip - İstemci IP adresi
 * @param {object} options
 * @param {number} options.limit - Pencere başına max istek sayısı
 * @param {number} options.windowMs - Zaman penceresi (ms)
 * @returns {{ success: boolean, remaining: number, resetAt: number }}
 */
export function rateLimit(ip, { limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const key = `rl:${ip}`;

  if (!ipRequestMap.has(key)) {
    ipRequestMap.set(key, { count: 1, windowStart: now, requests: [now] });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  const data = ipRequestMap.get(key);

  // Pencere dışındaki istekleri temizle (sliding window)
  data.requests = data.requests.filter((t) => now - t < windowMs);
  data.requests.push(now);
  data.count = data.requests.length;
  data.windowStart = data.requests[0] || now;

  const remaining = Math.max(0, limit - data.count);
  const resetAt = data.windowStart + windowMs;

  if (data.count > limit) {
    return { success: false, remaining: 0, resetAt };
  }

  return { success: true, remaining, resetAt };
}

/**
 * Şüpheli davranış skoru hesapla
 * Çok hızlı istekler = bot şüphesi
 */
export function suspicionScore(ip) {
  const key = `rl:${ip}`;
  const data = ipRequestMap.get(key);
  if (!data || data.requests.length < 3) return 0;

  const recent = data.requests.slice(-5);
  const avgInterval =
    (recent[recent.length - 1] - recent[0]) / (recent.length - 1);

  // 100ms'den hızlı istek = yüksek şüphe skoru
  if (avgInterval < 100) return 1.0;
  if (avgInterval < 300) return 0.7;
  if (avgInterval < 500) return 0.4;
  return 0;
}
