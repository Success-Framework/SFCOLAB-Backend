const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  profile: {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    avatar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    role: {
      type: String,
      enum: ['Employee', 'Founder', 'Investor', 'Mentor', 'Student'],
      default: 'Employee'
    },
    skills: [{
      type: String,
      trim: true
    }],
    experience: [{
      title: String,
      company: String,
      duration: String,
      description: String
    }],
    availability: {
      type: String,
      enum: ['Available Now', 'Available in 1 Week', 'Available in 1 Month', 'Full-time', 'Part-time', 'Not Available'],
      default: 'Available Now'
    },
    position: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    social: {
      linkedin: String,
      twitter: String,
      github: String
    }
  },
  metrics: {
    contributions: {
      type: Number,
      default: 0
    },
    commits: {
      type: Number,
      default: 0
    },
    reviews: {
      type: Number,
      default: 0
    },
    followers: {
      type: Number,
      default: 0
    },
    projects: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  refreshToken: {
    type: String
  }
}, {
  timestamps: true
});

// Index for search functionality
userSchema.index({ 
  'profile.name': 'text', 
  'profile.bio': 'text', 
  'profile.skills': 'text',
  'profile.position': 'text',
  'profile.location': 'text'
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  delete userObject.__v;
  return userObject;
};

// Update metrics
userSchema.methods.updateMetrics = function(type, value = 1) {
  if (this.metrics[type] !== undefined) {
    this.metrics[type] += value;
  }
  return this.save();
};

module.exports = mongoose.model('User', userSchema); 