const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { startupValidation } = require('../middleware/validation');

const router = express.Router();

// Mock data (replace with database operations later)
let startups = [];
let joinRequests = [];
let startupMembers = [];

/**
 * @route   POST /api/startup/register
 * @desc    Register a new startup
 * @access  Private
 */
router.post('/register', authenticateToken, startupValidation.registerStartup, (req, res) => {
  try {
    const { userId, firstName, lastName } = req.user;
    const { 
      name, 
      industry, 
      location, 
      description, 
      stage, 
      logo, 
      banner, 
      roles = [] 
    } = req.body;

    // Check if startup name already exists
    const existingStartup = startups.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (existingStartup) {
      return res.status(400).json({
        error: 'Startup Already Exists',
        message: 'A startup with this name already exists'
      });
    }

    // Check if user is already part of another startup
    const existingMembership = startupMembers.find(m => m.userId === userId);
    if (existingMembership) {
      return res.status(400).json({
        error: 'Already a Member',
        message: 'You are already a member of another startup'
      });
    }

    const newStartup = {
      id: Date.now().toString(),
      name,
      industry,
      location,
      description,
      stage,
      logo: logo || null,
      banner: banner || null,
      roles: Array.isArray(roles) ? roles : [],
      creator: {
        id: userId,
        firstName,
        lastName
      },
      status: 'active',
      members: [{
        userId,
        firstName,
        lastName,
        role: 'founder',
        joinedAt: new Date().toISOString(),
        isActive: true
      }],
      memberCount: 1,
      views: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    startups.push(newStartup);

    // Add to startup members
    startupMembers.push({
      startupId: newStartup.id,
      userId,
      firstName,
      lastName,
      role: 'founder',
      joinedAt: new Date().toISOString(),
      isActive: true
    });

    res.status(201).json({
      message: 'Startup registered successfully',
      startup: newStartup
    });

  } catch (error) {
    console.error('Register startup error:', error);
    res.status(500).json({
      error: 'Registration Failed',
      message: 'Failed to register startup'
    });
  }
});

/**
 * @route   GET /api/startup
 * @desc    Get all startups with pagination and filtering
 * @access  Public
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      industry, 
      location, 
      stage, 
      search, 
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = req.query;

    let filteredStartups = [...startups];

    // Filter by industry
    if (industry) {
      filteredStartups = filteredStartups.filter(startup => startup.industry === industry);
    }

    // Filter by location
    if (location) {
      filteredStartups = filteredStartups.filter(startup => 
        startup.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Filter by stage
    if (stage) {
      filteredStartups = filteredStartups.filter(startup => startup.stage === stage);
    }

    // Search functionality
    if (search) {
      const searchLower = search.toLowerCase();
      filteredStartups = filteredStartups.filter(startup => 
        startup.name.toLowerCase().includes(searchLower) ||
        startup.description.toLowerCase().includes(searchLower) ||
        startup.industry.toLowerCase().includes(searchLower)
      );
    }

    // Sorting
    filteredStartups.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'creator') {
        aValue = `${a.creator.firstName} ${a.creator.lastName}`;
        bValue = `${b.creator.firstName} ${b.creator.lastName}`;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedStartups = filteredStartups.slice(startIndex, endIndex);

    // Get total count for pagination info
    const totalStartups = filteredStartups.length;
    const totalPages = Math.ceil(totalStartups / limit);

    res.json({
      startups: paginatedStartups,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalStartups,
        hasNextPage: endIndex < totalStartups,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get startups error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch startups'
    });
  }
});

/**
 * @route   GET /api/startup/:id
 * @desc    Get startup by ID with details
 * @access  Public
 */
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user || {};

    const startup = startups.find(s => s.id === id);
    if (!startup) {
      return res.status(404).json({
        error: 'Startup Not Found',
        message: 'Startup not found'
      });
    }

    // Increment view count if user is authenticated and not a member
    if (userId) {
      const isMember = startup.members.find(m => m.userId === userId);
      if (!isMember) {
        startup.views += 1;
      }
    }

    // Get join requests if user is the creator
    let joinRequestsData = [];
    if (userId && startup.creator.id === userId) {
      joinRequestsData = joinRequests.filter(r => r.startupId === id);
    }

    res.json({
      startup: {
        ...startup,
        joinRequests: joinRequestsData
      }
    });

  } catch (error) {
    console.error('Get startup error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch startup'
    });
  }
});

