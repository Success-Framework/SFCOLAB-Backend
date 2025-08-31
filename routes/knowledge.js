const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { knowledgeValidation } = require('../middleware/validation');

const router = express.Router();

// Mock data (replace with database operations later)
let knowledgeResources = [];
let knowledgeComments = [];
let resourceViews = [];
let resourceDownloads = [];
let resourceLikes = [];

/**
 * @route   GET /api/knowledge
 * @desc    Get all knowledge resources with pagination and filtering
 * @access  Public
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      search, 
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = req.query;

    let filteredResources = [...knowledgeResources];

    // Filter by category
    if (category) {
      filteredResources = filteredResources.filter(resource => resource.category === category);
    }

    // Search functionality
    if (search) {
      const searchLower = search.toLowerCase();
      filteredResources = filteredResources.filter(resource => 
        resource.title.toLowerCase().includes(searchLower) ||
        resource.description.toLowerCase().includes(searchLower) ||
        resource.author.firstName.toLowerCase().includes(searchLower) ||
        resource.author.lastName.toLowerCase().includes(searchLower)
      );
    }

    // Sorting
    filteredResources.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'author') {
        aValue = `${a.author.firstName} ${a.author.lastName}`;
        bValue = `${b.author.firstName} ${b.author.lastName}`;
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
    const paginatedResources = filteredResources.slice(startIndex, endIndex);

    // Get total count for pagination info
    const totalResources = filteredResources.length;
    const totalPages = Math.ceil(totalResources / limit);

    res.json({
      resources: paginatedResources,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResources,
        hasNextPage: endIndex < totalResources,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get knowledge resources error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch knowledge resources'
    });
  }
});

/**
 * @route   POST /api/knowledge
 * @desc    Add new knowledge resource
 * @access  Private
 */
router.post('/', authenticateToken, knowledgeValidation.addResource, (req, res) => {
  try {
    const { userId, firstName, lastName } = req.user;
    const { title, description, category, fileUrl, tags = [] } = req.body;

    const newResource = {
      id: Date.now().toString(),
      title,
      description,
      category,
      fileUrl: fileUrl || null,
      tags: Array.isArray(tags) ? tags : [],
      author: {
        id: userId,
        firstName,
        lastName
      },
      status: 'active',
      views: 0,
      downloads: 0,
      likes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    knowledgeResources.push(newResource);

    res.status(201).json({
      message: 'Knowledge resource added successfully',
      resource: newResource
    });

  } catch (error) {
    console.error('Add knowledge resource error:', error);
    res.status(500).json({
      error: 'Creation Failed',
      message: 'Failed to add knowledge resource'
    });
  }
});

/**
 * @route   GET /api/knowledge/:id
 * @desc    Get knowledge resource by ID with comments
 * @access  Public
 */
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user || {};

    const resource = knowledgeResources.find(r => r.id === id);
    if (!resource) {
      return res.status(404).json({
        error: 'Resource Not Found',
        message: 'Knowledge resource not found'
      });
    }

    // Increment view count if user is authenticated
    if (userId && userId !== resource.author.id) {
      resource.views += 1;
      
      // Track view
      const existingView = resourceViews.find(v => v.resourceId === id && v.userId === userId);
      if (!existingView) {
        resourceViews.push({
          id: Date.now().toString(),
          resourceId: id,
          userId,
          viewedAt: new Date().toISOString()
        });
      }
    }

    // Get comments for this resource
    const resourceComments = knowledgeComments.filter(c => c.resourceId === id);

    res.json({
      resource: {
        ...resource,
        comments: resourceComments
      }
    });

  } catch (error) {
    console.error('Get knowledge resource error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch knowledge resource'
    });
  }
});

/**
 * @route   PUT /api/knowledge/:id
 * @desc    Update knowledge resource (only author can update)
 * @access  Private
 */
router.put('/:id', authenticateToken, knowledgeValidation.addResource, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { title, description, category, fileUrl, tags } = req.body;

    const resource = knowledgeResources.find(r => r.id === id);
    if (!resource) {
      return res.status(404).json({
        error: 'Resource Not Found',
        message: 'Knowledge resource not found'
      });
    }

    // Check if user is the author
    if (resource.author.id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own knowledge resources'
      });
    }

    // Update resource
    resource.title = title;
    resource.description = description;
    resource.category = category;
    resource.fileUrl = fileUrl || resource.fileUrl;
    resource.tags = Array.isArray(tags) ? tags : [];
    resource.updatedAt = new Date().toISOString();

    res.json({
      message: 'Knowledge resource updated successfully',
      resource
    });

  } catch (error) {
    console.error('Update knowledge resource error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to update knowledge resource'
    });
  }
});

/**
 * @route   DELETE /api/knowledge/:id
 * @desc    Delete knowledge resource (only author can delete)
 * @access  Private
 */
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const resourceIndex = knowledgeResources.findIndex(r => r.id === id);
    if (resourceIndex === -1) {
      return res.status(404).json({
        error: 'Resource Not Found',
        message: 'Knowledge resource not found'
      });
    }

    const resource = knowledgeResources[resourceIndex];

    // Check if user is the author
    if (resource.author.id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own knowledge resources'
      });
    }

    // Delete resource
    knowledgeResources.splice(resourceIndex, 1);

    // Delete associated data
    knowledgeComments = knowledgeComments.filter(c => c.resourceId !== id);
    resourceViews = resourceViews.filter(v => v.resourceId !== id);
    resourceDownloads = resourceDownloads.filter(d => d.resourceId !== id);
    resourceLikes = resourceLikes.filter(l => l.resourceId !== id);

    res.json({
      message: 'Knowledge resource deleted successfully'
    });

  } catch (error) {
    console.error('Delete knowledge resource error:', error);
    res.status(500).json({
      error: 'Deletion Failed',
      message: 'Failed to delete knowledge resource'
    });
  }
});

