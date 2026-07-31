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
    <div className="layout layout--employee">
      {/* Legacy-matching gradient header */}
      <header
        role="banner"
        style={{
          background: 'linear-gradient(to right, #fde68a 0%, #1e293b 45%, #0f172a 100%)',
          borderBottom: '3px solid #c29100',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          padding: '1.4rem 2rem',
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
            <div style={{ fontWeight: 800, fontSize: '1.35rem', color: 'white', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              Admin Help Desk
            </div>
            <div style={{ fontSize: '0.85rem', color: '#fde68a', marginTop: 3, fontWeight: 500 }}>
              Select a category below to submit your request
            </div>
          </div>
        </div>

        {/* Right: Nav links + User badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <NavLink
            to="/booking"
            style={({ isActive }) => ({
              background: isActive ? 'rgba(194,145,0,0.3)' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${isActive ? '#c29100' : 'rgba(255,255,255,0.2)'}`,
              color: 'white',
              padding: '0.4rem 0.9rem',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            })}
          >
            📅 Book Room
          </NavLink>

          {employeeEmail && (
            <div style={{
              background: 'rgba(255,255,255,0.12)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '0.45rem 0.9rem',
              borderRadius: 12,
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              backdropFilter: 'blur(8px)',
            }}>
              <span>👤 {employeeEmail}</span>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: 'rgba(239,68,68,0.25)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239,68,68,0.4)',
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

  const [darkMode, setDarkMode] = React.useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  React.useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = async () => {
    await logoutAdmin();
    toast.info('Admin session ended.');
    navigate('/');
  };

  return (
    <div className="layout layout--admin">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — matches legacy layout exactly */}
      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`} aria-label="Admin navigation">

        {/* Sidebar Header — Logo + App Name */}
        <div className="sidebar__header" style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderBottom: '2px solid #c29100',
          padding: '1.1rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <AvanaLogo size="sm" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white', lineHeight: 1.2 }}>
              Help Desk — Admin
            </div>
            <div style={{ fontSize: '0.72rem', color: '#fde68a', marginTop: 2 }}>
              Avana Admin Portal
            </div>
          </div>
          <button
            type="button"
            className="sidebar__close btn btn--ghost btn--sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.6)' }}
          >
            ✕
          </button>
        </div>

        {/* Nav Sections */}
        <nav className="sidebar__nav" aria-label="Admin sections" style={{ overflowY: 'auto', flex: 1, padding: '0.75rem 0' }}>
          {SIDEBAR_SECTIONS.map((section, si) => (
            <div key={si} style={{ marginBottom: '0.5rem' }}>
              {/* Section Header */}
              <div style={{
                fontWeight: 700,
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.45)',
                letterSpacing: '0.06em',
                padding: '0.55rem 1rem 0.3rem',
              }}>
                {section.label}
              </div>

              {/* Nav Items */}
              {section.items.map((item) => (
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
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.55rem 1rem',
                    margin: '0 0.5rem 0.1rem',
                    borderRadius: 8,
                    fontFamily: 'inherit',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: isActive ? item.color : 'transparent',
                    color: isActive ? 'white' : item.color,
                    border: `1.5px solid ${isActive ? item.color : item.color + '55'}`,
                    boxShadow: isActive ? `0 3px 10px ${item.color}44` : 'none',
                  })}
                >
                  <span>{item.label}</span>
                </NavLink>
              ))}

              {/* Section Divider */}
              {si < SIDEBAR_SECTIONS.length - 1 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.6rem 0.5rem' }} />
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar__footer" style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '0.75rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}>
          <button
            type="button"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.8)',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              fontFamily: 'inherit',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button
            type="button"
            style={{
              background: 'rgba(194,145,0,0.15)',
              border: '1px solid rgba(194,145,0,0.4)',
              color: '#fde68a',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              fontFamily: 'inherit',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
            onClick={handleLogout}
          >
            🚪 Log Out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="layout__content">
        {/* Top header bar — matches legacy gradient header */}
        <header
          role="banner"
          style={{
            background: 'linear-gradient(to right, #fde68a 0%, #1e293b 45%, #0f172a 100%)',
            borderBottom: '3px solid #c29100',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
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
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
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

          {/* Logo (mobile) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <AvanaLogo size="sm" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'white', lineHeight: 1.2 }}>
                Help Desk — Admin View
              </div>
              <div style={{ fontSize: '0.78rem', color: '#fde68a', marginTop: 1 }}>
                Track work completion status, manage requests, and export reports
              </div>
            </div>
          </div>

          {/* Right side controls */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <NavLink
              to="/admin"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '0.4rem 0.85rem',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              📅 Bookings
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '0.4rem 0.85rem',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
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
    <div className="layout layout--employee">
      {/* Legacy-matching gradient header */}
      <header
        role="banner"
        style={{
          background: 'linear-gradient(to right, #fde68a 0%, #1e293b 45%, #0f172a 100%)',
          borderBottom: '3px solid #c29100',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
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
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'white', lineHeight: 1.2 }}>
              Conference Room Bookings
            </div>
            <div style={{ fontSize: '0.82rem', color: '#fde68a', marginTop: 2, fontWeight: 500 }}>
              Admin Portal — Manage reservations and reports
            </div>
          </div>
        </div>

        {/* Right: Nav + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <NavLink
            to="/admin"
            style={({ isActive }) => ({
              background: isActive ? 'rgba(194,145,0,0.3)' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${isActive ? '#c29100' : 'rgba(255,255,255,0.2)'}`,
              color: 'white',
              padding: '0.4rem 0.85rem',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            })}
          >
            📅 Bookings
          </NavLink>
          <NavLink
            to="/helpdesk-admin"
            style={({ isActive }) => ({
              background: isActive ? 'rgba(194,145,0,0.3)' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${isActive ? '#c29100' : 'rgba(255,255,255,0.2)'}`,
              color: 'white',
              padding: '0.4rem 0.85rem',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            })}
          >
            📋 Help Desk
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              padding: '0.4rem 0.85rem',
              borderRadius: 8,
              fontFamily: 'inherit',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="layout__main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
