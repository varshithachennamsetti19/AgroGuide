import express from 'express';
import { generateAndSaveChat, getHistory, deleteChat, clearHistory } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to protect all chat routes
router.use(protect);

// POST /api/chat - Generate Gemini response and save to MongoDB
router.post('/chat', generateAndSaveChat);

// GET /api/chat/history - Get all chats for the logged-in user
router.get('/chat/history', getHistory);

// DELETE /api/chat/history - Delete all chats for the logged-in user
router.delete('/chat/history', clearHistory);

// DELETE /api/chat/:id - Delete a specific chat by ID
router.delete('/chat/:id', deleteChat);

export default router;
