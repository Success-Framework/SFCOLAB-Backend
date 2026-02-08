const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Get allowed file types from environment or use default
  const allowedTypes = process.env.ALLOWED_FILE_TYPES 
    ? process.env.ALLOWED_FILE_TYPES.split(',')
    : ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure upload limits
const limits = {
  fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  files: 10 // Maximum 10 files per request
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits
});

// Single file upload middleware
const uploadSingle = upload.single('file');

// Multiple files upload middleware
const uploadMultiple = upload.array('files', 10);

// Specific file type uploads
const uploadImage = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB for images
  }
}).single('image');

const uploadDocument = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedDocTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedDocTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only document files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB for documents
  }
}).single('document');

// Error handling wrapper
const handleUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: 'Unexpected file field'
          });
        }
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Helper function to get file extension
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// Helper function to validate file size
const validateFileSize = (file, maxSize) => {
  return file.size <= maxSize;
};

// Helper function to generate unique filename
const generateUniqueFilename = (originalname) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = getFileExtension(originalname);
  return `${timestamp}-${randomString}${extension}`;
};

module.exports = {
  uploadSingle: handleUpload(uploadSingle),
  uploadMultiple: handleUpload(uploadMultiple),
  uploadImage: handleUpload(uploadImage),
  uploadDocument: handleUpload(uploadDocument),
  getFileExtension,
  validateFileSize,
  generateUniqueFilename
}; 