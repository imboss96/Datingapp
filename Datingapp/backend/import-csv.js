/**
 * Google Sheets CSV Import to MongoDB
 * 
 * Usage:
 * node backend/import-csv.js <csv-file-path>
 * 
 * Example:
 * node backend/import-csv.js ./lunesa-test-users.csv
 */

import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

dotenv.config();

// =====================================================
// CSV PARSER AND IMPORTER
// =====================================================

const importFromCSV = async (csvFilePath) => {
  try {
    console.log('📖 Starting CSV import...');

    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`File not found: ${csvFilePath}`);
    }

    // Read CSV file and remove first blank line
    let fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = fileContent.split('\n');
    
    // Remove the first line if it's all commas/empty
    if (lines[0] && lines[0].trim() && lines[0].split(',').every(cell => !cell.trim())) {
      lines.shift();
      fileContent = lines.join('\n');
    }
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`📊 Found ${records.length} total records`);
    
    // Debug: log first record to see structure
    if (records.length > 0) {
      console.log('🔍 First record structure:', Object.keys(records[0]));
      console.log('🔍 First record values:', records[0]);
    }
    
    // Filter out empty rows and header rows
    const validRecords = records.filter((record, idx) => {
      // Skip if ID is literally "ID" (header row)
      if (record.ID === 'ID') return false;
      
      // Check if record has required fields
      const hasID = record.ID && record.ID !== 'ID';
      const hasEmail = record.Email && record.Email !== 'Email';
      const hasName = record.Name && record.Name !== 'Name';
      
      return hasID && hasEmail && hasName;
    });
    
    // Deduplicate by email AND ID (keep first occurrence)
    const seenEmails = new Set();
    const seenIDs = new Set();
    const deduplicatedRecords = validRecords.filter(record => {
      const email = (record.Email || '').toLowerCase();
      const id = record.ID;
      
      // Skip if email or ID already seen
      if (seenEmails.has(email) || seenIDs.has(id)) {
        return false;
      }
      
      seenEmails.add(email);
      seenIDs.add(id);
      return true;
    });

    console.log(`✅ ${validRecords.length} valid records, ${deduplicatedRecords.length} after deduplication`);

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check existing users
    const existingCount = await User.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing users`);
      const answer = await askQuestion('Do you want to clear existing users? (y/n): ');
      if (answer.toLowerCase() === 'y') {
        await User.deleteMany({});
        console.log('🗑️  Cleared existing users');
      } else {
        throw new Error('Import cancelled');
      }
    }

    // Transform and insert users
    const users = deduplicatedRecords.map((record, index) => {
      const id = `user_${record.ID}`;
      const email = (record.Email || '').trim();
      const name = (record.Name || '').trim();
      const username = (record.Username || '').trim();
      const age = parseInt(record.Age) || 25;
      const location = (record.Location || 'Unknown').trim();
      const bio = (record.Bio || '').trim();
      
      return {
        id: id,
        email: email,
        name: name,
        username: username,
        age: age,
        location: location,
        bio: bio,
        interests: (record.Interests || '')
          .split(',')
          .map(i => i.trim())
          .filter(i => i.length > 0),
        profilePicture: (record['Profile Picture'] || '').trim(),
        images: [(record['Profile Picture'] || '').trim()].filter(i => i.length > 0),
        isPremium: (record['Is Premium'] || '').toUpperCase() === 'TRUE',
        coins: parseInt(record.Coins) || 10,
        role: 'USER',
        swipes: [],
        matches: [],
        coordinates: {
          latitude: parseFloat(record.Latitude) || Math.random() * 180 - 90,
          longitude: parseFloat(record.Longitude) || Math.random() * 360 - 180
        },
        verification: {
          status: (record['Verification Status'] || 'VERIFIED').trim(),
          email: email ? true : false,
          phone: (record['Phone Verified'] || '').toUpperCase() === 'TRUE'
        },
        notifications: {
          newMatches: true,
          newMessages: true,
          activityUpdates: true,
          promotions: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    // Insert in batches
    const batchSize = 100;
    const batches = Math.ceil(users.length / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const start = batch * batchSize;
      const end = Math.min(start + batchSize, users.length);
      const batchUsers = users.slice(start, end);

      await User.insertMany(batchUsers);
      console.log(`✅ Batch ${batch + 1}/${batches} imported (${end}/${users.length} users)`);
    }

    console.log(`\n🎉 Successfully imported ${users.length} users!`);
    console.log(`📊 Database stats:`);
    console.log(`   - Total users: ${await User.countDocuments()}`);
    console.log(`   - Premium users: ${await User.countDocuments({ isPremium: true })}`);

  } catch (error) {
    console.error('❌ Import error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
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
  const csvFile = process.argv[2];

  console.log('📥 Lunesa Dating App - CSV Import Tool');
  console.log('=====================================\n');

  if (!csvFile) {
    console.error('❌ Please provide CSV file path');
    console.log('\nUsage: node backend/import-csv.js <csv-file-path>');
    console.log('Example: node backend/import-csv.js ./lunesa-test-users.csv');
    process.exit(1);
  }

  await importFromCSV(csvFile);
};

main().catch(console.error);
