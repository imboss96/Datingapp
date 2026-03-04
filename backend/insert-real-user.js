import mongoose from 'mongoose';

async function insertRealUser() {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';
    await mongoose.connect(mongoUrl);
    
    const db = mongoose.connection.db;
    
    // Insert the real user data you provided
    const userData = {
      id: "8352d93f-76db-482d-a575-3a1107961432",
      email: "jeffnjoki56@gmail.com",
      googleId: "110391029654774220319",
      name: "Jeff Njoki",
      age: 43,
      images: [],
      profilePicture: "https://lh3.googleusercontent.com/a/ACg8ocJA_zh12NbTlaRkm2dH3sJa2_S_bsXHxeSDTgeIycoyIzdfAA=s96-c",
      isPremium: false,
      role: "USER",
      accountType: "APP",
      location: "Kisii, Kenya",
      coordinates: {
        type: "Point",
        coordinates: [34.776318, -0.695065]
      },
      interests: ["Food", "Sports", "Photography"],
      coins: 10,
      swipes: [],
      matches: [],
      notifications: {
        newMatches: true,
        newMessages: true,
        activityUpdates: true,
        promotions: false
      },
      termsOfServiceAccepted: true,
      privacyPolicyAccepted: true,
      cookiePolicyAccepted: true,
      emailVerified: false,
      isPhotoVerified: false,
      badges: [],
      trustScore: 0,
      suspended: false,
      banned: false,
      warningCount: 0,
      isOnline: true,
      bio: "Bad Boujee",
      username: "alberta"
    };
    
    // Use a proper MongoDB ObjectId for _id
    const insertResult = await db.collection('users').insertOne({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      legalAcceptanceDate: new Date()
    });
    
    console.log('\n✅ User inserted successfully!');
    console.log('📦 MongoDB _id:', insertResult.insertedId);
    console.log('📧 Email: jeffnjoki56@gmail.com');
    console.log('👤 Name: Jeff Njoki');
    console.log('\n✨ Ready to test email delivery!\n');
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

insertRealUser();
