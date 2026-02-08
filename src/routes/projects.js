const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { protect, checkOwnership } = require('../middleware/auth');
const Joi = require('joi');

// Validation schemas
const createProjectSchema = Joi.object({
  header: Joi.string().required().max(200),
  content: Joi.string().required().max(2000),
  stage: Joi.string().required().valid('Idea Stage', 'Concept Stage', 'Development Stage', 'Research Stage', 'MVP Stage', 'Growth Stage', 'Scale Stage'),
  category: Joi.string().required().valid('Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Sustainability', 'Energy', 'Transportation', 'Entertainment', 'Other'),
  tags: Joi.array().items(Joi.string()).optional(),
  status: Joi.string().valid('Draft', 'Published', 'In Progress', 'Completed', 'Archived').optional(),
  isPublic: Joi.boolean().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  budget: Joi.string().optional(),
  requirements: Joi.array().items(Joi.string()).optional(),
  goals: Joi.array().items(Joi.string()).optional(),
  metrics: Joi.object({
    impact: Joi.string().valid('Low', 'Medium', 'High', 'Very High').optional(),
    complexity: Joi.string().valid('Low', 'Medium', 'High', 'Very High').optional(),
    timeline: Joi.string().optional()
  }).optional()
});

// @desc    Get all projects
// @route   GET /api/projects
// @access  Public
const getProjects = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      stage, 
      category, 
      author,
      status = 'Published',
      sort = 'createdAt',
      order = 'desc',
      featured
    } = req.query;

    // Build query
    let query = { isPublic: true };

    // Filter by status
    if (status && status !== 'All') {
      query.status = status;
    }

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by stage
    if (stage && stage !== 'All Stages') {
      query.stage = stage;
    }

    // Filter by category
    if (category && category !== 'All Categories') {
      query.category = category;
    }

    // Filter by author
    if (author) {
      query.author = author;
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
    const projects = await Project.find(query)
      .populate('author', 'profile.name profile.avatar username')
      .populate('collaborators.user', 'profile.name profile.avatar username')
      .populate('attachments', 'url originalName')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      count: projects.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: projects
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  try {
    // Validate input
    const { error, value } = createProjectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Create project
    const project = new Project({
      ...value,
      author: req.user._id
    });

    await project.save();

    // Populate author info
    await project.populate('author', 'profile.name profile.avatar username');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during project creation'
    });
  }
};

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Public
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('author', 'profile.name profile.avatar username profile.bio')
      .populate('collaborators.user', 'profile.name profile.avatar username profile.role')
      .populate('comments.user', 'profile.name profile.avatar username')
      .populate('attachments', 'url originalName');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user can view this project
    if (!project.isPublic && (!req.user || project.author._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Increment views
    project.incrementViews();

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (author or admin)
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check ownership
    if (project.author.toString() !== req.user._id.toString() && req.user.profile.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (project[key] !== undefined) {
        project[key] = req.body[key];
      }
    });

    await project.save();

    // Populate author info
    await project.populate('author', 'profile.name profile.avatar username');

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during project update'
    });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (author or admin)
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check ownership
    if (project.author.toString() !== req.user._id.toString() && req.user.profile.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this project'
      });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during project deletion'
    });
  }
};

// @desc    Search projects
// @route   GET /api/projects/search
// @access  Public
const searchProjects = async (req, res) => {
  try {
    const { 
      q, 
      stage, 
      category,
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
    if (stage && stage !== 'All Stages') {
      query.stage = stage;
    }

    if (category && category !== 'All Categories') {
      query.category = category;
    }

    const projects = await Project.find(query)
      .populate('author', 'profile.name profile.avatar username')
      .populate('collaborators.user', 'profile.name profile.avatar username')
      .limit(parseInt(limit))
      .sort({ score: { $meta: 'textScore' } });

    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    console.error('Search projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Like/Unlike project
// @route   POST /api/projects/:id/like
// @access  Private
const toggleLike = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await project.toggleLike(req.user._id);

    res.json({
      success: true,
      message: project.likes.includes(req.user._id) ? 'Liked successfully' : 'Unliked successfully',
      data: {
        isLiked: project.likes.includes(req.user._id),
        likeCount: project.likeCount
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

// @desc    Add comment
// @route   POST /api/projects/:id/comment
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

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await project.addComment(req.user._id, content);

    // Populate comment user info
    await project.populate('comments.user', 'profile.name profile.avatar username');

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: project.comments[project.comments.length - 1]
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
// @route   DELETE /api/projects/:id/comment/:commentId
// @access  Private (comment author or project author)
const removeComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const comment = project.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user can delete this comment
    if (comment.user.toString() !== req.user._id.toString() && project.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    await project.removeComment(commentId);

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

// @desc    Add collaborator
// @route   POST /api/projects/:id/collaborate
// @access  Private (project author)
const addCollaborator = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        message: 'User ID and role are required'
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check ownership
    if (project.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add collaborators'
      });
    }

    await project.addCollaborator(userId, role);

    // Populate collaborator info
    await project.populate('collaborators.user', 'profile.name profile.avatar username profile.role');

    res.json({
      success: true,
      message: 'Collaborator added successfully',
      data: project.collaborators
    });
  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Remove collaborator
// @route   DELETE /api/projects/:id/collaborate/:userId
// @access  Private (project author)
const removeCollaborator = async (req, res) => {
  try {
    const { userId } = req.params;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check ownership
    if (project.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove collaborators'
      });
    }

    await project.removeCollaborator(userId);

    res.json({
      success: true,
      message: 'Collaborator removed successfully'
    });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Toggle featured status
// @route   POST /api/projects/:id/featured
// @access  Private (admin)
const toggleFeatured = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is admin
    if (req.user.profile.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to toggle featured status'
      });
    }

    await project.toggleFeatured();

    res.json({
      success: true,
      message: project.featured ? 'Project featured successfully' : 'Project unfeatured successfully',
      data: {
        featured: project.featured
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

// Routes
router.get('/', getProjects);
router.get('/search', searchProjects);
router.get('/:id', getProjectById);
router.post('/', protect, createProject);
router.put('/:id', protect, updateProject);
router.delete('/:id', protect, deleteProject);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/comment', protect, addComment);
router.delete('/:id/comment/:commentId', protect, removeComment);
router.post('/:id/collaborate', protect, addCollaborator);
router.delete('/:id/collaborate/:userId', protect, removeCollaborator);
router.post('/:id/featured', protect, toggleFeatured);

module.exports = router; 