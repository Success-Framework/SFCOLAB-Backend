const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const { connectMongo } = require("./db/mongoose");
const authRoutes = require("./routes/auth");
const ideationRoutes = require("./routes/ideation");
const startupRoutes = require("./routes/startup");
const knowledgeRoutes = require("./routes/knowledge");
const settingsRoutes = require("./routes/settings");
const { router: notificationRoutes } = require("./routes/notifications");
const profileRoutes = require("./routes/profile");

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://bright-bunny-ceef3b.netlify.app",
  "https://yourdomain.com",
];

const corsOptionsDelegate = (req, callback) => {
  const requestOrigin = req.header("Origin");

  if (allowedOrigins.includes(requestOrigin)) {
    callback(null, {
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    });
  } else {
    callback(new Error("Not allowed by CORS"));
  }
};

app.use(cors(corsOptionsDelegate));
app.options("*", cors(corsOptionsDelegate));

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files
app.use("/uploads", express.static("uploads"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "SFCollab Backend is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/ideation", ideationRoutes);
app.use("/api/startup", startupRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/profile", profileRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      message: err.message,
      details: err.errors,
    });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
  }

  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// Connect to MongoDB then start server
(async () => {
  try {
    const conn = await connectMongo();
    console.log(`🗄️  MongoDB connected: ${conn.host}`);

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Socket.IO authentication middleware
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Unauthorized: Token missing"));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        next(new Error("Unauthorized: Invalid or expired token"));
      }
    });

    // Socket.IO setup
    io.on("connection", (socket) => {
      console.log(`🟢 User connected: ${socket.user.id}`);

      // Join user-specific room
      socket.join(socket.user.id);
      console.log(`User ${socket.user.id} joined their room`);

      // Example: sending notification to specific user
      socket.on("sendNotification", (data) => {
        const { receiverId, message } = data;
        io.to(receiverId).emit("receiveNotification", {
          message,
          timestamp: new Date(),
        });
      });

      socket.on("disconnect", () => {
        console.log(`🔴 User disconnected: ${socket.id}`);
      });
    });

    // Make `io` accessible globally in routes
    app.set("io", io);

    server.listen(PORT, () => {
      console.log(`🚀 SFCollab Backend server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
})();

module.exports = app;
