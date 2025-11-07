const mongoose = require("mongoose");

/* ========================== USER SCHEMA (UPDATED) ========================== */
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
    status: { type: String, enum: ["active", "deleted"], default: "active" },

    profile: {
      picture: { type: String, default: null },
      bio: { type: String, default: null },
      company: { type: String, default: null },
      socialLinks: { type: Map, of: String, default: {} },
    },

    preferences: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      privacy: { type: String, enum: ["public", "private"], default: "public" },
      language: { type: String, default: "en" },
      timezone: { type: String, default: "UTC" },
      theme: { type: String, enum: ["light", "dark"], default: "light" },
    },

    notificationSettings: {
      newComments: { type: Boolean, default: true },
      newLikes: { type: Boolean, default: true },
      newSuggestions: { type: Boolean, default: true },
      joinRequests: { type: Boolean, default: true },
      approvals: { type: Boolean, default: true },
      storyViews: { type: Boolean, default: true },
      postEngagement: { type: Boolean, default: true },
      emailDigest: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        default: "weekly",
      },
      quietHours: {
        enabled: { type: Boolean, default: false },
        start: { type: String, default: "22:00" },
        end: { type: String, default: "08:00" },
      },
    },

    bookmarks: {
      ideas: [
        {
          ideaId: { type: mongoose.Schema.Types.ObjectId, ref: "Idea" },
          title: String,
          contentPreview: String,
          url: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
      knowledge: [
        {
          knowledgeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Knowledge",
          },
          title: String,
          contentPreview: String,
          url: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
      startup: [
        {
          startupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Startup",
          },
          title: String,
          contentPreview: String,
          url: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },
  },
  { timestamps: true }
);

/* ========================== KNOWLEDGE SCHEMA ========================== */
const knowledgeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    titleDescription: { type: String, required: true },
    contentPreview: { type: String, required: true },
    category: { type: String, required: true },
    fileUrl: { type: String, default: null },
    tags: [{ type: String }],
    author: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      firstName: String,
      lastName: String,
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    image: Buffer,
  },
  { timestamps: true }
);

/* ========================== KNOWLEDGE COMMENTS SCHEMA ========================== */
const knowledgeCommentSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Knowledge",
      required: true,
    },
    content: { type: String, required: true },
    author: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      firstName: String,
      lastName: String,
    },
  },
  { timestamps: true }
);

/* ========================== RESOURCE VIEWS SCHEMA ========================== */
const resourceViewSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Knowledge",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/* ========================== RESOURCE DOWNLOADS SCHEMA ========================== */
const resourceDownloadSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Knowledge",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    downloadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/* ========================== RESOURCE LIKES SCHEMA ========================== */
const resourceLikeSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Knowledge",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/* ========================== IDEAS SCHEMA ========================== */
const teamMemberSchema = new mongoose.Schema({
  name: { type: String },
  position: { type: String },
  skills: [{ type: String }],
});

const ideaSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    projectDetails: { type: String, required: true },
    industry: { type: String, required: true },
    stage: { type: String, required: true },
    teamMembers: [teamMemberSchema],
    tags: [{ type: String }],
    creator: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      firstName: String,
      lastName: String,
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* ========================== IDEA COMMENTS SCHEMA ========================== */
const ideaCommentSchema = new mongoose.Schema(
  {
    ideaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Idea",
      required: true,
    },
    content: { type: String, required: true },
    author: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      firstName: String,
      lastName: String,
    },
  },
  { timestamps: true }
);

