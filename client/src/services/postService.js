import { apiClient } from './apiClient';

export const postService = {
    getAllPosts: async (page = 1, limit = 20) => {
        const response = await apiClient.get(`/posts?page=${page}&limit=${limit}`);
        return response.data;
    },

    getPostById: async (id) => {
        const response = await apiClient.get(`/posts/${id}`);
        return response.data;
    },

    searchPosts: async (query, page = 1) => {
        const response = await apiClient.get(`/posts/search?q=${encodeURIComponent(query)}&page=${page}`);
        return response.data;
    },

    createPost: async (postData) => {
        const formData = new FormData();
        formData.append('image', postData.image);
        formData.append('content', postData.content || '');
        if (postData.tags) formData.append('tags', postData.tags);
        if (postData.location) formData.append('location', postData.location);

        const response = await apiClient.post('/posts', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    updatePost: async (id, updateData) => {
        const response = await apiClient.put(`/posts/${id}`, updateData);
        return response.data;
    },

    deletePost: async (id) => {
        const response = await apiClient.delete(`/posts/${id}`);
        return response.data;
    },

    likePost: async (id) => {
        const response = await apiClient.post(`/posts/${id}/like`);
        return response.data;
    },

    unlikePost: async (id) => {
        const response = await apiClient.delete(`/posts/${id}/like`);
        return response.data;
    },

    addComment: async (id, content) => {
        const response = await apiClient.post(`/posts/${id}/comments`, { content });
        return response.data;
    },

    getUserPosts: async (userId, page = 1) => {
        const response = await apiClient.get(`/posts/user/${userId}?page=${page}`);
        return response.data;
    }
};
