import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/components/NewLogin.module.css'; // Dùng chung CSS

const NewRegister = ({ onSwitchToLogin }) => {
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

        // Kiểm tra mật khẩu khớp
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        const result = await register(formData.username, formData.email, formData.password);

        if (!result.success) {
            if (result.error && Array.isArray(result.error)) {
                setError(result.error.map(err => err.msg).join('. '));
            } else {
                setError(result.message);
            }
        }
        setIsLoading(false);
    };

    return (
        <div className={styles.container}>
           <div className={styles.leftContainer}>
                <h1 className={styles.logo}>HYTEAM</h1>
                <div className={styles.text}>
                    <h2 className={styles.title}>Create your account</h2>
                    <p className={styles.description}>
                        Join our team and start collaborating today.
                    </p>
                </div>

                {error && (
                    <div className={styles.errorMessage}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.formLogin}>
                    <label htmlFor="username" className={styles.label}>Username</label>
                    <input 
                        type="text" 
                        id="username" 
                        name="username"
                        className={styles.input} 
                        placeholder='Enter your username'
                        value={formData.username}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />

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
                        placeholder='Enter your password (at least 6 characters)'
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />

                    <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
                    <input 
                        type="password" 
                        id="confirmPassword" 
                        name="confirmPassword"
                        className={styles.input} 
                        placeholder='Confirm your password'
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />
                    
                    <button 
                        type="submit" 
                        className={`${styles.button} ${isLoading ? styles.buttonLoading : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                {onSwitchToLogin && (
                    <p className={styles.switchAuth}>
                        Already have an account?{' '}
                        <button 
                            type="button"
                            onClick={onSwitchToLogin}
                            className={styles.linkButton}
                        >
                            Sign in
                        </button>
                    </p>
                )}
           </div>

           <div className={styles.rightContainer}>
                <p className={styles.feedback}>
                    The registration process was smooth and intuitive. I was up and running in no time!
                </p>
                <div className={styles.author}>
                    <p className={styles.name}>John D. / Developer</p>
                    <p className={styles.country}>San Francisco, USA</p>
                </div>
           </div>
        </div>
    );
};

export default NewRegister;