import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import styles from '../styles/components/MovieRoom.module.css';

const MovieRoom = () => {
    const [socket, setSocket] = useState(null);
    const [roomId, setRoomId] = useState('');
    const [roomName, setRoomName] = useState('');
    const [isInRoom, setIsInRoom] = useState(false);
    const [users, setUsers] = useState([]);
    const [isHost, setIsHost] = useState(false);

    // Voice Chat States - Discord Logic
    const [voiceChannel, setVoiceChannel] = useState(null); // Current voice channel
    const [isConnectedToVoice, setIsConnectedToVoice] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [voiceUsers, setVoiceUsers] = useState(new Map()); // Map of socketId -> user voice state
    const [localStream, setLocalStream] = useState(null); // User's audio stream
    const [peers, setPeers] = useState(new Map()); // Map of socketId -> peer connection
    const [speakingUsers, setSpeakingUsers] = useState(new Set()); // Set of speaking user IDs
    const [isSpeaking, setIsSpeaking] = useState(false);
    
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
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    
    const { user } = useAuth();
    const messagesEndRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const speakingTimeoutRef = useRef(null);

    // Auto scroll to bottom when new message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Voice Activity Detection - Discord Style
    const setupVoiceActivityDetection = (stream) => {
        try {
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) return;

            // Cleanup existing context
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(console.error);
            }

            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);

            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.8;
            microphone.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            const detectSpeaking = () => {
                if (!analyserRef.current || !audioContextRef.current || 
                    audioContextRef.current.state !== 'running' || isMuted || isDeafened) {
                    requestAnimationFrame(detectSpeaking);
                    return;
                }

                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);

                // Calculate volume level
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                const SPEAKING_THRESHOLD = 30; // Discord uses ~25-30
                const currentlySpeaking = average > SPEAKING_THRESHOLD;

                if (currentlySpeaking !== isSpeaking) {
                    setIsSpeaking(currentlySpeaking);
                    
                    // Notify server about speaking state
                    if (socket && isConnectedToVoice) {
                        socket.emit('voice-speaking', {
                            roomId,
                            isSpeaking: currentlySpeaking
                        });
                    }

                    // Clear previous timeout
                    if (speakingTimeoutRef.current) {
                        clearTimeout(speakingTimeoutRef.current);
                    }

                    // Stop speaking after delay (Discord style)
                    if (currentlySpeaking) {
                        speakingTimeoutRef.current = setTimeout(() => {
                            setIsSpeaking(false);
                            if (socket && isConnectedToVoice) {
                                socket.emit('voice-speaking', {
                                    roomId,
                                    isSpeaking: false
                                });
                            }
                        }, 1000);
                    }
                }

                requestAnimationFrame(detectSpeaking);
            };

            detectSpeaking();
        } catch (error) {
            console.error('Error setting up voice activity detection:', error);
        }
    };

    // Socket Setup
    useEffect(() => {
        if (!user?.id) return;

        const socketURL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        const newSocket = io(socketURL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            timeout: 20000,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            auth: { token: localStorage.getItem('token') }
        });

        setSocket(newSocket);

        // Connection events
        newSocket.on('connect', () => {
            console.log('✅ Socket connected:', newSocket.id);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
            if (isConnectedToVoice) {
                disconnectFromVoice();
            }
        });

        // Room events
        newSocket.on('room-users', (roomUsers) => {
            console.log('👥 Room users updated:', roomUsers);
            setUsers(roomUsers);
        });

        newSocket.on('user-joined', (data) => {
            console.log('👋 User joined:', data);
            // If we're in voice and new user joins voice, create peer connection
            if (isConnectedToVoice && data.inVoiceChannel && data.socketId !== newSocket.id) {
                createPeerConnection(data.socketId, true, localStream);
            }
        });

        newSocket.on('user-left', (socketId) => {
            console.log('👋 User left:', socketId);
            removePeerConnection(socketId);
            setVoiceUsers(prev => {
                const updated = new Map(prev);
                updated.delete(socketId);
                return updated;
            });
            setSpeakingUsers(prev => {
                const updated = new Set(prev);
                updated.delete(socketId);
                return updated;
            });
        });

        // Voice Channel Events - Discord Style
        newSocket.on('voice-channel-users', (voiceUsersData) => {
            console.log('🎤 Voice channel users:', voiceUsersData);
            const voiceMap = new Map();
            voiceUsersData.forEach(user => {
                voiceMap.set(user.socketId, user);
            });
            setVoiceUsers(voiceMap);
        });

        newSocket.on('user-joined-voice', (data) => {
            console.log('🎤 User joined voice:', data);
            if (isConnectedToVoice && data.socketId !== newSocket.id) {
                createPeerConnection(data.socketId, true, localStream);
            }
            setVoiceUsers(prev => new Map(prev).set(data.socketId, data));
        });

        newSocket.on('user-left-voice', (socketId) => {
            console.log('🎤 User left voice:', socketId);
            removePeerConnection(socketId);
            setVoiceUsers(prev => {
                const updated = new Map(prev);
                updated.delete(socketId);
                return updated;
            });
        });

        // WebRTC Signaling
        newSocket.on('voice-signal-offer', (payload) => {
            console.log('📡 Received offer from:', payload.from);
            if (isConnectedToVoice) {
                createPeerConnection(payload.from, false, localStream, payload.signal);
            }
        });

        newSocket.on('voice-signal-answer', (payload) => {
            console.log('📡 Received answer from:', payload.from);
            const peer = peers.get(payload.from);
            if (peer && !peer.destroyed) {
                peer.signal(payload.signal);
            }
        });

        // Voice state changes
        newSocket.on('user-voice-state-changed', (data) => {
            console.log('🔊 Voice state changed:', data);
            setVoiceUsers(prev => {
                const updated = new Map(prev);
                const user = updated.get(data.socketId);
                if (user) {
                    updated.set(data.socketId, { ...user, ...data.voiceState });
                }
                return updated;
            });
        });

        newSocket.on('user-speaking-changed', (data) => {
            console.log('📢 Speaking changed:', data);
            setSpeakingUsers(prev => {
                const updated = new Set(prev);
                if (data.isSpeaking) {
                    updated.add(data.socketId);
                } else {
                    updated.delete(data.socketId);
                }
                return updated;
            });
        });

        // Chat events
        newSocket.on('chat-message', (message) => {
            setMessages(prev => [...prev, message]);
        });

        // Movie events
        newSocket.on('movie-changed', (movieData) => {
            setCurrentMovie(movieData);
        });

        return () => {
            console.log('🧹 Cleaning up socket connection');
            if (isConnectedToVoice) {
                disconnectFromVoice();
            }
            newSocket.removeAllListeners();
            newSocket.disconnect();
        };
    }, [user?.id]);

    // WebRTC Peer Management - Discord Style
    const createPeerConnection = (targetSocketId, initiator, stream, incomingSignal = null) => {
        try {
            console.log(`🔗 Creating peer connection to ${targetSocketId}, initiator: ${initiator}`);
            
            const peer = new Peer({
                initiator,
                trickle: false,
                stream: stream || undefined,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            peer.on('signal', (signal) => {
                console.log(`📡 Sending ${initiator ? 'offer' : 'answer'} to ${targetSocketId}`);
                socket.emit(initiator ? 'voice-signal-offer' : 'voice-signal-answer', {
                    to: targetSocketId,
                    signal
                });
            });

            peer.on('stream', (remoteStream) => {
                console.log(`🎵 Received stream from ${targetSocketId}`);
                // Stream will be handled by PeerAudio component
            });

            peer.on('error', (error) => {
                console.error(`❌ Peer error with ${targetSocketId}:`, error);
                removePeerConnection(targetSocketId);
            });

            peer.on('close', () => {
                console.log(`🔌 Peer connection closed with ${targetSocketId}`);
                removePeerConnection(targetSocketId);
            });

            // Handle incoming signal for non-initiator
            if (!initiator && incomingSignal) {
                peer.signal(incomingSignal);
            }

            setPeers(prev => new Map(prev).set(targetSocketId, peer));
            
        } catch (error) {
            console.error('Error creating peer connection:', error);
        }
    };

    const removePeerConnection = (socketId) => {
        const peer = peers.get(socketId);
        if (peer && !peer.destroyed) {
            peer.destroy();
        }
        setPeers(prev => {
            const updated = new Map(prev);
            updated.delete(socketId);
            return updated;
        });
    };

    // Voice Channel Management - Discord Style
    const connectToVoice = async () => {
        try {
            console.log('🎤 Connecting to voice channel...');

            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Microphone not supported');
            }

            // Get user media with optimal settings
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000, // Discord uses 48kHz
                    channelCount: 2
                },
                video: false
            });

            console.log('🎵 Got user media stream');
            
            setLocalStream(stream);
            setIsConnectedToVoice(true);
            setVoiceChannel(roomId);

            // Setup voice activity detection
            setupVoiceActivityDetection(stream);

            // Notify server that we joined voice
            socket.emit('join-voice-channel', {
                roomId,
                user: {
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar
                }
            });

            console.log('✅ Connected to voice channel');

        } catch (error) {
            console.error('❌ Error connecting to voice:', error);
            let errorMessage = 'Không thể kết nối voice chat: ';
            
            switch (error.name) {
                case 'NotAllowedError':
                    errorMessage += 'Quyền truy cập microphone bị từ chối';
                    break;
                case 'NotFoundError':
                    errorMessage += 'Không tìm thấy microphone';
                    break;
                case 'NotReadableError':
                    errorMessage += 'Microphone đang được sử dụng';
                    break;
                default:
                    errorMessage += error.message;
            }
            
            alert(errorMessage);
            setIsConnectedToVoice(false);
        }
    };

    const disconnectFromVoice = () => {
        console.log('🔌 Disconnecting from voice channel...');

        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach(track => {
                track.stop();
                console.log(`🛑 Stopped ${track.kind} track`);
            });
            setLocalStream(null);
        }

        // Close audio context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
        }

        // Clear speaking timeout
        if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
        }

        // Close all peer connections
        peers.forEach((peer, socketId) => {
            if (!peer.destroyed) {
                peer.destroy();
            }
        });
        setPeers(new Map());

        // Reset voice states
        setIsConnectedToVoice(false);
        setVoiceChannel(null);
        setIsSpeaking(false);
        setIsMuted(false);
        setIsDeafened(false);
        setSpeakingUsers(new Set());

        // Notify server
        if (socket) {
            socket.emit('leave-voice-channel', { roomId });
        }

        console.log('✅ Disconnected from voice channel');
    };

    // Voice Controls - Discord Style
    const toggleMute = () => {
        if (!localStream) return;

        const audioTracks = localStream.getAudioTracks();
        const newMutedState = !isMuted;
        
        audioTracks.forEach(track => {
            track.enabled = !newMutedState;
        });
        
        setIsMuted(newMutedState);
        
        // Notify server
        socket.emit('voice-state-change', {
            roomId,
            voiceState: { isMuted: newMutedState }
        });

        console.log(`🔇 ${newMutedState ? 'Muted' : 'Unmuted'} microphone`);
    };

    const toggleDeafen = () => {
        const newDeafenedState = !isDeafened;
        setIsDeafened(newDeafenedState);

        // Auto-mute when deafened
        if (newDeafenedState && !isMuted) {
            toggleMute();
        }

        // Notify server
        socket.emit('voice-state-change', {
            roomId,
            voiceState: { isDeafened: newDeafenedState }
        });

        console.log(`🔕 ${newDeafenedState ? 'Deafened' : 'Undeafened'}`);
    };

    // PeerAudio Component - Discord Style
    const PeerAudio = ({ peer, isDeafened }) => {
        const audioRef = useRef();

        useEffect(() => {
            const handleStream = (stream) => {
                if (audioRef.current) {
                    audioRef.current.srcObject = stream;
                    audioRef.current.volume = isDeafened ? 0 : 1;
                }
            };

            peer.on('stream', handleStream);
            return () => peer.removeListener('stream', handleStream);
        }, [peer, isDeafened]);

        return <audio ref={audioRef} autoPlay playsInline />;
    };

    // Rest of the component functions (fetchTrendingMovies, searchMovies, etc.) remain the same...
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

    const loadChatHistory = async (page = 1) => {
        if (!roomId || isLoadingMessages) return;

        setIsLoadingMessages(true);
        try {
            const response = await api.get(`/api/messages/room/${roomId}?page=${page}&limit=50`);
            if (response.data.success) {
                const { messages: newMessages, pagination } = response.data.data;

                if (page === 1) {
                    setMessages(newMessages);
                } else {
                    setMessages(prev => [...newMessages, ...prev]);
                }
                setHasMoreMessages(pagination.currentPage < pagination.totalPages);
                setCurrentPage(pagination.currentPage);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const joinRoom = async () => {
        if (!roomId.trim()) {
            alert('Please enter a room ID');
            return;
        }

        try {
            // Get or create room
            try {
                const roomResponse = await api.get(`/api/rooms/${roomId}`);
                if (roomResponse.data.success) {
                    const roomData = roomResponse.data.data;
                    setIsHost(roomData.host._id === user.id);
                    setCurrentMovie(roomData.currentMovie);
                }
            } catch (error) {
                if (error.response?.status === 404) {
                    await api.post('/api/rooms', {
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
            await loadChatHistory(1);
            fetchTrendingMovies();

        } catch (error) {
            console.error('Error joining room:', error);
            alert('Failed to join room. Please try again.');
        }
    };

    const leaveRoom = () => {
        if (socket) {
            socket.emit('leave-room', roomId);
        }
        
        if (isConnectedToVoice) {
            disconnectFromVoice();
        }
        
        setIsInRoom(false);
        setUsers([]);
        setMessages([]);
        setCurrentMovie(null);
        setRoomId('');
        setIsHost(false);
    };

    const sendMessage = () => {
        if (!newMessage.trim() || !socket?.connected || !roomId || !user?.id) return;

        const message = {
            id: Date.now(),
            user: { 
                id: user.id,
                username: user.username,
                avatar: user.avatar
            },
            message: newMessage.trim(),
            timestamp: new Date()
        };

        socket.emit('chat-message', { roomId, message });
        setNewMessage('');
    };

    // Join Room UI
    if (!isInRoom) {
        return (
            <div className={styles.movieRoomContainer}>
                <div className={styles.joinRoomCard}>
                    <h2>🎬 Tham gia Phòng Phim</h2>
                    <div className={styles.joinForm}>
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
                        <button 
                            onClick={joinRoom} 
                            disabled={!roomId.trim()}
                            className={styles.joinButton}
                        >
                            Tham gia phòng
                        </button>
                    </div>
                    <p>Nhập ID phòng để tham gia hoặc tạo phòng mới</p>
                </div>
            </div>
        );
    }

    // Main Room UI - Discord Style Voice Controls
    return (
        <div className={styles.movieRoomContainer}>
            <div className={styles.roomHeader}>
                <div className={styles.roomInfo}>
                    <h3>🎬 Phòng: {roomId}</h3>
                    {isHost && <span className={styles.hostBadge}>👑 Host</span>}
                    <span className={styles.connectionStatus}>
                        {socket?.connected ? '🟢 Kết nối' : '🔴 Mất kết nối'}
                    </span>
                </div>

                {/* Discord-style Voice Controls */}
                <div className={styles.voiceControls}>
                    {!isConnectedToVoice ? (
                        <button onClick={connectToVoice} className={styles.voiceJoinBtn}>
                            🎤 Tham gia Voice Chat
                        </button>
                    ) : (
                        <div className={styles.voiceControlGroup}>
                            <button 
                                onClick={toggleMute}
                                className={`${styles.voiceBtn} ${isMuted ? styles.muted : ''}`}
                                title={isMuted ? 'Bỏ tắt tiếng' : 'Tắt tiếng'}
                            >
                                {isMuted ? '🔇' : '🎤'}
                            </button>

                            <button
                                onClick={toggleDeafen}
                                className={`${styles.voiceBtn} ${isDeafened ? styles.deafened : ''}`}
                                title={isDeafened ? 'Bỏ tắt nghe' : 'Tắt nghe'}
                            >
                                {isDeafened ? '🔕' : '🔊'}
                            </button>

                            <button 
                                onClick={disconnectFromVoice}
                                className={`${styles.voiceBtn} ${styles.disconnect}`}
                                title="Rời voice chat"
                            >
                                🚪
                            </button>

                            {/* Speaking Indicator */}
                            {isSpeaking && (
                                <div className={styles.speakingIndicator}>
                                    📢 Đang nói...
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.roomControls}>
                    {isHost && (
                        <button 
                            onClick={() => setShowMovieSearch(!showMovieSearch)}
                            className={`${styles.controlBtn} ${styles.movieBtn}`}
                        >
                            🎭 Chọn phim
                        </button>
                    )}
                    <button onClick={leaveRoom} className={`${styles.controlBtn} ${styles.leaveBtn}`}>
                        🚪 Rời phòng
                    </button>
                </div>
            </div>

            {/* Movie Search Modal - keep existing code */}
            {showMovieSearch && isHost && (
                <div className={styles.movieSearchModal}>
                    <div className={styles.movieSearchContent}>
                        <div className={styles.searchHeader}>
                            <h3>🔍 Tìm kiếm phim</h3>
                            <button 
                                onClick={() => setShowMovieSearch(false)}
                                className={styles.closeBtn}
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className={styles.searchBar}>
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

                        <div className={styles.moviesGrid}>
                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className={styles.moviesSection}>
                                    <h4>Kết quả tìm kiếm</h4>
                                    <div className={styles.moviesList}>
                                        {searchResults.map(movie => (
                                            <div key={movie.id} className={styles.movieCard} onClick={() => selectMovie(movie)}>
                                                <img src={movie.posterPath || '/placeholder.jpg'} alt={movie.title} />
                                                <div className={styles.movieInfo}>
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
                                <div className={styles.moviesSection}>
                                    <h4>🔥 Phim thịnh hành</h4>
                                    <div className={styles.moviesList}>
                                        {trendingMovies.map(movie => (
                                            <div key={movie.id} className={styles.movieCard} onClick={() => selectMovie(movie)}>
                                                <img src={movie.posterPath || '/placeholder.jpg'} alt={movie.title} />
                                                <div className={styles.movieInfo}>
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

            <div className={styles.roomContent}>
                {/* Movie Player - keep existing code */}
                <div className={styles.movieSection}>
                    {currentMovie ? (
                        <div className={styles.moviePlayer}>
                            <iframe
                                src={currentMovie.streamUrl}
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                allowFullScreen
                                title={currentMovie.title}
                                referrerPolicy="origin"
                            />
                        </div>
                    ) : (
                        <div className={styles.noMovie}>
                            <h3>🎬 Chưa có phim nào được chọn</h3>
                            <p>{isHost ? 'Nhấn "Chọn phim" để bắt đầu' : 'Đang chờ host chọn phim...'}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className={styles.sidebar}>
                    {/* Discord-style Voice Channel Users */}
                    {isConnectedToVoice && (
                        <div className={styles.voiceChatSection}>
                            <h4>🎤 Voice Chat ({voiceUsers.size})</h4>
                            <div className={styles.voiceUsersList}>
                                {/* Current user */}
                                <div className={`${styles.voiceUserItem} ${isSpeaking ? styles.speaking : ''}`}>
                                    <img 
                                        src={user.avatar} 
                                        alt={user.username}
                                        className={styles.voiceAvatar}
                                    />
                                    <span className={styles.voiceUsername}>
                                        {user.username} (Bạn)
                                    </span>
                                    <div className={styles.voiceIndicators}>
                                        {isMuted && <span className={styles.mutedIcon}>🔇</span>}
                                        {isDeafened && <span className={styles.deafenedIcon}>🔕</span>}
                                        {isSpeaking && <span className={styles.speakingIcon}>📢</span>}
                                    </div>
                                </div>
                                
                                {/* Other voice users */}
                                {Array.from(voiceUsers.entries()).map(([socketId, voiceUser]) => (
                                    <div 
                                        key={socketId} 
                                        className={`${styles.voiceUserItem} ${speakingUsers.has(socketId) ? styles.speaking : ''}`}
                                    >
                                        <img 
                                            src={voiceUser.avatar} 
                                            alt={voiceUser.username}
                                            className={styles.voiceAvatar}
                                        />
                                        <span className={styles.voiceUsername}>{voiceUser.username}</span>
                                        <div className={styles.voiceIndicators}>
                                            {voiceUser.isMuted && <span className={styles.mutedIcon}>🔇</span>}
                                            {speakingUsers.has(socketId) && <span className={styles.speakingIcon}>📢</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Users List - keep existing code */}
                    <div className={styles.usersSection}>
                        <h4>👥 Thành viên ({users.length})</h4>
                        <div className={styles.usersList}>
                            {users.map((roomUser, index) => (
                                <div key={roomUser.socketId || index} className={styles.userItem}>
                                    <img 
                                        src={roomUser.avatar || '/default-avatar.png'} 
                                        alt={roomUser.username}
                                        className={styles.userAvatarSmall}
                                    />
                                    <span className={styles.username}>
                                        {roomUser.username}
                                        {roomUser.userId === user.id && ' (Bạn)'}
                                    </span>
                                    <div className={styles.userStatus}>
                                        {voiceUsers.has(roomUser.socketId) && <span className={styles.voiceStatus}>🎤</span>}
                                        {speakingUsers.has(roomUser.socketId) && <span className={styles.speakingStatus}>📢</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Chat Section - keep existing code */}
                    <div className={styles.chatSection}>
                        <div className={styles.chatHeader}>
                            <h4>💬 Chat</h4>
                            {hasMoreMessages && (
                                <button 
                                    onClick={() => loadChatHistory(currentPage + 1)}
                                    disabled={isLoadingMessages}
                                    className={styles.loadMoreBtn}
                                >
                                    {isLoadingMessages ? '⏳' : '📜 Tải thêm'}
                                </button>
                            )}
                        </div>

                        <div className={styles.chatMessages}>
                            {messages.length === 0 ? (
                                <p className={styles.noMessages}>Chưa có tin nhắn nào...</p>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg.id} className={styles.message}>
                                        <div className={styles.messageHeader}>
                                            <span className={styles.messageUser}>{msg.user.username}</span>
                                            <span className={styles.messageTime}>
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className={styles.messageText}>{msg.message}</div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        <div className={styles.chatInput}>
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
                                disabled={!newMessage.trim() || !socket?.connected}
                            >
                                📤
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Audio elements for peer connections */}
            {Array.from(peers.entries()).map(([peerId, peer]) => (
                <PeerAudio key={peerId} peer={peer} isDeafened={isDeafened} />
            ))}
        </div>
    );
};

export default MovieRoom;