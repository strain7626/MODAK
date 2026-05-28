import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem('modak_token');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    const { data } = await axios.get('http://localhost:5000/api/rooms', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setRooms(data);
  };

  const createRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    await axios.post('http://localhost:5000/api/rooms', { name: newRoomName }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setNewRoomName('');
    fetchRooms();
  };

  const joinByCode = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      await axios.post(`http://localhost:5000/api/rooms/join/${inviteCode}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInviteCode('');
      fetchRooms();
    } catch {
      alert('유효하지 않은 초대 코드입니다.');
    }
  };

  return (
    <div className="home-page">
      <header>
        <h1>🔥 모닥</h1>
        <span>{user?.nickname}</span>
        <button onClick={logout}>로그아웃</button>
      </header>

      <div className="home-content">
        <section className="room-list">
          <h2>채팅방</h2>
          {rooms.map(room => (
            <div key={room._id} className="room-item" onClick={() => navigate(`/room/${room._id}`)}>
              <span className="room-name">{room.name}</span>
              <span className="room-members">{room.members.length}명</span>
            </div>
          ))}
        </section>

        <section className="room-actions">
          <form onSubmit={createRoom}>
            <h3>새 채팅방 만들기</h3>
            <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="방 이름" />
            <button type="submit">만들기</button>
          </form>

          <form onSubmit={joinByCode}>
            <h3>초대 코드로 입장</h3>
            <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="초대 코드 입력" />
            <button type="submit">입장</button>
          </form>
        </section>
      </div>
    </div>
  );
}
