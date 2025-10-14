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
    <aside className={`sidebar ${isOpen ? 'active' : ''}`}>
      <div className="sidebar-header">
        <h3>Admin Panel</h3>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link
              to="/admin/dashboard"
              className={isActive('/admin/dashboard') || isActive('/admin')}
              onClick={onClose}
            >
              <i className="fas fa-tachometer-alt"></i>
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link
              to="/admin/users"
              className={isActive('/admin/users')}
              onClick={onClose}
            >
              <i className="fas fa-users"></i>
              <span>Users</span>
            </Link>
          </li>
          <li>
            <Link
              to="/admin/settings"
              className={isActive('/admin/settings')}
              onClick={onClose}
            >
              <i className="fas fa-cog"></i>
              <span>Settings</span>
            </Link>
          </li>
          <li>
            <a href="/swagger" target="_blank">
              <i className="fas fa-code"></i>
              <span>API Docs</span>
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
