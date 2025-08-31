const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Mock data (replace with database operations later)
let notifications = [];

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications with pagination and filtering
 * @access  Private
 */
router.get('/', authenticateToken, (req, res) => {
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

    let filteredNotifications = notifications.filter(n => n.userId === userId);

    // Filter by type
    if (type) {
      filteredNotifications = filteredNotifications.filter(n => n.type === type);
    }

    // Filter by status
    if (status === 'all') {
      // Don't filter by status
    } else if (status === 'unread') {
      filteredNotifications = filteredNotifications.filter(n => !n.isRead);
    } else if (status === 'read') {
      filteredNotifications = filteredNotifications.filter(n => n.isRead);
    }

    // Sorting
    filteredNotifications.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
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
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

    // Get total count for pagination info
    const totalNotifications = filteredNotifications.length;
    const totalPages = Math.ceil(totalNotifications / limit);

    res.json({
      notifications: paginatedNotifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalNotifications,
        hasNextPage: endIndex < totalNotifications,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch notifications'
    });
  }
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 * @access  Private
 */
router.get('/unread-count', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;

    const unreadCount = notifications.filter(n => 
      n.userId === userId && !n.isRead
    ).length;

    res.json({
      unreadCount
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch unread count'
    });
  }
});

/**
 * @route   GET /api/notifications/:id
 * @desc    Get notification by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const notification = notifications.find(n => n.id === id && n.userId === userId);
    if (!notification) {
      return res.status(404).json({
        error: 'Notification Not Found',
        message: 'Notification not found'
      });
    }

    res.json({
      notification
    });

  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch notification'
    });
  }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const notification = notifications.find(n => n.id === id && n.userId === userId);
    if (!notification) {
      return res.status(404).json({
        error: 'Notification Not Found',
        message: 'Notification not found'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date().toISOString();
    notification.updatedAt = new Date().toISOString();

    res.json({
      message: 'Notification marked as read',
      notification
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to mark notification as read'
    });
  }
});

/**
 * @route   PUT /api/notifications/:id/unread
 * @desc    Mark notification as unread
 * @access  Private
 */
router.put('/:id/unread', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const notification = notifications.find(n => n.id === id && n.userId === userId);
    if (!notification) {
      return res.status(404).json({
        error: 'Notification Not Found',
        message: 'Notification not found'
      });
    }

    notification.isRead = false;
    notification.readAt = null;
    notification.updatedAt = new Date().toISOString();

    res.json({
      message: 'Notification marked as unread',
      notification
    });

  } catch (error) {
    console.error('Mark notification as unread error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to mark notification as unread'
    });
  }
});

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;

    const userNotifications = notifications.filter(n => n.userId === userId);
    const unreadNotifications = userNotifications.filter(n => !n.isRead);

    // Mark all unread notifications as read
    unreadNotifications.forEach(notification => {
      notification.isRead = true;
      notification.readAt = new Date().toISOString();
      notification.updatedAt = new Date().toISOString();
    });

    res.json({
      message: `${unreadNotifications.length} notifications marked as read`
    });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to mark notifications as read'
    });
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const notificationIndex = notifications.findIndex(n => n.id === id && n.userId === userId);
    if (notificationIndex === -1) {
      return res.status(404).json({
        error: 'Notification Not Found',
        message: 'Notification not found'
      });
    }

    notifications.splice(notificationIndex, 1);

    res.json({
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      error: 'Deletion Failed',
      message: 'Failed to delete notification'
    });
  }
});

/**
 * @route   DELETE /api/notifications/clear-read
 * @desc    Clear all read notifications
 * @access  Private
 */
router.delete('/clear-read', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;

    const initialCount = notifications.length;
    
    // Remove all read notifications for this user
    notifications = notifications.filter(n => 
      !(n.userId === userId && n.isRead)
    );

    const deletedCount = initialCount - notifications.length;

    res.json({
      message: `${deletedCount} read notifications cleared`
    });

  } catch (error) {
    console.error('Clear read notifications error:', error);
    res.status(500).json({
      error: 'Clear Failed',
      message: 'Failed to clear read notifications'
    });
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
router.post('/test', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;
    const { type = 'system', title, message } = req.body;

    const testNotification = {
      id: Date.now().toString(),
      userId,
      type,
      title: title || 'Test Notification',
      message: message || 'This is a test notification',
      data: {},
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    notifications.push(testNotification);

    res.status(201).json({
      message: 'Test notification created successfully',
      notification: testNotification
    });

  } catch (error) {
    console.error('Create test notification error:', error);
    res.status(500).json({
      error: 'Creation Failed',
      message: 'Failed to create test notification'
    });
  }
});

// Utility function to create notifications (will be used by other parts of the system)
const createNotification = (notificationData) => {
  const notification = {
    id: Date.now().toString(),
    ...notificationData,
    isRead: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  notifications.push(notification);
  return notification;
};

// Export the utility function for use in other modules
module.exports = {
  router,
  createNotification
};
