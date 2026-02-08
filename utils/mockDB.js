// Mock in-memory database for development without MongoDB
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let mockUsers = [];
let mockRefreshTokens = [];

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
  }
};

module.exports = mockAuthDB;
