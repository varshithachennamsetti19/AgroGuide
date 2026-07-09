/**
 * Unified LLM Provider Abstraction & Model Router (Phase 11)
 * Manages configuration-based provider switching, dynamic task-oriented model routing,
 * and automatic failover from local GPU vLLM inference to cloud Gemini.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'gemini';
const VLLM_API_BASE = process.env.VLLM_API_BASE || 'http://localhost:8000/v1';

// Initialize Gemini components
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// System Prompt from AgroGuide specification
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
 * Model Router - dynamically selects model name based on task type and provider
 * @param {string} taskType - 'general', 'disease', or 'translation'
 * @returns {string} Model name
 */
export function selectModelForTask(taskType) {
  if (LLM_PROVIDER === 'gemini') {
    // For Gemini, select model family members
    if (taskType === 'disease') return 'gemini-2.5-pro'; // Use large model for plant diagnostics
    return 'gemini-2.5-flash'; // Use small model for general chats / translation
  }

  // For vLLM, select configured open-source LLMs running on GPU
  if (taskType === 'disease') {
    return process.env.VLLM_MODEL_LARGE || 'Qwen/Qwen2-72B-Instruct'; // Large Model
  } else if (taskType === 'translation') {
    return process.env.VLLM_MODEL_MEDIUM || 'mistralai/Mistral-7B-Instruct-v0.2'; // Medium Model
  } else {
    return process.env.VLLM_MODEL_SMALL || 'meta-llama/Meta-Llama-3-8B-Instruct'; // Small Model
  }
}

/**
 * Log failover incident details to error log
 */
