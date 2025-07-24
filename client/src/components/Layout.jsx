import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Hypo from './Hypo';
import styles from '../styles/components/Layout.module.css';

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
