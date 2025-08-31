const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { contentValidation } = require('../middleware/validation');

const router = express.Router();

// Mock data (replace with database operations later)
let stories = [];
let posts = [];
let storyViews = [];
let postLikes = [];
let postComments = [];
let userConnections = [];

/**
 * @route   POST /api/profile/stories
 * @desc    Create a new story
 * @access  Private
 */
router.post('/stories', authenticateToken, contentValidation.createStory, (req, res) => {
  try {
    const { userId, firstName, lastName } = req.user;
    const { mediaUrl, caption, type = 'image' } = req.body;

    if (!mediaUrl) {
      return res.status(400).json({
        error: 'Media Required',
        message: 'Media URL is required for stories'
      });
    }

    const newStory = {
      id: Date.now().toString(),
      userId,
      author: {
        id: userId,
        firstName,
        lastName
      },
      mediaUrl,
      caption: caption || null,
      type, // image, video
      views: 0,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    stories.push(newStory);

    res.status(201).json({
      message: 'Story created successfully',
      story: newStory
    });

  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({
      error: 'Creation Failed',
      message: 'Failed to create story'
    });
  }
});

/**
 * @route   GET /api/profile/stories
 * @desc    Get stories from connected users
 * @access  Private
 */
router.get('/stories', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20 } = req.query;

    // Get user connections
    const connections = userConnections.filter(c => 
      c.userId === userId && c.status === 'connected'
    ).map(c => c.connectedUserId);

    // Add self to connections
    connections.push(userId);

    // Get stories from connected users that haven't expired
    const currentTime = new Date();
    const validStories = stories.filter(s => 
      connections.includes(s.userId) && 
      new Date(s.expiresAt) > currentTime
    );

    // Sort by creation time (newest first)
    validStories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedStories = validStories.slice(startIndex, endIndex);

    const totalStories = validStories.length;
    const totalPages = Math.ceil(totalStories / limit);

    res.json({
      stories: paginatedStories,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalStories,
        hasNextPage: endIndex < totalStories,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch stories'
    });
  }
});

/**
 * @route   GET /api/profile/stories/:id
 * @desc    Get story by ID
 * @access  Private
 */
router.get('/stories/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const story = stories.find(s => s.id === id);
    if (!story) {
      return res.status(404).json({
        error: 'Story Not Found',
        message: 'Story not found'
      });
    }

    // Check if story has expired
    if (new Date(story.expiresAt) <= new Date()) {
      return res.status(410).json({
        error: 'Story Expired',
        message: 'This story has expired'
      });
    }

    // Increment view count if user is not the author
    if (story.userId !== userId) {
      story.views += 1;
      
      // Track view
      const existingView = storyViews.find(v => v.storyId === id && v.userId === userId);
      if (!existingView) {
        storyViews.push({
          id: Date.now().toString(),
          storyId: id,
          userId,
          viewedAt: new Date().toISOString()
        });
      }
    }

    res.json({
      story
    });

  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch story'
    });
  }
});

/**
 * @route   DELETE /api/profile/stories/:id
 * @desc    Delete story (only author can delete)
 * @access  Private
 */
router.delete('/stories/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const storyIndex = stories.findIndex(s => s.id === id);
    if (storyIndex === -1) {
      return res.status(404).json({
        error: 'Story Not Found',
        message: 'Story not found'
      });
    }

    const story = stories[storyIndex];

    // Check if user is the author
    if (story.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own stories'
      });
    }

    // Delete story
    stories.splice(storyIndex, 1);

    // Delete associated views
    storyViews = storyViews.filter(v => v.storyId !== id);

    res.json({
      message: 'Story deleted successfully'
    });

  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({
      error: 'Deletion Failed',
      message: 'Failed to delete story'
    });
  }
});

/**
 * @route   POST /api/profile/posts
 * @desc    Create a new post
 * @access  Private
 */
