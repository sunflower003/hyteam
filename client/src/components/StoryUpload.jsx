import { useState, useRef, useEffect } from 'react';
import styles from '../styles/components/StoryUpload.module.css';
import api from '../utils/api';

const StoryUpload = ({ isOpen, onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileType, setFileType] = useState(null);
  const [currentStep, setCurrentStep] = useState('select'); // 'select', 'edit'
  
  // Story editing states
  const [content, setContent] = useState('');
  const [duration, setDuration] = useState(15);
  const [filters, setFilters] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
    hueRotate: 0,
    opacity: 100,
    vintage: false,
    blackAndWhite: false,
    sepia: false,
    invert: false,
    // Instagram-style presets
    normal: true,
    clarendon: false,
    gingham: false,
    moon: false,
    lark: false,
    reyes: false,
    juno: false,
    slumber: false,
    crema: false,
    ludwig: false,
    aden: false,
    perpetua: false
  });
  const [textOverlays, setTextOverlays] = useState([]);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [newText, setNewText] = useState('');

  const fileInputRef = useRef(null);

  // Auto trigger file selection when component opens and lock body scroll
  useEffect(() => {
    if (isOpen) {
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      
      // iOS Safari needs user gesture to trigger file input
      // Don't auto-trigger on iOS, let user click manually
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (currentStep === 'select' && !isIOS) {
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 200);
      }
    } else {
      // Unlock body scroll
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentStep]);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      onClose();
      return;
    }

    // Kiểm tra loại file
    if (file.type.startsWith('image/')) {
      setFileType('image');
    } else if (file.type.startsWith('video/')) {
      setFileType('video');
    } else {
      alert('Only image and video files are supported!');
      onClose();
      return;
    }

    setSelectedFile(file);
    
    // Tạo preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setCurrentStep('edit');
    
    // Reset input value để có thể chọn cùng file nhiều lần
    event.target.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('media', selectedFile);
      formData.append('content', content);
      formData.append('duration', duration.toString());
      formData.append('filters', JSON.stringify(filters));
      formData.append('textOverlays', JSON.stringify(textOverlays));

      const response = await api.post('/api/stories', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000 // Increase timeout for iOS
      });

      if (response.data.success) {
        onUpload(response.data.data.story);
        handleClose();
      }
    } catch (error) {
      console.error('Error uploading story:', error);
      
      // Better error handling for iOS
      let errorMessage = 'Upload failed. Please try again.';
      if (error.response?.status === 413) {
        errorMessage = 'File is too large. Please choose a smaller file.';
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid file format. Please choose a different file.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileType(null);
    setCurrentStep('select');
    setContent('');
    setDuration(15);
    setFilters({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      blur: 0,
      vintage: false,
      blackAndWhite: false
    });
    setTextOverlays([]);
    setShowTextEditor(false);
    setNewText('');
    setIsUploading(false);
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    onClose();
  };

  const selectNewFile = () => {
    setCurrentStep('select');
    fileInputRef.current?.click();
  };

  // Filter functions
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      blur: 0,
      hueRotate: 0,
      opacity: 100,
      vintage: false,
      blackAndWhite: false,
      sepia: false,
      invert: false,
      normal: true,
      clarendon: false,
      gingham: false,
      moon: false,
      lark: false,
      reyes: false,
      juno: false,
      slumber: false,
      crema: false,
      ludwig: false,
      aden: false,
      perpetua: false
    });
  };

  // Instagram-style filter presets
  const applyInstagramFilter = (filterName) => {
    // Reset all presets first
    const resetPresets = Object.keys(filters).reduce((acc, key) => {
      if (key.includes('normal') || key.includes('clarendon') || key.includes('gingham') || 
          key.includes('moon') || key.includes('lark') || key.includes('reyes') ||
          key.includes('juno') || key.includes('slumber') || key.includes('crema') ||
          key.includes('ludwig') || key.includes('aden') || key.includes('perpetua')) {
        acc[key] = key === filterName;
      }
      return acc;
    }, {});

    switch(filterName) {
      case 'normal':
        setFilters(prev => ({
          ...prev,
          ...resetPresets,
          brightness: 0,
          contrast: 0,
          saturation: 0,
          hueRotate: 0,
          opacity: 100,
          sepia: false,
          invert: false,
          blackAndWhite: false,
          vintage: false
        }));
        break;
      case 'clarendon':
        setFilters(prev => ({
          ...prev,
          ...resetPresets,
          brightness: 10,
          contrast: 20,
          saturation: 15,
          hueRotate: 0,
          opacity: 100
        }));
        break;
      case 'gingham':
        setFilters(prev => ({
          ...prev,
          ...resetPresets,
          brightness: 5,
          contrast: -10,
          saturation: -5,
          hueRotate: 0,
          opacity: 100
        }));
        break;
      case 'moon':
        setFilters(prev => ({
          ...prev,
          ...resetPresets,
          brightness: -5,
          contrast: 10,
          saturation: -15,
          hueRotate: 0,
          opacity: 100,
          blackAndWhite: true
        }));
        break;
      case 'lark':
        setFilters(prev => ({
          ...prev,
          ...resetPresets,
          brightness: 15,
          contrast: -5,
          saturation: 10,
          hueRotate: 15,
          opacity: 100
        }));
        break;
      case 'reyes':
        setFilters(prev => ({
          ...prev,
          ...resetPresets,
          brightness: 5,
          contrast: -10,
          saturation: -5,
          hueRotate: 0,
          opacity: 90,
          vintage: true
        }));
        break;
      case 'juno':
        setFilters(prev => ({
          ...prev,
          ...resetPresets,
          brightness: 10,
          contrast: 15,
          saturation: 20,
          hueRotate: 0,
          opacity: 100
        }));
        break;
      case 'slumber':
        setFilters(prev => ({
          ...prev,
          ...resetPresets,
          brightness: -5,
          contrast: -10,
          saturation: -15,
          hueRotate: 0,
          opacity: 95
        }));
        break;
      case 'crema':
        setFilters(prev => ({
          ...prev,
          ...resetPresets,
          brightness: 0,
          contrast: 5,
          saturation: -10,
          hueRotate: 0,
          opacity: 100,
          sepia: true
        }));
        break;
      case 'ludwig':
        setFilters(prev => ({
          ...prev,
          ...resetPresets,
          brightness: 5,
          contrast: 10,
          saturation: 15,
          hueRotate: 0,
          opacity: 100
        }));
        break;
      case 'aden':
        setFilters(prev => ({
          ...prev,
          ...resetPresets,
          brightness: 10,
          contrast: -5,
          saturation: 20,
          hueRotate: 15,
          opacity: 100
        }));
        break;
      case 'perpetua':
        setFilters(prev => ({
          ...prev,
          ...resetPresets,
          brightness: -5,
          contrast: 15,
          saturation: 10,
          hueRotate: 0,
          opacity: 100
        }));
        break;
      default:
        break;
    }
  };

  // Text overlay functions
  const addTextOverlay = () => {
    if (newText.trim()) {
      const newTextOverlay = {
        text: newText.trim(),
        x: 50,
        y: 50,
        fontSize: 32,
        color: '#FFFFFF',
        fontFamily: 'Arial'
      };
      setTextOverlays(prev => [...prev, newTextOverlay]);
      setNewText('');
      setShowTextEditor(false);
    }
  };

  const removeTextOverlay = (index) => {
    setTextOverlays(prev => prev.filter((_, i) => i !== index));
  };

  // Handle click/touch events properly on iOS
  const handleButtonClick = (e, callback) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };

  // Generate preview style with filters
  const getPreviewStyle = () => {
    let filterString = '';
    
    if (filters.brightness !== 0) filterString += `brightness(${100 + filters.brightness}%) `;
    if (filters.contrast !== 0) filterString += `contrast(${100 + filters.contrast}%) `;
    if (filters.saturation !== 0) filterString += `saturate(${100 + filters.saturation}%) `;
    if (filters.blur > 0) filterString += `blur(${filters.blur}px) `;
    if (filters.blackAndWhite) filterString += 'grayscale(100%) ';
    if (filters.vintage) filterString += 'sepia(50%) ';
    if (filters.hueRotate !== 0) filterString += `hue-rotate(${filters.hueRotate}deg) `;
    if (filters.opacity !== 100) filterString += `opacity(${filters.opacity}%) `;
    if (filters.sepia) filterString += 'sepia(100%) ';
    if (filters.invert) filterString += 'invert(100%) ';

    return {
      filter: filterString.trim(),
      backgroundImage: `url(${previewUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  };

  if (!isOpen) return null;

  return (
    <div className={styles.uploadOverlay}>
      <div className={styles.uploadContainer}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={handleClose}>
            <i className="ri-close-line"></i>
          </button>
          <h3>Create Story</h3>
          {currentStep === 'edit' && (
            <button 
              className={styles.shareBtn}
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? 'Sharing...' : 'Share'}
            </button>
          )}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {currentStep === 'select' && !selectedFile && (
            <div className={styles.uploadArea}>
              <div className={styles.uploadIcon}>
                <i className="ri-camera-line"></i>
                <h4 className={styles.uploadText}>Create a story</h4>
                <p className={styles.uploadSubtext}>Share a photo or video</p>
                <button 
                  className={styles.uploadButton}
                  onClick={(e) => handleButtonClick(e, () => fileInputRef.current?.click())}
                  onTouchEnd={(e) => handleButtonClick(e, () => fileInputRef.current?.click())}
                >
                  Select from device
                </button>
              </div>
            </div>
          )}

          {currentStep === 'edit' && selectedFile && (
            <div className={styles.editScreen}>
              {/* Main Preview */}
              <div className={styles.previewArea}>
                <div className={styles.storyPreview} style={getPreviewStyle()}>
                  {/* Text Overlays */}
                  {textOverlays.map((textOverlay, index) => (
                    <div
                      key={index}
                      className={styles.textOverlay}
                      style={{
                        left: `${textOverlay.x}%`,
                        top: `${textOverlay.y}%`,
                        fontSize: `${textOverlay.fontSize}px`,
                        color: textOverlay.color,
                        fontFamily: textOverlay.fontFamily
                      }}
                      onClick={() => removeTextOverlay(index)}
                    >
                      {textOverlay.text}
                    </div>
                  ))}

                  {/* Duration indicator */}
                  <div className={styles.durationIndicator}>
                    {duration}s
                  </div>
                </div>

                {/* Story Tools */}
                <div className={styles.storyTools}>
                  <button 
                    className={styles.toolBtn}
                    onClick={() => setShowTextEditor(true)}
                  >
                    <i className="ri-text"></i>
                  </button>
                  <button className={styles.toolBtn}>
                    <i className="ri-brush-line"></i>
                  </button>
                  <button className={styles.toolBtn}>
                    <i className="ri-sticker-line"></i>
                  </button>
                </div>
              </div>

              {/* Bottom Controls */}
              <div className={styles.bottomControls}>
                {/* Duration Selector */}
                <div className={styles.durationRow}>
                  <span>Display Duration</span>
                  <div className={styles.durationButtons}>
                    {[10, 15, 30].map(time => (
                      <button
                        key={time}
                        className={`${styles.timeBtn} ${duration === time ? styles.active : ''}`}
                        onClick={() => setDuration(time)}
                      >
                        {time}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instagram Filter Presets */}
                <div className={styles.filterRow}>
                  <span>Filter Presets</span>
                  <div className={styles.instagramFilters}>
                    <div className={styles.filterPreset}>
                      <div 
                        className={`${styles.filterPreviewBtn} ${filters.normal ? styles.active : ''}`}
                        onClick={() => applyInstagramFilter('normal')}
                      >
                        <div className={styles.filterPreview} style={{backgroundImage: `url(${previewUrl})`}}></div>
                        <span>Normal</span>
                      </div>
                    </div>
                    <div className={styles.filterPreset}>
                      <div 
                        className={`${styles.filterPreviewBtn} ${filters.clarendon ? styles.active : ''}`}
                        onClick={() => applyInstagramFilter('clarendon')}
                      >
                        <div className={styles.filterPreview} style={{
                          backgroundImage: `url(${previewUrl})`,
                          filter: 'brightness(110%) contrast(120%) saturate(115%)'
                        }}></div>
                        <span>Clarendon</span>
                      </div>
                    </div>
                    <div className={styles.filterPreset}>
                      <div 
                        className={`${styles.filterPreviewBtn} ${filters.gingham ? styles.active : ''}`}
                        onClick={() => applyInstagramFilter('gingham')}
                      >
                        <div className={styles.filterPreview} style={{
                          backgroundImage: `url(${previewUrl})`,
                          filter: 'brightness(105%) contrast(90%) saturate(95%)'
                        }}></div>
                        <span>Gingham</span>
                      </div>
                    </div>
                    <div className={styles.filterPreset}>
                      <div 
                        className={`${styles.filterPreviewBtn} ${filters.moon ? styles.active : ''}`}
                        onClick={() => applyInstagramFilter('moon')}
                      >
                        <div className={styles.filterPreview} style={{
                          backgroundImage: `url(${previewUrl})`,
                          filter: 'brightness(95%) contrast(110%) saturate(85%) grayscale(100%)'
                        }}></div>
                        <span>Moon</span>
                      </div>
                    </div>
                    <div className={styles.filterPreset}>
                      <div 
                        className={`${styles.filterPreviewBtn} ${filters.lark ? styles.active : ''}`}
                        onClick={() => applyInstagramFilter('lark')}
                      >
                        <div className={styles.filterPreview} style={{
                          backgroundImage: `url(${previewUrl})`,
                          filter: 'brightness(115%) contrast(95%) saturate(110%) hue-rotate(15deg)'
                        }}></div>
                        <span>Lark</span>
                      </div>
                    </div>
                    <div className={styles.filterPreset}>
                      <div 
                        className={`${styles.filterPreviewBtn} ${filters.reyes ? styles.active : ''}`}
                        onClick={() => applyInstagramFilter('reyes')}
                      >
                        <div className={styles.filterPreview} style={{
                          backgroundImage: `url(${previewUrl})`,
                          filter: 'brightness(105%) contrast(90%) saturate(95%) opacity(90%) sepia(50%)'
                        }}></div>
                        <span>Reyes</span>
                      </div>
                    </div>
                    <div className={styles.filterPreset}>
                      <div 
                        className={`${styles.filterPreviewBtn} ${filters.juno ? styles.active : ''}`}
                        onClick={() => applyInstagramFilter('juno')}
                      >
                        <div className={styles.filterPreview} style={{
                          backgroundImage: `url(${previewUrl})`,
                          filter: 'brightness(110%) contrast(115%) saturate(120%)'
                        }}></div>
                        <span>Juno</span>
                      </div>
                    </div>
                    <div className={styles.filterPreset}>
                      <div 
                        className={`${styles.filterPreviewBtn} ${filters.ludwig ? styles.active : ''}`}
                        onClick={() => applyInstagramFilter('ludwig')}
                      >
                        <div className={styles.filterPreview} style={{
                          backgroundImage: `url(${previewUrl})`,
                          filter: 'brightness(105%) contrast(110%) saturate(115%)'
                        }}></div>
                        <span>Ludwig</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Filter Buttons */}
                <div className={styles.filterRow}>
                  <span>Quick Filters</span>
                  <div className={styles.filterButtons}>
                    <button 
                      className={`${styles.filterBtn} ${filters.vintage ? styles.active : ''}`}
                      onClick={() => handleFilterChange('vintage', !filters.vintage)}
                    >
                      Vintage
                    </button>
                    <button 
                      className={`${styles.filterBtn} ${filters.blackAndWhite ? styles.active : ''}`}
                      onClick={() => handleFilterChange('blackAndWhite', !filters.blackAndWhite)}
                    >
                      B&W
                    </button>
                    <button 
                      className={`${styles.filterBtn} ${filters.sepia ? styles.active : ''}`}
                      onClick={() => handleFilterChange('sepia', !filters.sepia)}
                    >
                      Sepia
                    </button>
                    <button 
                      className={`${styles.filterBtn} ${filters.invert ? styles.active : ''}`}
                      onClick={() => handleFilterChange('invert', !filters.invert)}
                    >
                      Invert
                    </button>
                  </div>
                </div>

                {/* Advanced Filters */}
                <div className={styles.advancedFilters}>
                  <div className={styles.filterSlider}>
                    <label>Brightness: {filters.brightness}</label>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={filters.brightness}
                      onChange={(e) => handleFilterChange('brightness', parseInt(e.target.value))}
                      className={styles.slider}
                    />
                  </div>
                  
                  <div className={styles.filterSlider}>
                    <label>Contrast: {filters.contrast}</label>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={filters.contrast}
                      onChange={(e) => handleFilterChange('contrast', parseInt(e.target.value))}
                      className={styles.slider}
                    />
                  </div>
                  
                  <div className={styles.filterSlider}>
                    <label>Saturation: {filters.saturation}</label>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={filters.saturation}
                      onChange={(e) => handleFilterChange('saturation', parseInt(e.target.value))}
                      className={styles.slider}
                    />
                  </div>
                  
                  <div className={styles.filterSlider}>
                    <label>Blur: {filters.blur}px</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={filters.blur}
                      onChange={(e) => handleFilterChange('blur', parseInt(e.target.value))}
                      className={styles.slider}
                    />
                  </div>
                  
                  <div className={styles.filterSlider}>
                    <label>Hue: {filters.hueRotate}°</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={filters.hueRotate}
                      onChange={(e) => handleFilterChange('hueRotate', parseInt(e.target.value))}
                      className={styles.slider}
                    />
                  </div>
                  
                  <div className={styles.filterSlider}>
                    <label>Opacity: {filters.opacity}%</label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={filters.opacity}
                      onChange={(e) => handleFilterChange('opacity', parseInt(e.target.value))}
                      className={styles.slider}
                    />
                  </div>
                  
                  <button 
                    className={styles.resetFilters}
                    onClick={resetFilters}
                  >
                    Reset All Filters
                  </button>
                </div>

                {/* Caption */}
                <div className={styles.captionRow}>
                  <input
                    type="text"
                    placeholder="Add a caption..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={500}
                    className={styles.captionInput}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons cho Edit Screen */}
        {currentStep === 'edit' && (
          <div className={styles.footerButtons}>
            <button className={styles.cancelBtn} onClick={handleClose}>
              Discard
            </button>
            <button 
              className={styles.shareBtn}
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
            >
              {isUploading ? 'Sharing...' : 'Share to Story'}
            </button>
          </div>
        )}

        {/* Text Editor Modal */}
        {showTextEditor && (
          <div className={styles.textEditorModal}>
            <div className={styles.textEditorContent}>
              <input
                type="text"
                placeholder="Enter text..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                autoFocus
                className={styles.textInput}
              />
              <div className={styles.textActions}>
                <button onClick={() => setShowTextEditor(false)}>Cancel</button>
                <button onClick={addTextOverlay}>Add</button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*"
          style={{ display: 'none' }}
          capture="environment"
        />
      </div>
    </div>
  );
};

export default StoryUpload;
