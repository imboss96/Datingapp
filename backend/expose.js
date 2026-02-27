import ngrok from 'ngrok';

const BACKEND_PORT = 5000;
const NGROK_TOKEN = '34duLO5DUkrtABcX6F81FVOu34O_3DFpxtgvKL6n1EmrZtH2W';
const WEBHOOK_PATH = '/api/lipana/webhook';

async function startTunnel() {
  try {
    console.log('[TUNNEL] Starting ngrok tunnel...');
    
    // Set auth token first
    console.log('[TUNNEL] Setting authentication...');
    ngrok.authtoken(NGROK_TOKEN);
    
    console.log('[TUNNEL] Connecting to port 5000...');
    
    // Connect with simple port number
    const url = await ngrok.connect(5000);
    
    const webhookUrl = `${url}${WEBHOOK_PATH}`;
    
    console.log('\n================================');
    console.log('🌐 TUNNEL ACTIVE');
    console.log('================================');
    console.log(`Public URL: ${url}`);
    console.log(`\nWebhook URL: ${webhookUrl}`);
    console.log('\nUse this webhook URL in Lipana Dashboard:');
    console.log(`${webhookUrl}`);
    console.log('\nngrok Dashboard: http://localhost:4040');
    console.log('Press Ctrl+C to stop tunnel');
    console.log('================================\n');
    
  } catch (err) {
    console.error('[TUNNEL] Error:', err.message);
    console.error('[TUNNEL] Stack:', err.stack);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\n[TUNNEL] Shutting down...');
  await ngrok.kill();
  console.log('[TUNNEL] Tunnel closed');
  process.exit(0);
});

startTunnel();
