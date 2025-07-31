import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import styles from '../styles/components/PostUpload.module.css';

const PostUpload = ({ isOpen, onClose, onUpload }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: select file, 2: edit post, 3: add details
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [altText, setAltText] = useState('');
  const [hideViewCount, setHideViewCount] = useState(false);
  const [hideLikeCount, setHideLikeCount] = useState(false);
  const [turnOffCommenting, setTurnOffCommenting] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-trigger file picker when component opens
  useEffect(() => {
    if (isOpen && step === 1) {
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, step]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(1);
        setSelectedFile(null);
        setPreview(null);
        setCaption('');
        setLocation('');
        setAltText('');
        setHideViewCount(false);
        setHideLikeCount(false);
        setTurnOffCommenting(false);
      }, 300);
    }
  }, [isOpen]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
        setStep(2);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedFile(null);
      setPreview(null);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleNext = () => {
    if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      handleShare();
    }
  };

  const handleShare = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('caption', caption);
      formData.append('location', location);
      formData.append('altText', altText);
      formData.append('hideViewCount', hideViewCount);
      formData.append('hideLikeCount', hideLikeCount);
      formData.append('turnOffCommenting', turnOffCommenting);

      const response = await api.post('/api/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds timeout for file upload
      });

      console.log('Post created successfully:', response.data);
      onUpload?.(response.data);
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to create post. Please try again.';
      
      if (error.response?.status === 413) {
        errorMessage = 'File is too large. Please choose a smaller file.';
      } else if (error.response?.status === 401) {
        errorMessage = 'You are not authorized. Please login again.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid file format or missing data.';
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDiscard = () => {
    if (step > 1) {
      const confirmDiscard = window.confirm('Discard post?');
      if (confirmDiscard) {
        onClose();
      }
    } else {
      onClose();
    }
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

  // Render avatar with default fallback
  const renderAvatar = (user, className) => {
    if (user?.avatar && user.avatar !== 'https://example.com/default-avatar.png') {
      return (
        <img 
          src={user.avatar} 
          className={className} 
          alt="Avatar" 
        />
      );
    } else {
      const initial = getInitial(user?.username);
      const bgColor = getAvatarColor(user?.username || 'User');
      return (
        <div 
          className={`${className} ${styles.avatarDefault}`}
          style={{ backgroundColor: bgColor }}
        >
          {initial}
        </div>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.uploadOverlay} onClick={(e) => e.target === e.currentTarget && handleDiscard()}>
      <div className={styles.uploadContainer}>
        {/* Header */}
        <div className={styles.header}>
          {step > 1 && (
            <button className={styles.backButton} onClick={handleBack}>
              <i className="ri-arrow-left-line"></i>
            </button>
          )}
          <h2 className={styles.title}>
            {step === 1 && 'Create new post'}
            {step === 2 && 'Edit'}
            {step === 3 && 'New post'}
          </h2>
          {step === 2 && (
            <button className={styles.nextButton} onClick={handleNext}>
              Next
            </button>
          )}
          {step === 3 && (
            <button 
              className={styles.shareButton} 
              onClick={handleShare}
              disabled={isUploading}
            >
              {isUploading ? 'Sharing...' : 'Share'}
            </button>
          )}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {step === 1 && (
            <div className={styles.uploadArea}>
              <div className={styles.uploadIcon}>
                <i className="ri-image-line"></i>
              </div>
              <h3 className={styles.uploadTitle}>Drag photos and videos here</h3>
              <button 
                className={styles.selectButton}
                onClick={() => fileInputRef.current?.click()}
              >
                Select from computer
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {step === 2 && preview && (
            <div className={styles.editArea}>
              <div className={styles.previewContainer}>
                {selectedFile?.type.startsWith('image/') ? (
                  <img src={preview} alt="Preview" className={styles.previewImage} />
                ) : (
                  <video src={preview} className={styles.previewVideo} controls />
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.detailsArea}>
              <div className={styles.previewSection}>
                {selectedFile?.type.startsWith('image/') ? (
                  <img src={preview} alt="Preview" className={styles.finalPreview} />
                ) : (
                  <video src={preview} className={styles.finalPreview} controls />
                )}
              </div>
              
              <div className={styles.detailsSection}>
                <div className={styles.userInfo}>
                  {renderAvatar(user, styles.userAvatar)}
                  <span className={styles.username}>{user?.username}</span>
                </div>

                <div className={styles.captionSection}>
                  <textarea
                    className={styles.captionInput}
                    placeholder="Write a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={2200}
                  />
                  <div className={styles.captionCount}>
                    {caption.length}/2,200
                  </div>
                </div>

                <div className={styles.locationSection}>
                  <input
                    type="text"
                    className={styles.locationInput}
                    placeholder="Add location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                  <i className="ri-map-pin-line"></i>
                </div>

                <div className={styles.accessibilitySection}>
                  <div className={styles.sectionTitle}>Accessibility</div>
                  <div className={styles.altTextSection}>
                    <span>Alt text</span>
                    <input
                      type="text"
                      className={styles.altTextInput}
                      placeholder="Write alt text..."
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.advancedSection}>
                  <div className={styles.sectionTitle}>Advanced settings</div>
                  
                  <div className={styles.settingItem}>
                    <span>Hide view count on this post</span>
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={hideViewCount}
                        onChange={(e) => setHideViewCount(e.target.checked)}
                      />
                      <span className={styles.toggleSlider}></span>
                    </label>
                  </div>

                  <div className={styles.settingItem}>
                    <span>Hide like count on this post</span>
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={hideLikeCount}
                        onChange={(e) => setHideLikeCount(e.target.checked)}
                      />
                      <span className={styles.toggleSlider}></span>
                    </label>
                  </div>

                  <div className={styles.settingItem}>
                    <span>Turn off commenting</span>
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={turnOffCommenting}
                        onChange={(e) => setTurnOffCommenting(e.target.checked)}
                      />
                      <span className={styles.toggleSlider}></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.discardButton} onClick={handleDiscard}>
            {step === 1 ? 'Cancel' : 'Discard'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostUpload;
