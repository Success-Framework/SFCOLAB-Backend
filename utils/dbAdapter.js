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
  }
};

module.exports = dbAdapter;
