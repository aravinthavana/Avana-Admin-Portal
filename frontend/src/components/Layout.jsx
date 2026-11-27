import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AvanaLogo } from '../components/ui';
import {
  LuUser, LuLayoutDashboard, LuLogOut, LuChevronLeft, LuChevronRight, LuHouse,
  LuMenu, LuX, LuClock, LuCalendar, LuPenTool, LuSparkles, LuBriefcase,
  LuWrench, LuSprayCan, LuMonitor, LuPrinter, LuTruck, LuMessageSquare
} from 'react-icons/lu';
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
    'helpdesk': 'Helpdesk',
    'my-requests': 'My Requests & Activity'
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
          <LuChevronLeft size={16} />
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
          <LuChevronRight size={16} />
        </button>
      </div>

      {/* Breadcrumb Trail */}
      <nav aria-label="Breadcrumb" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.82rem', fontWeight: 600 }}>
        <ol style={{ listStyle: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', margin: 0, padding: 0 }}>
          <li style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Link to={location.pathname.startsWith('/helpdesk-admin') ? '/helpdesk-admin' : '/'} style={{ color: '#6b7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <LuHouse size={13} />
              <span>Home</span>
            </Link>
          </li>
          {pathSnippets.map((snippet, index) => {
            const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
            const isLast = index === pathSnippets.length - 1;
            const label = PATH_NAMES[snippet] || (snippet.charAt(0).toUpperCase() + snippet.slice(1));

            return (
              <li key={url} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <LuChevronRight size={11} style={{ color: '#aab2b2', flexShrink: 0 }} />
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

const RESTRICTED_EMAIL = 'bhuvaneshravi@avanamedical.com';

// ── Employee Layout ────────────────────────────────────────────────────────
export function EmployeeLayout() {
  const { employeeEmail, logoutEmployee } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  const handleLogout = () => {
    logoutEmployee();
    toast.info('You have been signed out.');
    navigate('/');
  };

  const mainLinks = [
    { to: '/helpdesk', label: 'Service Desks', icon: <LuHouse size={17} />, end: true },
    { to: '/helpdesk/my-requests', label: 'My Requests & Activity', icon: <LuClock size={17} /> },
    { to: '/booking', label: 'Conference Room', icon: <LuCalendar size={17} /> },
  ];

  const deskLinks = [
    { to: '/helpdesk/stationery', label: 'Stationery', icon: <LuPenTool size={16} /> },
    { to: '/helpdesk/courier_dispatch', label: 'Courier & Dispatch', icon: <LuTruck size={16} /> },
    ...(employeeEmail === RESTRICTED_EMAIL
      ? [{ to: '/helpdesk/hk_material', label: 'HK Material', icon: <LuSparkles size={16} /> }]
      : []),
    { to: '/helpdesk/admin_support', label: 'Admin Support', icon: <LuBriefcase size={16} /> },
    { to: '/helpdesk/maintenance', label: 'Maintenance', icon: <LuWrench size={16} /> },
    { to: '/helpdesk/housekeeping', label: 'Housekeeping', icon: <LuSprayCan size={16} /> },
    { to: '/helpdesk/office_asset', label: 'Office Asset', icon: <LuMonitor size={16} /> },
    { to: '/helpdesk/print_scan', label: 'Printing & Scanning', icon: <LuPrinter size={16} /> },
    { to: '/helpdesk/app_feedback', label: 'App Feedback', icon: <LuMessageSquare size={16} /> },
  ];

  const renderSidebarNav = () => (
    <>
      <div className="sidebar__header">
        <Link to="/helpdesk" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: '#fff' }}>
          <AvanaLogo size="sm" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.98rem', lineHeight: 1.15 }}>
              Avana <span style={{ color: '#f5c358' }}>Group</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
              Employee Portal
            </div>
          </div>
        </Link>
        <button
          type="button"
          className="emp-sidebar__close"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation menu"
        >
          <LuX size={20} />
        </button>
      </div>

      <nav className="emp-sidebar__nav" aria-label="Employee Portal Navigation">
        <div className="emp-sidebar__section-label">Workspace</div>
        {mainLinks.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `emp-sidebar__link${isActive ? ' emp-sidebar__link--active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="sidebar__divider" />
        <div className="emp-sidebar__section-label">Service Desks</div>
        {deskLinks.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `emp-sidebar__link${isActive ? ' emp-sidebar__link--active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {employeeEmail && (
        <div className="sidebar__footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.78)', fontSize: '0.78rem', marginBottom: '0.6rem', overflow: 'hidden' }}>
            <LuUser size={14} style={{ flexShrink: 0, color: '#f5c358' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={employeeEmail}>{employeeEmail}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="emp-sidebar__logout-btn"
            aria-label="Log Out"
          >
            <LuLogOut size={15} />
            <span>Log Out</span>
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="layout layout--employee-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Desktop persistent sidebar */}
      <aside className="emp-sidebar emp-sidebar--desktop" aria-label="Primary Sidebar">
        {renderSidebarNav()}
      </aside>

      {/* Mobile off-canvas drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="emp-sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              className="emp-sidebar emp-sidebar--mobile"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Mobile Navigation"
            >
              {renderSidebarNav()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Shell */}
      <div className="emp-shell__content">
        <header role="banner" className="portal-header portal-header--compact">
          <div className="portal-header__top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              <button
                type="button"
                className="emp-hamburger"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={sidebarOpen}
              >
                <LuMenu size={20} />
              </button>
              <HeaderNavigation />
            </div>

            <div className="portal-header__actions">
              {employeeEmail && (
                <div className="portal-header__user-pill emp-header-user">
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
        </header>

        <main className="layout__main" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
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
              <LuLogOut size={14} style={{ marginRight: "0.35rem" }} /> Log Out
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
              <LuLayoutDashboard size={14} style={{ marginRight: "0.35rem" }} /> Help Desk Admin
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
