const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { startupValidation } = require('../middleware/validation');
const { Startup, StartupMember, JoinRequest } = require('../models/schemas');

const router = express.Router();

// Using MongoDB via Mongoose models

/**
 * @route   POST /api/startup/register
 * @desc    Register a new startup
 * @access  Private
 */
router.post('/register', authenticateToken, startupValidation.registerStartup, async (req, res) => {
  try {
    const { userId, firstName, lastName } = req.user;
    const { name, industry, location, description, stage, logo, banner, roles = [], positions } = req.body;

    const nameExists = await Startup.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (nameExists) {
      return res.status(400).json({ error: 'Startup Already Exists', message: 'A startup with this name already exists' });
    }

    const existingMembership = await StartupMember.findOne({ userId });
    if (existingMembership) {
      return res.status(400).json({ error: 'Already a Member', message: 'You are already a member of another startup' });
    }

    const startupDoc = await Startup.create({
      name,
      industry,
      location,
      description,
      stage,
      logo: logo || null,
      banner: banner || null,
      positions: positions ? Number(positions) : 0,
      roles: Array.isArray(roles) ? roles : [],
      creator: { id: userId, firstName, lastName },
      status: 'active',
      members: [{ userId, firstName, lastName, role: 'founder', joinedAt: new Date(), isActive: true }],
      memberCount: 1,
      views: 0,
    });

    await StartupMember.create({ startupId: startupDoc._id, userId, firstName, lastName, role: 'founder', joinedAt: new Date(), isActive: true });

    res.status(201).json({ message: 'Startup registered successfully', startup: startupDoc });
  } catch (error) {
    console.error('Register startup error:', error);
    res.status(500).json({ error: 'Registration Failed', message: 'Failed to register startup' });
  }
});

/**
 * @route   GET /api/startup
 * @desc    Get all startups with pagination and filtering
 * @access  Public
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, industry, location, stage, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};
    if (industry) query.industry = industry;
    if (location) query.location = new RegExp(location, 'i');
    if (stage) query.stage = stage;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [ { name: regex }, { description: regex }, { industry: regex } ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, totalStartups] = await Promise.all([
      Startup.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      Startup.countDocuments(query)
    ]);
    const totalPages = Math.ceil(totalStartups / parseInt(limit));

    res.json({
      startups: items,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalStartups,
        hasNextPage: skip + items.length < totalStartups,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get startups error:', error);
    res.status(500).json({ error: 'Fetch Failed', message: 'Failed to fetch startups' });
  }
});

/**
 * @route   GET /api/startup/:id
 * @desc    Get startup by ID with details
 * @access  Public
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user || {};

    const startup = await Startup.findById(id);
    if (!startup) return res.status(404).json({ error: 'Startup Not Found', message: 'Startup not found' });

    if (userId) {
      const isMember = startup.members.find(m => m.userId?.toString() === userId);
      if (!isMember) {
        await Startup.findByIdAndUpdate(id, { $inc: { views: 1 } });
      }
    }

    let joinRequestsData = [];
    if (userId && startup.creator.id.toString() === userId) {
      joinRequestsData = await JoinRequest.find({ startupId: id });
    }

    res.json({ startup: { ...startup.toObject(), joinRequests: joinRequestsData } });
  } catch (error) {
    console.error('Get startup error:', error);
    res.status(500).json({ error: 'Fetch Failed', message: 'Failed to fetch startup' });
  }
});

/**
 * @route   PUT /api/startup/:id
 * @desc    Update startup (only creator can update)
 * @access  Private
 */
router.put('/:id', authenticateToken, startupValidation.registerStartup, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { name, industry, location, description, stage, logo, banner, roles } = req.body;

    const startup = await Startup.findById(id);
    if (!startup) return res.status(404).json({ error: 'Startup Not Found', message: 'Startup not found' });
    if (startup.creator.id.toString() !== userId) return res.status(403).json({ error: 'Forbidden', message: 'Only the startup creator can update startup details' });

    if (name && name.toLowerCase() !== startup.name.toLowerCase()) {
      const conflict = await Startup.findOne({ _id: { $ne: id }, name: new RegExp(`^${name}$`, 'i') });
      if (conflict) return res.status(400).json({ error: 'Name Conflict', message: 'A startup with this name already exists' });
    }

    startup.name = name;
    startup.industry = industry;
    startup.location = location;
    startup.description = description;
    startup.stage = stage;
    if (logo) startup.logo = logo;
    if (banner) startup.banner = banner;
    startup.roles = Array.isArray(roles) ? roles : startup.roles;
    await startup.save();

    res.json({ message: 'Startup updated successfully', startup });
  } catch (error) {
    console.error('Update startup error:', error);
    res.status(500).json({ error: 'Update Failed', message: 'Failed to update startup' });
  }
});

