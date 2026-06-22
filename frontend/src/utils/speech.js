/**
 * Speech utilities for AgroGuide Voice Assistant.
 * Relies entirely on browser-native Web Speech APIs.
 */

// 1. Speech Recognition (Speech-to-Text)
export class SpeechRecognitionService {
  constructor(options = {}) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.supported = !!SpeechRecognition;
    this.recognition = this.supported ? new SpeechRecognition() : null;
    
    this.options = {
      continuous: false,
      interimResults: false,
      lang: 'en-US',
      ...options
    };

    if (this.recognition) {
      this.recognition.continuous = this.options.continuous;
      this.recognition.interimResults = this.options.interimResults;
      this.recognition.lang = this.options.lang;
    }

    this.timeoutId = null;
    this.timeoutDuration = options.timeoutDuration || 10000; // 10 seconds timeout
  }

  isSupported() {
    return this.supported;
  }

  setLanguage(lang) {
    if (this.recognition) {
      this.recognition.lang = lang;
      this.options.lang = lang;
    }
  }

  start({ onStart, onResult, onError, onEnd }) {
    if (!this.supported) {
      if (onError) onError('unsupported-browser');
      return;
    }

    // Reset timeout if any
    this.clearTimeout();

    this.recognition.onstart = () => {
      // Set a timeout to safeguard in case of recognition silence
      this.startTimeout(onError);
      if (onStart) onStart();
    };

    this.recognition.onresult = (event) => {
      this.clearTimeout();
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      if (onResult) onResult(transcript);
    };

    this.recognition.onerror = (event) => {
      this.clearTimeout();
      let errorType = event.error;

      // Map browser errors to human-friendly types if needed
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        errorType = 'permission-denied';
      } else if (event.error === 'no-speech') {
        errorType = 'no-speech';
      }

      if (onError) onError(errorType);
    };

    this.recognition.onend = () => {
      this.clearTimeout();
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
    } catch (err) {
      if (onError) onError(err.message || 'start-failed');
    }
  }

  stop() {
    this.clearTimeout();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Silently catch if already stopped
      }
    }
  }

  startTimeout(onError) {
    this.timeoutId = setTimeout(() => {
      this.stop();
      if (onError) onError('timeout');
    }, this.timeoutDuration);
  }

  clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

// 2. Speech Synthesis (Text-to-Speech)
export class TextToSpeechService {
  constructor() {
    this.supported = 'speechSynthesis' in window;
    this.rate = 1.0;
    this.pitch = 1.0;
  }

  isSupported() {
    return this.supported;
  }

  setRate(rate) {
    this.rate = rate;
  }

  setPitch(pitch) {
    this.pitch = pitch;
  }

  detectLanguage(text) {
    if (!text) return 'en-US';
    
    // Rules:
    // Telugu Range: \u0c00-\u0c7f
    if (/[\u0c00-\u0c7f]/i.test(text)) {
      return 'te-IN';
    }
    // Hindi Range: \u0900-\u097f
    if (/[\u0900-\u097f]/i.test(text)) {
      return 'hi-IN';
    }
    // Fallback:
    return 'en-US';
  }

  speak(text, { onStart, onEnd, onError, rate, pitch } = {}) {
    if (!this.supported) {
      if (onError) onError('unsupported-browser');
      return;
    }

    // Cancel current speech before starting new speech
    window.speechSynthesis.cancel();

    if (!text) return;

    // Detect language from text
    const lang = this.detectLanguage(text);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate ?? this.rate;
    utterance.pitch = pitch ?? this.pitch;

    // Find a voice matching the detected language
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => v.lang.startsWith(lang) || v.lang.includes(lang.replace('-', '_')));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    };

    setVoice();
    // Chrome sometimes loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.error('SpeechSynthesis error:', e);
      if (onError) onError(e);
    };

    window.speechSynthesis.speak(utterance);
  }

  cancel() {
    if (this.supported) {
      window.speechSynthesis.cancel();
    }
  }
}
