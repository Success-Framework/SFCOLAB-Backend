const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const Joi = require('joi');

// Validation schemas
const updateUserSchema = Joi.object({
  profile: Joi.object({
    name: Joi.string().optional(),
    bio: Joi.string().max(500).optional(),
    role: Joi.string().valid('Employee', 'Founder', 'Investor', 'Mentor', 'Student').optional(),
    skills: Joi.array().items(Joi.string()).optional(),
    experience: Joi.array().items(Joi.object({
      title: Joi.string().required(),
      company: Joi.string().required(),
      duration: Joi.string().required(),
      description: Joi.string().optional()
    })).optional(),
    availability: Joi.string().valid('Available Now', 'Available in 1 Week', 'Available in 1 Month', 'Full-time', 'Part-time', 'Not Available').optional(),
    position: Joi.string().optional(),
    location: Joi.string().optional(),
    website: Joi.string().uri().optional(),
    social: Joi.object({
      linkedin: Joi.string().uri().optional(),
      twitter: Joi.string().uri().optional(),
      github: Joi.string().uri().optional()
    }).optional()
  }).optional(),
  isActive: Joi.boolean().optional(),
  isVerified: Joi.boolean().optional()
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      role, 
      availability, 
      location,
      skills,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build query
    let query = { isActive: true };

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by role
    if (role && role !== 'All Roles') {
      query['profile.role'] = role;
    }

    // Filter by availability
    if (availability && availability !== 'All Availability') {
      query['profile.availability'] = availability;
    }

    // Filter by location
    if (location && location !== 'All Locations') {
      query['profile.location'] = new RegExp(location, 'i');
    }

    // Filter by skills
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      query['profile.skills'] = { $in: skillsArray };
    }

    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .select('-password -refreshToken')
      .populate('profile.avatar', 'url')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken')
      .populate('profile.avatar', 'url');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Increment views if not the user's own profile
    if (!req.user || req.user._id.toString() !== req.params.id) {
      // Note: User model doesn't have views field, but could be added
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (own profile or admin)
const updateUser = async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user can update this profile
    if (req.user._id.toString() !== req.params.id && req.user.profile.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }

    // Update fields
    Object.keys(value).forEach(key => {
      if (key === 'profile') {
        Object.keys(value.profile).forEach(profileKey => {
          if (user.profile[profileKey] !== undefined) {
            user.profile[profileKey] = value.profile[profileKey];
          }
        });
      } else {
        user[key] = value[key];
      }
    });

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during user update'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (own profile or admin)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user can delete this profile
    if (req.user._id.toString() !== req.params.id && req.user.profile.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this user'
      });
    }

    // Soft delete - set isActive to false
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during user deletion'
    });
  }
};

// @desc    Search users
// @route   GET /api/users/search
// @access  Public
const searchUsers = async (req, res) => {
  try {
    const { 
      q, 
      role, 
      availability, 
      location, 
      skills,
      limit = 20 
    } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Build search query
    let query = {
      isActive: true,
      $text: { $search: q }
    };

    // Add filters
    if (role && role !== 'All Roles') {
      query['profile.role'] = role;
    }

    if (availability && availability !== 'All Availability') {
      query['profile.availability'] = availability;
    }

    if (location && location !== 'All Locations') {
      query['profile.location'] = new RegExp(location, 'i');
    }

    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      query['profile.skills'] = { $in: skillsArray };
    }

    const users = await User.find(query)
      .select('-password -refreshToken')
      .populate('profile.avatar', 'url')
      .limit(parseInt(limit))
      .sort({ score: { $meta: 'textScore' } });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private (admin)
const getUserStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$profile.role',
          count: { $sum: 1 },
          avgRating: { $avg: '$metrics.rating' }
        }
      }
    ]);

    const totalUsers = await User.countDocuments({ isActive: true });
    const verifiedUsers = await User.countDocuments({ isActive: true, isVerified: true });
    const recentUsers = await User.countDocuments({
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        recentUsers,
        byRole: stats
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Follow/Unfollow user
// @route   POST /api/users/:id/follow
// @access  Private
const toggleFollow = async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    // Check if already following
    const isFollowing = currentUser.following && currentUser.following.includes(req.params.id);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(id => id.toString() !== req.params.id);
      userToFollow.metrics.followers = Math.max(0, userToFollow.metrics.followers - 1);
    } else {
      // Follow
      if (!currentUser.following) currentUser.following = [];
      currentUser.following.push(req.params.id);
      userToFollow.metrics.followers += 1;
    }

    await Promise.all([currentUser.save(), userToFollow.save()]);

    res.json({
      success: true,
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
      data: {
        isFollowing: !isFollowing,
        followersCount: userToFollow.metrics.followers
      }
    });
  } catch (error) {
    console.error('Toggle follow error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Routes
router.get('/', protect, getUsers);
router.get('/search', searchUsers);
router.get('/stats', protect, authorize('Admin'), getUserStats);
router.get('/:id', getUserById);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);
router.post('/:id/follow', protect, toggleFollow);

module.exports = router; 