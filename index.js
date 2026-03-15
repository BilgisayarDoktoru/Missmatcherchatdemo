import { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '../hooks/useChat';

// Basit SVG ikonlar (dış kütüphane gereksiz)
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const HashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

// Zamanı biçimlendir
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Baş harfi al
function getInitial(name) {
  return (name || '?')[0].toUpperCase();
}

// Odalar
const ROOMS = [
  { id: 'general', label: 'genel' },
  { id: 'tech', label: 'teknoloji' },
  { id: 'random', label: 'rastgele' },
];

export default function ChatPage() {
  const [activeRoom, setActiveRoom] = useState('general');
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const MAX_CHARS = 500;

  const { messages, sendMessage, isConnected, isLoading, error, sender, senderColor } =
    useChat(activeRoom);

  // En alt mesaja kaydır
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Textarea auto-resize
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [inputValue]);

  // Mesaj gönder
  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || trimmed.length > MAX_CHARS) return;

    setInputValue('');
    await sendMessage(trimmed);
  }, [inputValue, sendMessage]);

  // Enter ile gönder
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const charRatio = inputValue.length / MAX_CHARS;
  const charClass = charRatio > 0.9 ? 'danger' : charRatio > 0.7 ? 'warn' : '';

  return (
    <div className="chat-wrapper">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-mark">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">SecureChat</span>
          </span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Odalar</div>
          {ROOMS.map((room) => (
            <div
              key={room.id}
              className={`room-item ${activeRoom === room.id ? 'active' : ''}`}
              onClick={() => setActiveRoom(room.id)}
            >
              <span className="room-hash">#</span>
              {room.label}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div
              className="user-avatar"
              style={{ background: senderColor }}
            >
              {getInitial(sender)}
            </div>
            <div className="user-info">
              <div className="user-name">{sender}</div>
              <div className="user-status">
                <span className="status-dot" />
                {isConnected ? 'Çevrimiçi' : 'Bağlanıyor...'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Ana Alan ── */}
      <main className="chat-main">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <HashIcon />
            <span className="header-room-name">
              {ROOMS.find((r) => r.id === activeRoom)?.label || activeRoom}
            </span>
            <div className="header-badges">
              <span className="badge badge-secure">
                <ShieldIcon /> Güvenli
              </span>
              <span className="badge badge-live">● Canlı</span>
            </div>
          </div>
          <div className="connection-status">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isConnected ? 'var(--success)' : 'var(--warning)',
                display: 'inline-block',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            {isConnected ? 'Bağlandı' : 'Bağlanıyor...'}
          </div>
        </div>

        {/* Mesajlar */}
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="messages-empty">
              <div className="empty-icon">💬</div>
              <div className="empty-title">Henüz mesaj yok</div>
              <div className="empty-sub">İlk mesajı siz gönderin!</div>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender === sender;
              return (
                <div key={msg.id} className="message-group">
                  <div className={`message-bubble ${isOwn ? 'own' : ''}`}>
                    <div
                      className="msg-avatar"
                      style={{ background: msg.senderColor || '#7C3AED' }}
                    >
                      {getInitial(msg.sender)}
                    </div>
                    <div className="msg-body">
                      <div className="msg-meta">
                        <span
                          className="msg-sender"
                          style={{ color: msg.senderColor || 'var(--text-primary)' }}
                        >
                          {isOwn ? 'Sen' : msg.sender}
                        </span>
                        <span className="msg-time">{formatTime(msg.timestamp)}</span>
                      </div>
                      <span
                        className={`msg-text ${msg.pending ? 'pending' : ''}`}
                        // İçerik sanitize edilmiş olarak API'den geliyor
                        // Ancak HTML entity'leri decode etmek için dangerouslySetInnerHTML KULLANMIYORUZ
                        // Düz metin olarak gösteriyoruz
                      >
                        {/* HTML entity'leri decode ederek göster ama execute etme */}
                        {decodeHTMLEntities(msg.content)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        {/* Input Alanı */}
        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder={`#${ROOMS.find((r) => r.id === activeRoom)?.label} kanalına yaz...`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_CHARS}
              rows={1}
              disabled={isLoading}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading || inputValue.length > MAX_CHARS}
              title="Gönder (Enter)"
            >
              <SendIcon />
            </button>
          </div>
          <div className="input-footer">
            <span className="input-hint">Enter → gönder · Shift+Enter → yeni satır</span>
            <span className={`char-count ${charClass}`}>
              {inputValue.length}/{MAX_CHARS}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

// HTML entity'leri güvenli şekilde decode et (XSS riski yok çünkü innerText kullanır)
function decodeHTMLEntities(text) {
  if (typeof window === 'undefined') return text;
  const ta = document.createElement('textarea');
  ta.innerHTML = text;
  return ta.value;
}
