import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

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

    //cau hinh axios mac dinh
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        //Verify token va lay thong tin user
        checkAuth();
        } else {
            setLoading(false);
        }
    }, [token]); // chi chay khi token thay doi

    const checkAuth = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/auth/profile`);
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
            const response = await axios.post(`${API_BASE_URL}/api/auth/login`, 
                { email, 
                  password 
                });

                if (response.data.success) {
                    const {user, token} = response.data.data;
                    setUser(user);
                    setToken(token);
                    localStorage.setItem('token', token);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    return { success: true, message: response.data.message };
                }
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed';
            return { success: false, message };
        }
    };

    const register = async (username, email, password) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/auth/register`, 
                { username, 
                  email, 
                  password 
                });

            if (response.data.success) {
                const {user, token} = response.data.data;
                setUser(user);
                setToken(token);
                localStorage.setItem('token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
        delete axios.defaults.headers.common['Authorization'];
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