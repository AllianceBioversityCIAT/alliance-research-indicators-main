import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="wrapper">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header onToggleSidebar={toggleSidebar} />
        <div className="content-wrapper">
          {children}
        </div>
        <footer className="footer">
          <div className="footer-content">
            <p>&copy; {new Date().getFullYear()} Research Indicators Admin Panel. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
