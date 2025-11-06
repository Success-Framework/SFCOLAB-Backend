const express = require("express");
const { authenticateToken, optionalAuth } = require("../middleware/auth");
const { ideationValidation } = require("../middleware/validation");
const { Idea, IdeaComment, Suggestion, User } = require("../models/schemas");

const router = express.Router();

/**
 * @route   GET /api/ideation
 * @desc    Get all ideas with pagination and filtering
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
    if (category) query.industry = category; // mapping: category -> industry if needed
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { title: regex },
        { description: regex },
        { projectDetails: regex },
        { industry: regex },
        { stage: regex },
        { "creator.firstName": regex },
        { "creator.lastName": regex },
        { tags: { $in: [regex] } },
        { "teamMembers.name": regex },
        { "teamMembers.position": regex },
        { "teamMembers.skills": { $in: [regex] } },
      ];
    }

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [ideas, totalIdeas] = await Promise.all([
      Idea.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      Idea.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalIdeas / parseInt(limit));

    res.json({
      ideas,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalIdeas,
        hasNextPage: skip + ideas.length < totalIdeas,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get ideas error:", error);
    res
      .status(500)
      .json({ error: "Fetch Failed", message: "Failed to fetch ideas" });
  }
});

/**
 * @route   POST /api/ideation
 * @desc    Create a new idea
 * @access  Private
 */
router.post(
  "/",
  authenticateToken,
  ideationValidation.createIdea,
  async (req, res) => {
    try {
      const { userId, firstName, lastName } = req.user;
      const {
        title,
        description,
        projectDetails,
        industry,
        stage,
        teamMembers = [],
        tags = [],
      } = req.body;

      const ideaDoc = await Idea.create({
        title,
        description,
        projectDetails,
        industry,
        stage,
        teamMembers: Array.isArray(teamMembers) ? teamMembers.slice(0, 3) : [],
        tags: Array.isArray(tags) ? tags : [],
        creator: { id: userId, firstName, lastName },
        status: "active",
        likes: 0,
        views: 0,
      });

      res
        .status(201)
        .json({ message: "Idea created successfully", idea: ideaDoc });
    } catch (error) {
      console.error("Create idea error:", error);
      res
        .status(500)
        .json({ error: "Creation Failed", message: "Failed to create idea" });
    }
  }
);

/**
 * @route   GET /api/ideation/bookmarks
 * @desc    Get bookmarks for authenticated user (ideas only)
 * @access  Private
 */
router.get("/bookmarks", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return only ideas bookmarks for this route
    const ideaBookmarks = user.bookmarks?.ideas || [];

    res.json({
      bookmarks: ideaBookmarks,
      total: ideaBookmarks.length,
    });
  } catch (error) {
    console.error("Get idea bookmarks error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch idea bookmarks",
    });
  }
});

/**
 * @route   GET /api/ideation/:id
 * @desc    Get idea by ID with comments
 * @access  Public
 */
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user || {};

    const idea = await Idea.findById(id);
    if (!idea) {
      return res
        .status(404)
        .json({ error: "Idea Not Found", message: "Idea not found" });
    }

    if (userId && userId !== idea.creator.id.toString()) {
      await Idea.findByIdAndUpdate(id, { $inc: { views: 1 } });
    }

    const ideaComments = await IdeaComment.find({ ideaId: id }).sort({
      createdAt: -1,
    });

    res.json({
      idea: { ...idea.toObject(), comments: ideaComments },
    });
  } catch (error) {
    console.error("Get idea error:", error);
    res
      .status(500)
      .json({ error: "Fetch Failed", message: "Failed to fetch idea" });
  }
});

/**
 * @route   PUT /api/ideation/:id
 * @desc    Update idea (only creator can update)
 * @access  Private
 */
router.put(
  "/:id",
  authenticateToken,
  ideationValidation.createIdea,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.user;
      const {
        title,
        description,
        projectDetails,
        industry,
        stage,
        teamMembers,
        tags,
      } = req.body;

      const idea = await Idea.findById(id);
      if (!idea)
        return res
          .status(404)
          .json({ error: "Idea Not Found", message: "Idea not found" });

      if (idea.creator.id.toString() !== userId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You can only update your own ideas",
        });
      }

      idea.title = title;
      idea.description = description;
      idea.projectDetails = projectDetails;
      idea.industry = industry;
      idea.stage = stage;
      idea.teamMembers = Array.isArray(teamMembers)
        ? teamMembers.slice(0, 3)
        : [];
      idea.tags = Array.isArray(tags) ? tags : [];
      await idea.save();

      res.json({ message: "Idea updated successfully", idea });
    } catch (error) {
      console.error("Update idea error:", error);
      res
        .status(500)
        .json({ error: "Update Failed", message: "Failed to update idea" });
    }
  }
);

