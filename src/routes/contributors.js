const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

// @desc    Get all contributors
// @route   GET /api/contributors
// @access  Public
const getContributors = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      userType, 
      availability, 
      position,
      skills,
      location,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build query
    let query = { isActive: true };

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by user type
    if (userType && userType !== 'All User Types') {
      query['profile.role'] = userType;
    }

    // Filter by availability
    if (availability && availability !== 'All Availability') {
      query['profile.availability'] = availability;
    }

    // Filter by position
    if (position && position !== 'All Positions') {
      query['profile.position'] = new RegExp(position, 'i');
    }

    // Filter by skills
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      query['profile.skills'] = { $in: skillsArray };
    }

    // Filter by location
    if (location && location !== 'All Locations') {
      query['profile.location'] = new RegExp(location, 'i');
    }

    // Build sort object
    const sortObj = {};
    if (sort === 'rating') {
      sortObj['metrics.rating'] = order === 'desc' ? -1 : 1;
    } else if (sort === 'contributions') {
      sortObj['metrics.contributions'] = order === 'desc' ? -1 : 1;
    } else {
      sortObj[sort] = order === 'desc' ? -1 : 1;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const contributors = await User.find(query)
      .select('-password -refreshToken')
      .populate('profile.avatar', 'url')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: contributors.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: contributors
    });
  } catch (error) {
    console.error('Get contributors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Search contributors
// @route   GET /api/contributors/search
// @access  Public
const searchContributors = async (req, res) => {
  try {
    const { 
      q, 
      userType, 
      availability, 
      position,
      skills,
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
    if (userType && userType !== 'All User Types') {
      query['profile.role'] = userType;
    }

    if (availability && availability !== 'All Availability') {
      query['profile.availability'] = availability;
    }

    if (position && position !== 'All Positions') {
      query['profile.position'] = new RegExp(position, 'i');
    }

    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      query['profile.skills'] = { $in: skillsArray };
    }

    if (location && location !== 'All Locations') {
      query['profile.location'] = new RegExp(location, 'i');
    }

    const contributors = await User.find(query)
      .select('-password -refreshToken')
      .populate('profile.avatar', 'url')
      .limit(parseInt(limit))
      .sort({ score: { $meta: 'textScore' } });

    res.json({
      success: true,
      count: contributors.length,
      data: contributors
    });
  } catch (error) {
    console.error('Search contributors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get contributor by ID
// @route   GET /api/contributors/:id
// @access  Public
const getContributorById = async (req, res) => {
  try {
    const contributor = await User.findById(req.params.id)
      .select('-password -refreshToken')
      .populate('profile.avatar', 'url');

    if (!contributor) {
      return res.status(404).json({
        success: false,
        message: 'Contributor not found'
      });
    }

    // Get contributor's projects
    const projects = await Project.find({ author: contributor._id, isPublic: true })
      .select('header stage category createdAt likeCount')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get contributor's skills and experience
    const contributorData = {
      ...contributor.toObject(),
      projects,
      totalProjects: await Project.countDocuments({ author: contributor._id, isPublic: true })
    };

    res.json({
      success: true,
      data: contributorData
    });
  } catch (error) {
    console.error('Get contributor by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Apply for project
// @route   POST /api/contributors/apply
// @access  Private
const applyForProject = async (req, res) => {
  try {
    const { projectId, message, role } = req.body;

    if (!projectId || !message || !role) {
      return res.status(400).json({
        success: false,
        message: 'Project ID, message, and role are required'
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is already a collaborator
    const isAlreadyCollaborator = project.collaborators.some(
      collab => collab.user.toString() === req.user._id.toString()
    );

    if (isAlreadyCollaborator) {
      return res.status(400).json({
        success: false,
        message: 'You are already a collaborator on this project'
      });
    }

    // Check if user has already applied
    const hasApplied = project.applications && project.applications.some(
      app => app.user.toString() === req.user._id.toString()
    );

    if (hasApplied) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this project'
      });
    }

    // Add application to project
    if (!project.applications) {
      project.applications = [];
    }

    project.applications.push({
      user: req.user._id,
      message,
      role,
      status: 'Pending',
      appliedAt: new Date()
    });

    await project.save();

    res.json({
      success: true,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Apply for project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get project applications
// @route   GET /api/projects/:id/applications
// @access  Private (project author)
const getProjectApplications = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('applications.user', 'profile.name profile.avatar username profile.skills profile.experience');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is the project author
    if (project.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view applications'
      });
    }

    res.json({
      success: true,
      count: project.applications ? project.applications.length : 0,
      data: project.applications || []
    });
  } catch (error) {
    console.error('Get project applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update application status
// @route   PUT /api/projects/:id/applications/:applicationId
// @access  Private (project author)
const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { applicationId } = req.params;

    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be Pending, Approved, or Rejected'
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is the project author
    if (project.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update applications'
      });
    }

    const application = project.applications.id(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    application.status = status;
    application.updatedAt = new Date();

    // If approved, add as collaborator
    if (status === 'Approved') {
      await project.addCollaborator(application.user, application.role);
    }

    await project.save();

    res.json({
      success: true,
      message: `Application ${status.toLowerCase()} successfully`
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's applications
// @route   GET /api/contributors/applications
// @access  Private
const getUserApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user._id;

    // Find projects where user has applied
    const projects = await Project.find({
      'applications.user': userId
    })
      .populate('author', 'profile.name profile.avatar username')
      .select('header applications author createdAt');

    // Filter applications for this user
    let applications = projects.flatMap(project => 
      project.applications
        .filter(app => app.user.toString() === userId.toString())
        .map(app => ({
          ...app.toObject(),
          project: {
            id: project._id,
            header: project.header,
            author: project.author,
            createdAt: project.createdAt
          }
        }))
    );

    // Filter by status
    if (status && status !== 'All') {
      applications = applications.filter(app => app.status === status);
    }

    // Sort by application date
    applications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    // Pagination
    const total = applications.length;
    const skip = (page - 1) * limit;
    const paginatedApplications = applications.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      count: paginatedApplications.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: paginatedApplications
    });
  } catch (error) {
    console.error('Get user applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get contributor statistics
// @route   GET /api/contributors/stats
// @access  Public
const getContributorStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$profile.role',
          count: { $sum: 1 },
          avgRating: { $avg: '$metrics.rating' },
          avgContributions: { $avg: '$metrics.contributions' }
        }
      }
    ]);

    const totalContributors = await User.countDocuments({ isActive: true });
    const availableContributors = await User.countDocuments({ 
      isActive: true, 
      'profile.availability': { $in: ['Available Now', 'Available in 1 Week'] }
    });

    res.json({
      success: true,
      data: {
        totalContributors,
        availableContributors,
        byRole: stats
      }
    });
  } catch (error) {
    console.error('Get contributor stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Routes
router.get('/', getContributors);
router.get('/search', searchContributors);
router.get('/stats', getContributorStats);
router.get('/applications', protect, getUserApplications);
router.get('/:id', getContributorById);
router.post('/apply', protect, applyForProject);
router.get('/projects/:id/applications', protect, getProjectApplications);
router.put('/projects/:id/applications/:applicationId', protect, updateApplicationStatus);

module.exports = router; 