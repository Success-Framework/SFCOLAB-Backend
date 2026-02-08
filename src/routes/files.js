const express = require('express');
const router = express.Router();
const File = require('../models/File');
const { protect, checkOwnership } = require('../middleware/auth');
const { uploadSingle, uploadMultiple, uploadImage, uploadDocument } = require('../middleware/upload');

// @desc    Upload single file
// @route   POST /api/files/upload
// @access  Private
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { fileType, associatedWith, description } = req.body;

    if (!fileType || !associatedWith) {
      return res.status(400).json({
        success: false,
        message: 'File type and associated with are required'
      });
    }

    // Create file document
    const file = new File({
      filename: req.file.originalname,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer,
      uploadedBy: req.user._id,
      fileType,
      associatedWith: JSON.parse(associatedWith),
      description
    });

    await file.save();

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: file.getFileInfo()
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during file upload'
    });
  }
};

// @desc    Upload multiple files
// @route   POST /api/files/upload-multiple
// @access  Private
const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const { fileType, associatedWith, description } = req.body;

    if (!fileType || !associatedWith) {
      return res.status(400).json({
        success: false,
        message: 'File type and associated with are required'
      });
    }

    const files = [];

    for (const file of req.files) {
      const fileDoc = new File({
        filename: file.originalname,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        data: file.buffer,
        uploadedBy: req.user._id,
        fileType,
        associatedWith: JSON.parse(associatedWith),
        description
      });

      await fileDoc.save();
      files.push(fileDoc.getFileInfo());
    }

    res.status(201).json({
      success: true,
      message: `${files.length} files uploaded successfully`,
      data: files
    });
  } catch (error) {
    console.error('Multiple files upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during files upload'
    });
  }
};

// @desc    Get file by ID
// @route   GET /api/files/:id
// @access  Public (for public files) / Private (for private files)
const getFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if file is public or user has access
    if (!file.isPublic && (!req.user || file.uploadedBy.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Set response headers
    res.set({
      'Content-Type': file.mimetype,
      'Content-Disposition': `inline; filename="${file.originalName}"`,
      'Content-Length': file.size
    });

    // Send file data
    res.send(file.data);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get file info (without data)
// @route   GET /api/files/:id/info
// @access  Public (for public files) / Private (for private files)
const getFileInfo = async (req, res) => {
  try {
    const file = await File.findById(req.params.id).select('-data');

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if file is public or user has access
    if (!file.isPublic && (!req.user || file.uploadedBy.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get files by association
// @route   GET /api/files/association/:type/:id
// @access  Public (for public files) / Private (for private files)
const getFilesByAssociation = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { fileType } = req.query;

    let query = {
      'associatedWith.type': type,
      'associatedWith.id': id
    };

    // Add file type filter if provided
    if (fileType) {
      query.fileType = fileType;
    }

    // If user is not authenticated, only show public files
    if (!req.user) {
      query.isPublic = true;
    }

    const files = await File.find(query).select('-data');

    res.json({
      success: true,
      count: files.length,
      data: files
    });
  } catch (error) {
    console.error('Get files by association error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's files
// @route   GET /api/files/user/:userId
// @access  Private (own files) / Public (other users' public files)
const getUserFiles = async (req, res) => {
  try {
    const { userId } = req.params;
    const { fileType } = req.query;

    let query = { uploadedBy: userId };

    // Add file type filter if provided
    if (fileType) {
      query.fileType = fileType;
    }

    // If viewing other user's files, only show public ones
    if (userId !== req.user._id.toString()) {
      query.isPublic = true;
    }

    const files = await File.find(query).select('-data');

    res.json({
      success: true,
      count: files.length,
      data: files
    });
  } catch (error) {
    console.error('Get user files error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update file info
// @route   PUT /api/files/:id
// @access  Private (file owner)
const updateFile = async (req, res) => {
  try {
    const { description, isPublic } = req.body;

    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check ownership
    if (file.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this file'
      });
    }

    // Update fields
    if (description !== undefined) {
      file.description = description;
    }

    if (isPublic !== undefined) {
      file.isPublic = isPublic;
    }

    await file.save();

    res.json({
      success: true,
      message: 'File updated successfully',
      data: file.getFileInfo()
    });
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during file update'
    });
  }
};

// @desc    Delete file
// @route   DELETE /api/files/:id
// @access  Private (file owner)
const deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check ownership
    if (file.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this file'
      });
    }

    await File.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during file deletion'
    });
  }
};

// @desc    Get file statistics
// @route   GET /api/files/stats
// @access  Private
const getFileStats = async (req, res) => {
  try {
    const stats = await File.aggregate([
      {
        $group: {
          _id: '$fileType',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      }
    ]);

    const totalFiles = await File.countDocuments();
    const totalSize = await File.aggregate([
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$size' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalFiles,
        totalSize: totalSize[0]?.totalSize || 0,
        byType: stats
      }
    });
  } catch (error) {
    console.error('Get file stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Routes
router.post('/upload', protect, uploadSingle, uploadFile);
router.post('/upload-multiple', protect, uploadMultiple, uploadMultipleFiles);
router.post('/upload-image', protect, uploadImage, uploadFile);
router.post('/upload-document', protect, uploadDocument, uploadFile);
router.get('/:id', getFile);
router.get('/:id/info', getFileInfo);
router.get('/association/:type/:id', getFilesByAssociation);
router.get('/user/:userId', protect, getUserFiles);
router.put('/:id', protect, updateFile);
router.delete('/:id', protect, deleteFile);
router.get('/stats/overview', protect, getFileStats);

module.exports = router; 