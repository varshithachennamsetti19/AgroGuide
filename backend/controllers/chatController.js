import { generateReply } from '../services/gemini.js';
import Chat from '../models/Chat.js';

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
  const { message, history } = req.body;
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

  try {
    // Generate reply using Gemini service
    const reply = await generateReply(message, history);
    console.log(`[${new Date().toISOString()}] Response generated in ${Date.now() - startTime}ms`);

    // Detect language of the query
    const language = detectLanguage(message);

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
