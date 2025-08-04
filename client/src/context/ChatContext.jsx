import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react'; // Thêm useCallback
import { useAuth } from './AuthContext';
import io from 'socket.io-client';
import api from '../utils/api';

const ChatContext = createContext();

const chatReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    
    case 'ADD_CONVERSATION':
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
                unreadCount: action.payload.unreadCount 
              }
            : conv
        )
      };
    
    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversation: action.payload };
    
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    
    case 'ADD_MESSAGE':
      return { 
        ...state, 
        messages: [...state.messages, action.payload] 
      };
    
    case 'SET_TYPING_USERS':
      return { ...state, typingUsers: action.payload };
    
    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_SOCKET':
      return { ...state, socket: action.payload };
    
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
  socket: null
};

export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user } = useAuth();
  const socketRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (!user?.id) return;

    const socketURL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketURL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;
    dispatch({ type: 'SET_SOCKET', payload: socket });

    socket.on('connect', () => {
      console.log('Chat socket connected');
      socket.emit('user-online', {
        userId: user.id,
        username: user.username
      });
    });

    // Listen for new messages
    socket.on('new-private-message', (data) => {
      dispatch({ type: 'ADD_MESSAGE', payload: data.message });
    });

    // Listen for conversation updates
    socket.on('conversation-updated', (data) => {
      dispatch({ type: 'UPDATE_CONVERSATION', payload: data });
    });

    // Listen for typing indicators
    socket.on('user-typing', (data) => {
      dispatch({ 
        type: 'SET_TYPING_USERS', 
        payload: [...state.typingUsers, data.userId] 
      });
    });

    socket.on('user-stop-typing', (data) => {
      dispatch({ 
        type: 'SET_TYPING_USERS', 
        payload: state.typingUsers.filter(id => id !== data.userId) 
      });
    });

    // Listen for online status changes
    socket.on('user-status-changed', (data) => {
      const newOnlineUsers = new Set(state.onlineUsers);
      if (data.status === 'online') {
        newOnlineUsers.add(data.userId);
      } else {
        newOnlineUsers.delete(data.userId);
      }
      dispatch({ type: 'SET_ONLINE_USERS', payload: newOnlineUsers });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      dispatch({ type: 'SET_SOCKET', payload: null });
    };
  }, [user?.id]);

  // Fix fetchConversations - đang bị lỗi dispatch
  const fetchConversations = useCallback(async () => {
    if (state.loading) return; // Use state.loading instead of undefined loading
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true }); // Use dispatch instead of setLoading
      console.log("Fetching conversations...");
      const response = await api.get("/api/chats/conversations");
      if (response.data.success) {
        dispatch({ type: 'SET_CONVERSATIONS', payload: response.data.data }); // Use dispatch instead of setConversations
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false }); // Use dispatch instead of setLoading
    }
  }, [state.loading]); // Dependency array đúng

  // Auto-fetch conversations khi user login - ONLY ONCE
  useEffect(() => {
    let isMounted = true;
    
    if (user?.id && !state.loading && state.conversations.length === 0) {
      console.log('ChatContext: Auto-fetching conversations');
      if (isMounted) {
        fetchConversations();
      }
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id]); // Only depend on user?.id, remove other dependencies

  // Search users
  const searchUsers = async (query) => {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      console.log('Searching users with query:', query);
      const response = await api.get(`/api/chats/users/search?query=${encodeURIComponent(query.trim())}`);
      console.log('Search response:', response.data);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        console.error('Search failed:', response.data.message);
        return [];
      }
    } catch (error) {
      console.error('Error searching users:', error.response?.data || error.message);
      return [];
    }
  };

  // Create or get conversation
  const createOrGetConversation = async (targetUserId) => {
    try {
      if (!targetUserId) {
        throw new Error('Target user ID is required');
      }

      const response = await api.post('/api/chats/conversations', {
        targetUserId
      });

      if (response.data.success) {
        const conversation = response.data.data;
        
        // Add to conversations list if not exists
        const existingConv = state.conversations.find(c => c._id === conversation._id);
        if (!existingConv) {
          dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
        }
        
        return conversation;
      } else {
        throw new Error(response.data.message || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  // Set active conversation and join room
  const setActiveConversation = async (conversation) => {
    if (state.activeConversation && socketRef.current) {
      // Leave previous conversation room
      socketRef.current.emit('leave-conversation', state.activeConversation._id);
    }

    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation });
    
    if (conversation && socketRef.current) {
      // Join new conversation room
      socketRef.current.emit('join-conversation', conversation._id);
      
      // Fetch messages
      await fetchMessages(conversation._id);
    }
  };

  // Fetch messages
  const fetchMessages = async (conversationId) => {
    try {
      const response = await api.get(`/api/chats/conversations/${conversationId}/messages`);
      if (response.data.success) {
        dispatch({ type: 'SET_MESSAGES', payload: response.data.data.messages });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Send message
  const sendMessage = async (content, conversationId = state.activeConversation?._id) => {
    if (!content.trim() || !conversationId) return;

    try {
      const messageData = {
        conversationId,
        content: content.trim(),
        messageType: 'text'
      };

      // Send via socket for real-time
      if (socketRef.current) {
        socketRef.current.emit('send-private-message', messageData);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Typing indicators
  const startTyping = () => {
    if (state.activeConversation && socketRef.current) {
      socketRef.current.emit('typing-start', {
        conversationId: state.activeConversation._id
      });
    }
  };

  const stopTyping = () => {
    if (state.activeConversation && socketRef.current) {
      socketRef.current.emit('typing-stop', {
        conversationId: state.activeConversation._id
      });
    }
  };

  const value = {
    ...state,
    fetchConversations,
    createOrGetConversation,
    setActiveConversation,
    sendMessage,
    searchUsers,
    startTyping,
    stopTyping
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