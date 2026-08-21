import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Routes, Route, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { employeeApi, helpdeskApi, courierApi } from '../lib/api';
import {
  Badge, Spinner, EmptyState, Alert, Modal, ConfirmModal,
  FormField, PageHeader, StatCard, Breadcrumbs
} from '../components/ui';

/* ─── Constants ───────────────────────────────────────────── */
const RESTRICTED_EMAIL = 'bhuvaneshravi@avanamedical.com';

const HK_ITEMS = [
  'Colin','Exo','Floor Broom','Garbage Bag Large','Garbage Bag Small',
  'Harpic','Hit Spray','J-son Tissue Box','Floor Cleaning Liquid','Mop',
  'Naphthaline/Freshener','Odonil','Room Spray','Scrubber','Toilet Tissue Roll',
  'Dishwash Liquid','Waste Cloth','Phenol','Floor Wiper','EC Mop',
  'Handwash Tissue Roll','Handwash Liquid','Other',
];

const FLOORS = ['Ground','1st','2nd','3rd','Other'];

const CATEGORIES = [
  {
    key: 'conference',
    label: 'Conference Room Booking',
    icon: '📅',
    desc: 'Reserve the conference room for meetings and events',
    color: '#b27f0d',
    link: '/booking',
  },
  {
    key: 'stationery',
    label: 'Stationery Request',
    icon: '✏️',
    desc: 'Order office stationery and printing materials',
    color: '#b27f0d',
  },
  {
    key: 'hk_material',
    label: 'Housekeeping Material',
    icon: '🧴',
    desc: 'Request cleaning and housekeeping supplies',
    color: '#b27f0d',
    restricted: true,
  },
  {
    key: 'admin_support',
    label: 'Admin Support',
    icon: '💼',
    desc: 'Get assistance from the admin team',
    color: '#b27f0d',
  },
  {
    key: 'maintenance',
    label: 'Maintenance Complaint',
    icon: '🔧',
    desc: 'Report and track maintenance issues',
    color: '#b27f0d',
  },
  {
    key: 'housekeeping',
    label: 'Housekeeping Request',
    icon: '🧹',
    desc: 'Request cleaning and waste removal services',
    color: '#b27f0d',
  },
  {
    key: 'office_asset',
    label: 'Office Asset Request',
    icon: '🖥️',
    desc: 'Request new equipment or furniture',
    color: '#b27f0d',
  },
  {
    key: 'print_scan',
    label: 'Printing & Scanning',
    icon: '🖨️',
    desc: 'Bulk printing, scanning, binding and lamination',
    color: '#b27f0d',
  },
  {
    key: 'courier_dispatch',
    label: 'Courier & Dispatch',
    icon: '📦',
    desc: 'Generate Delivery Challan (DC) and request courier dispatch',
    color: '#b27f0d',
  },
  {
    key: 'app_feedback',
    label: 'App Feedback & Bugs',
    icon: '💡',
    desc: 'Suggest extra features or report bugs in this portal',
    color: '#b27f0d',
  },
];

