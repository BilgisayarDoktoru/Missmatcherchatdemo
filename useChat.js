import { useState, useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL = 2000; // 2 saniyede bir yeni mesaj kontrol et
const SENDER_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#DC2626',
  '#D97706', '#7C3AED', '#DB2777', '#0891B2',
];

function getRandomColor() {
  return SENDER_COLORS[Math.floor(Math.random() * SENDER_COLORS.length)];
}

function generateLocalId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function useChat(roomId = 'general') {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sender] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chat_username') || `Kullanıcı_${Math.floor(Math.random() * 9999)}`;
    }
    return 'Kullanıcı';
  });
  const [senderColor] = useState(getRandomColor);

  const pollRef = useRef(null);
  const lastTimestampRef = useRef(0);

  // Mesajları sunucudan çek
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?room=${roomId}`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
        setIsConnected(true);
        setError(null);

        if (data.messages.length > 0) {
          lastTimestampRef.current = data.messages[data.messages.length - 1].timestamp;
        }
      }
    } catch (err) {
      setIsConnected(false);
      setError('Sunucuya bağlanılamıyor...');
    }
  }, [roomId]);

  // Polling başlat
  useEffect(() => {
    fetchMessages(); // İlk yükleme

    pollRef.current = setInterval(fetchMessages, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  // Mesaj gönder
  const sendMessage = useCallback(async (content) => {
    if (!content?.trim()) return false;

    setIsLoading(true);
    setError(null);

    // Optimistic update - hemen ekle
    const optimisticId = generateLocalId();
    const optimisticMessage = {
      id: optimisticId,
      content: content.trim(),
      sender,
      senderColor,
      timestamp: Date.now(),
      type: 'text',
      pending: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          sender,
          senderColor,
          room: roomId,
        }),
      });

      if (res.status === 429) {
        setError('Çok hızlı mesaj gönderiyorsunuz. Lütfen bekleyin.');
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        return false;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Optimistic mesajı kaldır, sunucudan gelen ile değiştir
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      await fetchMessages();
      return true;
    } catch (err) {
      setError('Mesaj gönderilemedi. Tekrar deneyin.');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [sender, senderColor, roomId, fetchMessages]);

  return {
    messages,
    sendMessage,
    isConnected,
    isLoading,
    error,
    sender,
    senderColor,
    roomId,
  };
}
