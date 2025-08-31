# SFCollab Backend

A comprehensive backend API for the SFCollab platform built with Node.js, Express.js, and JWT authentication.

## 🚀 Features

### Authentication System
- **User Registration & Login**: Secure user authentication with JWT tokens
- **Password Management**: Secure password hashing with bcrypt
- **Token Management**: Access and refresh token system
- **Google OAuth**: Integration ready (implementation pending)
- **Session Management**: Secure session handling

### Ideation Platform
- **Idea Management**: Create, read, update, delete ideas
- **Comments System**: Full CRUD operations for idea comments
- **Suggestions**: Users can suggest improvements to ideas
- **Search & Filtering**: Advanced search with pagination
- **Categories & Tags**: Organized idea management

### Startup Management
- **Startup Registration**: Complete startup profile creation
- **Member Management**: Handle join requests and approvals
- **Startup Discovery**: Browse and search startups
- **Role-based Access**: Founder and member permissions

### Knowledge Base
- **Resource Management**: Upload and manage knowledge resources
- **File Handling**: Support for various file types
- **Engagement Tracking**: Views, downloads, and likes
- **Comment System**: Discussion on knowledge resources
- **Category Organization**: Structured knowledge management

### User Settings & Profile
- **Profile Management**: Update personal information and bio
- **Account Security**: Password and email management
- **Preferences**: Customizable user preferences
- **Notification Settings**: Granular notification control

### Content Management
- **Stories**: 24-hour ephemeral content
- **Posts**: Professional and social content sharing
- **Feed System**: Personalized content aggregation
- **Engagement**: Likes, comments, and sharing

### Notification System
- **Real-time Notifications**: Various notification types
- **Smart Filtering**: Unread/read status management
- **Bulk Operations**: Mark all as read, clear read notifications

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Authentication**: JWT, Passport.js
- **Security**: bcrypt, helmet, CORS
- **Validation**: express-validator
- **Rate Limiting**: express-rate-limit
- **File Upload**: Multer (ready for implementation)

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL (for future database integration)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SFCOLAB-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret_key_here
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Verify installation**
   ```bash
   curl http://localhost:3000/health
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### User Registration
```http
POST /auth/signup
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### User Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Token Refresh
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### Ideation Endpoints

#### Create Idea
```http
POST /ideation
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Innovative Startup Idea",
  "description": "A detailed description of the idea...",
  "category": "Technology",
  "tags": ["AI", "SaaS", "Innovation"]
}
```

#### Get Ideas
```http
GET /ideation?page=1&limit=10&category=Technology&search=AI
```

#### Add Comment
```http
POST /ideation/{ideaId}/comments
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "content": "Great idea! Have you considered..."
}
```

### Startup Endpoints

#### Register Startup
```http
POST /startup/register
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "TechStartup Inc",
  "industry": "Technology",
  "location": "San Francisco, CA",
  "description": "Innovative tech solutions...",
  "stage": "Seed",
  "roles": ["Developer", "Designer", "Marketing"]
}
```

#### Get Startups
```http
GET /startup?page=1&limit=10&industry=Technology&location=San Francisco
```

#### Submit Join Request
```http
POST /startup/{startupId}/join-request
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "message": "I'm interested in joining your team...",
  "role": "Developer"
}
```

### Knowledge Endpoints

#### Add Resource
```http
POST /knowledge
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Guide to Startup Success",
  "description": "Comprehensive guide for entrepreneurs...",
  "category": "Business",
  "fileUrl": "https://example.com/file.pdf",
  "tags": ["startup", "business", "guide"]
}
```

#### Get Resources
```http
GET /knowledge?page=1&limit=10&category=Business&search=startup
```

#### Like Resource
```http
POST /knowledge/{resourceId}/like
Authorization: Bearer <access_token>
```

### Profile & Content Endpoints

#### Create Story
```http
POST /profile/stories
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Exciting news!",
  "type": "image"
}
```

#### Create Post
```http
POST /profile/posts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "content": "Just launched our new product!",
  "type": "professional",
  "tags": ["launch", "product", "excited"]
}
```

#### Get Feed
```http
GET /profile/feed?page=1&limit=15
Authorization: Bearer <access_token>
```

### Settings Endpoints

#### Update Profile
```http
PUT /settings/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Passionate entrepreneur...",
  "company": "TechStartup Inc"
}
```

#### Change Password
```http
POST /settings/account/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!"
}
```

#### Update Preferences
```http
PUT /settings/preferences
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "emailNotifications": true,
  "pushNotifications": false,
  "theme": "dark",
  "language": "en"
}
```

### Notification Endpoints

#### Get Notifications
```http
GET /notifications?page=1&limit=20&status=unread
Authorization: Bearer <access_token>
```

#### Mark as Read
```http
PUT /notifications/{notificationId}/read
Authorization: Bearer <access_token>
```

#### Mark All as Read
```http
PUT /notifications/read-all
Authorization: Bearer <access_token>
```

## 🔐 Authentication

All protected endpoints require a valid JWT access token in the Authorization header:

```http
Authorization: Bearer <access_token>
```

### Token Types
- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

### Token Refresh Flow
1. When access token expires, use refresh token to get new tokens
2. Send refresh token to `/auth/refresh` endpoint
3. Receive new access and refresh tokens
4. Continue with new access token

## 📊 Response Format

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... },
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error Response
```json
{
  "error": "Error Type",
  "message": "Human readable error message",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "value": "invalid-email"
    }
  ]
}
```

## 🚧 Development Notes

### Current Implementation
- **Mock Data**: All data is currently stored in memory arrays
- **Database Ready**: Code structure is prepared for PostgreSQL integration
- **File Upload**: Multer middleware is configured but not fully implemented
- **Google OAuth**: Routes are set up but strategy implementation is pending

### Future Enhancements
- Database integration with PostgreSQL
- File upload service (AWS S3, Google Cloud Storage)
- Email service integration
- Real-time notifications with WebSockets
- Advanced search with Elasticsearch
- Caching with Redis
- API rate limiting per user
- Comprehensive logging and monitoring

### Testing
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable salt rounds
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Configurable rate limiting per IP
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet Security**: Various HTTP security headers
- **Input Sanitization**: Protection against injection attacks

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_REFRESH_SECRET` | JWT refresh secret | Required |
| `JWT_EXPIRES_IN` | Access token expiry | 15m |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | 7d |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Required |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Required |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |
| `SESSION_SECRET` | Session secret | Required |
| `MAX_FILE_SIZE` | Max file upload size | 10485760 (10MB) |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v1.0.0**: Initial release with core functionality
  - Authentication system
  - Ideation platform
  - Startup management
  - Knowledge base
  - User settings
  - Content management
  - Notification system

---

**Note**: This is a development version. Database integration and production deployment configurations will be added in future releases.
