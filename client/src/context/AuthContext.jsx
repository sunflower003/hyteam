import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            //Verify token va lay thong tin user
            checkAuth();
        } else {
            setLoading(false);
        }
    }, [token]); // chi chay khi token thay doi

    const checkAuth = async () => {
        try {
            const response = await api.get('/api/auth/profile');
            console.log('Auth check response:', response.data);
            
            if (response.data.success) {
                const userData = response.data.data?.user || response.data.user;
                if (userData) {
                    setUser(userData);
                } else {
                    console.error('No user data in auth check response');
                    logout();
                }
            } else {
                console.error('Auth check failed:', response.data.message);
                logout();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            
            // Only logout if it's actually an auth error (401)
            if (error.response?.status === 401) {
                logout();
            }
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            console.log('🔐 Attempting login with:', { email, password: '***' });
            const response = await api.post('/api/auth/login', 
                { email, 
                  password 
                });

                console.log('🔐 Login response:', response.data);
                if (response.data.success) {
                    const {user, token} = response.data.data;
                    console.log('✅ Login successful, setting user and token');
                    setUser(user);
                    setToken(token);
                    localStorage.setItem('token', token);
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    return { success: true, message: response.data.message };
                }
        } catch (error) {
            console.error('❌ Login error:', error);
            console.error('❌ Error response:', error.response?.data);
            const message = error.response?.data?.message || 'Login failed';
            return { success: false, message };
        }
    };

    const register = async (username, email, password) => {
        try {
            const response = await api.post('/api/auth/register', 
                { username, 
                  email, 
                  password 
                });

            if (response.data.success) {
                const {user, token} = response.data.data;
                setUser(user);
                setToken(token);
                localStorage.setItem('token', token);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                return { success: true, message: response.data.message };
            }
        } catch (error) {
            console.log("Register error:", error.response?.data || error.message);
            const message = error.response?.data?.message || 'Registration failed';
            const errorDetails = error.response?.data?.error || null;
            return { 
                success: false, 
                message,
                error: errorDetails
            };
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
    }

    // Function to refresh user data without logout
    const refreshUser = async () => {
        try {
            if (!token) return;
            
            const response = await api.get('/api/auth/profile');
            if (response.data.success) {
                const userData = response.data.data?.user || response.data.user;
                if (userData) {
                    setUser(userData);
                    return userData;
                }
            }
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
        return null;
    };

    const value = {
        user,
        setUser,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}