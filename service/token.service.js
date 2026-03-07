const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Token = require('../models/Token');

class TokenService {
  generateTokens(user) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    return { accessToken, refreshToken };
  }

  generateAccessToken(user) {
    return jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // Short-lived access token
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Long-lived refresh token
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  async saveRefreshToken(userId, refreshToken) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await Token.create({
      userId,
      token: refreshToken,
      type: 'refresh',
      expiresAt
    });
  }

  async blacklistRefreshToken(refreshToken) {
    await Token.findOneAndUpdate(
      { token: refreshToken },
      { blacklisted: true }
    );
  }

  async isRefreshTokenValid(refreshToken) {
    const tokenDoc = await Token.findOne({
      token: refreshToken,
      type: 'refresh',
      blacklisted: false,
      expiresAt: { $gt: new Date() }
    });
    return !!tokenDoc;
  }

  generateRandomToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

module.exports = new TokenService();