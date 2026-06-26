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
    msg.includes('వాతావరణం') || // Telugu: weather
    msg.includes('వర్షం') ||      // Telugu: rain
    msg.includes('मौसम') ||        // Hindi: weather
    msg.includes('बारिश')          // Hindi: rain
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
