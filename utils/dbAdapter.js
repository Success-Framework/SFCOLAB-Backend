// Database abstraction layer that handles both MongoDB and mock mode
const mockAuthDB = require('./mockDB');

let isMongoConnected = false;

const dbAdapter = {
  setMongoConnected: (connected) => {
    isMongoConnected = connected;
  },

  isUsingMock: () => !isMongoConnected,

  // User operations
  findUserByEmail: async (User, email) => {
    if (isMongoConnected) {
      return await User.findOne({ email });
    }
    return mockAuthDB.findUserByEmail(email);
  },

  findUserById: async (User, id) => {
    if (isMongoConnected) {
      return await User.findById(id);
    }
    return mockAuthDB.findUserById(id);
  },

  createUser: async (User, userData) => {
    if (isMongoConnected) {
      const user = new User(userData);
      return await user.save();
    }
    return mockAuthDB.createUser(userData);
  },

  updateUser: async (User, id, updates) => {
    if (isMongoConnected) {
      return await User.findByIdAndUpdate(id, updates, { new: true });
    }
    return mockAuthDB.updateUser(id, updates);
  },

  // Refresh token operations
  createRefreshToken: async (RefreshToken, userId, token) => {
    if (isMongoConnected) {
      return await RefreshToken.create({
        userId,
        token,
        createdAt: new Date()
      });
    }
    return mockAuthDB.createRefreshToken(userId, token);
  },

  findRefreshToken: async (RefreshToken, userId, token) => {
    if (isMongoConnected) {
      return await RefreshToken.findOne({ userId, token });
    }
    return mockAuthDB.findRefreshToken(userId, token);
  },

  // Post operations
  createPost: async (Post, postData) => {
    if (isMongoConnected) {
      return await Post.create(postData);
    }
    return mockAuthDB.createPost(postData);
  },

  findPostById: async (Post, postId) => {
    if (isMongoConnected) {
      return await Post.findById(postId);
    }
    return mockAuthDB.findPostById(postId);
  },

  findPostsByUserId: async (Post, userId, limit = 10, skip = 0) => {
    if (isMongoConnected) {
      return await Post.find({ userId }).skip(skip).limit(limit);
    }
    return mockAuthDB.findPostsByUserId(userId, limit, skip);
  },

  updatePost: async (Post, postId, updates) => {
    if (isMongoConnected) {
      return await Post.findByIdAndUpdate(postId, updates, { new: true });
    }
    return mockAuthDB.updatePost(postId, updates);
  },

  deletePost: async (Post, postId) => {
    if (isMongoConnected) {
      return await Post.findByIdAndDelete(postId);
    }
    return mockAuthDB.deletePost(postId);
  },

  // Connection operations
  createConnection: async (Connection, connectionData) => {
    if (isMongoConnected) {
      return await Connection.create(connectionData);
    }
    return mockAuthDB.createConnection(connectionData);
  },

  findConnections: async (Connection, userId, status = 'connected') => {
    if (isMongoConnected) {
      return await Connection.find({ userId, status });
    }
    return mockAuthDB.findConnections(userId, status);
  },

  findConnection: async (Connection, userId, connectedUserId) => {
    if (isMongoConnected) {
      return await Connection.findOne({ userId, connectedUserId });
    }
    return mockAuthDB.findConnection(userId, connectedUserId);
  },

  updateConnection: async (Connection, connectionId, updates) => {
    if (isMongoConnected) {
      return await Connection.findByIdAndUpdate(connectionId, updates, { new: true });
    }
    return mockAuthDB.updateConnection(connectionId, updates);
  },

  // Story operations
  createStory: async (Story, storyData) => {
    if (isMongoConnected) {
      return await Story.create(storyData);
    }
    return mockAuthDB.createStory(storyData);
  },

  findStories: async (Story, limit = 20, skip = 0) => {
    if (isMongoConnected) {
      return await Story.find().skip(skip).limit(limit);
    }
    return mockAuthDB.findStories(limit, skip);
  },

  // Comment operations
  createComment: async (PostComment, commentData) => {
    if (isMongoConnected) {
      return await PostComment.create(commentData);
    }
    return mockAuthDB.createComment(commentData);
  },

  findCommentsByPostId: async (PostComment, postId) => {
    if (isMongoConnected) {
      return await PostComment.find({ postId });
    }
    return mockAuthDB.findCommentsByPostId(postId);
  },

  // Like operations
  createLike: async (PostLike, likeData) => {
    if (isMongoConnected) {
      return await PostLike.create(likeData);
    }
    return mockAuthDB.createLike(likeData);
  },

  findLike: async (PostLike, userId, postId) => {
    if (isMongoConnected) {
      return await PostLike.findOne({ userId, postId });
    }
    return mockAuthDB.findLike(userId, postId);
  },

  deleteLike: async (PostLike, userId, postId) => {
    if (isMongoConnected) {
      return await PostLike.findOneAndDelete({ userId, postId });
    }
    return mockAuthDB.deleteLike(userId, postId);
  },

  // Unlike operation (alias for deleteLike)
  unlikePost: async (PostLike, userId, postId) => {
    return dbAdapter.deleteLike(PostLike, userId, postId);
  }
};

module.exports = dbAdapter;
