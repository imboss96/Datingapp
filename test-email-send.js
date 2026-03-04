#!/usr/bin/env node

/**
 * Test script to verify email sending after payment
 */

const API_URL = 'http://localhost:5000';

const userId = '69a781980b890ec4c251bdfd'; // Jeff Njoki
const packageId = 'coins_50';

async function testPayment() {
  console.log('');
  console.log('='.repeat(80));
  console.log('TEST: Email sending after payment');
  console.log('='.repeat(80));
  console.log('');
  console.log('Sending payment request to:', `${API_URL}/api/lipana/test-payment`);
  console.log('Payload:', { userId, packageId });
  console.log('');

  try {
    const response = await fetch(`${API_URL}/api/lipana/test-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, packageId })
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('');
      console.log('✓ Payment request successful');
      console.log('✓ Email sent:', data.emailSent ? 'YES' : 'NO');
      if (data.emailError) {
        console.log('✗ Email error:', data.emailError);
      }
    } else {
      console.log('');
      console.log('✗ Payment request failed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('');
}

// Wait a moment for backend to start, then test
setTimeout(testPayment, 3000);