function logFailover(serviceName, errorMessage) {
  console.warn(`⚠️ FAILOVER TRIGGERED: ${serviceName} failed. Falling back to Gemini. Reason: ${errorMessage}`);
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [LLM FAILOVER] ${serviceName} failed: ${errorMessage}. Redirected request to Gemini API.\n`;
    fs.appendFileSync('error.log', logEntry, 'utf8');
  } catch (err) {
    console.error('Failed to write failover logs:', err.message);
  }
}

/**
 * Format system and conversation variables into a unified prompt
 */
function formatPrompt(message, history = [], context = "") {
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

  return `
${SYSTEM_PROMPT}

${contextSection}

Conversation History:
${conversationHistory}

Current User Message:
${message}

Assistant (Output in JSON format with fields "reply" and "confidence"):
`;
}

/**
 * Generate completion reply from Gemini
 */
async function generateGeminiReply(message, history = [], context = "", modelName = "gemini-2.5-flash") {
  if (!genAI) {
    throw new Error("Gemini API key is not configured.");
  }
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: 0.7,
    }
  });

  const prompt = formatPrompt(message, history, context);
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
}

/**
 * Generate completion reply from vLLM Server
 */
async function generateVllmReply(message, history = [], context = "", modelName) {
  const prompt = formatPrompt(message, history, context);
  const url = `${VLLM_API_BASE}/chat/completions`;

  const response = await axios.post(url, {
    model: modelName,
    messages: [
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 1000,
    response_format: { type: "json_object" }
  }, {
    timeout: 15000 // 15 seconds timeout
  });

  const contentStr = response.data.choices[0].message.content.trim();
  const data = JSON.parse(contentStr);
  
  return {
    text: data.reply || data.text || "",
    confidence: typeof data.confidence === 'number' ? data.confidence : 85
  };
}

/**
 * Exposes the standard generation function with automatic failover logic
 */
export async function generateReply(message, history = [], context = "", taskType = "general") {
  const modelName = selectModelForTask(taskType);

  if (LLM_PROVIDER === 'vllm') {
    try {
      console.log(`[LLM Router] Routing request to vLLM model: ${modelName}`);
      return await generateVllmReply(message, history, context, modelName);
    } catch (error) {
      logFailover(`vLLM (${modelName})`, error.message);
      // Automatic fallback to Gemini
      const geminiModel = selectModelForTask(taskType) === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
      return await generateGeminiReply(message, history, context, geminiModel);
    }
  }

  // Default: Gemini API
  return await generateGeminiReply(message, history, context, modelName);
}

/**
 * Generate streaming generator from vLLM
 */
async function* streamvLLM(prompt, modelName) {
  const url = `${VLLM_API_BASE}/chat/completions`;
  const response = await axios.post(url, {
    model: modelName,
    messages: [
      { role: 'user', content: prompt }
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 1000
  }, {
    responseType: 'stream',
    timeout: 10000
  });

  let buffer = '';
  for await (const chunk of response.data) {
    buffer += chunk.toString('utf8');
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep last incomplete line in buffer

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;
      if (cleanLine === 'data: [DONE]') continue;
      if (cleanLine.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(cleanLine.slice(6));
          const text = parsed.choices?.[0]?.delta?.content || '';
          if (text) {
            yield { text: () => text };
          }
        } catch (err) {
          // Ignore parse errors for partial buffer pieces
        }
      }
    }
  }
}

/**
 * Generate streaming generator from Gemini
 */
async function* streamGemini(prompt, modelName = "gemini-2.5-flash") {
  if (!genAI) {
    throw new Error("Gemini API key is not configured.");
  }
  const model = genAI.getGenerativeModel({ model: modelName });
  const resultStream = await model.generateContentStream(prompt);
  
  for await (const chunk of resultStream.stream) {
    yield chunk;
  }
}

/**
 * Exposes SSE streaming text generation with automatic connection failover
 */
export async function generateReplyStream(message, history = [], context = "", taskType = "general") {
  const prompt = formatPrompt(message, history, context);
  const modelName = selectModelForTask(taskType);

  if (LLM_PROVIDER === 'vllm') {
    try {
      console.log(`[LLM Router] Routing stream request to vLLM (Model: ${modelName})`);
      const stream = streamvLLM(prompt, modelName);
      
      // Probe-verify the vLLM stream connection by requesting the first chunk
      const iterator = stream[Symbol.asyncIterator]();
      const firstResult = await iterator.next();
      
      // If we made it here, local vLLM is online. Reassemble and return.
      async function* reassembledStream() {
        if (!firstResult.done) {
          yield firstResult.value;
        }
        for await (const val of stream) {
          yield val;
        }
      }
      return { stream: reassembledStream() };
    } catch (error) {
      logFailover(`vLLM Stream (${modelName})`, error.message);
      const geminiModel = selectModelForTask(taskType) === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
      return { stream: streamGemini(prompt, geminiModel) };
    }
  }

  // Default: Gemini API streaming
  return { stream: streamGemini(prompt, modelName) };
}

/**
 * Generate a farmer-friendly weather summary and actionable recommendations
 */
export async function generateWeatherSummary(weatherData, queryType, langCode) {
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
   - Heavy Rain (Rain/Drizzle/Thunderstorm or high rainfall/precipitation probability): Advise avoiding fertilizer application and pesticide spraying. Recommend checking drainage in fields and sheltering livestock.
   - High Temperature (temperature > 30°C): Advise increasing irrigation frequency, protecting young crops, and providing shade/cool water to livestock.
   - Strong Wind (wind speed > 5 m/s): Advise avoiding chemical/pesticide spraying due to wind drift.
   - Sunny/Clear: Advise that it is a good day for harvesting and drying crops.

Response:
`;

  const modelName = selectModelForTask("general");

  if (LLM_PROVIDER === 'vllm') {
    try {
      console.log(`[LLM Router] Routing weather summary to vLLM (Model: ${modelName})`);
      const response = await axios.post(`${VLLM_API_BASE}/chat/completions`, {
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 500
      }, { timeout: 10000 });
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      logFailover(`vLLM Weather Summary (${modelName})`, error.message);
    }
  }

  // Fallback / default: Gemini
  if (!genAI) throw new Error("Gemini API key is not configured.");
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

/**
 * Generate a highly personalized daily farm overview and advice based on profile and weather
 */
export async function generateDailyFarmOverview(weather, profile, langCode) {
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

  const modelName = selectModelForTask("general");

  if (LLM_PROVIDER === 'vllm') {
    try {
      console.log(`[LLM Router] Routing farm overview to vLLM (Model: ${modelName})`);
      const response = await axios.post(`${VLLM_API_BASE}/chat/completions`, {
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 500
      }, { timeout: 10000 });
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      logFailover(`vLLM Farm Overview (${modelName})`, error.message);
    }
  }

  // Fallback / default: Gemini
  if (!genAI) return "Unable to generate personalized recommendation feed. Please check your credentials.";
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}
