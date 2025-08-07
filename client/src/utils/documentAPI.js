// client/src/utils/documentAPI.js
import api from './api'; // hoặc đường dẫn tới file api của bạn

export const documentAPI = {
  // GET /api/documents
  getAll: async () => {
    try {
      const response = await api.get('/api/documents');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch documents');
    }
  },

  // POST /api/documents/upload
  upload: async (files) => {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('documents', file);
    });

    try {
      const response = await api.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log('Upload Progress:', progress + '%');
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error uploading documents:', error);
      throw new Error(error.response?.data?.message || 'Upload failed');
    }
  },

  // DELETE /api/documents
  delete: async (ids) => {
    try {
      const response = await api.delete('/api/documents', { 
        data: { ids } 
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting documents:', error);
      throw new Error(error.response?.data?.message || 'Delete failed');
    }
  },

  // PUT /api/documents/:id
  rename: async (id, name) => {
    try {
      const response = await api.put(`/api/documents/${id}`, { name });
      return response.data;
    } catch (error) {
      console.error('Error renaming document:', error);
      throw new Error(error.response?.data?.message || 'Rename failed');
    }
  },

  // GET /api/documents/:filename/download
  download: async (filename, originalName) => {
    try {
      const response = await api.get(`/api/documents/${filename}/download`, {
        responseType: 'blob'
      });
      
      // Tạo link download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return response.data;
    } catch (error) {
      console.error('Error downloading document:', error);
      throw new Error(error.response?.data?.message || 'Download failed');
    }
  }
};
