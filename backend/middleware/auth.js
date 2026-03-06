import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isUserPremium, checkAndRemoveExpiredPremium } from '../utils/premiumHelper.js';

export const authMiddleware = async (req, res, next) => {
  try {
    // Try to get token from cookies first (httpOnly), then Authorization header (fallback)
    const tokenFromCookie = req.cookies.authToken;
    const tokenFromHeader = req.headers.authorization?.split(' ')[1];
    const token = tokenFromCookie || tokenFromHeader;
    
    if (!token) {
      console.log('[AUTH] No token provided in request');
      console.log('[AUTH] Headers:', {
        authHeader: req.headers.authorization ? 'present' : 'missing',
        cookies: Object.keys(req.cookies)
      });
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    
    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.userId = decoded.id;
      
      // Fetch user info including role and premium status
      try {
        const user = await User.findOne({ id: req.userId });
        if (user) {
          // ✅ Check if premium has expired and automatically deactivate
          if (user.isPremium && user.premiumExpiresAt) {
            const stillPremium = isUserPremium(user);
            if (!stillPremium) {
              // Premium has expired, deactivate it
              console.log(`[AUTH] Premium expired for user ${user.id}, deactivating...`);
              checkAndRemoveExpiredPremium(user);
              await user.save();
            }
          }
          
          req.userRole = user.role;
          // Add computed flags for isModerator and isAdmin based on role
          user.isModerator = user.role === 'MODERATOR' || user.role === 'ADMIN';
          user.isAdmin = user.role === 'ADMIN';
          req.userInfo = user;
        } else {
          console.warn('[AUTH] User not found in database:', req.userId);
          req.userRole = 'USER';
        }
      } catch (userErr) {
        console.warn('[WARN] Failed to fetch user role, defaulting to USER:', userErr.message);
        req.userRole = 'USER';
      }
      
      next();
    } catch (tokenErr) {
      console.error('[AUTH] Token verification failed:', {
        error: tokenErr.message,
        tokenSource: tokenFromCookie ? 'cookie' : 'header',
        jwtSecretConfigured: !!process.env.JWT_SECRET,
        tokenLength: token?.length
      });
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (err) {
    console.error('[AUTH] Unexpected error in authMiddleware:', err.message);
    res.status(401).json({ error: 'Unauthorized' });
  }
};
