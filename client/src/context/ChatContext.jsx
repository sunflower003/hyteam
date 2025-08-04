import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';
import api from '../utils/api';

const ChatContext = createContext();

const chatReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    
    case 'ADD_CONVERSATION':
      const existingConv = state.conversations.find(c => c._id === action.payload._id);
      if (existingConv) return state;
      return { 
        ...state, 
        conversations: [action.payload, ...state.conversations]
      };
    
    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv._id === action.payload.conversationId
            ? { 
                ...conv, 
                lastMessage: action.payload.lastMessage,
                lastActivity: action.payload.lastActivity,
                unreadCount: action.payload.unreadCount || 0
              }
            : conv
        )
      };
    
    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversation: action.payload };
    
    case 'SET_MESSAGES':
      // Đảm bảo messages luôn là array
      return { 
        ...state, 
        messages: Array.isArray(action.payload) ? action.payload : [] 
      };
    
    case 'ADD_MESSAGE':
      // Đảm bảo messages là array trước khi thao tác
      const currentMessages = Array.isArray(state.messages) ? state.messages : [];
      const messageExists = currentMessages.some(m => m._id === action.payload._id);
      if (messageExists) return state;
      
      return { 
        ...state, 
        messages: [...currentMessages, action.payload] 
      };
    
    case 'UPDATE_MESSAGE_STATUS':
      // Đảm bảo messages là array
      const messagesArray = Array.isArray(state.messages) ? state.messages : [];
      return {
        ...state,
        messages: messagesArray.map(msg =>
          msg._id === action.payload.messageId
            ? { ...msg, ...action.payload.updates }
            : msg
        )
      };
    
    case 'SET_TYPING_USERS':
      return { ...state, typingUsers: action.payload };
    
    case 'ADD_TYPING_USER':
      if (state.typingUsers.includes(action.payload)) return state;
      return { 
        ...state, 
        typingUsers: [...state.typingUsers, action.payload] 
      };
    
    case 'REMOVE_TYPING_USER':
      return { 
        ...state, 
        typingUsers: state.typingUsers.filter(id => id !== action.payload) 
      };
    
    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: new Set(action.payload) };
    
    case 'ADD_ONLINE_USER':
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.add(action.payload);
      return { ...state, onlineUsers: newOnlineUsers };
    
    case 'REMOVE_ONLINE_USER':
      const updatedOnlineUsers = new Set(state.onlineUsers);
      updatedOnlineUsers.delete(action.payload);
      return { ...state, onlineUsers: updatedOnlineUsers };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_SOCKET':
      return { ...state, socket: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'RESET_CHAT':
      return {
        ...initialState,
        socket: state.socket
      };
    
    default:
      return state;
  }
};

const initialState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  typingUsers: [],
  onlineUsers: new Set(),
  loading: false,
  error: null,
  socket: null,
  isConnected: false
};

