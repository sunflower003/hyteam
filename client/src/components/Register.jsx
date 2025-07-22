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

        // Kiem tra mat khau 
        if (formData.password !== formData.confirmPassword) {
            setError('Mat khau khong khop');
            setIsLoading(false);
            return;
        }

        const result = await register(formData.name, formData.email, formData.password);

        if(!result.success) {
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
                        <label htmlFor="name">Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder='Enter your name'
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
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
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder='Enter your password (at least 6 characters)'
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
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
                        {isLoading ? 'Registering...' : 'Register'}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account?
                    <button 
                     type="button"
                     onClick={onSwitchToLogin}
                     className="link-button"
                     >Login now</button>
                </p>
            </div>
        </div>
    );
};

export default Register;