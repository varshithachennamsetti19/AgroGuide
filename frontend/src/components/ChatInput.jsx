import React, { useRef, useEffect } from 'react';
import { SendHorizontal, Mic, Camera } from 'lucide-react';

/**
 * Chat input component containing an auto-expanding textarea,
 * submit logic (Enter key), and a styled submit button.
 */
export default function ChatInput({ value, onChange, onSubmit, isLoading, isListening, onMicClick, onCameraClick }) {
  const textareaRef = useRef(null);

  // Auto-resize the textarea based on height of content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e) => {
    // Submit on Enter, insert newline on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit(e);
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="input-form">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message (e.g., Hello, తెలుగులో మాట్లాడు, हिंदी में बात करो)..."
        className="chat-input"
        disabled={isLoading}
      />
      <button
        type="button"
        onClick={onCameraClick}
        className="mic-button"
        disabled={isLoading}
        title="Upload crop photo for disease assistant"
        aria-label="Upload crop photo"
        style={{ marginRight: '6px' }}
      >
        <Camera size={18} />
      </button>
      <button
        type="button"
        onClick={onMicClick}
        className={`mic-button ${isListening ? 'listening' : ''}`}
        disabled={isLoading}
        aria-label={isListening ? "Stop listening" : "Start listening"}
        title={isListening ? "Listening..." : "Start listening"}
      >
        <Mic size={18} />
      </button>
      <button
        type="submit"
        disabled={!value.trim() || isLoading}
        className="send-button"
        aria-label="Send message"
      >
        <SendHorizontal size={18} />
      </button>
    </form>
  );
}

