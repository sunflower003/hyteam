import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login = ({ onSwitchToRegister}) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''     
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const { login } = useAuth(); //goi ham login tu AuthContext

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError(''); // Reset error on input change
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(''); // Reset error on submit

        const result = await login(formData.email, formData.password);

        if (!result.success) {
            setError(result.message || 'Login failed');
        }

        setIsLoading(false); 
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Login to HyTeam</h2>
                
                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
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
                            placeholder='Enter your password'
                        />
                    </div>
                    <button type="submit" className="auth-button" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <p className="auth-switch">
                    Don't have an account?
                    <button 
                     type="button"
                     onClick={onSwitchToRegister}  //onSwitchToRegister là props lấy từ App.jsx
                     className="link-button"
                     >Register now</button>
                </p>
                
            </div>
        </div>
    );
};

export default Login;