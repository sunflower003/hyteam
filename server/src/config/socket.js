const socketIo = require('socket.io');
const { saveMessage } = require('../controllers/messageController');
const ChatMessage = require('../models/ChatMessage');
const Conversation = require('../models/Conversation');

const rooms = new Map();
const userSockets = new Map(); // Track user's socket connections
const onlineUsers = new Set(); // Track online users

const initializeSocket = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // User authentication and online status
        socket.on('user-online', (userData) => {
            const { userId, username } = userData;
            socket.userId = userId;
            socket.username = username;
            
            userSockets.set(userId, socket.id);
            onlineUsers.add(userId);
            
            // Notify others about online status
            socket.broadcast.emit('user-status-changed', {
                userId,
                status: 'online'
            });
            
            console.log(`User ${username} (${userId}) is online`);
        });

        // Join private conversation room
        socket.on('join-conversation', (conversationId) => {
            socket.join(`conversation_${conversationId}`);
            console.log(`User ${socket.userId} joined conversation ${conversationId}`);
        });

        // Leave conversation room
        socket.on('leave-conversation', (conversationId) => {
            socket.leave(`conversation_${conversationId}`);
            console.log(`User ${socket.userId} left conversation ${conversationId}`);
        });

        // Send private message
        socket.on('send-private-message', async (messageData) => {
            try {
                const { conversationId, content, messageType, replyTo } = messageData;
                
                // Tạo message trong database
                const message = await ChatMessage.create({
                    conversationId,
                    sender: socket.userId,
                    content,
                    messageType: messageType || 'text',
                    replyTo: replyTo || null
                });

                await message.populate('sender', 'username avatar');
                if (replyTo) {
                    await message.populate('replyTo');
                }

                // Cập nhật conversation
                const conversation = await Conversation.findById(conversationId)
                    .populate('participants.user', 'username avatar');
                
                if (conversation) {
                    conversation.lastMessage = message._id;
                    conversation.lastActivity = new Date();

                    // Tăng unread count cho participants khác
                    conversation.participants.forEach(participant => {
                        if (participant.user._id.toString() !== socket.userId) {
                            const participantId = participant.user._id.toString();
                            const currentCount = conversation.unreadCount.get(participantId) || 0;
                            conversation.unreadCount.set(participantId, currentCount + 1);
                        }
                    });

                    await conversation.save();

                    // Emit message to conversation room
                    io.to(`conversation_${conversationId}`).emit('new-private-message', {
                        message,
                        conversationId
                    });

                    // Emit conversation update to all participants
                    conversation.participants.forEach(participant => {
                        const participantSocketId = userSockets.get(participant.user._id.toString());
                        if (participantSocketId) {
                            io.to(participantSocketId).emit('conversation-updated', {
                                conversationId,
                                lastMessage: message,
                                lastActivity: conversation.lastActivity,
                                unreadCount: conversation.unreadCount.get(participant.user._id.toString()) || 0
                            });
                        }
                    });
                }

                console.log(`Private message sent in conversation ${conversationId}`);
            } catch (error) {
                console.error('Error sending private message:', error);
                socket.emit('message-error', { error: 'Failed to send message' });
            }
        });

        // Typing indicators
        socket.on('typing-start', (data) => {
            const { conversationId } = data;
            socket.to(`conversation_${conversationId}`).emit('user-typing', {
                userId: socket.userId,
                username: socket.username,
                conversationId
            });
        });

        socket.on('typing-stop', (data) => {
            const { conversationId } = data;
            socket.to(`conversation_${conversationId}`).emit('user-stop-typing', {
                userId: socket.userId,
                conversationId
            });
        });

        // Message read status
        socket.on('message-read', async (data) => {
            try {
                const { conversationId, messageId } = data;
                
                // Mark message as read
                await ChatMessage.findByIdAndUpdate(messageId, {
                    $push: { readBy: { user: socket.userId } }
                });

                // Notify sender
                socket.to(`conversation_${conversationId}`).emit('message-read-update', {
                    messageId,
                    readBy: socket.userId
                });

            } catch (error) {
                console.error('Error marking message as read:', error);
            }
        });

        // Movie Room functionality (giữ nguyên từ code cũ)
        socket.on('join-room', (roomData) => {
            const { roomId, user } = roomData;
            socket.join(roomId);

            if(!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }

            // Thêm user với trường inVoiceChat
            rooms.get(roomId).add({
                socketId: socket.id,
                userId: user.id,
                username: user.username,
                avatar: user.avatar,
                isSpeaking: false,
                isMuted: false,
                inVoiceChat: false // Thêm field này
            });

            // Thong bao cho cac user khac trong phong
            socket.to(roomId).emit('user-joined', {
                socketId: socket.id,
                userId: user.id,
                username: user.username,
                avatar: user.avatar,
                inVoiceChat: false
            });

            const roomUsers = Array.from(rooms.get(roomId));
            io.to(roomId).emit('room-users', roomUsers);

            console.log(`User ${user.username} joined room ${roomId}`);
        });

        // leave room event
        socket.on('leave-room', (roomId) => {
            socket.leave(roomId);

            if (rooms.has(roomId)) {
                const roomUsers = rooms.get(roomId);
                // Xoa user khoi room
                for (let user of roomUsers) {
                    if (user.socketId === socket.id) {
                        roomUsers.delete(user);
                        break;
                    }
                }

                if (roomUsers.size === 0) {
                    rooms.delete(roomId);
                } else {
                    socket.to(roomId).emit('user-left', socket.id);
                    const updatedUsers = Array.from(roomUsers);
                    io.to(roomId).emit('room-users', updatedUsers);
                }
            }
        });

        // Voice Chat Events - NEW
        socket.on('join-voice-chat', (data) => {
            const { roomId, user } = data;
            console.log(`User ${user.username} joining voice chat in room ${roomId}`);

            if (rooms.has(roomId)) {
                const roomUsers = rooms.get(roomId);
                
                // Update user's voice status
                for (let roomUser of roomUsers) {
                    if (roomUser.socketId === socket.id) {
                        roomUser.inVoiceChat = true;
                        roomUser.isMuted = false;
                        roomUser.isSpeaking = false;
                        break;
                    }
                }

                // Notify others that user joined voice
                socket.to(roomId).emit('user-joined-voice', {
                    socketId: socket.id,
                    userId: user.id,
                    username: user.username,
                    avatar: user.avatar
                });

                // Send updated users list
                const updatedUsers = Array.from(roomUsers);
                io.to(roomId).emit('room-users', updatedUsers);

                console.log(`User ${user.username} joined voice chat successfully`);
            }
        });

        socket.on('leave-voice-chat', (data) => {
            const { roomId, user } = data;
            console.log(`User ${user.id} leaving voice chat in room ${roomId}`);

            if (rooms.has(roomId)) {
                const roomUsers = rooms.get(roomId);
                
                // Update user's voice status
                for (let roomUser of roomUsers) {
                    if (roomUser.socketId === socket.id) {
                        roomUser.inVoiceChat = false;
                        roomUser.isMuted = false;
                        roomUser.isSpeaking = false;
                        break;
                    }
                }

                // Notify others that user left voice
                socket.to(roomId).emit('user-left-voice', {
                    socketId: socket.id,
                    userId: user.id
                });

                // Send updated users list
                const updatedUsers = Array.from(roomUsers);
                io.to(roomId).emit('room-users', updatedUsers);

                console.log(`User ${user.id} left voice chat successfully`);
            }
        });

        // WebRTC signaling cho voice chat
        socket.on('sending-signal', (payload) => {
            console.log('Sending signal from ', payload.callerID, 'to', payload.userToSignal);
            // Gui tin hieu den nguoi dung duoc goi
            io.to(payload.userToSignal).emit('receiving-signal', {
                signal: payload.signal,
                callerID: payload.callerID
            });
        });

        socket.on('returning-signal', (payload) => {
            console.log('Returning signal to', payload.callerID);
            // Gui tin hieu tro lai nguoi goi   
            io.to(payload.callerID).emit('signal-received', {
                signal: payload.signal,
                id: socket.id
            });
        });

        // Voice chat events - Discord style
        socket.on('toggle-mute', (data) => {
            const { roomId, isMuted } = data;

            if(rooms.has(roomId)) {
                const roomUsers = rooms.get(roomId);
                for (let user of roomUsers) {
                    if (user.socketId === socket.id) {
                        user.isMuted = isMuted;
                        break;
                    }
                }

                // Thong bao trang thai mute cho tat ca users
                socket.to(roomId).emit('user-mute-changed', {
                    socketId: socket.id,
                    isMuted
                });

                const updatedUsers = Array.from(roomUsers);
                io.to(roomId).emit('room-users', updatedUsers);
            }
        });

        socket.on('speaking-state', (data) => {
            const { roomId, isSpeaking } = data;

            if(rooms.has(roomId)) {
                const roomUsers = rooms.get(roomId);
                for (let user of roomUsers) {
                    if (user.socketId === socket.id) {
                        user.isSpeaking = isSpeaking;
                        break;
                    }
                }

                // Thong bao trang thai speaking cho tat ca users
                socket.to(roomId).emit('user-speaking-changed', {
                    socketId: socket.id,
                    isSpeaking
                });
            }
        });

        // Chat message event - luu vao Database
        socket.on('chat-message', async (data) => {
            const { roomId, message } = data;
            console.log('Chat message in room', roomId, ':', message);
            
            try {
                // Luu tin nhan vao Database
                const savedMessage = await saveMessage({
                    roomId, 
                    user: message.user.id,
                    message: message.message,
                    messageType: 'text'
                });

                if (savedMessage) {
                    // Format message de gui qua socket
                    const messageToSend = {
                        id: savedMessage._id,
                        user: {
                            id: savedMessage.user._id,
                            username: savedMessage.user.username,
                            avatar: savedMessage.user.avatar
                        },
                        message: savedMessage.message,
                        timestamp: savedMessage.createdAt,
                        edited: savedMessage.edited,
                    };
                    // Gui tin nhan den tat ca nguoi dung trong phong
                    io.to(roomId).emit('chat-message', messageToSend);
                    console.log(`Message sent to room ${roomId}:`, messageToSend);
                } else {
                    // neu khong luu duoc, van gui message tam thoi
                    io.to(roomId).emit('chat-message', message);
                }
            } catch (error) {
                console.error('Error handling chat message:', error);
                // Fallback: gui message khong luu DB
                io.to(roomId).emit('chat-message', message);
            }
        });

        //Movie selection event
        socket.on('movie-selected', (data) => {
            const { roomId, movie } = data;
            console.log('Movie selected in room', roomId, ':', movie.title);

            // Thong bao phim moi den tat car user trong phong
            socket.to(roomId).emit('movie-changed', movie);
        });

        // Disconnect event
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);

            // Remove from online users
            if (socket.userId) {
                onlineUsers.delete(socket.userId);
                userSockets.delete(socket.userId);
                
                // Notify others about offline status
                socket.broadcast.emit('user-status-changed', {
                    userId: socket.userId,
                    status: 'offline'
                });
            }

            // Remove from movie rooms (giữ nguyên logic cũ)
            for (const [roomId, users] of rooms.entries()) {
                for(let user of users) {
                    if(user.socketId === socket.id) {
                        // Nếu user đang trong voice chat, thông báo leave voice
                        if (user.inVoiceChat) {
                            socket.to(roomId).emit('user-left-voice', {
                                socketId: socket.id,
                                userId: user.userId
                            });
                        }

                        users.delete(user);
                        socket.to(roomId).emit('user-left', socket.id);
                        
                        if (users.size === 0) {
                            rooms.delete(roomId);
                        } else {
                            const roomUsers = Array.from(users);
                            io.to(roomId).emit('room-users', roomUsers);
                        }
                        break;
                    }
                }
            }
        });
    });

    return io;
};

module.exports = { initializeSocket };
