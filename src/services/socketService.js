const socketIo = require("socket.io");
const { v4: uuidv4 } = require("uuid");

class SocketService {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
        serveClient: false,
        maxHttpBufferSize: 100e6, // 100MB
        pingTimeout: 60000, // 60 seconds
      },
    });

    // Connection tracking
    this.connectedUsers = new Map(); // userId -> socket
    this.userRooms = new Map(); // userId -> Set of roomIds
    this.unreadMessages = new Map(); // userId -> Set of messageIds
    this.userStatus = new Map(); // userId -> status ('online', 'away', 'offline')
    this.typingUsers = new Map(); // roomId -> Set of userIds
    this.messages = new Map(); // roomId -> Array of messages (for in-memory storage)

    this.setupEventHandlers();
  }

  // Main event handlers setup
  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`New connection: ${socket.id}`);

      // Set user handler - now the first thing that happens
      socket.on("setUser", (userId) => {
        if (!userId) {
          console.error("setUser failed: No userId provided", {
            socketId: socket.id,
          });
          return;
        }
        console.log(`Received setUser for userId: ${userId}`);
        socket.userId = userId;
        this.connectedUsers.set(userId, socket);
        socket.join(userId);

        if (!this.unreadMessages.has(userId)) {
          this.unreadMessages.set(userId, new Set());
        }

        // Initialize user status
        this.userStatus.set(userId, "online");

        // Notify others
        socket.broadcast.emit("userOnline", userId);

        // Send initial data
        socket.emit("connection:established", {
          userId,
          onlineUsers: this.getOnlineUsers(),
          unreadCount: this.unreadMessages.get(userId).size,
        });

        // Emit initial online status to the connected user
        socket.emit(
          "initialOnlineStatus",
          Array.from(this.connectedUsers.keys())
        );

        console.log(`User ${userId} connected via setUser`);
      });

      // Core event handlers
      this.handleChatEvents(socket);
      this.handlePresenceEvents(socket);

      // Disconnection handler
      socket.on("disconnect", () => {
        this.handleDisconnection(socket);
      });

      // Error handling
      socket.on("error", (error) => {
        console.error(`Socket error from ${socket.id}:`, error);
      });
    });
  }

  // Simplified disconnection handler
  handleDisconnection(socket) {
    if (!socket.userId) return;

    const userId = socket.userId;

    // Update tracking
    this.connectedUsers.delete(userId);
    this.userStatus.set(userId, "offline");

    // Notify others
    this.io.emit("user:offline", { userId });
    socket.broadcast.emit("userOffline", userId);

    console.log(`User disconnected: ${userId}`);
  }

  // Chat event handlers - simplified version without database
  handleChatEvents(socket) {
    // Direct messaging - from first system, modified for in-memory storage
    socket.on("sendMessage", (message, callback) => {
      try {
        const userId = socket.userId;
        if (!userId) throw new Error("User not identified");
        if (!message.recipientId) throw new Error("No recipient specified");

        const fullMessage = {
          id: `msg_${uuidv4()}`,
          senderId: userId,
          recipientId: message.recipientId,
          content: message.content,
          file: message.file || null,
          timestamp: new Date().toISOString(),
          status: "delivered",
          isRead: false,
        };

        // Store message in memory (grouped by recipient)
        if (!this.messages.has(message.recipientId)) {
          this.messages.set(message.recipientId, []);
        }
        this.messages.get(message.recipientId).push(fullMessage);

        // Track unread messages
        if (this.connectedUsers.has(message.recipientId)) {
          this.unreadMessages.get(message.recipientId).add(fullMessage.id);
          this.io.to(message.recipientId).emit("unreadCountUpdate", {
            count: this.unreadMessages.get(message.recipientId).size,
          });
        }

        // Deliver message if recipient is online
        if (this.connectedUsers.has(message.recipientId)) {
          this.io.to(message.recipientId).emit("newMessage", fullMessage);
        }

        if (typeof callback === "function") {
          callback({ status: "success", message: fullMessage });
        }
      } catch (err) {
        console.error("Message error:", err);
        if (typeof callback === "function") {
          callback({ status: "error", message: err.message });
        }
      }
    });

    // Read receipts - from first system
    socket.on("markAsRead", (messageIds, callback) => {
      try {
        const userId = socket.userId;
        if (!userId) throw new Error("User not identified");

        const userUnread = this.unreadMessages.get(userId) || new Set();

        messageIds.forEach((id) => userUnread.delete(id));

        this.io.to(userId).emit("unreadCountUpdate", {
          count: userUnread.size,
        });

        if (typeof callback === "function") {
          callback({ status: "success" });
        }
      } catch (err) {
        console.error("Mark as read error:", err);
        if (typeof callback === "function") {
          callback({ status: "error", message: err.message });
        }
      }
    });

    // Get message history (for when client reconnects)
    socket.on("getMessageHistory", (recipientId, callback) => {
      if (typeof callback === "function") {
        callback({
          status: "success",
          messages: this.messages.get(recipientId) || [],
        });
      }
    });
  }

  // Presence status handlers (simplified)
  handlePresenceEvents(socket) {
    socket.on("setStatus", (status) => {
      const userId = socket.userId;
      if (!userId) return;

      this.userStatus.set(userId, status);
      this.io.emit("userStatusChanged", { userId, status });
    });

    socket.on("requestOnlineUsers", (callback) => {
      if (typeof callback === "function") {
        callback(this.getOnlineUsers());
      }
    });
  }

  // Utility methods
  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys()).map((userId) => ({
      userId,
      status: this.userStatus.get(userId) || "online",
    }));
  }

  // Notification system (simplified)
  sendNotification(userId, notification) {
    const notificationWithId = {
      ...notification,
      id: `notif_${uuidv4()}`,
      timestamp: new Date().toISOString(),
    };

    this.io
      .to(`notifications_${userId}`)
      .emit("newNotification", notificationWithId);
  }
}

module.exports = SocketService;
// Authentication logic was removed due to the fact that the authentication was done as of the time of this development
// New implementations can be added here this includes notification and the rest.
// Cheers
