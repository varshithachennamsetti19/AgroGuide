import React from 'react';
import { User, Bot } from 'lucide-react';

/**
 * MessageItem component renders a single chat bubble.
 * Aligns user messages to the right and assistant messages to the left
 * with themed icons and timestamps.
 */
export default function MessageItem({ message }) {
  const isUser = message.role === 'user';
  const timestamp = message.timestamp ? new Date(message.timestamp) : new Date();
  
  const timeString = timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`message-row ${isUser ? 'user' : 'ai'}`}>
      <div className="message-bubble">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          {!isUser && (
            <div style={{
              background: 'hsla(190, 90%, 50%, 0.1)',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              flexShrink: 0
            }}>
              <Bot size={16} />
            </div>
          )}
          
          <div style={{ flex: 1, paddingTop: !isUser ? '3px' : '0', wordBreak: 'break-word' }}>
            {message.text}
          </div>

          {isUser && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0
            }}>
              <User size={16} />
            </div>
          )}
        </div>
        
        <div className="message-info">
          <span>{timeString}</span>
        </div>
      </div>
    </div>
  );
}
