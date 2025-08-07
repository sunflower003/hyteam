// client/src/components/Documents/DocumentHeader.jsx
import React from 'react';

const DocumentHeader = ({ 
  onUpload, onSearch, onSort, onViewChange, onDelete,
  selectedCount, viewMode, sortBy, isUploading, searchQuery 
}) => {
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onUpload(files);
      e.target.value = '';
    }
  };

  return (
    <div style={{ 
      background: 'white', 
      padding: '20px', 
      borderRadius: '8px', 
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>📁 Tài liệu của tôi</h2>
          {selectedCount > 0 && (
            <span style={{ color: '#1976d2', fontSize: '14px' }}>
              {selectedCount} mục đã chọn
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input 
            type="text"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #ddd',
              borderRadius: '4px',
              width: '200px'
            }}
          />
          
          <select 
            value={sortBy}
            onChange={(e) => onSort(e.target.value)}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="name">Tên</option>
            <option value="date">Ngày tạo</option>
            <option value="size">Kích thước</option>
          </select>
          
          <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: '4px' }}>
            <button
              style={{ 
                padding: '8px 12px', 
                border: 'none',
                background: viewMode === 'list' ? '#1976d2' : 'white',
                color: viewMode === 'list' ? 'white' : 'black',
                cursor: 'pointer'
              }}
              onClick={() => onViewChange('list')}
            >
              📋
            </button>
            <button
              style={{ 
                padding: '8px 12px', 
                border: 'none',
                background: viewMode === 'grid' ? '#1976d2' : 'white',
                color: viewMode === 'grid' ? 'white' : 'black',
                cursor: 'pointer'
              }}
              onClick={() => onViewChange('grid')}
            >
              ⚏
            </button>
          </div>
          
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="file-input"
          />
          <label 
            htmlFor="file-input"
            style={{ 
              padding: '8px 16px',
              background: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📤 {isUploading ? 'Đang tải...' : 'Tải lên'}
          </label>
          
          {selectedCount > 0 && (
            <button 
              onClick={onDelete}
              style={{ 
                padding: '8px 16px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🗑️ Xóa ({selectedCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentHeader;
