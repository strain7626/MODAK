import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import CampfireScene from '../components/CampfireScene';
import './ChatRoom.css';

export default function ChatRoom() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem('modak_token');

  const [messages, setMessages] = useState([]);
  const [liveMessages, setLiveMessages] = useState([]);
  const [presence, setPresence] = useState([]);
  const [input, setInput] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [room, setRoom] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [joinNotifs, setJoinNotifs] = useState([]);

  const socketRef = useRef(null);
  const panelRef = useRef(null);
  const mainAreaRef = useRef(null);
  const inputRef = useRef(null);
  const isPanelOpenRef = useRef(false);
  const panelReadyToClose = useRef(false);
  const initialScrollDone = useRef(false);
  const liveMessagesRef = useRef([]);
  const liveTimersRef = useRef({});    // { senderId: bufferId }
  const removeTimersRef = useRef({});  // { senderId: [timerId, ...] }

  useEffect(() => {
    let cancelled = false;
    fetchHistory();
    const connect = async () => {
      const { io } = await import('socket.io-client');
      if (cancelled) return;
      const socket = io(import.meta.env.VITE_API_URL, { auth: { token } });
      socketRef.current = socket;
      socket.emit('join_room', roomId);
      socket.on('presence_update', (users) => setPresence(users));
      socket.on('user_joined', ({ nickname }) => {
        const id = Date.now() + Math.random();
        setJoinNotifs(prev => [...prev, { id, nickname, fading: false }]);
        setTimeout(() => {
          setJoinNotifs(prev => prev.map(n => n.id === id ? { ...n, fading: true } : n));
        }, 2500);
        setTimeout(() => {
          setJoinNotifs(prev => prev.filter(n => n.id !== id));
        }, 3000);
      });
      socket.on('user_typing', ({ userId, isTyping }) => {
        setTypingUsers(prev => {
          const next = new Set(prev);
          if (isTyping) next.add(userId);
          else next.delete(userId);
          return next;
        });
      });
      socket.on('new_message', (msg) => {
        setMessages(prev => [...prev, msg]);
        const tempId = Date.now();
        const senderId = msg.sender?._id || msg.senderId;

        // 이 유저의 타이머만 리셋
        clearTimeout(liveTimersRef.current[senderId]);
        (removeTimersRef.current[senderId] || []).forEach(t => clearTimeout(t));
        removeTimersRef.current[senderId] = [];

        const senderMsgs = liveMessagesRef.current.filter(
          m => (m.sender?._id || m.senderId) === senderId
        );
        const oldestTempId = senderMsgs.length >= 3 ? senderMsgs[0].tempId : null;

        if (oldestTempId) {
          const t = setTimeout(() => {
            setLiveMessages(p => p.filter(m => m.tempId !== oldestTempId));
          }, 250);
          removeTimersRef.current[senderId].push(t);
        }

        setLiveMessages(prev => {
          const unfaded = prev.map(m => ({ ...m, fading: false }));
          const marked = oldestTempId
            ? unfaded.map(m => m.tempId === oldestTempId ? { ...m, fading: true } : m)
            : unfaded;
          return [...marked, { ...msg, tempId, fading: false }];
        });

        liveTimersRef.current[senderId] = setTimeout(
          () => startRemovingRef.current(senderId),
          2500
        );
      });
    };
    connect();
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
      initialScrollDone.current = false;
      Object.values(liveTimersRef.current).forEach(t => clearTimeout(t));
      Object.values(removeTimersRef.current).forEach(ts => ts.forEach(t => clearTimeout(t)));
    };
  }, [roomId]);

  useEffect(() => {
    liveMessagesRef.current = liveMessages;
  }, [liveMessages]);

  const startRemovingRef = useRef(null);
  startRemovingRef.current = (senderId) => {
    const msgs = liveMessagesRef.current.filter(
      m => (m.sender?._id || m.senderId) === senderId
    );
    if (!removeTimersRef.current[senderId]) removeTimersRef.current[senderId] = [];
    msgs.forEach((msg, i) => {
      const t1 = setTimeout(() => {
        setLiveMessages(p =>
          p.map(m => m.tempId === msg.tempId ? { ...m, fading: true } : m)
        );
      }, i * 350);
      const t2 = setTimeout(() => {
        setLiveMessages(p => p.filter(m => m.tempId !== msg.tempId));
      }, i * 350 + 250);
      removeTimersRef.current[senderId].push(t1, t2);
    });
  };

  const fetchHistory = async () => {
    const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/rooms/${roomId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setMessages(data);
  };

  const closePanel = useCallback(() => {
    isPanelOpenRef.current = false;
    panelReadyToClose.current = false;
    setIsPanelOpen(false);
  }, []);

  const openPanel = useCallback(() => {
    isPanelOpenRef.current = true;
    panelReadyToClose.current = false;
    setIsPanelOpen(true);
    // 자동으로 최신 메시지(맨 아래)로 이동 후 닫기 허용
    setTimeout(() => {
      if (panelRef.current) {
        panelRef.current.scrollTop = panelRef.current.scrollHeight;
      }
      requestAnimationFrame(() => {
        panelReadyToClose.current = true;
      });
    }, 60);
  }, []);

  // 라이브 모드에서 스크롤/스와이프 위 → 패널 열기
  useEffect(() => {
    const el = mainAreaRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!isPanelOpenRef.current && e.deltaY < 0) openPanel();
    };
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => el.removeEventListener('wheel', onWheel);
  }, [openPanel]);

  useEffect(() => {
    const el = mainAreaRef.current;
    if (!el) return;
    let startY = 0;
    const onTouchStart = (e) => { startY = e.touches[0].clientY; };
    const onTouchEnd = (e) => {
      const dy = e.changedTouches[0].clientY - startY;
      if (!isPanelOpenRef.current && dy < -40) openPanel();
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [openPanel]);

  // 패널에서 스크롤 다운 (맨 아래에서 더 내리면) → 패널 닫기
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!isPanelOpenRef.current || !panelReadyToClose.current) return;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      if (e.deltaY > 0 && atBottom) closePanel();
    };
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => el.removeEventListener('wheel', onWheel);
  }, [closePanel]);

  // 패널에서 스와이프 다운 (맨 아래에서) → 패널 닫기
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    let startY = 0;
    const onTouchStart = (e) => { startY = e.touches[0].clientY; };
    const onTouchEnd = (e) => {
      if (!isPanelOpenRef.current || !panelReadyToClose.current) return;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 40 && atBottom) closePanel();
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [closePanel]);

  // 패널 내부 스크롤로 맨 아래 도달해도 닫기
  const handlePanelScroll = () => {
    const el = panelRef.current;
    if (!el || !panelReadyToClose.current) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 2;
    if (atBottom) closePanel();
  };

  // 패널 열려있고 맨 아래 근처면 새 메시지 따라 스크롤
  useEffect(() => {
    if (!initialScrollDone.current) {
      initialScrollDone.current = true;
      return;
    }
    if (isPanelOpenRef.current && panelRef.current) {
      const el = panelRef.current;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (atBottom) {
        // 자동 스크롤 동안 닫기 차단
        panelReadyToClose.current = false;
        el.scrollTop = el.scrollHeight;
        requestAnimationFrame(() => {
          panelReadyToClose.current = true;
        });
      }
    }
  }, [messages]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Enter' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    socketRef.current?.emit('typing', { roomId, isTyping: e.target.value.trim() !== '' });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit('send_message', { roomId, content: input });
    socketRef.current.emit('typing', { roomId, isTyping: false });
    setInput('');
  };

  const copyInviteLink = () => {
    if (room?.inviteCode) {
      navigator.clipboard.writeText(room.inviteCode);
      alert('초대 코드가 복사되었습니다!');
    }
  };

  useEffect(() => {
    const fetchRoom = async () => {
      const rooms = await axios.get(`${import.meta.env.VITE_API_URL}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoom(rooms.data.find(r => r._id === roomId));
    };
    fetchRoom();
  }, [roomId]);

  return (
    <div className="chatroom">
      <header className="chatroom-header">
        <button onClick={() => navigate('/')}>← 뒤로</button>
        <h2>{room?.name || '채팅방'}</h2>
        <div className="header-actions">
          <span className="presence-count">🔥 {presence.length}명 접속 중</span>
          <button onClick={copyInviteLink}>초대 코드 복사</button>
        </div>
      </header>

      <div className="main-area" ref={mainAreaRef}>
        <div className={`campfire-bg ${isPanelOpen ? 'dimmed' : ''}`}>
          <div className="join-notif-area">
            {joinNotifs.map(n => (
              <div key={n.id} className={`join-notif ${n.fading ? 'fading' : ''}`}>
                {n.nickname}님이 들어왔습니다
              </div>
            ))}
          </div>
          <CampfireScene
          presence={presence}
          messages={liveMessages}
          typingUsers={(() => {
            const s = new Set(typingUsers);
            if (input.trim()) s.add(user?.id);
            return s;
          })()}
        />
        </div>

        <div
          className={`history-panel ${isPanelOpen ? 'open' : ''}`}
          ref={panelRef}
          onScroll={handlePanelScroll}
        >
          {messages.length === 0 ? (
            <div className="empty-history">
              <span>🔥</span>
              <p>아직 나눈 대화가 없어요</p>
              <p>모닥불 주위에 모여 이야기를 시작해보세요</p>
            </div>
          ) : (
            <>
              <div className="history-spacer" />
              {messages.map((msg, i) => (
                <div key={msg._id || i} className={`msg-row ${msg.sender?._id === user?.id ? 'mine' : ''}`}>
                  <span className="msg-nick">{msg.sender?.nickname}</span>
                  <div className="msg-bubble">{msg.content}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {!isPanelOpen && <div className="scroll-hint">↑ 이전 대화 보기</div>}
      </div>

      <form className="chat-input" onSubmit={sendMessage}>
        <input
          value={input}
          onChange={handleInputChange}
          ref={inputRef}
          placeholder="메시지를 입력하세요..."
        />
        <button type="submit">전송</button>
      </form>
    </div>
  );
}
