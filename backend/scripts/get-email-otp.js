#!/usr/bin/env node
/**
 * Simple dev script to fetch the latest OTP for an email from EmailVerification collection.
 * Usage: node scripts/get-email-otp.js you@example.com
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import EmailVerification from '../models/EmailVerification.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spark-dating';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/get-email-otp.js you@example.com');
    process.exit(2);
  }

  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const rec = await EmailVerification.findOne({ email: email.toLowerCase() }).sort({ createdAt: -1 });
  if (!rec) {
    console.log('No OTP record found for', email);
    process.exit(0);
  }

  console.log('OTP for', email, 'is:', rec.otp, 'expiresAt:', rec.expiresAt);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
