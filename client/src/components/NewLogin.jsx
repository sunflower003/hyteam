import styles from '../styles/components/NewLogin.module.css';

const NewLogin = () => {

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
                <form action="" className={styles.formLogin}>
                    <label htmlFor="email" className={styles.label}>Email</label>
                    <input type="email" id="email" className={styles.input} placeholder='Enter your email'/>
                    <label htmlFor="password" className={styles.label}>Password</label>
                    <input type="password" id="password" className={styles.input} placeholder='Enter your password'/>
                    <p className={styles.forgotPassword}>Forgot password?</p>
                    <button type="submit" className={styles.button}>Sign in</button>
                </form>
                <p className={styles.reset}>Can't sign in? <span>Reset password</span></p>
            </div>
           {/* Right Container */}
           <div className={styles.rightContainer}>
                <p className={styles.feedback}>
                    I’ve booked multiple gigs through this site, and every experience has been seamless. The transparency makes all the difference!
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
