import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

// Check if API key exists
if (!apiKey) {
  console.warn(
    "WARNING: GEMINI_API_KEY is missing. Add it to backend/.env"
  );
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    maxOutputTokens: 1000,
    temperature: 0.7,
  }
});

// System Prompt
const SYSTEM_PROMPT = `
You are AgroGuide, a personalized AI farming assistant, expert Agricultural Weather Advisor, and crop protection helper.

Your goals are to explain agricultural matters in simple, warm, and clear language, suitable for farmers, adapting strictly to their unique profiles.

Strict Rules:
1. Detect the user's language automatically. Reply ONLY in the same language (Telugu, Hindi, Tamil, or English) as the user's message.
2. Use simple, warm, and practical language. Avoid technical jargon.
3. Prioritize personalizing your response based on the farmer's profile context (Primary Crop, Crop Stage, Soil, Irrigation, Location, Weather) and retrieved knowledge base <context>. Never provide generic farming advice when farmer profile data is available.
4. If the farmer describes crop disease symptoms (e.g., spots, pests, wilting):
   - Suggest 1-2 likely diseases based on the symptoms and their crop.
   - Outline immediate natural or chemical precautions.
   - Advise checking with a local agricultural extension officer or expert to verify, emphasizing that you cannot make absolute diagnoses.
5. Be concise and practical. Keep responses limited to 2-3 short sentences so they are easy to read and speak out loud.
6. Rate your internal confidence score (0 to 100) based on how relevant and complete the retrieved context or profile data is to solve the farmer's query. If you have direct matches in the retrieved context, confidence should be 95-100%. If you must make minor generalizations, 75-94%. If context is weak or missing, below 50%.
`;

/**
 * Generate AI response with confidence rating
 * @param {string} message
 * @param {Array} history
 * @param {string} context - Retrieved context chunks
 * @returns {Promise<Object>} { text: string, confidence: number }
 */
export async function generateReply(message, history = [], context = "") {
  try {
    const conversationHistory = history
      .map((msg) => {
        const role = msg.role === "user" ? "User" : "Assistant";
        return `${role}: ${msg.text || msg.message || ""}`;
      })
      .join("\n");

    const contextSection = context ? `
Retrieved Context (Knowledge Base Grounding):
<context>
${context}
</context>
` : '';

    const prompt = `
${SYSTEM_PROMPT}

${contextSection}

Conversation History:
${conversationHistory}

Current User Message:
${message}

Assistant (Output in JSON format with fields "reply" and "confidence"):
`;

    const result = await model.generateContent({
      contents: prompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            reply: { type: "string", description: "The localized, simple farming advice." },
            confidence: { type: "integer", description: "Internal confidence rating percentage (0-100) based on context adequacy." }
          },
          required: ["reply", "confidence"]
        }
      }
    });

    const response = await result.response;
    const jsonStr = response.text().trim();
    const data = JSON.parse(jsonStr);

    return {
      text: data.reply || "",
      confidence: typeof data.confidence === 'number' ? data.confidence : 85
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    try {
      const fs = await import('fs');
      const logMessage = `[${new Date().toISOString()}] GEMINI API ERROR: ${error.message}\nSTACK: ${error.stack}\n\n`;
      fs.appendFileSync('error.log', logMessage);
    } catch (fsErr) {
      console.error('Failed to write to error.log:', fsErr);
    }
    
    // Fallback response on error
    return {
      text: "I'm sorry, but I encountered an issue processing your request. Please try again.",
      confidence: 50
    };
  }
}

/**
 * Generate a farmer-friendly weather summary and actionable recommendations
 * @param {Object} weatherData - Raw weather JSON from weatherService
 * @param {string} queryType - 'current' or 'forecast'
 * @param {string} langCode - 'en-US', 'te-IN', or 'hi-IN'
 * @returns {Promise<string>} Farmer-friendly advice in the requested language
 */
