import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui';

/**
 * Protects routes that require an employee session.
 * Redirects to login if no valid token.
 */
export function RequireEmployee({ children }) {
  const { isEmployeeLoggedIn } = useAuth();
  if (!isEmployeeLoggedIn) {
    return <Navigate to="/" replace />;
  }
  return children;
}

/**
 * Protects routes that require an admin session.
 * Redirects to login if no admin token.
 */
export function RequireAdmin({ children }) {
  const { isAdminLoggedIn } = useAuth();
  if (!isAdminLoggedIn) {
    return <Navigate to="/admin-login" replace />;
  }
  return children;
}

/**
 * Redirect already-authenticated employees away from login.
 */
export function RedirectIfEmployee({ children }) {
  const { isEmployeeLoggedIn } = useAuth();
  if (isEmployeeLoggedIn) {
    return <Navigate to="/helpdesk" replace />;
  }
  return children;
}

/**
 * Redirect already-authenticated admins away from admin login.
 */
export function RedirectIfAdmin({ children }) {
  const { isAdminLoggedIn } = useAuth();
  if (isAdminLoggedIn) {
    return <Navigate to="/helpdesk-admin" replace />;
  }
  return children;
}
