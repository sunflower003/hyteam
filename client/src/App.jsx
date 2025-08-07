import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext'; 
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
import Documents from './components/Documents/Documents'; // ← THÊM
import './App.css'

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
        <div className="app">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Hyfeed />} />
              <Route path="chat" element={<Chat />} /> 
              <Route path="movie-room" element={<MovieRoom />} />
              <Route path="profile" element={<Profile />} />
              <Route path="profile/:userId" element={<Profile />} />
              <Route path="edit-profile" element={<EditProfile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="projects" element={<Projects />} />
              <Route path="documents" element={<Documents />} /> {/* ← THÊM */}
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </ChatProvider>
    );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App
