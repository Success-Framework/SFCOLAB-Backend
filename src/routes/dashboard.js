const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Startup = require('../models/Startup');
const Project = require('../models/Project');
const Knowledge = require('../models/Knowledge');
const { protect } = require('../middleware/auth');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's startups
    const userStartups = await Startup.countDocuments({ founder: userId, isActive: true });
    
    // Get user's projects
    const userProjects = await Project.countDocuments({ author: userId, isPublic: true });
    
    // Get user's knowledge resources
    const userKnowledge = await Knowledge.countDocuments({ author: userId, isPublic: true, status: 'Published' });
    
    // Get user's contributions (projects + knowledge)
    const totalContributions = userProjects + userKnowledge;
    
    // Get user's followers
    const userFollowers = await User.countDocuments({ following: userId });
    
    // Get user's following
    const userFollowing = req.user.following ? req.user.following.length : 0;
    
    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentProjects = await Project.countDocuments({
      author: userId,
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    const recentKnowledge = await Knowledge.countDocuments({
      author: userId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get platform-wide stats
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalStartups = await Startup.countDocuments({ isActive: true });
    const totalProjects = await Project.countDocuments({ isPublic: true, status: 'Published' });
    const totalKnowledge = await Knowledge.countDocuments({ isPublic: true, status: 'Published' });

    res.json({
      success: true,
      data: {
        user: {
          startups: userStartups,
          projects: userProjects,
          knowledge: userKnowledge,
          contributions: totalContributions,
          followers: userFollowers,
          following: userFollowing,
          recentActivity: {
            projects: recentProjects,
            knowledge: recentKnowledge
          }
        },
        platform: {
          totalUsers,
          totalStartups,
          totalProjects,
          totalKnowledge
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's tasks/projects
// @route   GET /api/dashboard/tasks
// @access  Private
const getUserTasks = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user._id;

    let query = { author: userId };

    // Filter by status
    if (status && status !== 'All') {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const projects = await Project.find(query)
      .populate('collaborators.user', 'profile.name profile.avatar username')
      .sort({ createdAt: -1 })
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
    console.error('Get user tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get calendar events
// @route   GET /api/dashboard/calendar
// @access  Private
const getCalendarEvents = async (req, res) => {
  try {
    const { start, end } = req.query;
    const userId = req.user._id;

    let dateQuery = {};
    
    if (start && end) {
      dateQuery = {
        $or: [
          { startDate: { $gte: new Date(start), $lte: new Date(end) } },
          { endDate: { $gte: new Date(start), $lte: new Date(end) } },
          { 
            startDate: { $lte: new Date(start) },
            endDate: { $gte: new Date(end) }
          }
        ]
      };
    }

    // Get user's projects with dates
    const projects = await Project.find({
      author: userId,
      ...dateQuery
    }).select('header startDate endDate status');

    // Get user's startups with founded dates
    const startups = await Startup.find({
      founder: userId,
      founded: dateQuery.startDate ? { $gte: new Date(start), $lte: new Date(end) } : {}
    }).select('name founded stage');

    // Format events for calendar
    const events = [
      ...projects.map(project => ({
        id: project._id,
        title: project.header,
        start: project.startDate,
        end: project.endDate,
        type: 'project',
        status: project.status
      })),
      ...startups.map(startup => ({
        id: startup._id,
        title: `${startup.name} - Founded`,
        start: startup.founded,
        end: startup.founded,
        type: 'startup',
        stage: startup.stage
      }))
    ];

    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get progress metrics
// @route   GET /api/dashboard/progress
// @access  Private
const getProgressMetrics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30' } = req.query; // days

    const daysAgo = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    // Get user's projects progress
    const totalProjects = await Project.countDocuments({ author: userId });
    const completedProjects = await Project.countDocuments({ 
      author: userId, 
      status: 'Completed' 
    });
    const recentProjects = await Project.countDocuments({
      author: userId,
      createdAt: { $gte: daysAgo }
    });

    // Get user's knowledge progress
    const totalKnowledge = await Knowledge.countDocuments({ author: userId });
    const publishedKnowledge = await Knowledge.countDocuments({ 
      author: userId, 
      status: 'Published' 
    });
    const recentKnowledge = await Knowledge.countDocuments({
      author: userId,
      createdAt: { $gte: daysAgo }
    });

    // Get user's startup progress
    const totalStartups = await Startup.countDocuments({ founder: userId });
    const activeStartups = await Startup.countDocuments({ 
      founder: userId, 
      isActive: true 
    });

    // Calculate completion rates
    const projectCompletionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;
    const knowledgePublishRate = totalKnowledge > 0 ? (publishedKnowledge / totalKnowledge) * 100 : 0;
    const startupActiveRate = totalStartups > 0 ? (activeStartups / totalStartups) * 100 : 0;

    res.json({
      success: true,
      data: {
        projects: {
          total: totalProjects,
          completed: completedProjects,
          recent: recentProjects,
          completionRate: Math.round(projectCompletionRate * 100) / 100
        },
        knowledge: {
          total: totalKnowledge,
          published: publishedKnowledge,
          recent: recentKnowledge,
          publishRate: Math.round(knowledgePublishRate * 100) / 100
        },
        startups: {
          total: totalStartups,
          active: activeStartups,
          activeRate: Math.round(startupActiveRate * 100) / 100
        },
        period: parseInt(period)
      }
    });
  } catch (error) {
    console.error('Get progress metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's activity feed
// @route   GET /api/dashboard/activity
// @access  Private
const getActivityFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const skip = (page - 1) * limit;

    // Get user's recent projects
    const recentProjects = await Project.find({ author: userId })
      .populate('author', 'profile.name profile.avatar username')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get user's recent knowledge resources
    const recentKnowledge = await Knowledge.find({ author: userId })
      .populate('author', 'profile.name profile.avatar username')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get user's recent startup activities
    const recentStartups = await Startup.find({ founder: userId })
      .populate('founder', 'profile.name profile.avatar username')
      .sort({ createdAt: -1 })
      .limit(5);

    // Combine and sort activities
    const activities = [
      ...recentProjects.map(project => ({
        type: 'project',
        action: 'created',
        item: project,
        date: project.createdAt
      })),
      ...recentKnowledge.map(knowledge => ({
        type: 'knowledge',
        action: 'created',
        item: knowledge,
        date: knowledge.createdAt
      })),
      ...recentStartups.map(startup => ({
        type: 'startup',
        action: 'created',
        item: startup,
        date: startup.createdAt
      }))
    ].sort((a, b) => b.date - a.date);

    const total = activities.length;
    const paginatedActivities = activities.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      count: paginatedActivities.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: paginatedActivities
    });
  } catch (error) {
    console.error('Get activity feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's network
// @route   GET /api/dashboard/network
// @access  Private
const getUserNetwork = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's followers
    const followers = await User.find({ following: userId })
      .select('profile.name profile.avatar username profile.role profile.location')
      .limit(10);

    // Get users the current user is following
    const following = req.user.following ? await User.find({ 
      _id: { $in: req.user.following } 
    })
      .select('profile.name profile.avatar username profile.role profile.location')
      .limit(10) : [];

    // Get collaborators from projects
    const userProjects = await Project.find({ author: userId })
      .populate('collaborators.user', 'profile.name profile.avatar username profile.role')
      .select('collaborators');

    const collaborators = userProjects
      .flatMap(project => project.collaborators)
      .map(collab => collab.user)
      .filter((user, index, arr) => arr.findIndex(u => u._id.toString() === user._id.toString()) === index)
      .slice(0, 10);

    // Get team members from startups
    const userStartups = await Startup.find({ founder: userId })
      .populate('team.user', 'profile.name profile.avatar username profile.role')
      .select('team');

    const teamMembers = userStartups
      .flatMap(startup => startup.team)
      .map(member => member.user)
      .filter((user, index, arr) => arr.findIndex(u => u._id.toString() === user._id.toString()) === index)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        followers: {
          count: followers.length,
          users: followers
        },
        following: {
          count: following.length,
          users: following
        },
        collaborators: {
          count: collaborators.length,
          users: collaborators
        },
        teamMembers: {
          count: teamMembers.length,
          users: teamMembers
        }
      }
    });
  } catch (error) {
    console.error('Get user network error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get recommendations
// @route   GET /api/dashboard/recommendations
// @access  Private
const getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Get recommended projects based on user's interests
    const recommendedProjects = await Project.find({
      isPublic: true,
      status: 'Published',
      author: { $ne: userId },
      $or: [
        { category: { $in: user.profile.skills || [] } },
        { tags: { $in: user.profile.skills || [] } }
      ]
    })
      .populate('author', 'profile.name profile.avatar username')
      .sort({ likeCount: -1, createdAt: -1 })
      .limit(5);

    // Get recommended knowledge resources
    const recommendedKnowledge = await Knowledge.find({
      isPublic: true,
      status: 'Published',
      author: { $ne: userId },
      $or: [
        { category: { $in: user.profile.skills || [] } },
        { tags: { $in: user.profile.skills || [] } }
      ]
    })
      .populate('author', 'profile.name profile.avatar username')
      .sort({ 'rating.average': -1, createdAt: -1 })
      .limit(5);

    // Get recommended startups
    const recommendedStartups = await Startup.find({
      isActive: true,
      founder: { $ne: userId },
      industry: { $in: user.profile.skills || [] }
    })
      .populate('founder', 'profile.name profile.avatar username')
      .sort({ likeCount: -1, createdAt: -1 })
      .limit(5);

    // Get recommended users
    const recommendedUsers = await User.find({
      _id: { $ne: userId },
      isActive: true,
      'profile.skills': { $in: user.profile.skills || [] }
    })
      .select('profile.name profile.avatar username profile.role profile.skills')
      .sort({ 'metrics.contributions': -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        projects: recommendedProjects,
        knowledge: recommendedKnowledge,
        startups: recommendedStartups,
        users: recommendedUsers
      }
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Routes
router.get('/stats', protect, getDashboardStats);
router.get('/tasks', protect, getUserTasks);
router.get('/calendar', protect, getCalendarEvents);
router.get('/progress', protect, getProgressMetrics);
router.get('/activity', protect, getActivityFeed);
router.get('/network', protect, getUserNetwork);
router.get('/recommendations', protect, getRecommendations);

module.exports = router; 