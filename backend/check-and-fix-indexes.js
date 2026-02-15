import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkAndFixIndexes() {
  try {
    console.log('[INDEX] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[INDEX] Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const chatsCollection = db.collection('chats');

    // Get existing indexes
    const existingIndexes = await chatsCollection.indexes();
    console.log('[INDEX] Existing indexes:\n');
    existingIndexes.forEach((idx, i) => {
      console.log(`  [${i}] ${JSON.stringify(idx.key)}`);
      if (idx.unique) console.log(`       UNIQUE: true`);
    });

    // Check if participantsKey unique index exists
    const keyIndex = existingIndexes.find(idx => idx.key.participantsKey === 1);
    
    if (keyIndex) {
      console.log(`\n[INDEX] ✓ participantsKey index found`);
      console.log(`  Unique: ${keyIndex.unique || false}`);
      console.log(`  Sparse: ${keyIndex.sparse || false}`);
      
      if (!keyIndex.unique) {
        console.log(`\n[INDEX] ⚠️ Index is NOT unique! Dropping and recreating...\n`);
        await chatsCollection.dropIndex(keyIndex.name);
        console.log(`[INDEX] Dropped index: ${keyIndex.name}`);
        
        await chatsCollection.createIndex(
          { participantsKey: 1 },
          { unique: true, sparse: true, name: 'participantsKey_unique' }
        );
        console.log(`[INDEX] ✓ Created new unique index on participantsKey\n`);
      }
    } else {
      console.log(`\n[INDEX] ⚠️ participantsKey index NOT found! Creating it...\n`);
      await chatsCollection.createIndex(
        { participantsKey: 1 },
        { unique: true, sparse: true, name: 'participantsKey_unique' }
      );
      console.log(`[INDEX] ✓ Created unique index on participantsKey\n`);
    }

    // Verify indexes again
    const newIndexes = await chatsCollection.indexes();
    console.log('[INDEX] Indexes after fix:\n');
    newIndexes.forEach((idx, i) => {
      console.log(`  [${i}] ${JSON.stringify(idx.key)}`);
      if (idx.unique) console.log(`       UNIQUE: true`);
    });

    await mongoose.disconnect();
    console.log('\n[INDEX] Done!');
  } catch (err) {
    console.error('[ERROR]:', err);
    process.exit(1);
  }
}

checkAndFixIndexes();
