import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { EmployeeLayout, AdminLayout, ConferenceAdminLayout } from './components/Layout';
import { RequireEmployee, RequireAdmin, RedirectIfEmployee, RedirectIfAdmin } from './components/ProtectedRoute';

// ── Pages (lazy-loaded for performance) ────────────────────────────────────
import { lazy, Suspense } from 'react';
import { Spinner } from './components/ui';

const LoginPage          = lazy(() => import('./pages/LoginPage'));
const HelpDeskPage       = lazy(() => import('./pages/HelpDeskPage'));
const BookingPage        = lazy(() => import('./pages/BookingPage'));
const StatusPage         = lazy(() => import('./pages/StatusPage'));
const AdminLoginPage     = lazy(() => import('./pages/AdminLoginPage'));
const AdminDashPage      = lazy(() => import('./pages/AdminDashPage'));
const HelpDeskAdminPage  = lazy(() => import('./pages/HelpDeskAdminPage'));
const AssetAcknowledgementPage = lazy(() => import('./pages/AssetAcknowledgementPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Spinner size="lg" label="Loading page…" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Public ── */}
              <Route path="/status" element={<StatusPage />} />
              <Route path="/asset-acknowledgement" element={<AssetAcknowledgementPage />} />

              {/* ── Employee Auth & Portal ── */}
              <Route path="/" element={
                <RedirectIfEmployee>
                  <LoginPage />
                </RedirectIfEmployee>
              } />

              <Route element={
                <RequireEmployee>
                  <EmployeeLayout />
                </RequireEmployee>
              }>
                <Route path="/helpdesk/*" element={<HelpDeskPage />} />
                <Route path="/booking" element={<BookingPage />} />
              </Route>

              {/* ── Admin Login ── */}
              <Route path="/admin-login" element={
                <RedirectIfAdmin>
                  <AdminLoginPage />
                </RedirectIfAdmin>
              } />

              {/* ── Conference Room Admin ── */}
              <Route element={
                <RequireAdmin>
                  <ConferenceAdminLayout />
                </RequireAdmin>
              }>
                <Route path="/admin" element={<AdminDashPage />} />
              </Route>

              {/* ── Help Desk Admin (sidebar layout) ── */}
              <Route element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }>
                <Route path="/helpdesk-admin/*" element={<HelpDeskAdminPage />} />
              </Route>

              {/* ── Fallback ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
