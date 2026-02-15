/**
 * Data Seeding Script for 5000 Test Users
 * Generates realistic test data with profile images, interests, and matching features
 * 
 * Usage:
 * - node backend/seed-data.js      (Generate and seed to DB)
 * - node backend/seed-data.js csv  (Export to CSV for Google Sheets)
 */

import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// =====================================================
// DATA GENERATORS
// =====================================================

// Sample first names
const firstNames = [
  'Sarah', 'Emma', 'Jessica', 'Lisa', 'Michelle', 'Amanda', 'Jennifer', 'Ashley',
  'Maria', 'Susan', 'Lauren', 'Jessica', 'Karen', 'Nancy', 'Betty', 'Margaret',
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
  'Thomas', 'Christopher', 'Charles', 'Daniel', 'Matthew', 'Mark', 'Donald', 'George'
];

// Sample last names
const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson'
];

// Sample interests/hobbies
const interests = [
  'Photography', 'Travel', 'Yoga', 'Music', 'Cooking', 'Reading', 'Hiking',
  'Gaming', 'Art', 'Fitness', 'Sports', 'Movies', 'Painting', 'Dance',
  'Writing', 'Meditation', 'Cycling', 'Swimming', 'Coffee', 'Wine',
  'Fashion', 'Technology', 'Nature', 'Volunteering', 'Gardening',
  'Skateboarding', 'Surfing', 'Basketball', 'Tennis', 'Golf', 'Camping',
  'Drawing', 'Design', 'Astronomy', 'Animals', 'Pets', 'Comedy', 'Theater'
];

// Sample locations
const locations = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
  'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
  'Austin, TX', 'Jacksonville, FL', 'Miami, FL', 'Denver, CO', 'Seattle, WA',
  'Boston, MA', 'Portland, OR', 'Nashville, TN', 'Detroit, MI', 'Minneapolis, MN',
  'Las Vegas, NV', 'Atlanta, GA', 'New Orleans, LA', 'Portland, ME', 'San Francisco, CA'
];

// Sample profile image URLs (using random user avatar URLs)
const getRandomProfileImage = () => {
  const randomId = Math.floor(Math.random() * 70) + 1;
  return `https://i.pravatar.cc/300?img=${randomId}`;
};

// Generate sample bio
const generateBio = () => {
  const bios = [
    'Adventure seeker looking for someone to explore with',
    'Passionate about life and love. Dog lover! 🐕',
    'Traveling the world one city at a time',
    'Yoga enthusiast and coffee addict ☕',
    'Music lover with wanderlust in my heart',
    'Love cooking and trying new restaurants',
    'Fitness is my passion, finding my match is the goal',
    'Artist at heart, creative soul looking for real connection',
    'Mountain lover, always seeking the next adventure',
    'Book nerd who also enjoys outdoor activities',
    'Let\'s grab coffee and see where it goes',
    'Looking for someone genuine and kind',
    'Fitness enthusiast and foodie',
    'Photographer capturing life moments',
    'Dream big, work hard, stay humble',
    'Living life to the fullest',
    'In search of genuine connection',
    'Lover of nature and good vibes',
    'Always up for trying something new',
    'Here to find someone special'
  ];
  return bios[Math.floor(Math.random() * bios.length)];
};

// Generate random user interests (3-7 interests per user)
const generateInterests = () => {
  const numInterests = Math.floor(Math.random() * 5) + 3; // 3-7 interests
  const selectedInterests = [];
  const shuffled = [...interests].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, numInterests);
};

// Generate random age (18-50)
const generateAge = () => {
  return Math.floor(Math.random() * 33) + 18;
};

// Generate random location
const generateLocation = () => {
  return locations[Math.floor(Math.random() * locations.length)];
};

// Generate random coordinates (for distance-based matching)
const generateCoordinates = () => {
  return {
    latitude: (Math.random() * 180) - 90,
    longitude: (Math.random() * 360) - 180
  };
};

// =====================================================
// USER GENERATOR
// =====================================================

const generateUser = (index) => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;
  const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${index}`;
  const email = `${username}@test-dating.com`;

  return {
    id: uuidv4(),
    email,
    name,
    username,
    age: generateAge(),
    bio: generateBio(),
    location: generateLocation(),
    interests: generateInterests(),
    images: [
      getRandomProfileImage(),
      getRandomProfileImage(),
      getRandomProfileImage()
    ],
    profilePicture: getRandomProfileImage(),
    isPremium: Math.random() < 0.1, // 10% premium users
    role: 'USER',
    coins: Math.floor(Math.random() * 100) + 10,
    swipes: [],
    matches: [],
    coordinates: generateCoordinates(),
    verification: {
      status: 'VERIFIED',
      email: true,
      phone: Math.random() < 0.7 // 70% have verified phone
    },
    notifications: {
      newMatches: true,
      newMessages: true,
      activityUpdates: Math.random() < 0.8,
      promotions: Math.random() < 0.3
    },
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date in past year
    updatedAt: new Date()
  };
};

// =====================================================
// SEEDING FUNCTIONS
// =====================================================

const seedDatabase = async (count = 5000) => {
  try {
    console.log('🌱 Starting database seeding...');
    console.log(`📊 Generating ${count} test users...`);

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if users already exist
    const existingCount = await User.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing users`);
      const answer = await askQuestion('Do you want to clear and reseed? (y/n): ');
      if (answer.toLowerCase() === 'y') {
        await User.deleteMany({});
        console.log('🗑️  Cleared existing users');
      } else {
        console.log('❌ Seeding cancelled');
        process.exit(0);
      }
    }

    // Generate users in batches
    const batchSize = 100;
    const batches = Math.ceil(count / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const start = batch * batchSize;
      const end = Math.min(start + batchSize, count);
      const users = [];

      for (let i = start; i < end; i++) {
        users.push(generateUser(i));
      }

      await User.insertMany(users);
      console.log(`✅ Batch ${batch + 1}/${batches} inserted (${end}/${count} users)`);
    }

    console.log(`\n🎉 Successfully seeded ${count} users!`);
    console.log(`📊 Database stats:`);
    console.log(`   - Total users: ${await User.countDocuments()}`);
    console.log(`   - Premium users: ${await User.countDocuments({ isPremium: true })}`);
    console.log(`   - Verified users: ${await User.countDocuments({ 'verification.status': 'VERIFIED' })}`);

  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
};

