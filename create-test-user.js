import mongoose from 'mongoose';
import User from '../backend/models/User.js';

const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

async function createTestUser() {
  try {
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');

    const testUser = new User({
      email: 'testuser@lunesa.app',
      name: 'Test User',
      phone: '+1234567890',
      password: 'hashedPassword123',
      gender: 'female',
      dateOfBirth: new Date('1995-01-15'),
      location: 'New York',
      bio: 'Test user for email verification',
      profilePhotos: [],
      isEmailVerified: true,
      isPremium: false,
      coins: 100,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedUser = await testUser.save();
    console.log('Test user created:', {
      id: savedUser._id,
      email: savedUser.email,
      name: savedUser.name
    });

    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createTestUser();
