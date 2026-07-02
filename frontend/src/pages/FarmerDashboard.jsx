import React, { useState } from 'react';
import { Sun, Cloud, CloudRain, Droplets, Wind, Compass, Eye, Calendar, Sprout, ShieldAlert, Award, Search, RefreshCw, Layers } from 'lucide-react';

export default function FarmerDashboard({ data, onRefresh, onDiseaseSearch, onPromptClick }) {
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

  // Predefined prompt translation dictionary based on user preference (Part 10 & 12)
  const lang = profile?.preferredLanguage || 'en-US';

  const cardsData = {
    'te-IN': [
      { icon: '📈', title: 'మార్కెట్ ధరలు', desc: 'నేటి తాజా పంటల మార్కెట్ ధరలు సరిచూసుకోండి.', prompt: "నా ప్రాంతంలో నేటి పంటల మార్కెట్ ధరలు చూపించు" },
      { icon: '📊', title: 'పంటల ధోరణి', desc: 'పంటల ధరలు మరియు దిగుబడి అంచనాలను విశ్లేషించండి.', prompt: "ఈ సీజన్ పంటల ధరల మరియు దిగుబడి అంచనాలను విశ్లేషించు" },
      { icon: '📰', title: 'వ్యవసాయ వార్తలు', desc: 'ఐకార్ (ICAR) నుండి తాజా వ్యవసాయ వార్తలు తెలుసుకోండి.', prompt: "ఐకార్ (ICAR) నుండి తాజా వ్యవసాయ వార్తలు ఏమిటి?" },
      { icon: '🌦', title: 'వాతావరణ నివేదిక', desc: 'వ్యవసాయానికి సంబంధించిన వాతావరణ సలహాలు పొందండి.', prompt: "వ్యవసాయానికి సంబంధించిన వివరణాత్మక వాతావరణ నివేదికను ఇవ్వు" },
      { icon: '🏛', title: 'ప్రభుత్వ పథకాలు', desc: 'అందుబాటులో ఉన్న సహాయ పథకాలను కనుగొనండి.', prompt: "నా పంటకు అందుబాటులో ఉన్న ప్రభుత్వ పథకాలు చూపించు" },
      { icon: '🌾', title: 'పంట సలహాలు', desc: 'పంటల సాగు మరియు సంరక్షణకు తగిన సూచనలు.', prompt: "నా పంట ప్రస్తుత దశకు తగిన వ్యవసాయ సలహాలను ఇవ్వు" }
    ],
    'hi-IN': [
      { icon: '📈', title: 'बाजार भाव', desc: 'आज के फसल बाजार और मंडी भाव की जानकारी प्राप्त करें।', prompt: "मुझे मेरे क्षेत्र के लिए आज के फसल बाजार भाव दिखाएं" },
      { icon: '📊', title: 'फसल रुझान', desc: 'फसल मूल्य और उपज के ऐतिहासिक रुझानों का विश्लेषण करें।', prompt: "इस सीजन के लिए फसल मूल्य और उपज के रुझानों का विश्लेषण करें" },
      { icon: '📰', title: 'कृषि समाचार', desc: 'आईसीएआर (ICAR) से आज के मुख्य कृषि समाचार जानें।', prompt: "आईसीएआर (ICAR) से नवीनतम कृषि समाचार क्या हैं?" },
      { icon: '🌦', title: 'मौसम सलाह', desc: 'खेती के लिए अनुकूल मौसम और वर्षा पूर्वानुमान प्राप्त करें।', prompt: "खेती के लिए विस्तृत मौसम सलाह रिपोर्ट दें" },
      { icon: '🏛', title: 'सरकारी योजनाएं', desc: 'किसानों के लिए जारी नई सरकारी योजनाओं की सूची।', prompt: "मेरी फसल के लिए सक्रिय सरकारी योजनाएं दिखाएं" },
      { icon: '🌾', title: 'फसल सलाह', desc: 'अपनी फसल की वर्तमान स्थिति के अनुसार सलाह लें।', prompt: "मेरी फसल की वर्तमान स्थिति के लिए कृषि सलाह दें" }
    ],
    'ta-IN': [
      { icon: '📈', title: 'சந்தை விலை', desc: 'இன்றைய முக்கிய பயிர்களின் சந்தை விலையை அறிந்து கொள்ளுங்கள்.', prompt: "என் பகுதிக்கு இன்றைய பயிர் சந்தை விலையைக் காட்டு" },
      { icon: '📊', title: 'பயிர் போக்குகள்', desc: 'விலை மற்றும் மகசூல் பற்றிய கணிப்புகளை ஆராயுங்கள்.', prompt: "இந்த பருவத்திற்கான பயிர் விலை மற்றும் மகசூல் போக்குகளை பகுப்பாய்வு செய்க" },
      { icon: '📰', title: 'விவசாய செய்திகள்', desc: 'ICAR வழங்கும் சமீபத்திய விவசாய செய்திகள் மற்றும் அறிவிப்புகள்.', prompt: "ஐசிஏஆர் (ICAR) வழங்கும் சமீபத்திய விவசாய செய்திகள் என்ன?" },
      { icon: '🌦', title: 'வானிலை நுண்ணறிவு', desc: 'விவசாயத்திற்கான வானிலை மற்றும் மழைப்பொழிவு அறிவுரைகள்.', prompt: "விவசாயத்திற்கான விரிவான வானிலை நுண்ணறிவு அறிக்கையை வழங்கவும்" },
      { icon: '🏛', title: 'அரசு திட்டங்கள்', desc: 'விவசாயிகளுக்கான நடப்பு நலத்திட்டங்கள் மற்றும் மானியங்கள்.', prompt: "என் பயிர்க்கான அரசு திட்டங்களைக் காட்டு" },
      { icon: '🌾', title: 'பயிர் ஆலோசனை', desc: 'பயிரின் தற்போதைய வளர்ச்சி நிலைக்கு தேவையான அறிவுரைகள்.', prompt: "என் பயிரின் தற்போதைய நிலைக்கு பயிர் ஆலோசனையை வழங்கவும்" }
    ],
    'en-US': [
      { icon: '📈', title: 'Market Prices', desc: 'Check latest crop prices and mandi rates in your area.', prompt: "Show me today's crop market prices for my region" },
      { icon: '📊', title: 'Crop Trends', desc: 'Analyze historical crop price trends and forecasts.', prompt: "Analyze crop price and yield trends for this season" },
      { icon: '📰', title: 'Agricultural News', desc: 'Get latest agricultural updates and bulletins from ICAR.', prompt: "What is the latest agricultural news from ICAR?" },
      { icon: '🌦', title: 'Weather Intel', desc: 'Get region-specific agricultural weather advisories.', prompt: "Give me a detailed weather intelligence report for farming" },
      { icon: '🏛', title: 'Govt Schemes', desc: 'Discover active subsidies and government benefit schemes.', prompt: "Show me active government schemes for my crop" },
      { icon: '🌾', title: 'Crop Advisory', desc: 'Get target recommendations for your current crop stage.', prompt: "Give me a crop advisory for my current stage of cultivation" }
    ]
  };

  const intelligenceCards = cardsData[lang] || cardsData['en-US'];

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

      {/* Part 12 - New Dashboard Cards */}
      <h3 style={{ fontSize: '1.1rem', color: '#fff', marginTop: '30px', marginBottom: '15px', fontWeight: 'bold' }}>
        📈 Agricultural Intelligence Portal
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {intelligenceCards.map((card, idx) => (
          <div
            key={idx}
            className="suggestion-card"
            onClick={() => onPromptClick && onPromptClick(card.prompt)}
            style={{
              cursor: 'pointer',
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <div style={{ fontSize: '1.5rem' }}>{card.icon}</div>
            <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>{card.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{card.desc}</div>
          </div>
        ))}
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
