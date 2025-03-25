import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [documentsExpanded, setDocumentsExpanded] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const toggleDocumentsMenu = () => {
    setDocumentsExpanded(!documentsExpanded);
  };
  
  const toggleProfileMenu = () => {
    setProfileExpanded(!profileExpanded);
  };

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-toggle" onClick={toggleSidebar}>
        {collapsed ? '>' : '<'}
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink to="/dashboard" className={({isActive}) => isActive ? 'active' : ''}>
              <span className="icon">📊</span>
              {!collapsed && <span className="label">Dashboard</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/financial-overview" className={({isActive}) => isActive ? 'active' : ''}>
              <span className="icon">💰</span>
              {!collapsed && <span className="label">Financial Overview</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/invoices" className={({isActive}) => isActive ? 'active' : ''}>
              <span className="icon">📝</span>
              {!collapsed && <span className="label">Invoices</span>}
            </NavLink>
          </li>
          
          {/* Documents with submenu */}
          <li className={documentsExpanded ? 'has-submenu expanded' : 'has-submenu'}>
            <div className="menu-item" onClick={toggleDocumentsMenu}>
              <span className="icon">📄</span>
              {!collapsed && (
                <>
                  <span className="label">Documents</span>
                  <span className="submenu-arrow">{documentsExpanded ? '▼' : '▶'}</span>
                </>
              )}
            </div>
            
            {!collapsed && documentsExpanded && (
              <ul className="submenu">
                <li>
                  <NavLink to="/documents/kyc" className={({isActive}) => isActive ? 'active' : ''}>
                    <span className="icon">🆔</span>
                    <span className="label">KYC Documents</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/documents/financial" className={({isActive}) => isActive ? 'active' : ''}>
                    <span className="icon">💼</span>
                    <span className="label">Financial Documents</span>
                  </NavLink>
                </li>
              </ul>
            )}
          </li>
          
          <li>
            <NavLink to="/generate-forms" className={({isActive}) => isActive ? 'active' : ''}>
              <span className="icon">📋</span>
              {!collapsed && <span className="label">Generate Forms</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/services" className={({isActive}) => isActive ? 'active' : ''}>
              <span className="icon">🛠️</span>
              {!collapsed && <span className="label">Services</span>}
            </NavLink>
          </li>

          {/* User Profile with submenu */}
          <li className={profileExpanded ? 'has-submenu expanded profile-section' : 'has-submenu profile-section'}>
            <div className="menu-item" onClick={toggleProfileMenu}>
              <span className="icon">👤</span>
              {!collapsed && (
                <>
                  <span className="label">User Profile</span>
                  <span className="submenu-arrow">{profileExpanded ? '▼' : '▶'}</span>
                </>
              )}
            </div>
            
            {!collapsed && profileExpanded && (
              <ul className="submenu">
                <li>
                  <NavLink to="/profile" className={({isActive}) => isActive ? 'active' : ''}>
                    <span className="icon">👁️</span>
                    <span className="label">View Profile</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/profile/edit" className={({isActive}) => isActive ? 'active' : ''}>
                    <span className="icon">✏️</span>
                    <span className="label">Edit Profile</span>
                  </NavLink>
                </li>
              </ul>
            )}
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;