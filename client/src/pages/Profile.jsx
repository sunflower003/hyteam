import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import styles from '../styles/pages/Profile.module.css';

const Profile = () => {
    const navigate = useNavigate();
    const { userId } = useParams(); // Get userId from URL params
    const { user: currentUser } = useAuth(); // Current logged in user
    const [profileUser, setProfileUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Check if viewing own profile
    const isOwnProfile = !userId || userId === currentUser?.id || userId === currentUser?._id;

    useEffect(() => {
        fetchProfileData();
    }, [userId, currentUser]);

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            setError('');

            if (isOwnProfile) {
                // Always fetch fresh data for own profile
                console.log('Fetching own profile data...');
                const response = await api.get('/api/profile');
                console.log('Own profile fetch response:', response.data);
                if (response.data.success) {
                    setProfileUser(response.data.data.user);
                } else {
                    setError('Failed to load profile');
                }
            } else {
                // Fetch other user's profile data
                console.log('Fetching profile for userId:', userId);
                const response = await api.get(`/api/profile/user/${userId}`);
                console.log('Profile fetch response:', response.data);
                if (response.data.success) {
                    setProfileUser(response.data.data.user);
                } else {
                    setError('User not found');
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            setError(error.response?.data?.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = () => {
        navigate('/edit-profile');
    };

    // Generate random color for avatar background
    const getAvatarColor = (name) => {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
            '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
            '#A55EEA', '#26DE81', '#FD79A8', '#FDCB6E', '#6C5CE7'
        ];
        const index = name ? name.charCodeAt(0) % colors.length : 0;
        return colors[index];
    };

    // Get first letter of username
    const getInitial = (name) => {
        return name ? name.charAt(0).toUpperCase() : 'U';
    };

    // Format number for display
    const formatNumber = (num) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num?.toString() || '0';
    };

    const renderAvatar = () => {
        if (profileUser?.avatar && profileUser.avatar !== 'https://example.com/default-avatar.png') {
            return (
                <img 
                    src={profileUser.avatar} 
                    alt="avatar" 
                    className={styles.avatar} 
                />
            );
        } else {
            const initial = getInitial(profileUser?.username);
            const bgColor = getAvatarColor(profileUser?.username || 'User');
            return (
                <div 
                    className={`${styles.avatar} ${styles.avatarDefault}`}
                    style={{ backgroundColor: bgColor }}
                >
                    {initial}
                </div>
            );
        }
    };

    if (loading) {
        return (
            <div className={styles.profileContainer}>
                <div className={styles.loading}>Loading profile...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.profileContainer}>
                <div className={styles.error}>
                    <p>{error}</p>
                    <button onClick={() => navigate('/')} className={styles.backButton}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className={styles.profileContainer}>
                <div className={styles.error}>
                    <p>User not found</p>
                    <button onClick={() => navigate('/')} className={styles.backButton}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.profileContainer}>
            <img 
                src="https://images.unsplash.com/photo-1656248396925-ec086a35c568?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                alt="thumbnail" 
                className={styles.thumbnail}
            />
            <div className={styles.authorInfor}>
                {renderAvatar()}
                <div className={styles.buttons}>
                    <div className={styles.socialLink}>
                        {profileUser.instagram && (
                            <a href={profileUser.instagram} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                <i className="ri-instagram-line"></i>
                            </a>
                        )}
                        {profileUser.facebook && (
                            <a href={profileUser.facebook} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                <i className="ri-facebook-fill"></i>
                            </a>
                        )}
                        {profileUser.telegram && (
                            <a 
                                href={profileUser.telegram.startsWith('@') ? `https://t.me/${profileUser.telegram.slice(1)}` : profileUser.telegram} 
                                target="_blank" rel="noopener noreferrer" className={styles.link}
                            >
                                <i className="ri-telegram-2-line"></i>
                            </a>
                        )}
                        {profileUser.website && (
                            <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                <i className="ri-global-line"></i>
                            </a>
                        )}
                    </div>
                    {isOwnProfile && (
                        <button className={styles.editButton} onClick={handleEditClick}>
                            Edit Profile
                        </button>
                    )}
                    {!isOwnProfile && (
                        <button className={styles.followButton}>
                            Follow
                        </button>
                    )}
                </div>
            </div>
            <div className={styles.authorJob}>
                <p className={styles.username}>{profileUser.username}</p>
                {profileUser.position && (
                    <p className={styles.position}>{profileUser.position}</p>
                )}
                {profileUser.address && (
                    <p className={styles.location}>
                        <i className="ri-map-pin-line"></i> {profileUser.address}
                    </p>
                )}
                <div className={styles.followInfo}>
                    <div className={styles.col}>
                        <p className={styles.label}>Posts</p>
                        <p className={styles.number}>{formatNumber(profileUser.postsCount)}</p>
                    </div>
                    <div className={styles.col}>
                        <p className={styles.label}>Followers</p>
                        <p className={styles.number}>{formatNumber(profileUser.followersCount)}</p>
                    </div>
                    <div className={styles.col}>
                        <p className={styles.label}>Following</p>
                        <p className={styles.number}>{formatNumber(profileUser.followingCount)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;