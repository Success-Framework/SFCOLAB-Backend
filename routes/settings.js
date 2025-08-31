const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { profileValidation, authValidation } = require('../middleware/validation');
const { hashPassword, comparePassword } = require('../utils/password');

const router = express.Router();

// Import user data from auth routes (replace with database operations later)
const { users } = require('./auth');

/**
 * @route   GET /api/settings/profile
 * @desc    Get user profile settings
 * @access  Private
 */
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Return profile data without sensitive information
    const profileData = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profile: user.profile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      profile: profileData
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch profile settings'
    });
  }
});

/**
 * @route   PUT /api/settings/profile
 * @desc    Update user profile settings
 * @access  Private
 */
router.put('/profile', authenticateToken, profileValidation.updateProfile, (req, res) => {
  try {
    const { userId } = req.user;
    const { firstName, lastName, bio, company, socialLinks } = req.body;

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Update profile fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (bio !== undefined) user.profile.bio = bio;
    if (company !== undefined) user.profile.company = company;
    if (socialLinks !== undefined) {
      user.profile.socialLinks = {
        ...user.profile.socialLinks,
        ...socialLinks
      };
    }

    user.updatedAt = new Date().toISOString();

    // Return updated profile data
    const profileData = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profile: user.profile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      message: 'Profile updated successfully',
      profile: profileData
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to update profile settings'
    });
  }
});

/**
 * @route   POST /api/settings/profile/picture
 * @desc    Update user profile picture
 * @access  Private
 */
router.post('/profile/picture', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;
    const { pictureUrl } = req.body;

    if (!pictureUrl) {
      return res.status(400).json({
        error: 'Picture URL Required',
        message: 'Picture URL is required'
      });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Update profile picture
    user.profile.picture = pictureUrl;
    user.updatedAt = new Date().toISOString();

    res.json({
      message: 'Profile picture updated successfully',
      picture: pictureUrl
    });

  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to update profile picture'
    });
  }
});

/**
 * @route   DELETE /api/settings/profile/picture
 * @desc    Remove user profile picture
 * @access  Private
 */
router.delete('/profile/picture', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Remove profile picture
    user.profile.picture = null;
    user.updatedAt = new Date().toISOString();

    res.json({
      message: 'Profile picture removed successfully'
    });

  } catch (error) {
    console.error('Remove profile picture error:', error);
    res.status(500).json({
      error: 'Removal Failed',
      message: 'Failed to remove profile picture'
    });
  }
});

/**
 * @route   GET /api/settings/account
 * @desc    Get account and security settings
 * @access  Private
 */
router.get('/account', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Return account data without sensitive information
    const accountData = {
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin || null
    };

    res.json({
      account: accountData
    });

  } catch (error) {
    console.error('Get account settings error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch account settings'
    });
  }
});

/**
 * @route   POST /api/settings/account/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/account/change-password', authenticateToken, authValidation.changePassword, async (req, res) => {
  try {
    const { userId } = req.user;
    const { currentPassword, newPassword } = req.body;

    const user = users.find(u => u.id === userId);
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
    user.password = hashedNewPassword;
    user.updatedAt = new Date().toISOString();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Password Change Failed',
      message: 'Failed to change password'
    });
  }
});

/**
 * @route   POST /api/settings/account/change-email
 * @desc    Change user email
 * @access  Private
 */
router.post('/account/change-email', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({
        error: 'Missing Fields',
        message: 'New email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        error: 'Invalid Email',
        message: 'Please provide a valid email address'
      });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Check if new email already exists
    const existingUser = users.find(u => u.email === newEmail && u.id !== userId);
    if (existingUser) {
      return res.status(400).json({
        error: 'Email Already Exists',
        message: 'A user with this email already exists'
      });
    }

    // Verify password
    comparePassword(password, user.password).then(isValid => {
      if (!isValid) {
        return res.status(400).json({
          error: 'Invalid Password',
          message: 'Password is incorrect'
        });
      }

      // Update email
      user.email = newEmail;
      user.isEmailVerified = false; // Reset email verification
      user.updatedAt = new Date().toISOString();

      // TODO: Send verification email to new email address
      // This will be implemented when email service is set up

      res.json({
        message: 'Email changed successfully. Please verify your new email address.'
      });
    });

  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({
      error: 'Email Change Failed',
      message: 'Failed to change email'
    });
  }
});

