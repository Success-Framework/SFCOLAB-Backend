const express = require("express");
const multer = require("multer");
const path = require("path");
const { authenticateToken, optionalAuth } = require("../middleware/auth");
const { knowledgeValidation } = require("../middleware/validation");
const {
  Knowledge,
  KnowledgeComment,
  ResourceView,
  ResourceDownload,
  ResourceLike,
  User,
} = require("../models/schemas");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only PDF, DOC, DOCX, JPG, JPEG, gif, and PNG files are allowed"));
  },
});

// Using MongoDB via Mongoose models (see models/schemas.js)

/**
 * @route   GET /api/knowledge
 * @desc    Get all knowledge resources with pagination and filtering
 * @access  Public
 */
router.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};
    if (category) query.category = category;
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { title: regex },
        { titleDescription: regex },
        { contentPreview: regex },
        { "author.firstName": regex },
        { "author.lastName": regex },
        { tags: { $in: [regex] } },
      ];
    }

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [resources, totalResources] = await Promise.all([
      Knowledge.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      Knowledge.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalResources / parseInt(limit));

    res.json({
      resources,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResources,
        hasNextPage: skip + resources.length < totalResources,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get knowledge resources error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch knowledge resources",
    });
  }
});

/**
 * @route   POST /api/knowledge
 * @desc    Add new knowledge resource
 * @access  Private
 */
router.post(
  "/",
  authenticateToken,
  upload.single("fileUrl"), 
  knowledgeValidation.addResource,
  async (req, res) => {
    try {
      const { userId, firstName, lastName } = req.user;
      const {
        title,
        titleDescription,
        contentPreview,
        category,
        tags = [],
      } = req.body;

      const imageBuffer = req.file ? req.file.buffer : null;

      const resourceDoc = await Knowledge.create({
        title,
        titleDescription,
        contentPreview,
        category,
        fileUrl: null, 
        tags: Array.isArray(tags) ? tags : [],
        author: { id: userId, firstName, lastName },
        status: "active",
        views: 0,
        downloads: 0,
        likes: 0,
        image: imageBuffer, 
      });

      res.status(201).json({
        message: "Knowledge resource added successfully",
        resource: resourceDoc,
      });
    } catch (error) {
      console.error("Add knowledge resource error:", error);
      res.status(500).json({
        error: "Creation Failed",
        message: "Failed to add knowledge resource",
      });
    }
  }
);

/**
 * @route   GET /api/knowledge/bookmarks
 * @desc    Get bookmarks for authenticated user
 * @access  Private
 */
router.get("/bookmarks", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return only knowledge bookmarks for this route
    const knowledgeBookmarks = user.bookmarks?.knowledge || [];

    res.json({
      bookmarks: knowledgeBookmarks,
      total: knowledgeBookmarks.length,
    });
  } catch (error) {
    console.error("Get knowledge bookmarks error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch knowledge bookmarks",
    });
  }
});

/**
 * @route   GET /api/knowledge/categories
 * @desc    Get all available categories
 * @access  Public
 */
router.get("/categories", async (req, res) => {
  try {
    const categories = await Knowledge.distinct("category");
    res.json({ categories: categories.sort() });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch categories",
    });
  }
});

/**
 * @route   GET /api/knowledge/predefined-categories
 * @desc    Get predefined categories for dropdown
 * @access  Public
 */
router.get("/predefined-categories", (req, res) => {
  try {
    const predefinedCategories = [
      "Technology",
      "Business",
      "Marketing",
      "Design",
      "Development",
      "Finance",
      "Healthcare",
      "Education",
      "Research",
      "Innovation",
      "Startup",
      "Management",
      "Sales",
      "Operations",
      "Strategy",
      "Analytics",
      "Data Science",
      "AI/ML",
      "Blockchain",
      "Sustainability",
    ];

    res.json({
      categories: predefinedCategories,
    });
  } catch (error) {
    console.error("Get predefined categories error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch predefined categories",
    });
  }
});

