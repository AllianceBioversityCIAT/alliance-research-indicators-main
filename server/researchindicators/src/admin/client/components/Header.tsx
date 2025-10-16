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
    <header className="admin-header">
      <div className="header-content">
        <div className="header-left">
          <button className="mobile-menu-button" onClick={onToggleSidebar}>
            <i className="fas fa-bars"></i>
          </button>
          <h1 className="page-title">{getPageTitle()}</h1>
        </div>
        <div className="header-right">
          <div className="user-menu">
            <div className="user-avatar">
              <i className="fas fa-user-circle"></i>
            </div>
            <div className="user-info">
              <span className="user-name">Administrator</span>
              <span className="user-role">Admin</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
