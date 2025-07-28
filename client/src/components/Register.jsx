import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Register = ({ onSwitchToLogin }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { register } = useAuth();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Kiểm tra mật khẩu
        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu không khớp');
            setIsLoading(false);
            return;
        }

        const result = await register(formData.username, formData.email, formData.password);

        if (!result.success) {
            // Nếu BE trả về mảng error:
            if (result.error && Array.isArray(result.error)) {
                setError(result.error.map(err => err.msg).join('. '));
            } else {
                setError(result.message);
            }
        }
        setIsLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Register for HyTeam</h2>
                
                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="username">NAME</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            placeholder='Enter your username'
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">EMAIL</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder='Enter your email'
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">PASSWORD</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder='Enter your password'
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">CONFIRM PASSWORD</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            placeholder='Confirm your password'
                        />
                    </div>
                    <button type="submit" className="auth-button" disabled={isLoading}>
                        {isLoading ? 'Registering...' : 'REGISTER'}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account?{' '}
                    <button 
                        type="button"
                        onClick={onSwitchToLogin}
                        className="link-button"
                    >
                        Login now
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Register;
