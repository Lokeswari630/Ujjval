const jwt = require('jsonwebtoken');
const User = require('../models/User');

const resolveJwtExpiry = () => {
  const raw = String(process.env.JWT_EXPIRE || '').trim();
  if (!raw) return '7d';

  // Remove surrounding quotes that are sometimes copied into env dashboards.
  const normalized = raw.replace(/^['\"]|['\"]$/g, '').trim();

  // Accept plain seconds or common timespan values (e.g., 3600, 60m, 7d).
  if (/^\d+$/.test(normalized) || /^\d+(ms|s|m|h|d|w|y)$/i.test(normalized)) {
    return normalized;
  }

  console.warn(`Invalid JWT_EXPIRE value \"${raw}\". Falling back to 7d.`);
  return '7d';
};

// Middleware to protect routes
const protect = async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Set user in request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Middleware to authorize based on role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.user.role} role is not authorized.`
      });
    }
    next();
  };
};

// Middleware to check if user owns the resource or is admin
const authorizeOwnerOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }
    
    // User can only access their own resources
    if (req.user._id.toString() !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }
    
    next();
  };
};

// Generate JWT token
const generateToken = (id) => {
  if (!String(process.env.JWT_SECRET || '').trim()) {
    throw new Error('Server configuration error: JWT_SECRET is missing.');
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: resolveJwtExpiry()
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);
  
  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      message,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isVerified: user.isVerified
      }
    });
};

module.exports = {
  protect,
  authorize,
  authorizeOwnerOrAdmin,
  generateToken,
  sendTokenResponse
};
