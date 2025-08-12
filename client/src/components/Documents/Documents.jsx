// client/src/components/Documents/Documents.jsx
import React, { useState, useEffect } from 'react';
import DocumentHeader from './DocumentHeader';
import DocumentList from './DocumentList';
import { documentAPI } from '../../utils/documentAPI';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    filterAndSortDocuments();
  }, [documents, searchQuery, sortBy]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await documentAPI.getAll();
      console.log('📊 Fetched documents data:', data);
      console.log('📊 First document structure:', data[0]);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortDocuments = () => {
    let filtered = documents.filter(doc =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'size':
          return b.size - a.size;
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    setFilteredDocs(filtered);
  };

  const handleUpload = async (files) => {
    try {
      setIsUploading(true);
      setError(null);
      await documentAPI.upload(files);
      await fetchDocuments();
      alert('Upload thành công!');
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message);
      alert(`Lỗi upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docIds) => {
    console.log('🚀 handleDelete called with:', docIds);
    console.log('🚀 Type of docIds:', typeof docIds, Array.isArray(docIds));
    
    if (!docIds || docIds.length === 0) {
      alert('Vui lòng chọn file để xóa');
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn xóa ${docIds.length} tài liệu?`)) return;
    
    try {
      console.log('🗑️ Deleting documents with IDs:', docIds); // Debug
      setError(null);
      
      const result = await documentAPI.delete(docIds);
      console.log('✅ Delete API result:', result); // Debug
      
      // Cập nhật state ngay lập tức để UI phản hồi nhanh
      setDocuments(prev => {
        const filtered = prev.filter(doc => !docIds.includes(doc.id));
        console.log('📊 Updated documents count:', prev.length, '→', filtered.length);
        console.log('📊 Documents before filter:', prev.map(d => ({id: d.id, name: d.name})));
        console.log('📊 Documents after filter:', filtered.map(d => ({id: d.id, name: d.name})));
        return filtered;
      });
      setSelectedDocs([]);
      
      // Fetch lại từ server để đảm bảo đồng bộ
      await fetchDocuments();
      
      alert(`Xóa thành công ${result.deletedCount || docIds.length} tài liệu!`);
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.message);
      alert(`Lỗi xóa: ${error.message}`);
      
      // Refresh khi có lỗi
      await fetchDocuments();
    }
  };

  const handleRename = async (docId, newName) => {
    try {
      setError(null);
      await documentAPI.rename(docId, newName);
      await fetchDocuments();
      alert('Đổi tên thành công!');
    } catch (error) {
      console.error('Rename error:', error);
      setError(error.message);
      alert(`Lỗi đổi tên: ${error.message}`);
    }
  };

  const handleDownload = async (doc) => {
    try {
      console.log('📥 Downloading document:', doc);
      console.log('📥 Document filename:', doc.filename);
      console.log('📥 Document path:', doc.path);
      console.log('📥 Document url:', doc.url);
      setError(null);
      
      // Lấy filename từ path nếu không có filename field
      const filename = doc.filename || (doc.path ? doc.path.split('/').pop() : null);
      console.log('📥 Using filename:', filename);
      
      if (!filename) {
        throw new Error('Không tìm thấy tên file');
      }
      
      await documentAPI.download(filename, doc.name);
    } catch (error) {
      console.error('Download error:', error);
      setError(error.message);
      alert(`Lỗi tải file: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Đang tải tài liệu...</p>
      </div>
    );
  }

  return (
    <div className="documents-container">
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <DocumentHeader
        onUpload={handleUpload}
        onSearch={setSearchQuery}
        onSort={setSortBy}
        onViewChange={setViewMode}
        onDelete={() => handleDelete(selectedDocs)}
        selectedCount={selectedDocs.length}
        viewMode={viewMode}
        sortBy={sortBy}
        isUploading={isUploading}
        searchQuery={searchQuery}
      />
      
      <DocumentList
        documents={filteredDocs}
        viewMode={viewMode}
        selectedDocs={selectedDocs}
        onSelect={setSelectedDocs}
        onRename={handleRename}
        onDelete={(id) => handleDelete([id])}
        onDownload={handleDownload}
      />

      {filteredDocs.length === 0 && !isLoading && (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>Chưa có tài liệu nào</h3>
          <p>Hãy tải lên tài liệu đầu tiên của bạn</p>
        </div>
      )}
    </div>
  );
};

export default Documents;
