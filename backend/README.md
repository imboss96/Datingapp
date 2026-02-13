# Spark Dating - Backend

MongoDB-based backend for the Spark Dating App

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Create `.env` file:**
```env
MONGODB_URI=mongodb://localhost:27017/spark-dating
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/spark-dating

PORT=5000
JWT_SECRET=your-secret-key-here
```

3. **Start the server:**
```bash
npm start        # Production
npm run dev      # Development with auto-reload
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/:userId` - Update user profile
- `POST /api/users/:userId/swipe` - Record swipe action
- `POST /api/users/:userId/deduct-coin` - Deduct coins

### Chats
- `GET /api/chats` - Get user's chats
- `GET /api/chats/:chatId` - Get specific chat
- `POST /api/chats/create-or-get` - Create or get chat
- `POST /api/chats/:chatId/messages` - Send message

### Reports
- `POST /api/reports` - Create report
- `GET /api/reports` - Get all reports
- `PUT /api/reports/:reportId` - Update report status

## MongoDB Connection

### Local MongoDB
```bash
# Install MongoDB Community Edition
# Start MongoDB service
mongod
```

### MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Add to `.env` as MONGODB_URI
