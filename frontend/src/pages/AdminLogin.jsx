import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiLock, FiArrowLeft } from 'react-icons/fi';

const AdminLogin = () => {
  const { loginAdmin, adminToken } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (adminToken) {
      navigate('/admin/dashboard');
    }
  }, [adminToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        loginAdmin(data.token);
        navigate('/admin/dashboard');
      } else {
        setError(data.error || 'Authentication failed.');
      }
    } catch (err) {
      setError('Connection failed. Please check server status.');
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
      background: 'radial-gradient(circle at top left, hsl(224, 71%, 15%) 0%, hsl(224, 80%, 8%) 100%)',
      padding: '1.5rem'
    }}>
      {/* Top left return option */}
      <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{
            background: 'none',
            border: 'none',
            color: '#a5b4fc',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <FiArrowLeft /> Employee Portal
        </button>
      </div>

      <div className="glass-panel" style={{
        background: 'white',
        width: '100%',
        maxWidth: '400px',
        borderRadius: '24px',
        padding: '3rem 2.2rem',
        textAlign: 'center',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>Admin Sign In</h3>
        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '2rem' }}>Enter your administrative Password</p>

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

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group" style={{ marginBottom: '1.8rem' }}>
            <label htmlFor="admin-pass">Password</label>
            <input 
              type="password" 
              id="admin-pass" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required 
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, hsl(224, 71%, 15%) 0%, var(--primary) 100%)' }}>
            {loading ? 'Authenticating...' : 'Authenticate & Enter'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', color: 'var(--text-light)', fontSize: '0.75rem' }}>
          Protected by Avana Medical Enterprise Security
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
