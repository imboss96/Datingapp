import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sealteam:Sealteam%401@dating-app.uxdyw.mongodb.net/dating-app?retryWrites=true&w=majority';

async function fixPasswordField(email) {
  try {
    console.log('[INFO] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[INFO] Connected successfully!');

    const db = mongoose.connection.getClient().db('dating-app');
    
    console.log(`\n[INFO] Looking for user: ${email}`);
    
    // Find user with the old "password" field
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`[ERROR] User not found with email: ${email}`);
      return;
    }

    console.log(`[INFO] Found user:`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Has 'password' field: ${!!user.password}`);
    console.log(`  - Has 'passwordHash' field: ${!!user.passwordHash}`);

    if (user.password && !user.passwordHash) {
      // Rename password to passwordHash
      const result = await db.collection('users').updateOne(
        { email: email.toLowerCase() },
        { 
          $set: { passwordHash: user.password },
          $unset: { password: "" }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`\n[SUCCESS] Password field renamed from 'password' to 'passwordHash'!`);
        console.log(`\n✅ The moderator can now login with the correct password field!`);
      } else {
        console.log(`[ERROR] No documents were modified`);
      }
    } else if (user.passwordHash) {
      console.log(`\n[INFO] User already has 'passwordHash' field - no changes needed`);
    } else {
      console.log(`\n[ERROR] User has neither 'password' nor 'passwordHash' field!`);
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
  console.log('Usage: node fix-password-field.js <email>');
  console.log('Example: node fix-password-field.js takeoff@lunesamail.com');
  process.exit(1);
}

fixPasswordField(emailArg);
