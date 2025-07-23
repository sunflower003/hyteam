import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const MovieRoom = () => {
    const [socket, setSocket] = useState(null);
    const [roomId, setRoomId] = useState('');
    const [roomName, setRoomName] = useState('');
    const [isInRoom, setIsInRoom] = useState(false);
    const [users, setUsers] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [peers, setPeers] = useState({});
    const [isHost, setIsHost] = useState(false);
    
    // Movie states
    const [currentMovie, setCurrentMovie] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [trendingMovies, setTrendingMovies] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showMovieSearch, setShowMovieSearch] = useState(false);
    
    // Chat states
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    
    const { user } = useAuth();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const messagesEndRef = useRef(null);

    //Auto scroll to bottom when new message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth"});
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]); //goi ham scrollToBottom khi messages thay doi

    useEffect(() => {
        // Initialize socket connection
        const socketURL= import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        console.log('Connecting to socket server at:', socketURL);

        const newSocket = io(socketURL, {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });
        
        setSocket(newSocket);

        // Connection events
        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        // Room events
        newSocket.on('room-users', (roomUsers) => {
            console.log('Room users updated:', roomUsers);
            setUsers(roomUsers);
        });

        newSocket.on('user-joined', (data) => {
            console.log('User joined:', data);
            // Tao peer connection cho voice chat
            if (data.socketId !== newSocket.id) {
                const peer = createPeer(data.socketId, newSocket.id);
                peersRef.current.push({
                    peerID: data.socketId,
                    peer,
                });
                setPeers(prev => ({ ...prev, [data.socketId]: peer }));
            }
        });

        // Xu ly khi user roi di
        newSocket.on('user-left', (socketId) => {
            console.log('User left:', socketId);
            const peerObj = peersRef.current.find(p => p.peerID === socketId);
            if (peerObj) {
                peerObj.peer.destroy();
            }
            peersRef.current = peersRef.current.filter(p => p.peerID !== socketId);
            setPeers(prev => {
                const newPeers = { ...prev };
                delete newPeers[socketId];
                return newPeers;
            });
        });

        // WebRTC signaling events 
        newSocket.on('receiving-signal', (payload) => {
            console.log('Receiving signal from:', payload.callerID);
            const peer = addPeer(payload.signal, payload.callerID, newSocket);
            peersRef.current.push({
                peerID: payload.callerID,
                peer,
            });
            setPeers(prev => ({ ...prev, [payload.callerID]: peer }));
        });

        newSocket.on('signal-received', (payload) => {
            console.log('Signal received from:', payload.id);
            // Tim peer tuong ung voi callerID va gui tin hieu
            const item = peersRef.current.find(p => p.peerID === payload.id);
            if (item) {
                item.peer.signal(payload.signal);
            }
        });

        // Chat events
        newSocket.on('chat-message', (message) => {
            console.log('Received chat message', message);
            setMessages(prev => [...prev, message]);
        });

        // Movie change event
        newSocket.on('movie-changed', (movieData) => {
            console.log('Movie changed:', movieData);
            setCurrentMovie(movieData);
        });


        return () => {
            console.log('Cleaning up socket connection');
            newSocket.close();
        };
    }, []);

    useEffect(() => {
        fetchTrendingMovies();
    }, []);

    const createPeer = (userToSignal, callerID) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
        });

        peer.on('signal', (signal) => {
            console.log('Sending signal to:', userToSignal);
            socket.emit('sending-signal', { userToSignal, callerID, signal });
        });

        //Them stream tu camera va mic neu co
        if (userVideo.current && uservideo.current.srcObject) {
            peer.addStream(userVideo.current.srcObject);
        }

        return peer;
    };

    const addPeer = (incomingSignal, callerID) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
        });

        peer.on('signal', (signal) => {
            console.log('Returning signal to:', callerID);
            socket.emit('returning-signal', { signal, callerID });
        });

        //Them stream tu camera va mic neu co
        if (userVideo.current && userVideo.current.srcObject) {
            peer.addStream(userVideo.current.srcObject);
        }

        peer.signal(incomingSignal);
        return peer;
    };

    const fetchTrendingMovies = async () => {
        try {
            const response = await api.get('/api/movies/trending');
            if (response.data.success) {
                setTrendingMovies(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching trending movies:', error);
        }
    };

    const searchMovies = async () => {
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        try {
            const response = await api.get('/api/movies/search', {
                params: { query: searchQuery }
            });
            if (response.data.success) {
                setSearchResults(response.data.data.movies);
            }
        } catch (error) {
            console.error('Error searching movies:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const selectMovie = async (movie) => {
        if (!isHost) {
            alert('Only the host can change movies');
            return;
        }

        try {
            const response = await api.put(`/api/rooms/${roomId}/movie`, {
                tmdbId: movie.id,
                title: movie.title,
                poster: movie.posterPath,
                streamUrl: `https://vidsrc.xyz/embed/movie/${movie.id}`
            });

            if (response.data.success) {
                setCurrentMovie(response.data.data);
                setShowMovieSearch(false);
                
                // Thong bao cho cac nguoi dung khac thong qua socket
                console.log('Emmitting movie-selected event');
                socket.emit('movie-selected', {
                    roomId,
                    movie: response.data.data
                });
            }
        } catch (error) {
            console.error('Error selecting movie:', error);
            alert('Failed to select movie');
        }
    };

    const joinRoom = async () => {
        if (!roomId.trim()) {
            alert('Please enter a room ID');
            return;
        }

        try {
            // Get user media for voice chat
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                     audio: true, 
                     video: false 
                });
                if (userVideo.current) {
                    userVideo.current.srcObject = stream;
                }
                console.log('Audio stream obtained');
            } catch (mediaError) {
                console.warn('Could not access microphone:', mediaError);
                alert('Could not access microphone. Voice chat will not work');
            }

            // Get room info first
            try {
                const roomResponse = await api.get(`/api/rooms/${roomId}`);
                if (roomResponse.data.success) {
                    const roomData = roomResponse.data.data;
                    setIsHost(roomData.host._id === user.id);
                    setCurrentMovie(roomData.currentMovie);
                    console.log('Room found, user is host:', roomData.host._id === user.id);
                }
            } catch (error) {
                // Room doesn't exist, create it
                if (error.response?.status === 404) {
                    await api.post('/api/rooms', {
                        roomId: roomId.trim(),
                        name: roomName || `${user.username}'s Room`,
                        description: 'Movie watching room'
                    });
                    setIsHost(true);
                    console.log('New room created, user is host');
                }
            }
            
            // Join room via socket
            console.log('Joining room via socket:', roomId.trim());
            socket.emit('join-room', {
                roomId: roomId.trim(),
                user: {
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar
                }
            });

            setIsInRoom(true);
        } catch (error) {
            console.error('Error joining room:', error);
            alert('Failed to join room. Please try again.');
        }
    };

    const leaveRoom = () => {
        console.log('Leaving room', roomId);

        if (socket) {
            socket.emit('leave-room', roomId);
        }
        
        // Stop media stream
        if (userVideo.current && userVideo.current.srcObject) {
            userVideo.current.srcObject.getTracks().forEach(track => track.stop());
        }

        // Clean up peers
        peersRef.current.forEach(({ peer }) => {
            peer.destroy();
        });
        peersRef.current = [];
        setPeers({});
        
        setIsInRoom(false);
        setUsers([]);
        setMessages([]);
        setCurrentMovie(null);
        setRoomId('');
        setIsHost(false);
    };

    const toggleMute = () => {
        if (userVideo.current && userVideo.current.srcObject) {
            const audioTrack = userVideo.current.srcObject.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = isMuted;
                setIsMuted(!isMuted);
                console.log('Audio muted:', !isMuted);
            }
        }
    };

    const sendMessage = () => {
        if (!newMessage.trim() || !socket) return;

        const message = {
            id: Date.now(),
            user: { username: user.username },
            message: newMessage.trim(),
            timestamp: new Date()
        };
        console.log('Sending chat message:', message);
        // Emit message to server
        socket.emit('chat-message', {
            roomId,
            message
        });

        setMessages(prev => [...prev, message]); 
        setNewMessage('');
    };

    // Join Room UI
    if (!isInRoom) {
        return (
            <div className="movie-room-container">
                <div className="join-room-card">
                    <h2>🎬 Tham gia Phòng Phim</h2>
                    <div className="join-form">
                        <input
                            type="text"
                            placeholder="Nhập ID phòng (vd: room123)"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Tên phòng (tùy chọn)"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                        />
                        <button onClick={joinRoom} disabled={!roomId.trim()}>
                            Tham gia phòng
                        </button>
                    </div>
                    <p className="join-help">
                        Nhập ID phòng để tham gia hoặc tạo phòng mới
                    </p>
                </div>
            </div>
        );
    }

    // Main Room UI
    return (
        <div className="movie-room-container">
            <div className="room-header">
                <div className="room-info">
                    <h3>🎬 Phòng: {roomId}</h3>
                    {isHost && <span className="host-badge">👑 Host</span>}
                    <span className="connection-status">
                        {socket?.connected ? '🟢 Kết nối' : '🔴 Mất kết nối'}
                    </span>
                </div>
                <div className="room-controls">
                    {isHost && (
                        <button 
                            onClick={() => setShowMovieSearch(!showMovieSearch)}
                            className="control-btn movie-btn"
                        >
                            🎭 Chọn phim
                        </button>
                    )}
                    <button 
                        onClick={toggleMute} 
                        className={`control-btn ${isMuted ? 'muted' : ''}`}
                    >
                        {isMuted ? '🔇' : '🔊'}
                    </button>
                    <button onClick={leaveRoom} className="control-btn leave-btn">
                        🚪 Rời phòng
                    </button>
                </div>
            </div>

            {/* Movie Search Modal */}
            {showMovieSearch && isHost && (
                <div className="movie-search-modal">
                    <div className="movie-search-content">
                        <div className="search-header">
                            <h3>🔍 Tìm kiếm phim</h3>
                            <button 
                                onClick={() => setShowMovieSearch(false)}
                                className="close-btn"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Tìm kiếm phim..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && searchMovies()}
                            />
                            <button onClick={searchMovies} disabled={isSearching}>
                                {isSearching ? '⏳' : '🔍'}
                            </button>
                        </div>

                        <div className="movies-grid">
                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className="movies-section">
                                    <h4>Kết quả tìm kiếm</h4>
                                    <div className="movies-list">
                                        {searchResults.map(movie => (
                                            <div key={movie.id} className="movie-card" onClick={() => selectMovie(movie)}>
                                                <img src={movie.posterPath || '/placeholder.jpg'} alt={movie.title} />
                                                <div className="movie-info">
                                                    <h5>{movie.title}</h5>
                                                    <p>⭐ {movie.voteAverage?.toFixed(1)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Trending Movies */}
                            {searchResults.length === 0 && (
                                <div className="movies-section">
                                    <h4>🔥 Phim thịnh hành</h4>
                                    <div className="movies-list">
                                        {trendingMovies.map(movie => (
                                            <div key={movie.id} className="movie-card" onClick={() => selectMovie(movie)}>
                                                <img src={movie.posterPath || '/placeholder.jpg'} alt={movie.title} />
                                                <div className="movie-info">
                                                    <h5>{movie.title}</h5>
                                                    <p>⭐ {movie.voteAverage?.toFixed(1)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="room-content">
                {/* Movie Player */}
                <div className="movie-section">
                    {currentMovie ? (
                        <div className="movie-player">
                            <iframe
                                src={currentMovie.streamUrl}
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                allowFullScreen
                                title={currentMovie.title}
                                referrerPolicy="origin"
                            ></iframe>
                            <div className="movie-details">
                                <h4>{currentMovie.title}</h4>
                            </div>
                        </div>
                    ) : (
                        <div className="no-movie">
                            <h3>🎬 Chưa có phim nào được chọn</h3>
                            <p>{isHost ? 'Nhấn "Chọn phim" để bắt đầu' : 'Đang chờ host chọn phim...'}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="sidebar">
                    {/* Users */}
                    <div className="users-section">
                        <h4>👥 Thành viên ({users.length})</h4>
                        <div className="users-list">
                            {users.map((roomUser, index) => (
                                <div key={roomUser.socketId || index} className="user-item">
                                    <img 
                                        src={roomUser.avatar || '/default-avatar.png'} 
                                        alt={roomUser.username}
                                        className="user-avatar-small"
                                        onError={(e) => {
                                            e.target.src = 'https://via.placeholder.com/35/667eea/ffffff?text=' + (roomUser.username?.[0] || '?');
                                        }}
                                    />
                                    <span className="username">
                                        {roomUser.username}
                                        {roomUser.userId === user.id && ' (Bạn)'}
                                    </span>
                                    {/* Voice indicator */}
                                    {peers[roomUser.socketId] && (
                                        <span className="voice-indicator">🎤</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Chat */}
                    <div className="chat-section">
                        <h4>💬 Chat</h4>
                        <div className="chat-messages">
                            {messages.length === 0 ? (
                                <p className="no-messages">Chưa có tin nhắn nào...</p>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg.id} className="message">
                                        <div className="message-header">
                                            <span className="message-user">{msg.user.username}</span>
                                            <span className="message-time">
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="message-text">{msg.message}</div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="chat-input">
                            <input
                                type="text"
                                placeholder="Nhập tin nhắn..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                disabled={!socket?.connected}
                            />
                            <button 
                                onClick={sendMessage} 
                                disabled={!newMessage.trim() || !socket?.connected}>
                                📤
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden audio elements for voice chat */}
            <audio ref={userVideo} autoPlay muted />
            {Object.entries(peers).map(([peerId, peer]) => (
                <PeerAudio key={peerId} peer={peer} />
            ))}
        </div>
    );
};

// Component for peer audio
const PeerAudio = ({ peer }) => {
    const ref = useRef();

    useEffect(() => {
        peer.on('stream', (stream) => {
            console.log('Received peer audio stream');
            ref.current.srcObject = stream;
        });

        peer.on('error', (error) => {
            console.error('Peer error:', error);
        });

        return () => {
            peer.removeAllListeners();
        };
    }, [peer]);

    return <audio ref={ref} autoPlay />;
};

export default MovieRoom;