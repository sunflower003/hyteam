import { useState, useRef, useEffect } from 'react';
import styles from '../styles/components/StoryUpload.module.css';

const StoryUpload = ({ isOpen, onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileType, setFileType] = useState(null);
  const [caption, setCaption] = useState('');
  
  // Edit tools states
  const [editMode, setEditMode] = useState(null); // 'text', 'filter', 'sticker', 'draw'
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);
  const [currentFilter, setCurrentFilter] = useState('none');
  const [textElements, setTextElements] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPath, setDrawPath] = useState([]);
  
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const previewRef = useRef(null);

  // Available filters
  const filters = [
    { name: 'None', value: 'none', filter: '' },
    { name: 'Grayscale', value: 'grayscale', filter: 'grayscale(100%)' },
    { name: 'Sepia', value: 'sepia', filter: 'sepia(100%)' },
    { name: 'Bright', value: 'bright', filter: 'brightness(1.3)' },
    { name: 'Contrast', value: 'contrast', filter: 'contrast(1.5)' },
    { name: 'Saturate', value: 'saturate', filter: 'saturate(2)' },
    { name: 'Hue', value: 'hue', filter: 'hue-rotate(90deg)' },
    { name: 'Blur', value: 'blur', filter: 'blur(2px)' },
    { name: 'Invert', value: 'invert', filter: 'invert(100%)' }
  ];

  // Text colors
  const textColors = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', 
    '#ffff00', '#ff00ff', '#00ffff', '#ff6b6b', '#4ecdc4'
  ];

  // Stickers (emoji)
  const stickers = [
    '😀', '😍', '🥳', '😎', '🤔', '😴', '🤯', '🥰',
    '❤️', '💖', '💯', '🔥', '⭐', '🎉', '🎈', '🎊',
    '👍', '👎', '🤘', '✌️', '🤞', '👌', '💪', '🙏'
  ];

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 File selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Check file type
    if (file.type.startsWith('image/')) {
      setFileType('image');
    } else if (file.type.startsWith('video/')) {
      setFileType('video');
    } else {
      alert('Chỉ hỗ trợ file ảnh hoặc video!');
      return;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert(`File quá lớn. Tối đa ${maxSize / 1024 / 1024}MB`);
      return;
    }

    // Validate file type more strictly
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/mpeg'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Định dạng file không được hỗ trợ. Vui lòng chọn JPG, PNG, GIF, WebP, BMP, MP4, WebM, MOV, AVI hoặc MPEG');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Reset all editing states
    resetEditingStates();
    
    console.log('✅ File loaded successfully');
  };

  const resetEditingStates = () => {
    setEditMode(null);
    setTextElements([]);
    setCurrentFilter('none');
    setDrawPath([]);
    setTextInput('');
    setUploadProgress(0);
    
    // Reset filter on preview
    if (previewRef.current) {
      previewRef.current.style.filter = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Vui lòng chọn ảnh trước khi đăng');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      console.log('🚀 Starting upload process...');
      console.log('📁 Selected file:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      });

      const formData = new FormData();
      formData.append('media', selectedFile);
      formData.append('content', caption.trim());
      
      // Add text elements metadata if any exist
      if (textElements.length > 0) {
        formData.append('textElements', JSON.stringify(textElements));
      }
      
      // Add filter information
      if (currentFilter !== 'none') {
        formData.append('filter', currentFilter);
      }
      
      // Log formData content for debugging
      for (let [key, value] of formData.entries()) {
        console.log(`📝 FormData ${key}:`, value instanceof File ? `File: ${value.name}` : value);
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại');
      }

      console.log('🔑 Token found, making request...');

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        // Upload progress handler
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
            console.log(`📊 Upload progress: ${progress}%`);
          }
        });

        // Success handler
        xhr.addEventListener('load', () => {
          try {
            console.log('📡 Response status:', xhr.status);
            console.log('📡 Response text:', xhr.responseText);

            if (xhr.status === 200 || xhr.status === 201) {
              const data = JSON.parse(xhr.responseText);
              console.log('📦 Response data:', data);

              if (data.success) {
                console.log('✅ Story uploaded successfully:', data);
                
                // Format story data for frontend compatibility
                const formattedStory = data.story || {
                  id: data._id,
                  author: data.userId?.username || data.author || 'You',
                  avatar: data.userId?.avatar || data.avatar || '/img/default-avatar.jpg',
                  image: data.mediaUrl || data.image,
                  time: 'now',
                  status: 'new',
                  mediaType: data.mediaType || fileType,
                  content: data.content || caption,
                  userId: data.userId?._id || data.userId
                };

                console.log('📤 Formatted story for frontend:', formattedStory);
                onUpload(formattedStory);
                handleClose();
                
                // Success notification with better UX
                const notification = document.createElement('div');
                notification.style.cssText = `
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  background: #4CAF50;
                  color: white;
                  padding: 16px 24px;
                  border-radius: 8px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  z-index: 10000;
                  font-weight: 500;
                `;
                notification.textContent = '✅ Story đã được đăng thành công!';
                document.body.appendChild(notification);
                
                setTimeout(() => {
                  document.body.removeChild(notification);
                }, 3000);
                
                resolve(data);
              } else {
                throw new Error(data.message || 'Upload failed');
              }
            } else {
              let errorData;
              try {
                errorData = JSON.parse(xhr.responseText);
              } catch {
                errorData = { message: xhr.statusText };
              }
              throw new Error(`HTTP ${xhr.status}: ${errorData.message || xhr.statusText}`);
            }
          } catch (parseError) {
            console.error('❌ Parse error:', parseError);
            reject(new Error('Invalid server response'));
          }
        });

        // Error handler
        xhr.addEventListener('error', () => {
          console.error('❌ Network error during upload');
          reject(new Error('Network error during upload. Please check your connection.'));
        });

        // Timeout handler
        xhr.addEventListener('timeout', () => {
          console.error('❌ Upload timeout');
          reject(new Error('Upload timeout. Please try again with a smaller file.'));
        });

        // Configure and send request
        xhr.open('POST', '/api/stories');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 60000; // 60 seconds timeout
        xhr.send(formData);
      });

    } catch (error) {
      console.error('❌ Upload error details:', error);
      
      // Detailed error handling with user-friendly messages
      let errorMessage = 'Có lỗi xảy ra khi đăng story';
      
      if (error.message.includes('token')) {
        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại';
      } else if (error.message.includes('413') || error.message.includes('too large')) {
        errorMessage = 'File quá lớn. Vui lòng chọn file nhỏ hơn 10MB';
      } else if (error.message.includes('400')) {
        errorMessage = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra file và thử lại';
      } else if (error.message.includes('401')) {
        errorMessage = 'Không có quyền truy cập. Vui lòng đăng nhập lại';
      } else if (error.message.includes('500')) {
        errorMessage = 'Lỗi server. Vui lòng thử lại sau vài phút';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Upload quá lâu. Vui lòng thử lại với file nhỏ hơn';
      }
      
      // Better error notification
      const errorNotification = document.createElement('div');
      errorNotification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        font-weight: 500;
      `;
      errorNotification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">❌ Lỗi Upload</div>
        <div style="font-size: 14px;">${errorMessage}</div>
      `;
      document.body.appendChild(errorNotification);
      
      setTimeout(() => {
        if (document.body.contains(errorNotification)) {
          document.body.removeChild(errorNotification);
        }
      }, 5000);
      
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileType(null);
    setIsUploading(false);
    resetEditingStates();
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    onClose();
  };

  const selectNewFile = () => {
    fileInputRef.current?.click();
  };

  // ==================== TEXT EDITING ====================
  const startTextEdit = () => {
    setEditMode('text');
    setTextInput('');
  };

  const addTextElement = () => {
    if (textInput.trim()) {
      const newTextElement = {
        id: Date.now(),
        text: textInput.trim(),
        color: textColor,
        size: textSize,
        x: 50, // Center position in %
        y: 50,
        isDragging: false
      };
      
      setTextElements(prev => [...prev, newTextElement]);
      setTextInput('');
      setEditMode(null);
    }
  };

  const removeTextElement = (id) => {
    setTextElements(prev => prev.filter(el => el.id !== id));
  };

  const updateTextElement = (id, updates) => {
    setTextElements(prev => prev.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  // Handle text drag with improved touch support
  const handleTextMouseDown = (id, e) => {
    e.preventDefault();
    if (!previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const isTouch = e.type === 'touchstart';
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;

    const handleMove = (e) => {
      const moveClientX = isTouch ? e.touches[0].clientX : e.clientX;
      const moveClientY = isTouch ? e.touches[0].clientY : e.clientY;
      
      const newX = ((moveClientX - rect.left) / rect.width) * 100;
      const newY = ((moveClientY - rect.top) / rect.height) * 100;
      
      updateTextElement(id, {
        x: Math.max(5, Math.min(85, newX)), // Keep within bounds
        y: Math.max(5, Math.min(85, newY))
      });
    };

    const handleEnd = () => {
      if (isTouch) {
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      } else {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
      }
    };

    if (isTouch) {
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
    } else {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
    }
  };

  // Touch support for text elements
  const handleTextTouchStart = (id, e) => {
    handleTextMouseDown(id, e);
  };

  // ==================== FILTER EDITING ====================
  const applyFilter = (filterValue) => {
    setCurrentFilter(filterValue);
    if (previewRef.current) {
      const filterStyle = filters.find(f => f.value === filterValue)?.filter || '';
      previewRef.current.style.filter = filterStyle;
      console.log('🎨 Filter applied:', filterValue);
    }
  };

  // ==================== STICKER EDITING ====================
  const addSticker = (sticker) => {
    const newStickerElement = {
      id: Date.now(),
      text: sticker,
      color: '#000000',
      size: 32,
      x: Math.random() * 60 + 20, // Random position with padding
      y: Math.random() * 60 + 20,
      isDragging: false
    };
    
    setTextElements(prev => [...prev, newStickerElement]);
    setEditMode(null);
  };

  // ==================== DRAWING TOOLS ====================
  const startDrawing = () => {
    setEditMode('draw');
    setIsDrawing(false);
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        e.preventDefault();
        if (editMode) {
          setEditMode(null);
        } else {
          handleClose();
        }
      }
      
      if (e.key === 'Enter' && editMode === 'text' && !e.shiftKey) {
        e.preventDefault();
        addTextElement();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editMode, textInput]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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
            // Preview & Edit Screen
            <div className={styles.preview}>
              {/* Media Preview */}
              <div className={styles.mediaPreview} ref={previewRef}>
                {fileType === 'image' ? (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className={styles.previewMedia}
                    onError={(e) => {
                      console.error('❌ Image load error:', e);
                      alert('Lỗi tải ảnh. Vui lòng chọn file khác');
                    }}
                  />
                ) : (
                  <video 
                    src={previewUrl} 
                    className={styles.previewMedia}
                    controls
                    muted
                    onError={(e) => {
                      console.error('❌ Video load error:', e);
                      alert('Lỗi tải video. Vui lòng chọn file khác');
                    }}
                  />
                )}

                {/* Text & Sticker Overlays */}
                {textElements.map(element => (
                  <div
                    key={element.id}
                    className={styles.textOverlay}
                    style={{
                      left: `${element.x}%`,
                      top: `${element.y}%`,
                      color: element.color,
                      fontSize: `${element.size}px`,
                      cursor: 'move',
                      userSelect: 'none',
                      zIndex: 10,
                      touchAction: 'none'
                    }}
                    onMouseDown={(e) => handleTextMouseDown(element.id, e)}
                    onTouchStart={(e) => handleTextTouchStart(element.id, e)}
                    onDoubleClick={() => removeTextElement(element.id)}
                    title="Drag to move, double click to remove"
                  >
                    {element.text}
                  </div>
                ))}

                {/* Edit Tools */}
                <div className={styles.storyTools}>
                  <div className={styles.toolsTop}>
                    <button 
                      className={`${styles.toolBtn} ${editMode === 'text' ? styles.active : ''}`}
                      onClick={startTextEdit}
                      title="Add Text"
                      disabled={isUploading}
                    >
                      <i className="ri-text"></i>
                    </button>
                    
                    <button 
                      className={`${styles.toolBtn} ${editMode === 'sticker' ? styles.active : ''}`}
                      onClick={() => setEditMode(editMode === 'sticker' ? null : 'sticker')}
                      title="Add Sticker"
                      disabled={isUploading}
                    >
                      <i className="ri-sticker-line"></i>
                    </button>
                    
                    <button 
                      className={`${styles.toolBtn} ${editMode === 'draw' ? styles.active : ''}`}
                      onClick={startDrawing}
                      title="Draw"
                      disabled={isUploading}
                    >
                      <i className="ri-brush-line"></i>
                    </button>

                    <button 
                      className={`${styles.toolBtn} ${editMode === 'filter' ? styles.active : ''}`}
                      onClick={() => setEditMode(editMode === 'filter' ? null : 'filter')}
                      title="Filters"
                      disabled={isUploading}
                    >
                      <i className="ri-contrast-line"></i>
                    </button>
                  </div>
                </div>

                {/* Text Input Modal */}
                {editMode === 'text' && (
                  <div className={styles.editModal}>
                    <div className={styles.editModalContent}>
                      <h4>Add Text</h4>
                      <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Enter your text..."
                        className={styles.textInput}
                        style={{ color: textColor }}
                        maxLength={100}
                        autoFocus
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            addTextElement();
                          }
                        }}
                      />
                      
                      {/* Color Picker */}
                      <div className={styles.colorPicker}>
                        <label>Color:</label>
                        <div className={styles.colorOptions}>
                          {textColors.map(color => (
                            <button
                              key={color}
                              className={`${styles.colorBtn} ${textColor === color ? styles.selected : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setTextColor(color)}
                              title={`Color: ${color}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Size Picker */}
                      <div className={styles.sizePicker}>
                        <label>Size:</label>
                        <input
                          type="range"
                          min="16"
                          max="48"
                          value={textSize}
                          onChange={(e) => setTextSize(Number(e.target.value))}
                          className={styles.sizeSlider}
                        />
                        <span>{textSize}px</span>
                      </div>
                      
                      <div className={styles.modalActions}>
                        <button 
                          onClick={() => setEditMode(null)} 
                          className={styles.cancelBtn}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={addTextElement} 
                          className={styles.confirmBtn}
                          disabled={!textInput.trim()}
                        >
                          Add Text
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sticker Panel */}
                {editMode === 'sticker' && (
                  <div className={styles.stickerPanel}>
                    <h4>Choose Sticker</h4>
                    <div className={styles.stickerGrid}>
                      {stickers.map((sticker, index) => (
                        <button
                          key={index}
                          className={styles.stickerBtn}
                          onClick={() => addSticker(sticker)}
                          title={`Add ${sticker} sticker`}
                        >
                          {sticker}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filter Panel */}
                {editMode === 'filter' && (
                  <div className={styles.filterPanel}>
                    <h4>Choose Filter</h4>
                    <div className={styles.filterGrid}>
                      {filters.map(filter => (
                        <div
                          key={filter.value}
                          className={`${styles.filterOption} ${currentFilter === filter.value ? styles.selected : ''}`}
                          onClick={() => applyFilter(filter.value)}
                          title={`Apply ${filter.name} filter`}
                        >
                          <div 
                            className={styles.filterPreview}
                            style={{ 
                              backgroundImage: `url(${previewUrl})`,
                              filter: filter.filter 
                            }}
                          ></div>
                          <span>{filter.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Draw Panel */}
                {editMode === 'draw' && (
                  <div className={styles.drawPanel}>
                    <div className={styles.drawTools}>
                      <button className={styles.drawBtn}>
                        <i className="ri-pencil-line"></i>
                        Pencil
                      </button>
                      <button className={styles.drawBtn}>
                        <i className="ri-eraser-line"></i>
                        Eraser
                      </button>
                      <div className={styles.drawColors}>
                        {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ffffff'].map(color => (
                          <div
                            key={color}
                            className={styles.drawColorBtn}
                            style={{ backgroundColor: color }}
                            title={`Drawing color: ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className={styles.drawHint}>Drawing feature coming soon!</p>
                  </div>
                )}
              </div>

              {/* Caption Area */}
              <div className={styles.captionArea}>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                  className={styles.captionInput}
                  maxLength={500}
                  rows="3"
                  disabled={isUploading}
                />
                <span className={styles.charCount}>{caption.length}/500</span>
              </div>
              
              {/* Action Buttons */}
              <div className={styles.actionButtons}>
                <button 
                  className={styles.changeBtn} 
                  onClick={selectNewFile}
                  disabled={isUploading}
                >
                  <i className="ri-image-line"></i>
                  Change
                </button>
                
                <button 
                  className={styles.shareBtn} 
                  onClick={handleUpload}
                  disabled={isUploading || !selectedFile}
                >
                  {isUploading ? (
                    <>
                      <div className={styles.progressContainer}>
                        <div 
                          className={styles.progressBar}
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <i className="ri-loader-4-line ri-spin"></i>
                      Uploading... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-fill"></i>
                      Share to Story
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
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,video/mp4,video/webm,video/quicktime,video/avi,video/mpeg"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default StoryUpload;
