import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Classifies the query using regex rules. Returns null if no rule matches.
 */
function classifyWithRules(message) {
  const msg = message.toLowerCase();
  
  // Weather indicators
  if (
    msg.includes('weather') || 
    msg.includes('rain') || 
    msg.includes('forecast') || 
    msg.includes('temperature') || 
    msg.includes('humidity') ||
    msg.includes('wind') ||
    msg.includes('climate') ||
    msg.includes('storm') ||
    msg.includes('temp') ||
    msg.includes('వాతావరణం') || // Telugu: weather
    msg.includes('వర్షం') ||      // Telugu: rain
    msg.includes('కురుస్తుంది') || // Telugu: falls (rain)
    msg.includes('ఉష్ణోగ్రత') ||   // Telugu: temperature
    msg.includes('గాలి') ||       // Telugu: wind
    msg.includes('తేమ') ||        // Telugu: humidity
    msg.includes('క్లైమేట్') ||    // Telugu: climate
    msg.includes('मौसम') ||        // Hindi: weather
    msg.includes('बारिश') ||       // Hindi: rain
    msg.includes('तापमान') ||       // Hindi: temperature
    msg.includes('हवा') ||         // Hindi: wind
    msg.includes('नमी') ||         // Hindi: humidity
    msg.includes('जलवायु')         // Hindi: climate
  ) {
    return 'WEATHER_QUERY';
  }

  // Scheme indicators
  if (
    msg.includes('pm kisan') || 
    msg.includes('fasal bima') || 
    msg.includes('rythu bharosa') || 
    msg.includes('credit card') || 
    msg.includes('kcc') || 
    msg.includes('soil health') || 
    msg.includes('scheme') ||
    msg.includes('yojana') ||
    msg.includes('పథక') ||       // Telugu: matches పథకం, పథకాలు, పథకాల, etc.
    msg.includes('యोजना')          // Hindi: yojana
  ) {
    return 'SCHEME_QUERY';
  }

  // Crop indicators
  if (
    msg.includes('rice') || 
    msg.includes('cotton') || 
    msg.includes('maize') || 
    msg.includes('groundnut') || 
    msg.includes('tomato') || 
    msg.includes('sugarcane') ||
    msg.includes('cultivation') ||
    msg.includes('pest') ||
    msg.includes('fertilizer') ||
    msg.includes('వరి') ||        // Telugu: rice
    msg.includes('త్తి') ||        // Telugu: cotton
    msg.includes('మొక్కజొన్న') ||   // Telugu: maize
    msg.includes('వేరుశనగ') ||      // Telugu: groundnut
    msg.includes('టమోటా') ||       // Telugu: tomato
    msg.includes('చెరకు') ||        // Telugu: sugarcane
    msg.includes('धान') ||         // Hindi: rice
    msg.includes('कपास') ||        // Hindi: cotton
    msg.includes('मक्का') ||       // Hindi: maize
    msg.includes('मूंगफली') ||      // Hindi: groundnut
    msg.includes('टमाटर') ||       // Hindi: tomato
    msg.includes('गन्ना')          // Hindi: sugarcane
  ) {
    return 'CROP_QUERY';
  }

  // General profiling / greeting indicators
  if (
    msg.includes('who are you') ||
    msg.includes('your name') ||
    msg.includes('hello') ||
    msg.includes('hi') ||
    msg.includes('namaste') ||
    msg.includes('హలో') ||
    msg.includes('నమస్కారం') ||
    msg.includes('नमस्ते')
  ) {
    return 'GENERAL_QUERY';
  }

  return null;
}

// Predefined list of known cities for fast lookup (in English, Telugu, and Hindi)
const CITY_MAPPING = [
  { en: 'vijayawada', te: 'విజయవాడ', hi: 'विजयवाड़ा' },
  { en: 'hyderabad', te: 'హైదరాబాద్', hi: 'हैदराबाद' },
  { en: 'guntur', te: 'గుంటూరు', hi: 'गुंटूर' },
  { en: 'nellore', te: 'నెల్లూరు', hi: 'नेलोर' },
  { en: 'visakhapatnam', te: 'విశాఖపట్నం', hi: 'विशाखापत्तनम' },
  { en: 'kurnool', te: 'కర్నూలు', hi: 'कर्नूल' },
  { en: 'tirupati', te: 'తిరుపతి', hi: 'तिरुपति' },
  { en: 'warangal', te: 'వరంగల్', hi: 'वारंगल' },
  { en: 'delhi', te: 'ఢిల్లీ', hi: 'दिल्ली' },
  { en: 'mumbai', te: 'ముంబై', hi: 'मुंबई' },
  { en: 'bangalore', te: 'బెంగళూరు', hi: 'बैंगलोर' },
  { en: 'bengaluru', te: 'బెంగళూరు', hi: 'बेंगलुरु' },
  { en: 'chennai', te: 'చెన్నై', hi: 'चेन्नई' }
];

