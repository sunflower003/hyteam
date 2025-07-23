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
            if (response.data.success) {
                setUser(response.data.data.user);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await api.post('/api/auth/login', 
                { email, 
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
            return { success: false, message };
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
    }

    const value = {
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}