import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sealteam:Sealteam%401@dating-app.uxdyw.mongodb.net/dating-app?retryWrites=true&w=majority';

async function setPassword(email, password) {
  try {
    console.log('[INFO] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[INFO] Connected successfully!');

    const db = mongoose.connection.getClient().db('dating-app');
    
    // Hash the password
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);
    console.log(`[INFO] Password hashed successfully`);

    // Update user with password
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { passwordHash } }
    );

    if (result.modifiedCount > 0) {
      console.log(`\n[SUCCESS] Password set for ${email}`);
      console.log(`\n✅ The moderator can now login with their password!`);
    } else {
      console.log(`[ERROR] User not found or update failed`);
    }

  } catch (error) {
    console.error('[ERROR] Failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

const emailArg = process.argv[2];
const passwordArg = process.argv[3];

if (!emailArg || !passwordArg) {
  console.log('Usage: node set-user-password.js <email> <password>');
  console.log('Example: node set-user-password.js takeoff@lunesamail.com mySecurePassword123');
  process.exit(1);
}

setPassword(emailArg, passwordArg);
