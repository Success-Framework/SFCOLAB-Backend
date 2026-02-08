const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { authenticateToken, optionalAuth } = require("../middleware/auth");
const { contentValidation } = require("../middleware/validation");
const {
  Story,
  StoryView,
  Post,
  PostLike,
  PostComment,
  Connection,
  User,
} = require("../models/schemas");

const router = express.Router();
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi|mkv/;

    // Check mimetype and extension
    const mimetype = filetypes.test(file.mimetype.toLowerCase());
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPG, JPEG, GIF, PNG, and video files (MP4, MOV, AVI, MKV) are allowed"
        ),
        false
      );
    }
  },
});
// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
// Using MongoDB via Mongoose models

/**
 * @route   POST /api/profile/stories
 * @desc    Create a new story
 * @access  Private
 */
router.post(
  "/stories",
  authenticateToken,
  contentValidation.createStory,
  async (req, res) => {
    try {
      const { userId, firstName, lastName } = req.user;
      const { mediaUrl: bodyMediaUrl, caption, type = "image" } = req.body;

      // prefer uploaded file if provided
      let finalMediaUrl = bodyMediaUrl || null;
      if (req.file) {
        const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
        const filePath = path.join(__dirname, "..", "uploads", filename);
        try {
          fs.writeFileSync(filePath, req.file.buffer);
          finalMediaUrl = `${process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5001}`}/uploads/${filename}`;
        } catch (writeErr) {
          console.error("Failed to save story uploaded file:", writeErr);
        }
      }

      if (!finalMediaUrl)
        return res.status(400).json({ error: "Media Required", message: "Media URL is required for stories" });

      const story = await Story.create({
        userId,
        author: { id: userId, firstName, lastName },
        mediaUrl: finalMediaUrl,
        caption: caption || null,
        type,
        views: 0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      // Emit story event to followers and the author
      try {
        const io = req.app.get("io");
        if (io) {
          // Find followers (users who follow this user)
          const followers = await Connection.find({ connectedUserId: userId, status: "connected" }).select("userId");
          const followerIds = followers.map((f) => f.userId.toString());
          // lightweight payload
          const payload = {
            id: story._id,
            userId: story.userId,
            author: story.author,
            mediaUrl: story.mediaUrl,
            caption: story.caption,
            type: story.type,
            createdAt: story.createdAt,
            contentType: "story",
          };
          // emit to each follower room
          followerIds.forEach((fid) => io.to(fid).emit("new_content", payload));
          // emit to author as well
          io.to(userId).emit("new_content", payload);
        }
      } catch (emitErr) {
        console.error("Story emit error:", emitErr);
      }
      res.status(201).json({ message: "Story created successfully", story });
    } catch (error) {
      console.error("Create story error:", error);
      res
        .status(500)
        .json({ error: "Creation Failed", message: "Failed to create story" });
    }
  }
);

/**
 * @route   GET /api/profile/stories
 * @desc    Get stories from connected users
 * @access  Private
 */
router.get("/stories", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const connections = await Connection.find({
      userId,
      status: "connected",
    }).select("connectedUserId");
    const ids = connections.map((c) => c.connectedUserId.toString());
    ids.push(userId);
    const now = new Date();
    const [items, totalStories] = await Promise.all([
      Story.find({ userId: { $in: ids }, expiresAt: { $gt: now } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Story.countDocuments({ userId: { $in: ids }, expiresAt: { $gt: now } }),
    ]);
    const totalPages = Math.ceil(totalStories / parseInt(limit));
    res.json({
      stories: items,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalStories,
        hasNextPage: skip + items.length < totalStories,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get stories error:", error);
    res
      .status(500)
      .json({ error: "Fetch Failed", message: "Failed to fetch stories" });
  }
});

/**
 * @route   GET /api/profile/stories/:id
 * @desc    Get story by ID
 * @access  Private
 */
router.get("/stories/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const story = await Story.findById(id);
    if (!story)
      return res
        .status(404)
        .json({ error: "Story Not Found", message: "Story not found" });
    if (new Date(story.expiresAt) <= new Date()) {
      return res
        .status(410)
        .json({ error: "Story Expired", message: "This story has expired" });
    }
    if (story.userId.toString() !== userId) {
      await Story.findByIdAndUpdate(id, { $inc: { views: 1 } });
      const exists = await StoryView.findOne({ storyId: id, userId });
      if (!exists)
        await StoryView.create({ storyId: id, userId, viewedAt: new Date() });
    }
    res.json({ story });
  } catch (error) {
    console.error("Get story error:", error);
    res
      .status(500)
      .json({ error: "Fetch Failed", message: "Failed to fetch story" });
  }
});

/**
 * @route   DELETE /api/profile/stories/:id
 * @desc    Delete story (only author can delete)
 * @access  Private
 */
router.delete("/stories/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const story = await Story.findById(id);
    if (!story)
      return res
        .status(404)
        .json({ error: "Story Not Found", message: "Story not found" });
    if (story.userId.toString() !== userId)
      return res
        .status(403)
        .json({
          error: "Forbidden",
          message: "You can only delete your own stories",
        });
    await Story.findByIdAndDelete(id);
    await StoryView.deleteMany({ storyId: id });
    res.json({ message: "Story deleted successfully" });
  } catch (error) {
    console.error("Delete story error:", error);
    res
      .status(500)
      .json({ error: "Deletion Failed", message: "Failed to delete story" });
  }
});

/**
 * @route   POST /api/profile/posts
 * @desc    Create a new post
 * @access  Private
 */
router.post(
  "/posts",
  authenticateToken,
  upload.single("media"),
  contentValidation.createPost,
  async (req, res) => {
    try {
      const { userId, firstName, lastName } = req.user;
      const { content, type, tags = [] } = req.body;

      let media = null;
      let mediaUrl = null;
      if (req.file) {
        const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
        const filePath = path.join(__dirname, "..", "uploads", filename);
        try {
          fs.writeFileSync(filePath, req.file.buffer);
          mediaUrl = `${process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5001}`}/uploads/${filename}`;
          media = {
            url: mediaUrl,
            contentType: req.file.mimetype,
            fileName: filename,
          };
        } catch (writeErr) {
          console.error("Failed to save uploaded file:", writeErr);
        }
      }

      const post = await Post.create({
        userId,
        author: { id: userId, firstName, lastName },
        content,
        type: type || (media?.contentType.includes("video") ? "video" : "image"),
        media: media ? [media] : [],
        tags: Array.isArray(tags) ? tags : [],
        likes: 0,
        commentsCount: 0,
        shares: 0,
        saves: 0,
      });

      // Emit new post to followers and the author via Socket.IO
      try {
        const io = req.app.get("io");
        if (io) {
          // followers: users who follow this poster
          const followers = await Connection.find({ connectedUserId: userId, status: "connected" }).select("userId");
          const followerIds = followers.map((f) => f.userId.toString());

          const payload = {
            id: post._id,
            userId: post.userId,
            author: post.author,
            content: post.content,
            type: post.type,
            createdAt: post.createdAt,
            // include media url if present
            mediaUrl: mediaUrl,
            hasMedia: !!mediaUrl,
          };

          // send to each follower room
          followerIds.forEach((fid) => io.to(fid).emit("new_post", payload));
          // also emit to author so their UI updates instantly
          io.to(userId).emit("new_post", payload);
        }
      } catch (emitErr) {
        console.error("Post emit error:", emitErr);
      }

      res.status(201).json({ message: "Post created successfully", post });
    } catch (error) {
      console.error("Create post error:", error);
      res
        .status(500)
        .json({ error: "Creation Failed", message: "Failed to create post" });
    }
  }
);

