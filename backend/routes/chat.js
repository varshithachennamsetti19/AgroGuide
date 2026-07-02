import express from 'express';
import { generateAndSaveChat, getHistory, deleteChat, clearHistory } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import { validateInput } from '../middleware/inputValidator.js';
import { chatRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply auth middleware to protect all chat routes
router.use(protect);

// POST /api/chat - Generate Gemini response, run security checks and save
router.post('/chat', chatRateLimiter, validateInput, generateAndSaveChat);

// POST /api/chat/upload - Stub endpoint for future image-based crop disease diagnosis
router.post('/chat/upload', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Image upload pipeline ready. Crop image analysis and visual disease diagnostics will be supported in the next phase.',
    stub: true
  });
});

// GET /api/chat/history - Get all chats for the logged-in user
router.get('/chat/history', getHistory);

// DELETE /api/chat/history - Delete all chats for the logged-in user
router.delete('/chat/history', clearHistory);

// DELETE /api/chat/:id - Delete a specific chat by ID
router.delete('/chat/:id', deleteChat);

export default router;
