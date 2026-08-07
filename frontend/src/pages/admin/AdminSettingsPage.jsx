import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import {
  helpdeskApi, stationeryApi, housekeepingApi, amcApi, utilityApi, taxApi, adminApi, globalAddressApi,
  assetTrackerApi, courierApi, pettyCashApi, travelApi, billWarrantyApi, otherStockApi, remindersApi,
} from '../../lib/api';
import {
  Badge, Spinner, EmptyState, Alert, Modal, ConfirmModal,
  FormField, PageHeader, StatCard,
} from '../../components/ui';
import { formatDate, formatDateTime, getStatusBadge, openLegacyPrintReport, CATEGORY_LABELS } from './utils';

export function LoginAuditPage() {
  const [logins, setLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.getLogins()
      .then(data => setLogins(data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="🔐 Employee Login Audit" subtitle="Track all employee login and logout events" />
      {error && <Alert type="error">{error}</Alert>}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
          : logins.length === 0 ? <EmptyState icon="🔐" title="No login records" />
          : (
            <div className="table-wrapper">
              <table className="table" aria-label="Employee login audit">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Email</th>
                    <th scope="col">Action</th>
                    <th scope="col">Date & Time</th>
                    <th scope="col">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logins.map((l, idx) => (
                    <tr key={l.id || idx}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 500 }}>{l.username || '—'}</td>
                      <td>
                        <Badge
                          status={l.status === 'success' ? 'approved' : 'pending'}
                          label={l.status || 'login'}
                        />
                      </td>
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatDateTime(l.timestamp)}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{l.ip || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}

/* ─── Admin Settings ──────────────────────────────────────── */
    </div>
  );
}

function GlobalAddressSettings() {
  const toast = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', address: '', label: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await globalAddressApi.getAll();
      setAddresses(data || []);
    } catch (err) {
      toast.error('Failed to load global addresses');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name || !form.address) { toast.warning('Name and Address are required'); return; }
    setSubmitting(true);
    try {
      await globalAddressApi.save(form);
      toast.success('Global address added!');
      setForm({ name: '', phone: '', address: '', label: '' });
      fetchAddresses();
    } catch (err) {
      toast.error(err.message || 'Failed to add address');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this global address?')) return;
    try {
      await globalAddressApi.delete(id);
      toast.success('Global address deleted');
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  }

  return (
    <div className="card" style={{ maxWidth: 800, marginTop: 'var(--space-6)' }}>
      <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-5)', fontSize: '1.1rem' }}>
        🏢 Global Address Book (Company Defaults)
      </h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-5)' }}>
        Addresses added here will be available to all employees in the Courier Dispatch form under "Company Addresses".
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-6)' }}>
        {/* Add Form */}
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', height: 'fit-content' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-4)' }}>Add New Address</h4>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <FormField label="Label (e.g. Head Office)" htmlFor="ga-label">
              <input id="ga-label" type="text" className="form-input" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            </FormField>
            <FormField label="Company Name" required htmlFor="ga-name">
              <input id="ga-name" type="text" className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Phone (Optional)" htmlFor="ga-phone">
              <input id="ga-phone" type="text" className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </FormField>
            <FormField label="Full Address" required htmlFor="ga-addr">
              <textarea id="ga-addr" className="form-textarea" rows="3" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </FormField>
            <button type="submit" className="btn btn--primary" disabled={submitting} style={{ marginTop: 'var(--space-2)' }}>
              {submitting ? 'Adding...' : 'Add Address'}
            </button>
          </form>
        </div>

        {/* List */}
        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-4)' }}>Current Global Addresses</h4>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}><Spinner /></div>
          ) : addresses.length === 0 ? (
            <EmptyState icon="📒" title="No global addresses" description="Add a default company address to get started." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {addresses.map(a => (
                <div key={a.id} style={{
                  padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                }}>
                  <div>
                    {a.label && <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-amber)', textTransform: 'uppercase' }}>{a.label}</div>}
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    {a.phone && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{a.phone}</div>}
                    <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', marginTop: 4 }}>{a.address}</div>
                  </div>
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => handleDelete(a.id)}>Del</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminSettings() {
  const toast = useToast();
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.current) errs.current = 'Current password required';
    if (!form.newPass || form.newPass.length < 6) errs.newPass = 'Must be at least 6 chars';
    if (form.newPass !== form.confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      await adminApi.changePassword(form.current, form.newPass);
      toast.success('Password changed successfully!');
      setForm({ current: '', newPass: '', confirm: '' });
      setErrors({});
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="⚙️ Portal Settings" subtitle="Manage admin credentials and portal configuration" />
      <div className="card" style={{ maxWidth: 600 }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-5)', fontSize: '1rem' }}>
          🔑 Change Admin Password
        </h3>
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <FormField label="Current Password" required htmlFor="set-curr" error={errors.current}>
              <input id="set-curr" type="password" className={`form-input${errors.current ? ' form-input--error' : ''}`}
                value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
            </FormField>
            <FormField label="New Password" required htmlFor="set-new" error={errors.newPass}>
              <input id="set-new" type="password" className={`form-input${errors.newPass ? ' form-input--error' : ''}`}
                value={form.newPass} onChange={e => setForm(f => ({ ...f, newPass: e.target.value }))} />
            </FormField>
            <FormField label="Confirm New Password" required htmlFor="set-confirm" error={errors.confirm}>
              <input id="set-confirm" type="password" className={`form-input${errors.confirm ? ' form-input--error' : ''}`}
                value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
            </FormField>
          </div>
          <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className={`btn btn--primary${loading ? ' btn--loading' : ''}`} disabled={loading}>
              {loading ? '' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      <GlobalAddressSettings />
    </div>
  );
}

/* ─── Utility Payments fields ─────────────────────────────── */
const UTILITY_FIELDS = [
  { key: 'utility_type', label: 'Utility Type', required: true },
  { key: 'provider_name', label: 'Provider Name', required: true },
  { key: 'account_number', label: 'Account Number' },
  { key: 'billing_cycle', label: 'Billing Cycle' },
  { key: 'due_date', label: 'Due Date', type: 'date' },
  { key: 'amount', label: 'Amount (₹)', type: 'number', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Paid','Unpaid','Overdue'], required: true },
  { key: 'payment_date', label: 'Payment Date', type: 'date' },
  { key: 'transaction_ref', label: 'Transaction Ref' },
  { key: 'remarks', label: 'Remarks', type: 'textarea', showInTable: false },
];

const TAX_FIELDS = [
  { key: 'tax_type', label: 'Tax Type', required: true },
  { key: 'authority_name', label: 'Authority Name', required: true },
  { key: 'assessment_year', label: 'Assessment Year' },
  { key: 'due_date', label: 'Due Date', type: 'date' },
  { key: 'amount', label: 'Amount (₹)', type: 'number', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Paid','Unpaid','Overdue'], required: true },
  { key: 'payment_date', label: 'Payment Date', type: 'date' },
  { key: 'transaction_ref', label: 'Transaction Ref' },
  { key: 'remarks', label: 'Remarks', type: 'textarea', showInTable: false },
];

/* ─── Asset Tracker Component ────────────────────────────── */