// =====================================================
// CSV EXPORT FUNCTION
// =====================================================

const exportToCSV = (filename = 'test-users.csv') => {
  try {
    console.log(`📝 Generating ${filename}...`);

    const users = [];
    for (let i = 0; i < 5000; i++) {
      users.push(generateUser(i));
    }

    // CSV Header
    const headers = [
      'ID',
      'Email',
      'Name',
      'Username',
      'Age',
      'Location',
      'Bio',
      'Interests',
      'Profile Picture',
      'Images',
      'Is Premium',
      'Coins',
      'Verification Status',
      'Phone Verified'
    ];

    // CSV Rows
    const rows = users.map(user => [
      user.id,
      user.email,
      user.name,
      user.username,
      user.age,
      user.location,
      `"${user.bio}"`,
      `"${user.interests.join(', ')}"`,
      user.profilePicture,
      `"${user.images.join(', ')}"`,
      user.isPremium,
      user.coins,
      user.verification.status,
      user.verification.phone
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Write to file
    const filepath = path.join(process.cwd(), filename);
    fs.writeFileSync(filepath, csvContent);

    console.log(`✅ Exported to ${filename}`);
    console.log(`📋 File location: ${filepath}`);
    console.log(`📊 Total records: 5000`);
    console.log(`\n📌 To import to Google Sheets:`);
    console.log(`   1. Go to Google Sheets`);
    console.log(`   2. File → Import → Upload ${filename}`);
    console.log(`   3. Select "Insert new sheet"`);
    console.log(`   4. Import data`);

  } catch (error) {
    console.error('❌ CSV export error:', error);
    process.exit(1);
  }
};

// =====================================================
// GOOGLE SHEETS FORMAT HELPER
// =====================================================

const generateGoogleSheetsFormat = () => {
  console.log('\n📊 Google Sheets Format Example:\n');
  console.log('Columns needed:');
  console.log('  A: ID (auto-generate UUID)');
  console.log('  B: Email (firstname_lastname_number@test.com)');
  console.log('  C: Name (First Last)');
  console.log('  D: Username (firstname_lastname_number)');
  console.log('  E: Age (18-50)');
  console.log('  F: Location (City, State)');
  console.log('  G: Bio (Description)');
  console.log('  H: Interests (comma-separated)');
  console.log('  I: Profile Picture (image URL)');
  console.log('  J: Images (comma-separated URLs)');
  console.log('  K: Is Premium (TRUE/FALSE)');
  console.log('  L: Coins (number)');
  console.log('  M: Verification Status (VERIFIED/UNVERIFIED)');
  console.log('  N: Phone Verified (TRUE/FALSE)');

  console.log('\n📝 Example row:');
  const example = generateUser(1);
  console.log(`  ${example.id}`);
  console.log(`  ${example.email}`);
  console.log(`  ${example.name}`);
  console.log(`  ${example.username}`);
  console.log(`  ${example.age}`);
  console.log(`  ${example.location}`);
  console.log(`  ${example.bio}`);
  console.log(`  ${example.interests.join(', ')}`);
  console.log(`  ${example.profilePicture}`);
  console.log(`  ${example.images.join(', ')}`);
  console.log(`  ${example.isPremium}`);
  console.log(`  ${example.coins}`);
  console.log(`  VERIFIED`);
  console.log(`  TRUE`);
};

// =====================================================
// UTILITIES
// =====================================================

const askQuestion = (question) => {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
};

// =====================================================
// MAIN
// =====================================================

const main = async () => {
  const args = process.argv.slice(2);

  console.log('🌱 Lunesa Dating App - Data Seeding Tool');
  console.log('=====================================\n');

  if (args[0] === 'csv') {
    // Export to CSV
    exportToCSV('lunesa-test-users.csv');
  } else if (args[0] === 'format') {
    // Show Google Sheets format
    generateGoogleSheetsFormat();
  } else if (args[0] === 'test') {
    // Generate one test user to verify format
    console.log('📝 Sample User:\n');
    console.log(JSON.stringify(generateUser(1), null, 2));
  } else {
    // Default: seed to database
    const count = parseInt(args[0]) || 5000;
    seedDatabase(count);
  }
};

main().catch(console.error);
