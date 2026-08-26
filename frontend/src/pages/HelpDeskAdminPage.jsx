import React from 'react';
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


import { stationeryApi, housekeepingApi, utilityApi, taxApi, printingApi } from '../lib/api';
import { useState } from 'react';

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
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1px solid #e4e4e7',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 20px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
        e.currentTarget.style.borderColor = '#e4e4e7';
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: color }} />
      
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
          }}>
            {icon}
          </div>
          {badge && (
            <span style={{
              background: '#f9f9fb',
              color: '#6b7280',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.25rem 0.6rem',
              borderRadius: '20px',
              border: '1px solid #e4e4e7',
            }}>
              {badge}
            </span>
          )}
        </div>

        <h3 style={{
          fontSize: '1.15rem',
          fontWeight: 700,
          color: '#172025',
          margin: '0 0 0.5rem 0',
          fontFamily: 'var(--font-heading, inherit)'
        }}>
          {title}
        </h3>

        <p style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          margin: 0,
          lineHeight: 1.5,
        }}>
          {description}
        </p>
      </div>

      <div style={{
        marginTop: '1.25rem',
        paddingTop: '0.85rem',
        borderTop: '1px solid #f9f9fb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: color,
        fontWeight: 700,
        fontSize: '0.85rem'
      }}>
        <span>View Options</span>
        <span style={{ fontSize: '1.1rem' }}>→</span>
      </div>
    </Link>
  );
}

/* ─── 1. Main Admin Dashboard (3 Option Boxes) ───────────────────────────── */
function MainDashboardView() {
  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#172025', margin: '0 0 0.5rem 0' }}>
          🏢 Admin Control Dashboard
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#6b7280', margin: 0 }}>
          Select a category box below to manage requests, view security logs, or handle inventory & operations.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.75rem',
        maxWidth: 1200,
        margin: '0 auto'
      }}>
        <NavCard
          icon="📂"
          title="Request Categories"
          description="Manage and process all employee requests including Conference Room Bookings, Stationery, Maintenance, Housekeeping, and Asset Requests."
          badge="8 Categories"
          link="/helpdesk-admin/requests"
          color="#b27f0d"
        />

        <NavCard
          icon="🔐"
          title="Security Logs"
          description="Audit employee login and logout activity, track authentication histories, and manage administrator portal credentials."
          badge="2 Modules"
          link="/helpdesk-admin/security"
          color="#b27f0d"
        />

        <NavCard
          icon="📦"
          title="Inventory Management"
          description="Track stock levels, run monthly audits, manage courier dispatches, AMC contracts, bill warranties, tax & utility payments, and cash handling."
          badge="14 Modules"
          link="/helpdesk-admin/inventory"
          color="#b27f0d"
        />
      </div>
    </div>
  );
}