/**
 * @route   PUT /api/startup/:id
 * @desc    Update startup (only creator can update)
 * @access  Private
 */
router.put('/:id', authenticateToken, startupValidation.registerStartup, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { 
      name, 
      industry, 
      location, 
      description, 
      stage, 
      logo, 
      banner, 
      roles 
    } = req.body;

    const startup = startups.find(s => s.id === id);
    if (!startup) {
      return res.status(404).json({
        error: 'Startup Not Found',
        message: 'Startup not found'
      });
    }

    // Check if user is the creator
    if (startup.creator.id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the startup creator can update startup details'
      });
    }

    // Check if new name conflicts with existing startups
    if (name !== startup.name) {
      const existingStartup = startups.find(s => 
        s.id !== id && s.name.toLowerCase() === name.toLowerCase()
      );
      if (existingStartup) {
        return res.status(400).json({
          error: 'Name Conflict',
          message: 'A startup with this name already exists'
        });
      }
    }

    // Update startup
    startup.name = name;
    startup.industry = industry;
    startup.location = location;
    startup.description = description;
    startup.stage = stage;
    startup.logo = logo || startup.logo;
    startup.banner = banner || startup.banner;
    startup.roles = Array.isArray(roles) ? roles : startup.roles;
    startup.updatedAt = new Date().toISOString();

    res.json({
      message: 'Startup updated successfully',
      startup
    });

  } catch (error) {
    console.error('Update startup error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to update startup'
    });
  }
});

/**
 * @route   DELETE /api/startup/:id
 * @desc    Delete startup (only creator can delete)
 * @access  Private
 */
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const startupIndex = startups.findIndex(s => s.id === id);
    if (startupIndex === -1) {
      return res.status(404).json({
        error: 'Startup Not Found',
        message: 'Startup not found'
      });
    }

    const startup = startups[startupIndex];

    // Check if user is the creator
    if (startup.creator.id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the startup creator can delete the startup'
      });
    }

    // Delete startup
    startups.splice(startupIndex, 1);

    // Remove startup members
    startupMembers = startupMembers.filter(m => m.startupId !== id);

    // Remove join requests
    joinRequests = joinRequests.filter(r => r.startupId !== id);

    res.json({
      message: 'Startup deleted successfully'
    });

  } catch (error) {
    console.error('Delete startup error:', error);
    res.status(500).json({
      error: 'Deletion Failed',
      message: 'Failed to delete startup'
    });
  }
});

/**
 * @route   POST /api/startup/:id/join-request
 * @desc    Submit join request for startup
 * @access  Private
 */
router.post('/:id/join-request', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId, firstName, lastName } = req.user;
    const { message, role } = req.body;

    const startup = startups.find(s => s.id === id);
    if (!startup) {
      return res.status(404).json({
        error: 'Startup Not Found',
        message: 'Startup not found'
      });
    }

    // Check if user is already a member
    const existingMember = startup.members.find(m => m.userId === userId);
    if (existingMember) {
      return res.status(400).json({
        error: 'Already a Member',
        message: 'You are already a member of this startup'
      });
    }

    // Check if user already has a pending request
    const existingRequest = joinRequests.find(r => 
      r.startupId === id && r.userId === userId && r.status === 'pending'
    );
    if (existingRequest) {
      return res.status(400).json({
        error: 'Request Already Pending',
        message: 'You already have a pending join request for this startup'
      });
    }

    const newJoinRequest = {
      id: Date.now().toString(),
      startupId: id,
      startupName: startup.name,
      userId,
      firstName,
      lastName,
      message: message || '',
      role: role || 'member',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    joinRequests.push(newJoinRequest);

    // TODO: Send notification to startup creator
    // This will be implemented when notifications are set up

    res.status(201).json({
      message: 'Join request submitted successfully',
      joinRequest: newJoinRequest
    });

  } catch (error) {
    console.error('Submit join request error:', error);
    res.status(500).json({
      error: 'Request Failed',
      message: 'Failed to submit join request'
    });
  }
});

