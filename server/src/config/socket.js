const socketIo = require('socket.io');

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

        rooms.get(roomId).add({
            socketId: socket.id,
            userId: user.id,
            username: user.username,
            avatar: user.avatar
        });

        // Thong bao cho cac user khac trong phong
        socket.to(roomId).emit('user-joined', {
            socketId: socket.id,
            user: user
        });

        //Gui danh sach user trong phong
        const roomUsers = Array.from(rooms.get(roomId));
        io.to(roomId).emit('room-users', roomUsers);
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
                const updateUsers = Array.from(roomUsers);
                io.to(roomId).emit('room-users', updatedUsers);
            }
        }
    });

    // WebRTC signaling
    socket.on('sending-signal', (payload) => {
        io.to(payload.userToSignal).emit('receiving-signal', {
            signal: payload.signal,
            callerID: payload.callerID
        });
    });

    socket.on('returning-signal', (payload) => {
        io.to(payload.callerID).emit('signal-received', {
            signal: payload.signal,
            id: socket.id
        });
    });

    // Disconnect event
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // Xoa user khoi tat ca cac phong
        for (const [roomId, users] of rooms.entries()) {
            for(let user of users) {
                if(user.socketId === socket.id) {
                    users.delete(user);
                    socket.to(roomId).emit('user-left', socket.id);
                    if (users.size === 0) {
                        rooms.delete(roomId);
                    }
                    else {
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
