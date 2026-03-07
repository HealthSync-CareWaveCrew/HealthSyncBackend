import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  token: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['refresh', 'emailVerification', 'passwordReset'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  blacklisted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Auto remove expired tokens
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Token = mongoose.model('Token', tokenSchema);

export default Token;