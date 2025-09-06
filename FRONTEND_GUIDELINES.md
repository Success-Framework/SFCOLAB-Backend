# SFCollab Backend API - Frontend Integration Guidelines

## 📋 Table of Contents
- [Overview](#overview)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The SFCollab Backend provides a comprehensive REST API for building a collaborative platform with features for ideation, knowledge sharing, startup management, and user profiles. The API uses JSON persistence for development and testing.

### Key Features
- **Authentication**: JWT-based authentication with refresh tokens
- **Ideation Platform**: Create, manage, and collaborate on ideas
- **Knowledge Base**: Share and organize knowledge resources
- **Startup Management**: Register and manage startup profiles
- **User Profiles**: Manage user information and social features
- **Real-time Data**: JSON persistence with automatic saving

## 🚀 Getting Started

### Base URL
```
http://localhost:3000/api
```

### Health Check
```bash
GET /health
```

### Response Format
All API responses follow this structure:
```json
{
  "message": "Success message",
  "data": { ... },
  "pagination": { ... } // For paginated endpoints
}
```

### Error Format
```json
{
  "error": "Error Type",
  "message": "Human readable error message",
  "details": [ ... ] // For validation errors
}
```

## 🔐 Authentication

### Authentication Flow
1. **Signup/Login** → Get access token and refresh token
2. **Include Bearer token** in Authorization header for protected routes
3. **Refresh token** when access token expires
4. **Logout** to invalidate tokens

### Headers
```javascript
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

### Authentication Endpoints

#### User Signup
```javascript
POST /api/auth/signup
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@example.com",
  "password": "Password123!"
}

