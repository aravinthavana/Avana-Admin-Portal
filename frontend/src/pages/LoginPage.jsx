import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { employeeApi, adminApi } from '../lib/api';
import { AvanaLogo, Alert, Spinner } from '../components/ui';
import '../styles/Login.css';

const ALLOWED_DOMAINS = ['avanamedical.com', 'avanasurgical.com'];

function validateEmail(email) {
  const parts = email.split('@');
  if (parts.length !== 2) return 'Enter a valid email address.';
  if (!ALLOWED_DOMAINS.includes(parts[1].toLowerCase())) {
    return `Only @avanamedical.com or @avanasurgical.com emails are allowed.`;
  }
  return null;
}

// ── OTP Login ──────────────────────────────────────────────────────────────
function OtpLoginPanel({ onSuccess }) {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const err = validateEmail(email.trim());
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      await employeeApi.sendOtp(email.trim());
      toast.success('OTP sent to your email!');
      setStep('otp');
    } catch (ex) {
      setError(ex.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) { setError('Enter the 6-digit OTP sent to your email.'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await employeeApi.verifyOtp(email.trim(), otp);
      onSuccess(data.token, email.trim());
    } catch (ex) {
      setError(ex.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <form autoComplete="off" onSubmit={handleVerifyOtp} noValidate>
        <div className="login-panel__otp-hint">
          OTP sent to <strong>{email}</strong>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setStep('email'); setOtp(''); setError(''); }}>
            Change
          </button>
        </div>
        <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="form-label form-label--required" htmlFor="otp-input">One-Time Password</label>
          <input
            id="otp-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            className={`form-input login-panel__otp-input${error ? ' form-input--error' : ''}`}
            placeholder="• • • • • •"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            autoComplete="one-time-code"
            autoFocus
            required
            aria-describedby={error ? 'otp-error' : undefined}
          />
          {error && <span id="otp-error" className="form-error" role="alert">⚠ {error}</span>}
        </div>
        <button type="submit" className={`btn btn--primary btn--full btn--lg${loading ? ' btn--loading' : ''}`} disabled={loading}>
          {!loading && 'Verify & Sign In'}
        </button>
        <p className="login-panel__resend">
          Didn't receive it?{' '}
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleSendOtp}>Resend OTP</button>
        </p>
      </form>
    );
  }

  return (
    <form autoComplete="off" onSubmit={handleSendOtp} noValidate>
      <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
        <label className="form-label form-label--required" htmlFor="otp-email">Work Email</label>
        <input
          id="otp-email"
          type="email"
          className={`form-input${error ? ' form-input--error' : ''}`}
          placeholder="you@avanamedical.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
          autoComplete="email"
          autoFocus
          required
          aria-describedby={error ? 'email-error' : 'email-hint'}
        />
        {error
          ? <span id="email-error" className="form-error" role="alert">⚠ {error}</span>
          : <span id="email-hint" className="form-hint">Must be an @avanamedical.com or @avanasurgical.com address</span>
        }
      </div>
      <button type="submit" className={`btn btn--primary btn--full btn--lg${loading ? ' btn--loading' : ''}`} disabled={loading}>
        {!loading && 'Send OTP'}
      </button>
    </form>
  );
}