/**
 * @route   GET /api/knowledge/available-tags
 * @desc    Get available tags for multiple selection
 * @access  Public
 */
router.get("/available-tags", async (req, res) => {
  try {
    const uniqueTags = await Knowledge.distinct("tags");
    res.json({ tags: (uniqueTags || []).sort() });
  } catch (error) {
    console.error("Get available tags error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch available tags",
    });
  }
});

/**
 * @route   POST /api/knowledge/upload
 * @desc    Upload file for knowledge resource
 * @access  Private
 */
router.post("/upload", authenticateToken, (req, res) => {
  try {
    // This is a placeholder for file upload functionality
    // In a real implementation, you would use multer or similar middleware
    // to handle file uploads and return the file URL

    const { fileName, fileType, fileSize } = req.body;

    // Validate file type and size
    const allowedTypes = [
      "pdf",
      "doc",
      "docx",
      "txt",
      "md",
      "jpg",
      "jpeg",
      "png",
      "gif",
      "mp4",
      "avi",
      "mov",
    ];
    const fileExtension = fileName.split(".").pop().toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      return res.status(400).json({
        error: "Invalid File Type",
        message:
          "File type not supported. Allowed types: " + allowedTypes.join(", "),
      });
    }

    const maxSize = 50 * 1024 * 1024; 
    if (fileSize > maxSize) {
      return res.status(400).json({
        error: "File Too Large",
        message: "File size must be less than 50MB",
      });
    }

    // Generate file URL (in real implementation, this would be the actual uploaded file URL)
    const fileUrl = `/uploads/knowledge/${Date.now()}-${fileName}`;

    res.json({
      message: "File upload successful",
      fileUrl,
      fileName,
      fileType: fileExtension,
      fileSize,
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({
      error: "Upload Failed",
      message: "Failed to upload file",
    });
  }
});

/**
 * @route   GET /api/knowledge/user/resources
 * @desc    Get user's knowledge resources
 * @access  Private
 */
router.get("/user/resources", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { "author.id": userId };
    const [resources, totalResources] = await Promise.all([
      Knowledge.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Knowledge.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalResources / parseInt(limit));

    res.json({
      resources,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResources,
        hasNextPage: skip + resources.length < totalResources,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get user resources error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch user resources",
    });
  }
});

/**
 * @route   GET /api/knowledge/:id
 * @desc    Get knowledge resource by ID with comments and dynamic view tracking
 * @access  Public
 */
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.userId : null;

    const resource = await Knowledge.findById(id);
    if (!resource) {
      return res.status(404).json({
        error: "Resource Not Found",
        message: "Knowledge resource not found",
      });
    }

    // Track unique views
    if (userId && userId.toString() !== resource.author.id.toString()) {
      const existingView = await ResourceView.findOne({
        resourceId: id,
        userId,
      });

      if (!existingView) {
        // Record new view
        await ResourceView.create({
          resourceId: id,
          userId,
          viewedAt: new Date(),
        });

        // Increment view count in Knowledge
        await Knowledge.findByIdAndUpdate(id, { $inc: { views: 1 } });
        resource.views += 1; // reflect update in returned response
      }
    }

    //  Get total number of views (even if user isn't logged in)
    const totalViews = await ResourceView.countDocuments({ resourceId: id });

    //  Fetch comments
    const comments = await KnowledgeComment.find({ resourceId: id }).sort({
      createdAt: -1,
    });

    res.json({
      resource: {
        ...resource.toObject(),
        views: totalViews, // ensure latest view count
        comments,
      },
    });
  } catch (error) {
    console.error("Get knowledge resource error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch knowledge resource",
    });
  }
});


/**
 * @route   PUT /api/knowledge/:id
 * @desc    Update knowledge resource (only author can update)
 * @access  Private
 */
