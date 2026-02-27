import express from 'express';
import crypto from 'crypto';
import { Lipana } from '@lipana/sdk';
import { v4 as uuidv4 } from 'uuid';

import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

// Lazy-load Lipana SDK to ensure environment variables are available
let lipanaClient = null;

function getLipanaClient() {
  if (!lipanaClient) {
    console.log('[LIPANA] Initializing SDK with:', {
      hasKey: !!process.env.LIPANA_SECRET_KEY,
      environment: process.env.LIPANA_ENVIRONMENT || 'sandbox',
    });
    
    if (!process.env.LIPANA_SECRET_KEY) {
      throw new Error('LIPANA_SECRET_KEY not found in environment variables. Check .env file.');
    }
    
    lipanaClient = new Lipana({
      apiKey: process.env.LIPANA_SECRET_KEY,
      environment: process.env.LIPANA_ENVIRONMENT || 'sandbox'
    });
    
    console.log('[LIPANA] SDK initialized successfully');
  }
  return lipanaClient;
}

const router = express.Router();

// NOTE: when we regenerated this file during earlier debugging the full
// implementation was accidentally replaced by a simple placeholder.  the
// front‑end depends on the same PACKAGES map for coin/premium ids, so keep it
// in sync with the client code.
export const PACKAGES = {
  coins_50: { coins: 50, price: '$4.99' },
  coins_100: { coins: 100, price: '$9.99' },
  coins_250: { coins: 250, price: '$19.99' },
  coins_500: { coins: 500, price: '$29.99' },
  premium_1m: { isPremium: true, price: '$4.99' },
  premium_3m: { isPremium: true, price: '$12.99' },
  premium_6m: { isPremium: true, price: '$19.99' },
  premium_12m: { isPremium: true, price: '$29.99' },
};

function normalizePhone(input) {
  console.log(`[PHONE_NORMALIZE] Input: '${input}'`);
  
  if (!input || typeof input !== 'string') {
    console.error(`[PHONE_NORMALIZE] Invalid input type:`, typeof input);
    throw new Error('Phone number is required');
  }
  
  let phone = input.replace(/[^0-9]/g, '');
  console.log(`[PHONE_NORMALIZE] After removing non-digits: '${phone}' (length: ${phone.length})`);
  
  // Handle Kenya (254) format
  if (phone.length === 10 && phone.startsWith('0')) {
    // Convert 07xxxxxxxxx to 254xxxxxxxxx
    const normalized = '254' + phone.slice(1);
    console.log(`[PHONE_NORMALIZE] Kenya format detected: 0XXXXXXXXX -> ${normalized}`);
    return normalized;
  }
  
  if (phone.length === 12 && phone.startsWith('254')) {
    console.log(`[PHONE_NORMALIZE] Kenya format (already normalized): ${phone}`);
    return phone;
  }
  
  if (phone.length === 9 && (phone.startsWith('7') || phone.startsWith('1'))) {
    // Assume just the 7xxxxxxxx or 1xxxxxxxx part without leading 0
    const normalized = '254' + phone;
    console.log(`[PHONE_NORMALIZE] Kenya format (short form): ${phone} -> ${normalized}`);
    return normalized;
  }
  
  // Also support Ghana format (233) for backwards compatibility
  if (phone.length === 10 && phone.startsWith('0')) {
    const normalized = '233' + phone.slice(1);
    console.log(`[PHONE_NORMALIZE] Ghana format detected: 0XXXXXXXXX -> ${normalized}`);
    return normalized;
  }
  
  if (phone.length === 12 && phone.startsWith('233')) {
    console.log(`[PHONE_NORMALIZE] Ghana format (already normalized): ${phone}`);
    return phone;
  }
  
  console.error(`[PHONE_NORMALIZE] Invalid format:`, {
    input,
    cleaned: phone,
    length: phone.length,
    startsWith0: phone.startsWith('0'),
    startsWith254: phone.startsWith('254'),
    startsWith233: phone.startsWith('233'),
  });
  
  throw new Error('Invalid phone number. Supports: 254XXXXXXXXX (Kenya), 0704000000 (Kenya), 233XXXXXXXXX (Ghana), or 0233000000 (Ghana)');
}

// the stub "lipana" object defined above is used instead of a real SDK

