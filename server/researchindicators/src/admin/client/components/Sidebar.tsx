import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="admin-sidebar desktop">
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h2 className="sidebar-logo">Admin Panel</h2>
            <p className="sidebar-subtitle">Research Indicators</p>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-section">
              <h3 className="nav-section-title">Main</h3>
              <Link
                to="/admin/dashboard"
                className={`nav-item ${isActive('/admin/dashboard') || isActive('/admin')}`}
              >
                <i className="fas fa-tachometer-alt nav-item-icon"></i>
                <span>Dashboard</span>
              </Link>
              <Link
                to="/admin/users"
                className={`nav-item ${isActive('/admin/users')}`}
              >
                <i className="fas fa-users nav-item-icon"></i>
                <span>Users</span>
              </Link>
              <Link
                to="/admin/settings"
                className={`nav-item ${isActive('/admin/settings')}`}
              >
                <i className="fas fa-cog nav-item-icon"></i>
                <span>Settings</span>
              </Link>
              <a href="/swagger" target="_blank" className="nav-item">
                <i className="fas fa-code nav-item-icon"></i>
                <span>API Docs</span>
              </a>
            </div>
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`admin-sidebar mobile ${isOpen ? 'active' : ''}`}>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h2 className="sidebar-logo">Admin Panel</h2>
            <p className="sidebar-subtitle">Research Indicators</p>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-section">
              <h3 className="nav-section-title">Main</h3>
              <Link
                to="/admin/dashboard"
                className={`nav-item ${isActive('/admin/dashboard') || isActive('/admin')}`}
                onClick={onClose}
              >
                <i className="fas fa-tachometer-alt nav-item-icon"></i>
                <span>Dashboard</span>
              </Link>
              <Link
                to="/admin/users"
                className={`nav-item ${isActive('/admin/users')}`}
                onClick={onClose}
              >
                <i className="fas fa-users nav-item-icon"></i>
                <span>Users</span>
              </Link>
              <Link
                to="/admin/settings"
                className={`nav-item ${isActive('/admin/settings')}`}
                onClick={onClose}
              >
                <i className="fas fa-cog nav-item-icon"></i>
                <span>Settings</span>
              </Link>
              <a href="/swagger" target="_blank" className="nav-item" onClick={onClose}>
                <i className="fas fa-code nav-item-icon"></i>
                <span>API Docs</span>
              </a>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
