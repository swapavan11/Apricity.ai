import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../lib/config.js';

// JWT Authentication Middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // If no Authorization header, attempt to read token from cookie header
    if (!token && req.headers && req.headers.cookie) {
      const cookieHeader = req.headers.cookie; // e.g. "token=abc; other=val"
      const match = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith('token='));
      if (match) token = match.split('=')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token - user not found' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers['authorization'];
    if (authHeader) token = authHeader.split(' ')[1];

    // Try cookie if header missing
    if (!token && req.headers && req.headers.cookie) {
      const cookieHeader = req.headers.cookie;
      const match = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith('token='));
      if (match) token = match.split('=')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

// Check if user is verified
export const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({ 
      success: false, 
      message: 'Email verification required' 
    });
  }

  next();
};

// Check if user owns the resource
export const requireOwnership = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({ 
          success: false, 
          message: 'Resource not found' 
        });
      }

      // Check if user owns the resource
      const ownerField = resource.uploadedBy ? 'uploadedBy' : 'userId';
      if (resource[ownerField].toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - you do not own this resource' 
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error checking resource ownership' 
      });
    }
  };
};

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    config.JWT_SECRET, 
    { expiresIn: config.JWT_EXPIRES_IN }
  );
};

// Rate limiting middleware
export const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [ip, data] of requests.entries()) {
      if (data.timestamp < windowStart) {
        requests.delete(ip);
      }
    }

    const userRequests = requests.get(key) || { count: 0, timestamp: now };
    
    if (userRequests.timestamp < windowStart) {
      userRequests.count = 1;
      userRequests.timestamp = now;
    } else {
      userRequests.count++;
    }

    requests.set(key, userRequests);

    if (userRequests.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    next();
  };
};

