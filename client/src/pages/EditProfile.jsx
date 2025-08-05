import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import styles from '../styles/pages/EditProfile.module.css';
import { ModularDatePicker } from '../components/ui/ModularDatePicker';

const EditProfile = () => {
    const { user, setUser, refreshUser } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        position: '',
        address: '',
        dateOfBirth: null,
        website: '',
        facebook: '',
        instagram: '',
        telegram: ''
    });
    
    const [avatarPreview, setAvatarPreview] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [errors, setErrors] = useState({});

    // Load user data when component mounts
    useEffect(() => {
        if (user) {
            console.log('Loading user data to form:', user);
            setFormData({
                username: user.username || '',
                email: user.email || '',
                position: user.position || '',
                address: user.address || '',
                dateOfBirth: user.dateOfBirth || null,
                website: user.website || '',
                facebook: user.facebook || '',
                instagram: user.instagram || '',
                telegram: user.telegram || ''
            });
            setAvatarPreview(user.avatar || '');
        }
    }, [user]);

    // Fetch fresh profile data when component mounts
    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const response = await api.get('/api/profile');
                if (response.data.success) {
                    const profileUser = response.data.data.user;
                    console.log('Fresh profile data loaded:', profileUser);
                    
                    // Update form with fresh data
                    setFormData({
                        username: profileUser.username || '',
                        email: profileUser.email || '',
                        position: profileUser.position || '',
                        address: profileUser.address || '',
                        dateOfBirth: profileUser.dateOfBirth || null,
                        website: profileUser.website || '',
                        facebook: profileUser.facebook || '',
                        instagram: profileUser.instagram || '',
                        telegram: profileUser.telegram || ''
                    });
                    setAvatarPreview(profileUser.avatar || '');
                    
                    // Update user context with fresh data
                    setUser(profileUser);
                }
            } catch (error) {
                console.error('Error fetching fresh profile data:', error);
            }
        };

        fetchProfileData();
    }, [setUser]);

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

    // Format number for display (1000 -> 1K, 1000000 -> 1M)
    const formatNumber = (num) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num?.toString() || '0';
    };

    const renderAvatarPreview = () => {
        if (avatarPreview && avatarPreview !== 'https://example.com/default-avatar.png') {
            return (
                <img 
                    src={avatarPreview} 
                    className={styles.avatarPreview}
                    alt="Avatar Preview" 
                />
            );
        } else {
            const initial = getInitial(formData.username);
            const bgColor = getAvatarColor(formData.username || 'User');
            return (
                <div 
                    className={`${styles.avatarPreview} ${styles.avatarDefault}`}
                    style={{ backgroundColor: bgColor }}
                >
                    {initial}
                </div>
            );
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleDateChange = (date) => {
        setFormData(prev => ({
            ...prev,
            dateOfBirth: date
        }));
        // Clear error for date field
        if (errors.dateOfBirth) {
            setErrors(prev => ({
                ...prev,
                dateOfBirth: ''
            }));
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setAvatarPreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadAvatar = async () => {
        if (!selectedFile) return null;
        
        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('avatar', selectedFile);
            
            const response = await api.post('/api/profile/avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 30000 // 30 seconds timeout cho upload
            });
            
            console.log('Avatar upload response:', response.data);
            
            // Trả về avatar URL từ response
            return response.data.data?.avatar || response.data.avatar;
        } catch (error) {
            console.error('Avatar upload error:', error);
            throw new Error('Failed to upload avatar');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const removeAvatar = async () => {
        if (!user?.avatar) return;
        
        try {
            const response = await api.delete('/api/profile/avatar');
            console.log('Remove avatar response:', response.data);
            
            // Update local state
            setAvatarPreview('');
            setSelectedFile(null);
            
            // Update user in context with the response data
            const updatedUser = response.data.data?.user || response.data.user;
            if (updatedUser) {
                setUser(updatedUser);
            } else {
                // Fallback: update current user by removing avatar
                setUser(prev => ({ ...prev, avatar: null }));
            }
        } catch (error) {
            console.error('Remove avatar error:', error);
            setErrors({ 
                general: 'Failed to remove avatar'
            });
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        
        try {
            let avatarUrl = null;
            
            // Upload avatar if selected
            if (selectedFile) {
                avatarUrl = await uploadAvatar();
            }
            
            // Prepare profile data
            const profileData = {
                ...formData,
                ...(avatarUrl && { avatar: avatarUrl })
            };
            
            console.log('Sending profile data:', profileData);
            
            const response = await api.put('/api/profile', profileData);
            
            console.log('Profile update response:', response.data);
            
            // Refresh user data from server instead of using response
            const refreshedUser = await refreshUser();
            
            if (refreshedUser) {
                console.log('Refreshed user data:', refreshedUser);
                // Navigate back to profile
                navigate('/profile');
            } else {
                // Fallback: try to update user with response data
                const updatedUser = response.data.data?.user || response.data.user;
                if (updatedUser) {
                    console.log('Using response user data:', updatedUser);
                    setUser(updatedUser);
                    navigate('/profile');
                } else {
                    console.error('No user data in response:', response.data);
                    setErrors({ 
                        general: 'Profile updated but failed to refresh user data'
                    });
                }
            }
        } catch (error) {
            console.error('Profile update error:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ 
                    general: error.response?.data?.message || 'Failed to update profile'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate('/profile');
    };

    return (
        <div className={styles.editContainer}>
            <div className={styles.header}>
                <button className={styles.cancelButton} onClick={handleCancel}>
                    <i className="ri-arrow-left-line"></i>
                </button>
                <h1 className={styles.title}>Edit Profile</h1>
                <button 
                    type="submit" 
                    form="editForm"
                    className={styles.saveButton}
                    disabled={loading}
                >
                    {loading ? 'Saving...' : 'Save'}
                </button>
            </div>

            <form id="editForm" onSubmit={handleSubmit} className={styles.form}>
                {/* Error Display */}
                {errors.general && (
                    <div className={styles.errorMessage}>
                        {errors.general}
                    </div>
                )}

                {/* Avatar Section */}
                <div className={styles.avatarSection}>
                    <div className={styles.avatarWrapper} onClick={handleAvatarClick}>
                        {renderAvatarPreview()}
                        <div className={styles.avatarOverlay}>
                            <i className="ri-camera-line"></i>
                            <span>{uploadingAvatar ? 'Uploading...' : 'Change Photo'}</span>
                        </div>
                    </div>
                    {avatarPreview && (
                        <button 
                            type="button" 
                            className={styles.removeAvatarButton}
                            onClick={removeAvatar}
                        >
                            Remove Photo
                        </button>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className={styles.fileInput}
                    />
                </div>

                {/* User Info */}
                <div className={styles.userInfo}>
                    <h2 className={styles.displayName}>{formData.username || user?.username || 'Unknown User'}</h2>
                    {(formData.position || user?.position) && (
                        <p className={styles.userPosition}>{formData.position || user.position}</p>
                    )}
                    {(formData.address || user?.address) && (
                        <p className={styles.userLocation}>
                            <i className="ri-map-pin-line"></i> {formData.address || user.address}
                        </p>
                    )}
                </div>

                {/* User Stats */}
                <div className={styles.statsSection}>
                    <div className={styles.statItem}>
                        <span className={styles.statNumber}>{formatNumber(user?.postsCount)}</span>
                        <span className={styles.statLabel}>Posts</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statNumber}>{formatNumber(user?.followersCount)}</span>
                        <span className={styles.statLabel}>Followers</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statNumber}>{formatNumber(user?.followingCount)}</span>
                        <span className={styles.statLabel}>Following</span>
                    </div>
                </div>

                {/* Basic Info */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Basic Information</h3>
                    
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Username</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="Enter your username"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Position</label>
                        <input
                            type="text"
                            name="position"
                            value={formData.position}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="e.g. Fullstack Developer at HyStudio™"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Address</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="e.g. Hanoi City, Vietnam"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <ModularDatePicker
                            label="Date of Birth"
                            value={formData.dateOfBirth}
                            onChange={handleDateChange}
                            placeholder="Select your date of birth"
                        />
                        {errors.dateOfBirth && (
                            <span className={styles.errorText}>{errors.dateOfBirth}</span>
                        )}
                    </div>
                </div>

                {/* Website & Social Links */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Website & Social Links</h3>
                    
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Website</label>
                        <input
                            type="url"
                            name="website"
                            value={formData.website}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="https://your-website.com"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            <i className="ri-instagram-line"></i> Instagram
                        </label>
                        <input
                            type="url"
                            name="instagram"
                            value={formData.instagram}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="https://instagram.com/username"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            <i className="ri-facebook-fill"></i> Facebook
                        </label>
                        <input
                            type="url"
                            name="facebook"
                            value={formData.facebook}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="https://facebook.com/username"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            <i className="ri-telegram-2-line"></i> Telegram
                        </label>
                        <input
                            type="text"
                            name="telegram"
                            value={formData.telegram}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="@username or https://t.me/username"
                        />
                    </div>
                </div>
            </form>
        </div>
    );
};

export default EditProfile;
