import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadImage, analyzeImage, getDiagnosisHistory, getDiagnosisStatistics } from '../controllers/visionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Configure local uploads storage
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

// Enforce security checks on file uploads (mimetypes and sizes)
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB file sizes
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
    }
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error('Invalid file extension. Only JPG, JPEG, PNG, and WebP are allowed.'));
    }
    cb(null, true);
  }
});

// Apply auth protection middleware
router.use(protect);

// POST /api/vision/upload - Store uploaded file on local disk or cloud
router.post('/upload', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
}, uploadImage);

// POST /api/vision/analyze - Proxy to FastAPI, ground with RAG/Weather & Gemini
router.post('/analyze', analyzeImage);

// GET /api/vision/history - Get user diagnosis history
router.get('/history', getDiagnosisHistory);

// GET /api/vision/statistics - Get user diagnostics stats summary
router.get('/statistics', getDiagnosisStatistics);

export default router;
