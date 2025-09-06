const express = require('express');
const passport = require('passport');
const { authenticateToken, authenticateRefreshToken } = require('../middleware/auth');
const { authValidation } = require('../middleware/validation');
const { generateTokens } = require('../utils/jwt');
const { hashPassword, comparePassword } = require('../utils/password');
const { 
  getCollection, 
  addToCollection, 
  updateItemInCollection, 
  findInCollection,
  updateCollection 
} = require('../utils/dataPersistence');

const router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @desc    User registration
 * @access  Public
 */
router.post('/signup', authValidation.signup, async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if user already exists
    const existingUser = findInCollection('users', user => user.email === email);
    if (existingUser) {
      return res.status(400).json({
        error: 'User Already Exists',
        message: 'A user with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      firstName,
      lastName,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEmailVerified: false,
      profile: {
        picture: null,
        bio: null,
        company: null,
        socialLinks: {}
      }
    };

    // Add user to collection
    addToCollection('users', newUser);

    // Generate tokens
    const tokens = generateTokens({
      userId: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName
    });

    // Store refresh token
    addToCollection('refreshTokens', {
      userId: newUser.id,
      token: tokens.refreshToken,
      createdAt: new Date().toISOString()
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword,
      tokens
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Registration Failed',
      message: 'Failed to create user account'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', authValidation.login, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = findInCollection('users', u => u.email === email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });

    // Store refresh token
    addToCollection('refreshTokens', {
      userId: user.id,
      token: tokens.refreshToken,
      createdAt: new Date().toISOString()
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      tokens
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login Failed',
      message: 'Failed to authenticate user'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authenticateRefreshToken, (req, res) => {
  try {
    const { userId } = req.user;

    // Find user
    const user = findInCollection('users', u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });

    // Update refresh token
    const refreshTokens = getCollection('refreshTokens');
    const tokenIndex = refreshTokens.findIndex(rt => rt.userId === userId);
    if (tokenIndex !== -1) {
      refreshTokens[tokenIndex] = {
        userId: user.id,
        token: tokens.refreshToken,
        createdAt: new Date().toISOString()
      };
      updateCollection('refreshTokens', refreshTokens);
    }

    res.json({
      message: 'Token refreshed successfully',
      tokens
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token Refresh Failed',
      message: 'Failed to refresh token'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    User logout
 * @access  Private
 */
router.post('/logout', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;

    // Remove refresh token
    const refreshTokens = getCollection('refreshTokens');
    const filteredTokens = refreshTokens.filter(rt => rt.userId !== userId);
    updateCollection('refreshTokens', filteredTokens);

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout Failed',
      message: 'Failed to logout user'
    });
  }
});

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;

    // Remove all refresh tokens for this user
    const refreshTokens = getCollection('refreshTokens');
    const filteredTokens = refreshTokens.filter(rt => rt.userId !== userId);
    updateCollection('refreshTokens', filteredTokens);

    res.json({
      message: 'Logged out from all devices successfully'
    });

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Logout Failed',
      message: 'Failed to logout from all devices'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;

    const user = findInCollection('users', u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Profile Fetch Failed',
      message: 'Failed to fetch user profile'
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticateToken, authValidation.changePassword, async (req, res) => {
  try {
    const { userId } = req.user;
    const { currentPassword, newPassword } = req.body;

    const user = findInCollection('users', u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Invalid Password',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    updateItemInCollection('users', userId, {
      password: hashedNewPassword,
      updatedAt: new Date().toISOString()
    });

    // Remove refresh tokens (force re-login)
    const refreshTokens = getCollection('refreshTokens');
    const filteredTokens = refreshTokens.filter(rt => rt.userId !== userId);
    updateCollection('refreshTokens', filteredTokens);

    res.json({
      message: 'Password changed successfully. Please login again.'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Password Change Failed',
      message: 'Failed to change password'
    });
  }
});

// Google OAuth routes
/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth
 * @access  Public
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  (req, res) => {
    try {
      // This will be implemented when we add Google OAuth strategy
      res.json({
        message: 'Google OAuth callback - Implementation pending'
      });
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.status(500).json({
        error: 'Google OAuth Failed',
        message: 'Failed to authenticate with Google'
      });
    }
  }
);

module.exports = router;
