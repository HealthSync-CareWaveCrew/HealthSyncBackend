import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

// Helper function to create AppError
const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
  error.isOperational = true;
  return error;
};

// Helper for async error handling
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Protect routes - verify JWT token
export const protect = catchAsync(async (req, res, next) => {
  let token;

  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    // Check cookies
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(createError('Please login to access this resource', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(createError('User belonging to this token no longer exists', 401));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(createError('Your account has been deactivated', 403));
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
      return next(createError('Password recently changed. Please login again', 401));
    }

    // Grant access
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(createError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(createError('Token expired', 401));
    }
    next(error);
  }
});

// Restrict to certain roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(createError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// Optional auth - doesn't error if no token
export const optionalAuth = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user && user.isActive && !user.passwordChangedAt) {
        req.user = user;
      }
    } catch (error) {
      // Ignore token errors for optional auth
    }
  }
  
  next();
});