/**
 * Helper to extract city names from user query (supporting English, Hindi, and Telugu suffixes)
 * @param {string} message - User query text
 * @returns {string|null} Extracted city name in English or null if not found
 */
export function extractCity(message) {
  if (!message) return null;
  const msg = message.toLowerCase().trim();

  // 1. Direct checks for predefined cities (handles Telugu suffix "లో" (lo) and Hindi "में" (mein) or "का" (ka))
  for (const cityObj of CITY_MAPPING) {
    // English match
    if (msg.includes(cityObj.en)) {
      return cityObj.en.charAt(0).toUpperCase() + cityObj.en.slice(1);
    }
    // Telugu match (e.g. గుంటూరులో, విజయవాడలో)
    if (msg.includes(cityObj.te) || msg.includes(cityObj.te + 'లో')) {
      return cityObj.en.charAt(0).toUpperCase() + cityObj.en.slice(1);
    }
    // Hindi match (e.g. हैदराबाद का, हैदराबाद में)
    if (msg.includes(cityObj.hi)) {
      return cityObj.en.charAt(0).toUpperCase() + cityObj.en.slice(1);
    }
  }

  // 2. Regex fallbacks for English syntax ("weather in Guntur", "weather at Vijayawada")
  const englishPatterns = [
    /\bin\s+([a-zA-Z\s]+)/i,
    /\bat\s+([a-zA-Z\s]+)/i,
    /\bof\s+([a-zA-Z\s]+)/i,
    /([a-zA-Z\s]+)\s+weather/i,
    /([a-zA-Z\s]+)\s+forecast/i
  ];

  for (const pattern of englishPatterns) {
    const match = msg.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim().split(/\s+/)[0]; // get first word
      // Filter out common non-city words that might trigger
      const stopWords = ['today', 'tomorrow', 'this', 'the', 'my', 'your', 'his', 'her', 'a', 'an'];
      if (!stopWords.includes(candidate) && candidate.length > 2) {
        return candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }

  return null;
}

/**
 * Detects if the user query is looking for current weather or a future forecast.
 * @param {string} message - User query text
 * @returns {string} 'forecast' or 'current'
 */
export function detectQueryTime(message) {
  if (!message) return 'current';
  const msg = message.toLowerCase();
  
  if (
    msg.includes('tomorrow') ||
    msg.includes('forecast') ||
    msg.includes('5 day') ||
    msg.includes('next week') ||
    msg.includes('రేపు') || // Telugu: tomorrow
    msg.includes('ముందు చూపు') || // Telugu: forecast/outlook
    msg.includes('कल') || // Hindi: tomorrow
    msg.includes('पूर्वानुमान') // Hindi: forecast
  ) {
    return 'forecast';
  }
  
  return 'current';
}

/**
 * Checks if the user message is about seasonal or yearly rainfall forecasts.
 * @param {string} message - User query text
 * @returns {boolean}
 */
export function isSeasonalQuery(message) {
  if (!message) return false;
  const msg = message.toLowerCase();
  return (
    msg.includes('monsoon') ||
    msg.includes('seasonal') ||
    msg.includes('yearly') ||
    msg.includes('annual') ||
    msg.includes('this year') ||
    msg.includes('year\'s rain') ||
    msg.includes('వర్షాలు') ||        // Telugu: rains
    msg.includes('ఈ సంవత్సరం') ||     // Telugu: this year
    msg.includes('ఈ ఏడాది') ||         // Telugu: this year
    msg.includes('వర్షపాతం') ||      // Telugu: rainfall
    msg.includes('వర్షాకాలం') ||      // Telugu: monsoon/rainy season
    msg.includes('इस साल') ||         // Hindi: this year
    msg.includes('बारिश कैसी') ||      // Hindi: how is rain
    msg.includes('सालाना') ||          // Hindi: yearly
    msg.includes('मानसून')            // Hindi: monsoon
  );
}

const STATE_MAPPING = [
  { en: 'Andhra Pradesh', aliases: ['andhra pradesh', 'andhra', 'ap', 'ఆంధ్ర ప్రదేశ్', 'ఆంధ్రప్రదేశ్', 'ఆంధ్ర', 'आंध्र प्रदेश', 'आंध्र'] },
  { en: 'Telangana', aliases: ['telangana', 'ts', 'తెలంగాణ', 'తెలంగాణలో', 'तेलंगाना'] },
  { en: 'Maharashtra', aliases: ['maharashtra', 'మహారాష్ట్ర', 'महाराष्ट्र', 'महारष्ट्र'] },
  { en: 'Karnataka', aliases: ['karnataka', 'కర్ణాటక', 'कर्नाटक', 'कर्नाटका'] },
  { en: 'Tamil Nadu', aliases: ['tamil nadu', 'tamilnadu', 'తమిళనాడు', 'तमिलनाडु', 'तमिल नाडु'] },
  { en: 'Uttar Pradesh', aliases: ['uttar pradesh', 'up', 'ఉత్తర ప్రదేశ్', 'उत्तर प्रदेश', 'यूपी'] },
  { en: 'Punjab', aliases: ['punjab', 'పంజాబ్', 'पंजाब'] }
];

/**
 * Helper to extract Indian state names from query (supporting English, Hindi, and Telugu aliases/suffixes)
 * @param {string} message - User query text
 * @returns {string|null} Extracted state name in English or null if not found
 */
export function extractState(message) {
  if (!message) return null;
  const msg = message.toLowerCase().trim();

  for (const stateObj of STATE_MAPPING) {
    for (const alias of stateObj.aliases) {
      if (msg.includes(alias)) {
        return stateObj.en;
      }
    }
  }

  // Regex check for "state of X" or "in X" where X might be a state
  const statePatterns = [
    /state\s+of\s+([a-zA-Z\s]+)/i,
    /in\s+([a-zA-Z\s]+)/i,
    /([a-zA-Z\s]+)\s+monsoon/i
  ];

  for (const pattern of statePatterns) {
    const match = msg.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim().split(/\s+/)[0];
      // Check if candidate matches any known state name partially
      for (const stateObj of STATE_MAPPING) {
        if (stateObj.en.toLowerCase().includes(candidate.toLowerCase()) && candidate.length > 3) {
          return stateObj.en;
        }
      }
    }
  }

  return null;
}

