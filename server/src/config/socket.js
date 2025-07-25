const socketIo = require('socket.io');
const { saveMessage } = require('../controllers/messageController');

const rooms = new Map(); //Luu tru thong tin phong va nguoi dung

const initializeSocket = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket) =>{
        console.log('User connected:', socket.id);

        // join room event
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

            //Gui danh sach user trong phong
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

            // Xoa user khoi tat ca cac phong
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
