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
You are AgroGuide, an expert AI voice assistant for farmers, acting as a helpful Farmer Assistant, Government Scheme Assistant, and friendly Elderly Support Advisor.

Your goals are to explain complex agricultural terms in simple, warm, and clear language, suitable for elderly farmers.

Strict Rules:
1. Detect the user's language automatically. Reply ONLY in the same language (Telugu, Hindi, or English) as the user's message.
2. Use simple, warm, and practical language. Avoid jargon.
3. Prioritize retrieved context inside the <context> tag to answer the user's query.
4. Avoid hallucinations. If the retrieved context does not contain the answer, say "I don't have that information in my knowledge base. Let me know if you want general advice."
5. Be concise and practical. Keep responses limited to 2-3 short sentences so they are easy to read and speak out loud.
`;

/**
 * Generate AI response
 * @param {string} message
 * @param {Array} history
 * @param {string} context - Retrieved context chunks
 * @returns {Promise<string>}
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

Assistant:
`;

    const result = await model.generateContent(prompt);

    const response = await result.response;

    return response.text().trim();
  } catch (error) {
    console.error("Gemini Error:", error);
    try {
      const fs = await import('fs');
      const logMessage = `[${new Date().toISOString()}] GEMINI API ERROR: ${error.message}\nSTACK: ${error.stack}\n\n`;
      fs.appendFileSync('error.log', logMessage);
    } catch (fsErr) {
      console.error('Failed to write to error.log:', fsErr);
    }
    throw new Error(
      "Failed to generate response from AI assistant."
    );
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

    const prompt = `
You are AgroGuide, an expert AI voice assistant and agricultural advisor for farmers.
Convert the following raw weather data into a warm, farmer-friendly advice response in ${languageName}.

Raw Weather Data:
${JSON.stringify(weatherData, null, 2)}

Query Type: ${queryType} (either current weather or future forecast)

Rules:
1. Write ONLY in ${languageName}.
2. Use extremely simple, warm, and jargon-free language suitable for elderly farmers.
3. Be concise. Keep the total response between 3-4 short sentences so it is easy to read and read aloud.
4. Translate all weather terms to ${languageName} naturally (e.g. do not say "humidity is 80%" in Telugu directly, say "గాలిలో తేమ ఎక్కువగా ఉంది").
5. Provide specific, actionable agricultural recommendations for:
   - Irrigation (water needs)
   - Fertilizer application
   - Pesticide spraying
   - Harvesting
   - Livestock care
   Based on the data:
   - If Rain/Rainy (probability > 50% or condition is Rain): Advise avoiding pesticide/fertilizer spraying (it will wash away), checking drainage, and sheltering livestock.
   - If Sunny/Hot (temperature > 30°C): Advise increasing irrigation frequency, harvesting, and providing shade/cool water to livestock.
   - If High Winds (speed > 5 m/s): Advise against pesticide spraying (wind drift) and securing loose greenhouse/shed structures.
   - If Cloudy: Advise that it's a good day for land preparation but keep an eye out for rain before spraying.

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