// Response
{
  "message": "User registered successfully",
  "user": { ... },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### User Login
```javascript
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "Password123!"
}

// Response
{
  "message": "Login successful",
  "user": { ... },
  "tokens": { ... }
}
```

#### Get User Profile
```javascript
GET /api/auth/me
Headers: { "Authorization": "Bearer <token>" }

// Response
{
  "user": {
    "id": "123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "profile": {
      "picture": null,
      "bio": null,
      "company": null,
      "socialLinks": {}
    }
  }
}
```

#### Refresh Token
```javascript
POST /api/auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Response
{
  "message": "Token refreshed successfully",
  "tokens": { ... }
}
```

#### Logout
```javascript
POST /api/auth/logout
Headers: { "Authorization": "Bearer <token>" }
```

## 💡 Ideation Platform

### Data Model
```typescript
interface Idea {
  id: string;
  title: string;
  description: string;
  projectDetails: string;
  industry: string;
  stage: string;
  teamMembers: TeamMember[];
  tags: string[];
  creator: {
    id: string;
    firstName: string;
    lastName: string;
  };
  status: 'active' | 'inactive';
  likes: number;
  views: number;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  name: string;
  position: string;
  skills: string[];
}
```

### Endpoints

#### Get All Ideas
```javascript
GET /api/ideation?page=1&limit=10&search=AI&category=Technology&sortBy=createdAt&sortOrder=desc

// Response
{
  "ideas": [ ... ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalIdeas": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Create Idea
```javascript
POST /api/ideation
Headers: { "Authorization": "Bearer <token>" }
{
  "title": "AI-Powered Learning Platform",
  "description": "An intelligent learning platform that adapts to individual learning styles",
  "projectDetails": "Detailed project information...",
  "industry": "Education",
  "stage": "Concept",
  "teamMembers": [
    {
      "name": "Sarah Wilson",
      "position": "AI Engineer",
      "skills": ["Machine Learning", "Python", "TensorFlow"]
    }
  ],
  "tags": ["AI", "Education", "Machine Learning"]
}
```

#### Get Specific Idea
```javascript
GET /api/ideation/:id

// Response
{
  "idea": {
    ...ideaData,
    "comments": [ ... ]
  }
}
```

#### Update Idea
```javascript
PUT /api/ideation/:id
Headers: { "Authorization": "Bearer <token>" }
{
  // Same structure as create idea
}
```

#### Delete Idea
```javascript
DELETE /api/ideation/:id
Headers: { "Authorization": "Bearer <token>" }
```

#### Add Comment to Idea
```javascript
POST /api/ideation/:id/comments
Headers: { "Authorization": "Bearer <token>" }
{
  "content": "This is a great idea! I love the innovation behind it."
}
```

#### Get Idea Comments
```javascript
GET /api/ideation/:id/comments?page=1&limit=20
```

#### Submit Suggestion
```javascript
POST /api/ideation/:id/suggestions
Headers: { "Authorization": "Bearer <token>" }
{
  "content": "Have you considered adding gamification elements?"
}
```

#### Get Predefined Data
```javascript
// Get industries
GET /api/ideation/industries

// Get stages
GET /api/ideation/stages

// Get skills
GET /api/ideation/skills

// Get available tags
GET /api/ideation/available-tags
```

## 📚 Knowledge Base

### Data Model
```typescript
interface KnowledgeResource {
  id: string;
  title: string;
  titleDescription: string;
  contentPreview: string;
  category: string;
  tags: string[];
  fileUrl: string | null;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  status: 'active' | 'inactive';
  views: number;
  downloads: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
}
```

### Endpoints

#### Get All Knowledge Resources
```javascript
GET /api/knowledge?page=1&limit=10&category=Technology&search=React

// Response
{
  "resources": [ ... ],
  "pagination": { ... }
}
```

#### Create Knowledge Resource
```javascript
POST /api/knowledge
Headers: { "Authorization": "Bearer <token>" }
{
  "title": "Complete Guide to React Development",
  "titleDescription": "A comprehensive guide covering React fundamentals",
  "contentPreview": "This guide covers everything from React basics...",
  "category": "Development",
  "tags": ["React", "JavaScript", "Frontend"],
  "fileUrl": "https://example.com/react-guide.pdf"
}
```

#### Get Specific Knowledge Resource
```javascript
GET /api/knowledge/:id

// Response
{
  "resource": {
    ...resourceData,
    "comments": [ ... ]
  }
}
```

#### Update Knowledge Resource
```javascript
PUT /api/knowledge/:id
Headers: { "Authorization": "Bearer <token>" }
```

#### Delete Knowledge Resource
```javascript
DELETE /api/knowledge/:id
Headers: { "Authorization": "Bearer <token>" }
```

#### File Upload
```javascript
POST /api/knowledge/upload
Headers: { "Authorization": "Bearer <token>" }
{
  "fileName": "document.pdf",
  "fileType": "pdf",
  "fileSize": 1024000
}

// Response
{
  "message": "File upload successful",
  "fileUrl": "/uploads/knowledge/1234567890-document.pdf",
  "fileName": "document.pdf",
  "fileType": "pdf",
  "fileSize": 1024000
}
```

#### Like/Unlike Resource
```javascript
POST /api/knowledge/:id/like
Headers: { "Authorization": "Bearer <token>" }

// Response
{
  "message": "Resource liked successfully",
  "liked": true,
  "likes": 5
}
```

#### Track Download
```javascript
POST /api/knowledge/:id/download
Headers: { "Authorization": "Bearer <token>" }
```

#### Get Predefined Categories
```javascript
GET /api/knowledge/predefined-categories

// Response
{
  "categories": [
    "Technology", "Business", "Marketing", "Design", 
    "Development", "Finance", "Healthcare", "Education"
  ]
}
```

#### Get Available Tags
```javascript
GET /api/knowledge/available-tags

// Response
{
  "tags": ["React", "JavaScript", "Python", "AI", "Machine Learning"]
}
```

## 🚀 Startup Management

### Data Model
```typescript
interface Startup {
  id: string;
  name: string;
  industry: string;
  location: string;
  description: string;
  stage: string;
  website: string;
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  founder: {
    id: string;
    firstName: string;
    lastName: string;
  };
  members: StartupMember[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface StartupMember {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  joinedAt: string;
}
```

### Endpoints

#### Get All Startups
```javascript
GET /api/startup?page=1&limit=10&industry=Technology&location=San Francisco

// Response
{
  "startups": [ ... ],
  "pagination": { ... }
}
```

#### Register Startup
```javascript
POST /api/startup/register
Headers: { "Authorization": "Bearer <token>" }
{
  "name": "TechFlow Solutions",
  "industry": "Technology",
  "location": "San Francisco, CA",
  "description": "We develop cutting-edge software solutions...",
  "stage": "Growth",
  "website": "https://techflow-solutions.com",
  "socialLinks": {
    "linkedin": "https://linkedin.com/company/techflow-solutions",
    "twitter": "https://twitter.com/techflowsol"
  }
}
```

#### Get Specific Startup
```javascript
GET /api/startup/:id

// Response
{
  "startup": {
    ...startupData,
    "joinRequests": [ ... ]
  }
}
```

#### Update Startup
```javascript
PUT /api/startup/:id
Headers: { "Authorization": "Bearer <token>" }
```

#### Delete Startup
```javascript
DELETE /api/startup/:id
Headers: { "Authorization": "Bearer <token>" }
```

#### Submit Join Request
```javascript
POST /api/startup/:id/join-request
Headers: { "Authorization": "Bearer <token>" }
{
  "message": "I'm interested in joining your startup as a developer."
}
```

#### Get Join Requests (Founder Only)
```javascript
GET /api/startup/:id/join-requests
Headers: { "Authorization": "Bearer <token>" }
```

#### Approve/Reject Join Request
```javascript
PUT /api/startup/:id/join-requests/:requestId
Headers: { "Authorization": "Bearer <token>" }
{
  "status": "approved" // or "rejected"
}
```

## 👤 User Profile & Content

### Data Models
```typescript
interface Story {
  id: string;
  caption: string;
  mediaUrl: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  expiresAt: string;
  createdAt: string;
}

interface Post {
  id: string;
  content: string;
  type: 'professional' | 'social';
  mediaUrl?: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  likes: number;
  comments: number;
  createdAt: string;
  updatedAt: string;
}
```

### Endpoints

#### Create Story
```javascript
POST /api/profile/stories
Headers: { "Authorization": "Bearer <token>" }
{
  "caption": "Just finished an amazing hackathon! 🚀",
  "mediaUrl": "https://example.com/hackathon-photo.jpg"
}
```

#### Get Stories
```javascript
GET /api/profile/stories
Headers: { "Authorization": "Bearer <token>" }
```

#### Create Post
```javascript
POST /api/profile/posts
Headers: { "Authorization": "Bearer <token>" }
{
  "content": "Excited to share our latest innovation! #Innovation #Tech",
  "type": "professional",
  "mediaUrl": "https://example.com/innovation-photo.jpg"
}
```

#### Get Posts
```javascript
GET /api/profile/posts?page=1&limit=10
Headers: { "Authorization": "Bearer <token>" }
```

#### Get Personalized Feed
```javascript
GET /api/profile/feed?page=1&limit=20
Headers: { "Authorization": "Bearer <token>" }
```

#### Like/Unlike Post
```javascript
POST /api/profile/:id/like
Headers: { "Authorization": "Bearer <token>" }
```

#### Add Comment to Post
```javascript
POST /api/profile/:id/comments
Headers: { "Authorization": "Bearer <token>" }
{
  "content": "Great post! Thanks for sharing."
}
```

## 🔔 Notifications

### Data Model
```typescript
interface Notification {
  id: string;
  type: 'comment' | 'like' | 'suggestion' | 'join_request' | 'system';
  title: string;
  message: string;
  data: any; // Additional data specific to notification type
  read: boolean;
  createdAt: string;
}
```

### Endpoints

#### Get Notifications
```javascript
GET /api/notifications?page=1&limit=20&unreadOnly=true
Headers: { "Authorization": "Bearer <token>" }
```

#### Get Unread Count
```javascript
GET /api/notifications/unread-count
Headers: { "Authorization": "Bearer <token>" }
```

#### Mark as Read
```javascript
PUT /api/notifications/:id/read
Headers: { "Authorization": "Bearer <token>" }
```

#### Mark All as Read
```javascript
PUT /api/notifications/read-all
Headers: { "Authorization": "Bearer <token>" }
```

#### Delete Notification
```javascript
DELETE /api/notifications/:id
Headers: { "Authorization": "Bearer <token>" }
```

## ⚠️ Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Error Response Examples

#### Validation Error
```json
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "invalid-email"
    }
  ]
}
```

#### Authentication Error
```json
{
  "error": "Access Token Required",
  "message": "No access token provided"
}
```

#### Not Found Error
```json
{
  "error": "Idea Not Found",
  "message": "Idea not found"
}
```

### Frontend Error Handling
```javascript
const handleApiError = (error) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 401:
        // Redirect to login or refresh token
        redirectToLogin();
        break;
      case 403:
        showError('You do not have permission to perform this action');
        break;
      case 404:
        showError('Resource not found');
        break;
      case 400:
        // Show validation errors
        if (data.details) {
          data.details.forEach(detail => {
            showFieldError(detail.field, detail.message);
          });
        }
        break;
      default:
        showError(data.message || 'An error occurred');
    }
  } else {
    showError('Network error. Please check your connection.');
  }
};
```

## 🎯 Best Practices

### 1. Token Management
```javascript
// Store tokens securely
const storeTokens = (tokens) => {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
};

