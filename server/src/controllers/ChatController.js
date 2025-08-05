const User = require("../models/User")
const Conversation = require("../models/Conversation")
const ChatMessage = require("../models/ChatMessage")
const { createResponse } = require("../utils/response")

// Tìm kiếm users để start chat
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query
    const currentUserId = req.user.id

    console.log("🔍 Search users request:", { query, currentUserId })

    if (!query || query.trim().length < 2) {
      return res.status(400).json(createResponse(false, [], "Query must be at least 2 characters"))
    }

    const searchTerm = query.trim()

    // Tìm users theo username hoặc email, loại trừ current user
    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [{ username: { $regex: searchTerm, $options: "i" } }, { email: { $regex: searchTerm, $options: "i" } }],
    })
      .select("username email avatar isActive lastLogin")
      .limit(10)
      .sort({ username: 1 })

    console.log(`✅ Found ${users.length} users for query: ${searchTerm}`)

    // Format response data
    const formattedUsers = users.map((user) => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    }))

    res.json(createResponse(true, formattedUsers, `Found ${users.length} users`))
  } catch (error) {
    console.error("❌ Search users error:", error)
    res.status(500).json(createResponse(false, [], "Server error while searching users"))
  }
}

// Lấy danh sách conversations của user
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id

    console.log("📋 Getting conversations for user:", userId)

    const conversations = await Conversation.find({
      "participants.user": userId,
      isActive: { $ne: false },
    })
      .populate("participants.user", "username avatar email")
      .populate("lastMessage")
      .sort({ lastActivity: -1 })
      .limit(50)

    console.log(`✅ Found ${conversations.length} conversations`)

    // Format data cho frontend
    const formattedConversations = conversations.map((conv) => {
      const otherParticipant = conv.participants.find((p) => p.user && p.user._id.toString() !== userId)

      return {
        _id: conv._id,
        type: conv.type,
        name: conv.type === "group" ? conv.name : otherParticipant?.user?.username || "Unknown User",
        avatar: conv.type === "group" ? conv.avatar : otherParticipant?.user?.avatar,
        lastMessage: conv.lastMessage,
        lastActivity: conv.lastActivity || conv.createdAt,
        unreadCount: conv.unreadCount ? conv.unreadCount.get(userId) || 0 : 0,
        participants: conv.participants,
      }
    })

    res.json(createResponse(true, formattedConversations, "Conversations retrieved successfully"))
  } catch (error) {
    console.error("❌ Get conversations error:", error)
    res.status(500).json(createResponse(false, [], "Server error while fetching conversations"))
  }
}

// Tạo hoặc lấy conversation giữa 2 users
const createOrGetPrivateConversation = async (req, res) => {
  try {
    const userId = req.user.id
    const { targetUserId } = req.body

    console.log("💬 Create/get conversation:", { userId, targetUserId })

    if (!targetUserId) {
      return res.status(400).json(createResponse(false, null, "Target user ID is required"))
    }

    if (userId === targetUserId) {
      return res.status(400).json(createResponse(false, null, "Cannot create conversation with yourself"))
    }

    // Kiểm tra target user tồn tại
    const targetUser = await User.findById(targetUserId).select("username avatar email")
    if (!targetUser) {
      return res.status(404).json(createResponse(false, null, "Target user not found"))
    }

    console.log("👤 Target user found:", targetUser.username)

    // Tìm conversation hiện tại
    let conversation = await Conversation.findOne({
      type: "private",
      "participants.user": { $all: [userId, targetUserId] },
    }).populate("participants.user", "username avatar email")

    if (!conversation) {
      console.log("➕ Creating new conversation")

      // Tạo conversation mới
      conversation = await Conversation.create({
        type: "private",
        participants: [{ user: userId }, { user: targetUserId }],
        lastActivity: new Date(),
      })

      await conversation.populate("participants.user", "username avatar email")
      console.log("✅ New conversation created:", conversation._id)
    } else {
      console.log("✅ Existing conversation found:", conversation._id)
    }

    // Format cho frontend
    const otherParticipant = conversation.participants.find((p) => p.user && p.user._id.toString() !== userId)

    const formattedConversation = {
      _id: conversation._id,
      type: conversation.type,
      name: otherParticipant?.user?.username || "Unknown User",
      avatar: otherParticipant?.user?.avatar,
      lastMessage: conversation.lastMessage,
      lastActivity: conversation.lastActivity || conversation.createdAt,
      unreadCount: conversation.unreadCount ? conversation.unreadCount.get(userId) || 0 : 0,
      participants: conversation.participants,
    }

    res.json(createResponse(true, formattedConversation, "Conversation created/retrieved successfully"))
  } catch (error) {
    console.error("❌ Create/get conversation error:", error)
    res.status(500).json(createResponse(false, null, "Server error while creating conversation"))
  }
}

// Lấy messages của conversation
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id
    const { conversationId } = req.params
    const { page = 1, limit = 50 } = req.query

    console.log("📨 Getting messages:", { userId, conversationId, page, limit })

    // Kiểm tra user có quyền xem conversation không
    const conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.user": userId,
    })

    if (!conversation) {
      return res.status(404).json(createResponse(false, null, "Conversation not found or access denied"))
    }

    const messages = await ChatMessage.find({
      conversationId,
      isDeleted: { $ne: true },
    })
      .populate("sender", "username avatar")
      .populate("replyTo")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    // Đảo ngược để hiển thị từ cũ đến mới
    messages.reverse()

    console.log(`✅ Found ${messages.length} messages`)

    // Đánh dấu messages là đã đọc
    await ChatMessage.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        "readBy.user": { $ne: userId },
      },
      {
        $push: { readBy: { user: userId, readAt: new Date() } },
      },
    )

    // Reset unread count
    if (conversation.unreadCount && conversation.unreadCount.has(userId)) {
      conversation.unreadCount.set(userId, 0)
      await conversation.save()
    }

    res.json(
      createResponse(
        true,
        {
          messages,
          hasMore: messages.length === limit,
        },
        "Messages retrieved successfully",
      ),
    )
  } catch (error) {
    console.error("❌ Get messages error:", error)
    res.status(500).json(createResponse(false, null, "Server error while fetching messages"))
  }
}

