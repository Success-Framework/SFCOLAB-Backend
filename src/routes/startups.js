const express = require('express');
const router = express.Router();
const Startup = require('../models/Startup');
const { protect, checkOwnership } = require('../middleware/auth');
const Joi = require('joi');

// Validation schemas
const createStartupSchema = Joi.object({
  name: Joi.string().required().max(100),
  description: Joi.string().required().max(1000),
  industry: Joi.string().required().valid('Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Sustainability', 'Energy', 'Transportation', 'Entertainment', 'Other'),
  stage: Joi.string().required().valid('MVP Stage', 'Growth Stage', 'Scale Stage', 'Seed Stage', 'Series A', 'Series B', 'Series C', 'IPO'),
  location: Joi.string().required(),
  teamSize: Joi.number().required().min(1),
  founded: Joi.date().required(),
  funding: Joi.string().required(),
  website: Joi.string().uri().optional(),
  social: Joi.object({
    linkedin: Joi.string().uri().optional(),
    twitter: Joi.string().uri().optional(),
    facebook: Joi.string().uri().optional()
  }).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  metrics: Joi.object({
    users: Joi.string().optional(),
    revenue: Joi.string().optional(),
    growth: Joi.string().optional(),
    customers: Joi.string().optional()
  }).optional()
});

// @desc    Get all startups
// @route   GET /api/startups
// @access  Public
const getStartups = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      industry, 
      stage, 
      location,
      sort = 'createdAt',
      order = 'desc',
      featured
    } = req.query;

    // Build query
    let query = { isActive: true };

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by industry
    if (industry && industry !== 'All Industries') {
      query.industry = industry;
    }

    // Filter by stage
    if (stage && stage !== 'All Stages') {
      query.stage = stage;
    }

    // Filter by location
    if (location && location !== 'All Locations') {
      query.location = new RegExp(location, 'i');
    }

    // Filter by featured
    if (featured === 'true') {
      query.featured = true;
    }

    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const startups = await Startup.find(query)
      .populate('founder', 'profile.name profile.avatar username')
      .populate('logo', 'url')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Startup.countDocuments(query);

    res.json({
      success: true,
      count: startups.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: startups
    });
  } catch (error) {
    console.error('Get startups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create startup
// @route   POST /api/startups
// @access  Private
const createStartup = async (req, res) => {
  try {
    // Validate input
    const { error, value } = createStartupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Create startup
    const startup = new Startup({
      ...value,
      founder: req.user._id
    });

    await startup.save();

    // Populate founder info
    await startup.populate('founder', 'profile.name profile.avatar username');

    res.status(201).json({
      success: true,
      message: 'Startup created successfully',
      data: startup
    });
  } catch (error) {
    console.error('Create startup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during startup creation'
    });
  }
};

// @desc    Get startup by ID
// @route   GET /api/startups/:id
// @access  Public
const getStartupById = async (req, res) => {
  try {
    const startup = await Startup.findById(req.params.id)
      .populate('founder', 'profile.name profile.avatar username profile.bio')
      .populate('team.user', 'profile.name profile.avatar username profile.role')
      .populate('logo', 'url');

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    // Increment views
    startup.incrementViews();

    res.json({
      success: true,
      data: startup
    });
  } catch (error) {
    console.error('Get startup by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update startup
// @route   PUT /api/startups/:id
// @access  Private (founder or admin)
const updateStartup = async (req, res) => {
  try {
    const startup = await Startup.findById(req.params.id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    // Check ownership
    if (startup.founder.toString() !== req.user._id.toString() && req.user.profile.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this startup'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (startup[key] !== undefined) {
        startup[key] = req.body[key];
      }
    });

    await startup.save();

    // Populate founder info
    await startup.populate('founder', 'profile.name profile.avatar username');

    res.json({
      success: true,
      message: 'Startup updated successfully',
      data: startup
    });
  } catch (error) {
    console.error('Update startup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during startup update'
    });
  }
};

// @desc    Delete startup
// @route   DELETE /api/startups/:id
// @access  Private (founder or admin)
const deleteStartup = async (req, res) => {
  try {
    const startup = await Startup.findById(req.params.id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    // Check ownership
    if (startup.founder.toString() !== req.user._id.toString() && req.user.profile.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this startup'
      });
    }

    // Soft delete
    startup.isActive = false;
    await startup.save();

    res.json({
      success: true,
      message: 'Startup deleted successfully'
    });
  } catch (error) {
    console.error('Delete startup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during startup deletion'
    });
  }
};

