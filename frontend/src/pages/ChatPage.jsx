import React, { useState, useEffect, useRef } from 'react';
import { Bot, Plus, MessageSquare, Trash2, Menu, X, AlertCircle, VolumeX, RefreshCw } from 'lucide-react';
import { sendChatMessage } from '../services/api';
import MessageItem from '../components/MessageItem';
import ChatInput from '../components/ChatInput';
import LoadingBubble from '../components/LoadingBubble';

/**
 * Automatically detects the language of a string based on unicode ranges.
 * Defaults to 'en-US'.
 */
function detectLanguage(text) {
  if (!text) return 'en-US';
  if (/[\u0c00-\u0c7f]/i.test(text)) {
    return 'te-IN'; // Telugu
  }
  if (/[\u0900-\u097f]/i.test(text)) {
    return 'hi-IN'; // Hindi/Devanagari
  }
  if (/[\u0b80-\u0bff]/i.test(text)) {
    return 'ta-IN'; // Tamil
  }
  return 'en-US'; // Fallback
}

/**
 * ChatPage component coordinates the sidebar history list, active chat pane,
 * connection logic, and suggestions.
 */
export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [spokenLanguage, setSpokenLanguage] = useState('en-US');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Clean up Speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    
    // Stop any currently playing speech
    window.speechSynthesis.cancel();

    if (!text) return;

    const lang = detectLanguage(text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    // Set matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(lang));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (e) => {
      console.error('SpeechSynthesis error:', e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Browser does not support speech recognition.');
      return;
    }

    stopSpeaking();

    // If currently listening, stop
    if (isListening) {
      stopListening();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = spokenLanguage;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && transcript.trim()) {
        // Automatically submit the recognized text
        handleSend(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (event.error === 'no-speech') {
        setError('No speech was detected. Please try again.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Failed to stop speech recognition:', e);
      }
      setIsListening(false);
    }
  };

  const restartListening = () => {
    stopSpeaking();
    stopListening();
    setTimeout(() => {
      startListening();
    }, 150);
  };

  // Load chat sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('voice_assistant_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          // Open the most recent session
          setActiveChatId(parsed[0].id);
          setMessages(parsed[0].messages);
        } else {
          startNewChat(false);
        }
      } catch (e) {
        console.error('Failed to parse saved sessions:', e);
      }
    } else {
      startNewChat(false);
    }
  }, []);

  // Save sessions to localStorage helper
  const saveSessions = (updatedSessions) => {
    setSessions(updatedSessions);
    localStorage.setItem('voice_assistant_sessions', JSON.stringify(updatedSessions));
  };

  // Scroll to bottom whenever messages or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const startNewChat = (shouldResetActive = true) => {
    stopSpeaking();
    stopListening();
    if (shouldResetActive) {
      setActiveChatId(null);
      setMessages([]);
    }
    setError(null);
    setInput('');
    setSidebarOpen(false);
  };

  const selectSession = (id) => {
    stopSpeaking();
    stopListening();
    const session = sessions.find(s => s.id === id);
    if (session) {
      setActiveChatId(id);
      setMessages(session.messages);
      setError(null);
    }
    setSidebarOpen(false);
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    saveSessions(updated);
    
    if (activeChatId === id) {
      if (updated.length > 0) {
        setActiveChatId(updated[0].id);
        setMessages(updated[0].messages);
      } else {
        startNewChat();
      }
    }
  };

  const handleSend = async (textToSend) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || isLoading) return;

    // Stop speaking/listening when sending a new message
    stopSpeaking();
    stopListening();

    setError(null);
    setInput('');
    setIsLoading(true);

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Initialize or update session
    let currentChatId = activeChatId;
    let updatedSessions = [...sessions];

    if (!currentChatId) {
      currentChatId = Date.now().toString();
      setActiveChatId(currentChatId);
      
      const newSession = {
        id: currentChatId,
        title: messageText.length > 25 ? messageText.substring(0, 25) + '...' : messageText,
        messages: newMessages,
        timestamp: new Date().toISOString()
      };
      updatedSessions = [newSession, ...updatedSessions];
    } else {
      updatedSessions = updatedSessions.map(session => {
        if (session.id === currentChatId) {
          return {
            ...session,
            messages: newMessages,
            timestamp: new Date().toISOString()
          };
        }
        return session;
      });
    }
    saveSessions(updatedSessions);

    try {
      // Formats the history for the API to preserve context
      const apiHistory = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const replyText = await sendChatMessage(messageText, apiHistory);

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: replyText,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);

      // Speak response aloud
      speakText(replyText);

      const sessionsWithAi = updatedSessions.map(session => {
        if (session.id === currentChatId) {
          return {
            ...session,
            messages: finalMessages
          };
        }
        return session;
      });
      saveSessions(sessionsWithAi);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the reply.');
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    { title: 'English Prompts', desc: 'Ask about science: "Tell me a short space fact."', text: 'Tell me a short space fact.' },
    { title: 'हिंदी वार्तालाप', desc: 'भारतीय संस्कृति: "भारत के त्योहारों पर कुछ वाक्य लिखो।"', text: 'भारत के त्योहारों पर कुछ वाक्य लिखो।' },
    { title: 'తెలుగు సంభాషణ', desc: 'కథలు: "నాకు ఒక చిన్న నీతి కథ చెప్పండి."', text: 'నాకు ఒక చిన్న నీతి కథ చెప్పండి.' },
    { title: 'Tamil Conversation', desc: 'கவிதை: "தமிழ் மொழியின் சிறப்பைப் பற்றி கூறுங்கள்."', text: 'தமிழ் மொழியின் சிறப்பைப் பற்றி கூறுங்கள்.' }
  ];

  return (
    <div className="app-container">
      {/* Sidebar Panel */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={24} style={{ color: 'var(--accent-cyan)' }} />
            <span>Voice Assistant</span>
          </h2>
          <button className="hamburger" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <X size={20} />
          </button>
        </div>

        <button className="new-chat-btn" onClick={() => startNewChat()}>
          <Plus size={16} />
          <span>New Chat</span>
        </button>

        <div className="sidebar-title">Recent Chats</div>
        
        <nav className="history-list">
          {sessions.map(session => (
            <div 
              key={session.id} 
              className={`history-item ${activeChatId === session.id ? 'active' : ''}`}
              onClick={() => selectSession(session.id)}
            >
              <MessageSquare size={16} style={{ flexShrink: 0 }} />
              <span className="history-item-text">{session.title}</span>
              <button 
                onClick={(e) => deleteSession(e, session.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                aria-label="Delete chat"
              >
                <Trash2 size={14} className="delete-icon" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: '20px' }}>
              No chats yet
            </div>
          )}
        </nav>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <Menu size={24} />
            </button>
            <div className="header-title">
              <h1>AI Assistant</h1>
            </div>
          </div>
          <div className="status-badge">
            <span className="status-dot"></span>
            <span>Online</span>
          </div>
        </header>

        <div className="messages-container">
          {messages.length === 0 ? (
            <section className="welcome-screen">
              <div className="welcome-logo">
                <Bot size={60} />
              </div>
              <h2 className="welcome-title">Namaste! How can I help you today?</h2>
              <p className="welcome-subtitle">
                I am a friendly voice assistant who auto-detects your language. Feel free to speak to me in Hindi, Telugu, Tamil, English, or any other major language!
              </p>
              
              <div className="suggestions-grid">
                {suggestions.map((sug, idx) => (
                  <div 
                    key={idx} 
                    className="suggestion-card"
                    onClick={() => handleSend(sug.text)}
                  >
                    <div className="suggestion-card-title">{sug.title}</div>
                    <div className="suggestion-card-desc">{sug.desc}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <>
              {messages.map(msg => (
                <MessageItem key={msg.id} message={msg} />
              ))}
              {isLoading && <LoadingBubble />}
              
              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px',
                  padding: '16px',
                  margin: '12px 0',
                  color: '#ef4444',
                  fontSize: '0.9rem',
                  maxWidth: '70%',
                  alignSelf: 'center'
                }}>
                  <AlertCircle size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Configuration / Server Error:</strong> {error}
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', maxWidth: '800px', margin: '0 auto 8px auto' }}>
            <div className="voice-lang-select-container">
              <span className="voice-lang-label">Speech Input Language:</span>
              <select 
                value={spokenLanguage} 
                onChange={(e) => setSpokenLanguage(e.target.value)}
                className="voice-lang-select"
                title="Choose language you speak"
              >
                <option value="en-US">English</option>
                <option value="te-IN">తెలుగు (Telugu)</option>
                <option value="hi-IN">हिन्दी (Hindi)</option>
                <option value="ta-IN">தமிழ் (Tamil)</option>
              </select>
            </div>
            
            {(isListening || isSpeaking) && (
              <div className="voice-actions">
                {isSpeaking && (
                  <button onClick={stopSpeaking} className="voice-btn stop" title="Stop Speaking">
                    <VolumeX size={12} />
                    <span>Stop Speaking</span>
                  </button>
                )}
                <button onClick={restartListening} className="voice-btn" title="Restart Listening">
                  <RefreshCw size={12} />
                  <span>Restart Listening</span>
                </button>
              </div>
            )}
          </div>

          <ChatInput 
            value={input} 
            onChange={setInput} 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
            isLoading={isLoading} 
            isListening={isListening}
            onMicClick={startListening}
          />
        </div>
      </main>
    </div>
  );
}
