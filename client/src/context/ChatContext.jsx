"use client"

import { createContext, useContext, useReducer, useEffect, useRef } from "react"
import { useAuth } from "./AuthContext"
import io from "socket.io-client"
import api from "../utils/api"

const ChatContext = createContext()

const chatReducer = (state, action) => {
  switch (action.type) {
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.payload }

    case "ADD_CONVERSATION":
      return {
        ...state,
        conversations: [action.payload, ...state.conversations.filter((c) => c._id !== action.payload._id)],
      }

    case "UPDATE_CONVERSATION":
      return {
        ...state,
        conversations: state.conversations.map((conv) =>
          conv._id === action.payload.conversationId
            ? {
                ...conv,
                lastMessage: action.payload.lastMessage,
                lastActivity: action.payload.lastActivity,
                unreadCount: action.payload.unreadCount,
              }
            : conv,
        ),
      }

    case "SET_ACTIVE_CONVERSATION":
      return { ...state, activeConversation: action.payload }

    case "SET_MESSAGES":
      return { ...state, messages: action.payload }

    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      }

    case "UPDATE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((msg) => (msg._id === action.payload._id ? action.payload : msg)),
      }

    case "DELETE_MESSAGE":
      return {
        ...state,
        messages: state.messages.filter((msg) => msg._id !== action.payload),
      }

    case "SET_TYPING_USERS":
      return { ...state, typingUsers: action.payload }

    case "SET_ONLINE_USERS":
      return { ...state, onlineUsers: action.payload }

    case "SET_LOADING":
      return { ...state, loading: action.payload }

    case "SET_SOCKET":
      return { ...state, socket: action.payload }

    case "SET_ERROR":
      return { ...state, error: action.payload }

    default:
      return state
  }
}

const initialState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  typingUsers: [],
  onlineUsers: new Set(),
  loading: false,
  socket: null,
  error: null,
}