/**
 * @route   GET /api/startup/:id/join-requests
 * @desc    Get join requests for startup (only creator can see)
 * @access  Private
 */
router.get('/:id/join-requests', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const startup = startups.find(s => s.id === id);
    if (!startup) {
      return res.status(404).json({
        error: 'Startup Not Found',
        message: 'Startup not found'
      });
    }

    // Check if user is the creator
    if (startup.creator.id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the startup creator can view join requests'
      });
    }

    const startupJoinRequests = joinRequests.filter(r => r.startupId === id);

    res.json({
      joinRequests: startupJoinRequests
    });

  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch join requests'
    });
  }
});

/**
 * @route   PUT /api/startup/:id/join-requests/:requestId
 * @desc    Approve/reject join request (only creator can do this)
 * @access  Private
 */
router.put('/:id/join-requests/:requestId', authenticateToken, (req, res) => {
  try {
    const { id, requestId } = req.params;
    const { userId } = req.user;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Status must be either "approved" or "rejected"'
      });
    }

    const startup = startups.find(s => s.id === id);
    if (!startup) {
      return res.status(404).json({
        error: 'Startup Not Found',
        message: 'Startup not found'
      });
    }

    // Check if user is the creator
    if (startup.creator.id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the startup creator can approve/reject join requests'
      });
    }

    const joinRequest = joinRequests.find(r => r.id === requestId && r.startupId === id);
    if (!joinRequest) {
      return res.status(404).json({
        error: 'Join Request Not Found',
        message: 'Join request not found'
      });
    }

    joinRequest.status = status;
    joinRequest.updatedAt = new Date().toISOString();

    if (status === 'approved') {
      // Add user to startup members
      const newMember = {
        startupId: id,
        userId: joinRequest.userId,
        firstName: joinRequest.firstName,
        lastName: joinRequest.lastName,
        role: joinRequest.role,
        joinedAt: new Date().toISOString(),
        isActive: true
      };

      startupMembers.push(newMember);
      startup.members.push({
        userId: joinRequest.userId,
        firstName: joinRequest.firstName,
        lastName: joinRequest.lastName,
        role: joinRequest.role,
        joinedAt: new Date().toISOString(),
        isActive: true
      });
      startup.memberCount += 1;
    }

    // TODO: Send notification to request author
    // This will be implemented when notifications are set up

    res.json({
      message: `Join request ${status} successfully`,
      joinRequest
    });

  } catch (error) {
    console.error('Update join request error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to update join request status'
    });
  }
});

/**
 * @route   GET /api/startup/user/memberships
 * @desc    Get user's startup memberships
 * @access  Private
 */
router.get('/user/memberships', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;

    const userMemberships = startupMembers.filter(m => m.userId === userId);
    const userStartups = userMemberships.map(membership => {
      const startup = startups.find(s => s.id === membership.startupId);
      return {
        ...membership,
        startup: startup ? {
          id: startup.id,
          name: startup.name,
          industry: startup.industry,
          location: startup.location,
          stage: startup.stage,
          logo: startup.logo,
          banner: startup.banner
        } : null
      };
    });

    res.json({
      memberships: userStartups
    });

  } catch (error) {
    console.error('Get memberships error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch user memberships'
    });
  }
});

module.exports = router;
