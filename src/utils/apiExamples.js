// API Integration Examples for SFCOLAB Frontend
// This file contains examples of how to integrate with the backend API

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// API utility functions
class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  // Clear authentication token
  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  // Make API request
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // File upload
  async uploadFile(endpoint, file, additionalData = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    return this.request(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });
  }
}

// Create API service instance
const api = new ApiService();

// Authentication API Examples
export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      api.setToken(response.data.token);
    }
    return response;
  },

  // Login user
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      api.setToken(response.data.token);
    }
    return response;
  },

  // Logout user
  logout: async () => {
    await api.post('/auth/logout');
    api.clearToken();
  },

  // Get current user
  getCurrentUser: () => api.get('/auth/me'),

  // Update profile
  updateProfile: (profileData) => api.put('/auth/profile', { profile: profileData }),

  // Change password
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
};

// Users API Examples
export const usersAPI = {
  // Get all users with filters
  getUsers: (params = {}) => api.get('/users', params),

  // Get user by ID
  getUser: (userId) => api.get(`/users/${userId}`),

  // Search users
  searchUsers: (query, filters = {}) => api.get('/users/search', { q: query, ...filters }),

  // Update user
  updateUser: (userId, userData) => api.put(`/users/${userId}`, userData),

  // Follow/Unfollow user
  toggleFollow: (userId) => api.post(`/users/${userId}/follow`),
};

// Startups API Examples
export const startupsAPI = {
  // Get all startups
  getStartups: (params = {}) => api.get('/startups', params),

  // Get startup by ID
  getStartup: (startupId) => api.get(`/startups/${startupId}`),

  // Create startup
  createStartup: (startupData) => api.post('/startups', startupData),

  // Update startup
  updateStartup: (startupId, startupData) => api.put(`/startups/${startupId}`, startupData),

  // Delete startup
  deleteStartup: (startupId) => api.delete(`/startups/${startupId}`),

  // Search startups
  searchStartups: (query, filters = {}) => api.get('/startups/search', { q: query, ...filters }),

  // Like/Unlike startup
  toggleLike: (startupId) => api.post(`/startups/${startupId}/like`),

  // Follow/Unfollow startup
  toggleFollow: (startupId) => api.post(`/startups/${startupId}/follow`),

  // Add team member
  addTeamMember: (startupId, userId, role) => 
    api.post(`/startups/${startupId}/team`, { userId, role }),

  // Remove team member
  removeTeamMember: (startupId, userId) => 
    api.delete(`/startups/${startupId}/team/${userId}`),
};

// Projects API Examples
export const projectsAPI = {
  // Get all projects
  getProjects: (params = {}) => api.get('/projects', params),

  // Get project by ID
  getProject: (projectId) => api.get(`/projects/${projectId}`),

  // Create project
  createProject: (projectData) => api.post('/projects', projectData),

  // Update project
  updateProject: (projectId, projectData) => api.put(`/projects/${projectId}`, projectData),

  // Delete project
  deleteProject: (projectId) => api.delete(`/projects/${projectId}`),

  // Search projects
  searchProjects: (query, filters = {}) => api.get('/projects/search', { q: query, ...filters }),

  // Like/Unlike project
  toggleLike: (projectId) => api.post(`/projects/${projectId}/like`),

  // Add comment
  addComment: (projectId, content) => api.post(`/projects/${projectId}/comment`, { content }),

  // Remove comment
  removeComment: (projectId, commentId) => api.delete(`/projects/${projectId}/comment/${commentId}`),

  // Add collaborator
  addCollaborator: (projectId, userId, role) => 
    api.post(`/projects/${projectId}/collaborate`, { userId, role }),

  // Remove collaborator
  removeCollaborator: (projectId, userId) => 
    api.delete(`/projects/${projectId}/collaborate/${userId}`),
};

