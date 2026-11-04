import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../lib/api';
import { AvanaLogo } from '../components/ui';
import {
  LuShield,
  LuLock,
  LuEye,
  LuEyeOff,
  LuCircleAlert,
  LuArrowLeft
} from 'react-icons/lu';
import '../styles/Login.css';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) { setError('Password is required.'); return; }
    setError('');
    setLoading(true);
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
      {/* Background decorative elements */}
      <div className="login-page__bg" aria-hidden="true" />

      {/* Top navigation back to Employee Portal */}
      <Link
        to="/"
        className="login-page__admin-btn"
        aria-label="Back to Employee Portal"
      >
        <LuArrowLeft size={14} />
        <span>Employee Portal</span>
      </Link>

      <main className="login-page__card" role="main">
        <div className="login-page__logo">
          <AvanaLogo size="lg" />
        </div>

        <div className="login-page__header">
          <div className="login-page__badge">
            <LuShield size={12} /> Admin Console
          </div>
          <h1 className="login-page__title">Admin Portal</h1>
          <p className="login-page__subtitle">Authenticate with administrative credentials</p>
        </div>

        <form autoComplete="off" onSubmit={handleLogin} noValidate>
          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label form-label--required" htmlFor="admin-password">Admin Password</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">
                <LuLock size={16} />
              </span>
              <input
                id="admin-password"
                type={showPass ? 'text' : 'password'}
                className={`form-input${error ? ' form-input--error' : ''}`}
                placeholder="Enter admin password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoFocus
                autoComplete="current-password"
                required
                aria-describedby={error ? 'admin-err' : undefined}
              />
              <button
                type="button"
                className="login-input-toggle"
                onClick={() => setShowPass(!showPass)}
                title={showPass ? 'Hide password' : 'Show password'}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <LuEyeOff size={16} /> : <LuEye size={16} />}
              </button>
            </div>
            {error && (
              <span id="admin-err" className="form-error" role="alert">
                <LuCircleAlert size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </span>
            )}
          </div>
          <button
            type="submit"
            className={`btn btn--primary btn--full btn--lg${loading ? ' btn--loading' : ''}`}
            disabled={loading}
          >
            {!loading && 'Authenticate & Enter'}
          </button>
        </form>

        <p className="login-page__footer-link">
          <Link to="/">
            <LuArrowLeft size={13} /> Back to Employee Portal
          </Link>
        </p>
      </main>
    </div>
  );
}
