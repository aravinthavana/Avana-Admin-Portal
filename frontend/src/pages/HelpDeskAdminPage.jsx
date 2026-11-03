import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';

// Import extracted components
import { HelpdeskTable } from './admin/HelpdeskTable';
import { StockManager } from './admin/StockManager';
import { StationeryAudit, HousekeepingAudit } from './admin/Audits';
import { AMCPage } from './admin/AMCPage';
import { UtilityPaymentsPage, TaxPaymentsPage, PettyCashPage, TravelExpensePage } from './admin/FinanceModules';
import { AssetTrackerPage, CourierDispatchPage, BillWarrantyPage, OtherStockPage, RemindersPage } from './admin/OperationsModules';
import { LoginAuditPage, AdminSettings, LocationsManagementPage } from './admin/AdminSettingsPage';
import { AuditLogsPage } from './admin/AuditLogsPage';
import PurchaseApprovalsPage from './admin/PurchaseApprovalsPage';
import UserManagementPage from './admin/UserManagementPage';
import { Breadcrumbs } from '../components/ui';
import {
  LuListFilter, LuCalendar, LuPenTool, LuBriefcase, LuWrench,
  LuSprayCan, LuMonitor, LuPrinter, LuTruck, LuMessageSquare,
  LuUsers, LuBuilding2, LuSettings, LuFileText, LuShoppingCart,
  LuBoxes, LuPackage, LuClipboardCheck, LuLayers, LuFileBadge,
  LuWallet, LuCar, LuReceipt, LuZap, LuLandmark, LuBell,
  LuLayoutDashboard, LuShieldCheck, LuArrowRight, LuClock
} from 'react-icons/lu';


import { stationeryApi, housekeepingApi, utilityApi, taxApi, printingApi, helpdeskApi, purchaseApi, amcApi } from '../lib/api';

function StationeryPrintingStockWrapper() {
  const [tab, setTab] = useState('stationery');
  return (
    <div>
      <div className="tabs" style={{ marginBottom: '1rem' }}>
        <button className={`tab ${tab === 'stationery' ? 'tab--active' : ''}`} onClick={() => setTab('stationery')}>Stationery Items</button>
        <button className={`tab ${tab === 'printing' ? 'tab--active' : ''}`} onClick={() => setTab('printing')}>Printing / Form Item</button>
      </div>
      {tab === 'stationery' ? (
        <StockManager
          key="stationery"
          title="Stationery Stock"
          icon="✏️"
          type="stationery"
          getStock={stationeryApi.getStock}
          updateStock={stationeryApi.updateStock}
          addItem={stationeryApi.addItem}
          deleteItem={stationeryApi.deleteItem}
        />
      ) : (
        <StockManager
          key="printing"
          title="Printing Stock"
          icon="🖨️"
          type="printing"
          getStock={printingApi.getStock}
          updateStock={printingApi.updateStock}
          addItem={printingApi.addItem}
          deleteItem={printingApi.deleteItem}
        />
      )}
    </div>
  );
}

/* ─── Reusable Card Component for Grid Views ────────────────────────────── */
function NavCard({ icon, title, description, badge, link, color = '#b27f0d' }) {
  return (
    <Link
      to={link}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#ffffff',
        borderRadius: '14px',
        padding: '1.4rem',
        border: '1px solid #e4e4e7',
        boxShadow: '0 1px 3px rgba(23, 32, 37, 0.05)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 10px 24px -4px rgba(23, 32, 37, 0.08)';
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(23, 32, 37, 0.05)';
        e.currentTarget.style.borderColor = '#e4e4e7';
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color }} />
      
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'var(--brand-amber-bg, #fdf5e6)',
            border: '1px solid rgba(178, 127, 13, 0.2)',
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {React.isValidElement(icon) ? icon : <span style={{ fontSize: '1.3rem' }}>{icon}</span>}
          </div>
          {badge && (
            <span style={{
              background: '#f9f9fb',
              color: '#6b7280',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
              border: '1px solid #e4e4e7',
            }}>
              {badge}
            </span>
          )}
        </div>

        <h3 style={{
          fontSize: '1.08rem',
          fontWeight: 700,
          color: '#172025',
          margin: '0 0 0.4rem 0',
          fontFamily: 'var(--font-heading, inherit)'
        }}>
          {title}
        </h3>

        <p style={{
          fontSize: '0.85rem',
          color: '#6b7280',
          margin: 0,
          lineHeight: 1.5,
        }}>
          {description}
        </p>
      </div>

      <div style={{
        marginTop: '1.25rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid #f9f9fb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: color,
        fontWeight: 600,
        fontSize: '0.82rem'
      }}>
        <span>View Details</span>
        <LuArrowRight size={14} />
      </div>
    </Link>
  );
}

