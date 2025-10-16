const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { contentValidation } = require('../middleware/validation');
const { Story, StoryView, Post, PostLike, PostComment, Connection } = require('../models/schemas');

const router = express.Router();

// Using MongoDB via Mongoose models

/**
 * @route   POST /api/profile/stories
 * @desc    Create a new story
 * @access  Private
 */
router.post('/stories', authenticateToken, contentValidation.createStory, async (req, res) => {
  try {
    const { userId, firstName, lastName } = req.user;
    const { mediaUrl, caption, type = 'image' } = req.body;
    if (!mediaUrl) return res.status(400).json({ error: 'Media Required', message: 'Media URL is required for stories' });
    const story = await Story.create({
      userId,
      author: { id: userId, firstName, lastName },
      mediaUrl,
      caption: caption || null,
      type,
      views: 0,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    res.status(201).json({ message: 'Story created successfully', story });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ error: 'Creation Failed', message: 'Failed to create story' });
  }
});

/**
 * @route   GET /api/profile/stories
 * @desc    Get stories from connected users
 * @access  Private
 */
router.get('/stories', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const connections = await Connection.find({ userId, status: 'connected' }).select('connectedUserId');
    const ids = connections.map(c => c.connectedUserId.toString());
    ids.push(userId);
    const now = new Date();
    const [items, totalStories] = await Promise.all([
      Story.find({ userId: { $in: ids }, expiresAt: { $gt: now } }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Story.countDocuments({ userId: { $in: ids }, expiresAt: { $gt: now } })
    ]);
    const totalPages = Math.ceil(totalStories / parseInt(limit));
    res.json({
      stories: items,
      pagination: { currentPage: parseInt(page), totalPages, totalStories, hasNextPage: skip + items.length < totalStories, hasPrevPage: parseInt(page) > 1 }
    });
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ error: 'Fetch Failed', message: 'Failed to fetch stories' });
  }
});

/**
 * @route   GET /api/profile/stories/:id
 * @desc    Get story by ID
 * @access  Private
 */
router.get('/stories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const story = await Story.findById(id);
    if (!story) return res.status(404).json({ error: 'Story Not Found', message: 'Story not found' });
    if (new Date(story.expiresAt) <= new Date()) {
      return res.status(410).json({ error: 'Story Expired', message: 'This story has expired' });
    }
    if (story.userId.toString() !== userId) {
      await Story.findByIdAndUpdate(id, { $inc: { views: 1 } });
      const exists = await StoryView.findOne({ storyId: id, userId });
      if (!exists) await StoryView.create({ storyId: id, userId, viewedAt: new Date() });
    }
    res.json({ story });
  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({ error: 'Fetch Failed', message: 'Failed to fetch story' });
  }
});

/**
 * @route   DELETE /api/profile/stories/:id
 * @desc    Delete story (only author can delete)
 * @access  Private
 */
router.delete('/stories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const story = await Story.findById(id);
    if (!story) return res.status(404).json({ error: 'Story Not Found', message: 'Story not found' });
    if (story.userId.toString() !== userId) return res.status(403).json({ error: 'Forbidden', message: 'You can only delete your own stories' });
    await Story.findByIdAndDelete(id);
    await StoryView.deleteMany({ storyId: id });
    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ error: 'Deletion Failed', message: 'Failed to delete story' });
  }
});

/**
 * @route   POST /api/profile/posts
 * @desc    Create a new post
 * @access  Private
 */
router.post('/posts', authenticateToken, contentValidation.createPost, async (req, res) => {
  try {
    const { userId, firstName, lastName } = req.user;
    const { content, type, mediaUrls = [], tags = [] } = req.body;
    const post = await Post.create({
      userId,
      author: { id: userId, firstName, lastName },
      content,
      type,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      tags: Array.isArray(tags) ? tags : [],
      likes: 0,
      commentsCount: 0,
      shares: 0,
      saves: 0,
    });
    res.status(201).json({ message: 'Post created successfully', post });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Creation Failed', message: 'Failed to create post' });
  }
});

/**
 * @route   GET /api/profile/posts
 * @desc    Get posts from connected users (feed)
 * @access  Private
 */
router.get('/posts', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 10, type, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const connections = await Connection.find({ userId, status: 'connected' }).select('connectedUserId');
    const ids = connections.map(c => c.connectedUserId.toString());
    ids.push(userId);
    const query = { userId: { $in: ids } };
    if (type) query.type = type;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, totalPosts] = await Promise.all([
      Post.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      Post.countDocuments(query)
    ]);
    const totalPages = Math.ceil(totalPosts / parseInt(limit));
    res.json({ posts: items, pagination: { currentPage: parseInt(page), totalPages, totalPosts, hasNextPage: skip + items.length < totalPosts, hasPrevPage: parseInt(page) > 1 } });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Fetch Failed', message: 'Failed to fetch posts' });
  }
});

/**
 * @route   GET /api/profile/posts/:id
 * @desc    Get post by ID
 * @access  Public (with optional auth)
 */
router.get('/posts/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user || {};
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: 'Post Not Found', message: 'Post not found' });
    const comments = await PostComment.find({ postId: id }).sort({ createdAt: -1 });
    let isLiked = false;
    if (userId) {
      const like = await PostLike.findOne({ postId: id, userId });
      isLiked = !!like;
    }
    res.json({ post: { ...post.toObject(), comments, isLiked } });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Fetch Failed', message: 'Failed to fetch post' });
  }
});

/**
 * @route   PUT /api/profile/posts/:id
 * @desc    Update post (only author can update)
 * @access  Private
 */
