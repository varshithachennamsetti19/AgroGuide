import express from 'express';
import { generateReply } from '../services/gemini.js';

const router = express.Router();

// POST /api/chat
router.post('/chat', async (req, res) => {
  const { message, history } = req.body;

  // Validate request body
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Message parameter is required and must be a string.'
    });
  }

  console.log(`[${new Date().toISOString()}] Incoming chat request: "${message}"`);
  const startTime = Date.now();
  try {
    // Generate reply using Gemini service
    const reply = await generateReply(message, history);
    console.log(`[${new Date().toISOString()}] Response generated in ${Date.now() - startTime}ms`);

    return res.status(200).json({
      success: true,
      reply: reply
    });
  } catch (error) {
    console.error('Error handling chat route:', error.message);
    
    // Provide a helpful message if the API key is not configured
    if (error.message.includes('API key')) {
      return res.status(500).json({
        success: false,
        error: 'Backend Configuration Error: Gemini API key is missing or invalid. Please check your .env file.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to generate response from AI assistant. Please try again.'
    });
  }
});

export default router;
