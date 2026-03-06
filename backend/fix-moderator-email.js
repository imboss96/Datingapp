import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sealteam:Sealteam%401@dating-app.uxdyw.mongodb.net/dating-app?retryWrites=true&w=majority';

// Simple User schema for this script - using custom id as string
const userSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.Mixed, // Handle custom IDs
  email: String,
  emailVerified: Boolean,
  role: String,
}, { strict: false });

const User = mongoose.model('User', userSchema, 'users');

async function fixModeratorEmail(email) {
  try {
    console.log('[INFO] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[INFO] Connected successfully!');

    console.log(`\n[INFO] Looking for user: ${email}`);
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`[ERROR] User not found with email: ${email}`);
      return;
    }

    console.log(`[INFO] Found user:`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Role: ${user.role}`);
    console.log(`  - Email Verified (before): ${user.emailVerified}`);

    // Update the user directly using updateOne
    const result = await User.updateOne(
      { email: email.toLowerCase() },
      { $set: { emailVerified: true } }
    );

    if (result.modifiedCount > 0) {
      console.log(`\n[SUCCESS] User updated!`);
      console.log(`  - Email Verified (after): true`);
      console.log(`\n✅ The moderator can now login without email verification!`);
    } else {
      console.log(`[ERROR] No documents were modified`);
    }

  } catch (error) {
    console.error('[ERROR] Failed to update user:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('[INFO] Database connection closed');
  }
}

// Get email from command line argument
const emailArg = process.argv[2];
if (!emailArg) {
  console.log('Usage: node fix-moderator-email.js <email>');
  console.log('Example: node fix-moderator-email.js takeoff@lunesamail.com');
  process.exit(1);
}

fixModeratorEmail(emailArg);
