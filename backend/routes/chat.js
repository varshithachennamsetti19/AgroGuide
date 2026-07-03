import express from 'express';
import {
  generateAndSaveChat,
  generateAndSaveChatStream,
  getHistory,
  deleteChat,
  clearHistory
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import { validateInput } from '../middleware/inputValidator.js';
import { chatRateLimiter } from '../middleware/rateLimiter.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Apply auth middleware to protect all chat routes
router.use(protect);

// POST /api/chat - Generate Gemini response, run security checks and save
router.post('/chat', chatRateLimiter, validateInput, generateAndSaveChat);

// POST /api/chat/stream - Generate and stream Gemini response chunk by chunk (Phase 8)
router.post('/chat/stream', chatRateLimiter, validateInput, generateAndSaveChatStream);

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

// --- NOTIFICATION CENTER ROUTES (Phase 8) ---
// GET /api/notifications - Get all user notifications
router.get('/notifications', async (req, res) => {
  try {
    const list = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, notifications: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/notifications/read-all - Mark all user notifications as read
router.put('/notifications/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id }, { isRead: true });
    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true });
    res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
