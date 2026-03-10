import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [
      function() {
        // Password is required only if googleId doesn't exist
        return !this.googleId;
      }, 
      'Please add a password'
    ],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  googleId: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpire: Date,
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
}, {
  timestamps: true
});

// Encrypt password before saving - only if password is modified and exists
userSchema.pre('save', async function(next) {
  // Skip if password is not modified or doesn't exist (Google users)
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update passwordChangedAt when password is changed - only if password exists
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew || !this.password) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Compare entered password with hashed password - only for non-Google users
userSchema.methods.comparePassword = async function(enteredPassword) {
  try {
    // If user has no password (Google user), return false
    if (!this.password) {
      return false;
    }
    
    if (!enteredPassword || !this.password) {
      console.error('Missing password for comparison:', { 
        entered: !!enteredPassword, 
        stored: !!this.password 
      });
      return false;
    }
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    console.error('bcrypt compare error:', error);
    return false;
  }
};

// Generate password reset token - only for users with password
userSchema.methods.generatePasswordResetToken = function() {
  // Don't generate reset token for Google users
  if (!this.password) {
    return null;
  }
  
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment login attempts
userSchema.methods.incrementLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
  }
  
  return this.updateOne(updates);
};

const User = mongoose.model('User', userSchema);

export default User;