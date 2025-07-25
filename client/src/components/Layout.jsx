import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Hypo from '../ai/components/Hypo';

import layoutStyles from '../styles/components/Layout.module.css'; 

const Layout = () => {
  return (
    <div className={layoutStyles.layout}>
      <Sidebar />
      <Hypo />
      <div className={layoutStyles.content}>
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
