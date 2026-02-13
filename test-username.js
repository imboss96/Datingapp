// Test script to verify username functionality
const API_BASE = 'http://localhost:5000/api';

async function testUsername() {
  const testUserId = '54b8d05c-c1e8-414e-a0ed-0c8d6c902ad5'; // Replace with actual user ID
  const testToken = localStorage.getItem('authToken'); // Get from browser console

  console.log('=== Testing Username Functionality ===\n');

  // Test 1: Check username availability
  console.log('TEST 1: Check username availability');
  try {
    const response = await fetch(`${API_BASE}/users/check-username/testuser123`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    console.log('Available?', data.available);
    console.log('Message:', data.message);
  } catch (err) {
    console.error('Error:', err.message);
  }

  console.log('\n---\n');

  // Test 2: Update profile with username
  console.log('TEST 2: Update profile with username');
  try {
    if (!testToken) {
      console.warn('⚠️ No auth token found. Get token from browser localStorage');
      return;
    }

    const response = await fetch(`${API_BASE}/users/${testUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        username: 'mynewusername123',
        bio: 'My bio',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error:', error);
      return;
    }

    const data = await response.json();
    console.log('✓ Profile updated');
    console.log('Username:', data.username);
    console.log('Bio:', data.bio);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Run tests
testUsername();
