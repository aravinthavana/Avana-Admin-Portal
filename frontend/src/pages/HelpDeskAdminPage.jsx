import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

// Import extracted components
import { HelpdeskTable } from './admin/HelpdeskTable';
import { StockManager } from './admin/StockManager';
import { StationeryAudit, HousekeepingAudit } from './admin/Audits';
import { AMCPage } from './admin/AMCPage';
import { UtilityPaymentsPage, TaxPaymentsPage, PettyCashPage, TravelExpensePage } from './admin/FinanceModules';
import { AssetTrackerPage, CourierDispatchPage, BillWarrantyPage, OtherStockPage, RemindersPage } from './admin/OperationsModules';
import { LoginAuditPage, AdminSettings } from './admin/AdminSettingsPage';

import { stationeryApi, housekeepingApi, utilityApi, taxApi } from '../lib/api';

function CategoryWrapper() {
  const location = useLocation();
  // Extract the last part of the path (e.g. "conference" from "/helpdesk-admin/conference")
  const path = location.pathname.split('/').filter(Boolean).pop();
  
  // If we are exactly at /helpdesk-admin, path is "helpdesk-admin"
  if (path === 'helpdesk-admin') {
    return <HelpdeskTable />;
  }
  
  const validCategories = ['conference', 'stationery', 'admin-support', 'maintenance', 'housekeeping', 'office-asset', 'print-scan'];
  const categoryFilter = validCategories.includes(path) ? path : null;
  
  return <HelpdeskTable categoryFilter={categoryFilter} />;
}

export default function HelpDeskAdminPage() {
  return (
    <div style={{ padding: 'var(--space-5)', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
      <Routes>
        {/* Categories (Handled by a single wrapper to map the path to categoryFilter) */}
        <Route path="" element={<CategoryWrapper />} />
        <Route path="conference" element={<CategoryWrapper />} />
        <Route path="stationery" element={<CategoryWrapper />} />
        <Route path="admin-support" element={<CategoryWrapper />} />
        <Route path="maintenance" element={<CategoryWrapper />} />
        <Route path="housekeeping" element={<CategoryWrapper />} />
        <Route path="office-asset" element={<CategoryWrapper />} />
        <Route path="print-scan" element={<CategoryWrapper />} />
        
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

        {/* AMC & Bills */}
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
        <Route path="logins"   element={<LoginAuditPage />} />
        <Route path="settings" element={<AdminSettings />} />
      </Routes>
    </div>
  );
}