router.post('/posts', authenticateToken, contentValidation.createPost, (req, res) => {
  try {
    const { userId, firstName, lastName } = req.user;
    const { content, type, mediaUrls = [], tags = [] } = req.body;

    const newPost = {
      id: Date.now().toString(),
      userId,
      author: {
        id: userId,
        firstName,
        lastName
      },
      content,
      type, // professional, social
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      tags: Array.isArray(tags) ? tags : [],
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    posts.push(newPost);

    res.status(201).json({
      message: 'Post created successfully',
      post: newPost
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      error: 'Creation Failed',
      message: 'Failed to create post'
    });
  }
});

/**
 * @route   GET /api/profile/posts
 * @desc    Get posts from connected users (feed)
 * @access  Private
 */
router.get('/posts', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 10, type, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Get user connections
    const connections = userConnections.filter(c => 
      c.userId === userId && c.status === 'connected'
    ).map(c => c.connectedUserId);

    // Add self to connections
    connections.push(userId);

    // Get posts from connected users
    let filteredPosts = posts.filter(p => connections.includes(p.userId));

    // Filter by type if specified
    if (type) {
      filteredPosts = filteredPosts.filter(p => p.type === type);
    }

    // Sorting
    filteredPosts.sort((a, b) => {
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
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

    const totalPosts = filteredPosts.length;
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      posts: paginatedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPosts,
        hasNextPage: endIndex < totalPosts,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch posts'
    });
  }
});

/**
 * @route   GET /api/profile/posts/:id
 * @desc    Get post by ID
 * @access  Public (with optional auth)
 */
router.get('/posts/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user || {};

    const post = posts.find(p => p.id === id);
    if (!post) {
      return res.status(404).json({
        error: 'Post Not Found',
        message: 'Post not found'
      });
    }

    // Get comments for this post
    const postComments = postComments.filter(c => c.postId === id);

    // Check if user liked this post
    let isLiked = false;
    if (userId) {
      isLiked = postLikes.some(l => l.postId === id && l.userId === userId);
    }

    res.json({
      post: {
        ...post,
        comments: postComments,
        isLiked
      }
    });

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch post'
    });
  }
});

/**
 * @route   PUT /api/profile/posts/:id
 * @desc    Update post (only author can update)
 * @access  Private
 */
router.put('/posts/:id', authenticateToken, contentValidation.createPost, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { content, type, mediaUrls, tags } = req.body;

    const post = posts.find(p => p.id === id);
    if (!post) {
      return res.status(404).json({
        error: 'Post Not Found',
        message: 'Post not found'
      });
    }

    // Check if user is the author
    if (post.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own posts'
      });
    }

    // Update post
    post.content = content;
    post.type = type;
    post.mediaUrls = Array.isArray(mediaUrls) ? mediaUrls : post.mediaUrls;
    post.tags = Array.isArray(tags) ? tags : post.tags;
    post.updatedAt = new Date().toISOString();

    res.json({
      message: 'Post updated successfully',
      post
    });

  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to update post'
    });
  }
});

/**
 * @route   DELETE /api/profile/posts/:id
 * @desc    Delete post (only author can delete)
 * @access  Private
 */
router.delete('/posts/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const postIndex = posts.findIndex(p => p.id === id);
    if (postIndex === -1) {
      return res.status(404).json({
        error: 'Post Not Found',
        message: 'Post not found'
      });
    }

    const post = posts[postIndex];

    // Check if user is the author
    if (post.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own posts'
      });
    }

    // Delete post
    posts.splice(postIndex, 1);

    // Delete associated data
    postLikes = postLikes.filter(l => l.postId !== id);
    postComments = postComments.filter(c => c.postId !== id);

    res.json({
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      error: 'Deletion Failed',
      message: 'Failed to delete post'
    });
  }
});

/**
 * @route   POST /api/profile/posts/:id/like
 * @desc    Like/unlike post
 * @access  Private
 */
