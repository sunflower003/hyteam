import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/components/NewLogin.module.css';

const NewLogin = ({ onSwitchToRegister }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();

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
        setError('');

        const result = await login(formData.email, formData.password);

        if (!result.success) {
            setError(result.message || 'Login failed');
        }

        setIsLoading(false);
    };

    return (
        <div className={styles.container}>
           {/* Left Container */}
           <div className={styles.leftContainer}>
                <h1 className={styles.logo}>HYTEAM</h1>
                <div className={styles.text}>
                    <h2 className={styles.title}>Sign into your account</h2>
                    <p className={styles.description}>
                        Access your team's projects and collaborate now.
                    </p>
                </div>

                {/* Hiển thị lỗi nếu có */}
                {error && (
                    <div className={styles.errorMessage}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.formLogin}>
                    <label htmlFor="email" className={styles.label}>Email</label>
                    <input 
                        type="email" 
                        id="email" 
                        name="email"
                        className={styles.input} 
                        placeholder='Enter your email'
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />
                    
                    <label htmlFor="password" className={styles.label}>Password</label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password"
                        className={styles.input} 
                        placeholder='Enter your password'
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />
                    
                    <p className={styles.forgotPassword}>Forgot password?</p>
                    
                    <button 
                        type="submit" 
                        className={`${styles.button} ${isLoading ? styles.buttonLoading : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                {/* Chuyển đổi sang Register */}
                {onSwitchToRegister && (
                    <p className={styles.switchAuth}>
                        Don't have an account?{' '}
                        <span 
                            
                            onClick={onSwitchToRegister}
                            className={styles.linkButton}
                        >
                            Register now
                        </span>
                    </p>
                )}
           </div>

           {/* Right Container */}
           <div className={styles.rightContainer}>
                <p className={styles.feedback}>
                    I've booked multiple gigs through this site, and every experience has been seamless. The transparency makes all the difference!
                </p>
                <div className={styles.author}>
                    <p className={styles.name}>Rachel S. / Designer</p>
                    <p className={styles.country}>Hamburg, Germany</p>
                </div>
           </div>
        </div>
    );
};

export default NewLogin;
