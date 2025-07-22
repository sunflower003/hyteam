import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

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

    useEffect(() => {
        // Initialize socket connection
        const newSocket = io('http://localhost:5000', {
            withCredentials: true
        });
        
        setSocket(newSocket);

        // Socket event listeners
        newSocket.on('room-users', (roomUsers) => {
            setUsers(roomUsers);
        });

        newSocket.on('user-joined', (data) => {
            console.log('User joined:', data);
            const peer = createPeer(data.socketId, newSocket.id);
            peersRef.current.push({
                peerID: data.socketId,
                peer,
            });
            setPeers(prev => ({ ...prev, [data.socketId]: peer }));
        });

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

        newSocket.on('receiving-signal', (payload) => {
            const peer = addPeer(payload.signal, payload.callerID);
            peersRef.current.push({
                peerID: payload.callerID,
                peer,
            });
            setPeers(prev => ({ ...prev, [payload.callerID]: peer }));
        });

        newSocket.on('signal-received', (payload) => {
            const item = peersRef.current.find(p => p.peerID === payload.id);
            if (item) {
                item.peer.signal(payload.signal);
            }
        });

        newSocket.on('movie-changed', (movieData) => {
            setCurrentMovie(movieData);
        });

        newSocket.on('chat-message', (message) => {
            setMessages(prev => [...prev, message]);
        });

        return () => {
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
            socket.emit('sending-signal', { userToSignal, callerID, signal });
        });

        return peer;
    };

    const addPeer = (incomingSignal, callerID) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
        });

        peer.on('signal', (signal) => {
            socket.emit('returning-signal', { signal, callerID });
        });

        peer.signal(incomingSignal);
        return peer;
    };

    const fetchTrendingMovies = async () => {
        try {
            const response = await axios.get('/api/movies/trending');
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
            const response = await axios.get('/api/movies/search', {
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
            const response = await axios.put(`/api/rooms/${roomId}/movie`, {
                tmdbId: movie.id,
                title: movie.title,
                poster: movie.posterPath,
                streamUrl: `https://vidsrc.xyz/embed/movie/${movie.id}`
            });

            if (response.data.success) {
                setCurrentMovie(response.data.data);
                setShowMovieSearch(false);
                
                // Notify other users via socket
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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (userVideo.current) {
                userVideo.current.srcObject = stream;
            }

            // Get room info first
            try {
                const roomResponse = await axios.get(`/api/rooms/${roomId}`);
                if (roomResponse.data.success) {
                    const roomData = roomResponse.data.data;
                    setIsHost(roomData.host._id === user.id);
                    setCurrentMovie(roomData.currentMovie);
                }
            } catch (error) {
                // Room doesn't exist, create it
                if (error.response?.status === 404) {
                    await axios.post('/api/rooms', {
                        roomId: roomId.trim(),
                        name: roomName || `${user.username}'s Room`,
                        description: 'Movie watching room'
                    });
                    setIsHost(true);
                }
            }
            
            // Join room via socket
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
            alert('Could not access microphone. Voice chat will not work.');
            
            // Join room anyway without audio
            socket.emit('join-room', {
                roomId: roomId.trim(),
                user: {
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar
                }
            });
            setIsInRoom(true);
        }
    };

    const leaveRoom = () => {
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
                                height="500px"
                                frameBorder="0"
                                allowFullScreen
                                title={currentMovie.title}
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
                                    />
                                    <span className="username">
                                        {roomUser.username}
                                        {roomUser.userId === user.id && ' (Bạn)'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Chat */}
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
                                placeholder="Nhập tin nhắn..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            />
                            <button onClick={sendMessage} disabled={!newMessage.trim()}>
                                📤
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden audio elements */}
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
            ref.current.srcObject = stream;
        });
    }, [peer]);

    return <audio ref={ref} autoPlay />;
};

export default MovieRoom;