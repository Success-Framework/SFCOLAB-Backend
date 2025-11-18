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
const { router: messageRoutes } = require("./routes/message");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

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

  // Log blocked origins
  if (!allowedOrigins.includes(requestOrigin)) {
    console.warn("Blocked CORS request from:", requestOrigin);
  }

  // Set CORS options safely
  const isAllowed = allowedOrigins.includes(requestOrigin);

  const corsOptions = {
    origin: isAllowed,
    credentials: isAllowed,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 204,
  };

  callback(null, corsOptions);
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
app.use("/api/message", messageRoutes);

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

    // Web socket connection
    io.on("connection", (socket) => {
      console.log(`🟢 User connected: ${socket.user.userId}`);

      // Join user-specific room
      socket.join(socket.user.userId);
      console.log(`User ${socket.user.userId} joined their room`);

      // MARK USER ONLINE FOR MESSAGING
      const { onlineUsers } = require("./routes/message");
      onlineUsers.set(socket.user.userId, socket.id);

      // Notify others this user is online
      socket.broadcast.emit("userOnline", socket.user.userId);

      // Send current online users to this client
      const onlineUserIds = Array.from(onlineUsers.keys());
      socket.emit("initialOnlineStatus", onlineUserIds);

      // MESSAGING EVENT HANDLERS
      socket.on("sendMessage", async (data, callback) => {
        try {
          const { recipientId, content, file, senderName, tempId } = data;
          const userId = socket.user.userId;

          if (!recipientId) {
            return callback?.({
              status: "error",
              message: "Recipient ID is required",
            });
          }

          const Message = require("./models/schemas");
          const newMessage = new Message({
            senderId: userId,
            recipientId,
            content: content || "",
            file: file || null,
            messageType: file
              ? file.isVoiceNote
                ? "voice_note"
                : "file"
              : "text",
            status: "sent",
            isRead: false,
          });

          const savedMessage = await newMessage.save();

          const messageResponse = {
            id: `msg_${savedMessage._id}`,
            senderId: savedMessage.senderId,
            recipientId: savedMessage.recipientId,
            content: savedMessage.content,
            file: savedMessage.file,
            timestamp: savedMessage.timestamp,
            status: savedMessage.status,
            isRead: savedMessage.isRead,
          };

          // Send to recipient if online
          const recipientSocketId = onlineUsers.get(recipientId);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit("newMessage", {
              ...messageResponse,
              isOwn: false,
            });
          }

          // Send success response to sender
          callback?.({
            status: "success",
            message: {
              ...messageResponse,
              isOwn: true,
              id: tempId || `msg_${savedMessage._id}`,
            },
          });

          console.log(`💌 Message sent from ${userId} to ${recipientId}`);
        } catch (error) {
          console.error("Error sending message:", error);
          callback?.({ status: "error", message: "Failed to send message" });
        }
      });

      // Mark messages as read
      socket.on("markAsRead", async (messageIds, callback) => {
        try {
          const Message = require("./models/schemas");
          const mongoIds = messageIds.map((id) => id.replace("msg_", ""));

          await Message.updateMany(
            {
              _id: { $in: mongoIds },
              recipientId: socket.user.userId,
            },
            {
              isRead: true,
              status: "read",
            }
          );

          // Notify senders
          const messages = await Message.find({ _id: { $in: mongoIds } });
          const senders = [...new Set(messages.map((msg) => msg.senderId))];

          senders.forEach((senderId) => {
            const senderSocketId = onlineUsers.get(senderId);
            if (senderSocketId) {
              Message.countDocuments({
                senderId: senderId,
                recipientId: socket.user.userId,
                isRead: false,
              }).then((count) => {
                io.to(senderSocketId).emit("unreadCountUpdate", { count });
              });
            }
          });

          callback?.({ status: "success" });
        } catch (error) {
          console.error("Error marking messages as read:", error);
          callback?.({ status: "error" });
        }
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`🔴 User disconnected: ${socket.user.userId}`);

        onlineUsers.delete(socket.user.userId);
        socket.broadcast.emit("userOffline", socket.user.userId); // Broadcasts offline status to other users
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