/**
 * @route   POST /api/knowledge/:id/comments
 * @desc    Add comment to knowledge resource
 * @access  Private
 */
router.post('/:id/comments', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId, firstName, lastName } = req.user;
    const { content } = req.body;

    const resource = knowledgeResources.find(r => r.id === id);
    if (!resource) {
      return res.status(404).json({
        error: 'Resource Not Found',
        message: 'Knowledge resource not found'
      });
    }

    const newComment = {
      id: Date.now().toString(),
      resourceId: id,
      content,
      author: {
        id: userId,
        firstName,
        lastName
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    knowledgeComments.push(newComment);

    res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      error: 'Comment Failed',
      message: 'Failed to add comment'
    });
  }
});

/**
 * @route   GET /api/knowledge/:id/comments
 * @desc    Get comments for a knowledge resource
 * @access  Public
 */
router.get('/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const resource = knowledgeResources.find(r => r.id === id);
    if (!resource) {
      return res.status(404).json({
        error: 'Resource Not Found',
        message: 'Knowledge resource not found'
      });
    }

    const resourceComments = knowledgeComments.filter(c => c.resourceId === id);

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedComments = resourceComments.slice(startIndex, endIndex);

    const totalComments = resourceComments.length;
    const totalPages = Math.ceil(totalComments / limit);

    res.json({
      comments: paginatedComments,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalComments,
        hasNextPage: endIndex < totalComments,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch comments'
    });
  }
});

/**
 * @route   POST /api/knowledge/:id/download
 * @desc    Track resource download
 * @access  Private
 */
router.post('/:id/download', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const resource = knowledgeResources.find(r => r.id === id);
    if (!resource) {
      return res.status(404).json({
        error: 'Resource Not Found',
        message: 'Knowledge resource not found'
      });
    }

    // Increment download count
    resource.downloads += 1;

    // Track download
    const existingDownload = resourceDownloads.find(d => d.resourceId === id && d.userId === userId);
    if (!existingDownload) {
      resourceDownloads.push({
        id: Date.now().toString(),
        resourceId: id,
        userId,
        downloadedAt: new Date().toISOString()
      });
    }

    res.json({
      message: 'Download tracked successfully',
      downloads: resource.downloads
    });

  } catch (error) {
    console.error('Track download error:', error);
    res.status(500).json({
      error: 'Tracking Failed',
      message: 'Failed to track download'
    });
  }
});

/**
 * @route   POST /api/knowledge/:id/like
 * @desc    Like/unlike knowledge resource
 * @access  Private
 */
router.post('/:id/like', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const resource = knowledgeResources.find(r => r.id === id);
    if (!resource) {
      return res.status(404).json({
        error: 'Resource Not Found',
        message: 'Knowledge resource not found'
      });
    }

    // Check if user already liked
    const existingLike = resourceLikes.find(l => l.resourceId === id && l.userId === userId);

    if (existingLike) {
      // Unlike
      resourceLikes = resourceLikes.filter(l => l.id !== existingLike.id);
      resource.likes -= 1;
      
      res.json({
        message: 'Resource unliked successfully',
        liked: false,
        likes: resource.likes
      });
    } else {
      // Like
      const newLike = {
        id: Date.now().toString(),
        resourceId: id,
        userId,
        likedAt: new Date().toISOString()
      };

      resourceLikes.push(newLike);
      resource.likes += 1;

      res.json({
        message: 'Resource liked successfully',
        liked: true,
        likes: resource.likes
      });
    }

  } catch (error) {
    console.error('Like/unlike error:', error);
    res.status(500).json({
      error: 'Action Failed',
      message: 'Failed to like/unlike resource'
    });
  }
});

/**
 * @route   GET /api/knowledge/:id/likes
 * @desc    Get users who liked a resource
 * @access  Public
 */
router.get('/:id/likes', (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const resource = knowledgeResources.find(r => r.id === id);
    if (!resource) {
      return res.status(404).json({
        error: 'Resource Not Found',
        message: 'Knowledge resource not found'
      });
    }

    const resourceLikesList = resourceLikes.filter(l => l.resourceId === id);

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedLikes = resourceLikesList.slice(startIndex, endIndex);

    const totalLikes = resourceLikesList.length;
    const totalPages = Math.ceil(totalLikes / limit);

    res.json({
      likes: paginatedLikes,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalLikes,
        hasNextPage: endIndex < totalLikes,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get likes error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch likes'
    });
  }
});

/**
 * @route   GET /api/knowledge/categories
 * @desc    Get all available categories
 * @access  Public
 */
router.get('/categories', (req, res) => {
  try {
    const categories = [...new Set(knowledgeResources.map(r => r.category))];
    
    res.json({
      categories: categories.sort()
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch categories'
    });
  }
});

/**
 * @route   GET /api/knowledge/user/resources
 * @desc    Get user's knowledge resources
 * @access  Private
 */
router.get('/user/resources', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 10 } = req.query;

    const userResources = knowledgeResources.filter(r => r.author.id === userId);

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedResources = userResources.slice(startIndex, endIndex);

    const totalResources = userResources.length;
    const totalPages = Math.ceil(totalResources / limit);

    res.json({
      resources: paginatedResources,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResources,
        hasNextPage: endIndex < totalResources,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get user resources error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch user resources'
    });
  }
});

module.exports = router;
