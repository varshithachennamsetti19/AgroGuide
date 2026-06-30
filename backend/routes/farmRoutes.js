import express from 'express';
import { getFarms, createFarm, updateFarm, deleteFarm } from '../controllers/farmController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication shield
router.use(protect);

router.route('/')
  .get(getFarms)
  .post(createFarm);

router.route('/:id')
  .put(updateFarm)
  .delete(deleteFarm);

export default router;
