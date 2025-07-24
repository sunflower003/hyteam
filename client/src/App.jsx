import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import MovieRoom from './components/MovieRoom';
import NewLogin from './components/NewLogin';
import Dashboard from './components/Dashboard';
import Home from './components/Home';
import Profile from './components/Profile';
import Settings from './components/Settings';
import Layout from './components/Layout';
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

    return (
      <div className="app">
        <Routes>
          {/* Public routes - accessible without authentication */}
          <Route path="/newlogin" element={<NewLogin />} />
          
          {/* Protected routes - require authentication */}
          {user ? (
            <>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="/movie-room" element={<MovieRoom />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              {/* Authentication routes */}
              <Route path="/login" element={
                <Login onSwitchToRegister={() => setAuthMode('register')} />
              } />
              <Route path="/register" element={
                <Register onSwitchToLogin={() => setAuthMode('login')} />
              } />
              <Route path="/" element={
                authMode === 'login' ? (
                  <Login onSwitchToRegister={() => setAuthMode('register')} />
                ) : (
                  <Register onSwitchToLogin={() => setAuthMode('login')} />
                )
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </div>
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
