import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext'; 
import { NotificationProvider } from './context/NotificationContext';
import NewLogin from './components/NewLogin';
import Register from './components/Register';
import MovieRoom from './components/MovieRoom';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Settings from './components/Settings';
import Layout from './components/Layout';
import Hyfeed from './pages/Hyfeed';
import Projects from './pages/Projects';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import Documents from './components/Documents/Documents'; // ← THÊM
import './App.css'
import './styles/components/HighlightedPost.css'

const AppContent = () => {
    const {user, loading} = useAuth();
    const [authMode, setAuthMode] = useState('login');

    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      );
    }

    if (!user) {
        return (
            <div className="app">
                {authMode === 'login' ? (
                    <NewLogin onSwitchToRegister={() => setAuthMode('register')} />
                ) : (
                    <Register onSwitchToLogin={() => setAuthMode('login')} />
                )}
            </div>
        );
    }

    return (
      <ChatProvider> 

        <NotificationProvider> {/* DI CHUYỂN VÀO TRONG */}
          <div className="app">
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Hyfeed />} />
                {/* Chat list (mobile shows list) */}
                <Route path="chat" element={<Chat />} />
                {/* Chat thread (mobile full screen thread) */}
                <Route path="chat/:conversationId" element={<Chat />} /> 
                <Route path="movie-room" element={<MovieRoom />} />
                <Route path="profile" element={<Profile />} />
                <Route path="profile/:userId" element={<Profile />} />
                <Route path="edit-profile" element={<EditProfile />} />
                <Route path="settings" element={<Settings />} />
                <Route path="projects" element={<Projects />} />
                <Route path="documents" element={<Documents />} /> {/* ← THÊM */}
                <Route path="notifications" element={<Notifications />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </NotificationProvider>

      </ChatProvider>
    );
};

function App() {
  return (
    <AuthProvider>
      <Router> {/* Router PHẢI BẬT NGOÀI CÙNG */}
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App
