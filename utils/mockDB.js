// Mock in-memory database for development without MongoDB
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let mockUsers = [];
let mockRefreshTokens = [];
let mockPosts = [];
let mockConnections = [];
let mockStories = [];
let mockComments = [];
let mockLikes = [];

// Hash a test password for demo users
const hashPassword = (password) => bcrypt.hashSync(password, 10);

// Try to load users from the JSON file
try {
  const dbPath = path.join(__dirname, '../data/database.json');
  if (fs.existsSync(dbPath)) {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    mockUsers = data.users || [];
    console.log(`✅ Loaded ${mockUsers.length} users from mock database`);
  }
} catch (err) {
  console.warn('Could not load mock database from file:', err.message);
}

// Add test user for demo (password: "password123")
const testUserExists = mockUsers.find(u => u.email === 'test.user@example.com');
if (!testUserExists) {
  mockUsers.push({
    id: 'test-user-demo',
    _id: 'test-user-demo',
    firstName: 'Test',
    lastName: 'User',
    email: 'test.user@example.com',
    password: hashPassword('password123'),
    isEmailVerified: true,
    lastLogin: null,
    status: 'active',
    profile: { picture: null, bio: 'Test account for development', company: null, socialLinks: {} },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  console.log(`✅ Added test user: test.user@example.com / password123`);
}

const mockAuthDB = {
  // Find user by email
  findUserByEmail: (email) => {
    return mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  // Find user by ID
  findUserById: (id) => {
    return mockUsers.find(u => u.id === id || u._id === id);
  },

  // Create a new user
  createUser: (userData) => {
    const newUser = {
      id: `user_${Date.now()}`,
      _id: `user_${Date.now()}`,
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockUsers.push(newUser);
    return newUser;
  },

  // Update user
  updateUser: (id, updates) => {
    const user = mockAuthDB.findUserById(id);
    if (user) {
      Object.assign(user, updates, { updatedAt: new Date().toISOString() });
      return user;
    }
    return null;
  },

  // Store refresh token
  createRefreshToken: (userId, token) => {
    mockRefreshTokens.push({
      userId,
      token,
      createdAt: new Date()
    });
  },

  // Verify refresh token
  findRefreshToken: (userId, token) => {
    return mockRefreshTokens.find(rt => rt.userId === userId && rt.token === token);
  },

  // ===== POST OPERATIONS =====
  createPost: (postData) => {
    const newPost = {
      _id: `post_${Date.now()}`,
      id: `post_${Date.now()}`,
      ...postData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockPosts.push(newPost);
    return newPost;
  },

  findPostById: (postId) => {
    return mockPosts.find(p => p._id === postId || p.id === postId);
  },

  findPostsByUserId: (userId, limit = 10, skip = 0) => {
    return mockPosts.filter(p => p.userId === userId).slice(skip, skip + limit);
  },

  updatePost: (postId, updates) => {
    const post = mockAuthDB.findPostById(postId);
    if (post) {
      Object.assign(post, updates, { updatedAt: new Date() });
      return post;
    }
    return null;
  },

  deletePost: (postId) => {
    const index = mockPosts.findIndex(p => p._id === postId || p.id === postId);
    if (index > -1) {
      mockPosts.splice(index, 1);
      return true;
    }
    return false;
  },

  // ===== CONNECTION OPERATIONS =====
  createConnection: (connectionData) => {
    const newConnection = {
      _id: `conn_${Date.now()}`,
      id: `conn_${Date.now()}`,
      ...connectionData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockConnections.push(newConnection);
    return newConnection;
  },

  findConnections: (userId, status = 'connected') => {
    return mockConnections.filter(c => c.userId === userId && c.status === status);
  },

  findConnection: (userId, connectedUserId) => {
    return mockConnections.find(c => c.userId === userId && c.connectedUserId === connectedUserId);
  },

  updateConnection: (connectionId, updates) => {
    const conn = mockConnections.find(c => c._id === connectionId || c.id === connectionId);
    if (conn) {
      Object.assign(conn, updates, { updatedAt: new Date() });
      return conn;
    }
    return null;
  },

  // ===== STORY OPERATIONS =====
  createStory: (storyData) => {
    const newStory = {
      _id: `story_${Date.now()}`,
      id: `story_${Date.now()}`,
      ...storyData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockStories.push(newStory);
    return newStory;
  },

  findStories: (limit = 20, skip = 0) => {
    return mockStories.slice(skip, skip + limit);
  },

  // ===== COMMENT OPERATIONS =====
  createComment: (commentData) => {
    const newComment = {
      _id: `comment_${Date.now()}`,
      id: `comment_${Date.now()}`,
      ...commentData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockComments.push(newComment);
    return newComment;
  },

  findCommentsByPostId: (postId) => {
    return mockComments.filter(c => c.postId === postId);
  },

  // ===== LIKE OPERATIONS =====
  createLike: (likeData) => {
    const newLike = {
      _id: `like_${Date.now()}`,
      id: `like_${Date.now()}`,
      ...likeData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockLikes.push(newLike);
    return newLike;
  },

  findLike: (userId, postId) => {
    return mockLikes.find(l => l.userId === userId && l.postId === postId);
  },

  deleteLike: (userId, postId) => {
    const index = mockLikes.findIndex(l => l.userId === userId && l.postId === postId);
    if (index > -1) {
      mockLikes.splice(index, 1);
      return true;
    }
    return false;
  }
};

module.exports = mockAuthDB;
