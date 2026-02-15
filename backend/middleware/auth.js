import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authMiddleware = async (req, res, next) => {
  try {
    // Try to get token from cookies first (httpOnly), then Authorization header (fallback)
    const token = req.cookies.authToken || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.id;
    
    // Fetch user info including role
    try {
      const user = await User.findOne({ id: req.userId });
      if (user) {
        req.userRole = user.role;
        req.userInfo = user;
      } else {
        req.userRole = 'USER';
      }
    } catch (userErr) {
      console.warn('[WARN] Failed to fetch user role, defaulting to USER:', userErr.message);
      req.userRole = 'USER';
    }
    
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
