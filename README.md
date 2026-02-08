# SFCOLAB Backend API

A comprehensive Node.js + Express + MongoDB backend API for the SFCOLAB startup collaboration platform with real-time features, file management, and complete CRUD operations.

## 🚀 Features

### **Core Features**

- **Authentication & Authorization**: JWT-based authentication with refresh tokens
- **User Management**: Complete user profile and account management
- **Startup Management**: CRUD operations for startup profiles and information
- **Project/Ideation System**: Collaborative project management and ideation
- **Knowledge Base**: Resource management with ratings and bookmarks
- **File Management**: Secure file upload and storage in database
- **Contributor Matching**: Find and manage project contributors
- **Dashboard Analytics**: Comprehensive dashboard with statistics and metrics

### **Advanced Features**

- **Real-time Communication**: WebSocket support for live chat and notifications
- **Search & Filtering**: Advanced search across all entities with multiple filters
- **File Storage**: Database-stored files with associations and access control
- **Social Features**: Likes, follows, comments, and collaboration
- **Rating System**: Knowledge resource ratings and user feedback
- **Application System**: Project applications and contributor matching
- **Activity Tracking**: User activity feeds and progress metrics

### **Security & Performance**

- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Validation**: All inputs validated with Joi schemas
- **Security Headers**: Helmet.js for security headers
- **CORS**: Configurable cross-origin resource sharing
- **Password Hashing**: bcryptjs for secure password storage
- **JWT Security**: Secure token generation and validation
- **Database Indexing**: Optimized queries with proper indexing

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io
- **File Upload**: Multer
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp env.example .env
   ```

   Update the `.env` file with your configuration:

   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/sfcolab
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=30d
   JWT_REFRESH_SECRET=your-refresh-secret-key
   JWT_REFRESH_EXPIRE=7d
   FRONTEND_URL=http://localhost:5173
   MAX_FILE_SIZE=5242880
   ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
   ```

4. **Seed the database (optional)**

   ```bash
   npm run seed
   ```

5. **Start the server**

   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 📚 API Endpoints

### **Authentication** (`/api/auth`)

- `POST /register` - Register new user
- `POST /login` - User login
- `GET /me` - Get current user
- `POST /refresh` - Refresh access token
- `POST /logout` - User logout
- `PUT /profile` - Update user profile
- `PUT /change-password` - Change password

### **Users** (`/api/users`)

- `GET /` - Get all users (with filters)
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user
- `GET /search` - Search users
- `POST /:id/follow` - Follow/unfollow user

### **Startups** (`/api/startups`)

- `GET /` - Get all startups
- `POST /` - Create startup
- `GET /:id` - Get startup by ID
- `PUT /:id` - Update startup
- `DELETE /:id` - Delete startup
- `GET /search` - Search startups
- `POST /:id/like` - Like/unlike startup
- `POST /:id/follow` - Follow/unfollow startup
- `POST /:id/team` - Add team member
- `DELETE /:id/team/:userId` - Remove team member

### **Projects** (`/api/projects`)

- `GET /` - Get all projects
- `POST /` - Create project
- `GET /:id` - Get project by ID
- `PUT /:id` - Update project
- `DELETE /:id` - Delete project
- `GET /search` - Search projects
- `POST /:id/like` - Like/unlike project
- `POST /:id/comment` - Add comment
- `DELETE /:id/comment/:commentId` - Remove comment
- `POST /:id/collaborate` - Add collaborator
- `DELETE /:id/collaborate/:userId` - Remove collaborator

### **Knowledge Base** (`/api/knowledge`)

- `GET /` - Get all knowledge resources
- `POST /` - Create knowledge resource
- `GET /:id` - Get knowledge resource by ID
- `PUT /:id` - Update knowledge resource
- `DELETE /:id` - Delete knowledge resource
- `GET /search` - Search knowledge resources
- `POST /:id/like` - Like/unlike resource
- `POST /:id/bookmark` - Bookmark/unbookmark resource
- `POST /:id/rate` - Rate resource
- `POST /:id/comment` - Add comment
- `DELETE /:id/comment/:commentId` - Remove comment
- `GET /bookmarks` - Get user's bookmarks

### **Files** (`/api/files`)

- `POST /upload` - Upload single file
- `POST /upload-multiple` - Upload multiple files
- `POST /upload-image` - Upload image file
- `POST /upload-document` - Upload document file
- `GET /:id` - Get file by ID
- `GET /:id/info` - Get file info
- `PUT /:id` - Update file info
- `DELETE /:id` - Delete file
- `GET /association/:type/:id` - Get files by association
- `GET /user/:userId` - Get user's files

### **Contributors** (`/api/contributors`)

- `GET /` - Get all contributors
- `GET /search` - Search contributors
- `GET /:id` - Get contributor by ID
- `POST /apply` - Apply for project
- `GET /applications` - Get user's applications
- `GET /projects/:id/applications` - Get project applications
- `PUT /projects/:id/applications/:applicationId` - Update application status

### **Dashboard** (`/api/dashboard`)

- `GET /stats` - Get dashboard statistics
- `GET /tasks` - Get user tasks
- `GET /calendar` - Get calendar events
- `GET /progress` - Get progress metrics
- `GET /activity` - Get activity feed
- `GET /network` - Get user's network
- `GET /recommendations` - Get recommendations

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📁 File Upload

