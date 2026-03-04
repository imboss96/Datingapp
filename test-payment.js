const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

(async () => {
  try {
    console.log('🚀 Sending test coin purchase payment...\n');
    const res = await fetch('http://localhost:5000/api/lipana/test-payment', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        userId: '69a781980b890ec4c251bdfd',  // Jeff Njoki - jeffnjoki56@gmail.com (correct database)
        packageId: 'coins_50'
      })
    });
    
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (res.status === 200 || data.ok) {
      console.log('\n✅ SUCCESS!');
      console.log('📧 Email being sent to: jeffnjoki56@gmail.com');
      console.log('👤 User: Jeff Njoki');
      console.log('💰 Package: 50 coins');
      console.log('🔗 Transaction ID:', data.transactionId);
      console.log('\n⏳ Check your inbox at jeffnjoki56@gmail.com for the confirmation email!');
    } else {
      console.log('\n❌ Payment failed');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
