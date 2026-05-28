import { useEffect, useRef, useState } from 'react';
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
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [room, setRoom] = useState(null);

  const socketRef = useRef(null);
  const historyEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    fetchHistory();
    connectSocket();
    return () => socketRef.current?.disconnect();
  }, [roomId]);

  const fetchHistory = async () => {
    const { data } = await axios.get(`http://localhost:5000/api/rooms/${roomId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setMessages(data);
  };

  const connectSocket = async () => {
    const { io } = await import('socket.io-client');
    const socket = io('http://localhost:5000', { auth: { token } });
    socketRef.current = socket;

    socket.emit('join_room', roomId);

    socket.on('presence_update', (users) => setPresence(users));

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      setLiveMessages(prev => {
        const next = [...prev, { ...msg, tempId: Date.now() }];
        setTimeout(() => {
          setLiveMessages(p => p.filter(m => m.tempId !== next[next.length - 1].tempId));
        }, 4000);
        return next;
      });
    });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit('send_message', { roomId, content: input });
    setInput('');
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setIsLiveMode(atBottom);
  };

  const copyInviteLink = () => {
    if (room?.inviteCode) {
      navigator.clipboard.writeText(room.inviteCode);
      alert('초대 코드가 복사되었습니다!');
    }
  };

  useEffect(() => {
    const fetchRoom = async () => {
      const rooms = await axios.get('http://localhost:5000/api/rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoom(rooms.data.find(r => r._id === roomId));
    };
    fetchRoom();
  }, [roomId]);

  useEffect(() => {
    if (!isLiveMode && historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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

      <div
        className="chat-scroll"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {/* 히스토리 영역 */}
        <div className="history-section">
          {messages.map((msg, i) => (
            <div key={msg._id || i} className={`msg-row ${msg.sender?._id === user?.id ? 'mine' : ''}`}>
              <span className="msg-nick">{msg.sender?.nickname}</span>
              <div className="msg-bubble">{msg.content}</div>
            </div>
          ))}
          <div ref={historyEndRef} />
        </div>

        {/* 모닥불 실시간 영역 */}
        <div className="campfire-section">
          <CampfireScene presence={presence} messages={liveMessages} />
        </div>
      </div>

      <form className="chat-input" onSubmit={sendMessage}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="메시지를 입력하세요..."
        />
        <button type="submit">전송</button>
      </form>
    </div>
  );
}
