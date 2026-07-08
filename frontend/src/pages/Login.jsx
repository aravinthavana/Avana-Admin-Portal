import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiShield, FiCheckCircle } from 'react-icons/fi';

const Login = () => {
  const { loginEmployee, employee } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('otp'); // 'otp' | 'password'
  const [phase, setPhase] = useState('email'); // 'email' | 'otp' (only for OTP mode)

  const [email, setEmail] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [captchaUrl, setCaptchaUrl] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (employee) {
      navigate('/dashboard');
    } else {
      refreshCaptcha();
    }
  }, [employee]);

  const refreshCaptcha = () => {
    setCaptchaUrl(`/api/employee/captcha?t=${new Date().getTime()}`);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    const emailLower = email.trim().toLowerCase();

    if (!emailLower.endsWith('@avanamedical.com') && !emailLower.endsWith('@avanasurgical.com')) {
      setError('Access Denied: Use your official company email (@avanamedical.com or @avanasurgical.com).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/employee/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLower, captcha: captchaText.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPhase('otp');
      } else {
        setError(data.error || 'Failed to send OTP.');
        refreshCaptcha();
      }
    } catch (err) {
      setError('Connection failed. Please check backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/employee/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        loginEmployee(email.trim().toLowerCase(), data.token);
        navigate('/dashboard');
      } else {
        setError(data.error || 'Verification failed. Try again.');
      }
    } catch (err) {
      setError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/employee/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        loginEmployee(email.trim().toLowerCase(), data.token);
        navigate('/dashboard');
      } else {
        setError(data.error || 'Invalid email or password.');
      }
    } catch (err) {
      setError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top left, hsl(224, 76%, 48%) 0%, hsl(244, 71%, 15%) 100%)',
      padding: '1.5rem'
    }}>
      {/* Top right admin redirect */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <button 
          onClick={() => navigate('/admin-login')} 
          style={{
            background: 'rgba(255,255,255,0.12)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '0.6rem 1.2rem',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.22)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.12)'}
        >
          Admin Sign In
        </button>
      </div>

      <div className="glass-panel" style={{
        background: 'white',
        width: '100%',
        maxWidth: '430px',
        borderRadius: '24px',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <FiMail size={32} color="var(--primary)" />
          <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Avana Medical</span>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 0.3rem 0' }}>Employee Login</h2>
        <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', marginBottom: '2rem' }}>Sign in to access Help Desk & Bookings</p>

        {error && (
          <div style={{
            background: 'var(--accent-danger-glow)',
            color: 'var(--accent-danger)',
            border: '1px solid hsla(0, 72%, 51%, 0.2)',
            padding: '0.75rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        {/* Phase 1: Enter Email / Credentials */}
        {phase === 'email' && (
          <div>
            {/* Mode Switch Tab Bar */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', background: 'hsl(220, 15%, 95%)', padding: '0.3rem', borderRadius: '10px' }}>
              <button 
                type="button" 
                className="btn"
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  fontSize: '0.85rem',
                  borderRadius: '7px',
                  background: mode === 'otp' ? 'white' : 'transparent',
                  color: mode === 'otp' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: mode === 'otp' ? 'var(--shadow-sm)' : 'none'
                }}
                onClick={() => setMode('otp')}
              >
                OTP Login
              </button>
              <button 
                type="button" 
                className="btn"
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  fontSize: '0.85rem',
                  borderRadius: '7px',
                  background: mode === 'password' ? 'white' : 'transparent',
                  color: mode === 'password' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: mode === 'password' ? 'var(--shadow-sm)' : 'none'
                }}
                onClick={() => setMode('password')}
              >
                Password Login
              </button>
            </div>

            {mode === 'otp' ? (
              <form onSubmit={handleSendOtp}>
                <div className="form-group">
                  <label htmlFor="login-email">Company Email</label>
                  <input 
                    type="email" 
                    id="login-email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="username@avanamedical.com" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="login-captcha">Security Check</label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'hsl(220, 10%, 97%)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <img 
                      src={captchaUrl} 
                      onClick={refreshCaptcha}
                      style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', height: '44px', width: '130px' }} 
                      alt="Captcha" 
                    />
                    <div style={{ flex: 1 }}>
                      <input 
                        type="text" 
                        id="login-captcha" 
                        value={captchaText}
                        onChange={(e) => setCaptchaText(e.target.value)}
                        placeholder="Enter code" 
                        required 
                        style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  {loading ? 'Generating OTP...' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePasswordLogin}>
                <div className="form-group">
                  <label htmlFor="login-pass-email">Company Email</label>
                  <input 
                    type="email" 
                    id="login-pass-email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="username@avanamedical.com" 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                  <label htmlFor="login-pass-password">Password</label>
                  <input 
                    type="password" 
                    id="login-pass-password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    required 
                  />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Phase 2: Enter OTP */}
        {phase === 'otp' && mode === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ textAlign: 'left' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.45' }}>
              📩 We've sent a 6-digit OTP code to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Please check your inbox.
            </p>
            
            <div className="form-group">
              <label htmlFor="login-otp">6-Digit OTP</label>
              <input 
                type="text" 
                id="login-otp" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="••••••" 
                maxLength={6} 
                pattern="[0-9]{6}" 
                required 
                style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  textAlign: 'center',
                  letterSpacing: '0.25rem'
                }}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent-success) 0%, hsl(162, 76%, 32%) 100%)', boxShadow: 'none' }}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={() => { setPhase('email'); setError(''); setOtp(''); setCaptchaText(''); }} 
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}
              >
                Back to login
              </button>
            </div>
          </form>
        )}

        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-light)', fontSize: '0.75rem' }}>
          Protected by Avana Medical Enterprise Security
        </div>
      </div>
    </div>
  );
};

export default Login;
