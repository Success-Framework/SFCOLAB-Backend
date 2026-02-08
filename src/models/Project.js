const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  header: {
    type: String,
    required: [true, 'Project header is required'],
    trim: true,
    maxlength: [200, 'Header cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Project content is required'],
    maxlength: [2000, 'Content cannot exceed 2000 characters']
  },
  stage: {
    type: String,
    required: [true, 'Stage is required'],
    enum: ['Idea Stage', 'Concept Stage', 'Development Stage', 'Research Stage', 'MVP Stage', 'Growth Stage', 'Scale Stage']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Sustainability', 'Energy', 'Transportation', 'Entertainment', 'Other']
  },
  tags: [{
    type: String,
    trim: true
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  collaborators: [{
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
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  metrics: {
    impact: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Very High'],
      default: 'Medium'
    },
    complexity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Very High'],
      default: 'Medium'
    },
    timeline: {
      type: String,
      default: '3 months'
    }
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'In Progress', 'Completed', 'Archived'],
    default: 'Published'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  budget: {
    type: String
  },
  requirements: [{
    type: String,
    trim: true
  }],
  goals: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for search functionality
projectSchema.index({ 
  header: 'text', 
  content: 'text', 
  category: 'text',
  tags: 'text'
});

// Index for filtering
projectSchema.index({ stage: 1, category: 1, author: 1 });
projectSchema.index({ status: 1, isPublic: 1, featured: 1 });
projectSchema.index({ createdAt: -1 });

// Virtual for like count
projectSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
projectSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for collaborator count
projectSchema.virtual('collaboratorCount').get(function() {
  return this.collaborators.length;
});

// Ensure virtual fields are serialized
projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

// Method to add collaborator
projectSchema.methods.addCollaborator = function(userId, role) {
  const existingCollaborator = this.collaborators.find(collab => collab.user.toString() === userId.toString());
  if (existingCollaborator) {
    existingCollaborator.role = role;
  } else {
    this.collaborators.push({ user: userId, role });
  }
  return this.save();
};

// Method to remove collaborator
projectSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(collab => collab.user.toString() !== userId.toString());
  return this.save();
};

// Method to toggle like
projectSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  } else {
    this.likes.push(userId);
  }
  return this.save();
};

// Method to add comment
projectSchema.methods.addComment = function(userId, content) {
  this.comments.push({ user: userId, content });
  return this.save();
};

// Method to remove comment
projectSchema.methods.removeComment = function(commentId) {
  this.comments = this.comments.filter(comment => comment._id.toString() !== commentId.toString());
  return this.save();
};

// Method to increment views
projectSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to toggle featured status
projectSchema.methods.toggleFeatured = function() {
  this.featured = !this.featured;
  return this.save();
};

module.exports = mongoose.model('Project', projectSchema); 