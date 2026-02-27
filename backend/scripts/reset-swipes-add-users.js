import mongoose from 'mongoose';
import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

async function run() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dating');
    console.log('✓ Connected to MongoDB');

    // STEP 1: Clear swipes for current user (dalestephanie70@gmail.com)
    const currentUser = await User.findOne({ email: 'dalestephanie70@gmail.com' });
    if (currentUser) {
      console.log(`\nBefore: ${currentUser.id} has ${currentUser.swipes.length} swipes`);
      currentUser.swipes = [];
      currentUser.matches = [];
      await currentUser.save();
      console.log(`✓ Cleared swipes and matches for ${currentUser.name}`);
    }

    // STEP 2: Add 10 fresh test users
    const testUsers = [
      { name: 'Sarah Johnson', age: 26, interests: ['hiking', 'coffee', 'music'], bio: 'Love outdoor adventures!' },
      { name: 'Emma Wilson', age: 28, interests: ['yoga', 'travel', 'art'], bio: 'Exploring the world one city at a time' },
      { name: 'Maya Patel', age: 24, interests: ['coding', 'gaming', 'memes'], bio: 'Frontend dev by day, gamer by night' },
      { name: 'Jessica Brown', age: 27, interests: ['cooking', 'wine', 'movies'], bio: 'Foodie and film enthusiast' },
      { name: 'Sophie Martinez', age: 25, interests: ['photography', 'nature', 'animals'], bio: 'Capturing moments in nature' },
      { name: 'Rachel Green', age: 29, interests: ['fitness', 'reading', 'cooking'], bio: 'Health conscious and book lover' },
      { name: 'Lily Chen', age: 26, interests: ['dance', 'music', 'fashion'], bio: 'Creative soul searching for adventure' },
      { name: 'Amber Taylor', age: 23, interests: ['sports', 'travel', 'photography'], bio: 'Beach lover and adventure seeker' },
      { name: 'Victoria Lee', age: 28, interests: ['art', 'museums', 'architecture'], bio: 'Art lover exploring cultural experiences' },
      { name: 'Olivia Scott', age: 25, interests: ['music', 'concerts', 'socializing'], bio: 'Music is my life, what\'s yours?' }
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
      const userId = uuidv4();
      const username = userData.name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 5);
      
      const user = new User({
        id: userId,
        email: `test_${username}@dating.local`,
        name: userData.name,
        username: username,
        age: userData.age,
        bio: userData.bio,
        interests: userData.interests,
        passwordHash: 'test', // Won't be used
        profilePicture: `https://i.pravatar.cc/400?u=${userId}`,
        coordinates: {
          type: 'Point',
          coordinates: [
            -0.695047 + (Math.random() - 0.5) * 0.1, // longitude (London area)
            34.7761005 + (Math.random() - 0.5) * 0.1  // latitude
          ]
        },
        swipes: [],
        matches: [],
        termsOfServiceAccepted: true,
        privacyPolicyAccepted: true,
        cookiePolicyAccepted: true,
        emailVerified: true
      });

      await user.save();
      createdUsers.push(user);
      console.log(`✓ Created user: ${user.name} (@${user.username})`);
    }

    console.log(`\n✓ SUCCESS: Cleared swipes and added ${createdUsers.length} new test users`);
    console.log(`\nNow you have fresh profiles to swipe on!`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('✗ Error:', err.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

run();
