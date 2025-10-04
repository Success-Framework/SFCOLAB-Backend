const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { Notification } = require('../models/schemas');

const router = express.Router();

// Using MongoDB via Mongoose Notification model

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications with pagination and filtering
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status = 'unread',
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = req.query;

    const query = { userId };
    if (type) query.type = type;
    if (status === 'unread') query.isRead = false;
    if (status === 'read') query.isRead = true;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, totalNotifications] = await Promise.all([
      Notification.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      Notification.countDocuments(query)
    ]);
    const totalPages = Math.ceil(totalNotifications / parseInt(limit));

    res.json({
      notifications: items,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalNotifications,
        hasNextPage: skip + items.length < totalNotifications,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Fetch Failed', message: 'Failed to fetch notifications' });
  }
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 * @access  Private
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });
    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Fetch Failed', message: 'Failed to fetch unread count' });
  }
});

/**
 * @route   GET /api/notifications/:id
 * @desc    Get notification by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const notification = await Notification.findOne({ _id: id, userId });
    if (!notification) return res.status(404).json({ error: 'Notification Not Found', message: 'Notification not found' });
    res.json({ notification });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ error: 'Fetch Failed', message: 'Failed to fetch notification' });
  }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification Not Found', message: 'Notification not found' });
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Update Failed', message: 'Failed to mark notification as read' });
  }
});

/**
 * @route   PUT /api/notifications/:id/unread
 * @desc    Mark notification as unread
 * @access  Private
 */
router.put('/:id/unread', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: false, readAt: null },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification Not Found', message: 'Notification not found' });
    res.json({ message: 'Notification marked as unread', notification });
  } catch (error) {
    console.error('Mark notification as unread error:', error);
    res.status(500).json({ error: 'Update Failed', message: 'Failed to mark notification as unread' });
  }
});

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await Notification.updateMany({ userId, isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ message: `${result.modifiedCount || 0} notifications marked as read` });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Update Failed', message: 'Failed to mark notifications as read' });
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const result = await Notification.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Notification Not Found', message: 'Notification not found' });
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Deletion Failed', message: 'Failed to delete notification' });
  }
});

/**
 * @route   DELETE /api/notifications/clear-read
 * @desc    Clear all read notifications
 * @access  Private
 */
router.delete('/clear-read', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await Notification.deleteMany({ userId, isRead: true });
    res.json({ message: `${result.deletedCount || 0} read notifications cleared` });
  } catch (error) {
    console.error('Clear read notifications error:', error);
    res.status(500).json({ error: 'Clear Failed', message: 'Failed to clear read notifications' });
  }
});

/**
 * @route   GET /api/notifications/types
 * @desc    Get all notification types
 * @access  Private
 */
router.get('/types', authenticateToken, (req, res) => {
  try {
    const notificationTypes = [
      {
        type: 'new_comment',
        label: 'New Comment',
        description: 'Someone commented on your content'
      },
      {
        type: 'new_like',
        label: 'New Like',
        description: 'Someone liked your content'
      },
      {
        type: 'new_suggestion',
        label: 'New Suggestion',
        description: 'Someone suggested an improvement to your idea'
      },
      {
        type: 'join_request',
        label: 'Join Request',
        description: 'Someone requested to join your startup'
      },
      {
        type: 'request_approved',
        label: 'Request Approved',
        description: 'Your join request was approved'
      },
      {
        type: 'request_rejected',
        label: 'Request Rejected',
        description: 'Your join request was rejected'
      },
      {
        type: 'story_view',
        label: 'Story View',
        description: 'Someone viewed your story'
      },
      {
        type: 'post_engagement',
        label: 'Post Engagement',
        description: 'Someone engaged with your post'
      },
      {
        type: 'system',
        label: 'System',
        description: 'System notifications and updates'
      }
    ];

    res.json({
      types: notificationTypes
    });

  } catch (error) {
    console.error('Get notification types error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch notification types'
    });
  }
});

/**
 * @route   POST /api/notifications/test
 * @desc    Create a test notification (for development/testing)
 * @access  Private
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { type = 'system', title, message } = req.body;
    const notification = await Notification.create({
      userId,
      type,
      title: title || 'Test Notification',
      message: message || 'This is a test notification',
      data: {},
      isRead: false,
    });
    res.status(201).json({ message: 'Test notification created successfully', notification });
  } catch (error) {
    console.error('Create test notification error:', error);
    res.status(500).json({ error: 'Creation Failed', message: 'Failed to create test notification' });
  }
});

// Utility function to create notifications (will be used by other parts of the system)
const createNotification = async (notificationData) => {
  const notification = await Notification.create({
    ...notificationData,
    isRead: false,
  });
  return notification;
};

// Export the utility function for use in other modules
module.exports = {
  router,
  createNotification
};
