import React, { useState, useEffect } from 'react';
import { getAdminMetrics, triggerCronOverride } from '../services/api';
import { RefreshCw, Play, ShieldAlert, Cpu, Database, Users, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [triggering, setTriggering] = useState(false);

  const fetchStats = async () => {
    setError(null);
    try {
      const data = await getAdminMetrics();
      setMetrics(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch admin metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Poll stats every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerJobs = async () => {
    setTriggering(true);
    try {
      await triggerCronOverride();
      alert('Alert dispatch and mandi price cron jobs executed successfully.');
      fetchStats();
    } catch (err) {
      alert('Failed to trigger cron override: ' + err.message);
    } finally {
      setTriggering(false);
    }
  };

  if (loading && !metrics) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <RefreshCw className="spinner" size={24} style={{ marginBottom: '12px' }} />
        <span>Loading Admin Telemetry Panel...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-scroll-container" style={{ padding: '20px', overflowY: 'auto', height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>
            🛰 AgroGuide System Telemetry
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Live performance monitoring, database caches, and firewall security auditing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleTriggerJobs}
            disabled={triggering}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
            }}
          >
            <Play size={14} />
            <span>{triggering ? 'Running...' : 'Run Schedulers Now'}</span>
          </button>
          <button
            onClick={fetchStats}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '8px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      {metrics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            
            {/* Cache Hit Rate */}
            <div className="weather-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>REDIS CACHE HIT RATIO</span>
                <Database size={18} style={{ color: 'var(--accent-cyan)' }} />
              </div>
              <div style={{ margin: '12px 0' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>
                  {metrics.cacheHitRatio}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Hits: {metrics.cacheHits} | Misses: {metrics.cacheMisses}
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', color: metrics.isRedisConnected ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                ● {metrics.isRedisConnected ? 'Redis Active' : 'In-Memory Fallback Active'}
              </div>
            </div>

            {/* AI Latency */}
            <div className="weather-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>AVG AI RESPONSE TIME</span>
                <Cpu size={18} style={{ color: 'hsl(280, 80%, 70%)' }} />
              </div>
              <div style={{ margin: '12px 0' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>
                  {metrics.avgResponseTimeMs || 0} ms
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Aggregated from all Gemini sessions
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Target: &lt;1500ms
              </div>
            </div>

            {/* Queue statistics */}
            <div className="weather-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>BULLMQ QUEUE JOBS</span>
                <TrendingUp size={18} style={{ color: '#10b981' }} />
              </div>
              <div style={{ margin: '12px 0' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>
                  {metrics.queueProcessedJobs}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Active: {metrics.queueActiveJobs} | Failed: {metrics.queueFailedJobs}
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold' }}>
                ● Queue Workers Active
              </div>
            </div>

            {/* Total Users */}
            <div className="weather-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL PLATFORM USERS</span>
                <Users size={18} style={{ color: 'hsl(45, 90%, 55%)' }} />
              </div>
              <div style={{ margin: '12px 0' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>
                  {metrics.totalUsers}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Completed Profiles: {metrics.completedProfiles}
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Growth: Stable
              </div>
            </div>

          </div>

          {/* Detailed Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Most Asked Crops */}
            <div className="weather-card">
              <h3 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🌾</span> Most Searched Crops
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {metrics.cropStats.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', fontSize: '0.8rem' }}>
                    <span style={{ color: '#fff', fontWeight: '500' }}>{item.crop}</span>
                    <span style={{ color: 'var(--accent-cyan)' }}>{item.count} queries</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Asked Schemes */}
            <div className="weather-card">
              <h3 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏛</span> Most Searched Schemes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {metrics.schemeStats.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', fontSize: '0.8rem' }}>
                    <span style={{ color: '#fff', fontWeight: '500' }}>{item.scheme}</span>
                    <span style={{ color: 'var(--accent-cyan)' }}>{item.count} queries</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Phase 9 Diagnostic Audits */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            {/* Common Diagnosed Diseases */}
            <div className="weather-card">
              <h3 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🩺</span> Top Diagnosed Diseases
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {metrics.commonDiseases && metrics.commonDiseases.length > 0 ? (
                  metrics.commonDiseases.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', fontSize: '0.8rem' }}>
                      <span style={{ color: '#fff', fontWeight: '500' }}>{item.disease}</span>
                      <span style={{ color: 'var(--accent-cyan)' }}>{item.count} cases</span>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No disease records logged.</span>
                )}
              </div>
            </div>

            {/* Crops Diagnosed */}
            <div className="weather-card">
              <h3 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🌱</span> Top Crops Scanned
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {metrics.topCropsDiagnosed && metrics.topCropsDiagnosed.length > 0 ? (
                  metrics.topCropsDiagnosed.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', fontSize: '0.8rem' }}>
                      <span style={{ color: '#fff', fontWeight: '500' }}>{item.crop}</span>
                      <span style={{ color: 'var(--accent-cyan)' }}>{item.count} scans</span>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No crop scans logged.</span>
                )}
              </div>
            </div>

          </div>

          {/* Firewall Audits */}
          <div className="weather-card">
            <h3 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} style={{ color: '#ef4444' }} />
              <span>Security Audits — Blocked Firewall Attempts</span>
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px' }}>Blocked Query</th>
                    <th style={{ padding: '8px' }}>Detected Category</th>
                    <th style={{ padding: '8px' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.blockedQueriesList.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No prompt injection or out-of-scope queries blocked today.
                      </td>
                    </tr>
                  ) : (
                    metrics.blockedQueriesList.map((log, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px', color: '#ef4444' }}>"{log.query}"</td>
                        <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{log.intent}</td>
                        <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
