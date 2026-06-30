import express from 'express';
import { getDashboardStatus } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication shield
router.use(protect);

router.get('/status', getDashboardStatus);

export default router;
