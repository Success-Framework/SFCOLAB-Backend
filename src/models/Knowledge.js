const mongoose = require('mongoose');

const knowledgeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Technology', 'Business', 'Marketing', 'Finance', 'Legal', 'Design', 'Development', 'Strategy', 'Operations', 'Other']
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: ['Article', 'Guide', 'Tutorial', 'Case Study', 'Template', 'Tool', 'Resource', 'FAQ']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    default: 'Intermediate'
  },
  estimatedTime: {
    type: String,
    default: '15 minutes'
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Under Review', 'Archived'],
    default: 'Published'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  featured: {
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
  bookmarks: [{
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
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    ratings: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  relatedResources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Knowledge'
  }],
  version: {
    type: Number,
    default: 1
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  seo: {
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot exceed 160 characters']
    },
    keywords: [{
      type: String,
      trim: true
    }]
  }
}, {
  timestamps: true
});

// Index for search functionality
knowledgeSchema.index({ 
  title: 'text', 
  content: 'text', 
  category: 'text',
  tags: 'text'
});

// Index for filtering
knowledgeSchema.index({ category: 1, type: 1, difficulty: 1 });
knowledgeSchema.index({ author: 1, status: 1, isPublic: 1 });
knowledgeSchema.index({ featured: 1, createdAt: -1 });
knowledgeSchema.index({ 'rating.average': -1, views: -1 });

// Virtual for like count
knowledgeSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for bookmark count
knowledgeSchema.virtual('bookmarkCount').get(function() {
  return this.bookmarks.length;
});

// Virtual for comment count
knowledgeSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Ensure virtual fields are serialized
knowledgeSchema.set('toJSON', { virtuals: true });
knowledgeSchema.set('toObject', { virtuals: true });

// Method to toggle like
knowledgeSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  } else {
    this.likes.push(userId);
  }
  return this.save();
};

// Method to toggle bookmark
knowledgeSchema.methods.toggleBookmark = function(userId) {
  const bookmarkIndex = this.bookmarks.indexOf(userId);
  if (bookmarkIndex > -1) {
    this.bookmarks.splice(bookmarkIndex, 1);
  } else {
    this.bookmarks.push(userId);
  }
  return this.save();
};

// Method to add comment
knowledgeSchema.methods.addComment = function(userId, content) {
  this.comments.push({ user: userId, content });
  return this.save();
};

// Method to remove comment
knowledgeSchema.methods.removeComment = function(commentId) {
  this.comments = this.comments.filter(comment => comment._id.toString() !== commentId.toString());
  return this.save();
};

// Method to add rating
knowledgeSchema.methods.addRating = function(userId, rating) {
  // Remove existing rating from this user
  this.rating.ratings = this.rating.ratings.filter(r => r.user.toString() !== userId.toString());
  
  // Add new rating
  this.rating.ratings.push({ user: userId, rating });
  
  // Calculate new average
  const totalRating = this.rating.ratings.reduce((sum, r) => sum + r.rating, 0);
  this.rating.average = totalRating / this.rating.ratings.length;
  this.rating.count = this.rating.ratings.length;
  
  return this.save();
};

// Method to increment views
knowledgeSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to toggle featured status
knowledgeSchema.methods.toggleFeatured = function() {
  this.featured = !this.featured;
  return this.save();
};

// Method to update version
knowledgeSchema.methods.updateVersion = function() {
  this.version += 1;
  this.lastUpdated = new Date();
  return this.save();
};

module.exports = mongoose.model('Knowledge', knowledgeSchema); 