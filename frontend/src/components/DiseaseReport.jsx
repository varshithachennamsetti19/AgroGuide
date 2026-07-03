import React, { useEffect, useState } from 'react';
import { Shield, CloudAlert, Award, Volume2, VolumeX, Leaf, ShieldAlert } from 'lucide-react';

export default function DiseaseReport({ analysis, explanation, weatherWarning, insuranceScheme, imageUrl }) {
  const [speaking, setSpeaking] = useState(false);

  const getSeverityColor = (sev) => {
    const s = (sev || '').toLowerCase();
    if (s === 'high') return { bg: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', text: '#ef4444' };
    if (s === 'medium') return { bg: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', text: '#f59e0b' };
    if (s === 'low') return { bg: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', text: '#3b82f6' };
    return { bg: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', text: '#10b981' }; // Healthy
  };

  const getUtteranceText = () => {
    const summary = `${analysis.crop} diagnosed with ${analysis.disease}. Severity level is ${analysis.severity}.`;
    const warning = weatherWarning ? `Weather Advisory: ${weatherWarning}` : '';
    const briefExpl = explanation.split('.').slice(0, 3).join('.') + '.';
    return `${summary} ${warning} Details: ${briefExpl}`;
  };

  const speakReport = () => {
    window.speechSynthesis.cancel();
    if (speaking) {
      setSpeaking(false);
      return;
    }

    const text = getUtteranceText();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Auto-detect voice language based on text characters
    if (/[\u0c00-\u0c7f]/.test(explanation)) {
      utterance.lang = 'te-IN';
    } else if (/[\u0900-\u097f]/.test(explanation)) {
      utterance.lang = 'hi-IN';
    } else if (/[\u0b80-\u0bff]/.test(explanation)) {
      utterance.lang = 'ta-IN';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Auto-speak on diagnosis report load (Part 8)
  useEffect(() => {
    speakReport();
    return () => window.speechSynthesis.cancel();
  }, [explanation]);

  const severityStyle = getSeverityColor(analysis.severity);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Top Card Summary */}
      <div className="weather-card" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Leaf crop sample"
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '1px solid var(--border-light)'
            }}
          />
        )}
        
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span className="weather-city-name" style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {analysis.crop} Crop Analysis
              </span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Confidence Match: <strong>{analysis.confidence}%</strong>
              </div>
            </div>
            <button
              onClick={speakReport}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-light)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: speaking ? 'var(--accent-cyan)' : '#fff',
                cursor: 'pointer'
              }}
              title={speaking ? "Stop Speech" : "Listen Diagnosis"}
            >
              {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.75rem',
              padding: '4px 10px',
              borderRadius: '20px',
              fontWeight: 'bold',
              background: severityStyle.bg,
              border: severityStyle.border,
              color: severityStyle.text
            }}>
              {analysis.healthy ? 'HEALTHY PLANT' : `${analysis.severity.toUpperCase()} SEVERITY`}
            </span>
            <span style={{
              fontSize: '0.75rem',
              padding: '4px 10px',
              borderRadius: '20px',
              fontWeight: 'bold',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              color: 'var(--accent-cyan)'
            }}>
              {analysis.disease}
            </span>
          </div>
        </div>
      </div>

      {/* Weather Warning Advisory (Part 6) */}
      {weatherWarning && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#f59e0b'
        }}>
          <CloudAlert size={20} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
            <strong>Weather-Aware Advisory:</strong> {weatherWarning}
          </div>
        </div>
      )}

      {/* Government Insurance Scheme Advice (Part 7) */}
      {insuranceScheme && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#10b981'
        }}>
          <Award size={20} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
            <strong>Government Relief Scheme:</strong> {insuranceScheme}
          </div>
        </div>
      )}

      {/* Main Report Details */}
      <div className="weather-card">
        <h3 style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)', marginBottom: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Leaf size={16} />
          <span>Diagnostic Treatment Plan</span>
        </h3>
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-main)',
          lineHeight: '1.6',
          whiteSpace: 'pre-line',
          margin: 0
        }}>
          {explanation}
        </p>
      </div>
    </div>
  );
}
