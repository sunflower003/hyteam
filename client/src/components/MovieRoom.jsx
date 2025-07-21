import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const MovieRoom = () => {
    const [socket, setSocket] = useState(null);
    const [roomId, setRoomId] = useState('');
    const [isInRoom, setIsInRoom] = useState(false);
    const [users, setUsers] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    
    const { user } = useAuth();
    const userVideo = useRef();

    useEffect(() => {
        // Initialize socket connection
        const newSocket = io('http://localhost:5000', {
            withCredentials: true
        });
        
        setSocket(newSocket);

        // Socket event listeners
        newSocket.on('room-joined', (data) => {
            console.log('Joined room:', data);
            setUsers(data.users || []);
            setIsInRoom(true);
        });

        newSocket.on('user-joined', (data) => {
            console.log('User joined:', data);
        });

        newSocket.on('user-left', (socketId) => {
            console.log('User left:', socketId);
        });

        newSocket.on('room-users-updated', (users) => {
            setUsers(users);
        });

        newSocket.on('new-message', (message) => {
            setMessages(prev => [...prev, message]);
        });

        newSocket.on('error', (error) => {
            console.error('Socket error:', error);
            alert(error.message);
        });

        return () => {
            newSocket.close();
        };
    }, []);

    const joinRoom = () => {
        if (!roomId.trim()) {
            alert('Please enter a room ID');
            return;
        }

        // Get user media for voice chat
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                if (userVideo.current) {
                    userVideo.current.srcObject = stream;
                }
                
                // Join room via socket
                socket.emit('join-room', {
                    roomId: roomId.trim(),
                    userId: user.id
                });
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                alert('Could not access microphone. Voice chat will not work.');
                
                // Join room anyway without audio
                socket.emit('join-room', {
                    roomId: roomId.trim(),
                    userId: user.id
                });
            });
    };

    const leaveRoom = () => {
        if (socket) {
            socket.emit('leave-room', roomId);
        }
        
        // Stop media stream
        if (userVideo.current && userVideo.current.srcObject) {
            userVideo.current.srcObject.getTracks().forEach(track => track.stop());
        }
        
        setIsInRoom(false);
        setUsers([]);
        setMessages([]);
        setRoomId('');
    };

    const toggleMute = () => {
        if (userVideo.current && userVideo.current.srcObject) {
            const audioTrack = userVideo.current.srcObject.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = isMuted;
                setIsMuted(!isMuted);
            }
        }
    };

    const sendMessage = () => {
        if (!newMessage.trim() || !socket) return;

        socket.emit('send-message', {
            roomId,
            message: newMessage.trim(),
            userId: user.id
        });

        setNewMessage('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    if (!isInRoom) {
        return (
            <div className="movie-room">
                <h2>🎬 Movie Room</h2>
                <div className="join-section">
                    <div className="join-form">
                        <input
                            type="text"
                            placeholder="Enter room ID (e.g., room123)"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                        />
                        <button onClick={joinRoom} disabled={!roomId.trim()}>
                            Join Room
                        </button>
                    </div>
                    <p className="join-help">
                        Enter a room ID to join or create a new movie room
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="movie-room">
            <div className="room-header">
                <h3>🎬 Room: {roomId}</h3>
                <div className="room-controls">
                    <button 
                        onClick={toggleMute} 
                        className={`control-btn ${isMuted ? 'muted' : ''}`}
                    >
                        {isMuted ? '🔇 Unmute' : '🔊 Mute'}
                    </button>
                    <button onClick={leaveRoom} className="control-btn leave-btn">
                        🚪 Leave Room
                    </button>
                </div>
            </div>

            <div className="room-content">
                <div className="movie-section">
                    <div className="video-placeholder">
                        <p>🎬 Movie player will be here</p>
                        <p>Coming soon: Movie search & streaming</p>
                    </div>
                </div>

                <div className="sidebar">
                    <div className="users-section">
                        <h4>👥 Users in room ({users.length})</h4>
                        <div className="users-list">
                            {users.map((roomUser, index) => (
                                <div key={roomUser.socketId || index} className="user-item">
                                    <span className="user-icon">
                                        {roomUser.userId === user.id ? '👑' : '👤'}
                                    </span>
                                    <span className="username">
                                        {roomUser.username || `User ${roomUser.userId?.substring(0, 6)}`}
                                        {roomUser.userId === user.id && ' (You)'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="chat-section">
                        <h4>💬 Chat</h4>
                        <div className="chat-messages">
                            {messages.map((msg) => (
                                <div key={msg.id} className="message">
                                    <span className="message-user">{msg.user.username}:</span>
                                    <span className="message-text">{msg.message}</span>
                                </div>
                            ))}
                        </div>
                        <div className="chat-input">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                            <button onClick={sendMessage} disabled={!newMessage.trim()}>
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden audio element for microphone */}
            <audio ref={userVideo} autoPlay muted />
        </div>
    );
};

export default MovieRoom;