import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { postService } from '../services/postService';

const PostContext = createContext();

const postReducer = (state, action) => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        
        case 'SET_POSTS':
            return { 
                ...state, 
                posts: action.payload,
                loading: false 
            };
        
        case 'ADD_POST':
            return { 
                ...state, 
                posts: [action.payload, ...state.posts] 
            };
        
        case 'UPDATE_POST':
            return {
                ...state,
                posts: state.posts.map(post => 
                    post._id === action.payload._id ? action.payload : post
                )
            };
        
        case 'DELETE_POST':
            return {
                ...state,
                posts: state.posts.filter(post => post._id !== action.payload)
            };
        
        case 'TOGGLE_LIKE':
            return {
                ...state,
                posts: state.posts.map(post => 
                    post._id === action.payload.postId ? {
                        ...post,
                        stats: { ...post.stats, likesCount: action.payload.likesCount },
                        isLiked: action.payload.isLiked
                    } : post
                )
            };
        
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false };
        
        default:
            return state;
    }
};

const initialState = {
    posts: [],
    loading: false,
    error: null
};

export const PostProvider = ({ children }) => {
    const [state, dispatch] = useReducer(postReducer, initialState);

    const fetchPosts = useCallback(async (page = 1) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await postService.getAllPosts(page);
            if (response.success) {
                dispatch({ type: 'SET_POSTS', payload: response.data });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error.message });
        }
    }, []);

    const createPost = useCallback(async (postData) => {
        try {
            const response = await postService.createPost(postData);
            if (response.success) {
                dispatch({ type: 'ADD_POST', payload: response.data.post });
                return response.data.post;
            }
            throw new Error(response.message);
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error.message });
            throw error;
        }
    }, []);

    const toggleLike = useCallback(async (postId, isLiked) => {
        try {
            const response = isLiked 
                ? await postService.unlikePost(postId)
                : await postService.likePost(postId);
            
            if (response.success) {
                dispatch({ 
                    type: 'TOGGLE_LIKE', 
                    payload: { 
                        postId, 
                        likesCount: response.data.likesCount,
                        isLiked: response.data.isLiked
                    }
                });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error.message });
        }
    }, []);

    const searchPosts = useCallback(async (query) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await postService.searchPosts(query);
            if (response.success) {
                dispatch({ type: 'SET_POSTS', payload: response.data });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error.message });
        }
    }, []);

    const value = {
        ...state,
        fetchPosts,
        createPost,
        toggleLike,
        searchPosts
    };

    return (
        <PostContext.Provider value={value}>
            {children}
        </PostContext.Provider>
    );
};

export const usePost = () => {
    const context = useContext(PostContext);
    if (!context) {
        throw new Error('usePost must be used within a PostProvider');
    }
    return context;
};
