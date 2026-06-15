import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all requests (or customize for frontend development port)
app.use(cors({
  origin: '*', // In production, customize this to your frontend URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Mount API routes
app.use('/api', chatRouter);

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Voice Assistant Backend' });
});

// Start listening
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 Multilingual AI Assistant Server is running!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`===================================================`);
});
