const mongoose = require('mongoose');

const startupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Startup name is required'],
    trim: true,
    maxlength: [100, 'Startup name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  industry: {
    type: String,
    required: [true, 'Industry is required'],
    enum: ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Sustainability', 'Energy', 'Transportation', 'Entertainment', 'Other']
  },
  stage: {
    type: String,
    required: [true, 'Stage is required'],
    enum: ['MVP Stage', 'Growth Stage', 'Scale Stage', 'Seed Stage', 'Series A', 'Series B', 'Series C', 'IPO']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  teamSize: {
    type: Number,
    required: [true, 'Team size is required'],
    min: [1, 'Team size must be at least 1']
  },
  founded: {
    type: Date,
    required: [true, 'Founded date is required']
  },
  funding: {
    type: String,
    required: [true, 'Funding information is required']
  },
  logo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  },
  founder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Founder is required']
  },
  team: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  metrics: {
    users: {
      type: String,
      default: '0'
    },
    revenue: {
      type: String,
      default: '$0'
    },
    growth: {
      type: String,
      default: '0%'
    },
    customers: {
      type: String,
      default: '0'
    }
  },
  website: {
    type: String,
    trim: true
  },
  social: {
    linkedin: String,
    twitter: String,
    facebook: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Index for search functionality
startupSchema.index({ 
  name: 'text', 
  description: 'text', 
  industry: 'text',
  location: 'text',
  tags: 'text'
});

// Index for filtering
startupSchema.index({ industry: 1, stage: 1, location: 1 });
startupSchema.index({ founder: 1 });
startupSchema.index({ isActive: 1, isVerified: 1 });

// Virtual for like count
startupSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for follower count
startupSchema.virtual('followerCount').get(function() {
  return this.followers.length;
});

// Ensure virtual fields are serialized
startupSchema.set('toJSON', { virtuals: true });
startupSchema.set('toObject', { virtuals: true });

// Method to add team member
startupSchema.methods.addTeamMember = function(userId, role) {
  const existingMember = this.team.find(member => member.user.toString() === userId.toString());
  if (existingMember) {
    existingMember.role = role;
  } else {
    this.team.push({ user: userId, role });
  }
  return this.save();
};

// Method to remove team member
startupSchema.methods.removeTeamMember = function(userId) {
  this.team = this.team.filter(member => member.user.toString() !== userId.toString());
  return this.save();
};

// Method to toggle like
startupSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  } else {
    this.likes.push(userId);
  }
  return this.save();
};

// Method to toggle follow
startupSchema.methods.toggleFollow = function(userId) {
  const followIndex = this.followers.indexOf(userId);
  if (followIndex > -1) {
    this.followers.splice(followIndex, 1);
  } else {
    this.followers.push(userId);
  }
  return this.save();
};

// Method to increment views
startupSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

module.exports = mongoose.model('Startup', startupSchema); 