// Auto-refresh token
const refreshTokenIfNeeded = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken) {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      
      if (response.ok) {
        const data = await response.json();
        storeTokens(data.tokens);
        return data.tokens.accessToken;
      }
    } catch (error) {
      // Redirect to login
      redirectToLogin();
    }
  }
  return null;
};
```

### 2. API Client Setup
```javascript
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('accessToken');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };
    
    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Try to refresh token
        const newToken = await refreshTokenIfNeeded();
        if (newToken) {
          config.headers['Authorization'] = `Bearer ${newToken}`;
          return fetch(url, config);
        }
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }
  
  async get(endpoint) {
    return this.request(endpoint);
  }
  
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }
}

const api = new ApiClient('http://localhost:3000/api');
```

### 3. Form Validation
```javascript
const validateIdeaForm = (data) => {
  const errors = {};
  
  if (!data.title || data.title.length < 5) {
    errors.title = 'Title must be at least 5 characters';
  }
  
  if (!data.description || data.description.length < 20) {
    errors.description = 'Description must be at least 20 characters';
  }
  
  if (!data.industry) {
    errors.industry = 'Industry is required';
  }
  
  if (!data.stage) {
    errors.stage = 'Stage is required';
  }
  
  if (data.teamMembers && data.teamMembers.length > 3) {
    errors.teamMembers = 'Maximum 3 team members allowed';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
```

### 4. Pagination Handling
```javascript
const usePagination = (fetchFunction) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  
  const fetchData = async (page = 1, filters = {}) => {
    setLoading(true);
    try {
      const response = await fetchFunction({ page, ...filters });
      const result = await response.json();
      
      setData(result.data || result.ideas || result.resources || result.startups);
      setPagination(result.pagination || {});
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };
  
  return { data, pagination, loading, fetchData };
};
```

### 5. Real-time Updates (Optional)
```javascript
// For future WebSocket implementation
const useWebSocket = (url) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      setConnected(true);
      setSocket(ws);
    };
    
    ws.onclose = () => {
      setConnected(false);
      setSocket(null);
    };
    
    return () => ws.close();
  }, [url]);
  
  return { socket, connected };
};
```

## 🧪 Testing

### Manual Testing with cURL
```bash
# Health check
curl http://localhost:3000/health