/**
 * @route   DELETE /api/ideation/:id
 * @desc    Delete idea (only creator can delete)
 * @access  Private
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const idea = await Idea.findById(id);
    if (!idea)
      return res
        .status(404)
        .json({ error: "Idea Not Found", message: "Idea not found" });
    if (idea.creator.id.toString() !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only delete your own ideas",
      });
    }

    await Idea.findByIdAndDelete(id);
    await IdeaComment.deleteMany({ ideaId: id });

    res.json({ message: "Idea deleted successfully" });
  } catch (error) {
    console.error("Delete idea error:", error);
    res
      .status(500)
      .json({ error: "Deletion Failed", message: "Failed to delete idea" });
  }
});

/**
 * @route   POST /api/ideation/:id/comments
 * @desc    Add comment to idea
 * @access  Private
 */
router.post(
  "/:id/comments",
  authenticateToken,
  ideationValidation.createComment,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, firstName, lastName } = req.user;
      const { content } = req.body;

      const idea = await Idea.findById(id);
      if (!idea)
        return res
          .status(404)
          .json({ error: "Idea Not Found", message: "Idea not found" });

      const comment = await IdeaComment.create({
        ideaId: id,
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
  }
);

/**
 * @route   GET /api/ideation/:id/comments
 * @desc    Get comments for an idea
 * @access  Public
 */
router.get("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const idea = await Idea.findById(id);
    if (!idea)
      return res
        .status(404)
        .json({ error: "Idea Not Found", message: "Idea not found" });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [comments, totalComments] = await Promise.all([
      IdeaComment.find({ ideaId: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      IdeaComment.countDocuments({ ideaId: id }),
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
 * @route   POST /api/ideation/:id/suggestions
 * @desc    Submit suggestion for idea
 * @access  Private
 */
router.post(
  "/:id/suggestions",
  authenticateToken,
  ideationValidation.createComment,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, firstName, lastName } = req.user;
      const { content } = req.body;

      const idea = await Idea.findById(id);
      if (!idea)
        return res
          .status(404)
          .json({ error: "Idea Not Found", message: "Idea not found" });
      if (idea.creator.id.toString() === userId) {
        return res.status(400).json({
          error: "Invalid Action",
          message: "You cannot suggest improvements to your own idea",
        });
      }

      const suggestion = await Suggestion.create({
        ideaId: id,
        content,
        author: { id: userId, firstName, lastName },
        status: "pending",
      });

      res
        .status(201)
        .json({ message: "Suggestion submitted successfully", suggestion });
    } catch (error) {
      console.error("Submit suggestion error:", error);
      res.status(500).json({
        error: "Suggestion Failed",
        message: "Failed to submit suggestion",
      });
    }
  }
);

/**
 * @route   GET /api/ideation/:id/suggestions
 * @desc    Get suggestions for an idea (only creator can see)
 * @access  Private
 */
router.get("/:id/suggestions", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const idea = await Idea.findById(id);
    if (!idea)
      return res
        .status(404)
        .json({ error: "Idea Not Found", message: "Idea not found" });
    if (idea.creator.id.toString() !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only the idea creator can view suggestions",
      });
    }

    const ideaSuggestions = await Suggestion.find({ ideaId: id }).sort({
      createdAt: -1,
    });
    res.json({ suggestions: ideaSuggestions });
  } catch (error) {
    console.error("Get suggestions error:", error);
    res
      .status(500)
      .json({ error: "Fetch Failed", message: "Failed to fetch suggestions" });
  }
});

/**
 * @route   PUT /api/ideation/:id/suggestions/:suggestionId
 * @desc    Update suggestion status (accept/reject)
 * @access  Private
 */
router.put(
  "/:id/suggestions/:suggestionId",
  authenticateToken,
  async (req, res) => {
    try {
      const { id, suggestionId } = req.params;
      const { userId } = req.user;
      const { status } = req.body;

      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({
          error: "Invalid Status",
          message: 'Status must be either "accepted" or "rejected"',
        });
      }

      const idea = await Idea.findById(id);
      if (!idea)
        return res
          .status(404)
          .json({ error: "Idea Not Found", message: "Idea not found" });
      if (idea.creator.id.toString() !== userId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Only the idea creator can update suggestion status",
        });
      }

      const suggestion = await Suggestion.findOne({
        _id: suggestionId,
        ideaId: id,
      });
      if (!suggestion)
        return res.status(404).json({
          error: "Suggestion Not Found",
          message: "Suggestion not found",
        });

      suggestion.status = status;
      await suggestion.save();

      // TODO: Send notification to suggestion author

      res.json({ message: `Suggestion ${status} successfully`, suggestion });
    } catch (error) {
      console.error("Update suggestion error:", error);
      res.status(500).json({
        error: "Update Failed",
        message: "Failed to update suggestion status",
      });
    }
  }
);

/**
 * @route   GET /api/ideation/industries
 * @desc    Get predefined industries for dropdown
 * @access  Public
 */