// @desc    Search startups
// @route   GET /api/startups/search
// @access  Public
const searchStartups = async (req, res) => {
  try {
    const { 
      q, 
      industry, 
      stage, 
      location,
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
    if (industry && industry !== 'All Industries') {
      query.industry = industry;
    }

    if (stage && stage !== 'All Stages') {
      query.stage = stage;
    }

    if (location && location !== 'All Locations') {
      query.location = new RegExp(location, 'i');
    }

    const startups = await Startup.find(query)
      .populate('founder', 'profile.name profile.avatar username')
      .populate('logo', 'url')
      .limit(parseInt(limit))
      .sort({ score: { $meta: 'textScore' } });

    res.json({
      success: true,
      count: startups.length,
      data: startups
    });
  } catch (error) {
    console.error('Search startups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Like/Unlike startup
// @route   POST /api/startups/:id/like
// @access  Private
const toggleLike = async (req, res) => {
  try {
    const startup = await Startup.findById(req.params.id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    await startup.toggleLike(req.user._id);

    res.json({
      success: true,
      message: startup.likes.includes(req.user._id) ? 'Liked successfully' : 'Unliked successfully',
      data: {
        isLiked: startup.likes.includes(req.user._id),
        likeCount: startup.likeCount
      }
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Follow/Unfollow startup
// @route   POST /api/startups/:id/follow
// @access  Private
const toggleFollow = async (req, res) => {
  try {
    const startup = await Startup.findById(req.params.id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    await startup.toggleFollow(req.user._id);

    res.json({
      success: true,
      message: startup.followers.includes(req.user._id) ? 'Followed successfully' : 'Unfollowed successfully',
      data: {
        isFollowing: startup.followers.includes(req.user._id),
        followerCount: startup.followerCount
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

// @desc    Add team member
// @route   POST /api/startups/:id/team
// @access  Private (founder)
const addTeamMember = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        message: 'User ID and role are required'
      });
    }

    const startup = await Startup.findById(req.params.id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    // Check ownership
    if (startup.founder.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add team members'
      });
    }

    await startup.addTeamMember(userId, role);

    // Populate team info
    await startup.populate('team.user', 'profile.name profile.avatar username profile.role');

    res.json({
      success: true,
      message: 'Team member added successfully',
      data: startup.team
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Remove team member
// @route   DELETE /api/startups/:id/team/:userId
// @access  Private (founder)
const removeTeamMember = async (req, res) => {
  try {
    const { userId } = req.params;

    const startup = await Startup.findById(req.params.id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    // Check ownership
    if (startup.founder.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove team members'
      });
    }

    await startup.removeTeamMember(userId);

    res.json({
      success: true,
      message: 'Team member removed successfully'
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get startup statistics
// @route   GET /api/startups/stats
// @access  Public
const getStartupStats = async (req, res) => {
  try {
    const stats = await Startup.aggregate([
      {
        $group: {
          _id: '$industry',
          count: { $sum: 1 },
          avgTeamSize: { $avg: '$teamSize' }
        }
      }
    ]);

    const totalStartups = await Startup.countDocuments({ isActive: true });
    const totalFunding = await Startup.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalFunding: { $sum: { $toDouble: { $substr: ['$funding', 1, -1] } } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalStartups,
        totalFunding: totalFunding[0]?.totalFunding || 0,
        byIndustry: stats
      }
    });
  } catch (error) {
    console.error('Get startup stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Routes
router.get('/', getStartups);
router.get('/search', searchStartups);
router.get('/stats', getStartupStats);
router.get('/:id', getStartupById);
router.post('/', protect, createStartup);
router.put('/:id', protect, updateStartup);
router.delete('/:id', protect, deleteStartup);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/follow', protect, toggleFollow);
router.post('/:id/team', protect, addTeamMember);
router.delete('/:id/team/:userId', protect, removeTeamMember);

module.exports = router; 