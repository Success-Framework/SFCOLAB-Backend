const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { ideationValidation } = require('../middleware/validation');

const router = express.Router();

// Mock data (replace with database operations later)
let ideas = [];
let comments = [];
let suggestions = [];

/**
 * @route   GET /api/ideation
 * @desc    Get all ideas with pagination and filtering
 * @access  Public
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      search, 
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = req.query;

    let filteredIdeas = [...ideas];

    // Filter by category
    if (category) {
      filteredIdeas = filteredIdeas.filter(idea => idea.category === category);
    }

    // Search functionality
    if (search) {
      const searchLower = search.toLowerCase();
      filteredIdeas = filteredIdeas.filter(idea => 
        idea.title.toLowerCase().includes(searchLower) ||
        idea.description.toLowerCase().includes(searchLower) ||
        idea.projectDetails.toLowerCase().includes(searchLower) ||
        idea.industry.toLowerCase().includes(searchLower) ||
        idea.stage.toLowerCase().includes(searchLower) ||
        idea.creator.firstName.toLowerCase().includes(searchLower) ||
        idea.creator.lastName.toLowerCase().includes(searchLower) ||
        idea.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        idea.teamMembers.some(member => 
          member.name.toLowerCase().includes(searchLower) ||
          member.position.toLowerCase().includes(searchLower) ||
          member.skills.some(skill => skill.toLowerCase().includes(searchLower))
        )
      );
    }

    // Sorting
    filteredIdeas.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'creator') {
        aValue = `${a.creator.firstName} ${a.creator.lastName}`;
        bValue = `${b.creator.firstName} ${b.creator.lastName}`;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedIdeas = filteredIdeas.slice(startIndex, endIndex);

    // Get total count for pagination info
    const totalIdeas = filteredIdeas.length;
    const totalPages = Math.ceil(totalIdeas / limit);

    res.json({
      ideas: paginatedIdeas,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalIdeas,
        hasNextPage: endIndex < totalIdeas,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get ideas error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch ideas'
    });
  }
});

/**
 * @route   POST /api/ideation
 * @desc    Create a new idea
 * @access  Private
 */
router.post('/', authenticateToken, ideationValidation.createIdea, (req, res) => {
  try {
    const { userId, firstName, lastName } = req.user;
    const { title, description, projectDetails, industry, stage, teamMembers = [], tags = [] } = req.body;

    const newIdea = {
      id: Date.now().toString(),
      title,
      description,
      projectDetails,
      industry,
      stage,
      teamMembers: Array.isArray(teamMembers) ? teamMembers.slice(0, 3) : [],
      tags: Array.isArray(tags) ? tags : [],
      creator: {
        id: userId,
        firstName,
        lastName
      },
      status: 'active',
      likes: 0,
      views: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    ideas.push(newIdea);

    res.status(201).json({
      message: 'Idea created successfully',
      idea: newIdea
    });

  } catch (error) {
    console.error('Create idea error:', error);
    res.status(500).json({
      error: 'Creation Failed',
      message: 'Failed to create idea'
    });
  }
});

/**
 * @route   GET /api/ideation/:id
 * @desc    Get idea by ID with comments
 * @access  Public
 */
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user || {};

    const idea = ideas.find(i => i.id === id);
    if (!idea) {
      return res.status(404).json({
        error: 'Idea Not Found',
        message: 'Idea not found'
      });
    }

    // Increment view count if user is authenticated
    if (userId && userId !== idea.creator.id) {
      idea.views += 1;
    }

    // Get comments for this idea
    const ideaComments = comments.filter(c => c.ideaId === id);

    res.json({
      idea: {
        ...idea,
        comments: ideaComments
      }
    });

  } catch (error) {
    console.error('Get idea error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch idea'
    });
  }
});

/**
 * @route   PUT /api/ideation/:id
 * @desc    Update idea (only creator can update)
 * @access  Private
 */
router.put('/:id', authenticateToken, ideationValidation.createIdea, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { title, description, projectDetails, industry, stage, teamMembers, tags } = req.body;

    const idea = ideas.find(i => i.id === id);
    if (!idea) {
      return res.status(404).json({
        error: 'Idea Not Found',
        message: 'Idea not found'
      });
    }

    // Check if user is the creator
    if (idea.creator.id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own ideas'
      });
    }

    // Update idea
    idea.title = title;
    idea.description = description;
    idea.projectDetails = projectDetails;
    idea.industry = industry;
    idea.stage = stage;
    idea.teamMembers = Array.isArray(teamMembers) ? teamMembers.slice(0, 3) : [];
    idea.tags = Array.isArray(tags) ? tags : [];
    idea.updatedAt = new Date().toISOString();

    res.json({
      message: 'Idea updated successfully',
      idea
    });

  } catch (error) {
    console.error('Update idea error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to update idea'
    });
  }
});

