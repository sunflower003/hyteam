import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Hypo from '../ai/components/Hypo';
import Doge from './Doge';

import layoutStyles from '../styles/components/Layout.module.css'; 

const Layout = () => {
  const location = useLocation();
  const path = location.pathname.replace(/\/$/, '')
  const isChatThreadRoute = /^\/chat\/.+/.test(path); // /chat/:id
  const isChatListOnly = path === '/chat'
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Add a body class or layout modifier when chat route to allow wider chat area (sidebar collapses automatically there)
  const layoutClassNames = `${layoutStyles.layout} ${isChatThreadRoute || isChatListOnly ? layoutStyles.chatLayout : ''}`;
  return (
    <div className={layoutClassNames}>
      <Sidebar />
      {/* Ẩn Hypo trên trang chat (ưu tiên không chiếm diện tích ở mobile) */}
  {!(isChatThreadRoute && isMobile) && <Hypo />}
      <Doge />
      <div className={layoutStyles.content} style={isChatThreadRoute ? { paddingBottom: isMobile ? '0' : undefined, marginBottom: isMobile ? 0 : undefined } : undefined}>
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
