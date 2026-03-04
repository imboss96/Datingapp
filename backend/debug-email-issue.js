import mongoose from 'mongoose';

(async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/datingapp');
    console.log('✓ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Check the user we sent the email to
    const userId = '69a781980b890ec4c251bdfd';
    const objectId = new mongoose.Types.ObjectId(userId);
    
    const user = await db.collection('users').findOne({ _id: objectId });
    
    if (user) {
      console.log('✓ USER FOUND:');
      console.log('  Email in DB:', user.email);
      console.log('  Name in DB:', user.name);
      console.log('  ID:', user._id);
      console.log('  Coins:', user.coins);
    } else {
      console.log('✗ User NOT found with ID:', userId);
    }

    // Check all transactions for this user
    console.log('\n--- RECENT TRANSACTIONS ---');
    const transactions = await db.collection('transactions').find({ userId }).sort({ createdAt: -1 }).limit(5).toArray();
    
    if (transactions.length > 0) {
      transactions.forEach((tx, i) => {
        console.log(`\n${i + 1}. Transaction:`, {
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          method: tx.method,
          status: tx.status,
          createdAt: tx.createdAt
        });
      });
    } else {
      console.log('No transactions found');
    }

    // Test Brevo connection
    console.log('\n--- TESTING BREVO CONNECTION ---');
    const apiKey = process.env.BREVO_API_KEY;
    console.log('BREVO_API_KEY present:', !!apiKey);
    console.log('BREVO_API_KEY first 20 chars:', apiKey ? apiKey.substring(0, 20) + '...' : 'MISSING');
    
    if (apiKey) {
      const response = await fetch('https://api.brevo.com/v3/account', {
        headers: {
          'api-key': apiKey,
          'accept': 'application/json'
        }
      });
      console.log('Brevo API Response Status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('✓ Brevo API is working');
        console.log('  Account Email:', data.email);
      } else {
        console.log('✗ Brevo API error:', response.statusText);
      }
    }

    // Check template ID 8
    console.log('\n--- CHECKING TEMPLATE 8 ---');
    if (apiKey) {
      const response = await fetch('https://api.brevo.com/v3/smtp/templates/8', {
        headers: {
          'api-key': apiKey,
          'accept': 'application/json'
        }
      });
      console.log('Template 8 Response Status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('✓ Template 8 EXISTS');
        console.log('  Name:', data.name);
        console.log('  Active:', data.active);
        console.log('  From Name:', data.sender?.name);
        console.log('  From Email:', data.sender?.email);
      } else {
        console.log('✗ Template 8 NOT found or inactive');
        const errData = await response.json();
        console.log('  Error:', errData);
      }
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
