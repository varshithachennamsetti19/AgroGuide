import { generateReply, generateWeatherSummary, generateReplyStream } from '../services/gemini.js';
import Chat from '../models/Chat.js';
import { detectIntent, extractCity, detectQueryTime, isSeasonalQuery, extractState } from '../services/intentRouter.js';
import { retrieve } from '../rag/retriever.js';
import { fetchCurrentWeather, fetchWeatherForecast, reverseGeocode, geocodeCity } from '../services/weatherService.js';
import WeatherHistory from '../models/WeatherHistory.js';
import { checkAndQueueAlerts } from '../services/alertManager.js';
import User from '../models/User.js';
import { checkDomainFirewall, detectLanguage } from '../services/domainFirewall.js';
import { validateOutput } from '../services/outputValidator.js';
import QueryLog from '../models/QueryLog.js';

// Phase 7 imports
import SearchHistory from '../models/SearchHistory.js';
import PredictionHistory from '../models/PredictionHistory.js';
import { searchAgriculturePortal } from '../services/agricultureSearchService.js';
import { generatePrediction } from '../services/predictionService.js';

// Phase 8 imports
import { cacheGet, cacheSet } from '../cache/redisClient.js';
import {
  recordResponseTime,
  recordCacheHit,
  recordCacheMiss,
  recordBlockedQuery,
  recordPredictionQuery,
  recordWeatherQuery
} from '../monitoring/performance.js';
import Notification from '../models/Notification.js';
import DiseaseHistory from '../models/DiseaseHistory.js'; // Phase 9

// Match explainability phrases (Part 7, 12)
const isExplainQuery = (message) => {
  const msg = message.toLowerCase().trim().replace(/[?.]/g, '');
  const patterns = [
    'why', 'explain', 'explain this', 'reason', 'tell me why', 'explain recommendation',
    'ఎందుకు', 'వివరించు', 'కారణం', 'ఎందుకో చెప్పు',
    'क्यों', 'कारण', 'स्पष्ट करें', 'समझाओ', 'बताओ क्यों',
    'ஏன்', 'விளக்கு', 'காரணம்'
  ];
  return patterns.some(p => msg === p || msg.startsWith(p + ' ') || msg.endsWith(' ' + p));
};

// Match disease diagnostics explainability queries (Part 11)
const isDiseaseExplainQuery = (message) => {
  const msg = message.toLowerCase();
  return (
    msg.includes('why did you detect this') ||
    msg.includes('explain your diagnosis') ||
    msg.includes('explain this disease') ||
    msg.includes('ఈ తెగులును ఎందుకు గుర్తించారు') ||
    msg.includes('ఈ వ్యాధిని వివరించు') ||
    msg.includes('यह रोग क्यों पाया गया') ||
    msg.includes('इस बीमारी को समझाओ') ||
    msg.includes('இந்த நோய் ஏன் கண்டறியப்பட்டது')
  );
};

// Match prediction phrases (Part 6)
const isPredictionQuery = (message) => {
  const msg = message.toLowerCase();
  const predictionKeywords = [
    'predict', 'prediction', 'estimate', 'estimation', 'increase next', 'decrease next', 'will increase', 'will decrease', 'future price', 'price trend', 'price forecast', 'market trend',
    'అంచనా', 'భవిష్యత్తు', 'పెరుగుతుందా', 'తగ్గుతుందా',
    'पूर्वानुमान', 'अनुमान', 'बढ़ेगा', 'घटेगा', 'भविष्य',
    'கணிப்பு', 'மதிப்பீடு', 'அதிகரிக்குமா', 'குறையுமா'
  ];
  return predictionKeywords.some(k => msg.includes(k));
};

/**
 * @desc    Generate a reply from Gemini and save chat to MongoDB (with Caching)
 * @route   POST /api/chat
 * @access  Private
 */
