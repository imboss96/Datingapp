import express from 'express';
import httpProxy from 'http-proxy';
import dotenv from 'dotenv';
import { createServer } from 'http';

dotenv.config();

const PROXY_PORT = process.env.PROXY_PORT || 8000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

console.log('\n🔄 Reverse Proxy Configuration:');
console.log(`   Backend:  ${BACKEND_URL}`);
console.log(`   Frontend: ${FRONTEND_URL}`);
console.log(`   Listening on port ${PROXY_PORT}\n`);

// Create proxy instances
const backendProxy = httpProxy.createProxyServer({
  target: BACKEND_URL,
  changeOrigin: true,
  ws: true,
});

const frontendProxy = httpProxy.createProxyServer({
  target: FRONTEND_URL,
  changeOrigin: true,
});

// Error handling
backendProxy.on('error', (err, req, res) => {
  console.error('[BACKEND ERROR]', err.message);
  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Backend unavailable' }));
  }
});

frontendProxy.on('error', (err, req, res) => {
  console.error('[FRONTEND ERROR]', err.message);
  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Frontend unavailable' }));
  }
});

// Create Express app and HTTP server
const app = express();
app.use(express.json());

const server = createServer((req, res) => {
  console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${req.method} ${req.url}`);
  
  if (req.url.startsWith('/api')) {
    // Route API requests to backend
    backendProxy.web(req, res, { ignorePath: false });
  } else {
    // Route everything else to frontend
    frontendProxy.web(req, res, { ignorePath: false });
  }
});

// Handle WebSocket upgrade to backend
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/ws') || req.url.includes('websocket')) {
    console.log(`[WS] Upgrading connection for ${req.url}`);
    backendProxy.ws(req, socket, head);
  } else {
    socket.destroy();
  }
});

// Start server
server.listen(PROXY_PORT, () => {
  console.log(`✅ Reverse proxy running on port ${PROXY_PORT}`);
  console.log(`   URL: http://localhost:${PROXY_PORT}`);
  console.log('\n📍 Routes:');
  console.log(`   /api/*  → Backend (5000)`);
  console.log(`   /ws     → WebSocket`);
  console.log(`   /*      → Frontend (3001)\n`);
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PROXY_PORT} is already in use`);
    process.exit(1);
  }
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
