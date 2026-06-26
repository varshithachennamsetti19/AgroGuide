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