export const generateAndSaveChat = async (req, res) => {
  const { message, history, latitude, longitude } = req.body;
  const userId = req.user._id;

  // 1. Basic validation
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Message parameter is required and must be a string.',
    });
  }

  console.log(`[${new Date().toISOString()}] Incoming chat request from User ${userId}: "${message}"`);
  const startTime = Date.now();
  const language = detectLanguage(message);
  const cacheKey = `chat:${language}:${message.toLowerCase().trim()}`;

  try {
    const dbUser = await User.findById(userId);

    // 2. Explainability Check (Part 11)
    if (isExplainQuery(message) || isDiseaseExplainQuery(message)) {
      const isDiseaseExplain = isDiseaseExplainQuery(message);
      
      if (isDiseaseExplain) {
        const lastDiagnosis = await DiseaseHistory.findOne({ userId }).sort({ createdAt: -1 });
        if (lastDiagnosis) {
          console.log(`[Explainability] Explaining previous disease diagnosis: "${lastDiagnosis.disease}"`);
          
          let promptLanguage = "English";
          if (language === 'te-IN') promptLanguage = "Telugu";
          if (language === 'hi-IN') promptLanguage = "Hindi";
          if (language === 'ta-IN') promptLanguage = "Tamil";

          const explanationPrompt = `
You are AgroGuide, the expert Multimodal Diagnostic System. The user has asked you to explain your disease diagnosis:

Crop: ${lastDiagnosis.crop}
Disease: ${lastDiagnosis.disease}
Confidence: ${lastDiagnosis.confidence}%
Severity: ${lastDiagnosis.severity}
Location: ${lastDiagnosis.location}
Weather Conditions: ${JSON.stringify(lastDiagnosis.weather)}

Explain the reasoning behind this diagnosis in ${promptLanguage}. Discuss the visible symptoms (leaf spots, spores, lesions), weather factors (e.g. humidity/wetness causing blast/blight), and trusted sources used to determine this. Keep it to 3-4 clear sentences.
`;

          const explanationRes = await generateReply(explanationPrompt, [], "");
          const reply = explanationRes.text;

          const savedChat = await Chat.create({
            userId,
            question: message,
            answer: reply,
            language
          });

          await QueryLog.create({
            userId,
            query: message,
            intent: 'GENERAL_AGRICULTURE',
            status: 'allowed',
            confidence: 100
          });

          recordResponseTime(Date.now() - startTime);

          return res.status(200).json({
            success: true,
            reply,
            chat: savedChat
          });
        }
      }

      // Original chat advice explanation
      const lastChat = await Chat.findOne({ userId }).sort({ createdAt: -1 });
      if (lastChat) {
        console.log(`[Explainability] Explaining previous recommendation: "${lastChat.answer}"`);

        let contextText = `User wants to understand the explanation for the previous advice.
Previous Question: "${lastChat.question}"
Previous Recommendation: "${lastChat.answer}"`;

        if (lastChat.weatherData) {
          contextText += `\nRelevant Weather conditions used: ${JSON.stringify(lastChat.weatherData)}`;
        }
        if (dbUser && dbUser.isProfileCompleted) {
          contextText += `\nFarmer Profile Context: Crop: ${dbUser.primaryCrop}, Soil: ${dbUser.soilType}, Stage: ${dbUser.cropStage}, Irrigation: ${dbUser.irrigationMethod}`;
        }

        const explanationPrompt = `
You are AgroGuide, the farming advisor. The user has asked you to explain your previous advice.
Provide a simple, clear 2-3 sentence explanation in ${language === 'te-IN' ? 'Telugu' : language === 'hi-IN' ? 'Hindi' : language === 'ta-IN' ? 'Tamil' : 'English'} explaining the reasons.
Refer directly to the weather details, crop stage, soil type, or RAG schemes information.

Context:
${contextText}
`;

        const explanationRes = await generateReply(explanationPrompt, [], "");
        const reply = explanationRes.text;

        const savedChat = await Chat.create({
          userId,
          question: message,
          answer: reply,
          language
        });

        await QueryLog.create({
          userId,
          query: message,
          intent: 'GENERAL_AGRICULTURE',
          status: 'allowed',
          confidence: 100
        });

        recordResponseTime(Date.now() - startTime);


        return res.status(200).json({
          success: true,
          reply,
          chat: savedChat
        });
      }
    }

    // 3. Domain Firewall Check
    const firewallStatus = checkDomainFirewall(message);
    if (!firewallStatus.isAllowed) {
      console.log(`[Firewall Refusal] Reason: ${firewallStatus.reason}`);
      recordBlockedQuery();

      const savedChat = await Chat.create({
        userId,
        question: message,
        answer: firewallStatus.reply,
        language
      });

      await QueryLog.create({
        userId,
        query: message,
        intent: 'OUT_OF_SCOPE',
        status: 'blocked',
        confidence: 0
      });

      recordResponseTime(Date.now() - startTime);

      return res.status(200).json({
        success: true,
        reply: firewallStatus.reply,
        chat: savedChat
      });
    }

    // 4. Check Caching for general responses
    const cachedVal = await cacheGet(cacheKey);
    if (cachedVal) {
      recordCacheHit();
      console.log(`[Cache Hit] Serving cached response for: "${message}"`);
      
      const savedChat = await Chat.create({
        userId,
        question: message,
        answer: cachedVal.answer,
        language,
        sources: cachedVal.sources
      });

      await QueryLog.create({
        userId,
        query: message,
        intent: cachedVal.intent || 'GENERAL_AGRICULTURE',
        status: 'allowed',
        confidence: cachedVal.confidence || 100
      });

      recordResponseTime(Date.now() - startTime);

      return res.status(200).json({
        success: true,
        reply: cachedVal.answer,
        chat: savedChat,
        sources: cachedVal.sources,
        cached: true
      });
    }
    recordCacheMiss();

    // 5. Intent Classification
    let intent = await detectIntent(message);

    if (intent === 'OUT_OF_SCOPE') {
      const fallbackReply = "I'm AgroGuide, an AI assistant designed to help farmers with agriculture, crops, weather, government schemes, and related farming topics. I can't answer questions outside this domain.";
      const savedChat = await Chat.create({
        userId,
        question: message,
        answer: fallbackReply,
        language
      });

      await QueryLog.create({
        userId,
        query: message,
        intent: 'OUT_OF_SCOPE',
        status: 'blocked',
        confidence: 0
      });

      recordResponseTime(Date.now() - startTime);

      return res.status(200).json({
        success: true,
        reply: fallbackReply,
        chat: savedChat
      });
    }

    // 6. Prediction Engine Flow
    if (isPredictionQuery(message)) {
      recordPredictionQuery();
      console.log(`🔮 Prediction Engine triggered for: "${message}"`);
      const predResult = await generatePrediction(message, language);
      
      const savedChat = await Chat.create({
        userId,
        question: message,
        answer: predResult.reply,
        language
      });

      await PredictionHistory.create({
        userId,
        predictionType: predResult.predictionType,
        prediction: predResult.reply,
        confidence: predResult.confidence
      });

      await QueryLog.create({
        userId,
        query: message,
        intent: 'MARKET_QUERY',
        status: 'allowed',
        confidence: predResult.confidence
      });

      // Cache prediction result for 2 hours
      await cacheSet(cacheKey, {
        answer: predResult.reply,
        intent: 'MARKET_QUERY',
        confidence: predResult.confidence,
        sources: []
      }, 7200);

      recordResponseTime(Date.now() - startTime);

      return res.status(200).json({
        success: true,
        reply: predResult.reply,
        chat: savedChat
      });
    }

    const hasState = extractState(message);
    const isStateOnly = hasState && message.split(/\s+/).length <= 4;
    
    // Check if user is replying with a state name in response to a seasonal weather prompt
    if (isStateOnly && history && history.length > 0) {
      const lastAIMsg = history[history.length - 1];
      const lastMsgText = lastAIMsg.text || lastAIMsg.message || "";
      const isLastMsgPrompt = lastAIMsg.role === 'model' && (
        lastMsgText.includes('రాష్ట్రం') || 
        lastMsgText.includes('राज्य') || 
        lastMsgText.includes('State') ||
        lastMsgText.includes('region')
      );
      if (isLastMsgPrompt) {
        intent = 'WEATHER_QUERY';
      }
    }
    
    const weatherIntents = [
      'WEATHER_QUERY',
      'CURRENT_WEATHER',
      'FORECAST',
      'RAIN_FORECAST',
      'TEMPERATURE',
      'HUMIDITY',
      'AIR_QUALITY',
      'SUNRISE',
      'SUNSET'
    ];

    // --- FLOW A: WEATHER INTENT HANDLING ---
    if (weatherIntents.includes(intent)) {
      recordWeatherQuery();
      const isSeasonal = isSeasonalQuery(message) || (isStateOnly && history && history.length > 0);

      // Handle seasonal rainfall / monsoon queries
      if (isSeasonal) {
        const state = extractState(message);
        
        if (!state) {
          let reply = 'Which State or region would you like the yearly rain forecast for?';
          if (language === 'te-IN') {
            reply = 'ఈ సంవత్సర వర్షపాత వివరాల కోసం దయచేసి మీ రాష్ట్రం పేరు చెప్పండి?';
          } else if (language === 'hi-IN') {
            reply = 'इस साल की बारिश की जानकारी के लिए कृपया अपने राज्य का नाम बताएं?';
          } else if (language === 'ta-IN') {
            reply = 'இந்த ஆண்டின் மழைப்பொழிவு விவரங்களுக்கு உங்கள் மாநிலத்தின் பெயரை கூறவும்?';
          }
          
          console.log(`[Seasonal Weather] Missing state. Prompting user.`);
          
          const savedChat = await Chat.create({
            userId,
            question: message,
            answer: reply,
            language
          });

          await QueryLog.create({
            userId,
            query: message,
            intent: 'WEATHER_QUERY',
            status: 'allowed',
            confidence: 100
          });

          recordResponseTime(Date.now() - startTime);

          return res.status(200).json({
            success: true,
            reply,
            chat: savedChat,
            promptForState: true
          });
        }

        console.log(`[Seasonal Weather] State: "${state}"`);
        const retrievedChunks = await retrieve(state + " seasonal rainfall monsoon forecast", 2);
        
        let context = "";
        if (retrievedChunks && retrievedChunks.length > 0) {
          context = retrievedChunks.map(c => `[Source: ${c.metadata.title}]: ${c.text}`).join('\n\n');
        } else {
          context = `Monsoon Forecast Report for ${state}: Expect normal to above-normal monsoon rain for 2026. Advise crop planning according to state irrigation guides.`;
        }

        const augmentedContext = `You are discussing the seasonal rainfall forecast for ${state}. Ground your reply in this data:\n${context}`;
        const replyRes = await generateReply(message, history, augmentedContext);
        let reply = replyRes.text;

        const validOut = validateOutput(reply, message);
        if (!validOut.isValid) {
          reply = validOut.reply;
        }

        const savedChat = await Chat.create({
          userId,
          question: message,
          answer: reply,
          language
        });

        await QueryLog.create({
          userId,
          query: message,
          intent: 'WEATHER_QUERY',
          status: 'allowed',
          confidence: replyRes.confidence
        });

        // Cache seasonal reply for 1 hour
        await cacheSet(cacheKey, {
          answer: reply,
          intent: 'WEATHER_QUERY',
          confidence: replyRes.confidence,
          sources: []
        }, 3600);

        recordResponseTime(Date.now() - startTime);

        return res.status(200).json({
          success: true,
          reply,
          chat: savedChat
        });
      }

      // Standard City Weather Flow with 10 minutes caching (Part 3)
      let city = extractCity(message);
      let detectedLat = latitude;
      let detectedLon = longitude;
      
      if (!city && detectedLat !== undefined && detectedLon !== undefined && detectedLat !== null && detectedLon !== null) {
        try {
          const revGeo = await reverseGeocode(detectedLat, detectedLon);
          if (revGeo && revGeo.city) {
            city = revGeo.city;
            await User.findByIdAndUpdate(userId, {
              preferredCity: city,
              preferredState: revGeo.state,
              preferredDistrict: revGeo.district || '',
              latitude: detectedLat,
              longitude: detectedLon,
              lastKnownLocation: `${city}, ${revGeo.state}`
            });
          }
        } catch (err) {
          console.error('Failed to reverse geocode:', err.message);
        }
      }

      if (!city && dbUser && dbUser.preferredCity) {
        city = dbUser.preferredCity;
        detectedLat = dbUser.latitude;
        detectedLon = dbUser.longitude;
      }

      if (!city) {
        let reply = 'Which city would you like the weather for?';
        if (language === 'te-IN') {
          reply = 'మీరు ఏ నగరం వాతావరణం తెలుసుకోవాలనుకుంటున్నారు?';
        } else if (language === 'hi-IN') {
          reply = 'आप किस शहर का मौसम जानना चाहते हैं?';
        } else if (language === 'ta-IN') {
          reply = 'நீங்கள் எந்த நகரத்தின் வானிலை அறிய விரும்புகிறீர்கள்?';
        }
        
        const savedChat = await Chat.create({
          userId,
          question: message,
          answer: reply,
          language
        });

        await QueryLog.create({
          userId,
          query: message,
          intent: 'WEATHER_QUERY',
          status: 'allowed',
          confidence: 100
        });

        recordResponseTime(Date.now() - startTime);

        return res.status(200).json({
          success: true,
          reply,
          chat: savedChat,
          promptForCity: true
        });
      }

      const isForecastIntent = intent === 'FORECAST' || intent === 'RAIN_FORECAST';
      const queryType = isForecastIntent || detectQueryTime(message) === 'forecast' ? 'forecast' : 'current';
      const weatherCacheKey = `weather:${queryType}:${city.toLowerCase().trim()}`;
      
      let weatherData = await cacheGet(weatherCacheKey);
      if (weatherData) {
        recordCacheHit();
      } else {
        recordCacheMiss();
        if (queryType === 'forecast') {
          weatherData = await fetchWeatherForecast(city);
        } else {
          weatherData = await fetchCurrentWeather(city);
        }
        // Cache weather for 10 minutes (600 seconds)
        await cacheSet(weatherCacheKey, weatherData, 600);
      }

      let reply = await generateWeatherSummary(weatherData, queryType, language);

      const validOut = validateOutput(reply, message);
      if (!validOut.isValid) {
        reply = validOut.reply;
      }

      let tempToSave = 0;
      let condToSave = 'Clear';
      let humidityToSave = 0;
      let windSpeedToSave = 0;
      if (queryType === 'forecast') {
        tempToSave = weatherData.forecast[0]?.temperature || 0;
        condToSave = weatherData.forecast[0]?.weatherCondition || 'Clear';
        humidityToSave = weatherData.forecast[0]?.humidity || 0;
        windSpeedToSave = weatherData.windSpeed || 0;
      } else {
        tempToSave = weatherData.temperature;
        condToSave = weatherData.weatherCondition;
        humidityToSave = weatherData.humidity;
        windSpeedToSave = weatherData.windSpeed;
      }

      await WeatherHistory.create({
        userId,
        city: weatherData.city,
        latitude: weatherData.latitude || detectedLat,
        longitude: weatherData.longitude || detectedLon,
        temperature: tempToSave,
        condition: condToSave,
        weatherCondition: condToSave,
        humidity: humidityToSave,
        windSpeed: windSpeedToSave,
        timestamp: new Date()
      });

      if (queryType === 'current') {
        await checkAndQueueAlerts(weatherData, userId);
      }

      const savedChat = await Chat.create({
        userId,
        question: message,
        answer: reply,
        language,
        weatherData
      });

      await QueryLog.create({
        userId,
        query: message,
        intent: 'WEATHER_QUERY',
        status: 'allowed',
        confidence: 98
      });

      // Cache weather summary chat reply for 5 minutes
      await cacheSet(cacheKey, {
        answer: reply,
        intent: 'WEATHER_QUERY',
        confidence: 98,
        sources: []
      }, 300);

      recordResponseTime(Date.now() - startTime);

      return res.status(200).json({
        success: true,
        reply,
        chat: savedChat,
        weatherData
      });
    }

    // --- FLOW B: STANDARD CROP/SCHEME/GENERAL FLOW ---
    let farmerProfileContext = "";
    if (dbUser && dbUser.isProfileCompleted) {
      farmerProfileContext = `
Farmer Profile Context:
- Full Name: ${dbUser.fullName || dbUser.name}
- Location: ${dbUser.village || 'N/A'}, ${dbUser.district || 'N/A'}, ${dbUser.state || 'N/A'}
- Primary Crop: ${dbUser.primaryCrop}
- Crop Stage: ${dbUser.cropStage || 'Vegetative Stage'}
- Planting Date: ${dbUser.plantingDate ? new Date(dbUser.plantingDate).toDateString() : 'N/A'}
- Soil Type: ${dbUser.soilType || 'Loamy'}
- Water Source: ${dbUser.waterSource || 'Borewell'}
- Irrigation Method: ${dbUser.irrigationMethod || 'Drip'}
- Farming Type: ${dbUser.farmingType || 'Traditional'}
`;
    }

    const isRAGRequired = [
      'SCHEME_QUERY', 'CROP_QUERY', 'SOIL_QUERY', 'IRRIGATION_QUERY',
      'FERTILIZER_QUERY', 'PEST_QUERY', 'DISEASE_QUERY', 'MARKET_QUERY',
      'LOAN_QUERY', 'INSURANCE_QUERY'
    ].includes(intent);

    let context = "";
    let fetchedSources = [];

    if (isRAGRequired) {
      let augmentedQuery = message;
      if (dbUser && dbUser.isProfileCompleted) {
        if (intent === 'CROP_QUERY' && dbUser.primaryCrop) {
          augmentedQuery = `${dbUser.primaryCrop} ${message}`;
        } else if (intent === 'SCHEME_QUERY' && dbUser.state) {
          augmentedQuery = `${dbUser.state} ${message}`;
        }
      }
      
      // RAG / Search caching (Part 4)
      const ragCacheKey = `rag:${intent}:${augmentedQuery.toLowerCase().trim()}`;
      let cachedRAG = await cacheGet(ragCacheKey);

      if (cachedRAG) {
        recordCacheHit();
        context = cachedRAG.context;
        fetchedSources = cachedRAG.sources || [];
      } else {
        recordCacheMiss();
        console.log(`🔍 RAG: Fetching context for: "${augmentedQuery}"`);
        const retrievedChunks = await retrieve(augmentedQuery, 3);
        const hasEnoughContext = retrievedChunks && retrievedChunks.length > 0 && 
                                 retrievedChunks.some(chunk => chunk.score >= 0.5);

        if (hasEnoughContext) {
          context = retrievedChunks.map(c => `[Source: ${c.metadata.title}]: ${c.text}`).join('\n\n');
        } else {
          // Web search fallback
          console.log(`[RAG Insufficient] Sourced RAG score too low. Intercepting with Whitelisted Web Search...`);
          const searchResult = await searchAgriculturePortal(message);

          if (searchResult.success && searchResult.results.length > 0) {
            const searchContentText = searchResult.results.map(r => `[Source: ${r.sourceName} (${r.url})]: ${r.content}`).join('\n\n');
            context = `Knowledge Grounding (Whitelisted Agricultural Search):\n${searchContentText}`;
            fetchedSources = searchResult.sources;
          } else {
            // Fallback strategy on search fail
            const fallbackMsg = {
              'en-US': "I'm sorry, but I couldn't find reliable agricultural information for your question.",
              'te-IN': "క్షమించండి, అందుబాటులో ఉన్న వ్యవసాయ విజ్ఞాన సర్వస్వం నుండి మీ ప్రశ్నకు తగిన నమ్మకమైన సమాచారం లభించలేదు.",
              'hi-IN': "क्षमा करें, उपलब्ध कृषि ज्ञानकोश से आपके प्रश्न के लिए विश्वसनीय जानकारी नहीं मिल सकी।",
              'ta-IN': "மன்னிக்கவும், கிடைக்கக்கூடிய விவசாய அறிவுத் தளத்திலிருந்து உங்கள் கேள்விக்கான நம்பகமான தகவலைக் கண்டறிய முடியவில்லை."
            }[language] || "I'm sorry, but I couldn't find reliable agricultural information for your question.";

            const savedChat = await Chat.create({
              userId,
              question: message,
              answer: fallbackMsg,
              language
            });

            await QueryLog.create({
              userId,
              query: message,
              intent,
              status: 'blocked',
              confidence: 0
            });

            recordResponseTime(Date.now() - startTime);

            return res.status(200).json({
              success: true,
              reply: fallbackMsg,
              chat: savedChat
            });
          }
        }
        
        // Cache retrieved RAG/Search details (Part 4)
        await cacheSet(ragCacheKey, { context, sources: fetchedSources }, 1800); // 30 mins
      }
    }

    const fullContext = [
      farmerProfileContext,
      context ? `${context}` : ''
    ].filter(Boolean).join('\n\n');

    // Generate reply using Gemini service
    const geminiRes = await generateReply(message, history, fullContext);
    let reply = geminiRes.text;
    let confidence = geminiRes.confidence;

    // Check confidence rating limits
    if (confidence < 50) {
      console.warn(`[Confidence Block] Gemini confidence low: ${confidence}%`);
      reply = "I couldn't find enough reliable agricultural information to answer this confidently.";
      
      const savedChat = await Chat.create({
        userId,
        question: message,
        answer: reply,
        language
      });

      await QueryLog.create({
        userId,
        query: message,
        intent,
        status: 'blocked',
        confidence
      });

      recordResponseTime(Date.now() - startTime);

      return res.status(200).json({
        success: true,
        reply,
        chat: savedChat
      });
    }

    // Run output validation scanner
    const validOut = validateOutput(reply, message);
    if (!validOut.isValid) {
      reply = validOut.reply;
      confidence = 0;
    }

    const savedChat = await Chat.create({
      userId,
      question: message,
      answer: reply,
      language,
      sources: fetchedSources
    });

    if (fetchedSources.length > 0 && validOut.isValid) {
      let confLabel = 'High';
      if (confidence < 70) confLabel = 'Low';
      else if (confidence < 90) confLabel = 'Medium';

      await SearchHistory.create({
        userId,
        query: message,
        intent,
        sources: fetchedSources,
        confidence: confLabel
      });
    }

    await QueryLog.create({
      userId,
      query: message,
      intent,
      status: !validOut.isValid ? 'blocked' : 'allowed',
      confidence,
    });

    // Cache final reply (Part 2)
    if (validOut.isValid) {
      await cacheSet(cacheKey, {
        answer: reply,
        intent,
        confidence,
        sources: fetchedSources
      }, 3600); // 1 hour cache
    }

    recordResponseTime(Date.now() - startTime);

    return res.status(200).json({
      success: true,
      reply: reply,
      chat: savedChat,
      sources: fetchedSources
    });
  } catch (error) {
    console.error('Error generating and saving chat:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate response from AI assistant. Please try again.',
    });
  }
};

