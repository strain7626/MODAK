import { useEffect, useRef } from 'react';
import './CampfireScene.css';

const POSITIONS = [
  { bottom: '18%', left: '50%', transform: 'translateX(-50%)' },
  { bottom: '30%', left: '20%' },
  { bottom: '30%', right: '20%' },
  { top: '25%', left: '30%' },
  { top: '25%', right: '30%' },
  { top: '15%', left: '50%', transform: 'translateX(-50%)' },
];

export default function CampfireScene({ presence, messages }) {
  return (
    <div className="campfire-scene">
      <div className="campfire">
        <div className="fire">
          <div className="flame flame1" />
          <div className="flame flame2" />
          <div className="flame flame3" />
        </div>
        <div className="ember" />
      </div>

      {presence.map((person, i) => (
        <div
          key={person.userId}
          className="person"
          style={POSITIONS[i % POSITIONS.length]}
        >
          <div className="avatar-circle">{person.nickname[0].toUpperCase()}</div>
          <div className="person-name">{person.nickname}</div>
          {messages
            .filter(m => m.sender?._id === person.userId || m.senderId === person.userId)
            .slice(-1)
            .map(m => (
              <MessageBubble key={m._id || m.tempId} content={m.content} />
            ))}
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ content }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add('bubble-enter');
    const t = setTimeout(() => el.classList.add('bubble-fade'), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div ref={ref} className="bubble">
      {content}
    </div>
  );
}
