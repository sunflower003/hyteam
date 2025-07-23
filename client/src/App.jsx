import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import MovieRoom from './components/MovieRoom';
import NewLogin from './components/NewLogin';
import './App.css'

const AppContent = () => {
    const {user, loading, logout} = useAuth();
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
    const [currentView, setCurrentView] = useState('home'); 

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
                    <Login onSwitchToRegister={() => setAuthMode('register')} />
                ) : (
                    <Register onSwitchToLogin={() => setAuthMode('login')} />
                )}
            </div>
        );
    }
    const renderView = () => {
      switch(currentView) {
        case 'movie-room':
          return <MovieRoom />;
        case 'new-login':
          return <NewLogin />;
        default: 
          return (
            <div className="dashboard">
              <header className="dashboard-header">
                <h1>Welcome, {user.username}</h1>
                <div className="user-info">
                  <img src={user.avatar} alt="Avatar" className="user-avatar" />
                  <span>{user.email}</span>
                  <button onClick={logout} className="logout-button">Logout</button>
                </div>
              </header>

              <div className="feature-grid">
                <div className="feature-card"
                  onClick={() => setCurrentView('movie-room')}>
                  <h2>Movie Room</h2>
                  <p>Watch movies together with friends</p>
                </div>

                <div className="feature-card"
                  onClick={() => setCurrentView('new-login')}>
                  <h2>New Login</h2>
                  <p>Test new login component</p>
                </div>

                <div className="feature-card comming-soon">
                  <h2>Story 24h</h2>
                  <p>Share your daily stories with friends</p>
                </div>

                <div className="feature-card comming-soon">
                  <h2>Task Management</h2>
                  <p>Kanban board to manage your tasks</p>
                </div>

                <div className="feature-card comming-soon">
                  <h2>Fund Management</h2>
                  <p>Track your expenses and income</p>
                </div>
            </div>
          </div>
          );
      }
    };

    return (
      <div className="app">
        {currentView !== 'home' && (
          <button 
            className="back-button"
            onClick={() => setCurrentView('home')}
          >
            Back to Dashboard
          </button>
        )}
        {renderView()}
      </div>
    );
};


function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App