export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user } = useAuth();
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (!user?.id) {
      console.log("⚠️ No user available, skipping socket connection");
      return;
    }

    if (socketRef.current?.connected) {
      console.log("🔄 Socket already connected");
      return;
    }

    const socketURL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    console.log("🔌 Connecting to socket:", socketURL);
    
    const socket = io(socketURL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: {
        token: localStorage.getItem('token')
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;
    dispatch({ type: 'SET_SOCKET', payload: socket });

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Chat socket connected');
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Join user to their room
      socket.emit('user-online', {
        userId: user.id,
        username: user.username
      });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Không thể kết nối chat server' });
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    // Message events
    socket.on('new-private-message', (data) => {
      console.log('📨 New message received:', data);
      if (data.message) {
        dispatch({ type: 'ADD_MESSAGE', payload: data.message });
        
        // Update conversation
        if (data.conversation) {
          dispatch({ 
            type: 'UPDATE_CONVERSATION', 
            payload: {
              conversationId: data.conversation._id,
              lastMessage: data.message,
              lastActivity: data.message.createdAt,
              unreadCount: data.conversation.unreadCount || 0
            }
          });
        }
      }
    });

    // Conversation events
    socket.on('conversation-updated', (data) => {
      console.log('🔄 Conversation updated:', data);
      dispatch({ type: 'UPDATE_CONVERSATION', payload: data });
    });

    // Typing events
    socket.on('user-typing', (data) => {
      console.log('⌨️ User typing:', data);
      if (data.userId !== user.id) {
        dispatch({ type: 'ADD_TYPING_USER', payload: data.userId });
      }
    });

    socket.on('user-stop-typing', (data) => {
      console.log('⌨️ User stopped typing:', data);
      dispatch({ type: 'REMOVE_TYPING_USER', payload: data.userId });
    });

    // Online status events
    socket.on('user-status-changed', (data) => {
      console.log('👤 User status changed:', data);
      if (data.status === 'online') {
        dispatch({ type: 'ADD_ONLINE_USER', payload: data.userId });
      } else {
        dispatch({ type: 'REMOVE_ONLINE_USER', payload: data.userId });
      }
    });

    socket.on('online-users', (users) => {
      console.log('👥 Online users:', users);
      dispatch({ type: 'SET_ONLINE_USERS', payload: users });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Socket error' });
    });

    return () => {
      console.log('🔌 Cleaning up socket connection');
      socket.disconnect();
      socketRef.current = null;
      dispatch({ type: 'SET_SOCKET', payload: null });
    };
  }, [user?.id]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user?.id || state.loading) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      console.log("🔄 Fetching conversations...");
      
      const response = await api.get("/api/chats/conversations");
      console.log("📥 Conversations response:", response.data);
      
      if (response.data.success) {
        dispatch({ type: 'SET_CONVERSATIONS', payload: response.data.data || [] });
        console.log("✅ Conversations loaded:", response.data.data?.length || 0);
      } else {
        throw new Error(response.data.message || 'Failed to fetch conversations');
      }
    } catch (error) {
      console.error("❌ Error fetching conversations:", error);
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user?.id, state.loading]);

  // Search users
  const searchUsers = async (query) => {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      console.log('🔍 Searching users with query:', query);
      const response = await api.get(`/api/chats/users/search?query=${encodeURIComponent(query.trim())}`);
      console.log('📋 Search response:', response.data);
      
      if (response.data.success) {
        return response.data.data || [];
      } else {
        console.error('❌ Search failed:', response.data.message);
        return [];
      }
    } catch (error) {
      console.error('❌ Error searching users:', error.response?.data || error.message);
      return [];
    }
  };

  // Create or get conversation
  const createOrGetConversation = async (targetUserId) => {
    try {
      if (!targetUserId) {
        throw new Error('Target user ID is required');
      }

      console.log('🔄 Creating/getting conversation with user:', targetUserId);
      const response = await api.post('/api/chats/conversations', {
        targetUserId
      });

      if (response.data.success) {
        const conversation = response.data.data;
        console.log('✅ Conversation created/found:', conversation);
        
        // Add to conversations list if not exists
        dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
        
        return conversation;
      } else {
        throw new Error(response.data.message || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || error.message });
      throw error;
    }
  };

  // Set active conversation and join room
  const setActiveConversation = async (conversation) => {
    try {
      console.log('🎯 Setting active conversation:', conversation?._id);
      
      // Leave previous conversation room
      if (state.activeConversation && socketRef.current) {
        socketRef.current.emit('leave-conversation', state.activeConversation._id);
      }

      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation });
      
      if (conversation && socketRef.current) {
        // Join new conversation room
        socketRef.current.emit('join-conversation', conversation._id);
        
        // Fetch messages
        await fetchMessages(conversation._id);
      } else {
        // Clear messages if no conversation
        dispatch({ type: 'SET_MESSAGES', payload: [] });
      }
    } catch (error) {
      console.error('❌ Error setting active conversation:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  // Fetch messages
  const fetchMessages = async (conversationId) => {
    try {
      if (!conversationId) return;
      
      console.log('📨 Fetching messages for conversation:', conversationId);
      const response = await api.get(`/api/chats/conversations/${conversationId}/messages`);
      
      if (response.data.success) {
        // Fix: Extract messages from nested data
        const responseData = response.data.data || {};
        const messages = responseData.messages || responseData || [];
        
        // Ensure messages is array
        const messageArray = Array.isArray(messages) ? messages : [];
        dispatch({ type: 'SET_MESSAGES', payload: messageArray });
        console.log('✅ Messages loaded:', messageArray.length, messageArray);
      } else {
        throw new Error(response.data.message || 'Failed to fetch messages');
      }
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || error.message });
    }
  };

  // Send message
  const sendMessage = async (content, conversationId = state.activeConversation?._id) => {
    if (!content?.trim() || !conversationId) {
      console.warn('⚠️ Cannot send message: missing content or conversation');
      return;
    }

    try {
      console.log('📤 Sending message:', { content, conversationId });
      
      const messageData = {
        conversationId,
        content: content.trim(),
        messageType: 'text'
      };

      // Send via socket for real-time
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('send-private-message', messageData);
        console.log('✅ Message sent via socket');
      } else {
        throw new Error('Socket not connected');
      }

    } catch (error) {
      console.error('❌ Error sending message:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Typing indicators
  const startTyping = useCallback(() => {
    if (state.activeConversation && socketRef.current?.connected) {
      socketRef.current.emit('typing-start', {
        conversationId: state.activeConversation._id
      });
      
      // Auto stop typing after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 3000);
    }
  }, [state.activeConversation]);

  const stopTyping = useCallback(() => {
    if (state.activeConversation && socketRef.current?.connected) {
      socketRef.current.emit('typing-stop', {
        conversationId: state.activeConversation._id
      });
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [state.activeConversation]);

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    isConnected: socketRef.current?.connected || false,
    fetchConversations,
    createOrGetConversation,
    setActiveConversation,
    sendMessage,
    searchUsers,
    startTyping,
    stopTyping,
    clearError
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};