const express = require('express');
const router = express.Router();
const Knowledge = require('../models/Knowledge');
const { protect, checkOwnership } = require('../middleware/auth');
const Joi = require('joi');

// Validation schemas
const createKnowledgeSchema = Joi.object({
  title: Joi.string().required().max(200),
  content: Joi.string().required().max(5000),
  category: Joi.string().required().valid('Technology', 'Business', 'Marketing', 'Finance', 'Legal', 'Design', 'Development', 'Strategy', 'Operations', 'Other'),
  type: Joi.string().required().valid('Article', 'Guide', 'Tutorial', 'Case Study', 'Template', 'Tool', 'Resource', 'FAQ'),
  tags: Joi.array().items(Joi.string()).optional(),
  difficulty: Joi.string().valid('Beginner', 'Intermediate', 'Advanced', 'Expert').optional(),
  estimatedTime: Joi.string().optional(),
  status: Joi.string().valid('Draft', 'Published', 'Under Review', 'Archived').optional(),
  isPublic: Joi.boolean().optional(),
  seo: Joi.object({
    metaDescription: Joi.string().max(160).optional(),
    keywords: Joi.array().items(Joi.string()).optional()
  }).optional()
});

// @desc    Get all knowledge resources
// @route   GET /api/knowledge
// @access  Public
const getKnowledge = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      category, 
      type,
      difficulty,
      sort = 'createdAt',
      order = 'desc',
      featured
    } = req.query;

    // Build query
    let query = { isPublic: true, status: 'Published' };

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by category
    if (category && category !== 'All Categories') {
      query.category = category;
    }

    // Filter by type
    if (type && type !== 'All Types') {
      query.type = type;
    }

    // Filter by difficulty
    if (difficulty && difficulty !== 'All Difficulties') {
      query.difficulty = difficulty;
    }

    // Filter by featured
    if (featured === 'true') {
      query.featured = true;
    }

    // Build sort object
    const sortObj = {};
    if (sort === 'rating') {
      sortObj['rating.average'] = order === 'desc' ? -1 : 1;
    } else if (sort === 'views') {
      sortObj.views = order === 'desc' ? -1 : 1;
    } else {
      sortObj[sort] = order === 'desc' ? -1 : 1;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const knowledge = await Knowledge.find(query)
      .populate('author', 'profile.name profile.avatar username')
      .populate('attachments', 'url originalName')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Knowledge.countDocuments(query);

    res.json({
      success: true,
      count: knowledge.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: knowledge
    });
  } catch (error) {
    console.error('Get knowledge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create knowledge resource
// @route   POST /api/knowledge
// @access  Private
const createKnowledge = async (req, res) => {
  try {
    // Validate input
    const { error, value } = createKnowledgeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Create knowledge resource
    const knowledge = new Knowledge({
      ...value,
      author: req.user._id
    });

    await knowledge.save();

    // Populate author info
    await knowledge.populate('author', 'profile.name profile.avatar username');

    res.status(201).json({
      success: true,
      message: 'Knowledge resource created successfully',
      data: knowledge
    });
  } catch (error) {
    console.error('Create knowledge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during knowledge creation'
    });
  }
};

// @desc    Get knowledge resource by ID
// @route   GET /api/knowledge/:id
// @access  Public
const getKnowledgeById = async (req, res) => {
  try {
    const knowledge = await Knowledge.findById(req.params.id)
      .populate('author', 'profile.name profile.avatar username profile.bio')
      .populate('comments.user', 'profile.name profile.avatar username')
      .populate('attachments', 'url originalName')
      .populate('relatedResources', 'title category type');

    if (!knowledge) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge resource not found'
      });
    }

    // Check if user can view this resource
    if (!knowledge.isPublic && (!req.user || knowledge.author._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Increment views
    knowledge.incrementViews();

    res.json({
      success: true,
      data: knowledge
    });
  } catch (error) {
    console.error('Get knowledge by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update knowledge resource
// @route   PUT /api/knowledge/:id
// @access  Private (author or admin)
const updateKnowledge = async (req, res) => {
  try {
    const knowledge = await Knowledge.findById(req.params.id);

    if (!knowledge) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge resource not found'
      });
    }

    // Check ownership
    if (knowledge.author.toString() !== req.user._id.toString() && req.user.profile.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this resource'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (knowledge[key] !== undefined) {
        knowledge[key] = req.body[key];
      }
    });

    // Update version if content changed
    if (req.body.content && req.body.content !== knowledge.content) {
      knowledge.updateVersion();
    }

    await knowledge.save();

    // Populate author info
    await knowledge.populate('author', 'profile.name profile.avatar username');

    res.json({
      success: true,
      message: 'Knowledge resource updated successfully',
      data: knowledge
    });
  } catch (error) {
    console.error('Update knowledge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during knowledge update'
    });
  }
};

// @desc    Delete knowledge resource
// @route   DELETE /api/knowledge/:id
// @access  Private (author or admin)
const deleteKnowledge = async (req, res) => {
  try {
    const knowledge = await Knowledge.findById(req.params.id);

    if (!knowledge) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge resource not found'
      });
    }

    // Check ownership
    if (knowledge.author.toString() !== req.user._id.toString() && req.user.profile.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this resource'
      });
    }

    await Knowledge.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Knowledge resource deleted successfully'
    });
  } catch (error) {
    console.error('Delete knowledge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during knowledge deletion'
    });
  }
};

