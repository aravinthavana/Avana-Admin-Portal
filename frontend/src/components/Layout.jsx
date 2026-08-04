import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AvanaLogo } from '../components/ui';
import '../styles/Layout.css';

// ── Admin Sidebar Nav Definitions ─────────────────────────────────────────
const SIDEBAR_SECTIONS = [
  {
    label: '📂 Request Categories',
    items: [
      { to: '/helpdesk-admin',               label: '📋 All Requests',        end: true,  color: '#c29100' },
      { to: '/helpdesk-admin/conference',    label: '📅 Conference Room',      color: '#c29100' },
      { to: '/helpdesk-admin/stationery',    label: '✏️ Stationery',           color: '#059669' },
      { to: '/helpdesk-admin/admin-support', label: '💼 Admin Support',        color: '#0284c7' },
      { to: '/helpdesk-admin/maintenance',   label: '🔧 Maintenance',          color: '#dc2626' },
      { to: '/helpdesk-admin/housekeeping',  label: '🧹 Housekeeping',         color: '#d97706' },
      { to: '/helpdesk-admin/office-asset',  label: '🖥️ Office Asset',         color: '#0891b2' },
      { to: '/helpdesk-admin/print-scan',    label: '🖨️ Printing & Scanning',  color: '#7c3aed' },
    ]
  },
  {
    label: '🔐 Security Logs',
    items: [
      { to: '/helpdesk-admin/logins',        label: '🔑 Employee Logins',      color: '#c29100' },
    ]
  },
  {
    label: '📦 Inventory Management',
    items: [
      { to: '/helpdesk-admin/stationery-stock',   label: '✏️ Stationery Stock',         color: '#059669' },
      { to: '/helpdesk-admin/stationery-audit',   label: '📊 Monthly Audit',             color: '#d97706' },
      { to: '/helpdesk-admin/housekeeping-stock', label: '🧹 Housekeeping Stock',         color: '#0d9488' },
      { to: '/helpdesk-admin/housekeeping-audit', label: '🧴 Housekeeping Audit',          color: '#0d9488' },
      { to: '/helpdesk-admin/asset-tracker',      label: '📦 Stationery Tracker',         color: '#059669' },
      { to: '/helpdesk-admin/other-stock',        label: '📦 Other Stock',                color: '#2563eb' },
      { to: '/helpdesk-admin/amc',                label: '📋 AMC Contracts',              color: '#3b82f6' },
      { to: '/helpdesk-admin/utility-payments',   label: '⚡ Utility Payments',            color: '#0891b2' },
      { to: '/helpdesk-admin/tax-payments',       label: '🏛️ Tax Payments',               color: '#8b5cf6' },
      { to: '/helpdesk-admin/courier',            label: '📦 Courier & Dispatch',          color: '#f97316' },
      { to: '/helpdesk-admin/cash-handling',      label: '💵 Cash Handling',              color: '#ea580c' },
      { to: '/helpdesk-admin/travel',             label: '🚗 Travel Expenses',             color: '#0284c7' },
      { to: '/helpdesk-admin/bill-warranty',      label: '📄 Bill & Warranty',             color: '#8b5cf6' },
      { to: '/helpdesk-admin/reminders',          label: '🔔 Reminder List',               color: '#6366f1' },
      { to: '/helpdesk-admin/settings',           label: '⚙️ Portal Settings',             color: '#64748b' },
    ]
  },
];

