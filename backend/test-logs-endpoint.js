import axios from 'axios';

async function testEndpoint() {
  try {
    const response = await axios.get('http://localhost:5000/api/moderation/logs/activity');
    console.log('✓ Endpoint working!');
    console.log('Response:', JSON.stringify(response.data, null, 2).slice(0, 500));
  } catch (error) {
    console.error('✗ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testEndpoint();
