const express = require("express");
const { User, Message } = require("../models/schemas");

const router = express.Router();

// Stores the online users in memory
const onlineUsers = new Map();

// Get contacts with last messages
router.get("/contacts", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ status: "error", message: "User ID is required" });
    }

    // Get unique contacts from messages
    const contacts = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { recipientId: userId }
          ]
        }
      },
      {
        $group: {
          _id: null,
          contacts: {
            $addToSet: {
              $cond: [
                { $eq: ["$senderId", userId] },
                "$recipientId",
                "$senderId"
              ]
            }
          }
        }
      }
    ]);

    const contactIds = contacts.length > 0 ? contacts[0].contacts : [];

    // Get contact details
    const contactsWithDetails = await Promise.all(
      contactIds.map(async (contactId) => {
        const user = await User.findOne({ userId: contactId }).catch(() => null);
        
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: userId, recipientId: contactId },
            { senderId: contactId, recipientId: userId }
          ]
        }).sort({ timestamp: -1 });

        const unreadCount = await Message.countDocuments({
          senderId: contactId,
          recipientId: userId,
          isRead: false
        });

        return {
          id: contactId,
          name: user?.name || `User ${contactId}`,
          avatar: user?.avatar || "",
          status: onlineUsers.has(contactId) ? "online" : "offline",
          isOnline: onlineUsers.has(contactId),
          lastMessage: lastMessage?.content || (lastMessage?.file ? "File" : ""),
          unreadCount
        };
      })
    );

    // Sort by last message time
    contactsWithDetails.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp) : new Date(0);
      const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp) : new Date(0);
      return bTime - aTime;
    });

    res.json({ status: "success", contacts: contactsWithDetails });
  } catch (error) {
    console.error("Error getting contacts:", error);
    res.status(500).json({ status: "error", message: "Failed to get contacts" });
  }
});

// Get message and Contact list
router.get("/history", async (req, res) => {
  try {
    const { userId, contactId } = req.query;

    if (!userId || !contactId) {
      return res.status(400).json({ 
        status: "error", 
        message: "User ID and Contact ID are required" 
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, recipientId: contactId },
        { senderId: contactId, recipientId: userId }
      ]
    }).sort({ timestamp: 1 });

    const formattedMessages = messages.map(msg => ({
      id: `msg_${msg._id}`,
      senderId: msg.senderId,
      recipientId: msg.recipientId,
      content: msg.content,
      file: msg.file,
      timestamp: msg.timestamp,
      status: msg.status,
      isRead: msg.isRead,
      isOwn: msg.senderId === userId
    }));

    res.json({ status: "success", messages: formattedMessages });
  } catch (error) {
    console.error("Error getting message history:", error);
    res.status(500).json({ status: "error", message: "Failed to get messages" });
  }
});

module.exports = {
  router,
  onlineUsers
};