// ── Employee Layout ────────────────────────────────────────────────────────
export function EmployeeLayout() {
  const { employeeEmail, logoutEmployee } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = () => {
    logoutEmployee();
    toast.info('You have been signed out.');
    navigate('/');
  };

  return (
    <div className="layout layout--employee" style={{ background: 'linear-gradient(135deg, #fdfcfb 0%, #f5f0e8 100%)', minHeight: '100vh' }}>
      {/* Header matching login page aesthetic */}
      <header
        role="banner"
        style={{
          background: 'linear-gradient(135deg, #fdfcfb 0%, #f5f0e8 100%)',
          borderBottom: '3px solid #c29100',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          padding: '1.2rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Left: Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <AvanaLogo size="md" style={{ filter: 'none' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.35rem', color: '#0f172a', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              Admin Help Desk
            </div>
            <div style={{ fontSize: '0.85rem', color: '#b45309', marginTop: 3, fontWeight: 600 }}>
              Select a category below to submit your request
            </div>
          </div>
        </div>

        {/* Right: Nav links + User badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

          {employeeEmail && (
            <div style={{
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              padding: '0.45rem 0.9rem',
              borderRadius: 12,
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <span>👤 {employeeEmail}</span>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  padding: '0.2rem 0.55rem',
                  borderRadius: 6,
                  fontFamily: 'inherit',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="layout__main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

// ── Admin Layout (Help Desk Admin) ─────────────────────────────────────────
export function AdminLayout() {
  const { logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [expandedSection, setExpandedSection] = React.useState(0);

  const handleLogout = async () => {
    await logoutAdmin();
    toast.info('Admin session ended.');
    navigate('/');
  };

  const currentSidebarWidth = sidebarCollapsed ? '70px' : '260px';

  return (
    <div className="layout layout--admin" style={{ '--current-sidebar-width': currentSidebarWidth }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — Solid Black with White Text */}
      <aside 
        className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`} 
        aria-label="Admin navigation" 
        style={{ 
          background: '#000000', 
          color: '#ffffff'
        }}
      >
        {/* Sidebar Header */}
        <div className="sidebar__header" style={{
          background: '#000000',
          borderBottom: '2px solid #c29100',
          padding: sidebarCollapsed && !sidebarOpen ? '1.2rem 0' : '1.2rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed && !sidebarOpen ? 'center' : 'space-between',
        }}>
          {(!sidebarCollapsed || sidebarOpen) ? (
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#ffffff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Admin <span style={{ color: '#c29100' }}>Portal</span>
            </div>
          ) : (
            <div style={{ fontWeight: 800, color: '#c29100', fontSize: '1.2rem' }}>A</div>
          )}
          <button
            type="button"
            className="sidebar__close btn btn--ghost btn--sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            style={{ color: '#ffffff', fontSize: '1.2rem', display: sidebarOpen ? 'block' : 'none' }}
          >
            ✕
          </button>
        </div>

        {/* Nav Sections */}
        <nav className="sidebar__nav" aria-label="Admin sections" style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '0.75rem 0', background: '#000000' }}>
          {SIDEBAR_SECTIONS.map((section, si) => {
            const isExpanded = expandedSection === si;
            const sectionIcon = section.label.split(' ')[0];
            const sectionText = section.label.substring(section.label.indexOf(' ') + 1);

            return (
              <div key={si} style={{ marginBottom: '0.5rem' }}>
                {/* Section Header */}
                <div 
                  onClick={() => {
                    setExpandedSection(isExpanded ? null : si);
                    if (sidebarCollapsed && !sidebarOpen) setSidebarCollapsed(false);
                  }}
                  style={{
                    fontWeight: 700,
                    fontSize: (sidebarCollapsed && !sidebarOpen) ? '1.2rem' : '0.8rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    padding: (sidebarCollapsed && !sidebarOpen) ? '0.8rem 0' : '0.8rem 1.2rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: (sidebarCollapsed && !sidebarOpen) ? 'center' : 'space-between',
                    background: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent',
                    transition: 'background 0.2s',
                  }}
                  title={sectionText}
                >
                  {(sidebarCollapsed && !sidebarOpen) ? (
                    <span>{sectionIcon}</span>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span>{sectionIcon}</span>
                        <span>{sectionText}</span>
                      </div>
                      <span style={{ 
                        fontSize: '0.6rem', 
                        transition: 'transform 0.3s', 
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        color: 'rgba(255,255,255,0.5)'
                      }}>▼</span>
                    </>
                  )}
                </div>

                {/* Nav Items — Pure White Text */}
                {(!sidebarCollapsed || sidebarOpen) && (
                  <div style={{
                    maxHeight: isExpanded ? '1000px' : '0px',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease-in-out',
                  }}>
                    <div style={{ padding: '0.25rem 0' }}>
                      {section.items.map((item) => {
                        const itemIcon = item.label.split(' ')[0];
                        const itemText = item.label.substring(item.label.indexOf(' ') + 1);

                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end || false}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
                            }
                            style={({ isActive }) => ({
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.6rem 1rem',
                              margin: '0.1rem 0.6rem',
                              borderRadius: 8,
                              fontFamily: 'inherit',
                              fontSize: '0.86rem',
                              fontWeight: isActive ? 700 : 500,
                              textDecoration: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              background: isActive ? (item.color || '#c29100') : 'rgba(255, 255, 255, 0.05)',
                              color: '#ffffff',
                              border: `1px solid ${isActive ? (item.color || '#c29100') : 'rgba(255, 255, 255, 0.15)'}`,
                              boxShadow: isActive ? `0 2px 8px ${item.color || '#c29100'}55` : 'none',
                            })}
                          >
                            <span>{itemIcon}</span>
                            <span>{itemText}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Section Divider */}
                {si < SIDEBAR_SECTIONS.length - 1 && (!sidebarCollapsed || sidebarOpen) && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', margin: '0.5rem 0.6rem' }} />
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar__footer" style={{
          borderTop: '1px solid rgba(255,255,255,0.15)',
          padding: (sidebarCollapsed && !sidebarOpen) ? '0.85rem 0' : '0.85rem 1rem',
          background: '#000000',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          {/* Toggle Collapse Button */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              padding: '0.4rem',
              display: sidebarOpen ? 'none' : 'block'
            }}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? '❯❯' : '❮❮ Collapse'}
          </button>

          <button
            type="button"
            style={{
              background: 'rgba(239,68,68,0.2)',
              border: '1px solid rgba(239,68,68,0.5)',
              color: '#fca5a5',
              padding: (sidebarCollapsed && !sidebarOpen) ? '0.6rem 0' : '0.6rem 1rem',
              borderRadius: 8,
              fontFamily: 'inherit',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              width: (sidebarCollapsed && !sidebarOpen) ? '80%' : '100%',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
            onClick={handleLogout}
            title="Log Out"
          >
            {(sidebarCollapsed && !sidebarOpen) ? '🚪' : '🚪 Log Out'}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div 
        className="layout__content" 
        style={{ 
          background: 'linear-gradient(135deg, #fdfcfb 0%, #f5f0e8 100%)', 
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Top header bar — matching login page aesthetic */}
        <header
          role="banner"
          style={{
            background: 'linear-gradient(135deg, #fdfcfb 0%, #f5f0e8 100%)',
            borderBottom: '3px solid #c29100',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.85rem 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            style={{
              display: 'none',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              borderRadius: 6,
              padding: '0.3rem 0.5rem',
              cursor: 'pointer',
              fontSize: '1.1rem',
              lineHeight: 1,
            }}
            className="admin-hamburger"
          >
            ☰
          </button>

          {/* Logo (mobile) + Header Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <AvanaLogo size="sm" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a', lineHeight: 1.2 }}>
                Help Desk — Admin View
              </div>
              <div style={{ fontSize: '0.78rem', color: '#b45309', marginTop: 1, fontWeight: 600 }}>
                Track work completion status, manage requests, and export reports
              </div>
            </div>
          </div>

          {/* Right side controls */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#dc2626',
                padding: '0.4rem 0.85rem',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              Log Out
            </button>
          </div>
        </header>

        <main className="layout__main" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ── Conference Room Admin Layout ───────────────────────────────────────────
export function ConferenceAdminLayout() {
  const { logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    await logoutAdmin();
    toast.info('Admin session ended.');
    navigate('/');
  };

  return (
    <div className="layout layout--employee" style={{ background: 'linear-gradient(135deg, #fdfcfb 0%, #f5f0e8 100%)', minHeight: '100vh' }}>
      {/* Header matching login page aesthetic */}
      <header
        role="banner"
        style={{
          background: 'linear-gradient(135deg, #fdfcfb 0%, #f5f0e8 100%)',
          borderBottom: '3px solid #c29100',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Left: Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <AvanaLogo size="md" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a', lineHeight: 1.2 }}>
              Conference Room Bookings
            </div>
            <div style={{ fontSize: '0.82rem', color: '#b45309', marginTop: 2, fontWeight: 600 }}>
              Admin Portal — Manage reservations and reports
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NavLink
            to="/helpdesk-admin"
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              padding: '0.45rem 1rem',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            📋 Help Desk Admin
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#dc2626',
              padding: '0.45rem 1rem',
              borderRadius: 8,
              fontFamily: 'inherit',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            Log Out
          </button>
        </div>
      </header>
      <main className="layout__main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