/**
 * @route   GET /api/profile/posts
 * @desc    Get posts from connected users (feed)
 * @access  Private
 */
router.get("/posts", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      page = 1,
      limit = 10,
      type,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;
    const connections = await Connection.find({
      userId,
      status: "connected",
    }).select("connectedUserId");
    const ids = connections.map((c) => c.connectedUserId.toString());
    ids.push(userId);
    const query = { userId: { $in: ids } };
    if (type) query.type = type;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, totalPosts] = await Promise.all([
      Post.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      Post.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalPosts / parseInt(limit));
    res.json({
      posts: items,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPosts,
        hasNextPage: skip + items.length < totalPosts,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get posts error:", error);
    res
      .status(500)
      .json({ error: "Fetch Failed", message: "Failed to fetch posts" });
  }
});

/**
 * @route   GET /api/profile/posts/:id
 * @desc    Get post by ID
 * @access  Public (with optional auth)
 */
router.get("/posts/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user || {};
    const post = await Post.findById(id);
    if (!post)
      return res
        .status(404)
        .json({ error: "Post Not Found", message: "Post not found" });
    const comments = await PostComment.find({ postId: id }).sort({
      createdAt: -1,
    });
    let isLiked = false;
    if (userId) {
      const like = await PostLike.findOne({ postId: id, userId });
      isLiked = !!like;
    }
    res.json({ post: { ...post.toObject(), comments, isLiked } });
  } catch (error) {
    console.error("Get post error:", error);
    res
      .status(500)
      .json({ error: "Fetch Failed", message: "Failed to fetch post" });
  }
});

