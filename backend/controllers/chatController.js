import { generateReply, generateWeatherSummary } from '../services/gemini.js';
import Chat from '../models/Chat.js';
import { detectIntent, extractCity, detectQueryTime, isSeasonalQuery, extractState } from '../services/intentRouter.js';
import { retrieve } from '../rag/retriever.js';
import { fetchCurrentWeather, fetchWeatherForecast, reverseGeocode, geocodeCity } from '../services/weatherService.js';
import WeatherHistory from '../models/WeatherHistory.js';
import { checkAndQueueAlerts } from '../services/alertManager.js';
import User from '../models/User.js';

// Helper to detect language for saving to DB
const detectLanguage = (text) => {
  if (!text) return 'en-US';
  if (/[\u0c00-\u0c7f]/i.test(text)) {
    return 'te-IN'; // Telugu
  }
  if (/[\u0900-\u097f]/i.test(text)) {
    return 'hi-IN'; // Hindi
  }
  if (/[\u0b80-\u0bff]/i.test(text)) {
    return 'ta-IN'; // Tamil
  }
  return 'en-US'; // Fallback
};

/**
 * @desc    Generate a reply from Gemini and save chat to MongoDB
 * @route   POST /api/chat
 * @access  Private
 */
export const generateAndSaveChat = async (req, res) => {
  const { message, history, latitude, longitude } = req.body;
  const userId = req.user._id;

  // Validate request body
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Message parameter is required and must be a string.',
    });
  }

  console.log(`[${new Date().toISOString()}] Incoming chat request from User ${userId}: "${message}"`);
  const startTime = Date.now();
  const language = detectLanguage(message);

  try {
    // Detect intent of the query
    let intent = await detectIntent(message);
    const hasState = extractState(message);
    const isStateOnly = hasState && message.split(/\s+/).length <= 4;
    
    // Check if the user is replying with a state name in response to a seasonal weather prompt
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

    // 1. WEATHER INTENT HANDLING FLOW
    if (weatherIntents.includes(intent)) {
      const isSeasonal = isSeasonalQuery(message) || (isStateOnly && history && history.length > 0);

      // Handle seasonal / yearly / monsoon rainfall forecast queries
      if (isSeasonal) {
        const state = extractState(message);
        
        // Case A: State is missing - Prompt the user in their language
        if (!state) {
          let reply = 'Which State or region would you like the yearly rain forecast for?';
          if (language === 'te-IN') {
            reply = 'ఈ సంవత్సర వర్షపాత వివరాల కోసం దయచేసి మీ రాష్ట్రం పేరు చెప్పండి?';
          } else if (language === 'hi-IN') {
            reply = 'इस साल की बारिश की जानकारी के लिए कृपया अपने राज्य का नाम बताएं?';
          }
          
          console.log(`[Seasonal Weather Query] Missing state. Prompting user: "${reply}"`);
          
          const savedChat = await Chat.create({
            userId,
            question: message,
            answer: reply,
            language
          });

          return res.status(200).json({
            success: true,
            reply,
            chat: savedChat,
            promptForState: true
          });
        }

        // Case B: State is present - Query RAG for state-level seasonal report
        console.log(`[Seasonal Weather Query] State: "${state}"`);
        const retrievedChunks = await retrieve(state + " seasonal rainfall monsoon forecast", 2);
        
        let context = "";
        if (retrievedChunks && retrievedChunks.length > 0) {
          context = retrievedChunks.map(c => `[Source: ${c.metadata.title}]: ${c.text}`).join('\n\n');
        } else {
          // If no RAG data found, provide fallback context about state
          context = `Monsoon Forecast Report for ${state}: Expect normal to above-normal monsoon rain for 2026. Advise crop planning according to state irrigation guides.`;
        }

        // Prepend specific guidance for Gemini
        const augmentedContext = `You are discussing the seasonal rainfall forecast for ${state}. Ground your reply in this data:\n${context}`;

        const reply = await generateReply(message, history, augmentedContext);
        console.log(`[Seasonal Weather Query] Gemini response generated in ${Date.now() - startTime}ms`);

        // Save to main Chat history
        const savedChat = await Chat.create({
          userId,
          question: message,
          answer: reply,
          language
        });

        return res.status(200).json({
          success: true,
          reply,
          chat: savedChat
        });
      }

      // Standard City Weather Flow
      let city = extractCity(message);
      let detectedLat = latitude;
      let detectedLon = longitude;
      
      // If coordinates are present, try to reverse geocode them to get the city name
      if (!city && detectedLat !== undefined && detectedLon !== undefined && detectedLat !== null && detectedLon !== null) {
        try {
          const revGeo = await reverseGeocode(detectedLat, detectedLon);
          if (revGeo && revGeo.city) {
            city = revGeo.city;
            console.log(`[Weather Query] Reverse geocoded coordinates to city: "${city}", state: "${revGeo.state}"`);
            
            // Save/update user profile location details
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
          console.error('Failed to reverse geocode coordinates:', err.message);
        }
      }

      // If city is still not found, check the user's preferred city in profile
      if (!city) {
        const dbUser = await User.findById(userId);
        if (dbUser && dbUser.preferredCity) {
          city = dbUser.preferredCity;
          detectedLat = dbUser.latitude;
          detectedLon = dbUser.longitude;
          console.log(`[Weather Query] Using user preferredCity from profile: "${city}"`);
        }
      }

      // Case A: City is still missing -> Prompt the user in their language
      if (!city) {
        let reply = 'Which city would you like the weather for?';
        if (language === 'te-IN') {
          reply = 'మీరు ఏ నగరం వాతావరణం తెలుసుకోవాలనుకుంటున్నారు?';
        } else if (language === 'hi-IN') {
          reply = 'आप किस शहर का मौसम जानना चाहते हैं?';
        }
        
        console.log(`[Weather Query] Missing city. Prompting user: "${reply}"`);
        
        const savedChat = await Chat.create({
          userId,
          question: message,
          answer: reply,
          language
        });

        return res.status(200).json({
          success: true,
          reply,
          chat: savedChat,
          promptForCity: true
        });
      }

      // If city was extracted from message (so it wasn't saved in the reverse-geocode step above),
      // and user does not have a preferred city, let's geocode and save it!
      const dbUser = await User.findById(userId);
      if (dbUser && !dbUser.preferredCity) {
        try {
          const geo = await geocodeCity(city);
          await User.findByIdAndUpdate(userId, {
            preferredCity: city,
            preferredState: geo.state,
            latitude: geo.latitude,
            longitude: geo.longitude,
            lastKnownLocation: `${city}, ${geo.state}`
          });
          console.log(`Saved preferredCity "${city}" to user profile.`);
        } catch (err) {
          console.error('Failed to geocode and save user preferred city:', err.message);
          // Fallback: save city anyway
          await User.findByIdAndUpdate(userId, { preferredCity: city });
        }
      }

      // Case B: City is present - Fetch weather & summarize
      const isForecastIntent = intent === 'FORECAST' || intent === 'RAIN_FORECAST';
      const queryType = isForecastIntent || detectQueryTime(message) === 'forecast' ? 'forecast' : 'current';
      console.log(`[Weather Query] City: "${city}", Type: "${queryType}", Intent: "${intent}"`);
      
      let weatherData;
      if (queryType === 'forecast') {
        weatherData = await fetchWeatherForecast(city);
      } else {
        weatherData = await fetchCurrentWeather(city);
      }

      // Generate farmer-friendly explanation via Gemini
      const reply = await generateWeatherSummary(weatherData, queryType, language);
      console.log(`[Weather Query] Gemini summary generated in ${Date.now() - startTime}ms`);

      // Save record to WeatherHistory schema
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

      // Trigger future-ready Alert System (BullMQ / Redis hook)
      if (queryType === 'current') {
        await checkAndQueueAlerts(weatherData, userId);
      }

      // Save to main Chat history with embedded weather metadata
      const savedChat = await Chat.create({
        userId,
        question: message,
        answer: reply,
        language,
        weatherData // embed raw weather data in chat
      });

      return res.status(200).json({
        success: true,
        reply,
        chat: savedChat,
        weatherData
      });
    }

    // 2. STANDARD CROP/SCHEME/GENERAL FLOW
    // Retrieve context for Scheme or Crop intents
    let context = "";
    if (intent === 'SCHEME_QUERY' || intent === 'CROP_QUERY') {
      const retrievedChunks = await retrieve(message, 3);
      if (retrievedChunks && retrievedChunks.length > 0) {
        context = retrievedChunks.map(c => `[Source: ${c.metadata.title}]: ${c.text}`).join('\n\n');
        console.log(`[RAG Context retrieved from ${retrievedChunks.length} chunks]`);
      }
    }

    // Generate reply using Gemini service with context
    const reply = await generateReply(message, history, context);
    console.log(`[${new Date().toISOString()}] Response generated in ${Date.now() - startTime}ms`);

    // Save chat to database
    const savedChat = await Chat.create({
      userId,
      question: message,
      answer: reply,
      language,
    });

    return res.status(200).json({
      success: true,
      reply: reply,
      chat: savedChat,
    });
  } catch (error) {
    console.error('Error generating and saving chat:', error.message);

    // Log the error stack to a local file for diagnosis
    try {
      const fs = await import('fs');
      const logMessage = `[${new Date().toISOString()}] ERROR: ${error.message}\nSTACK: ${error.stack}\n\n`;
      fs.appendFileSync('error.log', logMessage);
    } catch (fsErr) {
      console.error('Failed to write to error.log:', fsErr);
    }

    // Handle invalid city names specifically (404)
    if (error.statusCode === 404) {
      const rawCity = extractCity(message) || 'requested';
      let errReply = `I couldn't find the city "${rawCity}". Please check the spelling and try again.`;
      if (language === 'te-IN') {
        errReply = `నేను "${rawCity}" నగరాన్ని కనుగొనలేకపోయాను. దयచేసి స్పెల్లింగ్ సరిచూసుకొని మళ్ళీ ప్రయత్నించండి.`;
      } else if (language === 'hi-IN') {
        errReply = `मुझे "${rawCity}" शहर नहीं मिला। कृपया वर्तनी (spelling) की जाँच करें और पुन: प्रयास करें।`;
      }

      const savedChat = await Chat.create({
        userId,
        question: message,
        answer: errReply,
        language
      });

      return res.status(200).json({
        success: true,
        reply: errReply,
        chat: savedChat
      });
    }

    if (error.message.includes('API key')) {
      return res.status(500).json({
        success: false,
        error: 'Backend Configuration Error: Gemini API key is missing or invalid. Please check your .env file.',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to generate response from AI assistant. Please try again.',
    });
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
    
    return res.status(200).json({
      success: true,
      chats,
    });
  } catch (error) {
    console.error('Error fetching chat history:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chat history from server',
    });
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
      return res.status(404).json({
        success: false,
        error: 'Chat record not found or unauthorized to delete',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Chat message deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting chat record:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete chat record from server',
    });
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

    return res.status(200).json({
      success: true,
      message: 'Entire chat history cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing chat history:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to clear chat history from server',
    });
  }
};
