import React from 'react';

/**
 * A sleek glassmorphic loading bubble displaying a bouncing three-dots typing animation.
 */
export default function LoadingBubble() {
  return (
    <div className="message-row ai">
      <div className="loading-bubble" aria-label="AI is thinking">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>
    </div>
  );
}
