#!/usr/bin/env node

/**
 * Comprehensive Email Sending Test Suite
 * Tests all payment methods and verifies backend stability
 */

const API_URL = 'http://localhost:5000';
const userId = '69a781980b890ec4c251bdfd';
const testCases = [
  { name: 'Coin Purchase (50)', packageId: 'coins_50', method: 'test' },
  { name: 'Coin Purchase (100)', packageId: 'coins_100', method: 'test' },
  { name: 'Premium 1 Month', packageId: 'premium_1m', method: 'test' },
  { name: 'Stripe Payment', packageId: 'coins_50', method: 'stripe' },
  { name: 'PayPal Payment', packageId: 'coins_100', method: 'paypal' },
  { name: 'Apple Pay', packageId: 'coins_250', method: 'apple_pay' },
];

let passed = 0;
let failed = 0;
const results = [];

async function runTest(testCase) {
  const { name, packageId, method } = testCase;
  const endpoint = method === 'test' 
    ? `${API_URL}/api/lipana/test-payment`
    : `${API_URL}/api/lipana/test-payment-method/${method}`;

  try {
    console.log(`\n▶ Testing: ${name}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, packageId })
    });

    const data = await response.json();

    if (response.ok && data.ok && data.emailSent) {
      console.log(`  ✅ PASSED`);
      console.log(`     - Transaction: ${data.transactionId}`);
      console.log(`     - Email sent: ${data.emailSent}`);
      if (data.emailMessageId) {
        console.log(`     - Message ID: ${data.emailMessageId}`);
      }
      passed++;
      results.push({ name, status: 'PASSED', data });
    } else {
      console.log(`  ❌ FAILED`);
      console.log(`     - Response OK: ${response.ok}`);
      console.log(`     - Data OK: ${data.ok}`);
      console.log(`     - Email sent: ${data.emailSent}`);
      if (data.error) console.log(`     - Error: ${data.error}`);
      if (data.emailError) console.log(`     - Email Error: ${data.emailError}`);
      failed++;
      results.push({ name, status: 'FAILED', data });
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    failed++;
    results.push({ name, status: 'ERROR', error: error.message });
  }
}

async function runAllTests() {
  console.log('');
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE EMAIL SENDING TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Testing ${testCases.length} payment scenarios...`);
  console.log(`API URL: ${API_URL}`);
  console.log(`User ID: ${userId}`);

  for (const testCase of testCases) {
    await runTest(testCase);
    await new Promise(resolve => setTimeout(resolve, 300)); // Small delay between tests
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${passed}/${testCases.length}`);
  console.log(`❌ Failed: ${failed}/${testCases.length}`);
  console.log(`📊 Success Rate: ${(passed/testCases.length*100).toFixed(1)}%`);
  
  console.log('\nDetailed Results:');
  results.forEach((r, i) => {
    const icon = r.status === 'PASSED' ? '✅' : r.status === 'FAILED' ? '❌' : '⚠️';
    console.log(`${i+1}. ${icon} ${r.name}: ${r.status}`);
  });

  console.log('\n' + '='.repeat(80));
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Backend is working perfectly!');
  } else {
    console.log(`⚠️ ${failed} test(s) failed. Check the details above.`);
  }
  
  console.log('='.repeat(80));
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

// Wait for backend to be ready and run tests
setTimeout(runAllTests, 2000);
