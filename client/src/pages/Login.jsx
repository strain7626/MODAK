import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}${endpoint}`, { nickname, password });
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1 className="logo">🔥 모닥</h1>
        <p className="tagline">친구들과 모닥불 주변에 모여요</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="닉네임"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit">{isRegister ? '회원가입' : '로그인'}</button>
        </form>
        <button className="toggle-btn" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? '이미 계정이 있어요' : '처음이에요'}
        </button>
      </div>
    </div>
  );
}