/* ========================== SUGGESTIONS SCHEMA ========================== */
const suggestionSchema = new mongoose.Schema(
  {
    ideaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Idea",
      required: true,
    },
    content: { type: String, required: true },
    author: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      firstName: String,
      lastName: String,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

/* ========================== STARTUP SCHEMA ========================== */
const startupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    industry: { type: String, required: true },
    location: { type: String },
    description: { type: String },
    stage: {
      type: String,
      enum: ["idea", "early", "growth", "scale"],
      default: "idea",
    },
    logo: {
      data: Buffer,
      contentType: String,
    },
    banner: {
      data: Buffer,
      contentType: String,
    },
    positions: { type: Number, default: 0 },
    roles: {
      type: [
        {
          title: { type: String, required: true, trim: true },
          roleType: { type: String, required: true, trim: true },
        },
      ],
      default: [],
    },
    creator: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      firstName: String,
      lastName: String,
    },
    status: { type: String, enum: ["active"], default: "active" },
    members: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        firstName: String,
        lastName: String,
        role: { type: String, default: "member" },
        joinedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
      },
    ],
    memberCount: { type: Number, default: 1 },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* ========================== STARTUP MEMBER SCHEMA ========================== */
const startupMemberSchema = new mongoose.Schema(
  {
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    firstName: String,
    lastName: String,
    role: { type: String, default: "member" },
    joinedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* ========================== JOIN REQUEST SCHEMA ========================== */
const joinRequestSchema = new mongoose.Schema(
  {
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
    },
    startupName: { type: String },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    firstName: String,
    lastName: String,
    message: { type: String },
    role: { type: String, default: "member" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

/* ========================== REFRESH TOKENS SCHEMA ========================== */
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/* ========================== NOTIFICATION SCHEMA ========================== */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, default: "system" },
    title: { type: String },
    message: { type: String },
    data: { type: Object, default: {} },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* ========================== PROFILE: STORIES & POSTS ========================== */
const storySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    author: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      firstName: String,
      lastName: String,
    },
    mediaUrl: { type: String, required: true },
    caption: { type: String, default: null },
    type: { type: String, enum: ["image", "video"], default: "image" },
    views: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

const storyViewSchema = new mongoose.Schema(
  {
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    author: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      firstName: String,
      lastName: String,
    },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ["professional", "social", "image", "video"],
      default: "professional",
    },
    media: [
      {
        data: Buffer,
        contentType: String,
        fileName: String,
      },
    ],
    tags: [{ type: String }],
    likes: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const postLikeSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const postCommentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    content: { type: String, required: true },
    author: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      firstName: String,
      lastName: String,
    },
  },
  { timestamps: true }
);

const connectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    connectedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["connected", "pending", "blocked"],
      default: "connected",
    },
  },
  { timestamps: true }
);

/* ========================== EXPORT MODELS ========================== */
module.exports = {
  User: mongoose.model("User", userSchema),
  Knowledge: mongoose.model("Knowledge", knowledgeSchema),
  KnowledgeComment: mongoose.model("KnowledgeComment", knowledgeCommentSchema),
  ResourceView: mongoose.model("ResourceView", resourceViewSchema),
  ResourceDownload: mongoose.model("ResourceDownload", resourceDownloadSchema),
  ResourceLike: mongoose.model("ResourceLike", resourceLikeSchema),
  Idea: mongoose.model("Idea", ideaSchema),
  IdeaComment: mongoose.model("IdeaComment", ideaCommentSchema),
  Suggestion: mongoose.model("Suggestion", suggestionSchema),
  Startup: mongoose.model("Startup", startupSchema),
  StartupMember: mongoose.model("StartupMember", startupMemberSchema),
  JoinRequest: mongoose.model("JoinRequest", joinRequestSchema),
  RefreshToken: mongoose.model("RefreshToken", refreshTokenSchema),
  Notification: mongoose.model("Notification", notificationSchema),
  Story: mongoose.model("Story", storySchema),
  StoryView: mongoose.model("StoryView", storyViewSchema),
  Post: mongoose.model("Post", postSchema),
  PostLike: mongoose.model("PostLike", postLikeSchema),
  PostComment: mongoose.model("PostComment", postCommentSchema),
  Connection: mongoose.model("Connection", connectionSchema),
};
