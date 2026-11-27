import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { employeeApi } from '../lib/api';
import {
  LuLock, LuRefreshCw, LuClock, LuPackageOpen, LuFileText, LuTag, LuEye
} from 'react-icons/lu';
import {
  Badge, Spinner, EmptyState, Alert, ConfirmModal, FormField, Breadcrumbs
} from '../components/ui';

const CATEGORY_LABELS = {
  conference: 'Conference Room Booking',
  stationery: 'Stationery Request',
  hk_material: 'Housekeeping Material',
  admin_support: 'Admin Support',
  maintenance: 'Maintenance Complaint',
  housekeeping: 'Housekeeping Request',
  office_asset: 'Office Asset Request',
  print_scan: 'Printing & Scanning',
  courier_dispatch: 'Courier & Dispatch',
  app_feedback: 'App Feedback & Bugs',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch { return dateStr; }
}

function getStatusBadge(status) {
  const map = {
    pending: 'pending',
    completed: 'approved',
    approved: 'approved',
    confirmed: 'approved',
    rejected: 'rejected',
    cancelled: 'rejected',
    'in-progress': 'in-progress',
  };
  return map[(status || '').toLowerCase()] || 'pending';
}

function ChangePasswordPanel() {
  const toast = useToast();
  const { employeeToken, employeeEmail } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  const [form, setForm] = useState({ newPass: '', confirm: '', otp: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e) {
    e.preventDefault();
    const errs = {};
    if (!form.newPass || form.newPass.length < 6) errs.newPass = 'New password must be at least 6 characters';
    if (form.newPass !== form.confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('Please fix the validation errors marked in red.');
      return;
    }

    setLoading(true);
    try {
      await employeeApi.sendOtp(employeeEmail);
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
    if (!form.otp || form.otp.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP' });
      return;
    }
    setLoading(true);
    try {
      await employeeApi.setPassword(form.newPass, employeeToken, form.otp);
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
    <div className="card" style={{ marginTop: 'var(--space-6)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg, 12px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 8,
            background: 'var(--brand-amber-bg, #fdf5e6)',
            color: 'var(--brand-amber, #b27f0d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <LuLock size={18} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 2px 0', fontSize: '1rem', color: 'var(--brand-charcoal, #172025)' }}>
              Account Security & Password
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary, #6b7280)' }}>
              Update your employee login credentials with two-step email verification
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn--sm btn--outline"
          onClick={() => setIsExpanded(v => !v)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><LuLock size={13} /> {isExpanded ? 'Hide' : 'Change Password'}</span>
        </button>
      </div>

      {isExpanded && (
        <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
          {step === 'request' ? (
            <form autoComplete="off" onSubmit={handleSendOtp} noValidate>
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
            <form autoComplete="off" onSubmit={handleVerifySubmit} noValidate>
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
      )}
    </div>
  );
}

export default function MyRequestsPage() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [cancelId, setCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [downloadingDcId, setDownloadingDcId] = useState(null);
  const [viewingDc, setViewingDc] = useState(null);

  const fetchRequests = useCallback(() => {
    setLoading(true);
    employeeApi.getRequests()
      .then(data => setRequests(data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.title = 'My Requests & Activity | Avana';
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!viewingDc) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setViewingDc(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingDc]);

  async function handleDownloadDCPdf(r) {
    try {
      setDownloadingDcId(`dc-${r.id}`);
      await employeeApi.downloadDCPdf(r.id, r.dcNo || r.id);
      toast.success(`DC #${r.dcNo || ''} PDF downloaded.`);
    } catch (err) {
      toast.error(err.message || 'Failed to download Delivery Challan PDF.');
    } finally {
      setDownloadingDcId(null);
    }
  }

  async function handleDownloadLabelPdf(r) {
    try {
      setDownloadingDcId(`label-${r.id}`);
      await employeeApi.downloadAddressLabelPdf(r.id, r.dcNo || r.id);
      toast.success(`Shipping Label #${r.dcNo || ''} downloaded.`);
    } catch (err) {
      toast.error(err.message || 'Failed to download Shipping Label.');
    } finally {
      setDownloadingDcId(null);
    }
  }

  const handleCancelConfirm = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      await employeeApi.cancelBooking(cancelId);
      toast.success('Booking cancelled successfully!');
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
      setCancelId(null);
    }
  };

  const isCompletedOrApproved = (st) => {
    const s = (st || '').toLowerCase();
    return s === 'completed' || s === 'confirmed' || s === 'approved';
  };

  const filtered = requests.filter(r => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return (r.status || '').toLowerCase() === 'pending';
    if (activeTab === 'completed') return isCompletedOrApproved(r.status);
    return true;
  });

  const tabs = [
    { key: 'all', label: `All (${requests.length})` },
    { key: 'pending', label: `Pending (${requests.filter(r => (r.status || '').toLowerCase() === 'pending').length})` },
    { key: 'completed', label: `Approved / Completed (${requests.filter(r => isCompletedOrApproved(r.status)).length})` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      style={{ padding: 'var(--space-6)', maxWidth: 1140, margin: '0 auto', width: '100%' }}
    >
      <Breadcrumbs items={[{ label: 'Home', link: '/helpdesk' }, { label: 'My Requests & Activity' }]} />

      <div id="my-requests-tracker" className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg, 12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 4px 0', fontSize: '1.3rem', color: 'var(--brand-charcoal, #172025)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LuClock size={20} color="var(--brand-amber)" />
              <span>My Requests & Activity</span>
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary, #6b7280)' }}>
              Monitor real-time progress, download Delivery Challans, and manage your submitted tickets
            </p>
          </div>
          <button
            type="button"
            onClick={fetchRequests}
            className="btn btn--sm btn--outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Refresh requests"
          >
            <LuRefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
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
          <EmptyState icon={<LuPackageOpen size={36} color="var(--brand-amber)" />} title="No requests found" description="Your submitted requests will appear here." />
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="table-wrapper">
            <table className="table" aria-label="My help desk requests">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Request Date & Time</th>
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

                  const catLabel = r.categoryTitle ||
                    CATEGORY_LABELS[r.category] ||
                    r.category;

                  const reqDate = r.submittedAt || r.createdAt || r.created_at;

                  return (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{r.id ? '#' + r.id.substring(0, 8).toUpperCase() : idx + 1}</td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', fontWeight: 500 }}>
                        {formatDateTime(reqDate)}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {catLabel}
                        </span>
                      </td>
                      <td style={{ maxWidth: 260, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        {r.description || r.details || r.issue || '—'}
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
                            Cancel Booking
                          </button>
                        )}
                        {r.category === 'courier_dispatch' && (
                          <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn--sm btn--primary"
                              onClick={() => handleDownloadDCPdf(r)}
                              disabled={downloadingDcId === `dc-${r.id}`}
                              title="Download official Delivery Challan PDF"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <LuFileText size={12} /> {downloadingDcId === `dc-${r.id}` ? '...' : 'DC PDF'}
                            </button>
                            <button
                              type="button"
                              className="btn btn--sm btn--outline"
                              onClick={() => handleDownloadLabelPdf(r)}
                              disabled={downloadingDcId === `label-${r.id}`}
                              title="Download A5 Shipping Address Label PDF"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <LuTag size={12} /> {downloadingDcId === `label-${r.id}` ? '...' : 'Label'}
                            </button>
                            <button
                              type="button"
                              className="btn btn--sm btn--outline"
                              onClick={() => setViewingDc(r)}
                              title="View Delivery Challan Details"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            >
                              <LuEye size={12} /> View
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {viewingDc && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem' }}
            role="dialog"
            aria-modal="true"
            onClick={e => { if (e.target === e.currentTarget) setViewingDc(null); }}
          >
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#172025', fontWeight: 800 }}>
                  Delivery Challan #{viewingDc.dcNo}
                </h3>
                <button type="button" onClick={() => setViewingDc(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#6b7280' }} aria-label="Close">×</button>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#172025', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div><strong>Date:</strong> <span style={{ color: '#d97706', fontWeight: 700 }}>{formatDate(viewingDc.dcDate || viewingDc.submittedAt)}</span></div>
                <div><strong>Sender / Employee:</strong> {viewingDc.senderName || '—'} {viewingDc.senderPhone ? `(${viewingDc.senderPhone})` : ''}</div>
                <div><strong>Requester Email:</strong> {viewingDc.requesterEmail || '—'}</div>
                <div><strong>Receiver Name:</strong> {viewingDc.receiverName || '—'} {viewingDc.receiverPhone ? `(${viewingDc.receiverPhone})` : ''}</div>
                <div><strong>Destination Address:</strong> {viewingDc.toAddress || '—'}</div>
                {viewingDc.ccEmails && <div><strong>CC Recipients:</strong> {viewingDc.ccEmails}</div>}
                <div><strong>Transporter:</strong> {viewingDc.transporterName || '—'}</div>
                {viewingDc.courierBilling && <div><strong>Courier Billing:</strong> {viewingDc.courierBilling}</div>}
                {viewingDc.items && <div><strong>Items:</strong> {Array.isArray(viewingDc.items) ? `${viewingDc.items.length} items` : 'Listed'}</div>}
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
                  Official Documents (PDF)
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    style={{ flex: 1, minWidth: '130px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem' }}
                    onClick={() => handleDownloadDCPdf(viewingDc)}
                    disabled={downloadingDcId === `dc-${viewingDc.id}`}
                  >
                    <LuFileText size={14} /> {downloadingDcId === `dc-${viewingDc.id}` ? 'Downloading...' : 'Download DC (PDF)'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    style={{ flex: 1, minWidth: '130px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem' }}
                    onClick={() => handleDownloadLabelPdf(viewingDc)}
                    disabled={downloadingDcId === `label-${viewingDc.id}`}
                  >
                    <LuTag size={14} /> {downloadingDcId === `label-${viewingDc.id}` ? 'Downloading...' : 'Shipping Label (PDF)'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setViewingDc(null)}
                >
                  Close
                </button>
              </div>
            </div>
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

      <ChangePasswordPanel />
    </motion.div>
  );
}