export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const { user } = useAuth()
  const socketRef = useRef(null)

  // Initialize socket connection
  useEffect(() => {
    if (!user?.id) return

    const token = localStorage.getItem("token")
    if (!token) return

    const socketURL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"
    console.log("🔌 Connecting to socket:", socketURL)

    const socket = io(socketURL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: {
        token: token,
      },
    })

    socketRef.current = socket
    dispatch({ type: "SET_SOCKET", payload: socket })

    socket.on("connect", () => {
      console.log("✅ Chat socket connected")
    })

    socket.on("connected", (data) => {
      console.log("🎉 Socket authenticated:", data)
    })

    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error)
      dispatch({ type: "SET_ERROR", payload: "Không thể kết nối đến server chat" })
    })

    // Listen for new messages
    socket.on("new-message", (data) => {
      console.log("📨 New message received:", data)
      dispatch({ type: "ADD_MESSAGE", payload: data.message })
    })

    // Listen for message edits
    socket.on("message-edited", (data) => {
      console.log("✏️ Message edited:", data)
      dispatch({ type: "UPDATE_MESSAGE", payload: data.message })
    })

    // Listen for message deletions
    socket.on("message-deleted", (data) => {
      console.log("🗑️ Message deleted:", data)
      dispatch({ type: "DELETE_MESSAGE", payload: data.messageId })
    })

    // Listen for conversation updates
    socket.on("conversation-updated", (data) => {
      console.log("🔄 Conversation updated:", data)
      dispatch({ type: "UPDATE_CONVERSATION", payload: data })
    })

    // Listen for typing indicators
    socket.on("user-typing", (data) => {
      if (data.userId !== user.id) {
        dispatch({
          type: "SET_TYPING_USERS",
          payload: [...state.typingUsers.filter((username) => username !== data.username), data.username],
        })
      }
    })

    socket.on("user-stop-typing", (data) => {
      dispatch({
        type: "SET_TYPING_USERS",
        payload: state.typingUsers.filter((username) => username !== data.username),
      })
    })

    // Listen for online status changes
    socket.on("user-online", (data) => {
      const newOnlineUsers = new Set(state.onlineUsers)
      newOnlineUsers.add(data.userId)
      dispatch({ type: "SET_ONLINE_USERS", payload: newOnlineUsers })
    })

    socket.on("user-offline", (data) => {
      const newOnlineUsers = new Set(state.onlineUsers)
      newOnlineUsers.delete(data.userId)
      dispatch({ type: "SET_ONLINE_USERS", payload: newOnlineUsers })
    })

    // Handle errors
    socket.on("error", (error) => {
      console.error("🚨 Socket error:", error)
      dispatch({ type: "SET_ERROR", payload: error.message || "Socket error occurred" })
    })

    return () => {
      console.log("🔌 Disconnecting socket")
      socket.disconnect()
      socketRef.current = null
      dispatch({ type: "SET_SOCKET", payload: null })
    }
  }, [user?.id])

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      dispatch({ type: "SET_ERROR", payload: null })

      console.log("📋 Fetching conversations...")
      const response = await api.get("/api/chats/conversations")

      console.log("✅ Conversations response:", response.data)

      if (response.data.success) {
        dispatch({ type: "SET_CONVERSATIONS", payload: response.data.data })
      } else {
        throw new Error(response.data.message || "Failed to fetch conversations")
      }
    } catch (error) {
      console.error("❌ Error fetching conversations:", error)
      dispatch({ type: "SET_ERROR", payload: "Không thể tải danh sách cuộc trò chuyện" })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  // Search users
  const searchUsers = async (query) => {
    try {
      if (!query || query.trim().length < 2) {
        return []
      }

      console.log("🔍 Searching users with query:", query)
      const response = await api.get(`/api/chats/users/search?query=${encodeURIComponent(query.trim())}`)
      console.log("✅ Search response:", response.data)

      if (response.data.success) {
        return response.data.data || []
      } else {
        console.error("❌ Search failed:", response.data.message)
        throw new Error(response.data.message || "Search failed")
      }
    } catch (error) {
      console.error("❌ Error searching users:", error)
      if (error.response) {
        console.error("Response error:", error.response.data)
        throw new Error(error.response.data.message || "Không thể tìm kiếm người dùng")
      }
      throw new Error("Lỗi kết nối khi tìm kiếm người dùng")
    }
  }

  // Create or get conversation
  const createOrGetConversation = async (targetUserId) => {
    try {
      if (!targetUserId) {
        throw new Error("Target user ID is required")
      }

      console.log("💬 Creating/getting conversation with user:", targetUserId)

      const response = await api.post("/api/chats/conversations", {
        targetUserId,
      })

      console.log("✅ Create conversation response:", response.data)

      if (response.data.success) {
        const conversation = response.data.data

        // Add to conversations list if not exists
        const existingConv = state.conversations.find((c) => c._id === conversation._id)
        if (!existingConv) {
          dispatch({ type: "ADD_CONVERSATION", payload: conversation })
        }

        return conversation
      } else {
        throw new Error(response.data.message || "Failed to create conversation")
      }
    } catch (error) {
      console.error("❌ Error creating conversation:", error)
      if (error.response) {
        console.error("Response error:", error.response.data)
        throw new Error(error.response.data.message || "Không thể tạo cuộc trò chuyện")
      }
      throw new Error("Lỗi kết nối khi tạo cuộc trò chuyện")
    }
  }

  // Set active conversation and join room
  const setActiveConversation = async (conversation) => {
    try {
      if (state.activeConversation && socketRef.current) {
        // Leave previous conversation room
        socketRef.current.emit("leave-conversation", state.activeConversation._id)
      }

      dispatch({ type: "SET_ACTIVE_CONVERSATION", payload: conversation })

      if (conversation && socketRef.current) {
        // Join new conversation room
        socketRef.current.emit("join-conversation", conversation._id)

        // Fetch messages
        await fetchMessages(conversation._id)
      } else if (!conversation) {
        // Clear messages when no conversation is selected
        dispatch({ type: "SET_MESSAGES", payload: [] })
      }
    } catch (error) {
      console.error("❌ Error setting active conversation:", error)
      dispatch({ type: "SET_ERROR", payload: "Không thể tải cuộc trò chuyện" })
    }
  }

  // Fetch messages
  const fetchMessages = async (conversationId) => {
    try {
      console.log("📨 Fetching messages for conversation:", conversationId)

      const response = await api.get(`/api/chats/conversations/${conversationId}/messages`)

      console.log("✅ Messages response:", response.data)

      if (response.data.success) {
        dispatch({ type: "SET_MESSAGES", payload: response.data.data.messages || [] })
      } else {
        throw new Error(response.data.message || "Failed to fetch messages")
      }
    } catch (error) {
      console.error("❌ Error fetching messages:", error)
      dispatch({ type: "SET_ERROR", payload: "Không thể tải tin nhắn" })
    }
  }

  // Send message
  const sendMessage = async (content, replyTo = null, conversationId = state.activeConversation?._id) => {
    if (!content.trim() || !conversationId) {
      throw new Error("Content and conversation ID are required")
    }

    try {
      const messageData = {
        conversationId,
        content: content.trim(),
        messageType: "text",
        replyTo,
      }

      console.log("📤 Sending message:", messageData)

      // Send via socket for real-time
      if (socketRef.current) {
        socketRef.current.emit("send-message", messageData)
      } else {
        throw new Error("Socket connection not available")
      }
    } catch (error) {
      console.error("❌ Error sending message:", error)
      throw error
    }
  }

  // Typing indicators
  const startTyping = () => {
    if (state.activeConversation && socketRef.current) {
      socketRef.current.emit("typing-start", {
        conversationId: state.activeConversation._id,
      })
    }
  }

  const stopTyping = () => {
    if (state.activeConversation && socketRef.current) {
      socketRef.current.emit("typing-stop", {
        conversationId: state.activeConversation._id,
      })
    }
  }

  // Clear error
  const clearError = () => {
    dispatch({ type: "SET_ERROR", payload: null })
  }

  const value = {
    ...state,
    fetchConversations,
    createOrGetConversation,
    setActiveConversation,
    sendMessage,
    searchUsers,
    startTyping,
    stopTyping,
    clearError,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChat must be used within ChatProvider")
  }
  return context
}
