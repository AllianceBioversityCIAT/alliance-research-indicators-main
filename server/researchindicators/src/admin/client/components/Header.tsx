import React from 'react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('users')) return 'Users Management';
    if (path.includes('settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <button className="sidebar-toggle" onClick={onToggleSidebar}>
            <i className="fas fa-bars"></i>
          </button>
          <h1 className="page-title">{getPageTitle()}</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">Administrator</span>
            <div className="user-avatar">
              <i className="fas fa-user-circle"></i>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
