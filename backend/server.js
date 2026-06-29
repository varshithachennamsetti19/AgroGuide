import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import chatRouter from './routes/chat.js';
import authRouter from './routes/auth.js';
import weatherRouter from './routes/weatherRoutes.js';
import { initializeRetriever } from './rag/retriever.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB Atlas
connectDB();

// Initialize Local RAG Vector Store
initializeRetriever();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with support for cookies (credentials)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Middleware to parse cookies
app.use(cookieParser());

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/weather', weatherRouter);
app.use('/api', chatRouter);

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Voice Assistant Backend' });
});

// Start listening
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 AgroGuide Multilingual Assistant Server is running!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`===================================================`);
});
