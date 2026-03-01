import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SERVER_URL = 'http://localhost:5000';
const TOKEN_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create a test token for a moderator
const testToken = jwt.sign(
  { id: '9b17d40d-2643-4ca3-a061-3c088504bd76', email: 'ezrahbosire1@gmail.com', role: 'ADMIN' },
  TOKEN_SECRET,
  { expiresIn: '24h' }
);

console.log('Testing moderator endpoints...\n');

const testEndpoints = [
  { url: '/api/moderation/standalone', name: 'Standalone Operators' },
  { url: '/api/moderation/onboarded', name: 'Onboarded Moderators' },
  { url: '/api/moderation/logs/activity', name: 'Activity Logs' }
];

async function testEndpoint(endpoint) {
  try {
    console.log(`Testing: ${endpoint.name}`);
    const response = await axios.get(`${SERVER_URL}${endpoint.url}`, {
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`  ✓ Status: ${response.status}`);
    console.log(`  ✓ Response:`, JSON.stringify(response.data, null, 2).substring(0, 300));
  } catch (error) {
    if (error.response) {
      console.log(`  ✗ Status: ${error.response.status}`);
      console.log(`  ✗ Error:`, error.response.data);
    } else {
      console.log(`  ✗ Error:`, error.message);
    }
  }
  console.log('');
}

(async () => {
  for (const endpoint of testEndpoints) {
    await testEndpoint(endpoint);
  }
  process.exit(0);
})();
