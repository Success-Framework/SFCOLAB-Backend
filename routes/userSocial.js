const express = require("express");
const mongoose = require("mongoose");
const { authenticateToken } = require("../middleware/auth");
const { User, Connection } = require("../models/schemas");

const router = express.Router();

/**
 * @route   POST /api/user-social/create
 * @desc    Create / ensure user social profile exists (idempotent; uses current user)
 * @access  Private
 */
router.post("/create", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select(
      "firstName lastName profile _id"
    );
    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: "User not found",
      });
    }
    const [followersCount, followingCount] = await Promise.all([
      Connection.countDocuments({ connectedUserId: userId, status: "connected" }),
      Connection.countDocuments({ userId, status: "connected" }),
    ]);
    const social = {
      userId: user._id,
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      profile: user.profile,
      followersCount,
      followingCount,
    };
    res.status(201).json({
      message: "User social profile ready",
      social,
    });
  } catch (error) {
    console.error("Create user social profile error:", error);
    res.status(500).json({
      error: "Creation Failed",
      message: "Failed to create user social profile",
    });
  }
});

/**
 * @route   GET /api/user-social/suggestions
 * @desc    Get user suggestions (users not being followed)
 * @access  Private
 */
router.get("/suggestions", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 5 } = req.query;
    const following = await Connection.find({
      userId,
      status: "connected",
    }).select("connectedUserId");
    const followingIds = following.map((c) => c.connectedUserId.toString());
    followingIds.push(userId);
    const ObjectId = mongoose.Types.ObjectId || mongoose.Schema.Types.ObjectId;
    const suggestions = await User.find({
      _id: { $nin: followingIds.map((id) => new ObjectId(id)) },
    })
      .select("_id firstName lastName profile.picture")
      .limit(parseInt(limit, 10));
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
 * @route   POST /api/user-social/:userId/follow
 * @desc    Follow a user
 * @access  Private
 */
router.post("/:userId/follow", authenticateToken, async (req, res) => {
  try {
    const actorId = req.user.userId;
    const targetId = req.params.userId;
    if (actorId.toString() === targetId.toString()) {
      return res.status(400).json({
        error: "Invalid Action",
        message: "You cannot follow yourself",
      });
    }
    const existing = await Connection.findOne({
      userId: actorId,
      connectedUserId: targetId,
    });
    if (existing) {
      if (existing.status === "connected") {
        return res.status(400).json({
          error: "Already Following",
          message: "You are already following this user",
        });
      }
      existing.status = "connected";
      await existing.save();
    } else {
      await Connection.create({
        userId: actorId,
        connectedUserId: targetId,
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
 * @route   POST /api/user-social/:userId/unfollow
 * @desc    Unfollow a user
 * @access  Private
 */
router.post("/:userId/unfollow", authenticateToken, async (req, res) => {
  try {
    const actorId = req.user.userId;
    const targetId = req.params.userId;
    if (actorId.toString() === targetId.toString()) {
      return res.status(400).json({
        error: "Invalid Action",
        message: "You cannot unfollow yourself",
      });
    }
    const result = await Connection.deleteOne({
      userId: actorId,
      connectedUserId: targetId,
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
 * @route   GET /api/user-social/:userId
 * @desc    Get user social profile (followers/following counts, profile info)
 * @access  Private
 */
router.get("/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select(
      "firstName lastName profile _id"
    );
    if (!user) {
      return res.status(404).json({
        error: "User social profile not found",
        message: "User social profile not found",
      });
    }
    const [followersCount, followingCount] = await Promise.all([
      Connection.countDocuments({ connectedUserId: userId, status: "connected" }),
      Connection.countDocuments({ userId, status: "connected" }),
    ]);
    const social = {
      userId: user._id,
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      profile: user.profile,
      followersCount,
      followingCount,
    };
    res.json({ social });
  } catch (error) {
    console.error("Get user social profile error:", error);
    res.status(500).json({
      error: "Fetch Failed",
      message: "Failed to fetch user social profile",
    });
  }
});

module.exports = router;
