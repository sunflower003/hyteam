import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

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
                <div className="feature-card" onClick={() => navigate('/movie-room')}>
                    <h2>Movie Room</h2>
                    <p>Watch movies together with friends</p>
                </div>

                <div className="feature-card" onClick={() => navigate('/newlogin')}>
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
};

export default Dashboard;