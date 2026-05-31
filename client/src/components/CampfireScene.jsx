import { useEffect, useRef, useState } from 'react';
import './CampfireScene.css';

const POSITIONS = [
  { bottom: '6%', left: '16%' },
  { bottom: '6%', right: '16%' },
  { bottom: '28%', left: '4%' },
  { bottom: '28%', right: '4%' },
  { top: '18%', left: '18%' },
  { top: '18%', right: '18%' },
];

export default function CampfireScene({ presence, messages, typingUsers }) {
  return (
    <div className="campfire-scene">
      <div className="campfire">
        <div className="fire">
          <div className="flame flame1" />
          <div className="flame flame2" />
          <div className="flame flame3" />
        </div>
        <div className="ember" />
        <div className="logs">
          <div className="log log1" />
          <div className="log log2" />
          <div className="log log3" />
        </div>
      </div>

      {presence.map((person, i) => {
        const personMsgs = messages.filter(
          m => m.sender?._id === person.userId || m.senderId === person.userId
        );
        return (
          <div
            key={person.userId}
            className="person"
            style={POSITIONS[i % POSITIONS.length]}
          >
            <div className="avatar-circle">{person.nickname[0].toUpperCase()}</div>
            <div className="person-name">{person.nickname}</div>
            <div className="bubble-stack">
              {personMsgs.map(m => (
                <BubbleWrapper key={m._id || m.tempId}>
                  <MessageBubble content={m.content} fading={m.fading} />
                </BubbleWrapper>
              ))}
              {typingUsers?.has(person.userId) && (
                <BubbleWrapper key="thinking">
                  <ThinkingBubble />
                </BubbleWrapper>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BubbleWrapper({ children }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setExpanded(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className={`bubble-entry-wrapper ${expanded ? 'expanded' : ''}`}>
      {children}
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="thinking-container">
      <div className="thinking-bubble">
        <span className="thinking-dot" />
        <span className="thinking-dot" />
        <span className="thinking-dot" />
      </div>
      <div className="thinking-trail">
        <span className="trail-dot" />
        <span className="trail-dot" />
      </div>
    </div>
  );
}

function MessageBubble({ content, fading }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => el.classList.add('bubble-enter'));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (fading) {
      el.classList.remove('bubble-enter');
      el.classList.add('bubble-fade');
    } else {
      el.classList.remove('bubble-fade');
      el.classList.add('bubble-enter');
    }
  }, [fading]);

  return (
    <div ref={ref} className="bubble">
      {content}
    </div>
  );
}
