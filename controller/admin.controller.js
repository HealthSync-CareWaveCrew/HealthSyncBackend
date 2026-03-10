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

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getDashboardStats = catchAsync(async (req, res, next) => {
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const adminCount = await User.countDocuments({ role: 'admin' });
  const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
  
  // Get recent users
  const recentUsers = await User.find()
    .select('name email role isActive createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        totalUsers,
        activeUsers,
        adminCount,
        verifiedUsers,
        inactiveUsers: totalUsers - activeUsers
      },
      recentUsers
    }
  });
});

// @desc    Get all users with pagination and filtering
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filter
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive) filter.isActive = req.query.isActive === 'true';
  if (req.query.isEmailVerified) filter.isEmailVerified = req.query.isEmailVerified === 'true';
  
  // Search by name or email
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  // Date range filter
  if (req.query.startDate && req.query.endDate) {
    filter.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate)
    };
  }

  const users = await User.find(filter)
    .select('-password -__v')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: users.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: {
      users
    }
  });
});

// @desc    Get single user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
export const getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password -__v');

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

// @desc    Create new user (by admin)
// @route   POST /api/admin/users
// @access  Private/Admin
export const createUser = catchAsync(async (req, res, next) => {
  const { name, email, password, role, isEmailVerified, isActive } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(createError('User already exists with this email', 400));
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'user',
    isEmailVerified: isEmailVerified || false,
    isActive: isActive !== undefined ? isActive : true
  });

  res.status(201).json({
    status: 'success',
    message: 'User created successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    }
  });
});

// @desc    Update user (by admin)
// @route   PATCH /api/admin/users/:id
// @access  Private/Admin
export const updateUser = catchAsync(async (req, res, next) => {
  const { name, email, role, isActive, isEmailVerified } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(createError('User not found', 404));
  }

  // Check email uniqueness if changed
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(createError('Email already in use', 400));
    }
  }

  // Update fields
  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (isEmailVerified !== undefined) user.isEmailVerified = isEmailVerified;

  await user.save();

  // If deactivating, blacklist refresh tokens
  if (isActive === false) {
    await Token.updateMany(
      { userId: user._id, type: 'refresh' },
      { blacklisted: true }
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified
      }
    }
  });
});

// @desc    Update user role
// @route   PATCH /api/admin/users/:id/role
// @access  Private/Admin
export const updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    return next(createError('Invalid role. Must be either "user" or "admin"', 400));
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(createError('User not found', 404));
  }

  // Prevent removing last admin
  if (user.role === 'admin' && role === 'user') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return next(createError('Cannot remove the last admin', 400));
    }
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'User role updated successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  });
});

// @desc    Toggle user active status
// @route   PATCH /api/admin/users/:id/toggle-status
// @access  Private/Admin
export const toggleUserStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(createError('User not found', 404));
  }

  // Prevent deactivating last admin
  if (user.role === 'admin' && user.isActive) {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return next(createError('Cannot deactivate the last admin', 400));
    }
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
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      isActive: user.isActive
    }
  });
});

// @desc    Toggle email verification status
// @route   PATCH /api/admin/users/:id/toggle-verification
// @access  Private/Admin
export const toggleEmailVerification = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(createError('User not found', 404));
  }

  user.isEmailVerified = !user.isEmailVerified;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: `Email ${user.isEmailVerified ? 'verified' : 'unverified'} successfully`,
    data: {
      isEmailVerified: user.isEmailVerified
    }
  });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(createError('User not found', 404));
  }

  // Prevent deleting last admin
  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return next(createError('Cannot delete the last admin', 400));
    }
  }

  // Delete user tokens
  await Token.deleteMany({ userId: user._id });

  // Delete user
  await user.deleteOne();

  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully'
  });
});

// @desc    Bulk delete users
// @route   POST /api/admin/users/bulk-delete
// @access  Private/Admin
export const bulkDeleteUsers = catchAsync(async (req, res, next) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return next(createError('Please provide an array of user IDs', 400));
  }

  // Check if trying to delete last admin
  const adminUsers = await User.find({ 
    _id: { $in: userIds }, 
    role: 'admin' 
  });

  if (adminUsers.length > 0) {
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    if (totalAdmins <= adminUsers.length) {
      return next(createError('Cannot delete all admin users', 400));
    }
  }

  // Delete users and their tokens
  await Token.deleteMany({ userId: { $in: userIds } });
  const result = await User.deleteMany({ _id: { $in: userIds } });

  res.status(200).json({
    status: 'success',
    message: `${result.deletedCount} users deleted successfully`
  });
});

// @desc    Get user activity logs
// @route   GET /api/admin/users/:id/activity
// @access  Private/Admin
export const getUserActivity = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('name email lastLogin loginAttempts createdAt');

  if (!user) {
    return next(createError('User not found', 404));
  }

  // Get token activity
  const tokens = await Token.find({ userId: user._id })
    .select('type createdAt expiresAt blacklisted')
    .sort({ createdAt: -1 })
    .limit(20);

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        lastLogin: user.lastLogin,
        loginAttempts: user.loginAttempts,
        createdAt: user.createdAt
      },
      recentActivity: tokens
    }
  });
});