import React, { useState, useEffect, useRef } from 'react';
import { Bot, Plus, MessageSquare, Trash2, Menu, X, AlertCircle, VolumeX, RefreshCw, LogOut, ChevronLeft, Trash, MapPin } from 'lucide-react';
import { sendChatMessage, getChatHistory, deleteChat, clearChatHistory, getDashboardStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MessageItem from '../components/MessageItem';
import ChatInput from '../components/ChatInput';
import LoadingBubble from '../components/LoadingBubble';
import { SpeechRecognitionService, TextToSpeechService } from '../utils/speech';
import ProfileWizard from './ProfileWizard';
import FarmerDashboard from './FarmerDashboard';
import NotificationCenter from '../components/NotificationCenter';
import AdminDashboard from './AdminDashboard';
import DiseaseDetection from './DiseaseDetection';
import DiseaseHistory from './DiseaseHistory';


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

const getBrowserLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.warn("Geolocation permission error or denied:", error);
        resolve(null);
      },
      { timeout: 5000 }
    );
  });
};

export default function ChatPage() {
  const { user, logout, updateLocation } = useAuth();

  const [messages, setMessages] = useState([]);
  const [dbChats, setDbChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Tab & personalization states
  const [activeTab, setActiveTab] = useState('chat');
  const [dashboardData, setDashboardData] = useState(null);
  const [isProfileCompleted, setIsProfileCompleted] = useState(user?.isProfileCompleted || false);

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Initialize with user's preferred language from auth context
  const [spokenLanguage, setSpokenLanguage] = useState(user?.preferredLanguage || 'en-US');
  // Mode selection state: 'hybrid' (text + voice) or 'voice' (voice only)
  const [assistantMode, setAssistantMode] = useState(() => {
    return localStorage.getItem('agroguide_assistant_mode') || 'hybrid';
  });

  const messagesEndRef = useRef(null);
  const recognitionServiceRef = useRef(null);
  const ttsServiceRef = useRef(null);

  // Sync mode changes to localStorage
  useEffect(() => {
    localStorage.setItem('agroguide_assistant_mode', assistantMode);
  }, [assistantMode]);

  // Load chat history from backend on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Initialize Speech Services on mount
  useEffect(() => {
    recognitionServiceRef.current = new SpeechRecognitionService({ lang: spokenLanguage });
    ttsServiceRef.current = new TextToSpeechService();

    return () => {
      if (ttsServiceRef.current) {
        ttsServiceRef.current.cancel();
      }
      if (recognitionServiceRef.current) {
        recognitionServiceRef.current.stop();
      }
    };
  }, []);

  // Update spoken language if user preference changes
  useEffect(() => {
    if (user?.preferredLanguage) {
      setSpokenLanguage(user.preferredLanguage);
    }
  }, [user]);

  // Sync spoken language changes to recognition service
  useEffect(() => {
    if (recognitionServiceRef.current) {
      recognitionServiceRef.current.setLanguage(spokenLanguage);
    }
  }, [spokenLanguage]);

  useEffect(() => {
    if (user) {
      setIsProfileCompleted(user.isProfileCompleted);
      setSpokenLanguage(user.preferredLanguage || 'en-US');
    }
  }, [user]);

  const loadDashboard = async () => {
    try {
      const res = await getDashboardStatus();
      if (res.success) {
        setDashboardData(res);
      }
    } catch (err) {
      console.error('Dashboard status fetch failed:', err);
    }
  };

  useEffect(() => {
    if (isProfileCompleted) {
      loadDashboard();
    }
  }, [isProfileCompleted]);

  const handleDiseaseSearch = (symptoms) => {
    setActiveTab('chat');
    handleSend(symptoms);
  };

  const handlePromptClick = (promptText) => {
    setActiveTab('chat');
    handleSend(promptText);
  };

  const handleEditLocation = async () => {
    const newCity = window.prompt("Enter your preferred city name for weather updates:", user?.preferredCity || user?.district || "");
    if (newCity !== null && newCity.trim() !== "") {
      try {
        setIsLoading(true);
        const res = await updateLocation({ preferredCity: newCity.trim() });
        if (res.success) {
          alert("Location preference updated successfully!");
          loadDashboard();
        } else {
          setError(res.error || "Failed to update location preference.");
        }
      } catch (err) {
        setError(err.message || "Failed to update location preference.");
      } finally {
        setIsLoading(false);
      }
    }
  };

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
          timestamp: chat.createdAt,
          weatherData: chat.weatherData,
          sources: chat.sources
        });
      });
      setMessages(loadedMessages);
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setError(err.message || 'Could not load chat history from server.');
    }
  };

  const stopSpeaking = () => {
    if (ttsServiceRef.current) {
      ttsServiceRef.current.cancel();
    }
    setIsSpeaking(false);
  };

  const speakText = (text) => {
    if (!ttsServiceRef.current) return;
    setIsSpeaking(true);
    ttsServiceRef.current.speak(text, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: (e) => {
        setIsSpeaking(false);
        if (e.error === 'language-unavailable') {
          setError('Voice output is unavailable because no matching TTS voice pack is installed on your operating system.');
        } else {
          setError(`Voice output failed: ${e.error || 'Unknown voice synthesis error'}. Please check your system settings.`);
        }
      }
    });
  };

  const startListening = () => {
    if (!recognitionServiceRef.current) return;

    stopSpeaking();

    if (isListening) {
      stopListening();
      return;
    }

    setError(null);
    let finalSpeechText = '';

    recognitionServiceRef.current.start({
      onStart: () => {
        setIsListening(true);
      },
      onResult: (transcript) => {
        finalSpeechText = transcript;
        setInput(transcript);
      },
      onError: (errorType) => {
        setIsListening(false);
        if (errorType === 'permission-denied') {
          setError('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (errorType === 'no-speech') {
          setError('No speech was detected. Please try again.');
        } else if (errorType === 'timeout') {
          setError('Speech recognition timed out. Please try speaking again.');
        } else if (errorType === 'unsupported-browser') {
          setError('Your browser does not support Speech Recognition. Please try using Google Chrome.');
        } else {
          setError(`Speech recognition error: ${errorType}`);
        }
      },
      onEnd: () => {
        setIsListening(false);
        if (finalSpeechText && finalSpeechText.trim()) {
          handleSend(finalSpeechText);
        }
      }
    });
  };

  const stopListening = () => {
    if (recognitionServiceRef.current) {
      recognitionServiceRef.current.stop();
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

    stopSpeaking();
    stopListening();

    setError(null);
    setInput('');
    setIsLoading(true);

    setSelectedChatId(null);

    const userMsgId = `temp-${Date.now()}`;
    const modelMsgId = `temp-model-${Date.now()}`;

    // Add user message and streaming placeholder in state
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        text: messageText,
        timestamp: new Date().toISOString()
      },
      {
        id: modelMsgId,
        role: 'model',
        text: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      }
    ]);

    try {
      const apiHistory = messages
        .filter(m => !m.id.startsWith('temp-'))
        .slice(-8)
        .map(m => ({
          role: m.role,
          text: m.text
        }));

      const isWeatherMsg = (text) => {
        const msg = text.toLowerCase();
        return (
          msg.includes('weather') || msg.includes('rain') || msg.includes('forecast') ||
          msg.includes('temperature') || msg.includes('humidity') || msg.includes('wind') ||
          msg.includes('climate') || msg.includes('storm') || msg.includes('temp') ||
          msg.includes('వాతావరణం') || msg.includes('వర్షం') || msg.includes('मौसम') || msg.includes('बारिश')
        );
      };

      let lat = null;
      let lon = null;
      if (isWeatherMsg(messageText)) {
        try {
          const coords = await getBrowserLocation();
          if (coords) {
            lat = coords.latitude;
            lon = coords.longitude;
          }
        } catch (err) {
          console.warn("Failed to retrieve location:", err);
        }
      }

      // Invoke Streaming endpoint with SSE (Part 5)
      const response = await fetch('http://localhost:5000/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: messageText,
          history: apiHistory,
          latitude: lat,
          longitude: lon
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Server returned status code: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumResponse = '';
      let sources = [];
      let weatherData = null;
      let realChatObj = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              
              if (parsed.error) {
                accumResponse = parsed.error;
              } else if (parsed.replace) {
                accumResponse = parsed.text; // Replace with validation safe text
              } else if (parsed.text) {
                accumResponse += parsed.text;
              }
              if (parsed.sources) {
                sources = parsed.sources;
              }
              if (parsed.weatherData) {
                weatherData = parsed.weatherData;
              }
              if (parsed.chat) {
                realChatObj = parsed.chat;
              }

              // Update stream incrementally in React state
              setMessages(prev => prev.map(m =>
                m.id === modelMsgId ? { ...m, text: accumResponse, sources, weatherData } : m
              ));
            } catch (err) {
              // Ignore partial chunks
            }
          }
        }
      }

      // Cleanup and sync real ID once streaming concludes
      if (realChatObj) {
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== userMsgId && m.id !== modelMsgId);
          return [
            ...filtered,
            {
              id: `${realChatObj._id}-q`,
              dbId: realChatObj._id,
              role: 'user',
              text: realChatObj.question,
              timestamp: realChatObj.createdAt
            },
            {
              id: `${realChatObj._id}-a`,
              dbId: realChatObj._id,
              role: 'model',
              text: realChatObj.answer,
              timestamp: realChatObj.createdAt,
              weatherData,
              sources
            }
          ];
        });

        setDbChats(prev => [realChatObj, ...prev]);

        // Speak final synthesized voice
        speakText(realChatObj.answer);
      } else {
        // Fallback: Remove streaming flag
        setMessages(prev => prev.map(m =>
          m.id === modelMsgId ? { ...m, isStreaming: false } : m
        ));
      }

    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the reply.');
      setMessages(prev => prev.filter(m => m.id !== userMsgId && m.id !== modelMsgId));
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
    { title: '🌾 Crop Advisory', desc: 'Get tips for Rice, Cotton, Tomato cultivation...', text: 'Rice cultivation tips' },
    { title: '🏛 Government Schemes', desc: 'Find details about PM Kisan, Fasal Bima...', text: 'Tell me about PM Kisan' },
    { title: '🌦 Live Weather', desc: 'Get real-time weather info & farming advice...', text: "What is today's weather?" },
    { title: '📞 Emergency Help', desc: 'Contact crop protection emergency services...', text: 'How can I contact crop protection emergency help?' }
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
              <div 
                style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} 
                onClick={handleEditLocation} 
                title="Change preferred city"
              >
                <MapPin size={12} />
                <span style={{ textDecoration: 'underline' }}>{user?.preferredCity || 'Set Location'}</span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isProfileCompleted && (
              <div className="mode-toggle-group" style={{ marginRight: '8px' }}>
                <button 
                  onClick={() => setActiveTab('chat')} 
                  className={`mode-toggle-btn ${activeTab === 'chat' ? 'active' : ''}`}
                  title="AI Voice Assistant Chat"
                >
                  💬 Assistant
                </button>
                <button 
                  onClick={() => { setActiveTab('dashboard'); loadDashboard(); }} 
                  className={`mode-toggle-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                  title="Farmer Dashboard Feed"
                >
                  📊 Dashboard
                </button>
                <button 
                  onClick={() => setActiveTab('diagnose')} 
                  className={`mode-toggle-btn ${activeTab === 'diagnose' ? 'active' : ''}`}
                  title="Crop Disease Diagnostics"
                >
                  🩺 Diagnose
                </button>
                <button 
                  onClick={() => setActiveTab('diagnose-history')} 
                  className={`mode-toggle-btn ${activeTab === 'diagnose-history' ? 'active' : ''}`}
                  title="Diagnostics Archives"
                >
                  🗂 Archive
                </button>
                <button 
                  onClick={() => setActiveTab('admin')} 
                  className={`mode-toggle-btn ${activeTab === 'admin' ? 'active' : ''}`}
                  title="Admin Telemetry Panel"
                >
                  🛰 Admin
                </button>
              </div>
            )}
            <div className="mode-toggle-group">
              <button 
                onClick={() => setAssistantMode('hybrid')} 
                className={`mode-toggle-btn ${assistantMode === 'hybrid' ? 'active' : ''}`}
                title="Text + Speech Mode"
              >
                Text + Speech
              </button>
              <button 
                onClick={() => setAssistantMode('voice')} 
                className={`mode-toggle-btn ${assistantMode === 'voice' ? 'active' : ''}`}
                title="Voice Only Mode"
              >
                Voice Only
              </button>
            </div>
            <NotificationCenter />
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

        {!isProfileCompleted ? (
          <ProfileWizard 
            onComplete={() => { setIsProfileCompleted(true); loadDashboard(); }} 
            updateLocation={updateLocation} 
          />
        ) : activeTab === 'dashboard' ? (
          <FarmerDashboard 
            data={dashboardData} 
            onRefresh={loadDashboard} 
            onDiseaseSearch={handleDiseaseSearch} 
            onPromptClick={handlePromptClick} 
          />
        ) : activeTab === 'diagnose' ? (
          <DiseaseDetection />
        ) : activeTab === 'diagnose-history' ? (
          <DiseaseHistory />
        ) : activeTab === 'admin' ? (
          <AdminDashboard />
        ) : assistantMode === 'voice' ? (
          <section className="voice-only-screen">
            <div className="voice-only-avatar-container">
              <div 
                className={`voice-only-avatar ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
                onClick={isListening ? stopListening : startListening}
                style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
              >
                <Bot size={70} />
              </div>
            </div>
            <h2 className="voice-only-title">
              {isListening ? "Listening..." : isSpeaking ? "Speaking Response..." : "Tap Bot & Ask AgroGuide"}
            </h2>
            <p className="voice-only-subtitle">
              {isListening 
                ? "Speak now. AgroGuide will automatically send when you finish speaking." 
                : isSpeaking 
                  ? "Listen to the response out loud." 
                  : `Your assistant is ready. Switch language below or tap the bot to speak in ${getLanguageLabel(spokenLanguage)}.`}
            </p>
            
            {(isListening || isSpeaking) && (
              <div className="voice-controls-bar" style={{ width: '100%', maxWidth: '380px', margin: '0 auto 12px auto' }}>
                <div className="voice-status-group">
                  {isListening && (
                    <div className="voice-status-indicator listening">
                      <div className="voice-wave">
                        <div className="voice-wave-bar"></div>
                        <div className="voice-wave-bar"></div>
                        <div className="voice-wave-bar"></div>
                        <div className="voice-wave-bar"></div>
                      </div>
                      <span>Listening...</span>
                    </div>
                  )}
                  {isSpeaking && (
                    <div className="voice-status-indicator speaking">
                      <div className="voice-wave">
                        <div className="voice-wave-bar"></div>
                        <div className="voice-wave-bar"></div>
                        <div className="voice-wave-bar"></div>
                        <div className="voice-wave-bar"></div>
                      </div>
                      <span>Speaking...</span>
                    </div>
                  )}
                </div>
                <div className="voice-actions">
                  {isSpeaking && (
                    <button onClick={stopSpeaking} className="voice-btn stop" title="Stop Speaking">
                      <VolumeX size={12} />
                    </button>
                  )}
                  <button onClick={restartListening} className="voice-btn" title="Restart Listening">
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>
            )}

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
                margin: '12px auto',
                color: '#ef4444',
                fontSize: '0.9rem',
                maxWidth: '400px'
              }}>
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <div style={{ textAlign: 'left' }}>
                  <strong>System Error:</strong> {error}
                </div>
              </div>
            )}
          </section>
        ) : (
          <div className="messages-container">
            {displayMessages.length === 0 ? (
              <section className="welcome-screen">
                <div className="welcome-logo">
                  <Bot size={60} />
                </div>
                <h2 className="welcome-title">Namaste, {user?.fullName || user?.name}! How can I assist you today?</h2>
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
        )}

        {isProfileCompleted && activeTab === 'chat' && (
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
            </div>

            {assistantMode === 'hybrid' && (
              <>
                {(isListening || isSpeaking) && (
                  <div className="voice-controls-bar">
                    <div className="voice-status-group">
                      {isListening && (
                        <div className="voice-status-indicator listening">
                          <div className="voice-wave">
                            <div className="voice-wave-bar"></div>
                            <div className="voice-wave-bar"></div>
                            <div className="voice-wave-bar"></div>
                            <div className="voice-wave-bar"></div>
                          </div>
                          <span>Listening...</span>
                        </div>
                      )}
                      {isSpeaking && (
                        <div className="voice-status-indicator speaking">
                          <div className="voice-wave">
                            <div className="voice-wave-bar"></div>
                            <div className="voice-wave-bar"></div>
                            <div className="voice-wave-bar"></div>
                            <div className="voice-wave-bar"></div>
                          </div>
                          <span>Speaking response...</span>
                        </div>
                      )}
                    </div>
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
                  </div>
                )}

                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  isLoading={isLoading}
                  isListening={isListening}
                  onMicClick={startListening}
                  onCameraClick={() => alert("Crop photo upload for AI disease detection will be available in the next phase! For now, please type or speak your crop symptoms.")}
                />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
