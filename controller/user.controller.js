import User from '../models/User.model.js';
import Token from '../models/Token.model.js';

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

// Get current user profile
export const getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    }
  });
});

// Update user profile
export const updateProfile = catchAsync(async (req, res, next) => {
  const { name, email } = req.body;

  // Check if email is being changed
  if (email && email !== req.user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(createError('Email already in use', 400));
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, email },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    }
  });
});

// Change password
export const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  const isPasswordMatch = await user.comparePassword(currentPassword);
  if (!isPasswordMatch) {
    return next(createError('Current password is incorrect', 401));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Blacklist all refresh tokens
  await Token.updateMany(
    { userId: user._id, type: 'refresh' },
    { blacklisted: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully. Please login again.'
  });
});

// Delete account
export const deleteAccount = catchAsync(async (req, res, next) => {
  await User.findByIdAndDelete(req.user.id);
  
  // Delete all user tokens
  await Token.deleteMany({ userId: req.user.id });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Admin: Get all users
export const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().select('-__v');

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

// Admin: Get single user
export const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(createError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

// Admin: Update user role
export const updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    return next(createError('Invalid role', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  );

  if (!user) {
    return next(createError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

// Admin: Toggle user active status
export const toggleUserStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(createError('User not found', 404));
  }

  user.isActive = !user.isActive;
  await user.save();

  // If deactivating, blacklist all refresh tokens
  if (!user.isActive) {
    await Token.updateMany(
      { userId: user._id, type: 'refresh' },
      { blacklisted: true }
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      isActive: user.isActive
    }
  });
});

// Admin: Delete user
export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(createError('User not found', 404));
  }

  // Delete user tokens
  await Token.deleteMany({ userId: req.params.id });

  res.status(204).json({
    status: 'success',
    data: null
  });
});