/**
 * @desc    Stream AI response token-by-token (Phase 8 Streaming)
 * @route   POST /api/chat/stream
 * @access  Private
 */
export const generateAndSaveChatStream = async (req, res) => {
  const { message, history, latitude, longitude } = req.body;
  const userId = req.user._id;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, error: 'Message parameter required.' });
  }

  const startTime = Date.now();
  const language = detectLanguage(message);
  const cacheKey = `chat:${language}:${message.toLowerCase().trim()}`;

  // 1. Domain Firewall Check
  const firewallStatus = checkDomainFirewall(message);
  if (!firewallStatus.isAllowed) {
    recordBlockedQuery();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    
    // Save blocked chat
    const savedChat = await Chat.create({
      userId,
      question: message,
      answer: firewallStatus.reply,
      language
    });

    await QueryLog.create({
      userId,
      query: message,
      intent: 'OUT_OF_SCOPE',
      status: 'blocked',
      confidence: 0
    });

    res.write(`data: ${JSON.stringify({ text: firewallStatus.reply, chat: savedChat, done: true })}\n\n`);
    res.end();
    recordResponseTime(Date.now() - startTime);
    return;
  }

  // 2. Response Cache Hit (Part 2)
  const cachedVal = await cacheGet(cacheKey);
  if (cachedVal) {
    recordCacheHit();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    
    const savedChat = await Chat.create({
      userId,
      question: message,
      answer: cachedVal.answer,
      language,
      sources: cachedVal.sources
    });

    await QueryLog.create({
      userId,
      query: message,
      intent: cachedVal.intent || 'GENERAL_AGRICULTURE',
      status: 'allowed',
      confidence: cachedVal.confidence || 100
    });

    // Stream cached answer in chunks quickly
    const words = cachedVal.answer.split(' ');
    for (let i = 0; i < words.length; i++) {
      res.write(`data: ${JSON.stringify({ text: words[i] + ' ' })}\n\n`);
      await new Promise(r => setTimeout(r, 40));
    }
    
    res.write(`data: ${JSON.stringify({ done: true, chat: savedChat, sources: cachedVal.sources })}\n\n`);
    res.end();
    recordResponseTime(Date.now() - startTime);
    return;
  }
  recordCacheMiss();

  try {
    const dbUser = await User.findById(userId);
    let intent = await detectIntent(message);

    // Weather checks
    const isWeatherMsg = [
      'WEATHER_QUERY', 'CURRENT_WEATHER', 'FORECAST',
      'RAIN_FORECAST', 'TEMPERATURE', 'HUMIDITY'
    ].includes(intent);

    let context = "";
    let fetchedSources = [];

    // Weather Stream
    if (isWeatherMsg) {
      recordWeatherQuery();
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      let city = extractCity(message) || dbUser?.preferredCity || 'Guntur';
      const weatherCacheKey = `weather:current:${city.toLowerCase().trim()}`;
      
      let weatherData = await cacheGet(weatherCacheKey);
      if (!weatherData) {
        weatherData = await fetchCurrentWeather(city);
        await cacheSet(weatherCacheKey, weatherData, 600);
      }

      let reply = await generateWeatherSummary(weatherData, 'current', language);
      
      const savedChat = await Chat.create({
        userId,
        question: message,
        answer: reply,
        language,
        weatherData
      });

      await QueryLog.create({
        userId,
        query: message,
        intent: 'WEATHER_QUERY',
        status: 'allowed',
        confidence: 98
      });

      // Stream summary
      const words = reply.split(' ');
      for (const w of words) {
        res.write(`data: ${JSON.stringify({ text: w + ' ' })}\n\n`);
        await new Promise(r => setTimeout(r, 40));
      }

      res.write(`data: ${JSON.stringify({ done: true, chat: savedChat, weatherData })}\n\n`);
      res.end();
      recordResponseTime(Date.now() - startTime);
      return;
    }

    // Standard flow (RAG & Web Search check)
    let farmerProfileContext = "";
    if (dbUser && dbUser.isProfileCompleted) {
      farmerProfileContext = `
Farmer Profile:
- Crop: ${dbUser.primaryCrop}
- Soil: ${dbUser.soilType}
- Location: ${dbUser.village || 'N/A'}, ${dbUser.state || 'N/A'}
`;
    }

    const isRAGRequired = [
      'SCHEME_QUERY', 'CROP_QUERY', 'SOIL_QUERY', 'IRRIGATION_QUERY',
      'FERTILIZER_QUERY', 'PEST_QUERY', 'DISEASE_QUERY', 'MARKET_QUERY'
    ].includes(intent);

    if (isRAGRequired) {
      let augmentedQuery = message;
      if (dbUser && dbUser.isProfileCompleted && dbUser.primaryCrop) {
        augmentedQuery = `${dbUser.primaryCrop} ${message}`;
      }

      const ragCacheKey = `rag:${intent}:${augmentedQuery.toLowerCase().trim()}`;
      let cachedRAG = await cacheGet(ragCacheKey);

      if (cachedRAG) {
        context = cachedRAG.context;
        fetchedSources = cachedRAG.sources || [];
      } else {
        const retrievedChunks = await retrieve(augmentedQuery, 3);
        const hasEnoughContext = retrievedChunks && retrievedChunks.length > 0 && 
                                 retrievedChunks.some(chunk => chunk.score >= 0.5);

        if (hasEnoughContext) {
          context = retrievedChunks.map(c => `[Source: ${c.metadata.title}]: ${c.text}`).join('\n\n');
        } else {
          // Sourced Web Search
          const searchResult = await searchAgriculturePortal(message);
          if (searchResult.success && searchResult.results.length > 0) {
            const searchContentText = searchResult.results.map(r => `[Source: ${r.sourceName} (${r.url})]: ${r.content}`).join('\n\n');
            context = `Knowledge Grounding (Whitelisted Agricultural Search):\n${searchContentText}`;
            fetchedSources = searchResult.sources;
          } else {
            // Fallback
            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            });
            const fallbackMsg = "I'm sorry, but I couldn't find reliable agricultural information for your question.";
            const savedChat = await Chat.create({
              userId,
              question: message,
              answer: fallbackMsg,
              language
            });
            res.write(`data: ${JSON.stringify({ text: fallbackMsg, chat: savedChat, done: true })}\n\n`);
            res.end();
            recordResponseTime(Date.now() - startTime);
            return;
          }
        }
        await cacheSet(ragCacheKey, { context, sources: fetchedSources }, 1800);
      }
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const fullContext = [farmerProfileContext, context].filter(Boolean).join('\n\n');

    // Call Gemini streaming API (Part 5)
    const resultStream = await generateReplyStream(message, history, fullContext);
    let fullText = '';

    for await (const chunk of resultStream.stream) {
      const textChunk = chunk.text();
      fullText += textChunk;
      // Stream incremental token to UI
      res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
    }

    // Output validation check on full reply text
    const validOut = validateOutput(fullText, message);
    let finalAnswer = fullText;
    if (!validOut.isValid) {
      finalAnswer = validOut.reply;
      // Send replace chunk indicating validation replacement
      res.write(`data: ${JSON.stringify({ text: finalAnswer, replace: true })}\n\n`);
    }

    const savedChat = await Chat.create({
      userId,
      question: message,
      answer: finalAnswer,
      language,
      sources: fetchedSources
    });

    // Save logs
    await QueryLog.create({
      userId,
      query: message,
      intent,
      status: !validOut.isValid ? 'blocked' : 'allowed',
      confidence: !validOut.isValid ? 0 : 90
    });

    // Cache final reply (Part 2)
    if (validOut.isValid) {
      await cacheSet(cacheKey, {
        answer: finalAnswer,
        intent,
        confidence: 90,
        sources: fetchedSources
      }, 3600);
    }

    res.write(`data: ${JSON.stringify({ done: true, chat: savedChat, sources: fetchedSources })}\n\n`);
    res.end();
    recordResponseTime(Date.now() - startTime);

  } catch (err) {
    console.error('Streaming API Error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'Streaming execution failed.', done: true })}\n\n`);
    res.end();
  }
};

/**
 * @desc    Get all chats for a user
 * @route   GET /api/chat/history
 * @access  Private
 */
export const getHistory = async (req, res) => {
  const userId = req.user._id;

  try {
    const chats = await Chat.find({ userId }).sort({ createdAt: 1 });
    return res.status(200).json({ success: true, chats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve chat history.' });
  }
};

/**
 * @desc    Delete a specific chat
 * @route   DELETE /api/chat/:id
 * @access  Private
 */
export const deleteChat = async (req, res) => {
  const userId = req.user._id;
  const chatId = req.params.id;

  try {
    const chat = await Chat.findOneAndDelete({ _id: chatId, userId });
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat record not found.' });
    }
    return res.status(200).json({ success: true, message: 'Chat message deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete chat.' });
  }
};

/**
 * @desc    Delete all chat history for a user
 * @route   DELETE /api/chat/history
 * @access  Private
 */
export const clearHistory = async (req, res) => {
  const userId = req.user._id;

  try {
    await Chat.deleteMany({ userId });
    return res.status(200).json({ success: true, message: 'Entire chat history cleared.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to clear chat history.' });
  }
};