/**
 * @route   PUT /api/profile/posts/:id
 * @desc    Update post (only author can update)
 * @access  Private
 */
router.put(
  "/posts/:id",
  authenticateToken,
  contentValidation.createPost,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.user;
      const { content, type, mediaUrls, tags } = req.body;
      const post = await Post.findById(id);
      if (!post)
        return res
          .status(404)
          .json({ error: "Post Not Found", message: "Post not found" });
      if (post.userId.toString() !== userId)
        return res
          .status(403)
          .json({
            error: "Forbidden",
            message: "You can only update your own posts",
          });
      post.content = content;
      post.type = type;
      if (mediaUrls)
        post.mediaUrls = Array.isArray(mediaUrls) ? mediaUrls : post.mediaUrls;
      if (tags) post.tags = Array.isArray(tags) ? tags : post.tags;
      await post.save();
      res.json({ message: "Post updated successfully", post });
    } catch (error) {
      console.error("Update post error:", error);
      res
        .status(500)
        .json({ error: "Update Failed", message: "Failed to update post" });
    }
  }
);

/**
 * @route   DELETE /api/profile/posts/:id
 * @desc    Delete post (only author can delete)
 * @access  Private
 */
router.delete("/posts/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const post = await Post.findById(id);
    if (!post)
      return res
        .status(404)
        .json({ error: "Post Not Found", message: "Post not found" });
    if (post.userId.toString() !== userId)
      return res
        .status(403)
        .json({
          error: "Forbidden",
          message: "You can only delete your own posts",
        });
    await Post.findByIdAndDelete(id);
    await Promise.all([
      PostLike.deleteMany({ postId: id }),
      PostComment.deleteMany({ postId: id }),
    ]);
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete post error:", error);
    res
      .status(500)
      .json({ error: "Deletion Failed", message: "Failed to delete post" });
  }
});

/**
 * @route   POST /api/profile/posts/:id/like
 * @desc    Like/unlike post
 * @access  Private
 */
router.post("/posts/:id/like", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const post = await Post.findById(id);
    if (!post)
      return res
        .status(404)
        .json({ error: "Post Not Found", message: "Post not found" });
    const existing = await PostLike.findOne({ postId: id, userId });
    if (existing) {
      await PostLike.deleteOne({ _id: existing._id });
      await Post.findByIdAndUpdate(id, { $inc: { likes: -1 } });
      const updated = await Post.findById(id).select("likes");
      return res.json({
        message: "Post unliked successfully",
        liked: false,
        likes: updated.likes,
      });
    } else {
      await PostLike.create({ postId: id, userId, likedAt: new Date() });
      await Post.findByIdAndUpdate(id, { $inc: { likes: 1 } });
      const updated = await Post.findById(id).select("likes");
      return res.json({
        message: "Post liked successfully",
        liked: true,
        likes: updated.likes,
      });
    }
  } catch (error) {
    console.error("Like/unlike post error:", error);
    res
      .status(500)
      .json({ error: "Action Failed", message: "Failed to like/unlike post" });
  }
});

/**
 * @route   POST /api/profile/posts/:id/comments
 * @desc    Add comment to post
 * @access  Private
 */
router.post("/posts/:id/comments", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, firstName, lastName } = req.user;
    const { content } = req.body;
    const post = await Post.findById(id);
    if (!post)
      return res
        .status(404)
        .json({ error: "Post Not Found", message: "Post not found" });
    const comment = await PostComment.create({
      postId: id,
      content,
      author: { id: userId, firstName, lastName },
    });
    await Post.findByIdAndUpdate(id, { $inc: { commentsCount: 1 } });
    res.status(201).json({ message: "Comment added successfully", comment });
  } catch (error) {
    console.error("Add comment error:", error);
    res
      .status(500)
      .json({ error: "Comment Failed", message: "Failed to add comment" });
  }
});