/* ─── 2A. Request Categories Sub-View Card Grid ──────────────────────────── */
function RequestCategoriesSubView() {
  const categories = [
    { icon: '📋', title: 'All Requests', desc: 'View and filter all incoming helpdesk tickets across all departments', link: '/helpdesk-admin/all-tickets', color: '#b27f0d' },
    { icon: '📅', title: 'Conference Room', desc: 'Manage room bookings, approve schedules, and view calendar bookings', link: '/helpdesk-admin/conference', color: '#b27f0d' },
    { icon: '✏️', title: 'Stationery Requests', desc: 'Review employee stationery and office supply requests', link: '/helpdesk-admin/stationery', color: '#b27f0d' },
    { icon: '💼', title: 'Admin Support', desc: 'Assist employees with administrative and general office support requests', link: '/helpdesk-admin/admin-support', color: '#b27f0d' },
    { icon: '🔧', title: 'Maintenance Complaints', desc: 'Track facility maintenance, AC, electrical, and plumbing repairs', link: '/helpdesk-admin/maintenance', color: '#b27f0d' },
    { icon: '🧹', title: 'Housekeeping Requests', desc: 'Manage cleaning requests and floor hygiene operations', link: '/helpdesk-admin/housekeeping', color: '#b27f0d' },
    { icon: '🖥️', title: 'Office Asset Requests', desc: 'Process requests for office equipment, furniture, and hardware', link: '/helpdesk-admin/office-asset', color: '#b27f0d' },
    { icon: '🖨️', title: 'Printing & Scanning', desc: 'Handle bulk document printing, scanning, binding, and lamination', link: '/helpdesk-admin/print-scan', color: '#b27f0d' },
    { icon: '💡', title: 'App Feedback', desc: 'Review user feedback and improvement suggestions for the portal', link: '/helpdesk-admin/app-feedback', color: '#b27f0d' },
  ];

  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#172025', margin: '0 0 0.25rem 0' }}>
            📂 Request Categories
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
    { icon: '🏢', title: 'Office Locations', desc: 'Add or remove office floors and building locations for request routing', link: '/helpdesk-admin/locations', color: '#b27f0d' },
    { icon: '⚙️', title: 'Portal Settings', desc: 'Change administrator credentials and configure portal defaults', link: '/helpdesk-admin/settings', color: '#b27f0d' },
    { icon: '📜', title: 'Admin Operations Audit', desc: 'Track all administrative changes across the portal', link: '/helpdesk-admin/audit-logs', color: '#b27f0d' },
  ];


  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#172025', margin: '0 0 0.25rem 0' }}>
            🔐 Security & Audit Logs
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
    { icon: '🛒', title: 'Purchase Approvals', desc: 'Manage and approve purchase requests, workflows, and actual purchases', link: '/helpdesk-admin/purchases', color: '#b27f0d' },
    { icon: '✏️', title: 'Stationery Stock', desc: 'Monitor stationery inventory levels and restock items', link: '/helpdesk-admin/stationery-stock', color: '#b27f0d' },
    { icon: '📋', title: 'Stationery Audit', desc: 'Perform monthly physical stock reconciliations and overrides', link: '/helpdesk-admin/stationery-audit', color: '#b27f0d' },
    { icon: '🧹', title: 'Housekeeping Stock', desc: 'Track housekeeping and cleaning item stock counts', link: '/helpdesk-admin/housekeeping-stock', color: '#b27f0d' },
    { icon: '🧼', title: 'Housekeeping Audit', desc: 'Run monthly audits for cleaning products and supplies', link: '/helpdesk-admin/housekeeping-audit', color: '#b27f0d' },
    { icon: '📦', title: 'Stationery Tracker', desc: 'Track stationery handovers and issuance history', link: '/helpdesk-admin/asset-tracker', color: '#b27f0d' },
    { icon: '🗃️', title: 'Other Stock', desc: 'Manage miscellaneous stock items and general inventory', link: '/helpdesk-admin/other-stock', color: '#b27f0d' },
    { icon: '🔧', title: 'AMC Contracts', desc: 'Manage annual maintenance contracts, vendors, and renewal dates', link: '/helpdesk-admin/amc', color: '#b27f0d' },
    { icon: '🚚', title: 'Courier & Dispatch', desc: 'Manage outbound shipments, auto-generate Delivery Challans, and set Global Addresses', link: '/helpdesk-admin/courier', color: '#b27f0d' },
    { icon: '💰', title: 'Cash Handling', desc: 'Log petty cash transactions, vouchers, and office expenditures', link: '/helpdesk-admin/cash-handling', color: '#b27f0d' },
    { icon: '🚕', title: 'Travel Expenses', desc: 'Track employee travel claims, cab bookings, and reimbursements', link: '/helpdesk-admin/travel', color: '#b27f0d' },
    { icon: '🧾', title: 'Bill & Warranty', desc: 'Store bills, invoices, and product warranty expiration dates', link: '/helpdesk-admin/bill-warranty', color: '#b27f0d' },
    { icon: '⚡', title: 'Utility Payments', desc: 'Track electricity, water, internet, and office utility bills', link: '/helpdesk-admin/utility-payments', color: '#b27f0d' },
    { icon: '🏢', title: 'Tax Payments', desc: 'Record property tax, municipal tax, and statutory payments', link: '/helpdesk-admin/tax-payments', color: '#b27f0d' },
    { icon: '🔔', title: 'Reminder List', desc: 'Configure automatic email & system reminders for renewals', link: '/helpdesk-admin/reminders', color: '#b27f0d' },
  ];

  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#172025', margin: '0 0 0.25rem 0' }}>
            📦 Inventory & Operations
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
        <Route path="stationery-stock" element={
          <StockManager
            title="Stationery Stock"
            icon="✏️"
            type="stationery"
            getStock={stationeryApi.getStock}
            updateStock={stationeryApi.updateStock}
            addItem={stationeryApi.addItem}
          />
        } />
        <Route path="housekeeping-stock" element={
          <StockManager
            title="Housekeeping Stock"
            icon="🧹"
            type="housekeeping"
            getStock={housekeepingApi.getStock}
            updateStock={housekeepingApi.updateStock}
            addItem={housekeepingApi.addItem}
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

        {/* Admin */}
        <Route path="locations" element={<LocationsManagementPage />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
      </Routes>
    </div>
  );
}