/**
 * @route   DELETE /api/startup/:id
 * @desc    Delete startup (only creator can delete)
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const startup = await Startup.findById(id);
    if (!startup) return res.status(404).json({ error: 'Startup Not Found', message: 'Startup not found' });
    if (startup.creator.id.toString() !== userId) return res.status(403).json({ error: 'Forbidden', message: 'Only the startup creator can delete the startup' });

    await Startup.findByIdAndDelete(id);
    await Promise.all([
      StartupMember.deleteMany({ startupId: id }),
      JoinRequest.deleteMany({ startupId: id })
    ]);

    res.json({ message: 'Startup deleted successfully' });
  } catch (error) {
    console.error('Delete startup error:', error);
    res.status(500).json({ error: 'Deletion Failed', message: 'Failed to delete startup' });
  }
});

/**
 * @route   POST /api/startup/:id/join-request
 * @desc    Submit join request for startup
 * @access  Private
 */
router.post('/:id/join-request', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, firstName, lastName } = req.user;
    const { message, role } = req.body;

    const startup = await Startup.findById(id);
    if (!startup) return res.status(404).json({ error: 'Startup Not Found', message: 'Startup not found' });

    const existingMember = startup.members.find(m => m.userId?.toString() === userId);
    if (existingMember) return res.status(400).json({ error: 'Already a Member', message: 'You are already a member of this startup' });

    const existingRequest = await JoinRequest.findOne({ startupId: id, userId, status: 'pending' });
    if (existingRequest) return res.status(400).json({ error: 'Request Already Pending', message: 'You already have a pending join request for this startup' });

    const joinRequest = await JoinRequest.create({
      startupId: id,
      startupName: startup.name,
      userId,
      firstName,
      lastName,
      message: message || '',
      role: role || 'member',
      status: 'pending'
    });

    // TODO: Send notification to startup creator

    res.status(201).json({ message: 'Join request submitted successfully', joinRequest });
  } catch (error) {
    console.error('Submit join request error:', error);
    res.status(500).json({ error: 'Request Failed', message: 'Failed to submit join request' });
  }
});

/**
 * @route   GET /api/startup/:id/join-requests
 * @desc    Get join requests for startup (only creator can see)
 * @access  Private
 */
router.get('/:id/join-requests', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const startup = await Startup.findById(id);
    if (!startup) return res.status(404).json({ error: 'Startup Not Found', message: 'Startup not found' });
    if (startup.creator.id.toString() !== userId) return res.status(403).json({ error: 'Forbidden', message: 'Only the startup creator can view join requests' });

    const startupJoinRequests = await JoinRequest.find({ startupId: id });
    res.json({ joinRequests: startupJoinRequests });
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({ error: 'Fetch Failed', message: 'Failed to fetch join requests' });
  }
});

/**
 * @route   PUT /api/startup/:id/join-requests/:requestId
 * @desc    Approve/reject join request (only creator can do this)
 * @access  Private
 */
router.put('/:id/join-requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { id, requestId } = req.params;
    const { userId } = req.user;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid Status', message: 'Status must be either "approved" or "rejected"' });
    }

    const startup = await Startup.findById(id);
    if (!startup) return res.status(404).json({ error: 'Startup Not Found', message: 'Startup not found' });
    if (startup.creator.id.toString() !== userId) return res.status(403).json({ error: 'Forbidden', message: 'Only the startup creator can approve/reject join requests' });

    const joinRequest = await JoinRequest.findOne({ _id: requestId, startupId: id });
    if (!joinRequest) return res.status(404).json({ error: 'Join Request Not Found', message: 'Join request not found' });

    joinRequest.status = status;
    joinRequest.updatedAt = new Date();
    await joinRequest.save();

    if (status === 'approved') {
      const newMember = { startupId: id, userId: joinRequest.userId, firstName: joinRequest.firstName, lastName: joinRequest.lastName, role: joinRequest.role, joinedAt: new Date(), isActive: true };
      await StartupMember.create(newMember);
      await Startup.findByIdAndUpdate(id, { 
        $push: { members: { userId: joinRequest.userId, firstName: joinRequest.firstName, lastName: joinRequest.lastName, role: joinRequest.role, joinedAt: new Date(), isActive: true } },
        $inc: { memberCount: 1 }
      });
    }

    // TODO: Send notification to request author

    res.json({ message: `Join request ${status} successfully`, joinRequest });
  } catch (error) {
    console.error('Update join request error:', error);
    res.status(500).json({ error: 'Update Failed', message: 'Failed to update join request status' });
  }
});

/**
 * @route   GET /api/startup/user/memberships
 * @desc    Get user's startup memberships
 * @access  Private
 */
router.get('/user/memberships', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const memberships = await StartupMember.find({ userId });
    const startupIds = memberships.map(m => m.startupId);
    const startups = await Startup.find({ _id: { $in: startupIds } }).select('name industry location stage logo banner');
    const startupMap = new Map(startups.map(s => [s._id.toString(), s]));
    const userStartups = memberships.map(m => ({
      ...m.toObject(),
      startup: startupMap.get(m.startupId.toString()) || null
    }));
    res.json({ memberships: userStartups });
  } catch (error) {
    console.error('Get memberships error:', error);
    res.status(500).json({ error: 'Fetch Failed', message: 'Failed to fetch user memberships' });
  }
});

module.exports = router;
