import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/components/StoryUpload.module.css';
import api from '../utils/api';

const StoryUpload = ({ isOpen, onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileType, setFileType] = useState(null);
  const [currentStep, setCurrentStep] = useState('select'); // 'select', 'edit'
  const [showFilters, setShowFilters] = useState(false);
  
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
  const [imageErrored, setImageErrored] = useState(false);

  const fileInputRef = useRef(null);
  const previewRef = useRef(null); // container for drag calculations
  const dragStateRef = useRef({ draggingIndex: null, startX: 0, startY: 0 });

  // iOS detection and viewport utilities
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIOSSafari = isIOS && !window.MSStream;

  // Handle viewport changes on iOS
  useEffect(() => {
    if (isIOSSafari && isOpen) {
      const handleViewportChange = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };

      handleViewportChange();
      window.addEventListener('resize', handleViewportChange);
      window.addEventListener('orientationchange', handleViewportChange);
      
      return () => {
        window.removeEventListener('resize', handleViewportChange);
        window.removeEventListener('orientationchange', handleViewportChange);
      };
    }
  }, [isOpen, isIOSSafari]);

  // Lock body scroll on iOS with better handling
  useEffect(() => {
    if (isOpen) {
      // Enhanced iOS body lock
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.webkitOverflowScrolling = 'touch';
    } else {
      // Restore body styles
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.webkitOverflowScrolling = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.webkitOverflowScrolling = '';
    };
  }, [isOpen]);

  // Auto-trigger file picker when component opens (except on iOS)
  useEffect(() => {
    if (isOpen && currentStep === 'select' && !isIOS) {
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentStep, isIOS]);

  const testImageUrl = (url) => new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = reject;
      img.src = url;
    } catch (e) { reject(e); }
  });

  const handleFileSelect = async (event) => {
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

    // Revoke old blob URL if any
    if (previewUrl && typeof previewUrl === 'string' && previewUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(previewUrl); } catch (_) {}
    }

  setSelectedFile(file);

    // Create preview: prefer Blob URL for images (fast), HEIC -> convert to JPEG for Safari, verify it actually loads, fallback to DataURL; blob for videos
    setImageErrored(false);
    if (file.type.startsWith('image/')) {
      const fileName = (file.name || '').toLowerCase();
      const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || fileName.endsWith('.heic') || fileName.endsWith('.heif');
      if (isHeic) {
        // Convert HEIC/HEIF to JPEG for reliable preview
        try {
          const mod = await import('heic2any');
          const heic2any = (mod && mod.default) || mod;
          const jpgBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
          const jpgUrl = URL.createObjectURL(jpgBlob);
          try {
            await testImageUrl(jpgUrl);
            setPreviewUrl(jpgUrl);
          } catch (_) {
            const dataUrl = await readFileAsDataUrl(jpgBlob);
            setPreviewUrl(dataUrl);
          }
        } catch (_) {
          const url = URL.createObjectURL(file);
          try { await testImageUrl(url); setPreviewUrl(url); }
          catch { const dataUrl = await readFileAsDataUrl(file); setPreviewUrl(dataUrl); }
        }
      } else {
        const url = URL.createObjectURL(file);
        try {
          await testImageUrl(url);
          setPreviewUrl(url);
        } catch (_) {
          const dataUrl = await readFileAsDataUrl(file);
          setPreviewUrl(dataUrl);
        }
      }
      setShowFilters(true);
    } else {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setShowFilters(false);
    }
    setCurrentStep('edit');
    
    // Reset input value để có thể chọn cùng file nhiều lần
    event.target.value = '';
  };

  // Fallback reader to dataURL if blob fails
  const readFileAsDataUrl = (fileOrBlob) => new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBlob);
    } catch (err) { reject(err); }
  });

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
    setShowFilters(false);
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
    
    if (previewUrl && typeof previewUrl === 'string' && previewUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(previewUrl); } catch (_) {}
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

  // Drag handlers for text overlays
  const onStartDragText = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    const point = 'touches' in e ? e.touches[0] : e;
    dragStateRef.current.draggingIndex = index;
    dragStateRef.current.startX = point.clientX;
    dragStateRef.current.startY = point.clientY;

    // Attach listeners on document to track dragging outside element
    document.addEventListener('mousemove', onDragText);
    document.addEventListener('mouseup', onEndDragText);
    document.addEventListener('touchmove', onDragText, { passive: false });
    document.addEventListener('touchend', onEndDragText);
  };

  const onDragText = (e) => {
    const idx = dragStateRef.current.draggingIndex;
    if (idx === null || !previewRef.current) return;
    const point = 'touches' in e ? e.touches[0] : e;
    if ('touches' in e) e.preventDefault();

    const rect = previewRef.current.getBoundingClientRect();
    const x = ((point.clientX - rect.left) / rect.width) * 100;
    const y = ((point.clientY - rect.top) / rect.height) * 100;
    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
    const nx = clamp(x, 2, 98);
    const ny = clamp(y, 2, 98);

    setTextOverlays(prev => prev.map((t, i) => i === idx ? { ...t, x: nx, y: ny } : t));
  };

  const onEndDragText = () => {
    dragStateRef.current.draggingIndex = null;
    document.removeEventListener('mousemove', onDragText);
    document.removeEventListener('mouseup', onEndDragText);
    document.removeEventListener('touchmove', onDragText);
    document.removeEventListener('touchend', onEndDragText);
  };

  // Generate media filter style (apply directly to <img>/<video>)
  const getMediaFilterStyle = () => {
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
      filter: filterString.trim()
    };
  };

  if (!isOpen) return null;

  const modal = (
    <div className={styles.uploadOverlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={styles.uploadContainer}>
        {/* Header: hide on edit to mimic Instagram full-bleed editor */}
        {currentStep !== 'edit' && (
          <div className={styles.header}>
            <button className={styles.closeBtn} onClick={handleClose}>
              <i className="ri-close-line"></i>
            </button>
            <h3>Create Story</h3>
            <button 
              className={styles.shareBtn}
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? 'Sharing...' : 'Share'}
            </button>
          </div>
        )}

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
                <div className={styles.storyPreview} ref={previewRef}>
                  {/* Blurred backdrop to avoid letterboxing gaps (image only) */}
                  {fileType === 'image' && previewUrl && (
                    <div
                      className={styles.storyBackdrop}
                      style={{ backgroundImage: `url(${previewUrl})` }}
                    />
                  )}
                  {/* Media Element (use <img>/<video> instead of CSS background for iOS) */}
                  {fileType === 'image' && previewUrl && (
                    <div
                      className={styles.storyMediaBg}
                      style={{
                        backgroundImage: `url(${previewUrl})`,
                        ...getMediaFilterStyle()
                      }}
                    />
                  )}
                  {fileType === 'video' && previewUrl && (
                    <video
                      src={previewUrl}
                      className={styles.storyMedia}
                      /* Do not apply image filters to videos for better performance/compat */
                      playsInline
                      controls
                    />
                  )}
                  {/* Instagram-like top bar (X, Aa, Filter) */}
                  <div className={styles.igTopBar}>
                    <div className={styles.igActionsLeft}>
                      <button 
                        className={styles.igBtn}
                        title="Close"
                        onClick={handleClose}
                      >
                        <i className="ri-close-line" />
                      </button>
                    </div>
                    <div className={styles.igActions}>
                      <button 
                        className={styles.igBtn}
                        title="Add text"
                        onClick={() => setShowTextEditor(true)}
                      >
                        <span className={styles.igAa}>Aa</span>
                      </button>
                      {fileType === 'image' && (
                        <button 
                          className={`${styles.igBtn} ${showFilters ? styles.active : ''}`}
                          title="Filters"
                          onClick={() => setShowFilters(prev => !prev)}
                        >
                          <i className="ri-sparkling-2-line" />
                        </button>
                      )}
                    </div>
                  </div>
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
                      onMouseDown={(e) => onStartDragText(index, e)}
                      onTouchStart={(e) => onStartDragText(index, e)}
                    >
                      {textOverlay.text}
                    </div>
                  ))}

                  {/* Duration indicator (subtle like IG) */}
                  <div className={styles.durationIndicator}>{duration}s</div>
                </div>

                {/* Removed legacy side tools to match Instagram minimal UI */}
              </div>
              
              {/* IG-style filter overlay on top of the image */}
              {fileType === 'image' && showFilters && (
                <div className={styles.igFilterOverlay}>
                  <div className={styles.instagramFiltersOverlay}>
                    <div className={styles.filterPreset}>
                      <div 
                        className={`${styles.filterPreviewBtn} ${filters.normal ? styles.active : ''}`}
                        onClick={() => applyInstagramFilter('normal')}
                      >
                        <div className={`${styles.filterPreviewCircle}`} style={{backgroundImage: `url(${previewUrl})`}}></div>
                        <span>Normal</span>
                      </div>
                    </div>
                    <div className={styles.filterPreset}>
                      <div 
                        className={`${styles.filterPreviewBtn} ${filters.clarendon ? styles.active : ''}`}
                        onClick={() => applyInstagramFilter('clarendon')}
                      >
                        <div className={styles.filterPreviewCircle} style={{
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
                        <div className={styles.filterPreviewCircle} style={{
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
                        <div className={styles.filterPreviewCircle} style={{
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
                        <div className={styles.filterPreviewCircle} style={{
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
                        <div className={styles.filterPreviewCircle} style={{
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
                        <div className={styles.filterPreviewCircle} style={{
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
                        <div className={styles.filterPreviewCircle} style={{
                          backgroundImage: `url(${previewUrl})`,
                          filter: 'brightness(105%) contrast(110%) saturate(115%)'
                        }}></div>
                        <span>Ludwig</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom share bar like Instagram */}
              <div className={styles.igShareBar}>
                <input
                  type="text"
                  placeholder="Add a caption..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={300}
                  className={styles.captionInput}
                />
                <button 
                  className={styles.shareBtn}
                  onClick={handleUpload}
                  disabled={isUploading || !selectedFile}
                >
                  {isUploading ? 'Sharing...' : 'Share'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons removed in IG mode; handled by igShareBar */}

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

  // Use portal to avoid ancestor clipping/transform issues on iOS Safari
  return createPortal(modal, document.body);
};

export default StoryUpload;
