import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AvanaLogo } from '../components/ui';
import { LuUser, LuLayoutDashboard, LuLogOut } from 'react-icons/lu';
import '../styles/Layout.css';

// ── Header Navigation & Breadcrumbs ─────────────────────────────────────────
function HeaderNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const PATH_NAMES = {
    'helpdesk-admin': 'Admin Dashboard',
    'requests': 'Request Categories',
    'security': 'Security & Logs',
    'inventory': 'Inventory & Operations',
    'users': 'User Management',
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
    'purchases': 'Purchase Approvals',
    'utility-payments': 'Utility Payments',
    'tax-payments': 'Tax Payments',
    'courier': 'Courier & Dispatch',
    'cash-handling': 'Cash Handling',
    'travel': 'Travel Expenses',
    'bill-warranty': 'Bill & Warranty',
    'reminders': 'Reminders',
    'settings': 'Settings',
    'locations': 'Office Locations',
    'audit-logs': 'Audit Logs',
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
                  <span style={{ color: 'var(--brand-amber-dark, #8b6209)', fontWeight: 700 }}>{label}</span>
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
    <div className="layout layout--employee" style={{ background: 'var(--color-bg, #f5f5f7)', minHeight: '100vh' }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header role="banner" className="portal-header">
        <div className="portal-header__top">
          <div className="portal-header__brand">
            <AvanaLogo size="md" style={{ filter: 'none' }} />
            <div>
              <div className="portal-header__title">
                Avana <span style={{ color: 'var(--brand-amber, #b27f0d)' }}>Group</span>
              </div>
              <div className="portal-header__subtitle">
                Admin Request Portal
              </div>
            </div>
          </div>

          <div className="portal-header__actions">
            {employeeEmail && (
              <div className="portal-header__user-pill">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><LuUser size={13} /> {employeeEmail}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="portal-header__logout-btn"
                  aria-label="Log Out"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="portal-header__nav-row">
          <HeaderNavigation />
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
    <div className="layout layout--admin" style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-bg, #f5f5f7)', minHeight: '100vh' }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header role="banner" className="portal-header">
        <div className="portal-header__top">
          <div className="portal-header__brand">
            <AvanaLogo size="md" style={{ filter: 'none' }} />
            <div>
              <div className="portal-header__title">
                Avana <span style={{ color: 'var(--brand-amber, #b27f0d)' }}>Group</span>
              </div>
              <div className="portal-header__subtitle">
                Admin & Operations Hub
              </div>
            </div>
          </div>

          <div className="portal-header__actions">
            <Link
              to="/helpdesk-admin"
              className="portal-header__dash-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <LuLayoutDashboard size={14} />
              <span>Admin Dashboard</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="portal-header__logout-btn portal-header__logout-btn--admin"
              aria-label="Log Out of Admin Portal"
            >
              🚪 Log Out
            </button>
          </div>
        </div>

        <div className="portal-header__nav-row">
          <HeaderNavigation />
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
    <div className="layout layout--employee" style={{ background: 'var(--color-bg, #f5f5f7)', minHeight: '100vh' }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header role="banner" className="portal-header">
        <div className="portal-header__top">
          <div className="portal-header__brand">
            <AvanaLogo size="md" />
            <div>
              <div className="portal-header__title">
                Conference Room Bookings
              </div>
              <div className="portal-header__subtitle">
                Admin Portal — Manage reservations and reports
              </div>
            </div>
          </div>

          <div className="portal-header__actions">
            <NavLink
              to="/helpdesk-admin"
              className="portal-header__dash-btn"
            >
              📋 Help Desk Admin
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="portal-header__logout-btn portal-header__logout-btn--admin"
              aria-label="Log Out"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>
      <main className="layout__main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
