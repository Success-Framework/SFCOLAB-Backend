const bcrypt = require('bcryptjs');

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @param {number} saltRounds - Number of salt rounds (default: 12)
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password, saltRounds = 12) => {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error('Error hashing password');
  }
};

/**
 * Compare a password with its hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password to compare against
 * @returns {Promise<boolean>} - True if passwords match
 */
const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

/**
 * Generate a random password
 * @param {number} length - Length of password (default: 12)
 * @returns {string} - Random password
 */
const generateRandomPassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each required category
  password += charset.charAt(Math.floor(Math.random() * 26)); // lowercase
  password += charset.charAt(26 + Math.floor(Math.random() * 26)); // uppercase
  password += charset.charAt(52 + Math.floor(Math.random() * 10)); // number
  password += charset.charAt(62 + Math.floor(Math.random() * 8)); // special
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with score and feedback
 */
const validatePasswordStrength = (password) => {
  const feedback = [];
  let score = 0;
  
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include at least one lowercase letter');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include at least one uppercase letter');
  
  if (/\d/.test(password)) score += 1;
  else feedback.push('Include at least one number');
  
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else feedback.push('Include at least one special character');
  
  // Bonus for variety
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.6) score += 1;
  
  let strength = 'weak';
  if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  
  return {
    score,
    strength,
    feedback: feedback.length > 0 ? feedback : ['Password meets all requirements'],
    isValid: score >= 3
  };
};

module.exports = {
  hashPassword,
  comparePassword,
  generateRandomPassword,
  validatePasswordStrength
};
