import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SERVER_URL = 'http://localhost:5000';

// Get the JWT_SECRET from env (same as server)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
console.log('JWT_SECRET from env:', JWT_SECRET ? '***SET***' : 'NOT SET');

// Try to read the actual token that might be stored
// Or use user info from database
const testWithRealAdmin = async () => {
  try {
    console.log('\nAttempting direct API call to test endpoints...\n');
    
    // Try without token first
    const response = await axios.get(`${SERVER_URL}/api/moderation/onboarded`, {
      validateStatus: () => true
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', response.data);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testWithRealAdmin();