router.put(
  "/:id",
  authenticateToken,
  knowledgeValidation.addResource,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.user;
      const {
        title,
        titleDescription,
        contentPreview,
        category,
        fileUrl,
        tags,
      } = req.body;

      const resource = await Knowledge.findById(id);
      if (!resource) {
        return res.status(404).json({
          error: "Resource Not Found",
          message: "Knowledge resource not found",
        });
      }

      if (resource.author.id.toString() !== userId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You can only update your own knowledge resources",
        });
      }

      resource.title = title;
      resource.titleDescription = titleDescription;
      resource.contentPreview = contentPreview;
      resource.category = category;
      if (fileUrl) resource.fileUrl = fileUrl;
      resource.tags = Array.isArray(tags) ? tags : [];
      await resource.save();

      res.json({
        message: "Knowledge resource updated successfully",
        resource,
      });
    } catch (error) {
      console.error("Update knowledge resource error:", error);
      res.status(500).json({
        error: "Update Failed",
        message: "Failed to update knowledge resource",
      });
    }
  }
);

/**
 * @route   DELETE /api/knowledge/:id
 * @desc    Delete knowledge resource (only author can delete)
 * @access  Private
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const resource = await Knowledge.findById(id);
    if (!resource) {
      return res.status(404).json({
        error: "Resource Not Found",
        message: "Knowledge resource not found",
      });
    }

    if (resource.author.id.toString() !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only delete your own knowledge resources",
      });
    }

    await Knowledge.findByIdAndDelete(id);
    await Promise.all([
      KnowledgeComment.deleteMany({ resourceId: id }),
      ResourceView.deleteMany({ resourceId: id }),
      ResourceDownload.deleteMany({ resourceId: id }),
      ResourceLike.deleteMany({ resourceId: id }),
    ]);

    res.json({ message: "Knowledge resource deleted successfully" });
  } catch (error) {
    console.error("Delete knowledge resource error:", error);
    res.status(500).json({
      error: "Deletion Failed",
      message: "Failed to delete knowledge resource",
    });
  }
});

/**
 * @route   POST /api/knowledge/:id/comments
 * @desc    Add comment to knowledge resource
 * @access  Private
 */
router.post("/:id/comments", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, firstName, lastName } = req.user;
    const { content } = req.body;

    const resource = await Knowledge.findById(id);
    if (!resource) {
      return res.status(404).json({
        error: "Resource Not Found",
        message: "Knowledge resource not found",
      });
    }

    const comment = await KnowledgeComment.create({
      resourceId: id,
      content,
      author: { id: userId, firstName, lastName },
    });

    res.status(201).json({ message: "Comment added successfully", comment });
  } catch (error) {
    console.error("Add comment error:", error);
    res
      .status(500)
      .json({ error: "Comment Failed", message: "Failed to add comment" });
  }
});

/**
 * @route   GET /api/knowledge/:id/comments
 * @desc    Get comments for a knowledge resource
 * @access  Public
 */