/* ─── Helpers ─────────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

function getStatusBadge(status) {
  const map = {
    pending: 'pending',
    completed: 'approved',
    rejected: 'rejected',
    'in-progress': 'in-progress',
  };
  return map[(status || '').toLowerCase()] || 'pending';
}

/* ─── Request Change Password Panel ──────────────────────── */
function ChangePasswordPanel() {
  const toast = useToast();
  const { employeeToken, employeeEmail } = useAuth();
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  const [form, setForm] = useState({ newPass: '', confirm: '', otp: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e) {
    e.preventDefault();
    const errs = {};
    if (!form.newPass || form.newPass.length < 6) errs.newPass = 'New password must be at least 6 characters';
    if (form.newPass !== form.confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    
    setLoading(true);
    try {
      await fetch('/api/employee/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: employeeEmail }),
      }).then(async res => {
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to send OTP'); }
      });
      toast.success('OTP sent to your email!');
      setStep('verify');
      setErrors({});
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifySubmit(e) {
    e.preventDefault();
    if (!form.otp || form.otp.length !== 6) { setErrors({ otp: 'Please enter a valid 6-digit OTP' }); return; }
    setLoading(true);
    try {
      await fetch('/api/employee/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${employeeToken}`,
        },
        body: JSON.stringify({ newPassword: form.newPass, otp: form.otp }),
      }).then(async res => {
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
        return res.json();
      });
      toast.success('Password changed successfully!');
      setForm({ newPass: '', confirm: '', otp: '' });
      setStep('request');
      setErrors({});
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 'var(--space-6)' }}>
      <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-5)', fontSize: '1rem' }}>
        🔑 Set / Change Password
      </h3>
      {step === 'request' ? (
        <form onSubmit={handleSendOtp} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'var(--space-4)' }}>
            <FormField label="New Password" required htmlFor="cp-new" error={errors.newPass}>
              <input id="cp-new" type="password" className={`form-input${errors.newPass ? ' form-input--error' : ''}`}
                value={form.newPass} onChange={e => setForm(f => ({ ...f, newPass: e.target.value }))} />
            </FormField>
            <FormField label="Confirm New Password" required htmlFor="cp-confirm" error={errors.confirm}>
              <input id="cp-confirm" type="password" className={`form-input${errors.confirm ? ' form-input--error' : ''}`}
                value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
            </FormField>
          </div>
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className={`btn btn--primary${loading ? ' btn--loading' : ''}`} disabled={loading}>
              {loading ? 'Sending OTP…' : 'Send OTP & Continue'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifySubmit} noValidate>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-4)' }}>
            Enter the 6-digit OTP sent to <strong>{employeeEmail}</strong> to confirm your new password.
          </p>
          <FormField label="One-Time Password (OTP)" required htmlFor="cp-otp" error={errors.otp}>
            <input id="cp-otp" type="text" maxLength={6} placeholder="• • • • • •" className={`form-input${errors.otp ? ' form-input--error' : ''}`}
              value={form.otp} onChange={e => setForm(f => ({ ...f, otp: e.target.value.replace(/\D/g, '') }))} style={{ maxWidth: 200 }} />
          </FormField>
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn--secondary" onClick={() => setStep('request')}>Cancel</button>
            <button type="submit" className={`btn btn--primary${loading ? ' btn--loading' : ''}`} disabled={loading}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function RequestTracker() {
  const { employeeEmail } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [cancelId, setCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchRequests = useCallback(() => {
    setLoading(true);
    employeeApi.getRequests()
      .then(data => setRequests(data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCancelConfirm = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/cancel?id=${cancelId}&email=${encodeURIComponent(employeeEmail)}`);
      if (!res.ok) throw new Error('Failed to cancel booking');
      toast.success('Booking cancelled successfully!');
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
      setCancelId(null);
    }
  };

  const filtered = requests.filter(r => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return (r.status || '').toLowerCase() === 'pending';
    if (activeTab === 'completed') return (r.status || '').toLowerCase() === 'completed';
    return true;
  });

  const tabs = [
    { key: 'all', label: `All (${requests.length})` },
    { key: 'pending', label: `Pending (${requests.filter(r => (r.status||'').toLowerCase()==='pending').length})` },
    { key: 'completed', label: `Completed (${requests.filter(r => (r.status||'').toLowerCase()==='completed').length})` },
  ];

  return (
    <div className="card" style={{ marginTop: 'var(--space-6)' }}>
      <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-5)', fontSize: '1rem' }}>
        📋 My Requests
      </h3>

      <div className="tabs" style={{ marginBottom: 'var(--space-4)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            className={`tab${activeTab === t.key ? ' tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <Spinner size="md" label="Loading requests…" />
        </div>
      )}
      {!loading && error && <Alert type="error">{error}</Alert>}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState icon="📭" title="No requests found" description="Your submitted requests will appear here." />
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="table-wrapper">
          <table className="table" aria-label="My help desk requests">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Date</th>
                <th scope="col">Category</th>
                <th scope="col">Details</th>
                <th scope="col">Status</th>
                <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const canCancel = r.category === 'conference' && 
                  (r.status === 'pending' || r.status === 'confirmed');

                return (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</td>
                    <td>
                      <span style={{ fontWeight: 500 }}>
                        {CATEGORIES.find(c => c.key === r.category)?.label || r.category}
                      </span>
                    </td>
                    <td style={{ maxWidth: 260, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      {r.description || r.issue || '—'}
                    </td>
                    <td>
                      <Badge status={getStatusBadge(r.status)} label={r.status || 'Pending'} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {canCancel && (
                        <button
                          type="button"
                          className="btn btn--sm btn--danger"
                          onClick={() => setCancelId(r.id)}
                          disabled={cancelling}
                        >
                          🛑 Cancel Booking
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {cancelId && (
        <ConfirmModal
          isOpen={!!cancelId}
          onClose={() => setCancelId(null)}
          onConfirm={handleCancelConfirm}
          title="Cancel Booking"
          message="Are you sure you want to cancel this conference room booking? This action cannot be undone."
          confirmLabel="Cancel Booking"
          dangerous
        />
      )}
    </div>
  );
}

/* ─── Item Selector (multi-item with quantity) ────────────── */
function ItemSelector({ items, selected, onChange, label = 'Select items' }) {
  const [search, setSearch] = useState('');

  function toggleItem(item) {
    const exists = selected.find(s => s.name === item);
    if (exists) {
      onChange(selected.filter(s => s.name !== item));
    } else {
      onChange([...selected, { name: item, qty: 1 }]);
    }
  }
  function updateQty(item, val) {
    const qty = parseInt(val, 10);
    onChange(selected.map(s => s.name === item ? { ...s, qty: isNaN(qty) || qty < 1 ? 1 : qty } : s));
  }

  const filteredItems = items.filter(it => it.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <label className="form-label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>{label}</label>
      
      <div style={{ position: 'relative', marginBottom: 'var(--space-2)' }}>
        <input 
          type="text" 
          className="form-input" 
          placeholder="🔍 Search items..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        maxHeight: 180,
        overflowY: 'auto',
        background: 'var(--color-surface)',
        marginBottom: 'var(--space-3)'
      }}>
        {filteredItems.map(item => {
          const sel = selected.find(s => s.name === item);
          return (
            <div key={item} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-4)',
              borderBottom: '1px solid var(--color-border-light)',
              background: sel ? 'var(--brand-amber-bg)' : 'transparent',
              transition: 'background var(--transition-fast)',
              cursor: 'pointer'
            }} onClick={() => toggleItem(item)}>
              <input
                type="checkbox"
                checked={!!sel}
                onChange={() => {}} /* Handled by parent div onClick */
                style={{ accentColor: 'var(--brand-amber)', cursor: 'pointer' }}
              />
              <span style={{ flex: 1, fontSize: '0.9rem' }}>
                {item}
              </span>
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div style={{ padding: 'var(--space-3)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            No items found.
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 'var(--space-2)' }}>
            Selected Items & Quantities
          </label>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: 'var(--space-1)', textAlign: 'left' }}>Item Name</th>
                <th style={{ padding: 'var(--space-1)', width: 80, textAlign: 'center' }}>Qty</th>
                <th style={{ padding: 'var(--space-1)', width: 40, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {selected.map(sel => (
                <tr key={sel.name} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <td style={{ padding: 'var(--space-1)' }}>{sel.name}</td>
                  <td style={{ padding: 'var(--space-1)', textAlign: 'center' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ width: '100%', padding: '0.2rem 0.4rem', textAlign: 'center' }} 
                      value={sel.qty} 
                      min="1"
                      onChange={e => updateQty(sel.name, e.target.value)} 
                    />
                  </td>
                  <td style={{ padding: 'var(--space-1)', textAlign: 'center' }}>
                    <button type="button" onClick={() => toggleItem(sel.name)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>&times;</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Category Forms ──────────────────────────────────────── */
function AppFeedbackForm({ form, setForm, errors }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <FormField label="Feedback Type" required htmlFor="af-type" error={errors.exact_query}>
        <select
          id="af-type"
          className={`form-select${errors.exact_query ? ' form-input--error' : ''}`}
          value={form.exact_query || ''}
          onChange={e => setForm(f => ({ ...f, exact_query: e.target.value }))}
        >
          <option value="">Select Type</option>
          <option value="Feature Request">💡 Feature Request</option>
          <option value="Bug Report">🐛 Bug Report</option>
          <option value="General Suggestion">💭 General Suggestion</option>
        </select>
      </FormField>

      <FormField label="Description" required htmlFor="af-desc" error={errors.description}>
        <textarea
          id="af-desc"
          className={`form-textarea${errors.description ? ' form-input--error' : ''}`}
          placeholder="Please describe your suggestion or the bug you found in detail..."
          rows={5}
          value={form.description || ''}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
      </FormField>
    </div>
  );
}

function MaintenanceForm({ form, setForm, errors }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <FormField label="Issue Type" required htmlFor="maint-type" error={errors.issue_type}>
          <select id="maint-type" className="form-select" value={form.issue_type || ''}
            onChange={e => setForm(f => ({ ...f, issue_type: e.target.value }))}>
            <option value="">Select issue type</option>
            {['AC not working','Light-Fan issue','Electrical problem','Plumbing issue','Furniture repair','Office equipment issue', 'Other'].map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Floor" required htmlFor="maint-floor" error={errors.floor}>
          <select id="maint-floor" className="form-select" value={form.floor || ''}
            onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}>
            <option value="">Select floor</option>
            {FLOORS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="Exact Issue" required htmlFor="maint-issue" error={errors.description}>
        <textarea id="maint-issue" className={`form-textarea${errors.description ? ' form-textarea--error' : ''}`}
          value={form.description || ''} rows={3}
          placeholder="Describe the issue in detail…"
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </FormField>
      <div style={{ marginTop: 'var(--space-4)' }}>
        <FormField label="Remarks" htmlFor="maint-remarks">
          <input id="maint-remarks" type="text" className="form-input"
            value={form.remarks || ''} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
        </FormField>
      </div>
    </>
  );
}

function HousekeepingForm({ form, setForm, errors }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <FormField label="Request Type" required htmlFor="hk-type" error={errors.request_type}>
          <select id="hk-type" className="form-select" value={form.request_type || ''}
            onChange={e => setForm(f => ({ ...f, request_type: e.target.value }))}>
            <option value="">Select type</option>
            {['Cleaning request','Waste removal', 'Other'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </FormField>
        <FormField label="Floor" required htmlFor="hk-floor" error={errors.floor}>
          <select id="hk-floor" className="form-select" value={form.floor || ''}
            onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}>
            <option value="">Select floor</option>
            {FLOORS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="Exact Query" required htmlFor="hk-query" error={errors.description}>
        <textarea id="hk-query" className={`form-textarea${errors.description ? ' form-textarea--error' : ''}`}
          value={form.description || ''} rows={3}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </FormField>
      <div style={{ marginTop: 'var(--space-4)' }}>
        <FormField label="Remarks" htmlFor="hk-remarks">
          <input id="hk-remarks" type="text" className="form-input"
            value={form.remarks || ''} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
        </FormField>
      </div>
    </>
  );
}

function HkMaterialForm({ form, setForm, errors }) {
  const selectedItems = form.items || [];
  const hasOther = selectedItems.some(s => s.name === 'Other');
  return (
    <>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <ItemSelector
          items={HK_ITEMS}
          selected={selectedItems}
          onChange={items => setForm(f => ({ ...f, items }))}
          label="Select Items (required)"
        />
        {errors.items && <span className="form-error" role="alert">⚠ {errors.items}</span>}
      </div>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <FormField label="Floor" required htmlFor="hkm-floor" error={errors.floor}>
          <select id="hkm-floor" className="form-select" value={form.floor || ''}
            onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}>
            <option value="">Select floor</option>
            {FLOORS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </FormField>
      </div>
      <FormField
        label="Remarks"
        required={hasOther}
        htmlFor="hkm-remarks"
        error={errors.remarks}
        hint={hasOther ? 'Required when "Other" is selected' : ''}
      >
        <textarea id="hkm-remarks" className={`form-textarea${errors.remarks ? ' form-textarea--error' : ''}`}
          value={form.remarks || ''} rows={2}
          onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
      </FormField>
    </>
  );
}

function StationeryForm({ form, setForm, errors }) {
  const [tab, setTab] = useState('stationery');
  const [stationeryItems, setStationeryItems] = useState([]);
  const [printingItems, setPrintingItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    employeeApi.getStationeryItems()
      .then(data => {
        setStationeryItems(data?.stationery || []);
        setPrintingItems(data?.printing || []);
      })
      .catch(() => {})
      .finally(() => setLoadingItems(false));
  }, []);

  const displayItems = tab === 'stationery' ? stationeryItems : printingItems;
  const selectedItems = form.items || [];

  return (
    <>
      <div className="tabs" style={{ marginBottom: 'var(--space-4)' }}>
        <button type="button" className={`tab${tab === 'stationery' ? ' tab--active' : ''}`}
          onClick={() => setTab('stationery')}>Stationery Items</button>
        <button type="button" className={`tab${tab === 'printing' ? ' tab--active' : ''}`}
          onClick={() => setTab('printing')}>Printing Items</button>
      </div>
      {loadingItems ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}><Spinner size="sm" /></div>
      ) : (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ItemSelector
            items={displayItems}
            selected={selectedItems}
            onChange={items => setForm(f => ({ ...f, items, item_type: tab }))}
            label="Select Items (required)"
          />
          {errors.items && <span className="form-error" role="alert">⚠ {errors.items}</span>}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        <FormField label="Floor" required htmlFor="stat-floor" error={errors.floor}>
          <select id="stat-floor" className="form-select" value={form.floor || ''}
            onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}>
            <option value="">Select floor</option>
            {FLOORS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </FormField>
        <FormField label="Remarks" htmlFor="stat-remarks">
          <input id="stat-remarks" type="text" className="form-input"
            value={form.remarks || ''} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
        </FormField>
      </div>
    </>
  );
}

function OfficeAssetForm({ form, setForm, errors }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <FormField label="Request Type" required htmlFor="oa-type" error={errors.request_type}>
          <select id="oa-type" className="form-select" value={form.request_type || ''}
            onChange={e => setForm(f => ({ ...f, request_type: e.target.value }))}>
            <option value="">Select type</option>
            {['Chair-Table requirement','New equipment request','Replacement request', 'Other'].map(o =>
              <option key={o} value={o}>{o}</option>)}
          </select>
        </FormField>
        <FormField label="Floor" required htmlFor="oa-floor" error={errors.floor}>
          <select id="oa-floor" className="form-select" value={form.floor || ''}
            onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}>
            <option value="">Select floor</option>
            {FLOORS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="Exact Query" required htmlFor="oa-query" error={errors.description}>
        <textarea id="oa-query" className={`form-textarea${errors.description ? ' form-textarea--error' : ''}`}
          value={form.description || ''} rows={3}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </FormField>
      <div style={{ marginTop: 'var(--space-4)' }}>
        <FormField label="Remarks" htmlFor="oa-remarks">
          <input id="oa-remarks" type="text" className="form-input"
            value={form.remarks || ''} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
        </FormField>
      </div>
    </>
  );
}

function PrintScanForm({ form, setForm, errors }) {
  return (
    <>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <FormField label="Service Type" required htmlFor="ps-type" error={errors.service_type}>
          <select id="ps-type" className="form-select" value={form.service_type || ''}
            onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))}>
            <option value="">Select service</option>
            {['Bulk printing','Scanning','Binding-Lamination', 'Other'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="Exact Query" required htmlFor="ps-query" error={errors.description}>
        <textarea id="ps-query" className={`form-textarea${errors.description ? ' form-textarea--error' : ''}`}
          value={form.description || ''} rows={3}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </FormField>
      <div style={{ marginTop: 'var(--space-4)' }}>
        <FormField label="Remarks" htmlFor="ps-remarks">
          <input id="ps-remarks" type="text" className="form-input"
            value={form.remarks || ''} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
        </FormField>
      </div>
    </>
  );
}

function AdminSupportForm({ form, setForm, errors }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <FormField label="Support Type" required htmlFor="as-type" error={errors.support_type}>
          <select id="as-type" className="form-select" value={form.support_type || ''}
            onChange={e => setForm(f => ({ ...f, support_type: e.target.value }))}>
            <option value="">Select type</option>
            {['Safety Concern','Pantry-Refreshment','Event-Celebration','Lost-Found','Feedback-Suggestions','Other'].map(o =>
              <option key={o} value={o}>{o}</option>)}
          </select>
        </FormField>
        <FormField label="Floor" htmlFor="as-floor">
          <select id="as-floor" className="form-select" value={form.floor || ''}
            onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}>
            <option value="">Select floor</option>
            {FLOORS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="Description" required htmlFor="as-desc" error={errors.description}>
        <textarea id="as-desc" className={`form-textarea${errors.description ? ' form-textarea--error' : ''}`}
          value={form.description || ''} rows={4}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </FormField>
      <div style={{ marginTop: 'var(--space-4)' }}>
        <FormField label="Remarks" htmlFor="as-remarks">
          <input id="as-remarks" type="text" className="form-input"
            value={form.remarks || ''} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
        </FormField>
      </div>
    </>
  );
}


/* --- Address Directory Modal --- */

function AddressDirectoryModal({ isOpen, onClose, onSelect, userEmail }) {
  const toast = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await employeeApi.getAddressBook();
      setAddresses(data || []);
    } catch (err) {
      toast.error('Failed to load address book.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) { setSearch(''); fetchAddresses(); }
  }, [isOpen, fetchAddresses]);

  const q = search.toLowerCase();
  
  const commonAddrs = addresses.filter(a => a.userEmail === 'GLOBAL').map(a => ({ ...a, isCommon: true }));
  const personalAddrs = addresses.filter(a => a.userEmail !== 'GLOBAL');

  const filteredCommon = commonAddrs.filter(a =>
    !search ||
    a.name.toLowerCase().includes(q) ||
    (a.address || '').toLowerCase().includes(q) ||
    (a.label || '').toLowerCase().includes(q)
  );
  
  const filteredPersonal = personalAddrs.filter(a =>
    !search ||
    a.name.toLowerCase().includes(q) ||
    (a.address || '').toLowerCase().includes(q) ||
    (a.label || '').toLowerCase().includes(q)
  );

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await employeeApi.deleteAddress(id);
      setAddresses(prev => prev.filter(a => a.id !== id));
      toast.success('Address removed.');
    } catch {
      toast.error('Failed to delete address.');
    } finally {
      setDeleting(null);
    }
  }

  function startEdit(a) {
    setEditingId(a.id);
    setEditForm({ name: a.name, phone: a.phone || '', address: a.address, label: a.label || '' });
  }

  async function handleUpdate(id) {
    setSaving(true);
    try {
      await employeeApi.updateAddress(id, editForm);
      toast.success('Address updated.');
      setAddresses(prev => prev.map(a => a.id === id ? { ...a, ...editForm } : a));
      setEditingId(null);
    } catch {
      toast.error('Failed to update address.');
    } finally {
      setSaving(false);
    }
  }

  function renderEntry(a, canEdit) {
    if (editingId === a.id) {
      return (
        <div key={a.id} style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--brand-amber)',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
        }}>
          <input type="text" className="form-input" placeholder="Label (e.g. Home)" value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} />
          <input type="text" className="form-input" placeholder="Name / Company" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          <input type="text" className="form-input" placeholder="Phone" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
          <textarea className="form-textarea" placeholder="Full Address" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} rows="2" />
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <button type="button" className="btn btn--sm btn--outline" onClick={() => setEditingId(null)}>Cancel</button>
            <button type="button" className="btn btn--sm btn--primary" disabled={saving} onClick={() => handleUpdate(a.id)}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      );
    }

    return (
      <div key={a.id} style={{
        background: a.isCommon ? 'var(--color-surface-2)' : 'var(--color-surface)',
        border: `1px solid ${a.isCommon ? 'var(--brand-amber)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
        display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {a.label && (
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: a.isCommon ? 'var(--brand-amber)' : 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              {a.label}
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{a.name}</div>
          {a.phone && <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{a.phone}</div>}
          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{a.address}</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0, flexDirection: 'column' }}>
          <button type="button" className="btn btn--sm btn--primary" onClick={() => { onSelect(a); onClose(); }}>Select</button>
          {canEdit && (
            <>
              <button type="button" className="btn btn--sm btn--outline" onClick={() => startEdit(a)}>Edit</button>
              <button type="button" className="btn btn--sm btn--danger" onClick={() => handleDelete(a.id)} disabled={deleting === a.id} aria-label={`Delete ${a.name}`}>
                {deleting === a.id ? '…' : 'Del'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }} role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 540, maxHeight: '82vh', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
      }}>
        {/* Header */}
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>📒 Address Directory</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1 }}>×</button>
        </div>
        {/* Search */}
        <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍  Search by name, label or address…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>

          {/* Company Addresses (always visible unless filtered out) */}
          {filteredCommon.length > 0 && (
            <>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-1)', padding: '0 2px' }}>
                Company Addresses
              </div>
              {filteredCommon.map(a => renderEntry(a, false))}
              <div style={{ borderTop: '1px solid var(--color-border)', margin: 'var(--space-2) 0' }} />
            </>
          )}

          {/* Personal Addresses */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}><Spinner /></div>
          ) : filteredPersonal.length > 0 ? (
            <>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-1)', padding: '0 2px' }}>
                My Saved Addresses
              </div>
              {filteredPersonal.map(a => renderEntry(a, true))}
            </>
          ) : !loading && filteredCommon.length > 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-3)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              No personal addresses saved yet. Fill in an address and tick "Save to directory".
            </div>
          ) : !loading && filteredCommon.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-5)', color: 'var(--color-text-muted)' }}>
              No addresses match your search.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* --- AddressInputSection: manual + directory --- */
function AddressInputSection({ title, nameKey, phoneKey, addressKey, form, setForm, errors, userEmail }) {
  const toast = useToast();
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [saveToDir, setSaveToDir] = useState(false);
  const [label, setLabel] = useState('');

  function handleSelectFromDir(entry) {
    setForm(f => ({
      ...f,
      [nameKey]: entry.name,
      [phoneKey]: entry.phone || '',
      [addressKey]: entry.address,
    }));
  }

  async function handleSaveNow() {
    const name = form[nameKey] || '';
    const address = form[addressKey] || '';
    if (!name || !address) { toast.warning('Fill in name and address before saving.'); return; }
    try {
      await employeeApi.saveAddress({ name, phone: form[phoneKey] || '', address, label });
      toast.success('Address saved to directory!');
      setSaveToDir(false);
      setLabel('');
    } catch (err) {
      toast.error('Failed to save address: ' + err.message);
    }
  }

  const isManuallyFilled = !!(form[nameKey] || form[addressKey]);

  return (
    <>
      <AddressDirectoryModal
        isOpen={directoryOpen}
        onClose={() => setDirectoryOpen(false)}
        onSelect={handleSelectFromDir}
        userEmail={userEmail}
      />
      <div style={{
        border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)', background: 'var(--color-surface-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>{title}</h4>
          <button type="button" className="btn btn--sm btn--outline" onClick={() => setDirectoryOpen(true)} style={{ fontSize: '0.8rem' }}>
            Directory
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <FormField label="Name" required htmlFor={`${nameKey}-input`} error={errors && errors[nameKey]}>
            <input
              id={`${nameKey}-input`}
              type="text"
              className={`form-input${errors && errors[nameKey] ? ' form-input--error' : ''}`}
              placeholder="Contact name"
              value={form[nameKey] || ''}
              onChange={e => setForm(f => ({ ...f, [nameKey]: e.target.value }))}
            />
          </FormField>
          <FormField label="Phone" htmlFor={`${phoneKey}-input`} error={errors && errors[phoneKey]}>
            <input
              id={`${phoneKey}-input`}
              type="tel"
              className={`form-input${errors && errors[phoneKey] ? ' form-input--error' : ''}`}
              placeholder="Mobile number"
              value={form[phoneKey] || ''}
              onChange={e => setForm(f => ({ ...f, [phoneKey]: e.target.value }))}
            />
          </FormField>
        </div>
        <FormField label="Address" required htmlFor={`${addressKey}-input`} error={errors && errors[addressKey]}>
          <textarea
            id={`${addressKey}-input`}
            className={`form-textarea${errors && errors[addressKey] ? ' form-input--error' : ''}`}
            rows="3"
            placeholder="Full address..."
            value={form[addressKey] || ''}
            onChange={e => setForm(f => ({ ...f, [addressKey]: e.target.value }))}
          />
        </FormField>
        {isManuallyFilled && (
          <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-surface)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={saveToDir} onChange={e => setSaveToDir(e.target.checked)} />
              Save this address to my directory
            </label>
            {saveToDir && (
              <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder='Label (optional) e.g. "Office", "Client"'
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn--sm btn--primary" onClick={handleSaveNow}>Save</button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* --- ShippingLabelForm --- */
function ShippingLabelForm({ userEmail }) {
  const toast = useToast();
  const [form, setForm] = useState({
    fromName: '', fromPhone: '', fromAddressText: '',
    receiverName: '', receiverPhone: '', toAddress: '',
    recipientEmail: userEmail || '',
    isFragile: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.fromName?.trim()) e.fromName = 'From name is required';
    if (!form.fromAddressText?.trim()) e.fromAddressText = 'From address is required';
    if (!form.receiverName?.trim()) e.receiverName = 'To name is required';
    if (!form.toAddress?.trim()) e.toAddress = 'To address is required';
    return e;
  }

  async function handleGenerate() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const blob = await employeeApi.generateShippingLabel(
        { name: form.fromName, phone: form.fromPhone, address: form.fromAddressText },
        { name: form.receiverName, phone: form.receiverPhone, address: form.toAddress },
        form.recipientEmail,
        form.isFragile
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shipping-label${form.isFragile ? '-fragile' : ''}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Shipping label generated and downloaded!');
    } catch (err) {
      toast.error(err.message || 'Failed to generate label');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* From Address Section */}
      <AddressInputSection
        title="📤 FROM (Sender Address)"
        nameKey="fromName"
        phoneKey="fromPhone"
        addressKey="fromAddressText"
        form={form}
        setForm={setForm}
        errors={errors}
        userEmail={userEmail}
      />

      {/* To Address Section */}
      <AddressInputSection
        title="📥 TO (Receiver Address)"
        nameKey="receiverName"
        phoneKey="receiverPhone"
        addressKey="toAddress"
        form={form}
        setForm={setForm}
        errors={errors}
        userEmail={userEmail}
      />

      {/* Fragile Checkbox Option */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        background: form.isFragile ? '#fdf5e6' : 'var(--color-surface-2)',
        border: `1.5px dashed ${form.isFragile ? '#d97706' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        transition: 'all 0.2s'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', fontWeight: 600, fontSize: '0.92rem' }}>
          <input
            type="checkbox"
            checked={form.isFragile}
            onChange={e => setForm(f => ({ ...f, isFragile: e.target.checked }))}
            style={{ width: 18, height: 18, accentColor: '#d97706' }}
          />
          <span style={{ color: form.isFragile ? '#d97706' : 'var(--color-text)' }}>
            ⚠️ Add Fragile Warning Label (Includes Fragile logo taking half the page)
          </span>
        </label>
      </div>

      <FormField label="Send label PDF to email" htmlFor="sl-email" hint="Leave empty to only download, or enter an email to also send it">
        <input id="sl-email" type="email" className="form-input" placeholder="e.g. yourname@avanamedical.com"
          value={form.recipientEmail} onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))} />
      </FormField>

      <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className={`btn btn--primary${loading ? ' btn--loading' : ''}`} disabled={loading} onClick={handleGenerate} style={{ minWidth: 240, fontSize: '1rem' }}>
          {loading ? 'Generating...' : '🏷️ Generate & Download Shipping Label'}
        </button>
      </div>
    </div>
  );
}

function ItemsTable({ items, setItems, title = 'Dispatched Items' }) {
  return (
    <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>{title}</h4>
      {items.map((it, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
          <input type="text" className="form-input" placeholder="Item Code" value={it.itemCode || ''}
            onChange={e => { const arr = [...items]; arr[idx].itemCode = e.target.value; setItems(arr); }} style={{ width: '90px' }} />
          <input type="text" className="form-input" placeholder="Item Description *" required value={it.description || ''}
            onChange={e => { const arr = [...items]; arr[idx].description = e.target.value; setItems(arr); }} style={{ flex: 2, minWidth: '150px' }} />
          <input type="text" className="form-input" placeholder="S/N" value={it.serialNo || ''}
            onChange={e => { const arr = [...items]; arr[idx].serialNo = e.target.value; setItems(arr); }} style={{ flex: 1, minWidth: '90px' }} />
          <input type="number" className="form-input" placeholder="Qty" min="1" value={it.qty || ''}
            onChange={e => {
              const arr = [...items];
              arr[idx].qty = parseInt(e.target.value, 10) || 0;
              arr[idx].value = arr[idx].qty * (parseFloat(arr[idx].rate) || 0);
              setItems(arr);
            }} style={{ width: '70px' }} />
          <input type="number" step="any" className="form-input" placeholder="Rate" min="0" value={it.rate || ''}
            onChange={e => {
              const arr = [...items];
              arr[idx].rate = parseFloat(e.target.value) || 0;
              arr[idx].value = arr[idx].rate * (parseInt(arr[idx].qty) || 0);
              setItems(arr);
            }} style={{ width: '90px' }} />
          <input type="number" step="any" className="form-input" placeholder="Value" value={it.value || ''} disabled
            style={{ width: '100px', backgroundColor: 'var(--color-surface)', cursor: 'not-allowed' }} />
          {items.length > 1 && (
            <button type="button" className="btn btn--sm btn--danger" onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ padding: '0 0.5rem' }}>X</button>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-3)' }}>
        <button type="button" className="btn btn--sm btn--outline" onClick={() => setItems([...items, { itemCode: '', description: '', serialNo: '', qty: 1, rate: 0, value: 0 }])}>
          + Add Item
        </button>
        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
          Total Value: Rs.{items.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0).toFixed(2)}
        </div>
      </div>
    </div>
  );
}

// --- Courier Merge Form ---
function CourierMergeForm({ userEmail }) {
  const toast = useToast();
  const date = new Date().toISOString().slice(0, 10);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDc, setSelectedDc] = useState(null);
  const [viewDc, setViewDc] = useState(null);
  const [items, setItems] = useState([{ itemCode: '', description: '', serialNo: '', qty: 1, rate: 0, value: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    employeeApi.getDispatchesByDate(date)
      .then(res => setDispatches(res || []))
      .catch(err => toast.error('Failed to load dispatches'))
      .finally(() => setLoading(false));
  }, [date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDc) return toast.error('Select a Delivery Challan to merge into.');
    
    const validItems = items.filter(it => it.description.trim());
    if (validItems.length === 0) return toast.error('Add at least one item description.');

    try {
      setSubmitting(true);
      await employeeApi.createMergeRequest(selectedDc, validItems, userEmail, userEmail?.split('@')[0] || 'Employee');
      toast.success('Merge request submitted to the owner for approval.');
      setSelectedDc(null);
      setItems([{ itemCode: '', description: '', serialNo: '', qty: 1, rate: 0, value: 0 }]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit merge request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Checking for today's dispatches...</div>;
  if (dispatches.length === 0) return <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No other dispatches available today.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {!selectedDc ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {dispatches.map(dc => (
            <div key={dc.id} style={{
              background: 'white', border: '1px solid #fed7aa', borderRadius: '8px', padding: '0.8rem',
              display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'left'
            }}>
              <div style={{ fontWeight: 700, color: '#9a3412', fontSize: '0.88rem' }}>DC No: #{dc.dcNo}</div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                <strong>To:</strong> {dc.receiverName}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                <strong>From:</strong> {dc.senderName}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                <strong>Transporter:</strong> {dc.transporterName || 'N/A'}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                <button type="button" onClick={() => setViewDc(dc)} style={{
                  background: '#f9f9fb', color: '#6b7280', border: '1px solid #e4e4e7', borderRadius: '6px', padding: '0.45rem',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', flex: 1
                }}>
                  👁️ View Details
                </button>
                <button type="button" onClick={() => setSelectedDc(dc.id)} style={{
                  background: '#d97706', color: 'white', border: 'none', borderRadius: '6px', padding: '0.45rem',
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', flex: 1
                }}>
                  🔗 Merge
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brand-amber)' }}>
              Merging into DC #{dispatches.find(d => d.id === selectedDc)?.dcNo}
            </span>
            <button type="button" onClick={() => setSelectedDc(null)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Cancel</button>
          </div>
          <ItemsTable items={items} setItems={setItems} title="Items to Merge" />
          <button type="button" onClick={handleSubmit} className="btn btn--primary" style={{ width: '100%', marginTop: 'var(--space-2)' }} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Send Merge Request'}
          </button>
        </div>
      )}
      {viewDc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#172025' }}>DC #{viewDc.dcNo} Details</h3>
              <button onClick={() => setViewDc(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div><strong>Date:</strong> {viewDc.dcDate}</div>
              <div><strong>Sender:</strong> {viewDc.senderName} ({viewDc.senderPhone || 'No Phone'})</div>
              <div><strong>Sender Email:</strong> {viewDc.requesterEmail || 'N/A'}</div>
              <div><strong>Receiver:</strong> {viewDc.receiverName} ({viewDc.receiverPhone || 'No Phone'})</div>
              <div><strong>To Address:</strong> {viewDc.toAddress}</div>
              <div><strong>Transporter:</strong> {viewDc.transporterName || 'N/A'}</div>
              <div><strong>No. of Boxes:</strong> {viewDc.noOfBoxes}</div>
              <div><strong>Items Count:</strong> {viewDc.items?.length || 0}</div>
            </div>
            <button onClick={() => { setSelectedDc(viewDc.id); setViewDc(null); }} className="btn btn--primary" style={{ marginTop: '0.5rem', width: '100%' }}>
              Merge into this DC
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- AllDispatchesHistory Component --- */
function AllDispatchesHistory({ onRefill }) {
  const { employeeEmail } = useAuth();
  const toast = useToast();
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDc, setViewDc] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await employeeApi.getAllCourierDispatches();
      setDispatches(data || []);
    } catch {
      toast.error('Failed to fetch dispatches list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const todayStr = new Date().toISOString().slice(0, 10);

  async function handleDeleteDc(dc) {
    const hasMerge = dc.mergeRequests && dc.mergeRequests.length > 0;
    const msg = hasMerge
      ? `⚠️ DC #${dc.dcNo} has ${dc.mergeRequests.length} merge request(s). Deleting will cancel them and notify the requesters.\n\nAre you sure you want to delete this DC?`
      : `Are you sure you want to delete DC #${dc.dcNo}? This action cannot be undone.`;
    
    if (!window.confirm(msg)) return;
    
    setDeleting(true);
    try {
      await employeeApi.deleteCourierDispatch(dc.id);
      toast.success(`DC #${dc.dcNo} deleted successfully.`);
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Failed to delete DC.');
    } finally {
      setDeleting(false);
    }
  }

  function formatDateDMY(dStr) {
    if (!dStr) return '—';
    const parts = dStr.slice(0, 10).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
  }

  const filtered = dispatches.filter(d => {
    // Restrict to the logged-in employee's email
    const isMine = !employeeEmail || (d.requesterEmail && d.requesterEmail.toLowerCase() === employeeEmail.toLowerCase());
    if (!isMine) return false;

    const q = search.toLowerCase();
    return (
      (d.dcNo || '').toLowerCase().includes(q) ||
      (d.senderName || '').toLowerCase().includes(q) ||
      (d.receiverName || '').toLowerCase().includes(q) ||
      (d.toAddress || '').toLowerCase().includes(q) ||
      (d.transporterName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#172025' }}>
            📋 My Delivery Challans & History
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#6b7280' }}>
            View Delivery Challans submitted by you. Submissions created today can be <strong>Recalled & Refilled</strong>.
          </p>
        </div>
        <input
          type="text"
          className="form-input"
          placeholder="🔍 Search DC No, Receiver, City..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
          No Delivery Challans found for your account ({employeeEmail}).
        </div>
      ) : (
        <div className="table-wrapper" style={{ maxHeight: '550px', overflowY: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f9f9fb', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                <th>DC #</th>
                <th>Date (DD/MM/YYYY)</th>
                <th>Submitted By / Sender</th>
                <th>Receiver</th>
                <th>Destination</th>
                <th>Transporter</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const dcDateStr = (d.dcDate || '').slice(0, 10);
                const isSubmittedToday = dcDateStr === todayStr;

                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 800, color: '#172025' }}>#{d.dcNo}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: '#d97706' }}>
                      {formatDateDMY(d.dcDate)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{d.senderName || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{d.requesterEmail || ''}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{d.receiverName || '—'}</div>
                      {d.receiverPhone && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>📞 {d.receiverPhone}</div>}
                    </td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.toAddress}>
                      {d.toAddress || '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{d.transporterName || '—'}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                        background: d.status === 'Dispatched' ? '#dcfce7' : d.status === 'Approved' ? '#fef3c7' : '#e4e4e7',
                        color: d.status === 'Dispatched' ? '#16a34a' : d.status === 'Approved' ? '#d97706' : '#6b7280',
                      }}>
                        {d.status || 'Submitted'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn--sm btn--outline"
                          onClick={() => setViewDc(d)}
                          title="View Details"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          👁️ View
                        </button>
                        {isSubmittedToday ? (
                          <>
                            {d.mergeRequests && d.mergeRequests.length > 0 && (
                              <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700, padding: '4px 6px', background: '#fef2f2', borderRadius: '6px' }} title="This DC has merge requests that will be cancelled on recall">
                                ⓘ {d.mergeRequests.length} Merge
                              </span>
                            )}
                            <button
                              type="button"
                              className="btn btn--sm btn--primary"
                              onClick={() => onRefill(d)}
                              title="Recall data and refill form for editing"
                              style={{ background: '#d97706', borderColor: '#d97706', color: '#ffffff', padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              🔄 Recall & Refill
                            </button>
                            <button
                              type="button"
                              className="btn btn--sm"
                              onClick={() => handleDeleteDc(d)}
                              title="Delete this DC (current day only)"
                              style={{ background: '#dc2626', borderColor: '#dc2626', color: '#ffffff', padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              🗑️ Delete
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#aab2b2', padding: '4px 6px' }}>Past Date</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewDc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#172025', fontWeight: 800 }}>
                📋 Delivery Challan #{viewDc.dcNo}
              </h3>
              <button onClick={() => setViewDc(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#172025', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div><strong>Date (DD/MM/YYYY):</strong> <span style={{ color: '#d97706', fontWeight: 700 }}>{formatDateDMY(viewDc.dcDate)}</span></div>
              <div><strong>Sender / Employee:</strong> {viewDc.senderName} ({viewDc.senderPhone || 'No Phone'})</div>
              <div><strong>Requester Email:</strong> {viewDc.requesterEmail || 'N/A'}</div>
              <div><strong>Receiver Name:</strong> {viewDc.receiverName} ({viewDc.receiverPhone || 'No Phone'})</div>
              <div><strong>Destination Address:</strong> {viewDc.toAddress}</div>
              <div><strong>Transporter Name:</strong> {viewDc.transporterName || '—'}</div>
              <div><strong>Transporter Fee:</strong> ₹{viewDc.transporterAmount || 0}</div>
              <div><strong>Courier Billing:</strong> {viewDc.courierBilling || '—'}</div>
              <div><strong>Signatory Entity:</strong> {viewDc.signatoryCompany || '—'}</div>
              <div><strong>Items Count:</strong> {viewDc.items?.length || 0} items</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {((viewDc.dcDate || '').slice(0, 10) === todayStr) && (
                <>
                  <button
                    type="button"
                    className="btn btn--primary"
                    style={{ flex: 1, background: '#d97706', borderColor: '#d97706' }}
                    onClick={() => { setViewDc(null); onRefill(viewDc); }}
                  >
                    🔄 Recall & Refill Form
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ flex: 1, background: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
                    onClick={() => { setViewDc(null); handleDeleteDc(viewDc); }}
                  >
                    🗑️ Delete DC
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn--outline"
                style={{ flex: 1 }}
                onClick={() => setViewDc(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- CourierDispatchForm --- */
function CourierDispatchForm({ form, setForm, errors, onTabChange }) {
  const { employeeEmail } = useAuth();
  const [activeTab, setActiveTab] = useState('challan');
  const [items, setItems] = useState(form.items || [{ itemCode: '', description: '', serialNo: '', qty: 1, rate: 0, value: 0 }]);
  const [boxes, setBoxes] = useState(form.boxes || [{ weight: '', dim: '' }]);

  function switchTab(tab) {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  }

  function handleRecallAndRefill(dc) {
    const today = new Date().toISOString().slice(0, 10);
    const refilledItems = dc.items && dc.items.length > 0
      ? dc.items.map(it => ({
          itemCode: it.itemCode || '',
          description: it.description || '',
          serialNo: it.serialNo || '',
          qty: it.qty || 1,
          rate: it.rate || 0,
          value: it.value || 0
        }))
      : [{ itemCode: '', description: '', serialNo: '', qty: 1, rate: 0, value: 0 }];

    // Parse dimensions - it's stored as JSON string in DB e.g. [{"dim":"10x10","weight":"2kg"}]
    let refilledBoxes = [{ weight: '', dim: '' }];
    if (dc.dimensions) {
      try {
        const parsed = JSON.parse(dc.dimensions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          refilledBoxes = parsed.map(b => ({ dim: b.dim || '', weight: b.weight || '' }));
        }
      } catch {
        // If not valid JSON, treat as single box plain text
        refilledBoxes = [{ weight: dc.weight || '', dim: dc.dimensions || '' }];
      }
    }

    setForm(f => ({
      ...f,
      _recalledDcId: dc.id,  // Store the ID for update instead of create
      _recalledDcNo: dc.dcNo,
      _hasMergeRequests: (dc.mergeRequests && dc.mergeRequests.length > 0),
      dcNo: dc.dcNo || f.dcNo,
      dcDate: dc.dcDate || today,
      remarksType: dc.remarksType || 'Service',
      remarksOther: dc.remarksOther || '',
      transporterSelect: ['Dxpress', 'Bluedart', 'Professional Courier', 'DTDC', 'Delhivery'].includes(dc.transporterName) ? dc.transporterName : (dc.transporterName ? 'Other' : ''),
      transporterName: dc.transporterName || '',
      transporterAmount: dc.transporterAmount || '',
      courierBilling: dc.courierBilling || 'Avana Medical Devices Pvt. Ltd.',
      signatoryCompany: dc.signatoryCompany || 'Avana Medical Devices Pvt. Ltd.',
      senderName: dc.senderName || '',
      senderPhone: dc.senderPhone || '',
      fromAddressText: dc.fromAddressText || '',
      receiverName: dc.receiverName || '',
      receiverPhone: dc.receiverPhone || '',
      toAddress: dc.toAddress || '',
      declaration: !!dc.declaration,
      items: refilledItems,
      boxes: refilledBoxes,
      noOfBoxes: refilledBoxes.length,
    }));

    setItems(refilledItems);
    setBoxes(refilledBoxes);
    switchTab('challan');
  }

  useEffect(() => {
    if (!form.dcNo) {
      fetch('/api/employee/courier-dispatch/next-dc')
        .then(res => res.json())
        .then(data => { if (data.dcNo) setForm(f => ({ ...f, dcNo: data.dcNo })); })
        .catch(err => console.error(err));
    }
  }, []);

  const updateItems = (newItems) => { setItems(newItems); setForm(f => ({ ...f, items: newItems })); };
  const updateBoxes = (newBoxes) => { setBoxes(newBoxes); setForm(f => ({ ...f, boxes: newBoxes, noOfBoxes: newBoxes.length })); };

  const tabStyle = (active) => ({
    padding: 'var(--space-3) var(--space-5)',
    fontWeight: 700, fontSize: '0.9rem',
    border: 'none', cursor: 'pointer', transition: 'all 0.2s',
    borderBottom: active ? '2.5px solid var(--brand-amber)' : '2.5px solid transparent',
    color: active ? 'var(--brand-amber)' : 'var(--color-text-muted)',
    background: 'transparent',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <button type="button" style={tabStyle(activeTab === 'challan')} onClick={() => switchTab('challan')}>
          Delivery Challan Form
        </button>
        <button type="button" style={tabStyle(activeTab === 'label')} onClick={() => switchTab('label')}>
          Shipping Label
        </button>
        <button type="button" style={tabStyle(activeTab === 'all-dcs')} onClick={() => switchTab('all-dcs')}>
          📋 My DCs & Recall
        </button>
      </div>

      {activeTab === 'label' && <ShippingLabelForm userEmail={employeeEmail} />}

      {activeTab === 'all-dcs' && <AllDispatchesHistory onRefill={handleRecallAndRefill} />}

      {activeTab === 'challan' && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        {/* Recall Edit Banner */}
        {form._recalledDcId && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, #fef3c7, #fffbeb)',
            border: '1.5px solid #d97706',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.15)'
          }}>
            <span style={{ fontSize: '1.3rem' }}>🔄</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#d97706' }}>
                Editing Recalled DC #{form._recalledDcNo}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#78350f', marginTop: '2px' }}>
                Submitting will update the existing record instead of creating a new one.
                {form._hasMergeRequests && (
                  <strong style={{ color: '#dc2626' }}> ⚠️ This DC has merge requests — they will be cancelled on update.</strong>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => {
                const { _recalledDcId, _recalledDcNo, _hasMergeRequests, ...rest } = f;
                return rest;
              })}
              style={{ background: 'none', border: '1px solid #d97706', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, color: '#d97706', cursor: 'pointer' }}
              title="Cancel recall mode and create a fresh DC instead"
            >
              Cancel Recall
            </button>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <FormField label="Delivery Challan No" required htmlFor="cd-dc-no">
            <input id="cd-dc-no" type="text" className="form-input" style={{ fontWeight: 'bold' }}
              value={form.dcNo || ''} onChange={e => setForm(f => ({ ...f, dcNo: e.target.value }))} required />
          </FormField>
          <FormField label="Delivery Challan Date" required htmlFor="cd-date">
            <input id="cd-date" type="date" className="form-input" value={form.dcDate || new Date().toISOString().slice(0,10)}
              onChange={e => setForm(f => ({ ...f, dcDate: e.target.value }))} />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <FormField label="Shipment Category / Remarks" required htmlFor="cd-remarks">
            <select id="cd-remarks" className="form-select" value={form.remarksType || 'Service'}
              onChange={e => setForm(f => ({ ...f, remarksType: e.target.value }))}>
              <option value="Stationery">Stationery</option>
              <option value="Glass item">Glass item</option>
              <option value="Service">Service</option>
              <option value="Demo">Demo</option>
              <option value="Others">Others (Specify)</option>
            </select>
            {form.remarksType === 'Others' && (
              <input type="text" className="form-input" placeholder="Specify other remarks..." style={{ marginTop: '0.5rem' }}
                value={form.remarksOther || ''} onChange={e => setForm(f => ({ ...f, remarksOther: e.target.value }))} required />
            )}
          </FormField>
          <FormField label="Transporter Name" required htmlFor="cd-transporter">
            <select id="cd-transporter" className="form-select" value={form.transporterSelect || ''}
              onChange={e => {
                const val = e.target.value;
                setForm(f => ({
                  ...f,
                  transporterSelect: val,
                  transporterName: val === 'Other' ? (f.transporterName || '') : val
                }));
              }}>
              <option value="">Select Transporter</option>
              <option value="Dxpress">Dxpress</option>
              <option value="Bluedart">Bluedart</option>
              <option value="Professional Courier">Professional Courier</option>
              <option value="DTDC">DTDC</option>
              <option value="Delhivery">Delhivery</option>
              <option value="Other">Other (Specify)</option>
            </select>
            {form.transporterSelect === 'Other' && (
              <input type="text" className="form-input" placeholder="Enter transporter name..." style={{ marginTop: '0.5rem' }}
                value={form.transporterName || ''} onChange={e => setForm(f => ({ ...f, transporterName: e.target.value }))} required />
            )}
            {form.transporterSelect && (
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Transporter Amount (Optional)</label>
                <input type="number" className="form-input" placeholder="e.g. 150" min="0" step="any"
                  value={form.transporterAmount || ''} onChange={e => setForm(f => ({ ...f, transporterAmount: e.target.value }))} />
              </div>
            )}
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <FormField label="Courier Billing" required htmlFor="cd-billing">
            <select id="cd-billing" className="form-select" value={form.courierBilling || ''}
              onChange={e => setForm(f => ({ ...f, courierBilling: e.target.value }))}>
              <option value="">Select Billing Entity</option>
              <option value="Avana Medical Devices Pvt. Ltd.">Avana Medical Devices Pvt. Ltd.</option>
              <option value="Avana Surgical Systems Pvt. Ltd.">Avana Surgical Systems Pvt. Ltd.</option>
              <option value="Avana Technology Services Pvt. Ltd.">Avana Technology Services Pvt. Ltd.</option>
            </select>
          </FormField>
          <FormField label="Authority Signatory Company" required htmlFor="cd-signatory">
            <select id="cd-signatory" className="form-select" value={form.signatoryCompany || 'Avana Medical Devices Pvt. Ltd.'}
              onChange={e => setForm(f => ({ ...f, signatoryCompany: e.target.value }))}>
              <option value="Avana Medical Devices Pvt. Ltd.">Avana Medical Devices Pvt. Ltd.</option>
              <option value="Avana Surgical Systems Pvt. Ltd.">Avana Surgical Systems Pvt. Ltd.</option>
              <option value="Avana Technology Services Pvt. Ltd.">Avana Technology Services Pvt. Ltd.</option>
              <option value="None">None</option>
            </select>
          </FormField>
        </div>

        <AddressInputSection
          title="From Address"
          nameKey="senderName"
          phoneKey="senderPhone"
          addressKey="fromAddressText"
          form={form}
          setForm={setForm}
          errors={errors}
          userEmail={employeeEmail}
        />

        <AddressInputSection
          title="Destination / To Address"
          nameKey="receiverName"
          phoneKey="receiverPhone"
          addressKey="toAddress"
          form={form}
          setForm={setForm}
          errors={errors}
          userEmail={employeeEmail}
        />

        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          background: form.isFragile ? '#fdf5e6' : 'var(--color-surface-2)',
          border: `1.5px dashed ${form.isFragile ? '#d97706' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)',
          transition: 'all 0.2s'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', fontWeight: 600, fontSize: '0.92rem' }}>
            <input
              type="checkbox"
              checked={!!form.isFragile}
              onChange={e => setForm(f => ({ ...f, isFragile: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: '#d97706' }}
            />
            <span style={{ color: form.isFragile ? '#d97706' : 'var(--color-text)' }}>
              ⚠️ Add Fragile Warning Label (Include Fragile graphic in parcel shipping label)
            </span>
          </label>
        </div>

        <ItemsTable items={items} setItems={updateItems} />

        <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Box Details (Dimensions & Weight)</h4>
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {boxes.map((bx, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, width: 45 }}>Box {idx + 1}</span>
                <input type="text" className="form-input" placeholder="Dimensions (optional)" value={bx.dim || ''}
                  onChange={e => { const arr = [...boxes]; arr[idx].dim = e.target.value; updateBoxes(arr); }} style={{ flex: 1 }} />
                <input type="text" className="form-input" placeholder="Weight (optional)" value={bx.weight || ''}
                  onChange={e => { const arr = [...boxes]; arr[idx].weight = e.target.value; updateBoxes(arr); }} style={{ flex: 1 }} />
                {boxes.length > 1 && (
                  <button type="button" onClick={() => updateBoxes(boxes.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '0.4rem', fontSize: '1.2rem', lineHeight: 1 }}>&times;</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn btn--secondary" style={{ marginTop: 'var(--space-3)' }} onClick={() => updateBoxes([...boxes, { weight: '', dim: '' }])}>
            + Add Box
          </button>
        </div>

        <div style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2)', background: 'var(--color-surface-alt)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.declaration || false} onChange={e => setForm(f => ({ ...f, declaration: e.target.checked }))} style={{ marginTop: '4px' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>
              <strong>Include Demo Declaration line in DC Copy PDF:</strong><br />
              "Declaration: This is to confirm that goods containing in the parcel are surgical goods used for Demo purpose Not for Sale."
            </span>
          </label>
        </div>
        </div>

        {/* Merge Request Sidebar */}
        <div style={{ flex: '0 0 320px', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', position: 'sticky', top: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--brand-amber)' }}>Merge Parcel</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Combine your dispatch with an existing one to save shipping costs.</p>
          <CourierMergeForm userEmail={employeeEmail} />
        </div>
      </div>
      )}
    </div>
  );
}


/* ─── Helpdesk Dashboard ────────────────────────────────────── */
function HelpdeskDashboard() {
  const { employeeEmail } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  function openCategory(cat) {
    if (cat.restricted && employeeEmail !== RESTRICTED_EMAIL) {
      toast.warning('This section is restricted to authorized personnel only.');
      return;
    }
    if (cat.link) {
      navigate(cat.link);
      return;
    }
    navigate(`/helpdesk/${cat.key}`);
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="🏠 Help Desk"
        subtitle={`Welcome back, ${employeeEmail?.split('@')[0] || 'Employee'}! How can we help you today?`}
      />

      {/* ── Category Cards Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 'var(--space-5)',
        marginBottom: 'var(--space-8)',
      }}>
        {CATEGORIES.map(cat => {
          const isRestricted = cat.restricted && employeeEmail !== RESTRICTED_EMAIL;
          if (isRestricted) return null; // Hide restricted cards entirely

          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => openCategory(cat)}
              aria-label={cat.label}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                textAlign: 'left',
                padding: 0,
                overflow: 'hidden',
                transition: 'all var(--transition-base)',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              {/* Top accent bar */}
              <div style={{ height: 4, background: cat.color, width: '100%' }} />
              <div style={{ padding: 'var(--space-5)' }}>
                <div style={{
                  width: 44, height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: `${cat.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem',
                  marginBottom: 'var(--space-3)',
                }}>
                  {cat.icon}
                </div>
                <div style={{
                  fontWeight: 700, fontSize: '0.95rem',
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-2)',
                }}>
                  {cat.label}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  {cat.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <RequestTracker />
      <ChangePasswordPanel />
    </div>
  );
}

/* ─── Helpdesk Request View ─────────────────────────────────── */
function HelpdeskRequestView() {
  const { categoryKey } = useParams();
  const { employeeEmail } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [courierTab, setCourierTab] = useState('challan'); // tracks tab inside CourierDispatchForm

  const activeCat = CATEGORIES.find(c => c.key === categoryKey);

  useEffect(() => {
    if (activeCat?.restricted && employeeEmail !== RESTRICTED_EMAIL) {
      toast.warning('This section is restricted.');
      navigate('/helpdesk', { replace: true });
    }
  }, [activeCat, employeeEmail, navigate, toast]);

  if (!activeCat) {
    return <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>Category not found.</div>;
  }

  /* Validate based on category */
  function validateForm(category, form) {
    const e = {};
    if (category !== 'courier_dispatch') {
      if (!form.requester_phone?.trim()) {
        e.requester_phone = 'Phone number is required';
      } else if (!/^[6-9]\d{9}$/.test(form.requester_phone.trim())) {
        e.requester_phone = 'Phone must be a valid 10-digit mobile number';
      }
    }

    if (category === 'maintenance') {
      if (!form.issue_type) e.issue_type = 'Issue type is required';
      if (!form.floor) e.floor = 'Floor is required';
      if (!form.description?.trim()) e.description = 'Exact issue is required';
    } else if (category === 'housekeeping') {
      if (!form.request_type) e.request_type = 'Request type is required';
      if (!form.floor) e.floor = 'Floor is required';
      if (!form.description?.trim()) e.description = 'Exact query is required';
    } else if (category === 'hk_material') {
      if (!form.items?.length) e.items = 'Select at least one item';
      if (!form.floor) e.floor = 'Floor is required';
      if (form.items?.some(s => s.name === 'Other') && !form.remarks?.trim()) {
        e.remarks = 'Remarks required when Other is selected';
      }
    } else if (category === 'stationery') {
      if (!form.items?.length) e.items = 'Select at least one item';
      if (!form.floor) e.floor = 'Floor is required';
    } else if (category === 'office_asset') {
      if (!form.request_type) e.request_type = 'Request type is required';
      if (!form.floor) e.floor = 'Floor is required';
      if (!form.description?.trim()) e.description = 'Exact query is required';
    } else if (category === 'print_scan') {
      if (!form.service_type) e.service_type = 'Service type is required';
      if (!form.description?.trim()) e.description = 'Exact query is required';
    } else if (category === 'admin_support') {
      if (!form.support_type) e.support_type = 'Support type is required';
      if (!form.description?.trim()) e.description = 'Description is required';
    } else if (category === 'courier_dispatch') {
      if (!form.dcNo?.trim()) e.dcNo = 'Challan Number is required';
      if (!form.senderName?.trim()) e.senderName = 'Sender name is required';
      if (!form.senderPhone?.trim()) {
        e.senderPhone = 'Sender phone is required';
      } else if (!/^[6-9]\d{9}$/.test(form.senderPhone.trim())) {
        e.senderPhone = 'Phone must be a valid 10-digit mobile number';
      }
      if (!form.receiverName?.trim()) e.receiverName = 'Receiver name is required';
      if (!form.toAddress?.trim()) e.toAddress = 'Destination address is required';
    } else if (category === 'app_feedback') {
      if (!form.exact_query) e.exact_query = 'Feedback type is required';
      if (!form.description?.trim()) e.description = 'Description is required';
    }
    return e;
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    const errs = validateForm(categoryKey, formData);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      if (categoryKey === 'courier_dispatch') {
        const payload = {
          requesterEmail: employeeEmail,
          ...formData,
          senderName: formData.senderName || employeeEmail?.split('@')[0] || 'Employee'
        };

        if (formData._recalledDcId) {
          // Updating an existing DC (Recall & Refill)
          if (formData._hasMergeRequests) {
            toast.warning(`⚠️ DC #${formData._recalledDcNo} had merge requests. They will be cancelled and the requesters will be notified to create their own DC.`);
          }
          await employeeApi.updateCourierDispatch(formData._recalledDcId, payload);
          toast.success(`Delivery Challan #${formData._recalledDcNo} updated successfully! 📦`);
        } else {
          await employeeApi.createCourierDispatch(payload);
          toast.success('Courier dispatch request & Delivery Challan created! 📦');
        }
      } else {
        const payload = {
          category: categoryKey,
          requester_name: employeeEmail?.split('@')[0] || '',
          requester_email: employeeEmail || '',
          ...formData,
          items: formData.items ? JSON.stringify(formData.items) : undefined,
        };
        await helpdeskApi.submit(payload);
        toast.success('Request submitted successfully! ✅');
      }
      navigate('/helpdesk');
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  function renderForm() {
    const props = { form: formData, setForm: setFormData, errors };
    switch (categoryKey) {
      case 'maintenance':      return <MaintenanceForm {...props} />;
      case 'housekeeping':     return <HousekeepingForm {...props} />;
      case 'hk_material':      return <HkMaterialForm {...props} />;
      case 'stationery':       return <StationeryForm {...props} />;
      case 'office_asset':     return <OfficeAssetForm {...props} />;
      case 'print_scan':       return <PrintScanForm {...props} />;
      case 'admin_support':    return <AdminSupportForm {...props} />;
      case 'courier_dispatch': return <CourierDispatchForm {...props} onTabChange={setCourierTab} />;
      case 'app_feedback':     return <AppFeedbackForm {...props} />;
      default: return null;
    }
  }

  // On the Shipping Label tab, the form manages its own submission — hide outer form chrome
  const isLabelTab = categoryKey === 'courier_dispatch' && courierTab === 'label';

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: categoryKey === 'courier_dispatch' ? 1200 : 800, margin: '0 auto', width: '100%' }}>
      <Breadcrumbs items={[{ label: 'Home', link: '/helpdesk' }, { label: activeCat.label }]} />
      
      <PageHeader 
        title={<span>{activeCat.icon} {activeCat.label}</span>} 
        subtitle={activeCat.desc} 
      />

      <div className="card">
        <form 
          onSubmit={handleSubmit} 
          onKeyDown={e => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }} 
          noValidate
        >
          {/* Requester info — hidden on shipping label tab */}
          {!isLabelTab && (
            <div style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-5)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-3)',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Name</div>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={employeeEmail?.split('@')[0]}>
                  {employeeEmail?.split('@')[0] || '—'}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Email</div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', wordBreak: 'break-word', overflowWrap: 'break-word' }} title={employeeEmail}>
                  {employeeEmail || '—'}
                </div>
              </div>
              <div>
                <FormField label="Phone Number" required htmlFor="hd-req-phone" error={errors.requester_phone} style={{ marginBottom: 0 }}>
                  <input
                    id="hd-req-phone"
                    type="tel"
                    className={`form-input${errors.requester_phone ? ' form-input--error' : ''}`}
                    placeholder="e.g. 9876543210"
                    value={formData.requester_phone || ''}
                    onChange={e => setFormData(d => ({ ...d, requester_phone: e.target.value }))}
                  />
                </FormField>
              </div>
            </div>
          )}

          {renderForm()}

          {/* Submit/Cancel buttons — hidden on shipping label tab (which has its own submit) */}
          {!isLabelTab && (
            <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => navigate('/helpdesk')}>
                Cancel
              </button>
              <button
                type="submit"
                className={`btn btn--primary${submitting ? ' btn--loading' : ''}`}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

/* ─── Main HelpDeskPage ───────────────────────────────────── */
export default function HelpDeskPage() {
  useEffect(() => {
    document.title = 'Help Desk | Avana';
  }, []);

  return (
    <Routes>
      <Route index element={<HelpdeskDashboard />} />
      <Route path=":categoryKey" element={<HelpdeskRequestView />} />
    </Routes>
  );
}
