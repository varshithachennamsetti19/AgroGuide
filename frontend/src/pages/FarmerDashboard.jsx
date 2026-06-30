import React, { useState } from 'react';
import { Sun, Cloud, CloudRain, Droplets, Wind, Compass, Eye, Calendar, Sprout, ShieldAlert, Award, Search, RefreshCw, Layers } from 'lucide-react';

export default function FarmerDashboard({ data, onRefresh, onDiseaseSearch }) {
  const [diseaseInput, setDiseaseInput] = useState('');

  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <RefreshCw className="spinner" style={{ marginRight: '8px' }} />
        <span>Loading farm dashboard...</span>
      </div>
    );
  }

  const { weather, profile, cropCalendar, schemeReminder, personalizedRecommendation, upcomingRainAlert } = data;

  const handleDiseaseSubmit = (e) => {
    e.preventDefault();
    if (diseaseInput.trim()) {
      onDiseaseSearch(diseaseInput);
      setDiseaseInput('');
    }
  };

  // Helper to resolve condition icons
  const getWeatherIcon = (condition, size = 32) => {
    const cond = (condition || '').toLowerCase();
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('storm')) {
      return <CloudRain size={size} style={{ color: 'hsl(200, 80%, 65%)' }} />;
    }
    if (cond.includes('cloud') || cond.includes('mist') || cond.includes('haze')) {
      return <Cloud size={size} style={{ color: 'hsl(215, 20%, 75%)' }} />;
    }
    return <Sun size={size} style={{ color: 'hsl(45, 90%, 55%)' }} />;
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="dashboard-scroll-container" style={{ padding: '20px', overflowY: 'auto', height: 'calc(100vh - 120px)' }}>
      {/* Alert Header if upcoming rain */}
      {upcomingRainAlert && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#ef4444'
        }}>
          <ShieldAlert size={20} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.85rem' }}>
            <strong>Upcoming Rain Alert:</strong> Heavy rain probability detected ({weather.rainProbability}%). Avoid spraying fertilizers or pesticides today! Check drainage in low-lying fields.
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Daily Personalized Advice */}
        <div className="weather-card" style={{ gridColumn: 'span 2', minHeight: '150px' }}>
          <div className="weather-header">
            <h3 style={{ fontSize: '1rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BotIcon />
              <span>Today's AgroGuide Personalized Summary</span>
            </h3>
            <button onClick={onRefresh} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Refresh dashboard">
              <RefreshCw size={16} />
            </button>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.6', marginTop: '12px', whiteSpace: 'pre-line' }}>
            {personalizedRecommendation}
          </p>
        </div>

        {/* Live Weather Card */}
        <div className="weather-card">
          <div className="weather-header">
            <span className="weather-city-name">{weather.city}</span>
            <span className="weather-badge">Live Weather</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0' }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>
                {weather.temperature}°C
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {weather.weatherCondition} • Feels like {weather.feelsLike}°C
              </div>
            </div>
            {getWeatherIcon(weather.weatherCondition, 48)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px', fontSize: '0.8rem', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Droplets size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>Humidity: <strong>{weather.humidity}%</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wind size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>Wind: <strong>{weather.windSpeed} m/s</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🍃</span>
              <span>Air Quality: <strong>{weather.airQuality}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>☀️</span>
              <span>UV Index: <strong>{weather.uvIndex}</strong></span>
            </div>
          </div>
        </div>

        {/* Current Crop Details */}
        <div className="weather-card">
          <div className="weather-header">
            <span className="weather-city-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sprout size={18} style={{ color: 'hsl(140, 70%, 55%)' }} />
              <span>{profile.primaryCrop} Crop Profile</span>
            </span>
            <span className="weather-badge" style={{ background: 'hsla(140, 70%, 55%, 0.1)', color: 'hsl(140, 70%, 55%)' }}>Active Crop</span>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Soil Type:</span>
              <strong style={{ color: '#fff' }}>{profile.soilType}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Farm Size:</span>
              <strong style={{ color: '#fff' }}>{profile.farmSize} {profile.farmSizeUnit}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Water Source:</span>
              <strong style={{ color: '#fff' }}>{profile.waterSource}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Irrigation:</span>
              <strong style={{ color: '#fff' }}>{profile.irrigationMethod}</strong>
            </div>
          </div>
        </div>

        {/* Crop Stage Card */}
        <div className="weather-card">
          <div className="weather-header">
            <span className="weather-city-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} style={{ color: 'hsl(280, 80%, 70%)' }} />
              <span>Lifecycle Status</span>
            </span>
          </div>

          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
              {profile.cropStage}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Planting Date: {formatShortDate(profile.plantingDate)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '12px', fontSize: '0.8rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Days Planted</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{profile.daysSincePlanting} days</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Days to Harvest</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'hsl(140, 70%, 55%)' }}>{profile.daysUntilHarvest} days</div>
              </div>
            </div>
          </div>
        </div>

        {/* Crop Calendar Timeline */}
        <div className="weather-card" style={{ gridColumn: 'span 2' }}>
          <div className="weather-header">
            <span className="weather-city-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: 'var(--accent-cyan)' }} />
              <span>Crop Calendar Timeline</span>
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <div className="timeline-step">
              <div className="timeline-node completed">🌱</div>
              <div className="timeline-label">Planting</div>
              <div className="timeline-date">{formatShortDate(profile.plantingDate)}</div>
            </div>

            <div className="timeline-connector"></div>

            <div className="timeline-step">
              <div className="timeline-node active">💧</div>
              <div className="timeline-label">Next Irrigation</div>
              <div className="timeline-date">{formatShortDate(cropCalendar.nextIrrigation)}</div>
            </div>

            <div className="timeline-connector"></div>

            <div className="timeline-step">
              <div className="timeline-node pending">🧪</div>
              <div className="timeline-label">Next Fertilizer</div>
              <div className="timeline-date">{formatShortDate(cropCalendar.nextFertilizer)}</div>
            </div>

            <div className="timeline-connector"></div>

            <div className="timeline-step">
              <div className="timeline-node pending">🐛</div>
              <div className="timeline-label">Next Pesticide</div>
              <div className="timeline-date">{formatShortDate(cropCalendar.nextPesticide)}</div>
            </div>

            <div className="timeline-connector"></div>

            <div className="timeline-step">
              <div className="timeline-node harvest">🌾</div>
              <div className="timeline-label">Expected Harvest</div>
              <div className="timeline-date">{formatShortDate(cropCalendar.expectedHarvest)}</div>
            </div>
          </div>
        </div>

        {/* Scheme Reminders Card */}
        <div className="weather-card">
          <div className="weather-header">
            <span className="weather-city-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} style={{ color: 'hsl(45, 90%, 55%)' }} />
              <span>Government Benefit Reminder</span>
            </span>
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff', marginBottom: '6px' }}>
              {schemeReminder.scheme}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {schemeReminder.content.length > 180 ? schemeReminder.content.slice(0, 180) + '...' : schemeReminder.content}
            </p>
          </div>
        </div>

        {/* Disease Diagnostic Assistant */}
        <div className="weather-card">
          <div className="weather-header">
            <span className="weather-city-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              🐛
              <span>Disease Helper</span>
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 12px 0', lineHeight: '1.4' }}>
            Describe leaves spots, insects, or plant symptoms to launch an AI diagnostics analysis.
          </p>
          <form onSubmit={handleDiseaseSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={diseaseInput}
              onChange={(e) => setDiseaseInput(e.target.value)}
              placeholder="e.g. Rice leaves have yellow spots"
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            />
            <button
              type="submit"
              style={{
                background: 'var(--accent-gradient)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Search symptoms"
            >
              <Search size={16} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

// Inline Helper Components
function BotIcon() {
  return (
    <div style={{
      background: 'hsla(190, 90%, 50%, 0.1)',
      padding: '4px',
      borderRadius: '50%',
      color: 'var(--accent-cyan)',
      display: 'inline-flex'
    }}>
      <span>🤖</span>
    </div>
  );
}