/**
 * @route   GET /api/profile/posts/:id/comments
 * @desc    Get comments for a post
 * @access  Public
 */
router.get("/posts/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const post = await Post.findById(id);
    if (!post)
      return res
        .status(404)
        .json({ error: "Post Not Found", message: "Post not found" });
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [comments, totalComments] = await Promise.all([
      PostComment.find({ postId: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PostComment.countDocuments({ postId: id }),
    ]);
    const totalPages = Math.ceil(totalComments / parseInt(limit));
    res.json({
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalComments,
        hasNextPage: skip + comments.length < totalComments,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res
      .status(500)
      .json({ error: "Fetch Failed", message: "Failed to fetch comments" });
  }
});

/**
 * @route   GET /api/profile/user/:userId
 * @desc    Get user profile with posts and stories
 * @access  Public (with optional auth)
 */
router.get("/user/:userId", optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentUserId } = req.user || {};
    const now = new Date();
    const [userPosts, userStories] = await Promise.all([
      Post.find({ userId }).sort({ createdAt: -1 }),
      Story.find({ userId, expiresAt: { $gt: now } }).sort({ createdAt: -1 }),
    ]);
    let isConnected = false;
    if (currentUserId) {
      const conn = await Connection.findOne({
        userId: currentUserId,
        connectedUserId: userId,
        status: "connected",
      });
      isConnected = !!conn;
    }
    res.json({
      profile: { id: userId },
      posts: userPosts,
      stories: userStories,
      isConnected,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res
      .status(500)
      .json({ error: "Fetch Failed", message: "Failed to fetch user profile" });
  }
});

/**
 * @route   GET /api/profile/feed
 * @desc    Get personalized feed (posts + stories)
 * @access  Private
 */
router.get("/feed", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 15 } = req.query;
    const connections = await Connection.find({
      userId,
      status: "connected",
    }).select("connectedUserId");
    const ids = connections.map((c) => c.connectedUserId.toString());
    ids.push(userId);
    const now = new Date();
    const [feedPosts, feedStories] = await Promise.all([
      Post.find({ userId: { $in: ids } }),
      Story.find({ userId: { $in: ids }, expiresAt: { $gt: now } }),
    ]);
    const feed = [
      ...feedPosts.map((p) => ({ ...p.toObject(), contentType: "post" })),
      ...feedStories.map((s) => ({ ...s.toObject(), contentType: "story" })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get feed error:", error);
    res
      .status(500)
      .json({ error: "Fetch Failed", message: "Failed to fetch feed" });
  }
});

/**
 * @route   POST /api/profile/:userId/follow
 * @desc    Follow a user
 * @access  Private
 */
router.post("/:userId/follow", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { userId: targetUserId } = req.params;

    if (userId === targetUserId) {
      return res.status(400).json({
        error: "Invalid Action",
        message: "You cannot follow yourself",
      });
    }

    // Check if connection already exists
    const existing = await Connection.findOne({
      userId,
      connectedUserId: targetUserId,
    });

    if (existing) {
      if (existing.status === "connected") {
        return res.status(400).json({
          error: "Already Following",
          message: "You are already following this user",
        });
      }
      // If pending or blocked, update to connected
      existing.status = "connected";
      await existing.save();
    } else {
      // Create new connection
      await Connection.create({
        userId,
        connectedUserId: targetUserId,
        status: "connected",
      });
    }

    res.json({ message: "User followed successfully" });
  } catch (error) {
    console.error("Follow user error:", error);
    res.status(500).json({
      error: "Action Failed",
      message: "Failed to follow user",
    });
  }
});

/**
 * @route   POST /api/profile/:userId/unfollow
 * @desc    Unfollow a user
 * @access  Private
 */
router.post("/:userId/unfollow", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { userId: targetUserId } = req.params;

    if (userId === targetUserId) {
      return res.status(400).json({
        error: "Invalid Action",
        message: "You cannot unfollow yourself",
      });
    }

    const result = await Connection.deleteOne({
      userId,
      connectedUserId: targetUserId,
      status: "connected",
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: "Connection not found",
      });
    }

    res.json({ message: "User unfollowed successfully" });
  } catch (error) {
    console.error("Unfollow user error:", error);
    res.status(500).json({
      error: "Action Failed",
      message: "Failed to unfollow user",
    });
  }
});