// Knowledge API Examples
export const knowledgeAPI = {
  // Get all knowledge resources
  getKnowledge: (params = {}) => api.get('/knowledge', params),

  // Get knowledge resource by ID
  getKnowledgeById: (knowledgeId) => api.get(`/knowledge/${knowledgeId}`),

  // Create knowledge resource
  createKnowledge: (knowledgeData) => api.post('/knowledge', knowledgeData),

  // Update knowledge resource
  updateKnowledge: (knowledgeId, knowledgeData) => 
    api.put(`/knowledge/${knowledgeId}`, knowledgeData),

  // Delete knowledge resource
  deleteKnowledge: (knowledgeId) => api.delete(`/knowledge/${knowledgeId}`),

  // Search knowledge resources
  searchKnowledge: (query, filters = {}) => 
    api.get('/knowledge/search', { q: query, ...filters }),

  // Like/Unlike knowledge resource
  toggleLike: (knowledgeId) => api.post(`/knowledge/${knowledgeId}/like`),

  // Bookmark/Unbookmark knowledge resource
  toggleBookmark: (knowledgeId) => api.post(`/knowledge/${knowledgeId}/bookmark`),

  // Rate knowledge resource
  rateKnowledge: (knowledgeId, rating) => 
    api.post(`/knowledge/${knowledgeId}/rate`, { rating }),

  // Add comment
  addComment: (knowledgeId, content) => 
    api.post(`/knowledge/${knowledgeId}/comment`, { content }),

  // Remove comment
  removeComment: (knowledgeId, commentId) => 
    api.delete(`/knowledge/${knowledgeId}/comment/${commentId}`),

  // Get user's bookmarks
  getBookmarks: (params = {}) => api.get('/knowledge/bookmarks', params),
};