export async function generateWeatherSummary(weatherData, queryType, langCode) {
  try {
    let languageName = "English";
    if (langCode === 'te-IN') languageName = "Telugu";
    if (langCode === 'hi-IN') languageName = "Hindi";
    if (langCode === 'ta-IN') languageName = "Tamil";

    const prompt = `
You are AgroGuide.
You are an Agricultural Weather Advisor.
Explain the weather in simple, warm language.
Provide farmer-friendly recommendations.

Raw Weather Data:
${JSON.stringify(weatherData, null, 2)}

Query Type: ${queryType}

Rules:
1. Write ONLY in ${languageName}.
2. Always respond in the same language as the user (which is ${languageName}).
3. Use extremely simple, warm, and jargon-free language suitable for elderly farmers.
4. Keep the total response short (3-4 sentences maximum) so it is easy to read and read aloud.
5. Provide specific, actionable agricultural recommendations for:
   - Irrigation (watering needs)
   - Fertilizer timing
   - Harvest timing
   - Pesticide spraying
   - Livestock care
   Based on the weather data:
   - Heavy Rain (Rain/Drizzle/Thunderstorm or high rainfall/precipitation probability): Advise avoiding fertilizer application and pesticide spraying (since it will wash away). Recommend checking drainage in fields and sheltering livestock.
   - High Temperature (temperature > 30°C): Advise increasing irrigation frequency, protecting young crops, and providing shade/cool water to livestock.
   - Strong Wind (wind speed > 5 m/s): Advise avoiding chemical/pesticide spraying due to wind drift.
   - Sunny/Clear: Advise that it is a good day for harvesting and drying crops.

Response:
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini Weather Summary Error:", error);
    throw new Error("Failed to generate weather summary.");
  }
}

/**
 * Generate a highly personalized daily farm overview and advice based on profile and weather
 * @param {Object} weather - Raw weather JSON
 * @param {Object} profile - User profile document/object
 * @param {string} langCode - Language code
 */
export async function generateDailyFarmOverview(weather, profile, langCode) {
  try {
    let languageName = "English";
    if (langCode === 'te-IN') languageName = "Telugu";
    if (langCode === 'hi-IN') languageName = "Hindi";
    if (langCode === 'ta-IN') languageName = "Tamil";

    const prompt = `
You are AgroGuide, the expert Agricultural Weather Advisor.
Provide a highly personalized daily recommendation feed for a farmer with the following profile:

Farmer Location: ${profile.village}, ${profile.district}, ${profile.state}
Primary Crop: ${profile.primaryCrop}
Current Stage: ${profile.cropStage || 'Vegetative'}
Soil Type: ${profile.soilType || 'Loamy'}
Water Source: ${profile.waterSource || 'Borewell'}
Irrigation Method: ${profile.irrigationMethod || 'Drip'}
Farming Experience: ${profile.experienceYears || 5} years
Farming Type: ${profile.farmingType || 'Traditional'}

Current Weather:
${JSON.stringify(weather, null, 2)}

Rules:
1. Write ONLY in ${languageName}. Always match the language.
2. Be extremely concise. Keep the total response to 3 short sentences.
3. Tailor the advice exactly to the combination of Crop (${profile.primaryCrop}), Stage (${profile.cropStage}), Soil (${profile.soilType}), and Weather conditions:
   - If Heavy Rain is forecast or happening (Condition like Rain/Drizzle or probability > 50%): Advise avoiding chemical/fertilizer/pesticide spraying (to prevent run-off), ensuring drainage, and postponing irrigation.
   - If High Temperature (>30°C) and dry: Advise increasing watering frequency (mention their irrigation method: ${profile.irrigationMethod || 'Drip'}), protecting young plants, and avoiding sprays during hot noon hours.
   - If Strong Winds (>5 m/s): Advise avoiding chemical spraying (wind drift) and supporting tall crop stalks.
   - If Sunny and Moderate: Advise it's an excellent day for harvesting, weeding, and drying crops.
4. Keep the tone warm, friendly, and supportive, like a local village elder.

Response:
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini Farm Overview Error:", error);
    return "Unable to generate personalized recommendation. Please verify your internet connection or try again.";
  }
}

/**
 * Generate AI response as stream (Phase 8)
 * @param {string} message
 * @param {Array} history
 * @param {string} context - Grounding context
 */
export async function generateReplyStream(message, history = [], context = "") {
  const conversationHistory = history
    .map((msg) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      return `${role}: ${msg.text || msg.message || ""}`;
    })
    .join("\n");

  const contextSection = context ? `
Retrieved Context (Knowledge Base Grounding):
<context>
${context}
</context>
` : '';

  const prompt = `
${SYSTEM_PROMPT}

${contextSection}

Conversation History:
${conversationHistory}

Current User Message:
${message}

Assistant (Respond with plain text only, no JSON wrapper structures):
`;

  return model.generateContentStream(prompt);
}