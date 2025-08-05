const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const { protect } = require("../middleware/auth")
const {
  getConversations,
  createOrGetPrivateConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  searchUsers,
  getConversationInfo,
} = require("../controllers/chatController")

// Debug middleware to log all chat requests
router.use((req, res, next) => {
  console.log(`🔥 Chat Route: ${req.method} ${req.originalUrl}`, {
    body: req.body,
    query: req.query,
    headers: req.headers.authorization ? "Bearer ***" : "No auth",
  })
  next()
})

// Protect all routes
router.use(protect)

// User search routes
router.get("/users/search", searchUsers)

// Conversation routes
router.get("/conversations", getConversations)
router.post("/conversations", createOrGetPrivateConversation)
router.get("/conversations/:conversationId", getConversationInfo)
router.get("/conversations/:conversationId/messages", getMessages)
router.post("/conversations/:conversationId/read", markMessagesAsRead)

// Message routes
router.post("/messages", sendMessage)

// Delete conversation (soft delete)
router.delete("/conversations/:conversationId", async (req, res) => {
  try {
    const userId = req.user.id
    const { conversationId } = req.params

    const Conversation = require("../models/Conversation")
    const conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.user": userId,
    })

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" })
    }

    // Mark as deleted for this user only
    conversation.participants.forEach((participant) => {
      if (participant.user.toString() === userId) {
        participant.isDeleted = true
      }
    })

    await conversation.save()

    res.json({ success: true, message: "Conversation deleted" })
  } catch (error) {
    console.error("Delete conversation error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Delete specific message
router.delete("/messages/:messageId", async (req, res) => {
  try {
    const userId = req.user.id
    const { messageId } = req.params

    const ChatMessage = require("../models/ChatMessage")
    const message = await ChatMessage.findOne({
      _id: messageId,
      sender: userId,
    })

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found or unauthorized" })
    }

    // Soft delete
    message.isDeleted = true
    message.deletedAt = new Date()
    await message.save()

    // Emit socket event
    const io = req.app.get("io")
    if (io) {
      io.to(`conversation_${message.conversationId}`).emit("message-deleted", {
        messageId,
        conversationId: message.conversationId,
      })
    }

    res.json({ success: true, message: "Message deleted" })
  } catch (error) {
    console.error("Delete message error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Edit message
router.put("/messages/:messageId", async (req, res) => {
  try {
    const userId = req.user.id
    const { messageId } = req.params
    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Content is required" })
    }

    const ChatMessage = require("../models/ChatMessage")
    const message = await ChatMessage.findOne({
      _id: messageId,
      sender: userId,
      isDeleted: false,
    })

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found or unauthorized" })
    }

    // Check if message is older than 24 hours
    const hoursDiff = (new Date() - message.createdAt) / (1000 * 60 * 60)
    if (hoursDiff > 24) {
      return res.status(400).json({ success: false, message: "Cannot edit messages older than 24 hours" })
    }

    message.content = content.trim()
    message.isEdited = true
    message.editedAt = new Date()
    await message.save()

    await message.populate("sender", "username avatar")

    // Emit socket event
    const io = req.app.get("io")
    if (io) {
      io.to(`conversation_${message.conversationId}`).emit("message-edited", {
        message,
        conversationId: message.conversationId,
      })
    }

    res.json({
      success: true,
      data: message,
      message: "Message updated",
    })
  } catch (error) {
    console.error("Edit message error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Get online users in conversation
router.get("/conversations/:conversationId/online", async (req, res) => {
  try {
    const userId = req.user.id
    const { conversationId } = req.params

    const Conversation = require("../models/Conversation")
    const conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.user": userId,
    }).populate("participants.user", "username avatar isActive lastLogin")

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" })
    }

    // Get online users from socket (if available)
    const io = req.app.get("io")
    const onlineUsers = []

    if (io) {
      conversation.participants.forEach((participant) => {
        const participantId = participant.user._id.toString()
        if (participantId !== userId) {
          // Check if user is connected to socket
          const isOnline = Array.from(io.sockets.sockets.values()).some((socket) => socket.userId === participantId)

          if (isOnline) {
            onlineUsers.push(participant.user)
          }
        }
      })
    }

    res.json({
      success: true,
      data: onlineUsers,
      message: "Online users retrieved",
    })
  } catch (error) {
    console.error("Get online users error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Invalid file type"))
    }
  },
})

// Upload file/image for chat
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" })
    }

    // Here you would upload to cloud storage (AWS S3, Cloudinary, etc.)
    // For now, just return a mock URL
    const fileUrl = `/uploads/chat/${Date.now()}_${req.file.originalname}`

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
      message: "File uploaded successfully",
    })
  } catch (error) {
    console.error("Upload file error:", error)
    res.status(500).json({ success: false, message: "Upload failed" })
  }
})

// Test route to verify routing is working
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Chat routes are working!",
    user: req.user ? req.user.username : "No user",
  })
})

module.exports = router