/**
 * @route   GET /api/profile/:userId/is-following
 * @desc    Check if current user is following a user
 * @access  Private
 */
router.get("/:userId/is-following", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { userId: targetUserId } = req.params;

    const connection = await Connection.findOne({
      userId,
      connectedUserId: targetUserId,
      status: "connected",
    });

    res.json({ isFollowing: !!connection });
  } catch (error) {
    console.error("Check following error:", error);
    res.status(500).json({
      error: "Action Failed",
      message: "Failed to check following status",
    });
  }
});

/**
 * @route   GET /api/profile/explore
 * @desc    Get explore posts (public posts from all users)
 * @access  Private
 */
router.get("/explore", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      page = 1,
      limit = 10,
      type,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, totalPosts] = await Promise.all([
      Post.find({})
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Post.countDocuments({}),
    ]);

    const totalPages = Math.ceil(totalPosts / parseInt(limit));

    res.json({
      posts: items,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPosts,
        hasNextPage: skip + items.length < totalPosts,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get explore posts error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch explore posts",
    });
  }
});

/**
 * @route   GET /api/profile/suggestions
 * @desc    Get user suggestions (users not being followed)
 * @access  Private
 */
router.get("/suggestions", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 5 } = req.query;

    // Get all users that current user is following
    const following = await Connection.find({ userId, status: "connected" }).select(
      "connectedUserId"
    );

    const followingIds = following.map((c) => c.connectedUserId.toString());
    followingIds.push(userId); // Exclude self

    // Get users not in following list
    const suggestions = await User.find({
      _id: { $nin: followingIds.map((id) => mongoose.Types.ObjectId(id)) },
    })
      .select("_id firstName lastName profile.picture")
      .limit(parseInt(limit));

    res.json({ suggestions });
  } catch (error) {
    console.error("Get suggestions error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch suggestions",
    });
  }
});

    /**
     * @route   POST /api/profile/:userId/follow
     * @desc    Follow a user
     * @access  Private
     */
    router.post("/:userId/follow", authenticateToken, async (req, res) => {
      try {
        const actorId = req.user.userId;
        const targetId = req.params.userId;

        if (!actorId || !targetId) {
          return res.status(400).json({ error: "Invalid user id" });
        }

        if (actorId.toString() === targetId.toString()) {
          return res.status(400).json({ error: "Cannot follow yourself" });
        }

        let connection = await Connection.findOne({
          userId: actorId,
          connectedUserId: targetId,
        });

        if (connection) {
          connection.status = "connected";
          await connection.save();
        } else {
          connection = await Connection.create({
            userId: actorId,
            connectedUserId: targetId,
            status: "connected",
          });
        }

        return res.json({ success: true, connection });
      } catch (error) {
        console.error("Follow user error:", error);
        return res.status(500).json({ error: "Follow Failed" });
      }
    });

    /**
     * @route   POST /api/profile/:userId/unfollow
     * @desc    Unfollow a user
     * @access  Private
     */
    router.post("/:userId/unfollow", authenticateToken, async (req, res) => {
      try {
        const actorId = req.user.userId;
        const targetId = req.params.userId;

        if (!actorId || !targetId) {
          return res.status(400).json({ error: "Invalid user id" });
        }

        await Connection.findOneAndDelete({ userId: actorId, connectedUserId: targetId });

        return res.json({ success: true });
      } catch (error) {
        console.error("Unfollow user error:", error);
        return res.status(500).json({ error: "Unfollow Failed" });
      }
    });

    /**
     * @route   GET /api/profile/:userId/is-following
     * @desc    Check if current user is following target user
     * @access  Private
     */
    router.get("/:userId/is-following", authenticateToken, async (req, res) => {
      try {
        const actorId = req.user.userId;
        const targetId = req.params.userId;

        if (!actorId || !targetId) {
          return res.status(400).json({ error: "Invalid user id" });
        }

        const connection = await Connection.findOne({
          userId: actorId,
          connectedUserId: targetId,
          status: "connected",
        });

        return res.json({ isFollowing: !!connection });
      } catch (error) {
        console.error("is-following check error:", error);
        return res.status(500).json({ error: "Check Failed" });
      }
    });

    /**
     * @route   DELETE /api/profile/posts/:postId
     * @desc    Delete a post (author only)
     * @access  Private
     */
    router.delete("/posts/:postId", authenticateToken, async (req, res) => {
      try {
        const userId = req.user.userId;
        const postId = req.params.postId;

        const post = await Post.findById(postId);
        if (!post) {
          return res.status(404).json({ error: "Post not found" });
        }

        if (post.author.toString() !== userId) {
          return res.status(403).json({ error: "Unauthorized" });
        }

        await Post.findByIdAndDelete(postId);
        io.emit("post_deleted", { postId, userId });

        return res.json({ success: true, message: "Post deleted" });
      } catch (error) {
        console.error("Delete post error:", error);
        return res.status(500).json({ error: "Delete Failed" });
      }
    });

    /**
     * @route   PATCH /api/profile/posts/:postId
     * @desc    Edit a post (author only)
     * @access  Private
     */
    router.patch("/posts/:postId", authenticateToken, async (req, res) => {
      try {
        const userId = req.user.userId;
        const postId = req.params.postId;
        const { caption } = req.body;

        const post = await Post.findById(postId);
        if (!post) {
          return res.status(404).json({ error: "Post not found" });
        }

        if (post.author.toString() !== userId) {
          return res.status(403).json({ error: "Unauthorized" });
        }

        post.caption = caption || post.caption;
        await post.save();
        io.emit("post_updated", { postId, caption });

        return res.json({ success: true, post });
      } catch (error) {
        console.error("Edit post error:", error);
        return res.status(500).json({ error: "Edit Failed" });
      }
    });

    /**
     * @route   POST /api/profile/posts/:postId/save
     * @desc    Save a post
     * @access  Private
     */
    router.post("/posts/:postId/save", authenticateToken, async (req, res) => {
      try {
        const userId = req.user.userId;
        const postId = req.params.postId;

        const post = await Post.findById(postId);
        if (!post) {
          return res.status(404).json({ error: "Post not found" });
        }

        if (!post.savedBy) post.savedBy = [];
        if (!post.savedBy.includes(userId)) {
          post.savedBy.push(userId);
          await post.save();
        }

        return res.json({ success: true, saved: true });
      } catch (error) {
        console.error("Save post error:", error);
        return res.status(500).json({ error: "Save Failed" });
      }
    });

    /**
     * @route   POST /api/profile/posts/:postId/unsave
     * @desc    Unsave a post
     * @access  Private
     */
    router.post("/posts/:postId/unsave", authenticateToken, async (req, res) => {
      try {
        const userId = req.user.userId;
        const postId = req.params.postId;

        const post = await Post.findById(postId);
        if (!post) {
          return res.status(404).json({ error: "Post not found" });
        }

        if (post.savedBy) {
          post.savedBy = post.savedBy.filter((id) => id.toString() !== userId);
          await post.save();
        }

        return res.json({ success: true, saved: false });
      } catch (error) {
        console.error("Unsave post error:", error);
        return res.status(500).json({ error: "Unsave Failed" });
      }
    });

    /**
     * @route   GET /api/profile/saved-posts
     * @desc    Get user's saved posts
     * @access  Private
     */
    router.get("/saved-posts", authenticateToken, async (req, res) => {
      try {
        const userId = req.user.userId;
        const { page = 1, limit = 10 } = req.query;

        const posts = await Post.find({ savedBy: userId })
          .skip((page - 1) * limit)
          .limit(parseInt(limit))
          .populate("author", "firstName lastName picture email");

        return res.json({ success: true, posts });
      } catch (error) {
        console.error("Get saved posts error:", error);
        return res.status(500).json({ error: "Fetch Failed" });
      }
    });

    /**
     * @route   POST /api/profile/posts/:postId/comments
     * @desc    Add comment to post
     * @access  Private
     */
    router.post("/posts/:postId/comments", authenticateToken, async (req, res) => {
      try {
        const userId = req.user.userId;
        const postId = req.params.postId;
        const { text } = req.body;

        if (!text || text.trim().length === 0) {
          return res.status(400).json({ error: "Comment cannot be empty" });
        }

        const post = await Post.findById(postId);
        if (!post) {
          return res.status(404).json({ error: "Post not found" });
        }

        if (!post.comments) post.comments = [];
        
        const comment = {
          _id: new Date().getTime().toString(),
          author: userId,
          text,
          createdAt: new Date(),
        };

        post.comments.push(comment);
        await post.save();

        const populatedPost = await post.populate("comments.author", "firstName lastName picture email");
        io.to(postId).emit("new_comment", { postId, comment: populatedPost.comments[populatedPost.comments.length - 1] });

        return res.json({ success: true, comment });
      } catch (error) {
        console.error("Add comment error:", error);
        return res.status(500).json({ error: "Comment Failed" });
      }
    });

    /**
     * @route   GET /api/profile/posts/:postId/comments
     * @desc    Get post comments
     * @access  Public
     */
    router.get("/posts/:postId/comments", async (req, res) => {
      try {
        const postId = req.params.postId;
        const { page = 1, limit = 20 } = req.query;

        const post = await Post.findById(postId).populate("comments.author", "firstName lastName picture email");
        if (!post) {
          return res.status(404).json({ error: "Post not found" });
        }

        const comments = post.comments || [];
        const paginated = comments.slice((page - 1) * limit, page * limit);

        return res.json({ success: true, comments: paginated, total: comments.length });
      } catch (error) {
        console.error("Get comments error:", error);
        return res.status(500).json({ error: "Fetch Failed" });
      }
    });

    /**
     * @route   DELETE /api/profile/posts/:postId/comments/:commentId
     * @desc    Delete a comment
     * @access  Private
     */
    router.delete("/posts/:postId/comments/:commentId", authenticateToken, async (req, res) => {
      try {
        const userId = req.user.userId;
        const { postId, commentId } = req.params;

        const post = await Post.findById(postId);
        if (!post) {
          return res.status(404).json({ error: "Post not found" });
        }

        const comment = post.comments.find((c) => c._id.toString() === commentId);
        if (!comment) {
          return res.status(404).json({ error: "Comment not found" });
        }

        if (comment.author.toString() !== userId && post.author.toString() !== userId) {
          return res.status(403).json({ error: "Unauthorized" });
        }

        post.comments = post.comments.filter((c) => c._id.toString() !== commentId);
        await post.save();

        return res.json({ success: true, message: "Comment deleted" });
      } catch (error) {
        console.error("Delete comment error:", error);
        return res.status(500).json({ error: "Delete Failed" });
      }
    });

    /**
     * @route   POST /api/profile/:userId/block
     * @desc    Block a user
     * @access  Private
     */
    router.post("/:userId/block", authenticateToken, async (req, res) => {
      try {
        const blockerId = req.user.userId;
        const blockedId = req.params.userId;

        if (blockerId === blockedId) {
          return res.status(400).json({ error: "Cannot block yourself" });
        }

        const user = await User.findById(blockerId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        if (!user.blockedUsers) user.blockedUsers = [];
        if (!user.blockedUsers.includes(blockedId)) {
          user.blockedUsers.push(blockedId);
          await user.save();
        }

        return res.json({ success: true, blocked: true });
      } catch (error) {
        console.error("Block user error:", error);
        return res.status(500).json({ error: "Block Failed" });
      }
    });

    /**
     * @route   POST /api/profile/:userId/unblock
     * @desc    Unblock a user
     * @access  Private
     */
    router.post("/:userId/unblock", authenticateToken, async (req, res) => {
      try {
        const blockerId = req.user.userId;
        const blockedId = req.params.userId;

        const user = await User.findById(blockerId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        if (user.blockedUsers) {
          user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== blockedId);
          await user.save();
        }

        return res.json({ success: true, blocked: false });
      } catch (error) {
        console.error("Unblock user error:", error);
        return res.status(500).json({ error: "Unblock Failed" });
      }
    });

    /**
     * @route   GET /api/profile/search
     * @desc    Search users by name or email
     * @access  Private
     */
    router.get("/search", authenticateToken, async (req, res) => {
      try {
        const { q } = req.query;
        if (!q || q.length < 2) {
          return res.json({ success: true, users: [] });
        }

        const users = await User.find({
          $or: [
            { firstName: { $regex: q, $options: "i" } },
            { lastName: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        })
          .select("firstName lastName picture email _id")
          .limit(20);

        return res.json({ success: true, users });
      } catch (error) {
        console.error("Search users error:", error);
        return res.status(500).json({ error: "Search Failed" });
      }
    });

module.exports = router;
