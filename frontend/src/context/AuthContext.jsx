import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

// ── Token helpers ──────────────────────────────────────────────
function isTokenValid(token) {
  if (!token) return false;
  try {
    const { exp } = jwtDecode(token);
    return Date.now() < exp * 1000;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  // Employee state
  const [employeeToken, setEmployeeToken] = useState(() => {
    const t = localStorage.getItem('avana_employee_token');
    return isTokenValid(t) ? t : null;
  });

  // Admin state — admin uses a Bearer token returned from /api/admin/login
  const [adminToken, setAdminToken] = useState(() => {
    const t = localStorage.getItem('avana_admin_token');
    return t || null; // admin tokens don't expire via JWT (session-based on server)
  });

  const [employeeEmail, setEmployeeEmail] = useState(() => {
    return localStorage.getItem('avana_employee_email') || null;
  });

  // ── Employee actions ──────────────────────────────────────
  const loginEmployee = (token, email) => {
    localStorage.setItem('avana_employee_token', token);
    localStorage.setItem('avana_employee_email', email);
    setEmployeeToken(token);
    setEmployeeEmail(email);
  };

  const logoutEmployee = () => {
    localStorage.removeItem('avana_employee_token');
    localStorage.removeItem('avana_employee_email');
    setEmployeeToken(null);
    setEmployeeEmail(null);
  };

  // ── Admin actions ─────────────────────────────────────────
  const loginAdmin = (token) => {
    localStorage.setItem('avana_admin_token', token);
    setAdminToken(token);
  };

  const logoutAdmin = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    } catch { /* silent */ }
    localStorage.removeItem('avana_admin_token');
    setAdminToken(null);
  };

  // ── Derived state ─────────────────────────────────────────
  const isEmployeeLoggedIn = Boolean(employeeToken && isTokenValid(employeeToken));
  const isAdminLoggedIn    = Boolean(adminToken);

  return (
    <AuthContext.Provider value={{
      employeeToken,
      employeeEmail,
      adminToken,
      isEmployeeLoggedIn,
      isAdminLoggedIn,
      loginEmployee,
      logoutEmployee,
      loginAdmin,
      logoutAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