/**
 * @route   DELETE /api/ideation/:id
 * @desc    Delete idea (only creator can delete)
 * @access  Private
 */
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const ideaIndex = ideas.findIndex(i => i.id === id);
    if (ideaIndex === -1) {
      return res.status(404).json({
        error: 'Idea Not Found',
        message: 'Idea not found'
      });
    }

    const idea = ideas[ideaIndex];

    // Check if user is the creator
    if (idea.creator.id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own ideas'
      });
    }

    // Delete idea
    ideas.splice(ideaIndex, 1);

    // Delete associated comments
    comments = comments.filter(c => c.ideaId !== id);

    res.json({
      message: 'Idea deleted successfully'
    });

  } catch (error) {
    console.error('Delete idea error:', error);
    res.status(500).json({
      error: 'Deletion Failed',
      message: 'Failed to delete idea'
    });
  }
});

/**
 * @route   POST /api/ideation/:id/comments
 * @desc    Add comment to idea
 * @access  Private
 */
router.post('/:id/comments', authenticateToken, ideationValidation.createComment, (req, res) => {
  try {
    const { id } = req.params;
    const { userId, firstName, lastName } = req.user;
    const { content } = req.body;

    const idea = ideas.find(i => i.id === id);
    if (!idea) {
      return res.status(404).json({
        error: 'Idea Not Found',
        message: 'Idea not found'
      });
    }

    const newComment = {
      id: Date.now().toString(),
      ideaId: id,
      content,
      author: {
        id: userId,
        firstName,
        lastName
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    comments.push(newComment);

    res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      error: 'Comment Failed',
      message: 'Failed to add comment'
    });
  }
});

/**
 * @route   GET /api/ideation/:id/comments
 * @desc    Get comments for an idea
 * @access  Public
 */
router.get('/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const idea = ideas.find(i => i.id === id);
    if (!idea) {
      return res.status(404).json({
        error: 'Idea Not Found',
        message: 'Idea not found'
      });
    }

    const ideaComments = comments.filter(c => c.ideaId === id);

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedComments = ideaComments.slice(startIndex, endIndex);

    const totalComments = ideaComments.length;
    const totalPages = Math.ceil(totalComments / limit);

    res.json({
      comments: paginatedComments,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalComments,
        hasNextPage: endIndex < totalComments,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch comments'
    });
  }
});

/**
 * @route   POST /api/ideation/:id/suggestions
 * @desc    Submit suggestion for idea
 * @access  Private
 */
router.post('/:id/suggestions', authenticateToken, ideationValidation.createComment, (req, res) => {
  try {
    const { id } = req.params;
    const { userId, firstName, lastName } = req.user;
    const { content } = req.body;

    const idea = ideas.find(i => i.id === id);
    if (!idea) {
      return res.status(404).json({
        error: 'Idea Not Found',
        message: 'Idea not found'
      });
    }

    // Check if user is not the creator
    if (idea.creator.id === userId) {
      return res.status(400).json({
        error: 'Invalid Action',
        message: 'You cannot suggest improvements to your own idea'
      });
    }

    const newSuggestion = {
      id: Date.now().toString(),
      ideaId: id,
      content,
      author: {
        id: userId,
        firstName,
        lastName
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    suggestions.push(newSuggestion);

    // TODO: Send notification to idea creator
    // This will be implemented when notifications are set up

    res.status(201).json({
      message: 'Suggestion submitted successfully',
      suggestion: newSuggestion
    });

  } catch (error) {
    console.error('Submit suggestion error:', error);
    res.status(500).json({
      error: 'Suggestion Failed',
      message: 'Failed to submit suggestion'
    });
  }
});

/**
 * @route   GET /api/ideation/:id/suggestions
 * @desc    Get suggestions for an idea (only creator can see)
 * @access  Private
 */
router.get('/:id/suggestions', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const idea = ideas.find(i => i.id === id);
    if (!idea) {
      return res.status(404).json({
        error: 'Idea Not Found',
        message: 'Idea not found'
      });
    }

    // Check if user is the creator
    if (idea.creator.id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the idea creator can view suggestions'
      });
    }

    const ideaSuggestions = suggestions.filter(s => s.ideaId === id);

    res.json({
      suggestions: ideaSuggestions
    });

  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch suggestions'
    });
  }
});

