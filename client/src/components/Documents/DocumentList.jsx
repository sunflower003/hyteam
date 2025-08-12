// client/src/components/Documents/DocumentList.jsx
import React, { useState } from 'react';

const DocumentList = ({ 
  documents, viewMode, selectedDocs, onSelect, onRename, onDelete, onDownload 
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('doc')) return '📝';
    if (type.includes('zip')) return '🗜️';
    return '📁';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onSelect(documents.map(doc => doc.id));
    } else {
      onSelect([]);
    }
  };

  const handleSelectDoc = (docId, checked) => {
    if (checked) {
      onSelect([...selectedDocs, docId]);
    } else {
      onSelect(selectedDocs.filter(id => id !== docId));
    }
  };

  const startEdit = (doc) => {
    setEditingId(doc.id);
    setEditName(doc.name.split('.')[0]);
  };

  const saveEdit = () => {
    if (editName.trim()) {
      const doc = documents.find(d => d.id === editingId);
      const extension = doc.name.split('.').pop();
      const newFullName = `${editName.trim()}.${extension}`;
      onRename(editingId, newFullName);
    }
    setEditingId(null);
    setEditName('');
  };

  if (viewMode === 'list') {
    return (
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '50px 1fr 120px 160px 140px',
          padding: '16px 20px',
          background: '#f8f9fa',
          fontWeight: '600',
          borderBottom: '1px solid #ddd'
        }}>
          <div>
            <input
              type="checkbox"
              checked={selectedDocs.length === documents.length && documents.length > 0}
              onChange={handleSelectAll}
            />
          </div>
          <div>Tên</div>
          <div>Kích thước</div>
          <div>Ngày tạo</div>
          <div>Thao tác</div>
        </div>

        {documents.map(doc => {
          console.log('🔍 Rendering document:', doc);
          console.log('🔍 Document ID:', doc.id);
          return (
          <div key={doc.id} style={{ 
            display: 'grid', 
            gridTemplateColumns: '50px 1fr 120px 160px 140px',
            padding: '16px 20px',
            borderBottom: '1px solid #f0f0f0',
            alignItems: 'center'
          }}>
            <div>
              <input
                type="checkbox"
                checked={selectedDocs.includes(doc.id)}
                onChange={(e) => handleSelectDoc(doc.id, e.target.checked)}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>{getFileIcon(doc.type)}</span>
              {editingId === doc.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={saveEdit}
                  onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                  style={{ padding: '4px', border: '1px solid #1976d2', borderRadius: '4px' }}
                  autoFocus
                />
              ) : (
                <span>{doc.name}</span>
              )}
            </div>
            
            <div>{formatFileSize(doc.size)}</div>
            <div>{formatDate(doc.createdAt)}</div>
            
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button 
                onClick={() => onDownload(doc)}
                style={{ padding: '4px 8px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                📥
              </button>
              <button 
                onClick={() => startEdit(doc)}
                style={{ padding: '4px 8px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                ✏️
              </button>
              <button 
                onClick={() => onDelete(doc.id)}
                style={{ padding: '4px 8px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                🗑️
              </button>
            </div>
          </div>
          );
        })}
      </div>
    );
  }

  // Grid View
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
      gap: '20px' 
    }}>
      {documents.map(doc => (
        <div key={doc.id} style={{ 
          background: 'white', 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ padding: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <input
              type="checkbox"
              checked={selectedDocs.includes(doc.id)}
              onChange={(e) => handleSelectDoc(doc.id, e.target.checked)}
            />
          </div>
          
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ 
              height: '120px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: '#f8f9fa',
              marginBottom: '12px',
              borderRadius: '8px',
              fontSize: '48px'
            }}>
              {getFileIcon(doc.type)}
            </div>
            
            <div>
              {editingId === doc.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={saveEdit}
                  onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                  style={{ width: '100%', padding: '4px', border: '1px solid #1976d2', borderRadius: '4px' }}
                  autoFocus
                />
              ) : (
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px' }}>{doc.name}</h4>
              )}
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                {formatFileSize(doc.size)} • {formatDate(doc.createdAt)}
              </p>
            </div>
          </div>
          
          <div style={{ 
            padding: '12px 16px', 
            borderTop: '1px solid #f0f0f0', 
            display: 'flex', 
            justifyContent: 'space-around' 
          }}>
            <button 
              onClick={() => onDownload(doc)}
              style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              📥
            </button>
            <button 
              onClick={() => startEdit(doc)}
              style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ✏️
            </button>
            <button 
              onClick={() => onDelete(doc.id)}
              style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DocumentList;