router.get("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const resource = await Knowledge.findById(id);
    if (!resource) {
      return res.status(404).json({
        error: "Resource Not Found",
        message: "Knowledge resource not found",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [comments, totalComments] = await Promise.all([
      KnowledgeComment.find({ resourceId: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      KnowledgeComment.countDocuments({ resourceId: id }),
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
 * @route   POST /api/knowledge/:id/download
 * @desc    Track resource download
 * @access  Private
 */
router.post("/:id/download", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const resource = await Knowledge.findById(id);
    if (!resource) {
      return res.status(404).json({
        error: "Resource Not Found",
        message: "Knowledge resource not found",
      });
    }

    await Knowledge.findByIdAndUpdate(id, { $inc: { downloads: 1 } });
    const existingDownload = await ResourceDownload.findOne({
      resourceId: id,
      userId,
    });
    if (!existingDownload) {
      await ResourceDownload.create({
        resourceId: id,
        userId,
        downloadedAt: new Date(),
      });
    }

    const updated = await Knowledge.findById(id).select("downloads");
    res.json({
      message: "Download tracked successfully",
      downloads: updated.downloads,
    });
  } catch (error) {
    console.error("Track download error:", error);
    res
      .status(500)
      .json({ error: "Tracking Failed", message: "Failed to track download" });
  }
});

/**
 * @route   POST /api/knowledge/:id/like
 * @desc    Like/unlike knowledge resource
 * @access  Private
 */
router.post("/:id/like", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const resource = await Knowledge.findById(id);
    if (!resource) {
      return res.status(404).json({
        error: "Resource Not Found",
        message: "Knowledge resource not found",
      });
    }

    const existingLike = await ResourceLike.findOne({ resourceId: id, userId });
    if (existingLike) {
      await ResourceLike.deleteOne({ _id: existingLike._id });
      await Knowledge.findByIdAndUpdate(id, { $inc: { likes: -1 } });
      const updated = await Knowledge.findById(id).select("likes");
      return res.json({
        message: "Resource unliked successfully",
        liked: false,
        likes: updated.likes,
      });
    } else {
      await ResourceLike.create({
        resourceId: id,
        userId,
        likedAt: new Date(),
      });
      await Knowledge.findByIdAndUpdate(id, { $inc: { likes: 1 } });
      const updated = await Knowledge.findById(id).select("likes");
      return res.json({
        message: "Resource liked successfully",
        liked: true,
        likes: updated.likes,
      });
    }
  } catch (error) {
    console.error("Like/unlike error:", error);
    res.status(500).json({
      error: "Action Failed",
      message: "Failed to like/unlike resource",
    });
  }
});

/**
 * @route   GET /api/knowledge/:id/likes
 * @desc    Get users who liked a resource
 * @access  Public
 */
router.get("/:id/likes", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const resource = await Knowledge.findById(id);
    if (!resource) {
      return res.status(404).json({
        error: "Resource Not Found",
        message: "Knowledge resource not found",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [likes, totalLikes] = await Promise.all([
      ResourceLike.find({ resourceId: id })
        .sort({ likedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ResourceLike.countDocuments({ resourceId: id }),
    ]);
    const totalPages = Math.ceil(totalLikes / parseInt(limit));

    res.json({
      likes,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalLikes,
        hasNextPage: skip + likes.length < totalLikes,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get likes error:", error);
    res
      .status(500)
      .json({ error: "Fetch Failed", message: "Failed to fetch likes" });
  }
});

/**
 * @route   POST /api/knowledge/:id/bookmark
 * @desc    Toggle bookmark for knowledge
 * @access  Private
 */
router.post("/:id/bookmark", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params; // Knowledge ID
    const { userId } = req.user;

    const knowledge = await Knowledge.findById(id);
    if (!knowledge) {
      return res.status(404).json({ error: "Knowledge not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Ensure the bookmarks object exists
    if (!user.bookmarks) user.bookmarks = { knowledge: [] };
    if (!Array.isArray(user.bookmarks.knowledge)) user.bookmarks.knowledge = [];

    // Check if knowledge is already bookmarked
    const existingIndex = user.bookmarks.knowledge.findIndex(
      (b) => b.knowledgeId?.toString() === id
    );

    if (existingIndex !== -1) {
      // Remove bookmark
      user.bookmarks.knowledge.splice(existingIndex, 1);
      await user.save();

      return res.json({
        message: "Bookmark removed successfully",
        bookmarked: false,
      });
    } else {
      // Add new bookmark
      const contentPreview =
        knowledge.contentPreview?.substring(0, 120) +
        (knowledge.contentPreview?.length > 120 ? "..." : "");

      const newBookmark = {
        knowledgeId: knowledge._id,
        title: knowledge.title,
        contentPreview,
        url: `/knowledge-details?id=${knowledge._id}`,
      };

      user.bookmarks.knowledge.push(newBookmark);
      await user.save();

      return res.json({
        message: "Knowledge bookmarked successfully",
        bookmarked: true,
      });
    }
  } catch (error) {
    console.error("Bookmark toggle error:", error);
    res.status(500).json({
      error: "Bookmark Failed",
      message: "Failed to toggle bookmark",
    });
  }
});

module.exports = router;
