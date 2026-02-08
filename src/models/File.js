const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  data: {
    type: Buffer,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  fileType: {
    type: String,
    enum: ['avatar', 'logo', 'document', 'image', 'attachment'],
    required: true
  },
  associatedWith: {
    type: {
      type: String,
      enum: ['user', 'startup', 'project', 'knowledge'],
      required: true
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  }
}, {
  timestamps: true
});

// Index for efficient queries
fileSchema.index({ uploadedBy: 1, fileType: 1 });
fileSchema.index({ 'associatedWith.type': 1, 'associatedWith.id': 1 });
fileSchema.index({ uploadedAt: -1 });

// Virtual for file URL
fileSchema.virtual('url').get(function() {
  return `/api/files/${this._id}`;
});

// Ensure virtual fields are serialized
fileSchema.set('toJSON', { virtuals: true });
fileSchema.set('toObject', { virtuals: true });

// Method to get file info without data buffer
fileSchema.methods.getFileInfo = function() {
  const fileObject = this.toObject();
  delete fileObject.data; // Remove the large buffer
  return fileObject;
};

// Static method to find files by association
fileSchema.statics.findByAssociation = function(type, id) {
  return this.find({
    'associatedWith.type': type,
    'associatedWith.id': id
  }).select('-data'); // Exclude data buffer
};

// Static method to get file count by type
fileSchema.statics.getFileCountByType = function(fileType) {
  return this.countDocuments({ fileType });
};

module.exports = mongoose.model('File', fileSchema); 