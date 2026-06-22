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
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    maxOutputTokens: 150,
    temperature: 0.7,
  }
});

// System Prompt
const SYSTEM_PROMPT = `
You are a friendly AI voice assistant.

Rules:
1. Detect the user's language automatically.
2. Reply only in the same language as the user's message.
3. Never translate unless explicitly requested.
4. Keep responses short and conversational.
5. Be helpful and polite.
6. If the user writes Telugu, respond in Telugu.
7. If the user writes Hindi, respond in Hindi.
8. If the user writes English, respond in English.
9. Support all major Indian languages.
10. Limit normal responses to 2-3 sentences.
`;

/**
 * Generate AI response
 * @param {string} message
 * @param {Array} history
 * @returns {Promise<string>}
 */
export async function generateReply(message, history = []) {
  try {
    const conversationHistory = history
      .map((msg) => {
        const role = msg.role === "user" ? "User" : "Assistant";
        return `${role}: ${msg.text || msg.message || ""}`;
      })
      .join("\n");

    const prompt = `
${SYSTEM_PROMPT}

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