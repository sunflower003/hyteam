import { useState, useRef } from 'react';
import styles from '../styles/components/StoryUpload.module.css';

const StoryUpload = ({ isOpen, onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileType, setFileType] = useState(null); // 'image' hoặc 'video'
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Kiểm tra loại file (ảnh hoặc video)
    if (file.type.startsWith('image/')) {
      setFileType('image');
    } else if (file.type.startsWith('video/')) {
      setFileType('video');
    } else {
      alert('Chỉ hỗ trợ file ảnh hoặc video!');
      return;
    }

    setSelectedFile(file);
    
    // Tạo preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('media', selectedFile);
      formData.append('type', fileType);

      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const newStory = await response.json();
        onUpload(newStory);
        handleClose();
        alert('Story đã được đăng thành công!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading story:', error);
      alert('Có lỗi xảy ra khi đăng story. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileType(null);
    setIsUploading(false);
    
    // Cleanup preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    onClose();
  };

  const selectNewFile = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.uploadOverlay}>
      <div className={styles.uploadContainer}>
        {/* Header */}
        <div className={styles.header}>
          <i className="ri-close-line" onClick={handleClose}></i>
          <h3>Create Story</h3>
          <div></div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {!selectedFile ? (
            // File Selection Screen
            <div className={styles.selectFile}>
              <div className={styles.uploadArea} onClick={selectNewFile}>
                <i className="ri-image-add-line"></i>
                <h4>Chọn ảnh hoặc video</h4>
                <p>Từ thư viện của bạn</p>
              </div>
              
              <div className={styles.fileTypes}>
                <div className={styles.fileType}>
                  <i className="ri-image-line"></i>
                  <span>Ảnh</span>
                </div>
                <div className={styles.fileTypeDivider}></div>
                <div className={styles.fileType}>
                  <i className="ri-video-line"></i>
                  <span>Video</span>
                </div>
              </div>
            </div>
          ) : (
            // Preview Screen
            <div className={styles.preview}>
              <div className={styles.mediaPreview}>
                {fileType === 'image' ? (
                  <img src={previewUrl} alt="Preview" className={styles.previewMedia} />
                ) : (
                  <video 
                    src={previewUrl} 
                    className={styles.previewMedia}
                    controls
                    muted
                  />
                )}
              </div>
              
              {/* Story Tools */}
              <div className={styles.storyTools}>
                <div className={styles.toolsTop}>
                  <button className={styles.toolBtn}>
                    <i className="ri-text"></i>
                    <span>Aa</span>
                  </button>
                  <button className={styles.toolBtn}>
                    <i className="ri-sticker-line"></i>
                  </button>
                  <button className={styles.toolBtn}>
                    <i className="ri-brush-line"></i>
                  </button>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className={styles.actionButtons}>
                <button 
                  className={styles.changeBtn} 
                  onClick={selectNewFile}
                  disabled={isUploading}
                >
                  <i className="ri-image-line"></i>
                  Thay đổi
                </button>
                
                <button 
                  className={styles.shareBtn} 
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <i className="ri-loader-4-line ri-spin"></i>
                      Đang đăng...
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-fill"></i>
                      Chia sẻ lên Story
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default StoryUpload;
