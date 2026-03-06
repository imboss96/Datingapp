import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sealteam:Sealteam%401@dating-app.uxdyw.mongodb.net/dating-app?retryWrites=true&w=majority';

async function debugUser(email) {
  try {
    console.log('[INFO] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[INFO] Connected successfully!');

    const db = mongoose.connection.getClient().db('dating-app');
    
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`[ERROR] User not found with email: ${email}`);
      return;
    }

    console.log(`\n[INFO] User document fields:`);
    console.log(JSON.stringify(user, null, 2));

  } catch (error) {
    console.error('[ERROR] Failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

const emailArg = process.argv[2];
if (!emailArg) {
  console.log('Usage: node check-user-fields.js <email>');
  process.exit(1);
}

debugUser(emailArg);