/* ─── 1. Main Admin Dashboard (3 Option Boxes) ───────────────────────────── */
function MainDashboardView() {
  const [stats, setStats] = useState({
    pendingRequests: 0,
    conferenceCount: 0,
    pendingPurchases: 0,
    activeAmcCount: 0,
    loading: true
  });

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      helpdeskApi.getAll(),
      purchaseApi.getAll(),
      amcApi.getAll()
    ]).then(([resHelpdesk, resPurchases, resAmc]) => {
      if (!isMounted) return;

      const tickets = (resHelpdesk.status === 'fulfilled' && Array.isArray(resHelpdesk.value)) ? resHelpdesk.value : [];
      const purchases = (resPurchases.status === 'fulfilled' && Array.isArray(resPurchases.value)) ? resPurchases.value : [];
      const amcs = (resAmc.status === 'fulfilled' && Array.isArray(resAmc.value)) ? resAmc.value : [];

      const pendingTickets = tickets.filter(t => (t.status || '').toLowerCase() === 'pending').length;
      const conferenceTickets = tickets.filter(t => t.category === 'conference').length;
      const pendingPurch = purchases.filter(p => (p.status || '').toLowerCase() === 'pending').length;

      setStats({
        pendingRequests: pendingTickets,
        conferenceCount: conferenceTickets,
        pendingPurchases: pendingPurch,
        activeAmcCount: amcs.length,
        loading: false
      });
    }).catch(() => {
      if (isMounted) setStats(s => ({ ...s, loading: false }));
    });

    return () => { isMounted = false; };
  }, []);

  return (
    <div style={{ padding: '0.5rem 0 2rem 0' }}>
      {/* ── Admin Command Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--brand-charcoal, #172025) 0%, #1e2930 100%)',
        borderRadius: 'var(--radius-lg, 14px)',
        padding: '2rem 2.2rem',
        marginBottom: '1.75rem',
        color: '#ffffff',
        boxShadow: '0 8px 24px -4px rgba(23, 32, 37, 0.12)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            padding: '4px 12px', borderRadius: '20px',
            fontSize: '0.78rem', fontWeight: 600, color: '#f5c358',
            marginBottom: '10px'
          }}>
            <LuBuilding2 size={13} />
            <span>Avana Group Operations</span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.85rem',
            fontWeight: 800,
            margin: '0 0 6px 0',
            color: '#ffffff',
            letterSpacing: '-0.01em'
          }}>
            Admin Operations Hub
          </h1>

          <p style={{
            color: 'rgba(255, 255, 255, 0.78)',
            fontSize: '0.92rem',
            margin: 0,
            maxWidth: '650px',
            lineHeight: 1.5
          }}>
            Supervise incoming employee requests, inventory stock reconciliations, vendor AMC renewals, and security governance.
          </p>
        </div>
      </div>

      {/* ── Live Operational KPI Metric Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <Link to="/helpdesk-admin/all-tickets" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(23, 32, 37, 0.05)',
            transition: 'all 0.15s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#b45309'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#e4e4e7'; }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '10px',
              background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <LuClock size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pending Requests
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#172025', lineHeight: 1.2, fontFamily: 'var(--font-heading)' }}>
                {stats.loading ? '—' : stats.pendingRequests}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
                Awaiting resolution
              </div>
            </div>
          </div>
        </Link>

        <Link to="/helpdesk-admin/conference" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(23, 32, 37, 0.05)',
            transition: 'all 0.15s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--brand-amber)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#e4e4e7'; }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '10px',
              background: 'var(--brand-amber-bg, #fdf5e6)', border: '1px solid rgba(178, 127, 13, 0.2)', color: 'var(--brand-amber, #b27f0d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <LuCalendar size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Conference Room
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#172025', lineHeight: 1.2, fontFamily: 'var(--font-heading)' }}>
                {stats.loading ? '—' : stats.conferenceCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Room bookings logged
              </div>
            </div>
          </div>
        </Link>

        <Link to="/helpdesk-admin/purchases" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(23, 32, 37, 0.05)',
            transition: 'all 0.15s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#2563eb'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#e4e4e7'; }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '10px',
              background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <LuShoppingCart size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Purchase Approvals
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#172025', lineHeight: 1.2, fontFamily: 'var(--font-heading)' }}>
                {stats.loading ? '—' : stats.pendingPurchases}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                Pending approval
              </div>
            </div>
          </div>
        </Link>

        <Link to="/helpdesk-admin/amc" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(23, 32, 37, 0.05)',
            transition: 'all 0.15s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#16a34a'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#e4e4e7'; }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '10px',
              background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <LuFileBadge size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                AMC Contracts
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#172025', lineHeight: 1.2, fontFamily: 'var(--font-heading)' }}>
                {stats.loading ? '—' : stats.activeAmcCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                Active vendor contracts
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Operational Zones Navigation Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem',
        maxWidth: 1200,
        margin: '0 auto'
      }}>
        <NavCard
          icon={<LuListFilter size={24} />}
          title="Request Management"
          description="Manage incoming employee service tickets across Conference Bookings, Stationery, Facility Maintenance, IT Assets, and Logistics."
          badge="9 Categories"
          link="/helpdesk-admin/requests"
          color="#b27f0d"
        />

        <NavCard
          icon={<LuBoxes size={24} />}
          title="Inventory & Operations"
          description="Manage stock balances, conduct monthly audits, monitor AMC contracts, track courier dispatch DCs, and manage finance logs."
          badge="15 Modules"
          link="/helpdesk-admin/inventory"
          color="#b27f0d"
        />

        <NavCard
          icon={<LuShieldCheck size={24} />}
          title="Security & System Logs"
          description="Manage employee user credentials, assign office locations, review system audit records, and configure admin security."
          badge="4 Modules"
          link="/helpdesk-admin/security"
          color="#b27f0d"
        />
      </div>
    </div>
  );
}

/* ─── 2A. Request Categories Sub-View Card Grid ──────────────────────────── */
function RequestCategoriesSubView() {
  const categories = [
    { icon: <LuListFilter size={22} />, title: 'All Requests', desc: 'View and filter all incoming helpdesk tickets across all departments', link: '/helpdesk-admin/all-tickets', color: '#b27f0d' },
    { icon: <LuCalendar size={22} />, title: 'Conference Room', desc: 'Manage room bookings, approve schedules, and view calendar bookings', link: '/helpdesk-admin/conference', color: '#b27f0d' },
    { icon: <LuPenTool size={22} />, title: 'Stationery Requests', desc: 'Review employee stationery and office supply requests', link: '/helpdesk-admin/stationery', color: '#b27f0d' },
    { icon: <LuBriefcase size={22} />, title: 'Admin Support', desc: 'Assist employees with administrative and general office support requests', link: '/helpdesk-admin/admin-support', color: '#b27f0d' },
    { icon: <LuWrench size={22} />, title: 'Maintenance Complaints', desc: 'Track facility maintenance, AC, electrical, and plumbing repairs', link: '/helpdesk-admin/maintenance', color: '#b27f0d' },
    { icon: <LuSprayCan size={22} />, title: 'Housekeeping Requests', desc: 'Manage cleaning requests and floor hygiene operations', link: '/helpdesk-admin/housekeeping', color: '#b27f0d' },
    { icon: <LuMonitor size={22} />, title: 'Office Asset Requests', desc: 'Process requests for office equipment, furniture, and hardware', link: '/helpdesk-admin/office-asset', color: '#b27f0d' },
    { icon: <LuPrinter size={22} />, title: 'Printing & Scanning', desc: 'Handle bulk document printing, scanning, binding, and lamination', link: '/helpdesk-admin/print-scan', color: '#b27f0d' },
    { icon: <LuMessageSquare size={22} />, title: 'App Feedback', desc: 'Review user feedback and improvement suggestions for the portal', link: '/helpdesk-admin/app-feedback', color: '#b27f0d' },
  ];

  return (
    <div style={{ padding: '0 0 var(--space-8) 0' }}>
      <Breadcrumbs items={[
        { label: 'Admin Dashboard', link: '/helpdesk-admin' },
        { label: 'Request Categories' }
      ]} />
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#172025', margin: '0 0 0.25rem 0' }}>
            Request Categories
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
            Select a category card to view, filter, and manage tickets
          </p>
        </div>
        <Link to="/helpdesk-admin" className="btn btn--outline btn--sm" style={{ textDecoration: 'none' }}>
          ← Back to Main Dashboard
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem'
      }}>
        {categories.map(cat => (
          <NavCard
            key={cat.link}
            icon={cat.icon}
            title={cat.title}
            description={cat.desc}
            link={cat.link}
            color={cat.color}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── 2B. Security & System Logs Sub-View Card Grid ──────────────────────── */
function SecuritySubView() {
  const modules = [
    { icon: <LuUsers size={22} />, title: 'User Management', desc: 'Manage employee accounts, assign roles & departments, toggle active status, and reset passwords', link: '/helpdesk-admin/users', color: '#b27f0d' },
    { icon: <LuBuilding2 size={22} />, title: 'Office Locations', desc: 'Add or remove office floors and building locations for request routing', link: '/helpdesk-admin/locations', color: '#b27f0d' },
    { icon: <LuSettings size={22} />, title: 'Portal Settings', desc: 'Change administrator credentials and configure portal defaults', link: '/helpdesk-admin/settings', color: '#b27f0d' },
    { icon: <LuFileText size={22} />, title: 'Admin Operations Audit', desc: 'Track all administrative changes across the portal', link: '/helpdesk-admin/audit-logs', color: '#b27f0d' },
  ];


  return (
    <div style={{ padding: '0 0 var(--space-8) 0' }}>
      <Breadcrumbs items={[
        { label: 'Admin Dashboard', link: '/helpdesk-admin' },
        { label: 'Security & Audit Logs' }
      ]} />
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#172025', margin: '0 0 0.25rem 0' }}>
            Security & System Logs
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
            Select a module to review security events or update administrative settings
          </p>
        </div>
        <Link to="/helpdesk-admin" className="btn btn--outline btn--sm" style={{ textDecoration: 'none' }}>
          ← Back to Main Dashboard
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.25rem',
        maxWidth: 800
      }}>
        {modules.map(mod => (
          <NavCard
            key={mod.link}
            icon={mod.icon}
            title={mod.title}
            description={mod.desc}
            link={mod.link}
            color={mod.color}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── 2C. Inventory & Operations Sub-View Card Grid ─────────────────────── */
function InventorySubView() {
  const modules = [
    { icon: <LuShoppingCart size={22} />, title: 'Purchase Approvals', desc: 'Manage and approve purchase requests, workflows, and actual purchases', link: '/helpdesk-admin/purchases', color: '#b27f0d' },
    { icon: <LuPenTool size={22} />, title: 'Stationery Stock', desc: 'Monitor stationery inventory levels and restock items', link: '/helpdesk-admin/stationery-stock', color: '#b27f0d' },
    { icon: <LuClipboardCheck size={22} />, title: 'Stationery Audit', desc: 'Perform monthly physical stock reconciliations and overrides', link: '/helpdesk-admin/stationery-audit', color: '#b27f0d' },
    { icon: <LuSprayCan size={22} />, title: 'Housekeeping Stock', desc: 'Track housekeeping and cleaning item stock counts', link: '/helpdesk-admin/housekeeping-stock', color: '#b27f0d' },
    { icon: <LuClipboardCheck size={22} />, title: 'Housekeeping Audit', desc: 'Run monthly audits for cleaning products and supplies', link: '/helpdesk-admin/housekeeping-audit', color: '#b27f0d' },
    { icon: <LuPackage size={22} />, title: 'Stationery Tracker', desc: 'Track stationery handovers and issuance history', link: '/helpdesk-admin/asset-tracker', color: '#b27f0d' },
    { icon: <LuLayers size={22} />, title: 'Other Stock', desc: 'Manage miscellaneous stock items and general inventory', link: '/helpdesk-admin/other-stock', color: '#b27f0d' },
    { icon: <LuFileBadge size={22} />, title: 'AMC Contracts', desc: 'Manage annual maintenance contracts, vendors, and renewal dates', link: '/helpdesk-admin/amc', color: '#b27f0d' },
    { icon: <LuTruck size={22} />, title: 'Courier & Dispatch', desc: 'Manage outbound shipments, auto-generate Delivery Challans, and set Global Addresses', link: '/helpdesk-admin/courier', color: '#b27f0d' },
    { icon: <LuWallet size={22} />, title: 'Cash Handling', desc: 'Log petty cash transactions, vouchers, and office expenditures', link: '/helpdesk-admin/cash-handling', color: '#b27f0d' },
    { icon: <LuCar size={22} />, title: 'Travel Expenses', desc: 'Track employee travel claims, cab bookings, and reimbursements', link: '/helpdesk-admin/travel', color: '#b27f0d' },
    { icon: <LuReceipt size={22} />, title: 'Bill & Warranty', desc: 'Store bills, invoices, and product warranty expiration dates', link: '/helpdesk-admin/bill-warranty', color: '#b27f0d' },
    { icon: <LuZap size={22} />, title: 'Utility Payments', desc: 'Track electricity, water, internet, and office utility bills', link: '/helpdesk-admin/utility-payments', color: '#b27f0d' },
    { icon: <LuLandmark size={22} />, title: 'Tax Payments', desc: 'Record property tax, municipal tax, and statutory payments', link: '/helpdesk-admin/tax-payments', color: '#b27f0d' },
    { icon: <LuBell size={22} />, title: 'Reminder List', desc: 'Configure automatic email & system reminders for renewals', link: '/helpdesk-admin/reminders', color: '#b27f0d' },
  ];

  return (
    <div style={{ padding: '0 0 var(--space-8) 0' }}>
      <Breadcrumbs items={[
        { label: 'Admin Dashboard', link: '/helpdesk-admin' },
        { label: 'Inventory & Operations' }
      ]} />
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#172025', margin: '0 0 0.25rem 0' }}>
            Inventory & Operations
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
            Select an inventory, operations, or finance module below
          </p>
        </div>
        <Link to="/helpdesk-admin" className="btn btn--outline btn--sm" style={{ textDecoration: 'none' }}>
          ← Back to Main Dashboard
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem'
      }}>
        {modules.map(mod => (
          <NavCard
            key={mod.link}
            icon={mod.icon}
            title={mod.title}
            description={mod.desc}
            link={mod.link}
            color={mod.color}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Category Table Wrapper ──────────────────────────────────────────────── */
function CategoryWrapper() {
  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();
  
  if (path === 'all-tickets') {
    return <HelpdeskTable />;
  }
  
  const validCategories = ['conference', 'stationery', 'admin-support', 'maintenance', 'housekeeping', 'office-asset', 'print-scan', 'app-feedback'];
  const categoryMap = {
    'admin-support': 'admin_support',
    'office-asset': 'office_asset',
    'print-scan': 'print_scan',
    'app-feedback': 'app_feedback'
  };
  const categoryFilter = validCategories.includes(path) ? (categoryMap[path] || path) : null;
  
  return <HelpdeskTable categoryFilter={categoryFilter} />;
}

/* ─── Main Router Component ───────────────────────────────────────────────── */
export default function HelpDeskAdminPage() {
  return (
    <div style={{ padding: 'var(--space-5)', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
      <Routes>
        {/* Main Dashboard Landing Page (3 Option Cards) */}
        <Route path="" element={<MainDashboardView />} />

        {/* Sub-view Card Grids */}
        <Route path="requests" element={<RequestCategoriesSubView />} />
        <Route path="security" element={<SecuritySubView />} />
        <Route path="inventory" element={<InventorySubView />} />
        
        {/* Category Tables */}
        <Route path="all-tickets" element={<CategoryWrapper />} />
        <Route path="conference" element={<CategoryWrapper />} />
        <Route path="stationery" element={<CategoryWrapper />} />
        <Route path="admin-support" element={<CategoryWrapper />} />
        <Route path="maintenance" element={<CategoryWrapper />} />
        <Route path="housekeeping" element={<CategoryWrapper />} />
        <Route path="office-asset" element={<CategoryWrapper />} />
        <Route path="print-scan" element={<CategoryWrapper />} />
        <Route path="app-feedback" element={<CategoryWrapper />} />
        
        {/* Stock */}
        <Route path="stationery-stock" element={<StationeryPrintingStockWrapper />} />
        <Route path="housekeeping-stock" element={
          <StockManager
            title="Housekeeping Stock"
            icon="🧹"
            type="housekeeping"
            getStock={housekeepingApi.getStock}
            updateStock={housekeepingApi.updateStock}
            addItem={housekeepingApi.addItem}
            deleteItem={housekeepingApi.deleteItem}
          />
        } />
        <Route path="stationery-audit" element={<StationeryAudit />} />
        <Route path="housekeeping-audit" element={<HousekeepingAudit />} />
        <Route path="asset-tracker" element={<AssetTrackerPage />} />
        <Route path="other-stock" element={<OtherStockPage />} />

        {/* AMC & Operations */}
        <Route path="purchases" element={<PurchaseApprovalsPage />} />
        <Route path="amc" element={<AMCPage />} />
        <Route path="courier" element={<CourierDispatchPage />} />
        <Route path="cash-handling" element={<PettyCashPage />} />
        <Route path="travel" element={<TravelExpensePage />} />
        <Route path="bill-warranty" element={<BillWarrantyPage />} />
        {/* System & Security */}
        <Route path="reminders" element={<RemindersPage />} />

        {/* Payments */}
        <Route path="utility-payments" element={<UtilityPaymentsPage api={utilityApi} />} />
        <Route path="tax-payments" element={<TaxPaymentsPage api={taxApi} />} />

        {/* Admin Settings & Logs */}
        <Route path="users" element={<UserManagementPage />} />
        <Route path="locations" element={<LocationsManagementPage />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
      </Routes>
    </div>
  );
}
