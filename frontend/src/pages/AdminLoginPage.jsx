import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../lib/api';
import { AvanaLogo } from '../components/ui';
import '../styles/Login.css';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) { setError('Password is required.'); return; }
    setError(''); setLoading(true);
    try {
      const data = await adminApi.login(password);
      loginAdmin(data.token);
      toast.success('Welcome, Admin!');
      navigate('/helpdesk-admin');
    } catch (ex) {
      setError(ex.message || 'Incorrect password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__bg" aria-hidden="true">
        <div className="login-page__bg-circle login-page__bg-circle--1" />
        <div className="login-page__bg-circle login-page__bg-circle--2" />
      </div>

      <main className="login-page__card" role="main">
        <div className="login-page__logo"><AvanaLogo size="lg" /></div>

        <div className="login-page__header">
          <h1 className="login-page__title">Admin Portal</h1>
          <p className="login-page__subtitle">Manage bookings, helpdesk, inventory, and billing</p>
        </div>

        <form onSubmit={handleLogin} noValidate>
          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label form-label--required" htmlFor="admin-password">Admin Password</label>
            <input
              id="admin-password"
              type="password"
              className={`form-input${error ? ' form-input--error' : ''}`}
              placeholder="Enter admin password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              autoFocus
              autoComplete="current-password"
              required
              aria-describedby={error ? 'admin-err' : undefined}
            />
            {error && <span id="admin-err" className="form-error" role="alert">⚠ {error}</span>}
          </div>
          <button
            type="submit"
            className={`btn btn--primary btn--full btn--lg${loading ? ' btn--loading' : ''}`}
            disabled={loading}
          >
            {!loading && '🔐 Authenticate & Enter'}
          </button>
        </form>

        <p className="login-page__footer-link">
          <a href="/">← Employee Portal</a>
        </p>
      </main>
    </div>
  );
}
