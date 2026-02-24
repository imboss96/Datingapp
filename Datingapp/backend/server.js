import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import chatsRoutes from './routes/chats.js';
import reportsRoutes from './routes/reports.js';
import uploadRoutes from './routes/upload.js';
import transactionsRoutes from './routes/transactions.js';
import matchesRoutes from './routes/matches.js';
import verificationRoutes from './routes/verification.js';
import emailVerificationRoutes from './routes/emailVerification.js';
import moderationRoutes from './routes/moderation.js';
import pushRoutes from './routes/push.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initCloudinary } from './utils/cloudinary.js';
import { initWebSocket } from './utils/websocket.js';
import lipanaRoutes from './routes/lipana.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
initCloudinary();

const app = express();
const PORT = process.env.PORT || 5000;
// Use MONGODB_URI from environment variables only. Set this in .env or .env.production
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
// CORS_ORIGIN should be set in .env or .env.production as a comma-separated list of allowed origins, e.g.:
// CORS_ORIGIN=https://lunesalove.com,https://www.lunesalove.com
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3001', 'http://localhost:5173'],
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✓ Connected to MongoDB');
  
  // Fix: Drop problematic unique index on messages.id that prevents chat creation
  try {
    const db = mongoose.connection.db;
    if (db) {
      const collection = db.collection('chats');
      const indexes = await collection.indexes();
      const badIndex = indexes.find(idx => Object.keys(idx.key).includes('messages.id'));
      if (badIndex) {
        console.log('[FIX] Dropping problematic index on messages.id...');
        await collection.dropIndex(badIndex.name);
        console.log('[SUCCESS] Dropped index:', badIndex.name);
      }
    }
  } catch (err) {
    console.warn('[WARN] Could not drop index (may not exist):', err.message);
  }
})
.catch((err) => {
  console.error('✗ MongoDB connection error:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationRoutes);  // Email verification
app.use('/api/email-verification', emailVerificationRoutes);
app.use('/api/users', usersRoutes);  // Auth middleware applied selectively in users.js
app.use('/api/chats', authMiddleware, chatsRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/matches', authMiddleware, matchesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/transactions', transactionsRoutes);  // Auth middleware applied selectively in transactions.js
app.use('/api/moderation', authMiddleware, moderationRoutes);  // Moderator-only routes
app.use('/api/push', authMiddleware, pushRoutes);
app.use('/api/lipana', lipanaRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend running', timestamp: new Date().toISOString() });
});

// 404 handler - for undefined routes
app.use(notFoundHandler);

// Error handling middleware - MUST be last
app.use(errorHandler);

// Create HTTP server and attach WebSocket
const server = createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ WebSocket available at ws://localhost:${PORT}`);
});
