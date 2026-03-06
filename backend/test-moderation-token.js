#!/usr/bin/env node

/**
 * Moderation Token Diagnostic Script
 * 
 * This script tests the JWT token generation and verification flow
 * to identify why tokens work locally but not on hosted servers.
 * 
 * Usage:
 *   node test-moderation-token.js <BASE_URL> <USERNAME> <PASSWORD>
 * 
 * Examples:
 *   node test-moderation-token.js http://localhost:5000 johndoe password123
 *   node test-moderation-token.js https://lunesalove.com/api admin password123
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}`)
};

async function runDiagnostics() {
  const args = process.argv.slice(2);
  const baseUrl = args[0]?.replace(/\/$/, '') || 'http://localhost:5000';
  const username = args[1] || 'johndoe';
  const password = args[2] || 'password123';

  log.header('Moderation Token Diagnostic Test');
  
  console.log(`
Configuration:
- Server: ${baseUrl}
- Username: ${username}
- JWT_SECRET: ${process.env.JWT_SECRET ? '(configured)' : '(NOT configured)'}
  `);

  try {
    // STEP 1: Test Backend Connectivity
    log.header('Step 1: Testing Backend Connectivity');
    
    try {
      const healthCheck = await axios.get(`${baseUrl}/api/auth/verify-token`, {
        timeout: 5000,
        validateStatus: () => true  // Don't throw on any status
      });
      log.success(`Backend is reachable (status: ${healthCheck.status})`);
    } catch (err) {
      log.error(`Cannot reach backend: ${err.message}`);
      log.warn('Make sure backend is running and URL is correct');
      return;
    }

    // STEP 2: Test Login Endpoint
    log.header('Step 2: Testing Login');
    
    let token, userId, userRole;
    try {
      const loginRes = await axios.post(`${baseUrl}/api/moderation-auth/login`, {
        username,
        password
      });
      
      token = loginRes.data.token;
      userId = loginRes.data.user?.id;
      userRole = loginRes.data.user?.role;
      accountType = loginRes.data.accountType;
      
      log.success(`Login successful`);
      log.info(`User ID: ${userId}`);
      log.info(`User Role: ${userRole}`);
      log.info(`Account Type: ${accountType}`);
      log.info(`Token Length: ${token.length} characters`);
    } catch (err) {
      log.error(`Login failed: ${err.response?.data?.error || err.message}`);
      return;
    }

    // STEP 3: Decode and Inspect Token
    log.header('Step 3: Inspecting Token');
    
    try {
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded) {
        log.error('Token could not be decoded');
        return;
      }
      
      log.success('Token decoded successfully');
      log.info(`Header: ${JSON.stringify(decoded.header)}`);
      log.info(`Payload: ${JSON.stringify(decoded.payload)}`);
      
      const expiry = new Date(decoded.payload.exp * 1000);
      const now = new Date();
      const expiresIn = Math.round((expiry - now) / 1000 / 60 / 60 / 24);
      
      log.info(`Expires: ${expiry.toISOString()}`);
      log.info(`Expires In: ${expiresIn} days`);
      
      if (expiry < now) {
        log.error('Token has EXPIRED!');
      } else {
        log.success('Token is not expired');
      }
    } catch (err) {
      log.error(`Token inspection failed: ${err.message}`);
    }

    // STEP 4: Test Token Verification (Standalone)
    log.header('Step 4: Testing Token Verification');
    
    try {
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, jwtSecret);
      log.success('Token verified with JWT_SECRET from .env');
      log.info(`Verified as user: ${decoded.username || decoded.id}`);
    } catch (err) {
      log.error(`Token verification FAILED: ${err.message}`);
      log.warn('This means JWT_SECRET used to sign token != JWT_SECRET in .env');
      log.warn('Check that .env JWT_SECRET is correct!');
    }

    // STEP 5: Test With Backend Endpoint
    log.header('Step 5: Testing Backend Token Verification');
    
    try {
      const verifyRes = await axios.post(`${baseUrl}/api/moderation-auth/verify-token`, {
        token
      });
      
      if (verifyRes.data.valid) {
        log.success('Backend verification successful');
        log.info(`Verified user: ${verifyRes.data.user.username}`);
      } else {
        log.error(`Backend verification failed: ${verifyRes.data.error}`);
      }
    } catch (err) {
      log.error(`Backend verification error: ${err.response?.data?.error || err.message}`);
    }

    // STEP 6: Test Auth Middleware
    log.header('Step 6: Testing Auth Middleware');
    
    try {
      const authRes = await axios.get(`${baseUrl}/api/moderation/debug/auth-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (authRes.data.authenticated) {
        log.success('Auth middleware working correctly!');
        log.info(`User role: ${authRes.data.userRole}`);
        log.info(`Is moderator: ${authRes.data.isModerator}`);
      } else {
        log.error('Auth middleware: Not authenticated');
      }
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      
      if (status === 401) {
        log.error(`Token invalid (401): ${data.error}`);
        log.warn('The token could not be verified by authMiddleware');
        
        // Additional diagnostics
        console.log(`
${colors.yellow}Possible causes:${colors.reset}
1. JWT_SECRET on hosted server ≠ JWT_SECRET used to sign token
2. Token expired
3. Authorization header not being sent
4. CORS issue preventing header transmission

${colors.blue}To fix:${colors.reset}
1. Check JWT_SECRET on hosted server: echo $JWT_SECRET
2. Ensure it matches local .env: ${process.env.JWT_SECRET}
3. Restart backend service after changing JWT_SECRET
        `);
      } else if (status === 403) {
        log.error(`Access forbidden (403): ${data.error}`);
        log.warn('User is authenticated but not a moderator');
      } else {
        log.error(`Auth test failed: ${data?.error || err.message}`);
      }
    }

    // STEP 7: Test Moderation Endpoints
    log.header('Step 7: Testing Moderation Endpoints');
    
    const endpoints = [
      { name: 'Unreplied Chats', url: '/api/moderation/unreplied-chats', method: 'GET' },
      { name: 'Replied Chats', url: '/api/moderation/replied-chats', method: 'GET' },
      { name: 'Session Earnings', url: '/api/moderation/session-earnings', method: 'GET' }
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await axios({
          method: endpoint.method.toLowerCase(),
          url: `${baseUrl}${endpoint.url}`,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        log.success(`${endpoint.name}: Working`);
        log.info(`Response status: ${res.status}`);
        
        if (endpoint.name === 'Unreplied Chats' && res.data.unrepliedChats) {
          log.info(`Found ${res.data.unrepliedChats.length} unreplied chats`);
        }
        if (endpoint.name === 'Replied Chats' && res.data.repliedChats) {
          log.info(`Found ${res.data.repliedChats.length} replied chats`);
        }
      } catch (err) {
        const status = err.response?.status;
        const errorMsg = err.response?.data?.error || err.message;
        
        log.error(`${endpoint.name}: ${errorMsg} (${status})`);
      }
    }

    // FINAL SUMMARY
    log.header('Diagnostic Summary');
    console.log(`
${colors.green}✓ Diagnostics completed${colors.reset}

${colors.blue}Key Points:${colors.reset}
1. If all tests passed (✓), your moderation system is working correctly
2. If Step 4 or Step 6 failed with "Invalid token", JWT_SECRET is different
3. If Step 7 failed with data not loading, check token from Step 4
4. If Step 2 failed, check username/password

${colors.cyan}Next Steps:${colors.reset}
- If tests pass: Try refreshing the browser and logging in again
- If token fails: Update JWT_SECRET on hosted server to match local
- If endpoints fail: Check user role is MODERATOR or ADMIN in database

${colors.yellow}For more help, see: MODERATION_TOKEN_DIAGNOSTIC.md${colors.reset}
    `);

  } catch (err) {
    log.error(`Unexpected error: ${err.message}`);
    console.error(err);
  }
}

// Run diagnostics
runDiagnostics().catch(err => {
  log.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