/**
 * @route   POST /api/settings/account/delete-account
 * @desc    Delete user account
 * @access  Private
 */
router.post('/account/delete-account', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;
    const { password, confirmation } = req.body;

    if (!password || !confirmation) {
      return res.status(400).json({
        error: 'Missing Fields',
        message: 'Password and confirmation are required'
      });
    }

    if (confirmation !== 'DELETE') {
      return res.status(400).json({
        error: 'Invalid Confirmation',
        message: 'Please type DELETE to confirm account deletion'
      });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Verify password
    comparePassword(password, user.password).then(isValid => {
      if (!isValid) {
        return res.status(400).json({
          error: 'Invalid Password',
          message: 'Password is incorrect'
        });
      }

      // TODO: Implement account deletion logic
      // This will be implemented when database is set up
      // For now, just mark as deleted
      user.status = 'deleted';
      user.updatedAt = new Date().toISOString();

      res.json({
        message: 'Account deletion request submitted successfully'
      });
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      error: 'Account Deletion Failed',
      message: 'Failed to delete account'
    });
  }
});

/**
 * @route   GET /api/settings/preferences
 * @desc    Get user preferences
 * @access  Private
 */
router.get('/preferences', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Return preferences (default values if not set)
    const preferences = {
      emailNotifications: user.preferences?.emailNotifications ?? true,
      pushNotifications: user.preferences?.pushNotifications ?? true,
      privacy: user.preferences?.privacy ?? 'public',
      language: user.preferences?.language ?? 'en',
      timezone: user.preferences?.timezone ?? 'UTC',
      theme: user.preferences?.theme ?? 'light'
    };

    res.json({
      preferences
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch preferences'
    });
  }
});

/**
 * @route   PUT /api/settings/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/preferences', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;
    const { 
      emailNotifications, 
      pushNotifications, 
      privacy, 
      language, 
      timezone, 
      theme 
    } = req.body;

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Initialize preferences if not exists
    if (!user.preferences) {
      user.preferences = {};
    }

    // Update preferences
    if (emailNotifications !== undefined) user.preferences.emailNotifications = emailNotifications;
    if (pushNotifications !== undefined) user.preferences.pushNotifications = pushNotifications;
    if (privacy !== undefined) user.preferences.privacy = privacy;
    if (language !== undefined) user.preferences.language = language;
    if (timezone !== undefined) user.preferences.timezone = timezone;
    if (theme !== undefined) user.preferences.theme = theme;

    user.updatedAt = new Date().toISOString();

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to update preferences'
    });
  }
});

/**
 * @route   GET /api/settings/notifications
 * @desc    Get notification settings
 * @access  Private
 */
router.get('/notifications', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Return notification settings (default values if not set)
    const notificationSettings = {
      newComments: user.notificationSettings?.newComments ?? true,
      newLikes: user.notificationSettings?.newLikes ?? true,
      newSuggestions: user.notificationSettings?.newSuggestions ?? true,
      joinRequests: user.notificationSettings?.joinRequests ?? true,
      approvals: user.notificationSettings?.approvals ?? true,
      storyViews: user.notificationSettings?.storyViews ?? true,
      postEngagement: user.notificationSettings?.postEngagement ?? true,
      emailDigest: user.notificationSettings?.emailDigest ?? 'weekly',
      quietHours: user.notificationSettings?.quietHours ?? { enabled: false, start: '22:00', end: '08:00' }
    };

    res.json({
      notificationSettings
    });

  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch notification settings'
    });
  }
});

/**
 * @route   PUT /api/settings/notifications
 * @desc    Update notification settings
 * @access  Private
 */
router.put('/notifications', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;
    const notificationSettings = req.body;

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found'
      });
    }

    // Initialize notification settings if not exists
    if (!user.notificationSettings) {
      user.notificationSettings = {};
    }

    // Update notification settings
    Object.assign(user.notificationSettings, notificationSettings);
    user.updatedAt = new Date().toISOString();

    res.json({
      message: 'Notification settings updated successfully',
      notificationSettings: user.notificationSettings
    });

  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to update notification settings'
    });
  }
});

module.exports = router;
