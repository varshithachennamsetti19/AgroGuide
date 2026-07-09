import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import connectDB from './config/db.js';
import chatRouter from './routes/chat.js';
import authRouter from './routes/auth.js';
import weatherRouter from './routes/weatherRoutes.js';
import farmRouter from './routes/farmRoutes.js';
import dashboardRouter from './routes/dashboardRoutes.js';
import adminRouter from './routes/admin.js'; // Phase 8 Admin
import visionRouter from './routes/vision.js'; // Phase 9 Vision
import { initializeRetriever } from './rag/retriever.js';

// Phase 8 Background Processing & Caching
import { startSchedulers } from './schedulers/cronJobs.js';
import { startWorkers } from './workers/queueWorkers.js';

// Phase 10: Production middleware & metrics
import { requestLogger } from './middleware/loggingMiddleware.js';
import { csrfProtection } from './middleware/csrf.js';
import { register } from './monitoring/performance.js';

// Load environment variables
dotenv.config();

const RUN_API = process.env.RUN_API !== 'false';
const RUN_SCHEDULERS = process.env.RUN_SCHEDULERS !== 'false';
const RUN_WORKERS = process.env.RUN_WORKERS !== 'false';

// Connect to MongoDB Atlas
connectDB();

// Initialize Local RAG Vector Store
initializeRetriever();

// Initialize and start background schedulers & queue workers conditionally
if (RUN_SCHEDULERS) {
  startSchedulers();
}
if (RUN_WORKERS) {
  startWorkers();
}

const app = express();
const PORT = process.env.PORT || 5000;

// Load Swagger document (Phase 10)
const swaggerDocument = JSON.parse(
  fs.readFileSync(new URL('./swagger.json', import.meta.url))
);

// 1. Structured logging (must be mounted first to time requests accurately)
app.use(requestLogger);

// 2. Helmet production security headers
app.use(helmet());

// 3. Enable CORS with support for credentials (cookies)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

// 4. Middleware to parse cookies
app.use(cookieParser());

// 5. CSRF Protection Middleware
app.use(csrfProtection);

// 6. API Rate Limiting (Phase 10)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again in 15 minutes.'
  }
});
app.use('/api', apiLimiter);

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Serve uploads static assets (Phase 9)
app.use('/uploads', express.static(path.resolve('uploads')));

// Mount Swagger API Documentation Route (Phase 10)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Prometheus scraping metrics route
app.get('/metrics', async (req, res) => {
  try {
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/farms', farmRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin', adminRouter); // Phase 8 Admin Router
app.use('/api/vision', visionRouter); // Phase 9 Vision Router
app.use('/api', chatRouter);

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Voice Assistant Backend' });
});

// Start listening conditionally based on service configuration
if (RUN_API) {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`🚀 AgroGuide Multilingual Assistant Server is running!`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
    console.log(`📚 Swagger Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`📊 Prometheus Metrics: http://localhost:${PORT}/metrics`);
    console.log('===================================================');
  });
} else {
  console.log(`===================================================`);
  console.log(`🚀 AgroGuide Worker Instance is running!`);
  console.log(`🔧 RUN_WORKERS: ${RUN_WORKERS}, RUN_SCHEDULERS: ${RUN_SCHEDULERS}`);
  console.log('===================================================');
}
