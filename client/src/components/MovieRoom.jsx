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
    const [peers, setPeers] = useState({});
    const [isHost, setIsHost] = useState(false);

    // Voice Chat States - Discord-like
    const [isVoiceConnected, setIsVoiceConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceActivity, setVoiceActivity] = useState({});
    const [audioInputLevel, setAudioInputLevel] = useState(0);
    
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
    const userVideo = useRef();
    const peersRef = useRef([]);
    const messagesEndRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const speakingTimeoutRef = useRef(null);

    //Auto scroll to bottom when new message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth"});
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]); //goi ham scrollToBottom khi messages thay doi

    //Voice activity detection - fix audio context issue
    const setupVoiceActivityDetection = (stream) => {
        try {
            console.log('Setting up voice activity detection');
            
            // Kiem tra stream co audio track
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                console.log('No audio tracks found in the stream');
                return;
            }
            
            console.log('Audio tracks available:', audioTracks.map(t => t.label));

            // cleanup existing audio context
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                console.log('Closing existing AudioContext');
                audioContextRef.current.close().catch(console.error);
            }

            // Kiểm tra browser support
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                console.warn('AudioContext not supported');
                return;
            }
            
            const audioContext = new AudioContext();
            console.log('AudioContext created, state:', audioContext.state);
            
            //Cho context duoc khoi tao - thêm click handler để đảm bảo resume
            if (audioContext.state === 'suspended') {
                // Cách xử lý tốt hơn cho AudioContext suspended
                const resumeAudio = () => {
                    console.log('Trying to resume AudioContext on user interaction');
                    audioContext.resume().then(() => {
                        console.log('AudioContext resumed successfully');
                    }).catch(error => {
                        console.error('Error resuming AudioContext:', error);
                    });
                    
                    // Remove event listeners after one successful attempt
                    document.removeEventListener('click', resumeAudio);
                    document.removeEventListener('touchstart', resumeAudio);
                };
                
                document.addEventListener('click', resumeAudio);
                document.addEventListener('touchstart', resumeAudio);
                
                // Cũng thử resume luôn (có thể sẽ thành công nếu đã có tương tác người dùng trước đó)
                audioContext.resume().then(() => {
                    console.log('AudioContext resumed immediately');
                }).catch(e => {
                    console.log('Could not resume AudioContext immediately, waiting for user interaction');
                });
            }
            
            const analyser = audioContext.createAnalyser();
            let microphone;

            try {
                // Kết nối microphone với AudioContext
                microphone = audioContext.createMediaStreamSource(stream);
            } catch (sourceError) {
                console.error('Error creating MediaStreamSource:', sourceError);
                audioContext.close().catch(console.error);
                return;
            }

            // Thiết lập Analyser
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            // Connect microphone to analyser
            microphone.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            const detectSpeaking = () => {
                if (!analyserRef.current || !audioContextRef.current || isMuted || isDeafened || audioContextRef.current.state !== 'running') {
                    if (audioContextRef.current && audioContextRef.current.state === 'running') {
                        requestAnimationFrame(detectSpeaking);
                    }
                    return;
                }

                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);

                //Tinh muc do am thanh
                const average = dataArray.reduce((a, b) => a+b) / dataArray.length;
                setAudioInputLevel(average);

                // Phat hien speaking (threshold co the dieu chinh)
                const SPEAKING_THRESHOLD = 25;
                const currentlySpeaking = average > SPEAKING_THRESHOLD;

                if (currentlySpeaking !== isSpeaking) {
                    setIsSpeaking(currentlySpeaking);

                    // Emit speaking state
                    if (socket && roomId) {
                        socket.emit('speaking-state', {
                            roomId, 
                            isSpeaking: currentlySpeaking
                        });
                    }

                    //Clear previous timeout
                    if (speakingTimeoutRef.current) {
                        clearTimeout(speakingTimeoutRef.current);
                        speakingTimeoutRef.current = null;
                    }

                    // Stop speaking after delay
                    if (currentlySpeaking) {
                        speakingTimeoutRef.current = setTimeout(() => {
                            setIsSpeaking(false);
                            if (socket && roomId) {
                                socket.emit('speaking-state', {
                                    roomId, 
                                    isSpeaking: false
                                });
                            }
                        }, 1500); // 1.5 seconds
                    }
                }
                
                requestAnimationFrame(detectSpeaking);
            };
            // Start detection
            detectSpeaking();
        } catch (error) {
            console.error('Error setting up voice activity detection:', error);
        }
    };


    useEffect(() => {
        if (!user || !user.id) {
            console.error('User not authenticated');
            return;
        }

        // Initialize socket connection
        const socketURL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        console.log('Connecting to socket server at:', socketURL);

        const newSocket = io(socketURL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            forceNew: false,
            timeout: 20000,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            auth: {
                token: localStorage.getItem('token')
            }
        });
        
        setSocket(newSocket);

        // Connection events
        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            // Auto cleanup voice chat khi mất kết nối
            if (isVoiceConnected) {
                console.log('Auto leaving voice chat due to disconnect');
                // Không gọi leaveVoiceChat() vì socket đã disconnect
                // Chỉ cleanup local state
                if (userVideo.current && userVideo.current.srcObject) {
                    userVideo.current.srcObject.getTracks().forEach(track => track.stop());
                    userVideo.current.srcObject = null;
                }
                if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                    audioContextRef.current.close().catch(console.error);
                }
                peersRef.current.forEach(({ peer }) => {
                    if (peer && !peer.destroyed) {
                        peer.destroy();
                    }
                });
                peersRef.current = [];
                setPeers({});
                setIsVoiceConnected(false);
                setIsSpeaking(false);
                setVoiceActivity({});
                setAudioInputLevel(0);
            }
        });

        // Room events
        newSocket.on('room-users', (roomUsers) => {
            console.log('Room users updated:', roomUsers);
            setUsers(roomUsers);
        });

        newSocket.on('user-joined', (data) => {
            console.log('User joined:', data);
            // Update users list
            setUsers(prev => {
                const exists = prev.find(u => u.socketId === data.socketId);
                if (!exists) {
                    return [...prev, data];
                }
                return prev;
            });

            // Tạo peer connection cho voice chat nếu user join voice
            if (data.socketId !== newSocket.id && data.inVoiceChat && isVoiceConnected && userVideo.current?.srcObject) {
                const peer = createPeer(data.socketId, newSocket.id, userVideo.current.srcObject);
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
            
            // Update users list
            setUsers(prev => prev.filter(u => u.socketId !== socketId));
            
            // Clean up peer
            const peerObj = peersRef.current.find(p => p.peerID === socketId);
            if (peerObj && !peerObj.peer.destroyed) {
                peerObj.peer.destroy();
            }
            peersRef.current = peersRef.current.filter(p => p.peerID !== socketId);
            setPeers(prev => {
                const newPeers = { ...prev };
                delete newPeers[socketId];
                return newPeers;
            });

            //Remove from voice activity
            setVoiceActivity(prev => {
                const newActivity = { ...prev };
                delete newActivity[socketId];
                return newActivity;
            });
        });

        // Voice chat events
        newSocket.on('user-joined-voice', (data) => {
            console.log('User joined voice chat:', data);
            
            // Update user's voice status
            setUsers(prev => prev.map(u => 
                u.socketId === data.socketId 
                    ? { ...u, inVoiceChat: true }
                    : u
            ));

            // Create peer if we're also in voice
            if (data.socketId !== newSocket.id && isVoiceConnected && userVideo.current?.srcObject) {
                const peer = createPeer(data.socketId, newSocket.id, userVideo.current.srcObject);
                peersRef.current.push({
                    peerID: data.socketId,
                    peer,
                });
                setPeers(prev => ({ ...prev, [data.socketId]: peer }));
            }
        });

        newSocket.on('user-left-voice', (data) => {
            console.log('User left voice chat:', data);
            
            // Update user's voice status
            setUsers(prev => prev.map(u => 
                u.socketId === data.socketId 
                    ? { ...u, inVoiceChat: false }
                    : u
            ));

            // Clean up peer
            const peerObj = peersRef.current.find(p => p.peerID === data.socketId);
            if (peerObj && !peerObj.peer.destroyed) {
                peerObj.peer.destroy();
            }
            peersRef.current = peersRef.current.filter(p => p.peerID !== data.socketId);
            setPeers(prev => {
                const newPeers = { ...prev };
                delete newPeers[data.socketId];
                return newPeers;
            });

            // Remove from voice activity
            setVoiceActivity(prev => {
                const newActivity = { ...prev };
                delete newActivity[data.socketId];
                return newActivity;
            });
        });

        // WebRTC signaling events 
        newSocket.on('receiving-signal', (payload) => {
            console.log('Receiving signal from:', payload.callerID);
            if (isVoiceConnected && userVideo.current?.srcObject) {
                const peer = addPeer(payload.signal, payload.callerID, userVideo.current.srcObject);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                });
                setPeers(prev => ({ ...prev, [payload.callerID]: peer }));
            }
        });

        newSocket.on('signal-received', (payload) => {
            console.log('Signal received from:', payload.id);
            const item = peersRef.current.find(p => p.peerID === payload.id);
            if (item && !item.peer.destroyed) {
                item.peer.signal(payload.signal);
            }
        });

        // Voice activity events
        newSocket.on('user-mute-changed', (data) => {
            console.log('User mute changed:', data);
            setUsers(prev => prev.map(user => 
                user.socketId === data.socketId
                    ? { ...user, isMuted: data.isMuted }
                    : user
            ));
        });

        newSocket.on('user-speaking-changed', (data) => {
            console.log('User speaking changed:', data);
            setVoiceActivity(prev => ({
                ...prev,
                [data.socketId]: data.isSpeaking
            }));
        });

        // Chat events
        newSocket.on('chat-message', (message) => {
            console.log('Received chat message', message);
            setMessages(prev => {
                const newMessages = [...prev, message];
                return newMessages;
            });
        });

        // Movie change event
        newSocket.on('movie-changed', (movieData) => {
            console.log('Movie changed:', movieData);
            setCurrentMovie(movieData);
        });


        return () => {
            console.log('Cleaning up socket connection');

            // Stop voice chat nếu đang active
            if (isVoiceConnected) {
                if (userVideo.current && userVideo.current.srcObject) {
                    userVideo.current.srcObject.getTracks().forEach(track => track.stop());
                }
                if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                    audioContextRef.current.close().catch(console.error);
                }
            }
            
            if (speakingTimeoutRef.current) {
                clearTimeout(speakingTimeoutRef.current);
            }

            // Clean up peers
            peersRef.current.forEach(({ peer }) => {
                if (peer && !peer.destroyed) {
                    peer.destroy();
                }
            });
            
            // Disconnect socket properly
            newSocket.removeAllListeners();
            newSocket.disconnect();
        };
    }, [user?.id]); // Remove isVoiceConnected from dependency

    useEffect(() => {
        fetchTrendingMovies();
    }, []);

    //Load chat history 
    const loadChatHistory = async (page = 1) => {
        if (!roomId || isLoadingMessages) return;

        setIsLoadingMessages(true);
        try {
            const response = await api.get(`/api/messages/room/${roomId}?page=${page}&limit=50`);
            if (response.data.success) {
                const { messages: newMessages, pagination } = response.data.data;

                if (page === 1) {
                    setMessages(newMessages);
                }
                else {
                    setMessages(prev => [...newMessages, ...prev]);
                }
                setHasMoreMessages(pagination.currentPage < pagination.totalPages);
                setCurrentPage(pagination.currentPage);
                console.log('Chat history loaded:', newMessages.length, 'messages');
            }
            
        } catch (error) {
            console.error('Error loading chat history:', error);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    // Fix WebRTC peer creation logic
    // Cải thiện phần createPeer - thêm logging và xử lý sự kiện
    const createPeer = (userToSignal, callerID, stream) => {
        try {
            console.log('Creating peer connection to:', userToSignal);
            const peer = new Peer({
                initiator: true,
                trickle: false,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' },
                        { urls: 'stun:stun3.l.google.com:19302' },
                        { urls: 'stun:stun4.l.google.com:19302' },
                    ]
                }
            });

            peer.on('signal', (signal) => {
                console.log('Generated signal for peer:', userToSignal);
                if (socket && socket.connected) {
                    socket.emit('sending-signal', { userToSignal, callerID, signal });
                }
            });

            // Thêm sự kiện connect để biết khi kết nối thành công
            peer.on('connect', () => {
                console.log('Peer connection established successfully with:', userToSignal);
            });

            peer.on('error', (error) => {
                console.error('Peer connection error with', userToSignal, error);
                // Remove failed peer
                peersRef.current = peersRef.current.filter(p => p.peerID !== userToSignal);
                setPeers(prev => {
                    const newPeers = { ...prev };
                    delete newPeers[userToSignal];
                    return newPeers;
                });
            });

            // Add stream if available - cải thiện cách thêm stream
            if (stream) {
                console.log('Adding local stream to peer');
                try {
                    peer.addStream(stream);
                } catch (streamError) {
                    console.error('Error adding stream to peer:', streamError);
                }
            }

            return peer;
        } catch (error) {
            console.error('Error creating peer:', error);
            throw error;
        }
    };

    const addPeer = (incomingSignal, callerID, stream) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ]
            }
        });

        peer.on('signal', (signal) => {
            console.log('Returning signal to:', callerID);
            socket.emit('returning-signal', { signal, callerID });
        });

        peer.on('error', (error) => {
            console.error('Peer error:', error);
        });

        // Add stream if available
        if (stream) {
            peer.addStream(stream);
        }

        peer.signal(incomingSignal);
        return peer;
    };

    const PeerAudio = ({ peer, isDeafened }) => {
        const ref = useRef();
        const [connected, setConnected] = useState(false);
        const [audioLevel, setAudioLevel] = useState(0);
        const audioContextRef = useRef(null);
        const audioAnalyserRef = useRef(null);
        const animationRef = useRef(null);

        useEffect(() => {
            const handleStream = (stream) => {
                console.log('🎵 Received peer audio stream with tracks:', stream.getTracks().length);
                console.log('Track details:', stream.getTracks().map(t => ({
                    kind: t.kind,
                    enabled: t.enabled,
                    muted: t.muted,
                    readyState: t.readyState
                })));
                
                if (ref.current && stream) {
                    // Thiết lập volume cao hơn
                    ref.current.srcObject = stream;
                    ref.current.volume = isDeafened ? 0 : 1;
                    
                    // Force output to device speakers
                    if (typeof ref.current.setSinkId === 'function') {
                        ref.current.setSinkId('default').catch(err => 
                            console.warn('Cannot set audio output device:', err)
                        );
                    }
                    
                    // Add visualization để debug
                    try {
                        const AudioContext = window.AudioContext || window.webkit.AudioContext;
                        if (AudioContext) {
                            audioContextRef.current = new AudioContext();
                            const source = audioContextRef.current.createMediaStreamSource(stream);
                            audioAnalyserRef.current = audioContextRef.current.createAnalyser();
                            audioAnalyserRef.current.fftSize = 64;
                            source.connect(audioAnalyserRef.current);
                            
                            const detectAudio = () => {
                                if (!audioAnalyserRef.current) return;
                                const data = new Uint8Array(audioAnalyserRef.current.frequencyBinCount);
                                audioAnalyserRef.current.getByteFrequencyData(data);
                                const average = data.reduce((a, b) => a + b) / data.length;
                                setAudioLevel(average);
                                animationRef.current = requestAnimationFrame(detectAudio);
                            };
                            detectAudio();
                        }
                    } catch (err) {
                        console.log('Audio visualization setup error:', err);
                    }
                    
                    // Play with user interaction handling
                    const playWithFullVolume = () => {
                        console.log('🔊 Attempting to play audio...');
                        const playPromise = ref.current.play();
                        
                        if (playPromise) {
                            playPromise.then(() => {
                                console.log('🔊 Audio playing successfully');
                                ref.current.volume = isDeafened ? 0 : 1;
                            }).catch(err => {
                                console.warn('🔇 Autoplay prevented:', err);
                                
                                // Create a visible button for user to click
                                const unlockButton = document.createElement('button');
                                unlockButton.textContent = '🔊 Click to enable audio';
                                unlockButton.style.position = 'fixed';
                                unlockButton.style.top = '10px';
                                unlockButton.style.right = '10px';
                                unlockButton.style.zIndex = '9999';
                                unlockButton.style.padding = '8px';
                                unlockButton.style.background = '#f00';
                                unlockButton.style.color = 'white';
                                
                                unlockButton.onclick = () => {
                                    ref.current.play().catch(console.error);
                                    document.body.removeChild(unlockButton);
                                };
                                
                                document.body.appendChild(unlockButton);
                            });
                        }
                    };
                    
                    playWithFullVolume();
                    
                    // Also try to play when window gets focus
                    window.addEventListener('focus', playWithFullVolume);
                    document.addEventListener('click', playWithFullVolume, {once: true});
                }
            };

            const handleError = (error) => {
                console.error('Peer audio error:', error);
            };

            const handleConnect = () => {
                console.log('Peer audio connection established');
                setConnected(true);
            };

            if (peer && !peer.destroyed) {
                peer.on('stream', handleStream);
                peer.on('error', handleError);
                peer.on('connect', handleConnect);

                return () => {
                    if (animationRef.current) {
                        cancelAnimationFrame(animationRef.current);
                    }
                    if (audioContextRef.current) {
                        audioContextRef.current.close().catch(console.error);
                    }
                    peer.removeListener('stream', handleStream);
                    peer.removeListener('error', handleError);
                    peer.removeListener('connect', handleConnect);
                    window.removeEventListener('focus', () => {});
                };
            }
        }, [peer, isDeafened]);

        // Update volume when isDeafened changes
        useEffect(() => {
            if (ref.current) {
                ref.current.volume = isDeafened ? 0 : 1;
            }
        }, [isDeafened]);

        return (
            <div className={styles.peerAudioContainer}>
                <audio 
                    ref={ref} 
                    autoPlay 
                    playsInline 
                    controls={true} // Tạm thời hiện controls để debug
                />
                {!connected && <div className={styles.hiddenInfo}>Đang kết nối audio...</div>}
                {connected && <div 
                    className={styles.audioIndicator} 
                    style={{
                        width: `${Math.min(audioLevel * 2, 100)}%`,
                        background: audioLevel > 0 ? '#4CAF50' : '#ccc'
                    }}
                />}
            </div>
        );
    };

    // Fix joinVoiceChat Logic
    const joinVoiceChat = async () => {
        try {
            console.log('Requesting microphone access for voice chat');

            // Kiểm tra browser support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Trình duyệt không hỗ trợ truy cập microphone');
            }

            // Kiểm tra socket connection
            if (!socket || !socket.connected) {
                throw new Error('Không có kết nối socket');
            }

            // Kiểm tra roomId
            if (!roomId) {
                throw new Error('Chưa tham gia phòng');
            }

            // Request microphone access với error handling 
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 44100,
                        channelCount: 1
                    },
                    video: false
                });
            } catch (mediaError) {
                console.error('Error accessing microphone:', mediaError);

                // Thử lại với constraints đơn giản hơn
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: false
                    });
                } catch (fallbackError) {
                    console.error('Fallback getUserMedia error:', fallbackError);
                    throw new Error(`Không thể truy cập microphone: ${fallbackError.message}`);
                }
            }

            console.log('Microphone access granted, stream:', stream);

            // Kiểm tra stream có audio track không
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                stream.getTracks().forEach(track => track.stop());
                throw new Error('Không tìm thấy audio track trong microphone stream');
            }
            console.log('Audio tracks:', audioTracks.length);

            // Gán stream vào video element
            if (userVideo.current) {
                userVideo.current.srcObject = stream;
            } else {
                console.warn('userVideo ref is null');
            }

            // Setup voice activity detection
            try {
                setupVoiceActivityDetection(stream);
            } catch (vdError) {
                console.warn('Voice activity detection setup failed:', vdError);
            }

            setIsVoiceConnected(true);

            // Emit join voice chat event
            socket.emit('join-voice-chat', {
                roomId,
                user: {
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar,
                    socketId: socket.id
                }
            });

            // Tạo peer connections cho users hiện tại đã trong voice
            if (users && users.length > 0) {
                users.forEach(roomUser => {
                    if (roomUser.socketId && roomUser.socketId !== socket.id && roomUser.inVoiceChat) {
                        try {
                            const peer = createPeer(roomUser.socketId, socket.id, stream);
                            peersRef.current.push({
                                peerID: roomUser.socketId,
                                peer,
                            });
                            setPeers(prev => ({ ...prev, [roomUser.socketId]: peer }));
                        } catch (peerError) {
                            console.error('Error creating peer for user:', roomUser.socketId, peerError);
                        }
                    }
                });
            }

            console.log('Voice chat joined successfully');

            // Log thêm thông tin về stream và audio devices
            console.log('Stream audio tracks:', stream.getAudioTracks().map(track => ({
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
                label: track.label
            })));

            // Kiểm tra audio output devices
            navigator.mediaDevices.enumerateDevices()
                .then(devices => {
                    const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
                    console.log('Available audio output devices:', audioOutputs);
                    
                    // Nếu có nhiều output device, log thông tin
                    if (audioOutputs.length > 1) {
                        console.log('Multiple audio outputs available - make sure correct one is selected');
                    }
                })
                .catch(err => console.error('Error getting audio devices:', err));
        } catch (error) {
            console.error('Error joining voice chat:', error);
            
            // Clean up nếu có lỗi
            if (userVideo.current && userVideo.current.srcObject) {
                userVideo.current.srcObject.getTracks().forEach(track => track.stop());
                userVideo.current.srcObject = null;
            }

            // Hiển thị lỗi cụ thể
            let errorMessage = 'Không thể tham gia voice chat: ';
            
            if (error.name) {
                switch (error.name) {
                    case 'NotAllowedError':
                        errorMessage += 'Bạn đã từ chối quyền truy cập microphone. Vui lòng cho phép trong cài đặt trình duyệt.';
                        break;
                    case 'NotFoundError':
                        errorMessage += 'Không tìm thấy microphone. Vui lòng kiểm tra thiết bị.';
                        break;
                    case 'NotReadableError':
                        errorMessage += 'Microphone đang được sử dụng bởi ứng dụng khác.';
                        break;
                    default:
                        errorMessage += error.message || 'Lỗi không xác định';
                }
            } else {
                errorMessage += error.message || error.toString();
            }
            
            alert(errorMessage);
            setIsVoiceConnected(false);
        }

        // Thêm vào đây
        const unblockAudio = () => {
            // Tạo một AudioContext tạm thời để trigger user gesture
            const tempContext = new (window.AudioContext || window.webkit.AudioContext)();
            tempContext.resume().then(() => {
                console.log('Audio unblocked via user interaction');
                tempContext.close();
                
                // Attempt to play all audio elements
                document.querySelectorAll('audio').forEach(audio => {
                    if (audio.paused) {
                        audio.play().catch(() => {});
                    }
                });
            });
        };

        // Thêm vào joinVoiceChat ngay sau khi user click nút join
        document.addEventListener('click', unblockAudio, {once: true});
        document.addEventListener('touchstart', unblockAudio, {once: true});
    };

    const leaveVoiceChat = () => {
        console.log('Leaving voice chat');

        // Emit leave voice chat event TRƯỚC khi cleanup
        if (socket && socket.connected && roomId) {
            socket.emit('leave-voice-chat', {
                roomId,
                user: {
                    id: user.id,
                    socketId: socket.id
                }
            });
        }

        //Stop media stream 
        if (userVideo.current && userVideo.current.srcObject) {
            const tracks = userVideo.current.srcObject.getTracks();
            tracks.forEach(track => {
                track.stop();
                console.log(`Stopped track: ${track.kind}`);
            });
            userVideo.current.srcObject = null;
        }

        //Close audio context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }

        // Clear timeout
        if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = null;
        }

        //Clean up peers
        peersRef.current.forEach(({ peer }) => {
            if (peer && !peer.destroyed) {
                peer.destroy();
            }
        });
        peersRef.current = [];
        setPeers({});

        setIsVoiceConnected(false);
        setIsSpeaking(false);
        setVoiceActivity({});
        setAudioInputLevel(0);
        setIsMuted(false);
        setIsDeafened(false);

        console.log('Voice chat left successfully')
    };

    const toggleMute = () => {
    if (userVideo.current && userVideo.current.srcObject) {
        const audioTracks = userVideo.current.srcObject.getAudioTracks();
        console.log('Audio tracks before mute toggle:', audioTracks.map(t => t.enabled));
        
        if (audioTracks.length > 0) {
            const newMutedState = !isMuted;
            audioTracks.forEach(track => {
                track.enabled = !newMutedState;
                console.log(`Track ${track.label} ${newMutedState ? 'muted' : 'unmuted'}`);
            });
            setIsMuted(newMutedState);
            console.log('Audio muted state changed to:', newMutedState);

            // Emit mute state to server
            if (socket && roomId) {
                socket.emit('toggle-mute', {
                    roomId,
                    isMuted: newMutedState
                });
            }
        } else {
            console.warn('No audio tracks found to mute/unmute');
        }
    } else {
        console.warn('No media stream found');
    }
};

    const toggleDeafen = () => {
        const newDeafenedState = !isDeafened;
        setIsDeafened(newDeafenedState);

        //Auto mute when deafened
        if (!newDeafenedState && !isMuted) {
            toggleMute(); // Mute if not already muted
        }

        console.log('Audio deafened:', newDeafenedState);
    };


    // Fetch trending movies from API
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

            //Load chat history
            await loadChatHistory(1);

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
        
        // Leave voice chat if connected
        if (isVoiceConnected) {
            leaveVoiceChat();
        }
        
        setIsInRoom(false);
        setUsers([]);
        setMessages([]);
        setCurrentMovie(null);
        setRoomId('');
        setIsHost(false);
    };

    const sendMessage = () => {
        if (!newMessage.trim()) {
            console.log('Empty message');
            return;
        }

        if (!socket || !socket.connected) {
            console.log('Socket not connected');
            alert('Không có kết nối. Vui lòng thử lại');
            return;
        }

        if (!roomId) {
            console.log('No room ID');
            return;
        }

        if (!user?.id) {
            console.log('No user data');
            return;
        }

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
        console.log('Sending chat message:', message);
        // Emit message to server
        socket.emit('chat-message', {
            roomId,
            message
        });

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

    // Main Room UI với CSS modules
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

                {/* Voice Controls */}
                <div className={styles.voiceControls}>
                    {!isVoiceConnected ? (
                        <button onClick={joinVoiceChat} className={styles.voiceJoinBtn}>
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
                                onClick={leaveVoiceChat}
                                className={`${styles.voiceBtn} ${styles.disconnect}`}
                                title="Rời voice chat"
                            >
                                🚪
                            </button>

                            {/* Voice Activity Indicator */}
                            <div className={styles.voiceActivity}>
                                <div 
                                    className={`${styles.activityBar} ${isSpeaking ? styles.speaking : ''}`}
                                    style={{
                                        width: `${Math.min(audioInputLevel * 2, 100)}%`
                                    }}
                                />
                            </div>
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

            {/* Movie Search Modal */}
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
                {/* Movie Player */}
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
                            ></iframe>
                            <div className={styles.movieDetails}>
                                <h4>{currentMovie.title}</h4>
                            </div>
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
                    {/* Voice Chat Users */}
                    {isVoiceConnected && (
                        <div className={styles.voiceChatSection}>
                            <h4>🎤 Voice Chat ({users.filter(u => u.socketId === socket.id || peers[u.socketId]).length})</h4>
                            <div className={styles.voiceUsersList}>
                                {/* Current user */}
                                <div className={`${styles.voiceUserItem} ${isSpeaking ? styles.speaking : ''}`}>
                                    <img 
                                        src={user.avatar} 
                                        alt={user.username}
                                        className={styles.voiceAvatar}
                                        onError={(e) => {
                                            e.target.src = `https://via.placeholder.com/32/3b82f6/ffffff?text=${user.username?.[0] || '?'}`;
                                        }}
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
                                
                                {/* Other users in voice */}
                                {users.filter(u => u.socketId !== socket.id && peers[u.socketId]).map(roomUser => (
                                    <div 
                                        key={roomUser.socketId} 
                                        className={`${styles.voiceUserItem} ${voiceActivity[roomUser.socketId] ? styles.speaking : ''}`}
                                    >
                                        <img 
                                            src={roomUser.avatar} 
                                            alt={roomUser.username}
                                            className={styles.voiceAvatar}
                                            onError={(e) => {
                                                e.target.src = `https://via.placeholder.com/32/3b82f6/ffffff?text=${roomUser.username?.[0] || '?'}`;
                                            }}
                                        />
                                        <span className={styles.voiceUsername}>{roomUser.username}</span>
                                        <div className={styles.voiceIndicators}>
                                            {roomUser.isMuted && <span className={styles.mutedIcon}>🔇</span>}
                                            {voiceActivity[roomUser.socketId] && <span className={styles.speakingIcon}>📢</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Users List */}
                    <div className={styles.usersSection}>
                        <h4>👥 Thành viên ({users.length})</h4>
                        <div className={styles.usersList}>
                            {users.map((roomUser, index) => (
                                <div key={roomUser.socketId || index} className={styles.userItem}>
                                    <img 
                                        src={roomUser.avatar || '/default-avatar.png'} 
                                        alt={roomUser.username}
                                        className={styles.userAvatarSmall}
                                        onError={(e) => {
                                            e.target.src = 'https://via.placeholder.com/28/3b82f6/ffffff?text=' + (roomUser.username?.[0] || '?');
                                        }}
                                    />
                                    <span className={styles.username}>
                                        {roomUser.username}
                                        {roomUser.userId === user.id && ' (Bạn)'}
                                    </span>
                                    <div className={styles.userStatus}>
                                        {peers[roomUser.socketId] && <span className={styles.voiceStatus}>🎤</span>}
                                        {voiceActivity[roomUser.socketId] && <span className={styles.speakingStatus}>📢</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Chat Section */}
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

            {/* Hidden audio elements for voice chat */}
            <audio ref={userVideo} autoPlay muted playsInline />
            {Object.entries(peers).map(([peerId, peer]) => (
                <PeerAudio key={peerId} peer={peer} isDeafened={isDeafened} />
            ))}

            {/* Debugging helper - Thêm button debug vào UI */}
            <button onClick={debugAudioState} className={styles.debugBtn}>Debug Audio</button>
        </div>
    );
};

// Thêm debugging helper
const debugAudioState = () => {
    console.group('🎵 Audio Debug');
    
    // Check all audio elements
    const audioElements = document.querySelectorAll('audio');
    console.log(`Found ${audioElements.length} audio elements`);
    
    audioElements.forEach((audio, i) => {
        console.log(`Audio ${i}:`, {
            paused: audio.paused,
            muted: audio.muted, 
            volume: audio.volume,
            currentTime: audio.currentTime,
            hasStream: audio.srcObject !== null,
            tracks: audio.srcObject?.getTracks().length || 0
        });
    });
    
    // Check peers
    console.log('Active peers:', Object.keys(peers).length);
    console.log('PeersRef:', peersRef.current.length);
    
    console.groupEnd();
};

export default MovieRoom;