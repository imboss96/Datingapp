#!/usr/bin/env node
/**
 * ngrok Tunnel Script - Exposes backend to the internet for webhook testing
 * Usage: node tunnel.js
 */

import ngrok from 'ngrok';

const BACKEND_PORT = 5000;
const NGROK_TOKEN = process.env.NGROK_TOKEN || '';
const WEBHOOK_PATH = '/api/lipana/webhook';

async function startTunnel() {
  try {
    console.log('[TUNNEL] Starting ngrok tunnel...\n');
    
    // Authenticate with ngrok
    await ngrok.authtoken(NGROK_TOKEN);
    console.log('[TUNNEL] ✓ Authenticated with ngrok\n');
    
    // Create tunnel to localhost:5000
    const url = await ngrok.connect(BACKEND_PORT);
    const webhookUrl = `${url}${WEBHOOK_PATH}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   🌐 TUNNEL ACTIVE                              ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ Public URL:          ${url}`);
    console.log('║                                                                ║');
    console.log(`║ Webhook URL:         ${webhookUrl}`);
    console.log('║                                                                ║');
    console.log('║ Use this in Lipana Dashboard:                                 ║');
    console.log(`║ → Webhooks → Webhook URL                                       ║');
    console.log('║                                                                ║');
    console.log('║ ngrok Dashboard:     http://localhost:4040                     ║');
    console.log('║ Ctrl+C to stop tunnel                                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    // Keep tunnel running
    console.log('[TUNNEL] Listening for webhook events...\n');
    
  } catch (err) {
    console.error('[TUNNEL] ✗ Error starting tunnel:', err.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[TUNNEL] Shutting down...');
  await ngrok.kill();
  console.log('[TUNNEL] ✓ Tunnel closed');
  process.exit(0);
});

startTunnel();
