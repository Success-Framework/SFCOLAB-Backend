const { body, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Validation rules for authentication
 */
const authValidation = {
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    handleValidationErrors
  ],
  
  signup: [
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    handleValidationErrors
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    handleValidationErrors
  ]
};

/**
 * Validation rules for ideation
 */
const ideationValidation = {
  createIdea: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters'),
    body('description')
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage('Description must be between 20 and 2000 characters'),
    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required'),
    handleValidationErrors
  ],
  
  createComment: [
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment must be between 1 and 1000 characters'),
    handleValidationErrors
  ]
};

/**
 * Validation rules for startup
 */
const startupValidation = {
  registerStartup: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Startup name must be between 2 and 100 characters'),
    body('industry')
      .trim()
      .notEmpty()
      .withMessage('Industry is required'),
    body('location')
      .trim()
      .notEmpty()
      .withMessage('Location is required'),
    body('description')
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage('Description must be between 20 and 2000 characters'),
    body('stage')
      .trim()
      .notEmpty()
      .withMessage('Stage is required'),
    handleValidationErrors
  ]
};

/**
 * Validation rules for knowledge
 */
const knowledgeValidation = {
  addResource: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters'),
    body('description')
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage('Description must be between 20 and 2000 characters'),
    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required'),
    handleValidationErrors
  ]
};

/**
 * Validation rules for profile settings
 */
const profileValidation = {
  updateProfile: [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio must be less than 500 characters'),
    body('company')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Company name must be less than 100 characters'),
    handleValidationErrors
  ]
};

/**
 * Validation rules for stories and posts
 */
const contentValidation = {
  createStory: [
    body('caption')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Caption must be less than 200 characters'),
    handleValidationErrors
  ],
  
  createPost: [
    body('content')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Post content must be between 1 and 2000 characters'),
    body('type')
      .isIn(['professional', 'social'])
      .withMessage('Post type must be either professional or social'),
    handleValidationErrors
  ]
};

module.exports = {
  authValidation,
  ideationValidation,
  startupValidation,
  knowledgeValidation,
  profileValidation,
  contentValidation,
  handleValidationErrors
};
