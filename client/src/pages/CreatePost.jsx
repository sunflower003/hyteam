import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePost } from '../context/PostContext';
import { useAuth } from '../context/AuthContext';
import createPostStyles from '../styles/pages/CreatePost.module.css';

const CreatePost = () => {
    const navigate = useNavigate();
    const { createPost } = usePost();
    const { user } = useAuth();
    
    const [formData, setFormData] = useState({
        image: null,
        content: '',
        tags: '',
        location: ''
    });
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = import.meta.env.VITE_ALLOWED_IMAGE_TYPES?.split(',') || 
                ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            
            if (!allowedTypes.includes(file.type)) {
                setError('Please select a valid image file (JPEG, PNG, GIF, WebP)');
                return;
            }
            
            // Validate file size
            const maxSize = parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 52428800; // 50MB
            if (file.size > maxSize) {
                setError('File size must be less than 50MB');
                return;
            }

            setFormData({ ...formData, image: file });
            
            // Create preview
            const reader = new FileReader();
            reader.onload = () => setPreview(reader.result);
            reader.readAsDataURL(file);
            
            setError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.image) {
            setError('Please select an image');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await createPost(formData);
            navigate('/');
        } catch (error) {
            setError(error.message || 'Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    return (
        <div className={createPostStyles.createPost}>
            <div className={createPostStyles.container}>
                {/* Header */}
                <div className={createPostStyles.header}>
                    <button 
                        onClick={handleCancel}
                        className={createPostStyles.cancelBtn}
                    >
                        ← Cancel
                    </button>
                    <h1>Create New Post</h1>
                    <div></div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className={createPostStyles.error}>
                        ❌ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={createPostStyles.form}>
                    {/* Image Upload */}
                    <div className={createPostStyles.uploadSection}>
                        {!preview ? (
                            <div className={createPostStyles.uploadArea}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className={createPostStyles.fileInput}
                                    id="imageUpload"
                                />
                                <label htmlFor="imageUpload" className={createPostStyles.uploadLabel}>
                                    <div className={createPostStyles.uploadIcon}>📸</div>
                                    <p>Drag photos here</p>
                                    <button type="button" className={createPostStyles.selectBtn}>
                                        Select from computer
                                    </button>
                                </label>
                            </div>
                        ) : (
                            <div className={createPostStyles.previewSection}>
                                <div className={createPostStyles.preview}>
                                    <img 
                                        src={preview} 
                                        alt="Preview" 
                                        className={createPostStyles.previewImage}
                                    />
                                </div>
                                
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, image: null });
                                        setPreview(null);
                                    }}
                                    className={createPostStyles.changeBtn}
                                >
                                    Change Photo
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Post Details */}
                    {preview && (
                        <div className={createPostStyles.detailsSection}>
                            {/* User Info */}
                            <div className={createPostStyles.userInfo}>
                                <img 
                                    src={user?.avatar} 
                                    alt={user?.username}
                                    className={createPostStyles.userAvatar}
                                />
                                <span className={createPostStyles.username}>
                                    {user?.username}
                                </span>
                            </div>

                            {/* Caption */}
                            <div className={createPostStyles.field}>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Write a caption..."
                                    className={createPostStyles.textarea}
                                    maxLength={2200}
                                />
                                <span className={createPostStyles.charCount}>
                                    {formData.content.length}/2200
                                </span>
                            </div>

                            {/* Location */}
                            <div className={createPostStyles.field}>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Add location"
                                    className={createPostStyles.input}
                                />
                            </div>

                            {/* Tags */}
                            <div className={createPostStyles.field}>
                                <input
                                    type="text"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    placeholder="Add tags (comma separated)"
                                    className={createPostStyles.input}
                                />
                                <small className={createPostStyles.hint}>
                                    Separate tags with commas (e.g., nature, sunset, photography)
                                </small>
                            </div>

                            {/* Submit Button */}
                            <button 
                                type="submit" 
                                disabled={loading || !formData.image}
                                className={createPostStyles.submitBtn}
                            >
                                {loading ? (
                                    <>
                                        <span className={createPostStyles.spinner}></span>
                                        Sharing...
                                    </>
                                ) : (
                                    'Share Post'
                                )}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default CreatePost;
