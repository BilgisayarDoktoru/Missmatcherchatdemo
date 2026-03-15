# ⚡ SecureChat

Vercel üzerinde çalışan, güvenli, hızlı ve modern bir chat uygulaması.

## 🔒 Güvenlik Özellikleri

| Koruma | Açıklama |
|---|---|
| **Rate Limiting** | IP başına dakikada 30 istek (Sliding Window) |
| **DDoS Koruması** | Vercel Edge + middleware katmanı |
| **XSS Koruması** | Tüm girdiler sanitize edilir |
| **SQL Injection** | Tehlikeli pattern tespiti |
| **Bot Tespiti** | User-Agent analizi + honeypot delay |
| **Security Headers** | CSP, HSTS, X-Frame-Options, Referrer-Policy |
| **Input Validation** | Tip kontrolü, uzunluk limiti (2000 karakter) |
| **CORS** | Sadece izin verilen origin'ler |
| **Body Size Limit** | Max 10KB API request |

## 🚀 Kurulum

### 1. Repoyu klonla
```bash
git clone https://github.com/KULLANICI_ADI/secure-chat-app.git
cd secure-chat-app
```

### 2. Bağımlılıkları yükle
```bash
npm install
```

### 3. Yerel geliştirme
```bash
npm run dev
```
http://localhost:3000 adresini aç.

## 📦 GitHub'a Push

```bash
git init
git add .
git commit -m "feat: initial secure chat app"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADI/secure-chat-app.git
git push -u origin main
```

## 🌐 Vercel'e Deploy

### Otomatik (Önerilen)
1. [vercel.com](https://vercel.com) → "New Project"
2. GitHub reposunu bağla
3. Deploy et → Domain'i kopyala ✅

### CLI ile
```bash
npm i -g vercel
vercel --prod
```

## 🔌 C# Entegrasyonu

Vercel domain'ini C# Forms App'e ekle:

```csharp
// Örnek: mesaj gönderme
var client = new HttpClient();
var payload = new { content = "Merhaba!", sender = "C#App", room = "general" };
var json = JsonSerializer.Serialize(payload);
var response = await client.PostAsync(
    "https://YOUR-DOMAIN.vercel.app/api/chat",
    new StringContent(json, Encoding.UTF8, "application/json")
);

// Mesajları getir
var messages = await client.GetStringAsync(
    "https://YOUR-DOMAIN.vercel.app/api/chat?room=general"
);

// Sağlık kontrolü
var health = await client.GetStringAsync(
    "https://YOUR-DOMAIN.vercel.app/api/health"
);
```

## 📡 API Referansı

### GET /api/chat?room=general
Odadaki mesajları getirir.

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "abc123",
      "content": "Merhaba!",
      "sender": "Kullanıcı_1234",
      "senderColor": "#7C3AED",
      "timestamp": 1700000000000,
      "type": "text"
    }
  ]
}
```

### POST /api/chat
Mesaj gönderir.

**Body:**
```json
{
  "content": "Mesaj içeriği",
  "sender": "Kullanıcı adı",
  "senderColor": "#7C3AED",
  "room": "general"
}
```

**Response Headers:**
- `X-RateLimit-Limit: 30`
- `X-RateLimit-Remaining: 29`
- `X-RateLimit-Reset: 1700000060000`

### GET /api/health
Sistem durumu kontrolü.

## 🏗️ Proje Yapısı

```
secure-chat-app/
├── pages/
│   ├── _app.js          # App wrapper + Head meta
│   ├── index.js         # Ana chat sayfası
│   └── api/
│       ├── chat.js      # Chat API (rate limit + güvenlik)
│       └── health.js    # Sağlık kontrolü
├── lib/
│   ├── rateLimit.js     # Sliding window rate limiter
│   ├── security.js      # Sanitizasyon, bot tespiti
│   └── messageStore.js  # In-memory mesaj deposu
├── hooks/
│   └── useChat.js       # React hook (polling + optimistic UI)
├── styles/
│   └── globals.css      # Premium dark tema
├── middleware.js         # Vercel Edge güvenlik katmanı
├── next.config.js        # Security headers + config
└── vercel.json           # Vercel deployment config
```

## ⚙️ Ortam Değişkenleri

`.env.local` dosyası oluştur (Vercel dashboard'dan da eklenebilir):

```env
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## 📈 Production Yükseltmeleri

- **Mesaj kalıcılığı**: Upstash Redis (Vercel Integration)
- **Gerçek zamanlı**: Pusher / Ably / Socket.io
- **Auth**: NextAuth.js
- **Rate Limiting**: Upstash Ratelimit (distributed)
