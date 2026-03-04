import dotenv from 'dotenv';
dotenv.config();

const BREVO_API_URL = 'https://api.brevo.com/v3';

(async () => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    console.log('✓ BREVO_API_KEY present:', !!apiKey);
    console.log('  First 30 chars:', apiKey?.substring(0, 30) + '...');
    
    if (!apiKey) {
      console.error('✗ BREVO_API_KEY not found in .env');
      process.exit(1);
    }

    // Test 1: Verify Brevo API connection
    console.log('\n--- TEST 1: BREVO API CONNECTION ---');
    let response = await fetch(`${BREVO_API_URL}/account`, {
      headers: {
        'api-key': apiKey,
        'accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✓ Brevo API is working');
      console.log('  Account Email:', data.email);
      console.log('  Plan:', data.plan);
    } else {
      console.log('✗ Brevo API Error:', response.status, await response.text());
    }

    // Test 2: Check Template 8
    console.log('\n--- TEST 2: TEMPLATE 8 STATUS ---');
    response = await fetch(`${BREVO_API_URL}/smtp/templates/8`, {
      headers: {
        'api-key': apiKey,
        'accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✓ Template 8 EXISTS');
      console.log('  Name:', data.name);
      console.log('  Active:', data.active);
      console.log('  Sender Name:', data.sender?.name || 'N/A');
      console.log('  Sender Email:', data.sender?.email || 'N/A');
    } else {
      console.log('✗ Template 8 Error:', response.status);
      console.log('  Response:', await response.text());
    }

    // Test 3: Send test email with template
    console.log('\n--- TEST 3: SEND TEST EMAIL ---');
    const testPayload = {
      to: [{ email: 'jeffnjoki56@gmail.com' }],
      templateId: 8,
      params: {
        USER_NAME: 'Jeff Njoki',
        USER_EMAIL: 'jeffnjoki56@gmail.com',
        COINS: '50',
        PRICE: '$4.99',
        TRANSACTION_ID: 'test-' + Date.now(),
        PURCHASE_DATE: new Date().toLocaleDateString(),
        SHOP_LINK: 'http://localhost:3001/#/shop',
        COINS_BALANCE: '160'
      }
    };

    console.log('  Sending email to: jeffnjoki56@gmail.com');
    console.log('  Template ID: 8');
    console.log('  Params:', JSON.stringify(testPayload.params, null, 2));
    
    response = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    console.log('  Response Status:', response.status);
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('✓ Email sent successfully!');
      console.log('  Message ID:', responseData.messageId);
    } else {
      console.log('✗ Failed to send email');
      console.log('  Error:', JSON.stringify(responseData, null, 2));
    }

    // Test 4: Get Email Activity
    console.log('\n--- TEST 4: RECENT EMAIL ACTIVITY ---');
    response = await fetch(`${BREVO_API_URL}/smtp/statistics/events?limit=10`, {
      headers: {
        'api-key': apiKey,
        'accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✓ Recent Activity:');
      if (data.events && data.events.length > 0) {
        data.events.slice(0, 5).forEach((event, i) => {
          console.log(`  ${i + 1}. ${event.event} - ${event.email} (${new Date(event.date).toLocaleString()})`);
        });
      } else {
        console.log('  No recent events found');
      }
    } else {
      console.log('✗ Failed to fetch activity:', response.status);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
