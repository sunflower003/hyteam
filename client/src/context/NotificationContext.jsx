/* eslint-disable react-refresh/only-export-components */
"use client"

import { createContext, useContext, useReducer, useEffect, useRef } from "react"
import { useAuth } from "./AuthContext"
import io from "socket.io-client"
import api from "../utils/api"

const NotificationContext = createContext()

const notificationReducer = (state, action) => {
  switch (action.type) {
    case "SET_NOTIFICATIONS":
      return { ...state, notifications: action.payload }

    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.payload, ...state.notifications.filter((n) => n._id !== action.payload._id)],
      }

    case "UPDATE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.map((notif) =>
          notif._id === action.payload._id ? { ...notif, ...action.payload } : notif
        ),
      }

    case "MARK_AS_READ":
      return {
        ...state,
        notifications: state.notifications.map((notif) =>
          notif._id === action.payload.notificationId ? { ...notif, isRead: true } : notif
        ),
        unreadCount: action.payload.unreadCount,
      }

    case "MARK_ALL_AS_READ":
      return {
        ...state,
        notifications: state.notifications.map((notif) => ({ ...notif, isRead: true })),
        unreadCount: 0,
      }

    case "SET_UNREAD_COUNT":
      return { ...state, unreadCount: action.payload }

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
  notifications: [],
  unreadCount: 0,
  loading: false,
  socket: null,
  error: null,
}

