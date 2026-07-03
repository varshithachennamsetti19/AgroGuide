import React, { useState, useEffect } from 'react';
import { getVisionHistory } from '../services/api';
import { Leaf, Calendar, MapPin, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function DiseaseHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const fetchHistory = async () => {
    setError(null);
    try {
      const list = await getVisionHistory();
      setHistory(list);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch diagnostics history archive.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getSeverityStyle = (sev) => {
    const s = (sev || '').toLowerCase();
    if (s === 'high') return { borderLeft: '4px solid #ef4444', color: '#ef4444' };
    if (s === 'medium') return { borderLeft: '4px solid #f59e0b', color: '#f59e0b' };
    if (s === 'low') return { borderLeft: '4px solid #3b82f6', color: '#3b82f6' };
    return { borderLeft: '4px solid #10b981', color: '#10b981' }; // Healthy
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <RefreshCw className="spinner" size={24} style={{ marginBottom: '12px' }} />
        <span>Loading diagnostics history...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-scroll-container" style={{ padding: '20px', overflowY: 'auto', height: 'calc(100vh - 120px)' }}>
      {/* Title */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>
            🗂 Diagnostics Archives
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Historical timeline of crop leaf scans, disease classifications, and weather records.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '8px',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      {history.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          border: '1px dashed var(--border-light)',
          borderRadius: '12px'
        }}>
          No leaf scans registered. Go to the "Diagnose" tab to run your first crop disease diagnosis!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {history.map((record) => {
            const isExpanded = selectedId === record._id;
            const itemStyle = getSeverityStyle(record.severity);
            const isHealthy = record.disease.toLowerCase().includes('healthy');

            return (
              <div
                key={record._id}
                onClick={() => setSelectedId(isExpanded ? null : record._id)}
                className="weather-card"
                style={{
                  cursor: 'pointer',
                  padding: '16px',
                  transition: 'all 0.2s',
                  ...itemStyle
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h4 style={{ color: '#fff', margin: 0, fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{record.crop}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>• {record.disease}</span>
                    </h4>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} />
                        <span>{record.location || 'India'}</span>
                      </span>
                      <span>Confidence: <strong>{record.confidence}%</strong></span>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: isHealthy ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: isHealthy ? '#10b981' : '#ef4444',
                    border: `1px solid ${isHealthy ? '#10b981' : '#ef4444'}`
                  }}>
                    {isHealthy ? 'HEALTHY' : record.severity.toUpperCase()}
                  </span>
                </div>

                {/* Expanded treatment view */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()} // Prevent collapse on details click
                    style={{
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px dashed var(--border-light)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      cursor: 'default'
                    }}
                  >
                    {/* Image Preview */}
                    {record.imagePath && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span>📷 Image logged on server:</span>
                        <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent-cyan)' }}>
                          {record.imagePath.split(/[\\/]/).pop()}
                        </code>
                      </div>
                    )}

                    {/* Weather snapshot */}
                    {record.weather && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.8rem' }}>
                        <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>🌦 Weather Snapshot at Diagnosis</div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Condition: <strong>{record.weather.weatherCondition}</strong> | Temp: <strong>{record.weather.temperature}°C</strong> | Humidity: <strong>{record.weather.humidity}%</strong> | Wind: <strong>{record.weather.windSpeed} m/s</strong>
                        </div>
                      </div>
                    )}

                    {/* Treatments grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div style={{ fontSize: '0.8rem' }}>
                        <strong style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '4px' }}>🌱 Organic Treatment</strong>
                        <span style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>{record.treatment.organic}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem' }}>
                        <strong style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '4px' }}>🧪 Chemical Control Formulation</strong>
                        <span style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>{record.treatment.chemical}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem' }}>
                        <strong style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '4px' }}>🛡 Preventive Precautions</strong>
                        <span style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>{record.treatment.precautions || record.treatment.preventive}</span>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
