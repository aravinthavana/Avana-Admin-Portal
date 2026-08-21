import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AvanaLogo } from '../components/ui';
import '../styles/Layout.css';

// ── Admin Sidebar Nav Definitions ─────────────────────────────────────────
const SIDEBAR_SECTIONS = [
  {
    label: '📂 Request Categories',
    items: [
      { to: '/helpdesk-admin',               label: '📋 All Requests',        end: true,  color: '#b27f0d' },
      { to: '/helpdesk-admin/conference',    label: '📅 Conference Room',      color: '#b27f0d' },
      { to: '/helpdesk-admin/stationery',    label: '✏️ Stationery',           color: '#16a34a' },
      { to: '/helpdesk-admin/admin-support', label: '💼 Admin Support',        color: '#2563eb' },
      { to: '/helpdesk-admin/maintenance',   label: '🔧 Maintenance',          color: '#dc2626' },
      { to: '/helpdesk-admin/housekeeping',  label: '🧹 Housekeeping',         color: '#d97706' },
      { to: '/helpdesk-admin/office-asset',  label: '🖥️ Office Asset',         color: '#2563eb' },
      { to: '/helpdesk-admin/print-scan',    label: '🖨️ Printing & Scanning',  color: '#7c3aed' },
      { to: '/helpdesk-admin/app-feedback',  label: '💡 App Feedback',         color: '#2563eb' },
    ]
  },
  {
    label: '🔐 Security Logs',
    items: [
      { to: '/helpdesk-admin/logins',        label: '🔑 Employee Logins',      color: '#b27f0d' },
    ]
  },
  {
    label: '📦 Inventory Management',
    items: [
      { to: '/helpdesk-admin/stationery-stock',   label: '✏️ Stationery Stock',         color: '#16a34a' },
      { to: '/helpdesk-admin/stationery-audit',   label: '📊 Monthly Audit',             color: '#d97706' },
      { to: '/helpdesk-admin/housekeeping-stock', label: '🧹 Housekeeping Stock',         color: '#404131' },
      { to: '/helpdesk-admin/housekeeping-audit', label: '🧴 Housekeeping Audit',          color: '#404131' },
      { to: '/helpdesk-admin/asset-tracker',      label: '📦 Stationery Tracker',         color: '#16a34a' },
      { to: '/helpdesk-admin/other-stock',        label: '📦 Other Stock',                color: '#2563eb' },
      { to: '/helpdesk-admin/amc',                label: '📋 AMC Contracts',              color: '#2563eb' },
      { to: '/helpdesk-admin/utility-payments',   label: '⚡ Utility Payments',            color: '#2563eb' },
      { to: '/helpdesk-admin/tax-payments',       label: '🏛️ Tax Payments',               color: '#7c3aed' },
      { to: '/helpdesk-admin/courier',            label: '📦 Courier & Dispatch',          color: '#d97706' },
      { to: '/helpdesk-admin/cash-handling',      label: '💵 Cash Handling',              color: '#d97706' },
      { to: '/helpdesk-admin/travel',             label: '🚗 Travel Expenses',             color: '#2563eb' },
      { to: '/helpdesk-admin/bill-warranty',      label: '📄 Bill & Warranty',             color: '#7c3aed' },
      { to: '/helpdesk-admin/reminders',          label: '🔔 Reminder List',               color: '#7c3aed' },
      { to: '/helpdesk-admin/settings',           label: '⚙️ Portal Settings',             color: '#6b7280' },
    ]
  },
];