// Gửi message
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id
    const { conversationId, content, messageType = "text", replyTo } = req.body

    console.log("📤 Send message:", { userId, conversationId, content: content?.substring(0, 50) + "...", messageType })

    if (!content || !content.trim()) {
      return res.status(400).json(createResponse(false, null, "Message content is required"))
    }

    if (!conversationId) {
      return res.status(400).json(createResponse(false, null, "Conversation ID is required"))
    }

    // Kiểm tra conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.user": userId,
    }).populate("participants.user", "username avatar")

    if (!conversation) {
      return res.status(404).json(createResponse(false, null, "Conversation not found"))
    }

    // Tạo message mới
    const message = await ChatMessage.create({
      conversationId,
      sender: userId,
      content: content.trim(),
      messageType,
      replyTo: replyTo || null,
    })

    await message.populate("sender", "username avatar")
    if (replyTo) {
      await message.populate("replyTo")
    }

    console.log("✅ Message created:", message._id)

    // Cập nhật conversation
    conversation.lastMessage = message._id
    conversation.lastActivity = new Date()

    // Tăng unread count cho các participants khác
    conversation.participants.forEach((participant) => {
      if (participant.user._id.toString() !== userId) {
        const currentCount = conversation.unreadCount
          ? conversation.unreadCount.get(participant.user._id.toString()) || 0
          : 0
        if (!conversation.unreadCount) {
          conversation.unreadCount = new Map()
        }
        conversation.unreadCount.set(participant.user._id.toString(), currentCount + 1)
      }
    })

    await conversation.save()

    // Emit socket event for real-time
    const io = req.app.get("io")
    if (io) {
      // Emit to conversation room
      io.to(`conversation_${conversationId}`).emit("new-message", {
        message,
        conversationId,
      })

      // Emit conversation update to participants
      conversation.participants.forEach((participant) => {
        if (participant.user._id.toString() !== userId) {
          io.to(`user_${participant.user._id}`).emit("conversation-updated", {
            conversationId,
            lastMessage: message,
            lastActivity: conversation.lastActivity,
            unreadCount: conversation.unreadCount.get(participant.user._id.toString()) || 0,
          })
        }
      })
    }

    res.json(createResponse(true, message, "Message sent successfully"))
  } catch (error) {
    console.error("❌ Send message error:", error)
    res.status(500).json(createResponse(false, null, "Server error while sending message"))
  }
}

// Get conversation info
const getConversationInfo = async (req, res) => {
  try {
    const userId = req.user.id
    const { conversationId } = req.params

    console.log("ℹ️ Get conversation info:", { userId, conversationId })

    const conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.user": userId,
    }).populate("participants.user", "username avatar email isActive lastLogin")

    if (!conversation) {
      return res.status(404).json(createResponse(false, null, "Conversation not found"))
    }

    // Format cho frontend
    const otherParticipant = conversation.participants.find((p) => p.user._id.toString() !== userId)

    const formattedConversation = {
      _id: conversation._id,
      type: conversation.type,
      name: conversation.type === "group" ? conversation.name : otherParticipant?.user.username,
      avatar: conversation.type === "group" ? conversation.avatar : otherParticipant?.user.avatar,
      lastMessage: conversation.lastMessage,
      lastActivity: conversation.lastActivity,
      unreadCount: conversation.unreadCount ? conversation.unreadCount.get(userId) || 0 : 0,
      participants: conversation.participants,
      isActive: conversation.isActive,
      createdAt: conversation.createdAt,
    }

    res.json(createResponse(true, formattedConversation, "Conversation info retrieved successfully"))
  } catch (error) {
    console.error("❌ Get conversation info error:", error)
    res.status(500).json(createResponse(false, null, "Server error"))
  }
}

// Đánh dấu messages đã đọc
const markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.user.id
    const { conversationId } = req.params

    console.log("👁️ Mark messages as read:", { userId, conversationId })

    // Kiểm tra quyền truy cập
    const conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.user": userId,
    })

    if (!conversation) {
      return res.status(404).json(createResponse(false, null, "Conversation not found"))
    }

    // Đánh dấu tất cả messages chưa đọc là đã đọc
    await ChatMessage.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        "readBy.user": { $ne: userId },
      },
      {
        $push: { readBy: { user: userId, readAt: new Date() } },
      },
    )

    // Reset unread count
    if (conversation.unreadCount && conversation.unreadCount.has(userId)) {
      conversation.unreadCount.set(userId, 0)
      await conversation.save()
    }

    res.json(createResponse(true, null, "Messages marked as read"))
  } catch (error) {
    console.error("❌ Mark messages as read error:", error)
    res.status(500).json(createResponse(false, null, "Server error while marking messages as read"))
  }
}

module.exports = {
  getConversations,
  createOrGetPrivateConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  searchUsers,
  getConversationInfo,
}