export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState)
  const { user } = useAuth()
  const socketRef = useRef(null)

  // Initialize socket connection
  useEffect(() => {
    if (!user?.id) return

    const token = localStorage.getItem("token")
    if (!token) return

    const socketURL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"
    console.log("🔔 Connecting to notification socket:", socketURL)

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
      console.log("✅ Notification socket connected")
    })

    socket.on("connected", (data) => {
      console.log("🎉 Notification socket authenticated:", data)
    })

    socket.on("connect_error", (error) => {
      console.error("❌ Notification socket connection error:", error)
      dispatch({ type: "SET_ERROR", payload: "Không thể kết nối đến server thông báo" })
    })

    // Listen for new notifications
    socket.on("new-notification", (data) => {
      console.log("🔔 New notification received:", data)
      dispatch({ type: "ADD_NOTIFICATION", payload: data.notification })
      dispatch({ type: "SET_UNREAD_COUNT", payload: data.unreadCount })
      
      // Show browser notification if permission granted
      if (Notification.permission === "granted") {
        new Notification("New notification", {
          body: `${data.notification.sender.username} ${data.notification.message}`,
          icon: data.notification.sender.avatar || "/img/default-avatar.png",
        })
      }
    })

    // Listen for unread count updates
    socket.on("unread-count-update", (data) => {
      console.log("📊 Unread count updated:", data)
      dispatch({ type: "SET_UNREAD_COUNT", payload: data.unreadCount })
    })

    // Listen for notification read updates
    socket.on("notification-read-success", (data) => {
      console.log("✅ Notification marked as read:", data)
      dispatch({ type: "MARK_AS_READ", payload: data })
    })

    // Listen for all notifications read
    socket.on("all-notifications-read-success", (data) => {
      console.log("✅ All notifications marked as read:", data)
      dispatch({ type: "MARK_ALL_AS_READ" })
    })

    // Listen for real-time post updates
    socket.on("post-like-updated", (data) => {
      console.log("👍 Post like updated:", data)
      // Có thể emit event để update UI posts nếu cần
    })

    socket.on("post-comment-added", (data) => {
      console.log("💬 Post comment added:", data)
      // Có thể emit event để update UI posts nếu cần
    })

    // Listen for new posts
    socket.on("new-post", (data) => {
      console.log("📝 New post created:", data)
      // Post component sẽ tự handle update thông qua socket listener riêng
    })

    // Listen for real-time story updates
    socket.on("new-story", (data) => {
      console.log("📖 New story created:", data)
      // Story component sẽ tự handle update thông qua socket listener riêng
    })

    // Handle errors
    socket.on("error", (error) => {
      console.error("🚨 Notification socket error:", error)
      dispatch({ type: "SET_ERROR", payload: error.message || "Notification socket error occurred" })
    })

    return () => {
      console.log("🔔 Disconnecting notification socket")
      socket.disconnect()
      socketRef.current = null
      dispatch({ type: "SET_SOCKET", payload: null })
    }
  }, [user?.id])

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  // Fetch notifications
  const fetchNotifications = async (page = 1, limit = 20) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      dispatch({ type: "SET_ERROR", payload: null })

      console.log("📋 Fetching notifications...")
      const response = await api.get(`/api/notifications?page=${page}&limit=${limit}`)

      console.log("✅ Notifications response:", response.data)

      if (response.data.success) {
        const { notifications, unreadCount } = response.data.data
        dispatch({ type: "SET_NOTIFICATIONS", payload: notifications })
        dispatch({ type: "SET_UNREAD_COUNT", payload: unreadCount })
      } else {
        throw new Error(response.data.message || "Failed to fetch notifications")
      }
    } catch (error) {
      console.error("❌ Error fetching notifications:", error)
      dispatch({ type: "SET_ERROR", payload: "Không thể tải danh sách thông báo" })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  // Fetch unread count only
  const fetchUnreadCount = async () => {
    try {
      console.log("📊 Fetching unread count...")
      const response = await api.get("/api/notifications/unread-count")

      if (response.data.success) {
        dispatch({ type: "SET_UNREAD_COUNT", payload: response.data.data.unreadCount })
      }
    } catch (error) {
      console.error("❌ Error fetching unread count:", error)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      console.log("✅ Marking notification as read:", notificationId)

      // Emit via socket for real-time update
      if (socketRef.current) {
        socketRef.current.emit("mark-notification-read", { notificationId })
      }

      // Also call API as backup
      try {
        const response = await api.patch(`/api/notifications/${notificationId}/read`)
        if (!response.data.success) {
          console.warn("API call failed, but socket event sent")
        }
      } catch (apiError) {
        console.warn("API call failed, but socket event sent:", apiError)
      }
    } catch (error) {
      console.error("❌ Error marking notification as read:", error)
      dispatch({ type: "SET_ERROR", payload: "Không thể đánh dấu thông báo đã đọc" })
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      console.log("✅ Marking all notifications as read...")

      // Update local state immediately for better UX
      dispatch({ type: "MARK_ALL_AS_READ" })

      // Emit via socket for real-time update
      if (socketRef.current) {
        socketRef.current.emit("mark-all-notifications-read")
      }

      // Also call API as backup
      try {
        const response = await api.patch("/api/notifications/mark-all-read")
        if (!response.data.success) {
          console.warn("API call failed, but socket event sent")
        }
      } catch (apiError) {
        console.warn("API call failed, but socket event sent:", apiError)
      }
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error)
      dispatch({ type: "SET_ERROR", payload: "Không thể đánh dấu tất cả thông báo đã đọc" })
    }
  }

  // Navigate to notification target (post/comment/story)
  const navigateToNotification = async (notification) => {
    try {
      const { _id, type, post, commentId, sender } = notification

      // Mark as read first and update local state immediately
      if (!notification.isRead) {
        // Update local state immediately for better UX
        dispatch({ 
          type: "MARK_AS_READ", 
          payload: { 
            notificationId: _id, 
            unreadCount: Math.max(0, state.unreadCount - 1) 
          } 
        })
        
        // Then make API call
        await markAsRead(_id)
      }

      // Navigate based on notification type
      if (type === "like" || type === "comment") {
        if (post?._id) {
          // Navigate to main feed and scroll to post
          const postElement = document.getElementById(`post-${post._id}`)
          if (postElement) {
            // If post is already visible, scroll to it
            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            
            // Highlight the post briefly
            postElement.classList.add('highlighted-post')
            setTimeout(() => {
              postElement.classList.remove('highlighted-post')
            }, 2000)
          } else {
            // Navigate to home feed with post ID in URL for scrolling
            window.location.href = `/?highlight=${post._id}${commentId ? `&comment=${commentId}` : ''}`
          }
        }
      } else if (type === "story") {
        if (sender?._id) {
          // Check if Story component has made openStoryByUserId available globally
          if (window.openStoryByUserId) {
            console.log('📖 Opening story for user:', sender._id);
            window.openStoryByUserId(sender._id);
          } else {
            console.warn('Story component not available, navigating to home');
            window.location.href = '/';
          }
        }
      } else if (type === "post") {
        if (post?._id) {
          // Navigate to main feed and scroll to post
          const postElement = document.getElementById(`post-${post._id}`)
          if (postElement) {
            // If post is already visible, scroll to it
            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            
            // Highlight the post briefly
            postElement.classList.add('highlighted-post')
            setTimeout(() => {
              postElement.classList.remove('highlighted-post')
            }, 2000)
          } else {
            // Navigate to home feed with post ID in URL for scrolling
            window.location.href = `/?highlight=${post._id}`
          }
        }
      } else if (type === "follow") {
        if (sender?._id) {
          window.location.href = `/profile/${sender._id}`
        }
      }
    } catch (error) {
      console.error("❌ Error navigating to notification:", error)
      dispatch({ type: "SET_ERROR", payload: "Không thể điều hướng đến thông báo" })
    }
  }

  // Clear error
  const clearError = () => {
    dispatch({ type: "SET_ERROR", payload: null })
  }

  // Initialize notifications when user is authenticated
  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
      fetchUnreadCount()
    }
  }, [user?.id])

  const value = {
    ...state,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    navigateToNotification,
    clearError,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider")
  }
  return context
}
