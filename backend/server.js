import express from 'express';
import cors from 'cors';
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
import { authMiddleware } from './middleware/auth.js';
import { initCloudinary } from './utils/cloudinary.js';
import { initWebSocket } from './utils/websocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
initCloudinary();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spark-dating';

// Middleware
app.use(cors());
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
app.use('/api/users', usersRoutes);  // Auth middleware applied selectively in users.js
app.use('/api/chats', authMiddleware, chatsRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/transactions', transactionsRoutes);  // Auth middleware applied selectively in transactions.js

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Create HTTP server and attach WebSocket
const server = createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ WebSocket available at ws://localhost:${PORT}`);
});