// Files API Examples
export const filesAPI = {
  // Upload single file
  uploadFile: (file, fileType, associatedWith, description = '') => 
    api.uploadFile('/files/upload', file, {
      fileType,
      associatedWith: JSON.stringify(associatedWith),
      description,
    }),

  // Upload multiple files
  uploadMultipleFiles: (files, fileType, associatedWith, description = '') => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('fileType', fileType);
    formData.append('associatedWith', JSON.stringify(associatedWith));
    formData.append('description', description);
    
    return api.request('/files/upload-multiple', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${api.token}`,
      },
      body: formData,
    });
  },

  // Get file by ID
  getFile: (fileId) => api.get(`/files/${fileId}`),

  // Get file info
  getFileInfo: (fileId) => api.get(`/files/${fileId}/info`),

  // Get files by association
  getFilesByAssociation: (type, id, fileType = null) => {
    const params = fileType ? { fileType } : {};
    return api.get(`/files/association/${type}/${id}`, params);
  },

  // Update file info
  updateFile: (fileId, fileData) => api.put(`/files/${fileId}`, fileData),

  // Delete file
  deleteFile: (fileId) => api.delete(`/files/${fileId}`),
};

// Contributors API Examples
export const contributorsAPI = {
  // Get all contributors
  getContributors: (params = {}) => api.get('/contributors', params),

  // Search contributors
  searchContributors: (query, filters = {}) => 
    api.get('/contributors/search', { q: query, ...filters }),

  // Get contributor by ID
  getContributor: (contributorId) => api.get(`/contributors/${contributorId}`),

  // Apply for project
  applyForProject: (projectId, message, role) => 
    api.post('/contributors/apply', { projectId, message, role }),

  // Get project applications
  getProjectApplications: (projectId) => api.get(`/projects/${projectId}/applications`),

  // Update application status
  updateApplicationStatus: (projectId, applicationId, status) => 
    api.put(`/projects/${projectId}/applications/${applicationId}`, { status }),

  // Get user's applications
  getUserApplications: (params = {}) => api.get('/contributors/applications', params),
};

// Dashboard API Examples
export const dashboardAPI = {
  // Get dashboard statistics
  getStats: () => api.get('/dashboard/stats'),

  // Get user's tasks/projects
  getTasks: (params = {}) => api.get('/dashboard/tasks', params),

  // Get calendar events
  getCalendarEvents: (start, end) => api.get('/dashboard/calendar', { start, end }),

  // Get progress metrics
  getProgress: (period = 30) => api.get('/dashboard/progress', { period }),

  // Get activity feed
  getActivity: (params = {}) => api.get('/dashboard/activity', params),

  // Get user's network
  getNetwork: () => api.get('/dashboard/network'),

  // Get recommendations
  getRecommendations: () => api.get('/dashboard/recommendations'),
};

// React Hook Examples
export const useAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCall = async (apiFunction, ...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction(...args);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { apiCall, loading, error };
};

// Usage Examples

// 1. Authentication
export const authExamples = {
  // Register
  registerUser: async () => {
    try {
      const userData = {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'password123',
        profile: {
          name: 'John Doe',
          bio: 'Full-stack developer',
          role: 'Employee',
          skills: ['React', 'Node.js'],
          location: 'San Francisco'
        }
      };
      
      const response = await authAPI.register(userData);
      console.log('User registered:', response.data);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  },

  // Login
  loginUser: async () => {
    try {
      const credentials = {
        email: 'john@example.com',
        password: 'password123'
      };
      
      const response = await authAPI.login(credentials);
      console.log('User logged in:', response.data);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }
};

// 2. Startups
export const startupExamples = {
  // Get startups with filters
  getStartups: async () => {
    try {
      const params = {
        industry: 'Technology',
        stage: 'Growth Stage',
        location: 'San Francisco',
        page: 1,
        limit: 10
      };
      
      const response = await startupsAPI.getStartups(params);
      console.log('Startups:', response.data);
    } catch (error) {
      console.error('Failed to get startups:', error);
    }
  },

  // Create startup
  createStartup: async () => {
    try {
      const startupData = {
        name: 'My Startup',
        description: 'A revolutionary startup',
        industry: 'Technology',
        stage: 'MVP Stage',
        location: 'San Francisco',
        teamSize: 5,
        founded: new Date(),
        funding: '$100K',
        website: 'https://mystartup.com',
        tags: ['Tech', 'Innovation']
      };
      
      const response = await startupsAPI.createStartup(startupData);
      console.log('Startup created:', response.data);
    } catch (error) {
      console.error('Failed to create startup:', error);
    }
  }
};

// 3. Projects
export const projectExamples = {
  // Get projects with search
  searchProjects: async () => {
    try {
      const response = await projectsAPI.searchProjects('AI', {
        stage: 'Development Stage',
        category: 'Technology'
      });
      console.log('Projects found:', response.data);
    } catch (error) {
      console.error('Failed to search projects:', error);
    }
  },

  // Add comment to project
  addComment: async (projectId) => {
    try {
      const response = await projectsAPI.addComment(projectId, 'Great project!');
      console.log('Comment added:', response.data);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }
};

// 4. File Upload
export const fileExamples = {
  // Upload avatar
  uploadAvatar: async (file) => {
    try {
      const response = await filesAPI.uploadFile(file, 'avatar', {
        type: 'user',
        id: 'user-id'
      });
      console.log('Avatar uploaded:', response.data);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    }
  },

  // Upload startup logo
  uploadLogo: async (file, startupId) => {
    try {
      const response = await filesAPI.uploadFile(file, 'logo', {
        type: 'startup',
        id: startupId
      });
      console.log('Logo uploaded:', response.data);
    } catch (error) {
      console.error('Failed to upload logo:', error);
    }
  }
};

// 5. Real-time Features (WebSocket)
export const socketExamples = {
  // Connect to WebSocket
  connectSocket: () => {
    const socket = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    // Listen for events
    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('chat:message', (message) => {
      console.log('New message:', message);
    });

    socket.on('notification:new', (notification) => {
      console.log('New notification:', notification);
    });

    return socket;
  },

  // Send chat message
  sendMessage: (socket, roomId, message) => {
    socket.emit('chat:message', {
      roomId,
      message,
      type: 'text'
    });
  },

  // Join chat room
  joinChatRoom: (socket, roomId) => {
    socket.emit('chat:join', { roomId });
  }
};

export default api; 