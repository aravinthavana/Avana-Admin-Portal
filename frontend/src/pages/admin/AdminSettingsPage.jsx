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





/* ─── Office Locations Management Component ────────────────── */
export function LocationsManagementSection() {
  const toast = useToast();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLocationName, setNewLocationName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteLocation, setDeleteLocation] = useState(null);

  const fetchLocations = useCallback(async () => {
    try {
      const data = await locationsApi.getLocations();
      setLocations(data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newLocationName.trim()) {
      toast.error('Please enter a location name.');
      return;
    }
    setAdding(true);
    try {
      await locationsApi.createLocation(newLocationName.trim());
      toast.success('Location added successfully! 🏢');
      setNewLocationName('');
      fetchLocations();
    } catch (err) {
      toast.error(err.message || 'Failed to add location');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteLocation = async (id) => {
    try {
      await locationsApi.deleteLocation(id);
      toast.success('Location removed.');
      setDeleteLocation(null);
      fetchLocations();
    } catch (err) {
      toast.error(err.message || 'Failed to delete location');
    }
  };

  return (
    <div className="card" style={{ marginTop: 'var(--space-6)', maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#172025' }}>
            🏢 Office Locations & Floor Directory
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Configure office locations available for employees in helpdesk service forms
          </p>
        </div>
      </div>

      <form onSubmit={handleAddLocation} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="form-input"
          style={{ flex: '1 1 250px' }}
          placeholder="e.g. Ground Floor, 4th Floor - Tech Lab, Warehouse A..."
          value={newLocationName}
          onChange={e => setNewLocationName(e.target.value)}
        />
        <button type="submit" className={'btn btn--primary' + (adding ? ' btn--loading' : '')} disabled={adding || !newLocationName.trim()}>
          {adding ? '' : '➕ Add Location'}
        </button>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}><Spinner size="md" label="Loading locations…" /></div>
      ) : locations.length === 0 ? (
        <EmptyState icon="🏢" title="No locations configured" description="Add your first office location above." />
      ) : (
        <div className="table-wrapper">
          <table className="table" aria-label="Office Locations Table">
            <thead>
              <tr>
                <th scope="col" style={{ width: '60px' }}>#</th>
                <th scope="col">Location / Floor Name</th>
                <th scope="col" style={{ width: '100px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc, idx) => (
                <tr key={loc.id || idx}>
                  <td style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#172025', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>📍</span>
                      <span>{loc.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn--sm btn--danger"
                      onClick={() => setDeleteLocation(loc)}
                      title="Delete Location"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteLocation && (
        <ConfirmModal
          isOpen={!!deleteLocation}
          onClose={() => setDeleteLocation(null)}
          onConfirm={() => handleDeleteLocation(deleteLocation.id)}
          title="Delete Location"
          message={'Are you sure you want to delete "' + deleteLocation.name + '"? Employees will no longer see this option in request forms.'}
          confirmLabel="Delete Location"
          dangerous
        />
      )}
    </div>
  );
}

export function LocationsManagementPage() {
  return (
    <div>
      <PageHeader
        title="🏢 Office Locations"
        subtitle="Add, view, and delete office floors and departments for all helpdesk forms"
      />
      <LocationsManagementSection />
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