router.get("/industries", (req, res) => {
  try {
    const industries = [
      "Technology",
      "Healthcare",
      "Finance",
      "Education",
      "E-commerce",
      "Manufacturing",
      "Real Estate",
      "Transportation",
      "Energy",
      "Agriculture",
      "Entertainment",
      "Food & Beverage",
      "Fashion",
      "Sports",
      "Travel & Tourism",
      "Automotive",
      "Aerospace",
      "Telecommunications",
      "Media & Advertising",
      "Consulting",
      "Legal Services",
      "Construction",
      "Retail",
      "Logistics",
      "Pharmaceuticals",
      "Biotechnology",
      "Renewable Energy",
      "Cybersecurity",
      "Artificial Intelligence",
      "Blockchain",
      "Gaming",
      "Social Media",
      "SaaS",
      "IoT",
      "Robotics",
    ];

    res.json({
      industries: industries.sort(),
    });
  } catch (error) {
    console.error("Get industries error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch industries",
    });
  }
});

/**
 * @route   GET /api/ideation/stages
 * @desc    Get predefined stages for dropdown
 * @access  Public
 */
router.get("/stages", (req, res) => {
  try {
    const stages = [
      "Idea",
      "Concept",
      "Prototype",
      "MVP",
      "Beta",
      "Launch",
      "Growth",
      "Scale",
      "Mature",
      "Exit",
    ];

    res.json({
      stages: stages,
    });
  } catch (error) {
    console.error("Get stages error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch stages",
    });
  }
});

/**
 * @route   GET /api/ideation/available-tags
 * @desc    Get available tags for ideation
 * @access  Public
 */
router.get("/available-tags", async (req, res) => {
  try {
    const tags = await Idea.distinct("tags");
    res.json({ tags: (tags || []).sort() });
  } catch (error) {
    console.error("Get available tags error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch available tags",
    });
  }
});

/**
 * @route   GET /api/ideation/skills
 * @desc    Get predefined skills for team members
 * @access  Public
 */
router.get("/skills", (req, res) => {
  try {
    const skills = [
      "Frontend Development",
      "Backend Development",
      "Full Stack Development",
      "Mobile Development",
      "UI/UX Design",
      "Graphic Design",
      "Product Management",
      "Project Management",
      "Marketing",
      "Sales",
      "Business Development",
      "Data Science",
      "Machine Learning",
      "DevOps",
      "Cloud Computing",
      "Cybersecurity",
      "Blockchain",
      "AI/ML",
      "Data Analytics",
      "Quality Assurance",
      "Content Writing",
      "Digital Marketing",
      "SEO",
      "Social Media",
      "Video Production",
      "Photography",
      "Finance",
      "Accounting",
      "Legal",
      "Operations",
      "Customer Success",
      "Research",
      "Strategy",
      "Consulting",
      "Training",
      "Support",
      "HR",
      "Recruiting",
    ];

    res.json({
      skills: skills.sort(),
    });
  } catch (error) {
    console.error("Get skills error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch skills",
    });
  }
});

/**
 * @route   POST /api/ideation/:id/like
 * @desc    Like or unlike an idea
 * @access  Private
 */
router.post("/:id/like", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const idea = await Idea.findById(id);
    if (!idea) {
      return res.status(404).json({ error: "Idea not found" });
    }

    // Check if user already liked the idea
    const likedIndex = idea.likedBy?.indexOf(userId);

    if (likedIndex !== -1 && likedIndex !== undefined) {
      // Unlike it
      idea.likedBy.splice(likedIndex, 1);
      idea.likes = Math.max(idea.likes - 1, 0);
    } else {
      // Like it
      if (!idea.likedBy) idea.likedBy = [];
      idea.likedBy.push(userId);
      idea.likes = (idea.likes || 0) + 1;
    }

    await idea.save();

    res.json({
      message:
        likedIndex === -1
          ? "Idea liked successfully"
          : "Idea unliked successfully",
      likes: idea.likes,
      likedByUser: likedIndex === -1,
    });
  } catch (error) {
    console.error("Error liking idea:", error);
    res.status(500).json({ error: "Like Failed", message: error.message });
  }
});

/**
 * @route   POST /api/ideation/:id/bookmark
 * @desc    Toggle bookmark for an idea
 * @access  Private
 */
router.post("/:id/bookmark", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params; // Idea ID
    const { userId } = req.user;

    const idea = await Idea.findById(id);
    if (!idea) {
      return res.status(404).json({ error: "Idea not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Ensure the bookmarks object exists
    if (!user.bookmarks) user.bookmarks = { ideas: [], knowledge: [] };
    if (!Array.isArray(user.bookmarks.ideas)) user.bookmarks.ideas = [];

    // Check if idea is already bookmarked
    const existingIndex = user.bookmarks.ideas.findIndex(
      (b) => b.ideaId?.toString() === id
    );

    if (existingIndex !== -1) {
      // Remove bookmark
      user.bookmarks.ideas.splice(existingIndex, 1);
      await user.save();

      return res.json({
        message: "Bookmark removed successfully",
        bookmarked: false,
      });
    } else {
      // Add new bookmark
      const contentPreview =
        idea.description?.substring(0, 120) +
        (idea.description?.length > 120 ? "..." : "");

      const newBookmark = {
        ideaId: idea._id,
        title: idea.title,
        contentPreview,
        url: `/ideation-details?id=${idea._id}`,
        createdAt: new Date(),
      };

      user.bookmarks.ideas.push(newBookmark);
      await user.save();

      return res.json({
        message: "Idea bookmarked successfully",
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
