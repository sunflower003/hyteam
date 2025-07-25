const socketIo = require('socket.io');
const { saveMessage } = require('../controllers/messageController');

const rooms = new Map(); // Lưu trữ thông tin phòng và người dùng
const voiceChannels = new Map(); // Lưu trữ thông tin voice channels riêng biệt

const initializeSocket = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('🔌 User connected:', socket.id);

        // Join room event
        socket.on('join-room', (roomData) => {
            const { roomId, user } = roomData;
            socket.join(roomId);

            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }

            rooms.get(roomId).add({
                socketId: socket.id,
                userId: user.id,
                username: user.username,
                avatar: user.avatar,
                joinedAt: new Date()
            });

            // Thông báo cho các user khác trong phòng
            socket.to(roomId).emit('user-joined', {
                socketId: socket.id,
                user: user
            });

            // Gửi danh sách user trong phòng
            const roomUsers = Array.from(rooms.get(roomId));
            io.to(roomId).emit('room-users', roomUsers);

            console.log(`👥 User ${user.username} joined room ${roomId}`);
        });

        // Leave room event
        socket.on('leave-room', (roomId) => {
            socket.leave(roomId);

            if (rooms.has(roomId)) {
                const roomUsers = rooms.get(roomId);
                // Xóa user khỏi room
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

            console.log(`👋 User left room ${roomId}`);
        });

        // ================== DISCORD-STYLE VOICE CHAT ==================

        // Join Voice Channel - Discord Style
        socket.on('join-voice-channel', (data) => {
            const { roomId, user } = data;
            console.log(`🎤 ${user.username} joining voice channel in room ${roomId}`);

            if (!voiceChannels.has(roomId)) {
                voiceChannels.set(roomId, new Map());
            }

            const voiceChannel = voiceChannels.get(roomId);
            
            // Add user to voice channel
            voiceChannel.set(socket.id, {
                socketId: socket.id,
                userId: user.id,
                username: user.username,
                avatar: user.avatar,
                isMuted: false,
                isDeafened: false,
                isSpeaking: false,
                joinedVoiceAt: new Date()
            });

            // Join voice room
            socket.join(`voice-${roomId}`);

            // Notify others in voice channel about new user
            socket.to(`voice-${roomId}`).emit('user-joined-voice', {
                socketId: socket.id,
                userId: user.id,
                username: user.username,
                avatar: user.avatar,
                isMuted: false,
                isDeafened: false
            });

            // Send current voice channel users to the new user
            const voiceUsers = Array.from(voiceChannel.values());
            socket.emit('voice-channel-users', voiceUsers);

            // Notify all room users about voice channel update
            const voiceUsersList = Array.from(voiceChannel.values());
            io.to(roomId).emit('voice-channel-users', voiceUsersList);

            console.log(`✅ ${user.username} joined voice channel. Total voice users: ${voiceChannel.size}`);
        });

        // Leave Voice Channel - Discord Style
        socket.on('leave-voice-channel', (data) => {
            const { roomId } = data;
            console.log(`🔌 User ${socket.id} leaving voice channel in room ${roomId}`);

            if (voiceChannels.has(roomId)) {
                const voiceChannel = voiceChannels.get(roomId);
                
                if (voiceChannel.has(socket.id)) {
                    voiceChannel.delete(socket.id);
                    
                    // Leave voice room
                    socket.leave(`voice-${roomId}`);
                    
                    // Notify others about user leaving voice
                    socket.to(`voice-${roomId}`).emit('user-left-voice', socket.id);
                    
                    // Update voice channel users list
                    const voiceUsersList = Array.from(voiceChannel.values());
                    io.to(roomId).emit('voice-channel-users', voiceUsersList);
                    
                    // Clean up empty voice channel
                    if (voiceChannel.size === 0) {
                        voiceChannels.delete(roomId);
                    }
                    
                    console.log(`✅ User left voice channel. Remaining voice users: ${voiceChannel.size}`);
                }
            }
        });

        // Voice State Change - Discord Style (Mute/Deafen)
        socket.on('voice-state-change', (data) => {
            const { roomId, voiceState } = data;
            console.log(`🔊 Voice state change in room ${roomId}:`, voiceState);

            if (voiceChannels.has(roomId)) {
                const voiceChannel = voiceChannels.get(roomId);
                const user = voiceChannel.get(socket.id);
                
                if (user) {
                    // Update user voice state
                    Object.assign(user, voiceState);
                    
                    // Notify others about voice state change
                    socket.to(`voice-${roomId}`).emit('user-voice-state-changed', {
                        socketId: socket.id,
                        voiceState
                    });
                    
                    // Update voice channel users list
                    const voiceUsersList = Array.from(voiceChannel.values());
                    io.to(roomId).emit('voice-channel-users', voiceUsersList);
                }
            }
        });

        // Voice Speaking State - Discord Style
        socket.on('voice-speaking', (data) => {
            const { roomId, isSpeaking } = data;
            
            if (voiceChannels.has(roomId)) {
                const voiceChannel = voiceChannels.get(roomId);
                const user = voiceChannel.get(socket.id);
                
                if (user) {
                    user.isSpeaking = isSpeaking;
                    
                    // Notify others about speaking state (not the speaker themselves)
                    socket.to(`voice-${roomId}`).emit('user-speaking-changed', {
                        socketId: socket.id,
                        isSpeaking
                    });
                }
            }
        });

        // WEBRTC SIGNALING - DISCORD STYLE 

        // Voice Signal Offer - For WebRTC connection establishment
        socket.on('voice-signal-offer', (payload) => {
            const { to, signal } = payload;
            console.log(`📡 Forwarding offer from ${socket.id} to ${to}`);
            
            io.to(to).emit('voice-signal-offer', {
                from: socket.id,
                signal
            });
        });

        // Voice Signal Answer - For WebRTC connection establishment
        socket.on('voice-signal-answer', (payload) => {
            const { to, signal } = payload;
            console.log(`📡 Forwarding answer from ${socket.id} to ${to}`);
            
            io.to(to).emit('voice-signal-answer', {
                from: socket.id,
                signal
            });
        });

        //  LEGACY WEBRTC SUPPORT
        // Keep old signaling for backward compatibility
        socket.on('sending-signal', (payload) => {
            console.log('📡 [Legacy] Sending signal from', payload.callerID, 'to', payload.userToSignal);
            io.to(payload.userToSignal).emit('receiving-signal', {
                signal: payload.signal,
                callerID: payload.callerID
            });
        });

        socket.on('returning-signal', (payload) => {
            console.log('📡 [Legacy] Returning signal to', payload.callerID);
            io.to(payload.callerID).emit('signal-received', {
                signal: payload.signal,
                id: socket.id
            });
        });

        // LEGACY VOICE EVENTS 
        // Keep for backward compatibility
        socket.on('toggle-mute', (data) => {
            const { roomId, isMuted } = data;

            if (rooms.has(roomId)) {
                const roomUsers = rooms.get(roomId);
                for (let user of roomUsers) {
                    if (user.socketId === socket.id) {
                        user.isMuted = isMuted;
                        break;
                    }
                }

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

            if (rooms.has(roomId)) {
                const roomUsers = rooms.get(roomId);
                for (let user of roomUsers) {
                    if (user.socketId === socket.id) {
                        user.isSpeaking = isSpeaking;
                        break;
                    }
                }

                socket.to(roomId).emit('user-speaking-changed', {
                    socketId: socket.id,
                    isSpeaking
                });
            }
        });

        // CHAT MESSAGES

        // Chat message event - lưu vào Database
        socket.on('chat-message', async (data) => {
            const { roomId, message } = data;
            console.log('💬 Chat message in room', roomId, ':', message.message);
            
            try {
                // Lưu tin nhắn vào Database
                const savedMessage = await saveMessage({
                    roomId, 
                    user: message.user.id,
                    message: message.message,
                    messageType: 'text'
                });

                if (savedMessage) {
                    // Format message để gửi qua socket
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
                    
                    // Gửi tin nhắn đến tất cả người dùng trong phòng
                    io.to(roomId).emit('chat-message', messageToSend);
                    console.log(`📤 Message sent to room ${roomId}`);
                } else {
                    // Nếu không lưu được, vẫn gửi message tạm thời
                    io.to(roomId).emit('chat-message', message);
                }
            } catch (error) {
                console.error('❌ Error handling chat message:', error);
                // Fallback: gửi message không lưu DB
                io.to(roomId).emit('chat-message', message);
            }
        });

        //  MOVIE EVENTS

        // Movie selection event
        socket.on('movie-selected', (data) => {
            const { roomId, movie } = data;
            console.log('🎬 Movie selected in room', roomId, ':', movie.title);

            // Thông báo phim mới đến tất cả user trong phòng
            socket.to(roomId).emit('movie-changed', movie);
        });

        // DISCONNECT HANDLING

        // Disconnect event
        socket.on('disconnect', () => {
            console.log('❌ User disconnected:', socket.id);

            // Xóa user khỏi tất cả các phòng thường
            for (const [roomId, users] of rooms.entries()) {
                for (let user of users) {
                    if (user.socketId === socket.id) {
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

            // Xóa user khỏi tất cả voice channels
            for (const [roomId, voiceChannel] of voiceChannels.entries()) {
                if (voiceChannel.has(socket.id)) {
                    voiceChannel.delete(socket.id);
                    
                    // Notify others about user leaving voice
                    socket.to(`voice-${roomId}`).emit('user-left-voice', socket.id);
                    
                    // Update voice channel users list
                    const voiceUsersList = Array.from(voiceChannel.values());
                    io.to(roomId).emit('voice-channel-users', voiceUsersList);
                    
                    // Clean up empty voice channel
                    if (voiceChannel.size === 0) {
                        voiceChannels.delete(roomId);
                    }
                    
                    console.log(`🎤 User removed from voice channel ${roomId}`);
                }
            }

            console.log(`🧹 Cleanup completed for socket ${socket.id}`);
        });

        // DEBUG EVENTS 

        // Debug: Get room info
        socket.on('debug-room-info', (roomId) => {
            const roomUsers = rooms.has(roomId) ? Array.from(rooms.get(roomId)) : [];
            const voiceUsers = voiceChannels.has(roomId) ? Array.from(voiceChannels.get(roomId).values()) : [];
            
            socket.emit('debug-room-info-response', {
                roomId,
                roomUsers,
                voiceUsers,
                totalRooms: rooms.size,
                totalVoiceChannels: voiceChannels.size
            });
        });
    });

    return io;
};

module.exports = { initializeSocket };