# User signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","password":"Password123!"}'

# User login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Password123!"}'

# Get ideas
curl http://localhost:3000/api/ideation

# Create idea (replace TOKEN with actual token)
curl -X POST http://localhost:3000/api/ideation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title":"My Idea","description":"Description","projectDetails":"Details","industry":"Technology","stage":"Concept","teamMembers":[],"tags":[]}'
```

### Frontend Testing
```javascript
// Mock API responses for testing
const mockApiResponses = {
  '/api/ideation': {
    ideas: [
      {
        id: '1',
        title: 'Test Idea',
        description: 'Test Description',
        industry: 'Technology',
        stage: 'Concept',
        teamMembers: [],
        tags: ['test'],
        creator: { id: '1', firstName: 'John', lastName: 'Doe' },
        likes: 0,
        views: 0,
        createdAt: new Date().toISOString()
      }
    ],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalIdeas: 1,
      hasNextPage: false,
      hasPrevPage: false
    }
  }
};

// Test utility
const testApiEndpoint = async (endpoint, expectedData) => {
  const response = await api.get(endpoint);
  const data = await response.json();
  
  expect(response.ok).toBe(true);
  expect(data).toMatchObject(expectedData);
};
```

## 🔧 Troubleshooting

### Common Issues

#### 1. CORS Errors
```javascript
// Ensure CORS is configured on backend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
```

#### 2. Token Expiration
```javascript
// Implement automatic token refresh
const apiRequest = async (url, options) => {
  let response = await fetch(url, options);
  
  if (response.status === 401) {
    const newToken = await refreshToken();
    if (newToken) {
      options.headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(url, options);
    }
  }
  
  return response;
};
```

#### 3. Network Errors
```javascript
// Implement retry logic
const retryRequest = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