router.post('/initiate', async (req, res) => {
  const startTime = Date.now();
  console.log(`[LIPANA /initiate] === START REQUEST ==== `);
  
  try {
    const { userId, phone, packageId } = req.body;
    console.log(`[LIPANA /initiate] Received request:`, {
      userId,
      phone: phone ? `${phone.slice(0,5)}...${phone.slice(-3)}` : 'MISSING',
      packageId,
      timestamp: new Date().toISOString(),
    });
    
    // Validation
    if (!userId) {
      console.warn(`[LIPANA /initiate] VALIDATION FAILED: Missing userId`);
      return res.status(400).json({ error: 'Missing userId' });
    }
    if (!phone) {
      console.warn(`[LIPANA /initiate] VALIDATION FAILED: Missing phone`);
      return res.status(400).json({ error: 'Missing phone number' });
    }
    if (!packageId) {
      console.warn(`[LIPANA /initiate] VALIDATION FAILED: Missing packageId`);
      return res.status(400).json({ error: 'Missing packageId' });
    }
    
    const pkg = PACKAGES[packageId];
    if (!pkg) {
      console.warn(`[LIPANA /initiate] VALIDATION FAILED: Invalid packageId '${packageId}'`);
      console.log(`[LIPANA /initiate] Available packages:`, Object.keys(PACKAGES));
      return res.status(400).json({ error: 'Invalid package id' });
    }
    
    console.log(`[LIPANA /initiate] Package validated:`, { packageId, ...pkg });
    
    // Phone normalization
    console.log(`[LIPANA /initiate] Normalizing phone: '${phone}'`);
    const normalized = normalizePhone(phone);
    console.log(`[LIPANA /initiate] Phone normalized: '${phone}' → '${normalized}'`);

    // Create transaction
    const txId = uuidv4();
    const tx = new Transaction({
      id: txId,
      userId,
      type: pkg.isPremium ? 'PREMIUM_UPGRADE' : 'COIN_PURCHASE',
      amount: pkg.coins || 0,
      price: pkg.price,
      method: 'momo',
      status: 'PENDING',
      phoneNumber: normalized,
    });
    await tx.save();
    console.log(`[LIPANA /initiate] Transaction created:`, {
      txId,
      userId,
      type: tx.type,
      amount: tx.amount,
      phone: normalized,
      status: 'PENDING',
    });

    // Initiate STK push with real Lipana API
    console.log(`[LIPANA /initiate] Initiating real STK push with Lipana...`);
    let lipanaRes;
    try {
      // Format amount in KES (Lipana expects amount in the smallest currency unit)
      const amountInKes = parseInt(pkg.price.replace(/\D/g, '')) || 1000; // Default to 1000 if parsing fails
      
      lipanaRes = await getLipanaClient().transactions.initiateStkPush({
        phone: normalized,
        amount: amountInKes,
      });
      
      console.log(`[LIPANA /initiate] FULL Lipana API response:`, {
        response_type: typeof lipanaRes,
        response_keys: Object.keys(lipanaRes || {}),
        response_string: JSON.stringify(lipanaRes, null, 2),
        data_keys: Object.keys(lipanaRes?.data || {}),
        data_string: JSON.stringify(lipanaRes?.data, null, 2),
      });
      
      console.log(`[LIPANA /initiate] Real STK push response:`, {
        transactionId: lipanaRes.data?.transactionId,
        transaction_id: lipanaRes.data?.transaction_id,
        id: lipanaRes.data?.id,
        checkoutRequestID: lipanaRes.data?.checkoutRequestID,
        status: lipanaRes.data?.status,
      });
    } catch (stkError) {
      console.error(`[LIPANA /initiate] STK push API error:`, {
        message: stkError.message,
        code: stkError.code,
        response: stkError.response?.data,
      });
      
      // If real API fails, return detailed error
      return res.status(500).json({ 
        error: stkError.message || 'Failed to initiate STK push',
        details: stkError.response?.data
      });
    }
    
    // Store Lipana transaction refs - try multiple possible field names
    let lipanaTransactionId = lipanaRes.data?.transactionId || 
                              lipanaRes.data?.transaction_id || 
                              lipanaRes.data?.id ||
                              lipanaRes?.transactionId ||
                              lipanaRes?.transaction_id ||
                              lipanaRes?.id;
    
    const checkoutRequestID = lipanaRes.data?.checkoutRequestID || 
                              lipanaRes.data?.checkout_request_id ||
                              lipanaRes?.checkoutRequestID;
    
    console.log(`[LIPANA /initiate] Extracted IDs from response:`, {
      our_local_txId: txId,
      lipanaTransactionId,
      checkoutRequestID,
      all_keys_in_data: Object.keys(lipanaRes?.data || {}),
      all_keys_in_root: Object.keys(lipanaRes || {}),
    });
    
    // Update transaction with Lipana refs
    tx.lipanaTransactionId = lipanaTransactionId;
    tx.checkoutRequestID = checkoutRequestID;
    await tx.save();
    console.log(`[LIPANA /initiate] Transaction SAVED to DB:`, {
      saved_local_id: tx.id,
      saved_lipana_id: tx.lipanaTransactionId,
    });

    const duration = Date.now() - startTime;
    console.log(`[LIPANA /initiate] === SUCCESS === (${duration}ms)`);
    
    res.json({
      ok: true,
      transactionId: txId,
      lipanaTransactionId,
      checkoutRequestID,
      message: lipanaRes.data?.message || 'STK push initiated. Check your phone for the payment prompt.',
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[LIPANA /initiate] === ERROR === (${duration}ms)`, {
      error: err.message,
      stack: err.stack,
      code: err.code,
    });
    res.status(500).json({ error: err.message || 'Failed to initiate payment' });
  }
});

router.get('/status/:txId', async (req, res) => {
  const startTime = Date.now();
  console.log(`[LIPANA /status] === CHECK STATUS ==== txId: ${req.params.txId}`);
  
  try {
    const { txId } = req.params;
    
    // Fetch transaction
    console.log(`[LIPANA /status] Looking up transaction: ${txId}`);
    const tx = await Transaction.findOne({ id: txId });
    
    if (!tx) {
      console.warn(`[LIPANA /status] Transaction NOT FOUND: ${txId}`);
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    console.log(`[LIPANA /status] Transaction loaded:`, {
      txId,
      userId: tx.userId,
      type: tx.type,
      amount: tx.amount,
      currentStatus: tx.status,
      phone: tx.phoneNumber ? `${tx.phoneNumber.slice(0,5)}...${tx.phoneNumber.slice(-3)}` : 'N/A',
    });
    
    // Check real Lipana transaction status
    console.log(`[LIPANA /status] Checking Lipana transaction status...`);
    let lipanaTransactionStatus = null;
    
    try {
      if (tx.lipanaTransactionId) {
        console.log(`[LIPANA /status] Querying Lipana with txId: ${tx.lipanaTransactionId}`);
        // Query Lipana API for transaction details
        const lipanaTransaction = await getLipanaClient().transactions.retrieve(tx.lipanaTransactionId);
        lipanaTransactionStatus = lipanaTransaction?.status || tx.status;
        
        console.log(`[LIPANA /status] Lipana API response:`, {
          requested_id: tx.lipanaTransactionId,
          returned_status: lipanaTransactionStatus,
          returned_keys: Object.keys(lipanaTransaction || {}),
          amount: lipanaTransaction?.amount,
          phone: lipanaTransaction?.phone ? `${lipanaTransaction.phone.slice(0,5)}...${lipanaTransaction.phone.slice(-3)}` : 'N/A',
        });
      } else {
        console.warn(`[LIPANA /status] No lipanaTransactionId stored in transaction`);
      }
    } catch (lipanaError) {
      console.warn(`[LIPANA /status] ⚠️ Could not query Lipana API (OK - relying on webhook):`, {
        message: lipanaError.message,
        note: 'Webhook callback will update transaction when payment completes',
      });
      // Don't treat this as failure - webhook will update the transaction
      lipanaTransactionStatus = null;
    }
    
    let txStatus = tx.status.toLowerCase();
    let statusChanged = false;
    
    // Normalize Lipana status to lowercase for comparison
    const normalizedLipanaStatus = lipanaTransactionStatus ? lipanaTransactionStatus.toLowerCase() : null;
    
    // If Lipana shows success and our DB shows pending, update it
    if (normalizedLipanaStatus === 'success' && txStatus === 'pending') {
      console.log(`[LIPANA /status] ✓ Payment success detected in Lipana! Updating transaction...`);
      
      tx.status = 'COMPLETED';
      await tx.save();
      console.log(`[LIPANA /status] Transaction status updated: PENDING → COMPLETED`);
      
      // Update user coins/premium
      console.log(`[LIPANA /status] Updating user ${tx.userId}...`);
      try {
        const user = await User.findOne({ _id: tx.userId }).lean();
        if (user) {
          const before = {
            coins: user.coins || 0,
            isPremium: user.isPremium || false,
          };
          
          if (tx.type === 'PREMIUM_UPGRADE') {
            user.isPremium = true;
            console.log(`[LIPANA /status] User upgraded to premium`);
          } else {
            user.coins = (user.coins || 0) + tx.amount;
            console.log(`[LIPANA /status] User coins updated: ${before.coins} → ${user.coins}`);
          }
          
          await User.updateOne({ _id: tx.userId }, user);
          console.log(`[LIPANA /status] User saved successfully`);
        } else {
          console.warn(`[LIPANA /status] User ${tx.userId} not found for update`);
        }
      } catch (userErr) {
        console.warn(`[LIPANA /status] Could not update user:`, userErr.message);
      }
      
      txStatus = 'success';
      statusChanged = true;
    } else if (normalizedLipanaStatus === 'failed' && txStatus === 'pending') {
      console.log(`[LIPANA /status] ✗ Payment failed in Lipana`);
      tx.status = 'FAILED';
      await tx.save();
      txStatus = 'failed';
      statusChanged = true;
    } else if (normalizedLipanaStatus === 'cancelled' && txStatus === 'pending') {
      console.log(`[LIPANA /status] ✗ Payment cancelled in Lipana`);
      tx.status = 'CANCELLED';
      await tx.save();
      txStatus = 'cancelled';
      statusChanged = true;
    }
    
    const duration = Date.now() - startTime;
    console.log(`[LIPANA /status] === RESPONSE === (${duration}ms)`, {
      status: txStatus,
      statusChanged,
      coins: tx.amount,
      isPremium: tx.type === 'PREMIUM_UPGRADE',
      our_txId: txId,
      lipana_txId: tx.lipanaTransactionId,
    });
    
    res.json({
      status: txStatus,
      coins: tx.amount,
      isPremium: tx.type === 'PREMIUM_UPGRADE',
      message: tx.description || null,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[LIPANA /status] === ERROR === (${duration}ms)`, {
      error: err.message,
      stack: err.stack,
      code: err.code,
    });
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const startTime = Date.now();
  console.log(`[LIPANA /webhook] === WEBHOOK EVENT ==== `);
  
  try {
    const signature = req.headers['x-lipana-signature'];
    const payload = req.body;
    
    console.log(`[LIPANA /webhook] Signature verification:`, {
      signaturePresent: !!signature,
      bodyLength: payload.length,
    });
    
    // Verify Lipana webhook signature using HMAC-SHA256
    if (!signature) {
      console.warn(`[LIPANA /webhook] Missing X-Lipana-Signature header`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const webhookSecret = process.env.LIPANA_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error(`[LIPANA /webhook] LIPANA_WEBHOOK_SECRET not configured`);
      return res.status(500).json({ error: 'Server misconfiguration' });
    }
    
    // Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');
    
    // Use constant-time comparison to prevent timing attacks
    const signatureValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    
    if (!signatureValid) {
      console.warn(`[LIPANA /webhook] Signature verification failed`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log(`[LIPANA /webhook] ✓ Signature verified`);
    
    const event = JSON.parse(payload.toString());
    // Lipana sends top-level fields, not nested in 'data'
    const eventType = event.event;
    const transactionId = event.transaction_id;
    const phone = event.phone;
    const reference = event.reference;
    
    console.log(`[LIPANA /webhook] Event parsed:`, {
      eventType,
      transactionId,
      phone,
      reference,
      amount: event.amount,
      timestamp: event.timestamp,
      full_event: JSON.stringify(event, null, 2),
      received_at: new Date().toISOString(),
    });
    
    // Find transaction by Lipana transaction ID
    let tx = null;
    const possibleIds = [
      transactionId,
      reference,
    ].filter(Boolean);
    
    console.log(`[LIPANA /webhook] Trying to find transaction with IDs:`, {
      possible_ids: possibleIds,
    });
    
    // Try each possible ID
    for (const idValue of possibleIds) {
      tx = await Transaction.findOne({ lipanaTransactionId: idValue });
      if (tx) {
        console.log(`[LIPANA /webhook] ✓ Found transaction using ID: ${idValue}`);
        break;
      }
    }
    
    // Fallback: try by phone number and status
    if (!tx && phone) {
      console.log(`[LIPANA /webhook] Fallback: searching by phone ${phone}`);
      tx = await Transaction.findOne({ 
        phoneNumber: phone, 
        status: 'PENDING' 
      });
      if (tx) {
        console.log(`[LIPANA /webhook] ✓ Found transaction by phone fallback`);
        // Update the lipanaTransactionId for future lookups
        if (transactionId && !tx.lipanaTransactionId) {
          tx.lipanaTransactionId = transactionId;
        }
      }
    }
    
    if (!tx) {
      console.error(`[LIPANA /webhook] ❌ Transaction NOT FOUND for:`, {
        tried_IDs: possibleIds,
        tried_phone: phone,
        event: JSON.stringify(event, null, 2),
      });
      // Still return 200 to prevent Lipana from retrying
      return res.json({ ok: true });
    }
    
    console.log(`[LIPANA /webhook] ✓ Transaction found, processing:`, {
      txId: tx.id,
      type: tx.type,
      currentStatus: tx.status,
      eventType,
    });
    
    // Process webhook event based on type (case-insensitive)
    const normalizedEventType = eventType ? eventType.toLowerCase() : '';
    if (normalizedEventType === 'payment.success' || normalizedEventType === 'transaction.success') {
      console.log(`[LIPANA /webhook] ✓ Processing payment success`);
      tx.status = 'COMPLETED';
      await tx.save();
      console.log(`[LIPANA /webhook] Transaction saved with status COMPLETED:`, { txId: tx.id, status: tx.status });
      
      try {
        const user = await User.findOne({ _id: tx.userId });
        if (user) {
          if (tx.type === 'PREMIUM_UPGRADE') {
            user.isPremium = true;
            console.log(`[LIPANA /webhook] User ${tx.userId} upgraded to premium`);
          } else {
            user.coins = (user.coins || 0) + tx.amount;
            console.log(`[LIPANA /webhook] User ${tx.userId} received ${tx.amount} coins (total: ${user.coins})`);
          }
          await user.save();
          console.log(`[LIPANA /webhook] User saved successfully`);
        }
      } catch (userErr) {
        console.warn(`[LIPANA /webhook] Could not update user:`, userErr.message);
      }
    } else if (normalizedEventType === 'payment.failed' || normalizedEventType === 'transaction.failed') {
      console.log(`[LIPANA /webhook] ✗ Processing payment failure`);
      tx.status = 'FAILED';
      await tx.save();
    } else if (normalizedEventType === 'payment.cancelled' || normalizedEventType === 'transaction.cancelled') {
      console.log(`[LIPANA /webhook] ✗ Processing payment cancellation`);
      tx.status = 'CANCELLED';
      await tx.save();
    } else {
      console.warn(`[LIPANA /webhook] Unknown event type: ${eventType}`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[LIPANA /webhook] === SUCCESS === (${duration}ms)`);
    
    res.json({ ok: true });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[LIPANA /webhook] === ERROR === (${duration}ms)`, {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).end();
  }
});

router.get('/packages', (req, res) => {
  console.log(`[LIPANA /packages] Fetching available packages`);
  const packageKeys = Object.keys(PACKAGES);
  console.log(`[LIPANA /packages] Total packages available: ${packageKeys.length}`, packageKeys);
  res.json(PACKAGES);
});

router.get('/history/:userId', async (req, res) => {
  const startTime = Date.now();
  const { userId } = req.params;
  
  console.log(`[LIPANA /history] === LOAD HISTORY ==== userId: ${userId}`);
  
  try {
    console.log(`[LIPANA /history] Fetching transaction history...`);
    const txs = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(20);
    
    console.log(`[LIPANA /history] Transactions loaded:`, {
      userId,
      count: txs.length,
      transactions: txs.map(tx => ({
        txId: tx.id,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        method: tx.method,
        createdAt: tx.createdAt?.toISOString() || 'N/A',
      })),
    });
    
    const duration = Date.now() - startTime;
    console.log(`[LIPANA /history] === SUCCESS === (${duration}ms)`);
    
    res.json(txs);
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[LIPANA /history] === ERROR === (${duration}ms)`, {
      userId,
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: 'Failed to load history' });
  }
});

export default router;
