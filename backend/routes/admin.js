import express from 'express';
import { getAdminMetrics, forceTriggerCronJobs } from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply session check
router.use(protect);

// GET /api/admin/metrics
router.get('/metrics', getAdminMetrics);

// POST /api/admin/trigger-jobs
router.post('/trigger-jobs', forceTriggerCronJobs);

export default router;