#### 4. Data Persistence Issues
- All data is automatically saved to `./data/database.json`
- Check server logs for any file system errors
- Ensure the `data` directory has write permissions

### Debug Mode
```javascript
// Enable debug logging
const DEBUG = process.env.NODE_ENV === 'development';

const logApiCall = (method, url, data) => {
  if (DEBUG) {
    console.log(`API Call: ${method} ${url}`, data);
  }
};
```

## 📚 Additional Resources

### Environment Variables
```bash
# .env file
PORT=3000
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
NODE_ENV=development
```

### Rate Limiting
- Default: 100 requests per 15 minutes per IP
- Configured in server.js
- Returns 429 status code when exceeded

### File Upload Limits
- Maximum file size: 50MB
- Allowed types: PDF, DOC, images, videos
- Files stored in `/uploads/` directory

### Data Backup
- JSON file: `./data/database.json`
- Backup regularly for production use
- Consider database migration for production

## 🚀 Getting Started Checklist

- [ ] Start the backend server: `npm start`
- [ ] Verify health check: `curl http://localhost:3000/health`
- [ ] Test user signup/login endpoints
- [ ] Implement authentication flow in frontend
- [ ] Test CRUD operations for each module
- [ ] Implement error handling
- [ ] Add loading states and user feedback
- [ ] Test pagination and search functionality
- [ ] Implement file upload for knowledge resources
- [ ] Test real-time features (if applicable)

## 📞 Support

For questions or issues:
1. Check the server logs for error details
2. Verify API endpoint URLs and request formats
3. Ensure proper authentication headers
4. Check network connectivity and CORS settings
5. Review the JSON data file for data integrity

---

**Happy Coding! 🎉**

This API is designed to be developer-friendly with comprehensive error messages, consistent response formats, and automatic data persistence. The JSON-based storage makes it perfect for development and testing, with easy migration to a production database when ready.