router.post('/posts/:id/like', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const post = posts.find(p => p.id === id);
    if (!post) {
      return res.status(404).json({
        error: 'Post Not Found',
        message: 'Post not found'
      });
    }

    // Check if user already liked
    const existingLike = postLikes.find(l => l.postId === id && l.userId === userId);

    if (existingLike) {
      // Unlike
      postLikes = postLikes.filter(l => l.id !== existingLike.id);
      post.likes -= 1;
      
      res.json({
        message: 'Post unliked successfully',
        liked: false,
        likes: post.likes
      });
    } else {
      // Like
      const newLike = {
        id: Date.now().toString(),
        postId: id,
        userId,
        likedAt: new Date().toISOString()
      };

      postLikes.push(newLike);
      post.likes += 1;

      res.json({
        message: 'Post liked successfully',
        liked: true,
        likes: post.likes
      });
    }

  } catch (error) {
    console.error('Like/unlike post error:', error);
    res.status(500).json({
      error: 'Action Failed',
      message: 'Failed to like/unlike post'
    });
  }
});

/**
 * @route   POST /api/profile/posts/:id/comments
 * @desc    Add comment to post
 * @access  Private
 */
router.post('/posts/:id/comments', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId, firstName, lastName } = req.user;
    const { content } = req.body;

    const post = posts.find(p => p.id === id);
    if (!post) {
      return res.status(404).json({
        error: 'Post Not Found',
        message: 'Post not found'
      });
    }

    const newComment = {
      id: Date.now().toString(),
      postId: id,
      content,
      author: {
        id: userId,
        firstName,
        lastName
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    postComments.push(newComment);

    // Update post comment count
    post.comments += 1;

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
 * @route   GET /api/profile/posts/:id/comments
 * @desc    Get comments for a post
 * @access  Public
 */
router.get('/posts/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const post = posts.find(p => p.id === id);
    if (!post) {
      return res.status(404).json({
        error: 'Post Not Found',
        message: 'Post not found'
      });
    }

    const postCommentsList = postComments.filter(c => c.postId === id);

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedComments = postCommentsList.slice(startIndex, endIndex);

    const totalComments = postCommentsList.length;
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
 * @route   GET /api/profile/user/:userId
 * @desc    Get user profile with posts and stories
 * @access  Public (with optional auth)
 */
router.get('/user/:userId', optionalAuth, (req, res) => {
  try {
    const { userId } = req.params;
    const { currentUserId } = req.user || {};

    // TODO: Get user profile from users array
    // For now, return basic structure
    const userProfile = {
      id: userId,
      // Add user details here when users array is available
    };

    // Get user's posts
    const userPosts = posts.filter(p => p.userId === userId);

    // Get user's active stories
    const currentTime = new Date();
    const userStories = stories.filter(s => 
      s.userId === userId && new Date(s.expiresAt) > currentTime
    );

    // Check if current user is connected to this user
    let isConnected = false;
    if (currentUserId) {
      isConnected = userConnections.some(c => 
        c.userId === currentUserId && 
        c.connectedUserId === userId && 
        c.status === 'connected'
      );
    }

    res.json({
      profile: userProfile,
      posts: userPosts,
      stories: userStories,
      isConnected
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch user profile'
    });
  }
});

/**
 * @route   GET /api/profile/feed
 * @desc    Get personalized feed (posts + stories)
 * @access  Private
 */
router.get('/feed', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 15 } = req.query;

    // Get user connections
    const connections = userConnections.filter(c => 
      c.userId === userId && c.status === 'connected'
    ).map(c => c.connectedUserId);

    // Add self to connections
    connections.push(userId);

    // Get posts and stories from connected users
    const currentTime = new Date();
    
    const feedPosts = posts.filter(p => connections.includes(p.userId));
    const feedStories = stories.filter(s => 
      connections.includes(s.userId) && new Date(s.expiresAt) > currentTime
    );

    // Combine and sort by creation time
    const feed = [
      ...feedPosts.map(p => ({ ...p, contentType: 'post' })),
      ...feedStories.map(s => ({ ...s, contentType: 'story' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedFeed = feed.slice(startIndex, endIndex);

    const totalItems = feed.length;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      feed: paginatedFeed,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        hasNextPage: endIndex < totalItems,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch feed'
    });
  }
});

module.exports = router;
