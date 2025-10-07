import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Hypo from '../ai/components/Hypo';
import Doge from './Doge';

import layoutStyles from '../styles/components/Layout.module.css'; 

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.replace(/\/$/, '')
  const isChatThreadRoute = /^\/chat\/.+/.test(path); // /chat/:id
  const isChatListOnly = path === '/chat'
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Add a body class or layout modifier when chat route to allow wider chat area (sidebar collapses automatically there)
  const layoutClassNames = `${layoutStyles.layout} ${isChatThreadRoute || isChatListOnly ? layoutStyles.chatLayout : ''}`;
  // Expose SPA navigate globally (lightweight, guarded)
  if (typeof window !== 'undefined' && !window.__spaNavigate) {
    window.__spaNavigate = (path) => {
      try {
        if (typeof path === 'string') navigate(path);
      } catch (e) {
        console.warn('spaNavigate failed, fallback full reload', e);
        window.location.href = path;
      }
    };
  }

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