// ── Password Login ─────────────────────────────────────────────────────────
function PasswordLoginPanel({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailErr = validateEmail(email.trim());
    if (emailErr) { setError(emailErr); return; }
    if (!password) { setError('Password is required.'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await employeeApi.loginPassword(email.trim(), password);
      onSuccess(data.token, email.trim());
    } catch (ex) {
      setError(ex.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form autoComplete="off" onSubmit={handleSubmit} noValidate>
      <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
        <label className="form-label form-label--required" htmlFor="pass-email">Work Email</label>
        <input
          id="pass-email"
          type="email"
          className={`form-input${error ? ' form-input--error' : ''}`}
          placeholder="you@avanamedical.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
          autoComplete="email"
          required
        />
      </div>
      <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
        <label className="form-label form-label--required" htmlFor="pass-password">Password</label>
        <input
          id="pass-password"
          type="password"
          className={`form-input${error ? ' form-input--error' : ''}`}
          placeholder="Enter your password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(''); }}
          autoComplete="current-password"
          required
          aria-describedby={error ? 'pass-error' : undefined}
        />
        {error && <span id="pass-error" className="form-error" role="alert">⚠ {error}</span>}
      </div>
      <button type="submit" className={`btn btn--primary btn--full btn--lg${loading ? ' btn--loading' : ''}`} disabled={loading}>
        {!loading && 'Sign In'}
      </button>
    </form>
  );
}

// ── Admin Quick-Login (within employee portal) ─────────────────────────────
function AdminLoginModal({ onClose, onAdminSuccess }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) { setError('Password is required.'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await adminApi.login(password);
      onAdminSuccess(data.token);
    } catch (ex) {
      setError(ex.message || 'Incorrect password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
      <div className="modal">
        <div className="modal__header">
          <h3 id="admin-modal-title">Admin Sign In</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal__body">
          <form autoComplete="off" onSubmit={handleSubmit} noValidate>
            <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
              <label className="form-label form-label--required" htmlFor="admin-modal-pass">Admin Password</label>
              <input
                id="admin-modal-pass"
                type="password"
                className={`form-input${error ? ' form-input--error' : ''}`}
                placeholder="Enter admin password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoFocus
                required
                aria-describedby={error ? 'admin-pass-error' : undefined}
              />
              {error && <span id="admin-pass-error" className="form-error" role="alert">⚠ {error}</span>}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className={`btn btn--primary${loading ? ' btn--loading' : ''}`} disabled={loading}>
                {!loading && 'Authenticate'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Main Login Page ────────────────────────────────────────────────────────
export default function LoginPage() {
  const [mode, setMode] = useState('otp'); // 'otp' | 'password'
  const [showAdminModal, setShowAdminModal] = useState(false);
  const { loginEmployee, loginAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleEmployeeSuccess = useCallback((token, email) => {
    loginEmployee(token, email);
    toast.success(`Welcome, ${email.split('@')[0]}!`);
    navigate('/helpdesk');
  }, [loginEmployee, navigate, toast]);

  const handleAdminSuccess = useCallback((token) => {
    loginAdmin(token);
    setShowAdminModal(false);
    toast.success('Admin session started.');
    navigate('/helpdesk-admin');
  }, [loginAdmin, navigate, toast]);

  return (
    <div className="login-page">
      {/* Background decorative elements */}
      <div className="login-page__bg" aria-hidden="true">
        <div className="login-page__bg-circle login-page__bg-circle--1" />
        <div className="login-page__bg-circle login-page__bg-circle--2" />
      </div>

      {/* Admin login button (top-right) */}
      <button
        type="button"
        className="btn btn--ghost login-page__admin-btn"
        onClick={() => setShowAdminModal(true)}
        aria-label="Admin sign in"
      >
        🔐 Admin Sign In
      </button>

      {/* Login card */}
      <main className="login-page__card" role="main">
        <div className="login-page__logo">
          <AvanaLogo size="lg" />
        </div>

        <div className="login-page__header">
          <h1 className="login-page__title">Employee Portal</h1>
          <p className="login-page__subtitle">Submit requests, book the conference room, and track your tickets</p>
        </div>

        {/* Mode toggle */}
        <div className="tabs login-page__tabs" role="tablist" aria-label="Login method">
          <button
            role="tab"
            aria-selected={mode === 'otp'}
            id="tab-otp"
            aria-controls="panel-otp"
            className={`tab${mode === 'otp' ? ' tab--active' : ''}`}
            onClick={() => setMode('otp')}
            type="button"
          >
            📱 OTP Login
          </button>
          <button
            role="tab"
            aria-selected={mode === 'password'}
            id="tab-password"
            aria-controls="panel-password"
            className={`tab${mode === 'password' ? ' tab--active' : ''}`}
            onClick={() => setMode('password')}
            type="button"
          >
            🔑 Password Login
          </button>
        </div>

        <div
          role="tabpanel"
          id={mode === 'otp' ? 'panel-otp' : 'panel-password'}
          aria-labelledby={mode === 'otp' ? 'tab-otp' : 'tab-password'}
          style={{ marginTop: 'var(--space-6)' }}
        >
          {mode === 'otp'
            ? <OtpLoginPanel onSuccess={handleEmployeeSuccess} />
            : <PasswordLoginPanel onSuccess={handleEmployeeSuccess} />
          }
        </div>

        <p className="login-page__footer-link">
          Want to check booking status?{' '}
          <a href="/status" target="_blank" rel="noopener noreferrer">View Status Page →</a>
        </p>
      </main>

      {/* Admin login modal */}
      {showAdminModal && (
        <AdminLoginModal
          onClose={() => setShowAdminModal(false)}
          onAdminSuccess={handleAdminSuccess}
        />
      )}
    </div>
  );
}