/**
 * @route   PUT /api/ideation/:id/suggestions/:suggestionId
 * @desc    Update suggestion status (accept/reject)
 * @access  Private
 */
router.put('/:id/suggestions/:suggestionId', authenticateToken, (req, res) => {
  try {
    const { id, suggestionId } = req.params;
    const { userId } = req.user;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Status must be either "accepted" or "rejected"'
      });
    }

    const idea = ideas.find(i => i.id === id);
    if (!idea) {
      return res.status(404).json({
        error: 'Idea Not Found',
        message: 'Idea not found'
      });
    }

    // Check if user is the creator
    if (idea.creator.id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the idea creator can update suggestion status'
      });
    }

    const suggestion = suggestions.find(s => s.id === suggestionId && s.ideaId === id);
    if (!suggestion) {
      return res.status(404).json({
        error: 'Suggestion Not Found',
        message: 'Suggestion not found'
      });
    }

    suggestion.status = status;
    suggestion.updatedAt = new Date().toISOString();

    // TODO: Send notification to suggestion author
    // This will be implemented when notifications are set up

    res.json({
      message: `Suggestion ${status} successfully`,
      suggestion
    });

  } catch (error) {
    console.error('Update suggestion error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to update suggestion status'
    });
  }
});

/**
 * @route   GET /api/ideation/industries
 * @desc    Get predefined industries for dropdown
 * @access  Public
 */
router.get('/industries', (req, res) => {
  try {
    const industries = [
      'Technology',
      'Healthcare',
      'Finance',
      'Education',
      'E-commerce',
      'Manufacturing',
      'Real Estate',
      'Transportation',
      'Energy',
      'Agriculture',
      'Entertainment',
      'Food & Beverage',
      'Fashion',
      'Sports',
      'Travel & Tourism',
      'Automotive',
      'Aerospace',
      'Telecommunications',
      'Media & Advertising',
      'Consulting',
      'Legal Services',
      'Construction',
      'Retail',
      'Logistics',
      'Pharmaceuticals',
      'Biotechnology',
      'Renewable Energy',
      'Cybersecurity',
      'Artificial Intelligence',
      'Blockchain',
      'Gaming',
      'Social Media',
      'SaaS',
      'IoT',
      'Robotics'
    ];
    
    res.json({
      industries: industries.sort()
    });

  } catch (error) {
    console.error('Get industries error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch industries'
    });
  }
});

/**
 * @route   GET /api/ideation/stages
 * @desc    Get predefined stages for dropdown
 * @access  Public
 */
router.get('/stages', (req, res) => {
  try {
    const stages = [
      'Idea',
      'Concept',
      'Prototype',
      'MVP',
      'Beta',
      'Launch',
      'Growth',
      'Scale',
      'Mature',
      'Exit'
    ];
    
    res.json({
      stages: stages
    });

  } catch (error) {
    console.error('Get stages error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch stages'
    });
  }
});

/**
 * @route   GET /api/ideation/available-tags
 * @desc    Get available tags for ideation
 * @access  Public
 */
router.get('/available-tags', (req, res) => {
  try {
    const allTags = ideas.flatMap(idea => idea.tags || []);
    const uniqueTags = [...new Set(allTags)];
    
    res.json({
      tags: uniqueTags.sort()
    });

  } catch (error) {
    console.error('Get available tags error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch available tags'
    });
  }
});

/**
 * @route   GET /api/ideation/skills
 * @desc    Get predefined skills for team members
 * @access  Public
 */
router.get('/skills', (req, res) => {
  try {
    const skills = [
      'Frontend Development',
      'Backend Development',
      'Full Stack Development',
      'Mobile Development',
      'UI/UX Design',
      'Graphic Design',
      'Product Management',
      'Project Management',
      'Marketing',
      'Sales',
      'Business Development',
      'Data Science',
      'Machine Learning',
      'DevOps',
      'Cloud Computing',
      'Cybersecurity',
      'Blockchain',
      'AI/ML',
      'Data Analytics',
      'Quality Assurance',
      'Content Writing',
      'Digital Marketing',
      'SEO',
      'Social Media',
      'Video Production',
      'Photography',
      'Finance',
      'Accounting',
      'Legal',
      'Operations',
      'Customer Success',
      'Research',
      'Strategy',
      'Consulting',
      'Training',
      'Support',
      'HR',
      'Recruiting'
    ];
    
    res.json({
      skills: skills.sort()
    });

  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: 'Failed to fetch skills'
    });
  }
});

module.exports = router;