/**
 * Route the user request to determine the appropriate intent
 * @param {string} message - User query text
 * @returns {Promise<string>} Intent classification: SCHEME_QUERY, CROP_QUERY, WEATHER_QUERY, or GENERAL_QUERY
 */
export async function detectIntent(message) {
  // 1. Fast regex classification
  const ruleIntent = classifyWithRules(message);
  if (ruleIntent) {
    console.log(`🤖 Intent Router: Rules-based match: ${ruleIntent} for "${message}"`);
    return ruleIntent;
  }

  // 2. Fallback to Gemini classifier
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.1,
      }
    });

    const classificationPrompt = `
You are an intent classifier for a smart agricultural voice assistant named AgroGuide.
Categorize the incoming user query into exactly one of these categories:
- SCHEME_QUERY: Questions about agricultural subsidies, benefits, or government schemes (e.g. PM Kisan, Rythu Bharosa, Fasal Bima).
- CROP_QUERY: Questions about farming tips, sowing, watering, spacing, or pest control for specific crops.
- WEATHER_QUERY: Questions about weather forecasts, rainfall, climate, temperature, or moisture.
- GENERAL_QUERY: General greetings, identity questions ("who are you"), chit-chat, or questions not covered by the other categories.

Respond with ONLY the category name (e.g. CROP_QUERY). Do not write any other words.

User Query: "${message}"

Category:`;

    const result = await model.generateContent(classificationPrompt);
    const response = await result.response;
    const cleanedIntent = response.text().trim().toUpperCase();

    const validIntents = ['SCHEME_QUERY', 'CROP_QUERY', 'WEATHER_QUERY', 'GENERAL_QUERY'];
    if (validIntents.includes(cleanedIntent)) {
      console.log(`🤖 Intent Router: Gemini match: ${cleanedIntent} for "${message}"`);
      return cleanedIntent;
    }
  } catch (error) {
    console.error("Intent Router error:", error);
  }

  console.log(`🤖 Intent Router: Fallback to GENERAL_QUERY for "${message}"`);
  return 'GENERAL_QUERY';
}
