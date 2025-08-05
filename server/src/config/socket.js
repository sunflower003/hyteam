const socketIo = require("socket.io")
const jwt = require("jsonwebtoken")
const { saveMessage } = require("../controllers/messageController")
const ChatMessage = require("../models/ChatMessage")
const Conversation = require("../models/Conversation")
const User = require("../models/User")

const rooms = new Map()
const userSockets = new Map() // Track user's socket connections
const onlineUsers = new Set() // Track online users

const initializeSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: ["http://localhost:3000", "http://localhost:5173", "https://hyteam.onrender.com"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  })

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace("Bearer ", "")

      if (!token) {
        return next(new Error("Authentication error: No token provided"))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select("-password")

      if (!user) {
        return next(new Error("Authentication error: User not found"))
      }

      socket.userId = user._id.toString()
      socket.user = user
      next()
    } catch (error) {
      console.error("Socket authentication error:", error)
      next(new Error("Authentication error"))
    }
  })

  io.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.user.username} (${socket.userId})`)

    // Join user to their personal room
    socket.join(`user_${socket.userId}`)

    // Handle user going online
    socket.emit("connected", {
      message: "Connected to chat server",
      userId: socket.userId,
    })

    // Broadcast user online status
    socket.broadcast.emit("user-online", {
      userId: socket.userId,
      username: socket.user.username,
    })

    // Join conversation room
    socket.on("join-conversation", (conversationId) => {
      console.log(`👥 User ${socket.user.username} joined conversation: ${conversationId}`)
      socket.join(`conversation_${conversationId}`)

      // Notify others in the conversation
      socket.to(`conversation_${conversationId}`).emit("user-joined-conversation", {
        userId: socket.userId,
        username: socket.user.username,
        conversationId,
      })
    })

    // Leave conversation room
    socket.on("leave-conversation", (conversationId) => {
      console.log(`👋 User ${socket.user.username} left conversation: ${conversationId}`)
      socket.leave(`conversation_${conversationId}`)

      // Notify others in the conversation
      socket.to(`conversation_${conversationId}`).emit("user-left-conversation", {
        userId: socket.userId,
        username: socket.user.username,
        conversationId,
      })
    })

    // Handle sending private messages
    socket.on("send-message", async (data) => {
      try {
        console.log(`💬 Message from ${socket.user.username}:`, data)

        const { conversationId, content, messageType = "text", replyTo } = data

        if (!content || !content.trim()) {
          socket.emit("error", { message: "Message content is required" })
          return
        }

        // Create message in database
        const message = await ChatMessage.create({
          conversationId,
          sender: socket.userId,
          content: content.trim(),
          messageType,
          replyTo: replyTo || null,
        })

        await message.populate("sender", "username avatar")
        if (replyTo) {
          await message.populate("replyTo")
        }

        // Update conversation
        const conversation = await Conversation.findById(conversationId).populate(
          "participants.user",
          "username avatar",
        )

        if (conversation) {
          conversation.lastMessage = message._id
          conversation.lastActivity = new Date()

          // Update unread count for other participants
          conversation.participants.forEach((participant) => {
            if (participant.user._id.toString() !== socket.userId) {
              const participantId = participant.user._id.toString()
              const currentCount = conversation.unreadCount.get(participantId) || 0
              conversation.unreadCount.set(participantId, currentCount + 1)
            }
          })

          await conversation.save()

          // Emit to conversation room
          io.to(`conversation_${conversationId}`).emit("new-message", {
            message,
            conversationId,
          })

          // Emit conversation update to participants
          conversation.participants.forEach((participant) => {
            if (participant.user._id.toString() !== socket.userId) {
              io.to(`user_${participant.user._id}`).emit("conversation-updated", {
                conversationId,
                lastMessage: message,
                lastActivity: conversation.lastActivity,
                unreadCount: conversation.unreadCount.get(participant.user._id.toString()) || 0,
              })
            }
          })
        }

        console.log(`✅ Message sent successfully: ${message._id}`)
      } catch (error) {
        console.error("❌ Send message error:", error)
        socket.emit("error", { message: "Failed to send message" })
      }
    })

    // Handle typing indicators
    socket.on("typing-start", (data) => {
      const { conversationId } = data
      socket.to(`conversation_${conversationId}`).emit("user-typing", {
        userId: socket.userId,
        username: socket.user.username,
        conversationId,
      })
    })

    socket.on("typing-stop", (data) => {
      const { conversationId } = data
      socket.to(`conversation_${conversationId}`).emit("user-stop-typing", {
        userId: socket.userId,
        username: socket.user.username,
        conversationId,
      })
    })

    // Handle message reactions
    socket.on("add-reaction", async (data) => {
      try {
        const { messageId, emoji } = data

        const message = await ChatMessage.findById(messageId)

        if (!message) {
          socket.emit("error", { message: "Message not found" })
          return
        }

        // Add reaction logic here
        if (!message.reactions) {
          message.reactions = new Map()
        }

        const userReactions = message.reactions.get(socket.userId) || []
        if (!userReactions.includes(emoji)) {
          userReactions.push(emoji)
          message.reactions.set(socket.userId, userReactions)
          await message.save()

          // Emit to conversation
          io.to(`conversation_${message.conversationId}`).emit("reaction-added", {
            messageId,
            userId: socket.userId,
            emoji,
            conversationId: message.conversationId,
          })
        }
      } catch (error) {
        console.error("Add reaction error:", error)
        socket.emit("error", { message: "Failed to add reaction" })
      }
    })

    // Message read status
    socket.on("message-read", async (data) => {
      try {
        const { conversationId, messageId } = data

        // Mark message as read
        await ChatMessage.findByIdAndUpdate(messageId, {
          $push: { readBy: { user: socket.userId } },
        })

        // Notify sender
        socket.to(`conversation_${conversationId}`).emit("message-read-update", {
          messageId,
          readBy: socket.userId,
        })
      } catch (error) {
        console.error("Error marking message as read:", error)
      }
    })

    // Movie Room functionality (giữ nguyên từ code cũ)
    socket.on("join-room", (roomData) => {
      const { roomId, user } = roomData
      socket.join(roomId)

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set())
      }

      // Thêm user với trường inVoiceChat
      rooms.get(roomId).add({
        socketId: socket.id,
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        isSpeaking: false,
        isMuted: false,
        inVoiceChat: false, // Thêm field này
      })

      // Thong bao cho cac user khac trong phong
      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        inVoiceChat: false,
      })

      const roomUsers = Array.from(rooms.get(roomId))
      io.to(roomId).emit("room-users", roomUsers)

      console.log(`User ${user.username} joined room ${roomId}`)
    })

    // leave room event
    socket.on("leave-room", (roomId) => {
      socket.leave(roomId)

      if (rooms.has(roomId)) {
        const roomUsers = rooms.get(roomId)
        // Xoa user khoi room
        for (const roomUser of roomUsers) {
          if (roomUser.socketId === socket.id) {
            roomUsers.delete(roomUser)
            break
          }
        }

        if (roomUsers.size === 0) {
          rooms.delete(roomId)
        } else {
          socket.to(roomId).emit("user-left", socket.id)
          const updatedUsers = Array.from(roomUsers)
          io.to(roomId).emit("room-users", updatedUsers)
        }
      }
    })

    // Voice Chat Events - NEW
    socket.on("join-voice-chat", (data) => {
      const { roomId, user } = data
      console.log(`User ${user.username} joining voice chat in room ${roomId}`)

      if (rooms.has(roomId)) {
        const roomUsers = rooms.get(roomId)

        // Update user's voice status
        for (const roomUser of roomUsers) {
          if (roomUser.socketId === socket.id) {
            roomUser.inVoiceChat = true
            roomUser.isMuted = false
            roomUser.isSpeaking = false
            break
          }
        }

        // Notify others that user joined voice
        socket.to(roomId).emit("user-joined-voice", {
          socketId: socket.id,
          userId: user.id,
          username: user.username,
          avatar: user.avatar,
        })

        // Send updated users list
        const updatedUsers = Array.from(roomUsers)
        io.to(roomId).emit("room-users", updatedUsers)

        console.log(`User ${user.username} joined voice chat successfully`)
      }
    })

    socket.on("leave-voice-chat", (data) => {
      const { roomId, user } = data
      console.log(`User ${user.id} leaving voice chat in room ${roomId}`)

      if (rooms.has(roomId)) {
        const roomUsers = rooms.get(roomId)

        // Update user's voice status
        for (const roomUser of roomUsers) {
          if (roomUser.socketId === socket.id) {
            roomUser.inVoiceChat = false
            roomUser.isMuted = false
            roomUser.isSpeaking = false
            break
          }
        }

        // Notify others that user left voice
        socket.to(roomId).emit("user-left-voice", {
          socketId: socket.id,
          userId: user.id,
        })

        // Send updated users list
        const updatedUsers = Array.from(roomUsers)
        io.to(roomId).emit("room-users", updatedUsers)

        console.log(`User ${user.id} left voice chat successfully`)
      }
    })

    // WebRTC signaling cho voice chat
    socket.on("sending-signal", (payload) => {
      console.log("Sending signal from ", payload.callerID, "to", payload.userToSignal)
      // Gui tin hieu den nguoi dung duoc goi
      io.to(payload.userToSignal).emit("receiving-signal", {
        signal: payload.signal,
        callerID: payload.callerID,
      })
    })

    socket.on("returning-signal", (payload) => {
      console.log("Returning signal to", payload.callerID)
      // Gui tin hieu tro lai nguoi goi
      io.to(payload.callerID).emit("signal-received", {
        signal: payload.signal,
        id: socket.id,
      })
    })

    // Voice chat events - Discord style
    socket.on("toggle-mute", (data) => {
      const { roomId, isMuted } = data

      if (rooms.has(roomId)) {
        const roomUsers = rooms.get(roomId)
        for (const user of roomUsers) {
          if (user.socketId === socket.id) {
            user.isMuted = isMuted
            break
          }
        }

        // Thong bao trang thai mute cho tat ca users
        socket.to(roomId).emit("user-mute-changed", {
          socketId: socket.id,
          isMuted,
        })

        const updatedUsers = Array.from(roomUsers)
        io.to(roomId).emit("room-users", updatedUsers)
      }
    })

    socket.on("speaking-state", (data) => {
      const { roomId, isSpeaking } = data

      if (rooms.has(roomId)) {
        const roomUsers = rooms.get(roomId)
        for (const user of roomUsers) {
          if (user.socketId === socket.id) {
            user.isSpeaking = isSpeaking
            break
          }
        }

        // Thong bao trang thai speaking cho tat ca users
        socket.to(roomId).emit("user-speaking-changed", {
          socketId: socket.id,
          isSpeaking,
        })
      }
    })

    // Chat message event - luu vao Database
    socket.on("chat-message", async (data) => {
      const { roomId, message } = data
      console.log("Chat message in room", roomId, ":", message)

      try {
        // Luu tin nhan vao Database
        const savedMessage = await saveMessage({
          roomId,
          user: message.user.id,
          message: message.message,
          messageType: "text",
        })

        if (savedMessage) {
          // Format message de gui qua socket
          const messageToSend = {
            id: savedMessage._id,
            user: {
              id: savedMessage.user._id,
              username: savedMessage.user.username,
              avatar: savedMessage.user.avatar,
            },
            message: savedMessage.message,
            timestamp: savedMessage.createdAt,
            edited: savedMessage.edited,
          }
          // Gui tin nhan den tat ca nguoi dung trong phong
          io.to(roomId).emit("chat-message", messageToSend)
          console.log(`Message sent to room ${roomId}:`, messageToSend)
        } else {
          // neu khong luu duoc, van gui message tam thoi
          io.to(roomId).emit("chat-message", message)
        }
      } catch (error) {
        console.error("Error handling chat message:", error)
        // Fallback: gui message khong luu DB
        io.to(roomId).emit("chat-message", message)
      }
    })

    //Movie selection event
    socket.on("movie-selected", (data) => {
      const { roomId, movie } = data
      console.log("Movie selected in room", roomId, ":", movie.title)

      // Thong bao phim moi den tat car user trong phong
      socket.to(roomId).emit("movie-changed", movie)
    })

    // Disconnect event
    socket.on("disconnect", (reason) => {
      console.log(`🔌 User disconnected: ${socket.user.username} (${reason})`)

      // Broadcast user offline status
      socket.broadcast.emit("user-offline", {
        userId: socket.userId,
        username: socket.user.username,
      })

      // Remove from movie rooms (giữ nguyên logic cũ)
      for (const [roomId, users] of rooms.entries()) {
        for (const roomUser of users) {
          if (roomUser.socketId === socket.id) {
            // Nếu user đang trong voice chat, thông báo leave voice
            if (roomUser.inVoiceChat) {
              socket.to(roomId).emit("user-left-voice", {
                socketId: socket.id,
                userId: roomUser.userId,
              })
            }

            users.delete(roomUser)
            socket.to(roomId).emit("user-left", socket.id)

            if (users.size === 0) {
              rooms.delete(roomId)
            } else {
              const roomUsers = Array.from(users)
              io.to(roomId).emit("room-users", roomUsers)
            }
            break
          }
        }
      }
    })
  })

  return io
}

module.exports = { initializeSocket }