// @desc    Search knowledge resources
// @route   GET /api/knowledge/search
// @access  Public
const searchKnowledge = async (req, res) => {
  try {
    const { 
      q, 
      category, 
      type,
      difficulty,
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
      isPublic: true,
      status: 'Published',
      $text: { $search: q }
    };

    // Add filters
    if (category && category !== 'All Categories') {
      query.category = category;
    }

    if (type && type !== 'All Types') {
      query.type = type;
    }

    if (difficulty && difficulty !== 'All Difficulties') {
      query.difficulty = difficulty;
    }

    const knowledge = await Knowledge.find(query)
      .populate('author', 'profile.name profile.avatar username')
      .limit(parseInt(limit))
      .sort({ score: { $meta: 'textScore' } });

    res.json({
      success: true,
      count: knowledge.length,
      data: knowledge
    });
  } catch (error) {
    console.error('Search knowledge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Like/Unlike knowledge resource
// @route   POST /api/knowledge/:id/like
// @access  Private
const toggleLike = async (req, res) => {
  try {
    const knowledge = await Knowledge.findById(req.params.id);

    if (!knowledge) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge resource not found'
      });
    }

    await knowledge.toggleLike(req.user._id);

    res.json({
      success: true,
      message: knowledge.likes.includes(req.user._id) ? 'Liked successfully' : 'Unliked successfully',
      data: {
        isLiked: knowledge.likes.includes(req.user._id),
        likeCount: knowledge.likeCount
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

// @desc    Bookmark/Unbookmark knowledge resource
// @route   POST /api/knowledge/:id/bookmark
// @access  Private
const toggleBookmark = async (req, res) => {
  try {
    const knowledge = await Knowledge.findById(req.params.id);

    if (!knowledge) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge resource not found'
      });
    }

    await knowledge.toggleBookmark(req.user._id);

    res.json({
      success: true,
      message: knowledge.bookmarks.includes(req.user._id) ? 'Bookmarked successfully' : 'Unbookmarked successfully',
      data: {
        isBookmarked: knowledge.bookmarks.includes(req.user._id),
        bookmarkCount: knowledge.bookmarkCount
      }
    });
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Rate knowledge resource
// @route   POST /api/knowledge/:id/rate
// @access  Private
const rateKnowledge = async (req, res) => {
  try {
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const knowledge = await Knowledge.findById(req.params.id);

    if (!knowledge) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge resource not found'
      });
    }

    await knowledge.addRating(req.user._id, rating);

    res.json({
      success: true,
      message: 'Rating added successfully',
      data: {
        averageRating: knowledge.rating.average,
        ratingCount: knowledge.rating.count
      }
    });
  } catch (error) {
    console.error('Rate knowledge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add comment
// @route   POST /api/knowledge/:id/comment
// @access  Private
const addComment = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const knowledge = await Knowledge.findById(req.params.id);

    if (!knowledge) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge resource not found'
      });
    }

    await knowledge.addComment(req.user._id, content);

    // Populate comment user info
    await knowledge.populate('comments.user', 'profile.name profile.avatar username');

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: knowledge.comments[knowledge.comments.length - 1]
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Remove comment
// @route   DELETE /api/knowledge/:id/comment/:commentId
// @access  Private (comment author or resource author)
const removeComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const knowledge = await Knowledge.findById(req.params.id);

    if (!knowledge) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge resource not found'
      });
    }

    const comment = knowledge.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user can delete this comment
    if (comment.user.toString() !== req.user._id.toString() && knowledge.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    await knowledge.removeComment(commentId);

    res.json({
      success: true,
      message: 'Comment removed successfully'
    });
  } catch (error) {
    console.error('Remove comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Toggle featured status
// @route   POST /api/knowledge/:id/featured
// @access  Private (admin)
const toggleFeatured = async (req, res) => {
  try {
    const knowledge = await Knowledge.findById(req.params.id);

    if (!knowledge) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge resource not found'
      });
    }

    // Check if user is admin
    if (req.user.profile.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to toggle featured status'
      });
    }

    await knowledge.toggleFeatured();

    res.json({
      success: true,
      message: knowledge.featured ? 'Resource featured successfully' : 'Resource unfeatured successfully',
      data: {
        featured: knowledge.featured
      }
    });
  } catch (error) {
    console.error('Toggle featured error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's bookmarks
// @route   GET /api/knowledge/bookmarks
// @access  Private
const getBookmarks = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const knowledge = await Knowledge.find({
      bookmarks: req.user._id,
      isPublic: true,
      status: 'Published'
    })
      .populate('author', 'profile.name profile.avatar username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Knowledge.countDocuments({
      bookmarks: req.user._id,
      isPublic: true,
      status: 'Published'
    });

    res.json({
      success: true,
      count: knowledge.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: knowledge
    });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Routes
router.get('/', getKnowledge);
router.get('/search', searchKnowledge);
router.get('/bookmarks', protect, getBookmarks);
router.get('/:id', getKnowledgeById);
router.post('/', protect, createKnowledge);
router.put('/:id', protect, updateKnowledge);
router.delete('/:id', protect, deleteKnowledge);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/bookmark', protect, toggleBookmark);
router.post('/:id/rate', protect, rateKnowledge);
router.post('/:id/comment', protect, addComment);
router.delete('/:id/comment/:commentId', protect, removeComment);
router.post('/:id/featured', protect, toggleFeatured);

module.exports = router; 