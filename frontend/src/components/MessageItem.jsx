import React from 'react';
import { User, Bot, Sun, Cloud, CloudRain, Wind, Droplets, Eye, Sunrise, Sunset, Compass } from 'lucide-react';

/**
 * MessageItem component renders a single chat bubble.
 * Aligns user messages to the right and assistant messages to the left.
 * If the response contains weatherData, it renders a beautiful glassmorphic Weather Card.
 */
export default function MessageItem({ message }) {
  const isUser = message.role === 'user';
  const timestamp = message.timestamp ? new Date(message.timestamp) : new Date();
  
  const timeString = timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const weather = message.weatherData;
  const isForecast = weather && Array.isArray(weather.forecast);

  // Helper to resolve condition icons
  const getWeatherIcon = (condition, size = 24) => {
    const cond = (condition || '').toLowerCase();
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('storm') || cond.includes('thunder')) {
      return <CloudRain size={size} style={{ color: 'hsl(200, 80%, 65%)' }} />;
    }
    if (cond.includes('cloud') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog') || cond.includes('smoke')) {
      return <Cloud size={size} style={{ color: 'hsl(215, 20%, 75%)' }} />;
    }
    return <Sun size={size} style={{ color: 'hsl(45, 90%, 55%)' }} />;
  };

  // Helper to format Unix timestamps to standard hour:minute format
  const formatTime = (tsSeconds) => {
    if (!tsSeconds) return '--:--';
    return new Date(tsSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`message-row ${isUser ? 'user' : 'ai'}`}>
      <div className="message-bubble">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          {!isUser && (
            <div style={{
              background: 'hsla(190, 90%, 50%, 0.1)',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              flexShrink: 0
            }}>
              <Bot size={16} />
            </div>
          )}
          
          <div style={{ flex: 1, paddingTop: !isUser ? '3px' : '0', wordBreak: 'break-word' }}>
            <div>{message.text}</div>

            {/* RENDER SOURCES IF AVAILABLE (Part 3) */}
            {!isUser && message.sources && Array.isArray(message.sources) && message.sources.length > 0 && (
              <div className="sources-container" style={{
                marginTop: '12px',
                borderTop: '1px dashed var(--border-light)',
                paddingTop: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px', color: 'var(--accent-cyan)' }}>
                  🔗 Sources:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {message.sources.map((src, idx) => (
                    <div key={idx} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      <a 
                        href={src.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: '500' }}
                      >
                        {src.sourceName}
                      </a>
                      {src.publishedDate && (
                        <span>({new Date(src.publishedDate).toLocaleDateString()})</span>
                      )}
                      <span>• Confidence: {src.confidenceScore || 100}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* RENDER WEATHER INTELLIGENCE CARD */}
            {!isUser && weather && (
              <div className="weather-card">
                <div className="weather-header">
                  <div className="weather-city-group">
                    <span className="weather-city-name">{weather.city}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {isForecast ? '5-Day Agriculture Forecast' : 'Live Farming Weather'}
                    </span>
                    {!isForecast && weather.lastUpdated && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
                        Last updated: {new Date(weather.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <span className="weather-badge">
                    {isForecast ? 'Forecast' : 'Current'}
                  </span>
                </div>

                {isForecast ? (
                  /* 5-DAY FORECAST VIEW */
                  <div className="forecast-list">
                    {weather.forecast.map((day, idx) => (
                      <div key={idx} className="forecast-item">
                        <span className="forecast-date">
                          {new Date(day.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <div className="forecast-cond">
                          {getWeatherIcon(day.weatherCondition, 16)}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {day.weatherCondition}
                          </span>
                        </div>
                        <span className="forecast-temp">{day.temperature}°C</span>
                        <span className="forecast-pop" title="Rain probability">
                          💧 {day.rainProbability}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* CURRENT WEATHER VIEW */
                  <>
                    <div className="weather-main-section">
                      <div>
                        <div className="weather-temp-display">
                          <span className="weather-temp-num">{weather.temperature}</span>
                          <span className="weather-temp-unit">°C</span>
                        </div>
                        <div className="weather-cond-text">{weather.weatherCondition}</div>
                        <div className="weather-feels-like">Feels like {weather.feelsLike}°C</div>
                      </div>
                      <div style={{ paddingRight: '8px' }}>
                        {getWeatherIcon(weather.weatherCondition, 56)}
                      </div>
                    </div>

                    <div className="weather-metrics-grid">
                      <div className="weather-metric-card">
                        <span className="weather-metric-label">
                          <Droplets size={12} style={{ color: 'hsl(200, 80%, 65%)' }} />
                          <span>Humidity</span>
                        </span>
                        <span className="weather-metric-val">{weather.humidity}%</span>
                      </div>
                      
                      <div className="weather-metric-card">
                        <span className="weather-metric-label">
                          <Wind size={12} style={{ color: 'hsl(150, 70%, 55%)' }} />
                          <span>Wind</span>
                        </span>
                        <span className="weather-metric-val">{weather.windSpeed} m/s</span>
                      </div>

                      <div className="weather-metric-card">
                        <span className="weather-metric-label">
                          <Compass size={12} style={{ color: 'hsl(280, 80%, 70%)' }} />
                          <span>Pressure</span>
                        </span>
                        <span className="weather-metric-val">{weather.pressure} hPa</span>
                      </div>

                      <div className="weather-metric-card">
                        <span className="weather-metric-label">
                          <Eye size={12} style={{ color: 'hsl(30, 90%, 60%)' }} />
                          <span>Visibility</span>
                        </span>
                        <span className="weather-metric-val">{weather.visibility} km</span>
                      </div>

                      <div className="weather-metric-card">
                        <span className="weather-metric-label">
                          <Cloud size={12} style={{ color: 'hsl(215, 20%, 65%)' }} />
                          <span>Clouds</span>
                        </span>
                        <span className="weather-metric-val">{weather.cloudCoverage}%</span>
                      </div>

                      <div className="weather-metric-card">
                        <span className="weather-metric-label">
                          💧
                          <span>Rainfall</span>
                        </span>
                        <span className="weather-metric-val">{weather.rainfall} mm</span>
                      </div>

                      <div className="weather-metric-card">
                        <span className="weather-metric-label">
                          ☀️
                          <span>UV Index</span>
                        </span>
                        <span className="weather-metric-val">{weather.uvIndex !== undefined ? weather.uvIndex : '0.0'}</span>
                      </div>

                      <div className="weather-metric-card">
                        <span className="weather-metric-label">
                          🍃
                          <span>Air Quality</span>
                        </span>
                        <span className="weather-metric-val" title={`AQI Index: ${weather.airQualityIndex || 2}`}>
                          {weather.airQuality || 'Fair'}
                        </span>
                      </div>

                      <div className="weather-metric-card">
                        <span className="weather-metric-label">
                          💧
                          <span>Rain Prob.</span>
                        </span>
                        <span className="weather-metric-val">{weather.rainProbability !== undefined ? `${weather.rainProbability}%` : '0%'}</span>
                      </div>
                    </div>

                    <div className="weather-sun-row">
                      <span className="weather-sun-time">
                        <Sunrise size={14} style={{ color: 'hsl(45, 90%, 55%)' }} />
                        <span>Sunrise: <strong>{formatTime(weather.sunrise)}</strong></span>
                      </span>
                      <span className="weather-sun-time">
                        <Sunset size={14} style={{ color: 'hsl(20, 80%, 60%)' }} />
                        <span>Sunset: <strong>{formatTime(weather.sunset)}</strong></span>
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {isUser && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0
            }}>
              <User size={16} />
            </div>
          )}
        </div>
        
        <div className="message-info">
          <span>{timeString}</span>
        </div>
      </div>
    </div>
  );
}
