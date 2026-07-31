import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { employeeApi, helpdeskApi, courierApi } from '../lib/api';
import {
  Badge, Spinner, EmptyState, Alert, Modal, ConfirmModal,
  FormField, PageHeader, StatCard,
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
    color: '#2563eb',
    link: '/booking',
  },
  {
    key: 'stationery',
    label: 'Stationery Request',
    icon: '✏️',
    desc: 'Order office stationery and printing materials',
    color: '#7c3aed',
  },
  {
    key: 'hk_material',
    label: 'Housekeeping Material',
    icon: '🧴',
    desc: 'Request cleaning and housekeeping supplies',
    color: '#0891b2',
    restricted: true,
  },
  {
    key: 'admin_support',
    label: 'Admin Support',
    icon: '💼',
    desc: 'Get assistance from the admin team',
    color: '#c17f24',
  },
  {
    key: 'maintenance',
    label: 'Maintenance Complaint',
    icon: '🔧',
    desc: 'Report and track maintenance issues',
    color: '#dc2626',
  },
  {
    key: 'housekeeping',
    label: 'Housekeeping Request',
    icon: '🧹',
    desc: 'Request cleaning and waste removal services',
    color: '#16a34a',
  },
  {
    key: 'office_asset',
    label: 'Office Asset Request',
    icon: '🖥️',
    desc: 'Request new equipment or furniture',
    color: '#9333ea',
  },
  {
    key: 'print_scan',
    label: 'Printing & Scanning',
    icon: '🖨️',
    desc: 'Bulk printing, scanning, binding and lamination',
    color: '#0f766e',
  },
  {
    key: 'courier_dispatch',
    label: 'Courier & Dispatch',
    icon: '📦',
    desc: 'Generate Delivery Challan (DC) and request courier dispatch',
    color: '#ea580c',
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
  const { employeeToken } = useAuth();
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.current) errs.current = 'Current password is required';
    if (!form.newPass || form.newPass.length < 6) errs.newPass = 'New password must be at least 6 characters';
    if (form.newPass !== form.confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      await fetch('/api/employee/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${employeeToken}`,
        },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.newPass }),
      }).then(async res => {
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
        return res.json();
      });
      toast.success('Password changed successfully!');
      setForm({ current: '', newPass: '', confirm: '' });
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
        🔑 Change Password
      </h3>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'var(--space-4)' }}>
          <FormField label="Current Password" required htmlFor="cp-current" error={errors.current}>
            <input id="cp-current" type="password" className={`form-input${errors.current ? ' form-input--error' : ''}`}
              value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
          </FormField>
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
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </form>
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
  function toggleItem(item) {
    const exists = selected.find(s => s.name === item);
    if (exists) {
      onChange(selected.filter(s => s.name !== item));
    } else {
      onChange([...selected, { name: item, qty: 1 }]);
    }
  }
  function updateQty(item, qty) {
    onChange(selected.map(s => s.name === item ? { ...s, qty: Math.max(1, Number(qty)) } : s));
  }

  return (
    <div>
      <label className="form-label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>{label}</label>
      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        maxHeight: 240,
        overflowY: 'auto',
        background: 'var(--color-surface)',
      }}>
        {items.map(item => {
          const sel = selected.find(s => s.name === item);
          return (
            <div key={item} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-4)',
              borderBottom: '1px solid var(--color-border-light)',
              background: sel ? 'var(--brand-amber-bg)' : 'transparent',
              transition: 'background var(--transition-fast)',
            }}>
              <input
                type="checkbox"
                id={`item-${item.replace(/\s+/g, '-')}`}
                checked={!!sel}
                onChange={() => toggleItem(item)}
                style={{ accentColor: 'var(--brand-amber)', cursor: 'pointer' }}
              />
              <label
                htmlFor={`item-${item.replace(/\s+/g, '-')}`}
                style={{ flex: 1, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                {item}
              </label>
              {sel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <button type="button" className="btn btn--ghost btn--sm"
                    onClick={() => updateQty(item, sel.qty - 1)} aria-label={`Decrease ${item} qty`}>−</button>
                  <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600 }}>{sel.qty}</span>
                  <button type="button" className="btn btn--ghost btn--sm"
                    onClick={() => updateQty(item, sel.qty + 1)} aria-label={`Increase ${item} qty`}>+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
          {selected.length} item{selected.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}

/* ─── Category Forms ──────────────────────────────────────── */
function MaintenanceForm({ form, setForm, errors }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <FormField label="Issue Type" required htmlFor="maint-type" error={errors.issue_type}>
          <select id="maint-type" className="form-select" value={form.issue_type || ''}
            onChange={e => setForm(f => ({ ...f, issue_type: e.target.value }))}>
            <option value="">Select issue type</option>
            {['AC not working','Light-Fan issue','Electrical problem','Plumbing issue','Furniture repair','Office equipment issue'].map(o => (
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
            {['Cleaning request','Waste removal'].map(o => <option key={o} value={o}>{o}</option>)}
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
            {['Chair-Table requirement','New equipment request','Replacement request'].map(o =>
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
            {['Bulk printing','Scanning','Binding-Lamination'].map(o => <option key={o} value={o}>{o}</option>)}
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
            {['Safety Concern','Pantry-Refreshment','Courier-Dispatch','Event-Celebration','Lost-Found','Feedback-Suggestions','Other'].map(o =>
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

function CourierDispatchForm({ form, setForm, errors }) {
  const [items, setItems] = useState(form.items || [{ description: '', serialNo: '', qty: 1, rate: 0 }]);

  const updateItems = (newItems) => {
    setItems(newItems);
    setForm(f => ({ ...f, items: newItems }));
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <FormField label="Challan Date" required htmlFor="cd-date">
          <input id="cd-date" type="date" className="form-input" value={form.dcDate || new Date().toISOString().slice(0,10)}
            onChange={e => setForm(f => ({ ...f, dcDate: e.target.value }))} />
        </FormField>
        <FormField label="Billing Entity" required htmlFor="cd-billing">
          <select id="cd-billing" className="form-select" value={form.courierBilling || 'Avana Medical Devices Pvt Ltd'}
            onChange={e => setForm(f => ({ ...f, courierBilling: e.target.value }))}>
            <option value="Avana Medical Devices Pvt Ltd">Avana Medical Devices Pvt Ltd</option>
            <option value="Avana Technology Services Pvt Ltd">Avana Technology Services Pvt Ltd</option>
          </select>
        </FormField>
        <FormField label="Category / Remarks" required htmlFor="cd-remarks">
          <select id="cd-remarks" className="form-select" value={form.remarksType || 'Service'}
            onChange={e => setForm(f => ({ ...f, remarksType: e.target.value }))}>
            <option value="Stationery">Stationery</option>
            <option value="Glass item">Glass item</option>
            <option value="Service">Service</option>
            <option value="Demo">Demo</option>
            <option value="Others">Others</option>
          </select>
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <FormField label="Receiver / Recipient Name" required htmlFor="cd-receiver" error={errors.receiverName}>
          <input id="cd-receiver" type="text" className="form-input" value={form.receiverName || ''}
            placeholder="Dr. John / Client Name"
            onChange={e => setForm(f => ({ ...f, receiverName: e.target.value }))} />
        </FormField>
        <FormField label="Receiver Phone" htmlFor="cd-rphone">
          <input id="cd-rphone" type="tel" className="form-input" value={form.receiverPhone || ''}
            placeholder="Recipient Contact Number"
            onChange={e => setForm(f => ({ ...f, receiverPhone: e.target.value }))} />
        </FormField>
      </div>

      <FormField label="Destination Address" required htmlFor="cd-address" error={errors.toAddress}>
        <textarea id="cd-address" className="form-textarea" rows={2} value={form.toAddress || ''}
          placeholder="Full delivery address with Pincode..."
          onChange={e => setForm(f => ({ ...f, toAddress: e.target.value }))} />
      </FormField>

      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
        📦 Dispatched Items
      </h4>
      {items.map((it, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
          <input type="text" className="form-input" placeholder="Item Description" required value={it.description}
            onChange={e => { const arr = [...items]; arr[idx].description = e.target.value; updateItems(arr); }} style={{ flex: 3 }} />
          <input type="text" className="form-input" placeholder="S/N" value={it.serialNo}
            onChange={e => { const arr = [...items]; arr[idx].serialNo = e.target.value; updateItems(arr); }} style={{ flex: 2 }} />
          <input type="number" className="form-input" placeholder="Qty" min="1" value={it.qty}
            onChange={e => { const arr = [...items]; arr[idx].qty = parseInt(e.target.value, 10) || 1; updateItems(arr); }} style={{ width: 70 }} />
          <input type="number" className="form-input" placeholder="Rate (₹)" min="0" value={it.rate}
            onChange={e => { const arr = [...items]; arr[idx].rate = parseFloat(e.target.value) || 0; updateItems(arr); }} style={{ width: 100 }} />
          {items.length > 1 && (
            <button type="button" className="btn btn--sm btn--danger" onClick={() => updateItems(items.filter((_, i) => i !== idx))}>✕</button>
          )}
        </div>
      ))}
      <button type="button" className="btn btn--sm btn--outline" onClick={() => updateItems([...items, { description: '', serialNo: '', qty: 1, rate: 0 }])} style={{ marginBottom: 'var(--space-4)' }}>
        ➕ Add Item
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
        <FormField label="Courier Vendor" htmlFor="cd-vendor">
          <input id="cd-vendor" type="text" className="form-input" placeholder="Dexpress / DTDC" value={form.transporterName || ''}
            onChange={e => setForm(f => ({ ...f, transporterName: e.target.value }))} />
        </FormField>
        <FormField label="Waybill / Docket No" htmlFor="cd-docket">
          <input id="cd-docket" type="text" className="form-input" placeholder="Tracking Number" value={form.docketNo || ''}
            onChange={e => setForm(f => ({ ...f, docketNo: e.target.value }))} />
        </FormField>
      </div>
    </>
  );
}

/* ─── Main HelpDeskPage ───────────────────────────────────── */
export default function HelpDeskPage() {
  const { employeeEmail, employeeToken } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [openModal, setOpenModal] = useState(null); // category key
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Help Desk | Avana';
  }, []);

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
      if (!form.receiverName?.trim()) e.receiverName = 'Receiver name is required';
      if (!form.toAddress?.trim()) e.toAddress = 'Destination address is required';
    }
    return e;
  }

  async function handleSubmit() {
    const errs = validateForm(openModal, formData);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      if (openModal === 'courier_dispatch') {
        await courierApi.create({
          requesterEmail: employeeEmail,
          senderName: employeeEmail?.split('@')[0] || 'Employee',
          ...formData
        });
        toast.success('Courier dispatch request & Delivery Challan created! 📦');
      } else {
        const payload = {
          category: openModal,
          requester_name: employeeEmail?.split('@')[0] || '',
          requester_email: employeeEmail || '',
          ...formData,
          items: formData.items ? JSON.stringify(formData.items) : undefined,
        };
        await helpdeskApi.submit(payload);
        toast.success('Request submitted successfully! ✅');
      }
      setOpenModal(null);
      setFormData({});
      setErrors({});
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  function openCategory(cat) {
    if (cat.restricted && employeeEmail !== RESTRICTED_EMAIL) {
      toast.warning('This section is restricted to authorized personnel only.');
      return;
    }
    if (cat.link) { navigate(cat.link); return; }
    setOpenModal(cat.key);
    setFormData({});
    setErrors({});
  }

  const activeCat = CATEGORIES.find(c => c.key === openModal);

  function renderForm() {
    const props = { form: formData, setForm: setFormData, errors };
    switch (openModal) {
      case 'maintenance':      return <MaintenanceForm {...props} />;
      case 'housekeeping':     return <HousekeepingForm {...props} />;
      case 'hk_material':      return <HkMaterialForm {...props} />;
      case 'stationery':       return <StationeryForm {...props} />;
      case 'office_asset':     return <OfficeAssetForm {...props} />;
      case 'print_scan':       return <PrintScanForm {...props} />;
      case 'admin_support':    return <AdminSupportForm {...props} />;
      case 'courier_dispatch': return <CourierDispatchForm {...props} />;
      default: return null;
    }
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
          if (isRestricted) return null; // Hide restricted cards entirely, matching legacy behavior

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

      {/* ── Request Tracker ── */}
      <RequestTracker />

      {/* ── Change Password ── */}
      <ChangePasswordPanel />

      {/* ── Category Modal ── */}
      {openModal && activeCat && (
        <Modal
          isOpen={!!openModal}
          onClose={() => { setOpenModal(null); setFormData({}); setErrors({}); }}
          title={`${activeCat.icon} ${activeCat.label}`}
          size="wide"
          footer={
            <>
              <button type="button" className="btn btn--secondary"
                onClick={() => { setOpenModal(null); setFormData({}); setErrors({}); }}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn--primary${submitting ? ' btn--loading' : ''}`}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </>
          }
        >
          {/* Requester info (readonly) */}
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

          {renderForm()}
        </Modal>
      )}
    </div>
  );
}