router.put('/posts/:id', authenticateToken, contentValidation.createPost, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { content, type, mediaUrls, tags } = req.body;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: 'Post Not Found', message: 'Post not found' });
    if (post.userId.toString() !== userId) return res.status(403).json({ error: 'Forbidden', message: 'You can only update your own posts' });
    post.content = content;
    post.type = type;
    if (mediaUrls) post.mediaUrls = Array.isArray(mediaUrls) ? mediaUrls : post.mediaUrls;
    if (tags) post.tags = Array.isArray(tags) ? tags : post.tags;
    await post.save();
    res.json({ message: 'Post updated successfully', post });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Update Failed', message: 'Failed to update post' });
  }
});

/**
 * @route   DELETE /api/profile/posts/:id
 * @desc    Delete post (only author can delete)
 * @access  Private
 */
router.delete('/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: 'Post Not Found', message: 'Post not found' });
    if (post.userId.toString() !== userId) return res.status(403).json({ error: 'Forbidden', message: 'You can only delete your own posts' });
    await Post.findByIdAndDelete(id);
    await Promise.all([
      PostLike.deleteMany({ postId: id }),
      PostComment.deleteMany({ postId: id })
    ]);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Deletion Failed', message: 'Failed to delete post' });
  }
});

/**
 * @route   POST /api/profile/posts/:id/like
 * @desc    Like/unlike post
 * @access  Private
 */
router.post('/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: 'Post Not Found', message: 'Post not found' });
    const existing = await PostLike.findOne({ postId: id, userId });
    if (existing) {
      await PostLike.deleteOne({ _id: existing._id });
      await Post.findByIdAndUpdate(id, { $inc: { likes: -1 } });
      const updated = await Post.findById(id).select('likes');
      return res.json({ message: 'Post unliked successfully', liked: false, likes: updated.likes });
    } else {
      await PostLike.create({ postId: id, userId, likedAt: new Date() });
      await Post.findByIdAndUpdate(id, { $inc: { likes: 1 } });
      const updated = await Post.findById(id).select('likes');
      return res.json({ message: 'Post liked successfully', liked: true, likes: updated.likes });
    }
  } catch (error) {
    console.error('Like/unlike post error:', error);
    res.status(500).json({ error: 'Action Failed', message: 'Failed to like/unlike post' });
  }
});

/**
 * @route   POST /api/profile/posts/:id/comments
 * @desc    Add comment to post
 * @access  Private
 */
router.post('/posts/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, firstName, lastName } = req.user;
    const { content } = req.body;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: 'Post Not Found', message: 'Post not found' });
    const comment = await PostComment.create({ postId: id, content, author: { id: userId, firstName, lastName } });
    await Post.findByIdAndUpdate(id, { $inc: { commentsCount: 1 } });
    res.status(201).json({ message: 'Comment added successfully', comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Comment Failed', message: 'Failed to add comment' });
  }
});

/**
 * @route   GET /api/profile/posts/:id/comments
 * @desc    Get comments for a post
 * @access  Public
 */
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: 'Post Not Found', message: 'Post not found' });
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [comments, totalComments] = await Promise.all([
      PostComment.find({ postId: id }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      PostComment.countDocuments({ postId: id })
    ]);
    const totalPages = Math.ceil(totalComments / parseInt(limit));
    res.json({ comments, pagination: { currentPage: parseInt(page), totalPages, totalComments, hasNextPage: skip + comments.length < totalComments, hasPrevPage: parseInt(page) > 1 } });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Fetch Failed', message: 'Failed to fetch comments' });
  }
});

/**
 * @route   GET /api/profile/user/:userId
 * @desc    Get user profile with posts and stories
 * @access  Public (with optional auth)
 */
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentUserId } = req.user || {};
    const now = new Date();
    const [userPosts, userStories] = await Promise.all([
      Post.find({ userId }).sort({ createdAt: -1 }),
      Story.find({ userId, expiresAt: { $gt: now } }).sort({ createdAt: -1 })
    ]);
    let isConnected = false;
    if (currentUserId) {
      const conn = await Connection.findOne({ userId: currentUserId, connectedUserId: userId, status: 'connected' });
      isConnected = !!conn;
    }
    res.json({ profile: { id: userId }, posts: userPosts, stories: userStories, isConnected });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Fetch Failed', message: 'Failed to fetch user profile' });
  }
});

/**
 * @route   GET /api/profile/feed
 * @desc    Get personalized feed (posts + stories)
 * @access  Private
 */
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 15 } = req.query;
    const connections = await Connection.find({ userId, status: 'connected' }).select('connectedUserId');
    const ids = connections.map(c => c.connectedUserId.toString());
    ids.push(userId);
    const now = new Date();
    const [feedPosts, feedStories] = await Promise.all([
      Post.find({ userId: { $in: ids } }),
      Story.find({ userId: { $in: ids }, expiresAt: { $gt: now } })
    ]);
    const feed = [
      ...feedPosts.map(p => ({ ...p.toObject(), contentType: 'post' })),
      ...feedStories.map(s => ({ ...s.toObject(), contentType: 'story' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedFeed = feed.slice(startIndex, endIndex);
    const totalItems = feed.length;
    const totalPages = Math.ceil(totalItems / limit);
    res.json({ feed: paginatedFeed, pagination: { currentPage: parseInt(page), totalPages, totalItems, hasNextPage: endIndex < totalItems, hasPrevPage: page > 1 } });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Fetch Failed', message: 'Failed to fetch feed' });
  }
});

module.exports = router;
