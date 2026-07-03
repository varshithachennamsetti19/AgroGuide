import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadImage, analyzeImage, getDiagnosisHistory, getDiagnosisStatistics } from '../controllers/visionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Configure local uploads storage (Part 14)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Apply auth protection middleware
router.use(protect);

// POST /api/vision/upload - Store uploaded file on local disk
router.post('/upload', upload.single('image'), uploadImage);

// POST /api/vision/analyze - Proxy to FastAPI, ground with RAG/Weather & Gemini
router.post('/analyze', analyzeImage);

// GET /api/vision/history - Get user diagnosis history
router.get('/history', getDiagnosisHistory);

// GET /api/vision/statistics - Get user diagnostics stats summary
router.get('/statistics', getDiagnosisStatistics);

export default router;