// ── Header Navigation & Breadcrumbs ─────────────────────────────────────────
function HeaderNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const PATH_NAMES = {
    'helpdesk-admin': 'Admin Dashboard',
    'requests': 'Request Categories',
    'security': 'Security & Logs',
    'inventory': 'Inventory & Operations',
    'all-tickets': 'All Requests',
    'conference': 'Conference Room',
    'stationery': 'Stationery',
    'admin-support': 'Admin Support',
    'maintenance': 'Maintenance',
    'housekeeping': 'Housekeeping',
    'office-asset': 'Office Asset',
    'print-scan': 'Printing & Scanning',
    'logins': 'Security Logs',
    'stationery-stock': 'Stationery Stock',
    'stationery-audit': 'Stationery Audit',
    'housekeeping-stock': 'Housekeeping Stock',
    'housekeeping-audit': 'Housekeeping Audit',
    'asset-tracker': 'Stationery Tracker',
    'other-stock': 'Other Stock',
    'amc': 'AMC Contracts',
    'utility-payments': 'Utility Payments',
    'tax-payments': 'Tax Payments',
    'courier': 'Courier & Dispatch',
    'cash-handling': 'Cash Handling',
    'travel': 'Travel Expenses',
    'bill-warranty': 'Bill & Warranty',
    'reminders': 'Reminders',
    'settings': 'Settings',
    'booking': 'Room Booking',
    'helpdesk': 'Helpdesk'
  };

  const pathSnippets = location.pathname.split('/').filter(i => i);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      {/* Back (❮) & Forward (❯) Buttons */}
      <div style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          title="Go Back"
          aria-label="Back"
          style={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '0.85rem',
            color: '#172025',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#b27f0d'; e.currentTarget.style.background = '#fdf5e6'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#e4e4e7'; e.currentTarget.style.background = '#ffffff'; }}
        >
          ❮
        </button>
        <button
          type="button"
          onClick={() => navigate(1)}
          title="Go Forward"
          aria-label="Forward"
          style={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '0.85rem',
            color: '#172025',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#b27f0d'; e.currentTarget.style.background = '#fdf5e6'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#e4e4e7'; e.currentTarget.style.background = '#ffffff'; }}
        >
          ❯
        </button>
      </div>

      {/* Breadcrumb Trail */}
      <nav aria-label="Breadcrumb" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.82rem', fontWeight: 600 }}>
        <ol style={{ listStyle: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', margin: 0, padding: 0 }}>
          <li style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Link to={location.pathname.startsWith('/helpdesk-admin') ? '/helpdesk-admin' : '/'} style={{ color: '#6b7280', textDecoration: 'none' }}>
              🏠 Home
            </Link>
          </li>
          {pathSnippets.map((snippet, index) => {
            const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
            const isLast = index === pathSnippets.length - 1;
            const label = PATH_NAMES[snippet] || (snippet.charAt(0).toUpperCase() + snippet.slice(1));

            return (
              <li key={url} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ color: '#aab2b2', fontSize: '0.7rem' }}>/</span>
                {isLast ? (
                  <span style={{ color: '#d97706', fontWeight: 700 }}>{label}</span>
                ) : (
                  <Link to={url} style={{ color: '#6b7280', textDecoration: 'none' }}>{label}</Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

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
    <div className="layout layout--employee" style={{ background: '#d7d0bc', minHeight: '100vh' }}>
      {/* Header matching login page aesthetic */}
      <header
        role="banner"
        style={{
          background: '#d7d0bc',
          borderBottom: '3px solid #b27f0d',
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
        {/* Left: Logo + Title + Navigation & Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
          <AvanaLogo size="md" style={{ filter: 'none' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.35rem', color: '#172025', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              Admin Help Desk
            </div>
            <div style={{ fontSize: '0.85rem', color: '#d97706', marginTop: 3, fontWeight: 600 }}>
              Select a category below to submit your request
            </div>
          </div>
          <HeaderNavigation />
        </div>

        {/* Right: Nav links + User badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

          {employeeEmail && (
            <div style={{
              background: '#ffffff',
              color: '#172025',
              border: '1px solid #e4e4e7',
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
                  border: '1px solid #fecaca',
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

  const handleLogout = async () => {
    await logoutAdmin();
    toast.info('Admin session ended.');
    navigate('/');
  };

  return (
    <div className="layout layout--admin" style={{ display: 'flex', flexDirection: 'column', background: '#d7d0bc', minHeight: '100vh' }}>
      {/* Top header bar — matching employee layout aesthetic */}
      <header
        role="banner"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fcfbfa 100%)',
          borderBottom: '3px solid #b27f0d',
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
        {/* Left: Logo + Title + Navigation & Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
          <AvanaLogo size="md" style={{ filter: 'none' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#172025', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              Admin <span style={{ color: '#b27f0d' }}>Portal</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#d97706', marginTop: 2, fontWeight: 600 }}>
              System Administration, Requests & Inventory Operations
            </div>
          </div>
          <HeaderNavigation />
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            to="/helpdesk-admin"
            style={{
              background: '#fdf5e6',
              border: '1px solid #d7d0bc',
              color: '#d97706',
              padding: '0.45rem 0.9rem',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            🏠 Admin Dashboard
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '0.45rem 0.9rem',
              borderRadius: 8,
              fontFamily: 'inherit',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            🚪 Log Out
          </button>
        </div>
      </header>

      <main className="layout__main" id="main-content" tabIndex={-1} style={{ padding: 0 }}>
        <Outlet />
      </main>
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
    <div className="layout layout--employee" style={{ background: '#d7d0bc', minHeight: '100vh' }}>
      {/* Header matching login page aesthetic */}
      <header
        role="banner"
        style={{
          background: '#d7d0bc',
          borderBottom: '3px solid #b27f0d',
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
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#172025', lineHeight: 1.2 }}>
              Conference Room Bookings
            </div>
            <div style={{ fontSize: '0.82rem', color: '#d97706', marginTop: 2, fontWeight: 600 }}>
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
              border: '1px solid #e4e4e7',
              color: '#172025',
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
              border: '1px solid #e4e4e7',
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
