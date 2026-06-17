import React, { useState, useEffect, useRef } from 'react';
import { Bot, Plus, MessageSquare, Trash2, Menu, X, AlertCircle, VolumeX, RefreshCw, LogOut, ChevronLeft, Trash } from 'lucide-react';
import { sendChatMessage, getChatHistory, deleteChat, clearChatHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
 * Maps language code to a readable label.
 */
function getLanguageLabel(code) {
  const mapping = {
    'en-US': 'English',
    'te-IN': 'Telugu',
    'hi-IN': 'Hindi',
    'ta-IN': 'Tamil',
    'kn-IN': 'Kannada',
    'ml-IN': 'Malayalam',
    'mr-IN': 'Marathi'
  };
  return mapping[code] || code;
}

export default function ChatPage() {
  const { user, logout } = useAuth();

  const [messages, setMessages] = useState([]);
  const [dbChats, setDbChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Initialize with user's preferred language from auth context
  const [spokenLanguage, setSpokenLanguage] = useState(user?.preferredLanguage || 'en-US');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const shouldSendOnEndRef = useRef(true);
  const audioRef = useRef(null);

  // Load chat history from backend on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Update spoken language if user preference changes
  useEffect(() => {
    if (user?.preferredLanguage) {
      setSpokenLanguage(user.preferredLanguage);
    }
  }, [user]);

  // Clean up Speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) { }
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const loadHistory = async () => {
    setError(null);
    try {
      const chats = await getChatHistory();
      setDbChats(chats);
      
      const loadedMessages = [];
      chats.forEach(chat => {
        loadedMessages.push({
          id: `${chat._id}-q`,
          dbId: chat._id,
          role: 'user',
          text: chat.question,
          timestamp: chat.createdAt
        });
        loadedMessages.push({
          id: `${chat._id}-a`,
          dbId: chat._id,
          role: 'model',
          text: chat.answer,
          timestamp: chat.createdAt
        });
      });
      setMessages(loadedMessages);
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setError(err.message || 'Could not load chat history from server.');
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speakText = (text) => {
    stopSpeaking();
    if (!text) return;

    const lang = detectLanguage(text);
    const langCode = lang.split('-')[0];

    try {
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(text)}`;
      const audio = new Audio(ttsUrl);

      audio.onplay = () => {
        setIsSpeaking(true);
      };

      audio.onended = () => {
        setIsSpeaking(false);
      };

      audio.onerror = (e) => {
        console.error('Cloud TTS playing failed, falling back to local SpeechSynthesis:', e);
        fallbackSpeakText(text, lang);
      };

      audioRef.current = audio;
      audio.play().catch(err => {
        console.error('Audio play failed, falling back to local SpeechSynthesis:', err);
        fallbackSpeakText(text, lang);
      });
    } catch (err) {
      console.error('Failed to initialize Audio, falling back to local SpeechSynthesis:', err);
      fallbackSpeakText(text, lang);
    }
  };

  const fallbackSpeakText = (text, lang) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

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
      console.error('Fallback SpeechSynthesis error:', e);
      setIsSpeaking(false);
      if (e.error === 'language-unavailable') {
        setError('Voice output is unavailable because no matching TTS voice pack is installed on your operating system.');
      } else {
        setError(`Voice output failed: ${e.error || 'Unknown voice synthesis error'}. Please check your system settings.`);
      }
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

    if (isListening) {
      stopListening();
      return;
    }

    transcriptRef.current = '';
    shouldSendOnEndRef.current = true;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = spokenLanguage;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      transcriptRef.current = fullTranscript.trim();
      setInput(fullTranscript.trim());
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

      if (shouldSendOnEndRef.current) {
        const finalSpeech = transcriptRef.current;
        if (finalSpeech && finalSpeech.trim()) {
          handleSend(finalSpeech);
        }
      }
      transcriptRef.current = '';
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

  // Scroll to bottom whenever messages or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, selectedChatId]);

  const startNewChat = () => {
    stopSpeaking();
    stopListening();
    setSelectedChatId(null);
    setError(null);
    setInput('');
    setSidebarOpen(false);
  };

  const selectChatRecord = (id) => {
    stopSpeaking();
    stopListening();
    setSelectedChatId(id);
    setError(null);
    setSidebarOpen(false);
  };

  const deleteChatRecord = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Delete this conversation record?")) {
      try {
        await deleteChat(id);
        setDbChats(prev => prev.filter(c => c._id !== id));
        setMessages(prev => prev.filter(m => m.dbId !== id));
        
        if (selectedChatId === id) {
          setSelectedChatId(null);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to delete chat record from server');
      }
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to delete your ENTIRE chat history from the server? This cannot be undone.")) {
      try {
        await clearChatHistory();
        setDbChats([]);
        setMessages([]);
        setSelectedChatId(null);
      } catch (err) {
        console.error(err);
        setError('Failed to clear chat history');
      }
    }
  };

  const handleSend = async (textToSend) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || isLoading) return;

    shouldSendOnEndRef.current = false;
    stopSpeaking();
    stopListening();

    setError(null);
    setInput('');
    setIsLoading(true);

    // If we were viewing a single isolated record, reset back to full conversation flow
    setSelectedChatId(null);

    // Temp message state (optimistic update, gets replaced by saved chat from database)
    const userMsgId = `temp-${Date.now()}`;
    const userMessage = {
      id: userMsgId,
      role: 'user',
      text: messageText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Build history payload for Gemini context preservation
      // We only include the last 8 messages to keep token payload reasonable
      const apiHistory = messages
        .filter(m => !m.id.startsWith('temp-'))
        .slice(-8)
        .map(m => ({
          role: m.role,
          text: m.text
        }));

      const result = await sendChatMessage(messageText, apiHistory);

      if (result.success && result.chat) {
        const savedChat = result.chat;

        // Replace the temporary user message and append model message using real MongoDB ID
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== userMsgId);
          return [
            ...filtered,
            {
              id: `${savedChat._id}-q`,
              dbId: savedChat._id,
              role: 'user',
              text: savedChat.question,
              timestamp: savedChat.createdAt
            },
            {
              id: `${savedChat._id}-a`,
              dbId: savedChat._id,
              role: 'model',
              text: savedChat.answer,
              timestamp: savedChat.createdAt
            }
          ];
        });

        // Add to sidebar chats
        setDbChats(prev => [savedChat, ...prev]);

        // Speak the reply
        speakText(savedChat.answer);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the reply.');
      // Remove the optimistic user message if call failed
      setMessages(prev => prev.filter(m => m.id !== userMsgId));
    } finally {
      setIsLoading(false);
    }
  };

  // Log out action
  const handleLogoutClick = async () => {
    stopSpeaking();
    stopListening();
    await logout();
  };

  const suggestions = [
    { title: 'Crop Protection', desc: 'Ask about pests: "How to treat cotton leaf spots?"', text: 'How to treat cotton leaf spots?' },
    { title: 'Telugu Assistance', desc: 'వ్యవసాయం: "వరి పంటను ఆశించే తెగుళ్లు ఏమిటి?"', text: 'వరి పంటను ఆశించే తెగుళ్లు ఏమిటి?' },
    { title: 'Hindi Assistance', desc: 'फसल चक्र: "गेहूं के साथ कौन सी फसलें उगाएं?"', text: 'गेहूं के साथ कौन सी फसलें उगाएं?' },
    { title: 'Tamil Assistance', desc: 'உரம்: "நெல் பயிருக்கு இயற்கை உரம் தயாரிப்பது எப்படி?"', text: 'நெல் பயிருக்கு இயற்கை உரம் தயாரிப்பது எப்படி?' }
  ];

  // Helper to get active messages to display
  const getDisplayMessages = () => {
    if (selectedChatId) {
      const activeChat = dbChats.find(c => c._id === selectedChatId);
      if (activeChat) {
        return [
          { id: `${activeChat._id}-q`, role: 'user', text: activeChat.question, timestamp: activeChat.createdAt },
          { id: `${activeChat._id}-a`, role: 'model', text: activeChat.answer, timestamp: activeChat.createdAt }
        ];
      }
    }
    return messages;
  };

  const displayMessages = getDisplayMessages();

  return (
    <div className="app-container">
      {/* Sidebar Panel */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={24} style={{ color: 'var(--accent-cyan)' }} />
            <span>AgroGuide AI</span>
          </h2>
          <button className="hamburger" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <X size={20} />
          </button>
        </div>

        <button className="new-chat-btn" onClick={startNewChat}>
          <Plus size={16} />
          <span>New Chat</span>
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span className="sidebar-title" style={{ margin: 0 }}>Recent Chats</span>
          {dbChats.length > 0 && (
            <button 
              onClick={handleClearHistory} 
              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '500' }}
              title="Clear all history"
            >
              <Trash size={12} />
              <span>Clear</span>
            </button>
          )}
        </div>

        <nav className="history-list">
          {dbChats.map(chat => (
            <div
              key={chat._id}
              className={`history-item ${selectedChatId === chat._id ? 'active' : ''}`}
              onClick={() => selectChatRecord(chat._id)}
            >
              <MessageSquare size={16} style={{ flexShrink: 0 }} />
              <span className="history-item-text" title={chat.question}>{chat.question}</span>
              <button
                onClick={(e) => deleteChatRecord(e, chat._id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                aria-label="Delete chat"
                title="Delete this chat"
              >
                <Trash2 size={14} className="delete-icon" />
              </button>
            </div>
          ))}
          {dbChats.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: '20px' }}>
              No chat history yet
            </div>
          )}
        </nav>

        {/* User Profile Footer Card */}
        <div style={{
          borderTop: '1px solid var(--border-light)',
          paddingTop: '16px',
          marginTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{
            background: 'hsla(220, 20%, 14%, 0.5)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#fff',
              fontSize: '0.85rem'
            }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'F'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>

          <button 
            onClick={handleLogoutClick}
            className="voice-btn stop"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '10px',
              borderRadius: '8px'
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <Menu size={24} />
            </button>
            <div className="header-title">
              <h1>{selectedChatId ? 'Conversation Details' : 'AgroGuide Farmer Assistant'}</h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Language: <strong style={{ color: 'var(--accent-cyan)' }}>{getLanguageLabel(spokenLanguage)}</strong>
            </div>
            <div className="status-badge">
              <span className="status-dot"></span>
              <span>Online</span>
            </div>
          </div>
        </header>

        {selectedChatId && (
          <div style={{
            padding: '12px 24px',
            backgroundColor: 'hsla(190, 90%, 50%, 0.05)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <button 
              onClick={startNewChat}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.85rem'
              }}
            >
              <ChevronLeft size={16} />
              <span>Back to active chat thread</span>
            </button>
          </div>
        )}

        <div className="messages-container">
          {displayMessages.length === 0 ? (
            <section className="welcome-screen">
              <div className="welcome-logo">
                <Bot size={60} />
              </div>
              <h2 className="welcome-title">Namaste, {user?.name}! How can I assist you today?</h2>
              <p className="welcome-subtitle">
                I am your AI farming assistant. Ask me questions about crops, pests, fertilizers, crop rotations, or weather. You can speak to me in Telugu, Hindi, Tamil, or English!
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
              {displayMessages.map(msg => (
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
                    <strong>System Error:</strong> {error}
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
