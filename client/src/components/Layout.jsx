import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Hypo from '../ai/components/Hypo';
import styles from '../ai/styles/Hypo.module.css';

const Layout = () => {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <Hypo />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