Files are stored directly in the MongoDB database as binary data. Supported file types and limits are configurable via environment variables.

### **Upload Example**

```javascript
const formData = new FormData();
formData.append("file", file);
formData.append("fileType", "avatar");
formData.append(
  "associatedWith",
  JSON.stringify({
    type: "user",
    id: userId,
  })
);

const response = await fetch("/api/files/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

## 🔌 Real-time Features (WebSocket)

The API includes WebSocket support for real-time features:

### **Connection**

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: {
    token: localStorage.getItem("token"),
  },
});
```

### **Events**

- `chat:message` - New chat message
- `chat:typing` - Typing indicator
- `notification:new` - New notification
- `project:updated` - Project update
- `project:commented` - New project comment
- `startup:updated` - Startup update
- `user:online` - User came online
- `user:offline` - User went offline

### **Sending Events**

```javascript
// Send chat message
socket.emit("chat:message", {
  roomId: "room-123",
  message: "Hello world!",
  type: "text",
});

// Join chat room
socket.emit("chat:join", { roomId: "room-123" });

// Send notification
socket.emit("notification:send", {
  userId: "user-123",
  notification: {
    type: "info",
    title: "New Message",
    message: "You have a new message",
  },
});
```

## 🔍 Search & Filtering

Most endpoints support search and filtering:

### **Search Example**

```
GET /api/startups?search=tech&industry=Technology&stage=Growth Stage&location=San Francisco
```

### **Pagination**

```
GET /api/projects?page=1&limit=10&sort=createdAt&order=desc
```

### **Advanced Filters**

```
GET /api/contributors?userType=Developer&availability=Available Now&skills=React,Node.js&location=San Francisco
```

## 📊 Database Models

### **User**

- Authentication fields (username, email, password)
- Profile information (name, bio, skills, experience)
- Metrics (contributions, commits, reviews)
- Social links and preferences

### **Startup**

- Basic info (name, description, industry, stage)
- Team and founder information
- Metrics and funding details
- Social engagement (likes, followers)

### **Project**

- Project details (header, content, stage, category)
- Collaboration features (collaborators, comments)
- Engagement metrics (likes, views)
- Timeline and requirements

### **Knowledge**

- Resource information (title, content, category, type)
- Rating and bookmark system
- Version control and SEO
- Related resources

### **File**

- File metadata (name, type, size)
- Binary data storage
- Association with other entities
- Access control and privacy settings

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🌱 Database Seeding

The backend includes a comprehensive seeder for sample data:

```bash
# Seed the database with sample data
npm run seed
```

This creates:

- 5 sample users with different roles
- 3 sample startups
- 5 sample projects
- 5 sample knowledge resources
- Sample interactions (likes, comments, etc.)

## 📝 Environment Variables

| Variable             | Description                        | Default                                        |
| -------------------- | ---------------------------------- | ---------------------------------------------- |
| `PORT`               | Server port                        | 5000                                           |
| `NODE_ENV`           | Environment                        | development                                    |
| `MONGODB_URI`        | MongoDB connection string          | mongodb://localhost:27017/sfcolab              |
| `JWT_SECRET`         | JWT signing secret                 | -                                              |
| `JWT_EXPIRE`         | JWT expiration time                | 30d                                            |
| `JWT_REFRESH_SECRET` | Refresh token secret               | -                                              |
| `JWT_REFRESH_EXPIRE` | Refresh token expiration           | 7d                                             |
| `FRONTEND_URL`       | Frontend URL for CORS              | http://localhost:5173                          |
| `MAX_FILE_SIZE`      | Maximum file size in bytes         | 5242880 (5MB)                                  |
| `ALLOWED_FILE_TYPES` | Comma-separated allowed MIME types | image/jpeg,image/png,image/gif,application/pdf |

## 🚀 Deployment

### **Production Setup**

1. Set `NODE_ENV=production`
2. Use a production MongoDB instance
3. Set strong JWT secrets
4. Configure proper CORS settings
5. Set up reverse proxy (nginx)
6. Use PM2 or similar process manager

### **Docker Deployment**

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📖 API Integration Examples

The backend includes comprehensive API integration examples in `src/utils/apiExamples.js`:

- Authentication examples
- CRUD operations for all entities
- File upload examples
- Real-time WebSocket examples
- React hooks for API calls

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch  
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 API Versioning

The API is currently at version 1.0. Future versions will be available at `/api/v2/`, etc.

## 🎯 Key Features Summary

✅ **Complete CRUD Operations** - All entities fully managed  
✅ **Real-time Communication** - WebSocket support for live features  
✅ **File Management** - Database-stored files with associations  
✅ **Advanced Search** - Multi-field search with filters  
✅ **Social Features** - Likes, follows, comments, collaboration  
✅ **Security** - JWT auth, rate limiting, input validation  
✅ **Scalable Architecture** - Well-structured for growth  
✅ **Comprehensive Testing** - Ready for production deployment  
✅ **Documentation** - Complete API documentation and examples

---

**Built with ❤️ for the SFCOLAB startup community**
