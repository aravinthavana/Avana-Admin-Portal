import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../lib/api';
import { openLegacyPrintReport } from './admin/utils';
import {
  Badge, Spinner, EmptyState, Alert, ConfirmModal, Modal,
  FormField, PageHeader, StatCard,
} from '../components/ui';

/* ─── Helpers ─────────────────────────────────────────────── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const [y,m,d] = dateStr.split('-').map(Number);
    return `${String(d).padStart(2,'0')} ${MONTHS[m-1]?.slice(0,3)} ${y}`;
  } catch { return dateStr; }
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
}



/* ─── Login Audit Section ─────────────────────────────────── */
function LoginAuditSection() {
  const [logins, setLogins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    if (logins.length > 0) return;
    setLoading(true);
    adminApi.getLogins()
      .then(data => setLogins(data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  function toggle() {
    if (!open) load();
    setOpen(o => !o);
  }

  return (
    <div className="card" style={{ marginTop: 'var(--space-6)' }}>
      <button
        type="button"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}
        onClick={toggle}
        aria-expanded={open}
      >
        <span>🔐 Employee Login Audit</span>
        <span style={{ fontSize: '1.2rem', transition: 'transform var(--transition-base)', transform: open ? 'rotate(180deg)' : 'none' }}>
          ▾
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          {loading && <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}><Spinner size="md" /></div>}
          {error && <Alert type="error">{error}</Alert>}
          {!loading && !error && logins.length === 0 && (
            <EmptyState icon="🔐" title="No login records" />
          )}
          {!loading && !error && logins.length > 0 && (
            <div className="table-wrapper">
              <table className="table" aria-label="Employee login audit">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Email</th>
                    <th scope="col">Date & Time</th>
                    <th scope="col">Action</th>
                    <th scope="col">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logins.map((l, idx) => (
                    <tr key={l.id || idx}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 500 }}>{l.email}</td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {l.created_at ? new Date(l.created_at).toLocaleString('en-IN') : '—'}
                      </td>
                      <td>
                        <Badge status={l.action === 'login' ? 'approved' : 'pending'} label={l.action || 'login'} />
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{l.ip || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Change Password Panel ───────────────────────────────── */
function ChangePasswordPanel() {
  const toast = useToast();
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
      await adminApi.changePassword(form.current, form.newPass);
      toast.success('Admin password changed successfully!');
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
        🔑 Change Admin Password
      </h3>
      <form autoComplete="off" onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <FormField label="Current Password" required htmlFor="adm-cp-curr" error={errors.current}>
            <input id="adm-cp-curr" type="password" className={`form-input${errors.current ? ' form-input--error' : ''}`}
              value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
          </FormField>
          <FormField label="New Password" required htmlFor="adm-cp-new" error={errors.newPass}>
            <input id="adm-cp-new" type="password" className={`form-input${errors.newPass ? ' form-input--error' : ''}`}
              value={form.newPass} onChange={e => setForm(f => ({ ...f, newPass: e.target.value }))} />
          </FormField>
          <FormField label="Confirm Password" required htmlFor="adm-cp-confirm" error={errors.confirm}>
            <input id="adm-cp-confirm" type="password" className={`form-input${errors.confirm ? ' form-input--error' : ''}`}
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

/* ─── Main AdminDashPage ──────────────────────────────────── */

function parseAttendeesList(att) {
  if (!att) return [];
  if (Array.isArray(att)) return att.filter(Boolean);
  if (typeof att === 'string') {
    const trimmed = att.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {}
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (trimmed !== 'None' && trimmed !== '—') return [trimmed];
  }
  return [];
}

function printSingleBooking(b) {
  const attendeesList = parseAttendeesList(b.attendees);
  const foodName = b.food === 'others' && b.foodSpecify ? b.foodSpecify : b.food;
  const foodDisplay = (b.food && b.food !== 'none') ? `${foodName}${b.foodCount ? ` (Qty: ${b.foodCount})` : ''}` : 'None';
  const timeDisplay = b.bookingType === 'full' ? 'Full Day (09:00 - 18:00)' : `${b.startTime || '09:00'} - ${b.endTime || '18:00'}`;
  const dateDisplay = `${formatDate(b.startDate || b.date)}${b.endDate && b.endDate !== (b.startDate || b.date) ? ` to ${formatDate(b.endDate)}` : ''}`;

  openLegacyPrintReport({
    title: 'Conference Room Reservation Slip',
    subtitle: `Reservation Details for ${b.name || 'Organizer'}`,
    docNo: `CONF-${String(b.id).slice(0, 8).toUpperCase()}`,
    details: [
      { label: 'Booking ID', value: b.id },
      { label: 'Status', value: (b.status || 'Pending').toUpperCase() },
      { label: 'Submitted Date', value: b.createdAt ? formatDate(b.createdAt.slice(0, 10)) : '—' },
      { label: 'Meeting Date(s)', value: dateDisplay },
      { label: 'Booking Type', value: b.bookingType === 'full' ? 'Full Day' : 'Time Slot' },
      { label: 'Reserved Time', value: timeDisplay },
      { label: 'Organizer Name', value: b.name || '—' },
      { label: 'Contact Phone', value: b.phone || '—' },
      { label: 'Contact Email', value: b.email || '—' },
      { label: 'Meeting Purpose', value: b.reason || '—' },
      { label: 'Food Arrangement', value: foodDisplay },
      { label: 'Special Remarks', value: b.remarks || 'None' },
    ],
    headers: [
      { title: '#', align: 'center' },
      { title: 'Attendee Name', align: 'left' }
    ],
    rows: attendeesList.length > 0
      ? attendeesList.map((att, idx) => [idx + 1, att])
      : [[1, 'No individual attendee names listed']],
  });
}

export default function AdminDashPage() {
  const toast = useToast();

  const nowYear = new Date().getFullYear();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState(String(nowYear));

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeDetailBooking, setActiveDetailBooking] = useState(null); // booking id
  const [deleting, setDeleting] = useState(false);
  const [rejectBookingId, setRejectBookingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveBookingId, setApproveBookingId] = useState(null);
  const [approvalRemarks, setApprovalRemarks] = useState('');

  async function handleStatusUpdate(id, status, reason = '', remarks = '') {
    try {
      const res = await fetch(`/api/helpdesk/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('avana_admin_token')}`
        },
        body: JSON.stringify({ status, category: 'conference', rejectionReason: reason, approvalRemarks: remarks })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      toast.success(`Booking status updated to ${status}.`);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    } catch (err) {
      toast.error(err.message || 'Failed to update booking status');
    }
  }

  useEffect(() => {
    document.title = 'Booking Dashboard | Avana Admin';
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await (async () => {
        const res = await fetch('/api/admin/bookings', {
          headers: { Authorization: `Bearer ${localStorage.getItem('avana_admin_token')}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })();
      setBookings(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  /* Filter */
  const filtered = bookings.filter(b => {
    const d = b.startDate || b.date || '';
    if (filterYear !== 'all' && !d.startsWith(filterYear)) return false;
    if (filterMonth !== 'all') {
      const m = parseInt(d.split('-')[1], 10);
      if (m !== parseInt(filterMonth, 10)) return false;
    }
    return true;
  });

  /* Stats */
  const totalBookings = filtered.length;
  const fullDayBookings = filtered.filter(b => b.bookingType === 'full').length;
  const slotBookings = totalBookings - fullDayBookings;

  /* Delete */
  async function handleDelete(id) {
    setDeleting(true);
    try {
      await (async () => {
        const res = await fetch(`/api/admin/bookings/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('avana_admin_token')}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      })();
      toast.success('Booking deleted.');
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      toast.error(err.message || 'Failed to delete booking');
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  /* Report Download */
  function handleDownloadCSV() {
    if (filtered.length === 0) { toast.warning('No bookings to download.'); return; }
    const label = filterMonth !== 'all'
      ? `${MONTHS[parseInt(filterMonth, 10) - 1]} ${filterYear}`
      : filterYear !== 'all' ? filterYear : 'All';

    openLegacyPrintReport({
      title: 'Conference Room Bookings Report',
      subtitle: `Filtered By: ${label}`,
      summary: [
        { label: 'Total Bookings', value: `${filtered.length} Bookings` },
        { label: 'Approved', value: `${filtered.filter(b => b.status === 'approved').length} Bookings`, color: '#16a34a' },
        { label: 'Pending', value: `${filtered.filter(b => b.status === 'pending').length} Bookings`, color: '#d97706' },
      ],
      headers: [
        { title: '#' },
        { title: 'Date' },
        { title: 'Booked Time (from start to end time)' },
        { title: 'Booked On (When it was booked)' },
        { title: 'Submitted By (Name & Email)' },
        { title: 'Reason' },
        { title: 'Attendees (List of names)' },
        { title: 'Meals (Food selected and quantity)' },
        { title: 'Remarks' },
      ],
      rows: filtered.map((b, i) => [
        i + 1,
        b.bookingType === 'full' ? `${b.startDate || b.date} to ${b.endDate || b.date}` : (b.date || '—'),
        b.bookingType === 'full' ? 'Full Day' : `${b.startTime || '—'} - ${b.endTime || '—'}`,
        b.createdAt ? formatDate(b.createdAt.slice(0, 10)) : '—',
        `${b.name || '—'}\n(${b.email || '—'})`,
        b.reason || '—',
        Array.isArray(b.attendees) ? b.attendees.join(', ') : (b.attendees || '—'),
        (b.food && b.food !== 'none') ? `${b.food === 'others' ? b.foodSpecify : b.food} (x${b.foodCount || 1})` : '—',
        b.remarks || '—',
      ])
    });
  }

  const yearOptions = [String(nowYear - 1), String(nowYear), String(nowYear + 1)];

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        title="📅 Conference Room Bookings"
        subtitle="Manage and review all conference room reservations"
        action={
          <button type="button" className="btn btn--secondary btn--sm" onClick={handleDownloadCSV}>
              📄 Download Report
            </button>
        }
      />

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4) var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <FormField label="Month" htmlFor="filter-month">
            <select id="filter-month" className="form-select" value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)} style={{ minWidth: 140 }}>
              <option value="all">All Months</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1).padStart(1, '0')}>{m}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Year" htmlFor="filter-year">
            <select id="filter-year" className="form-select" value={filterYear}
              onChange={e => setFilterYear(e.target.value)} style={{ minWidth: 100 }}>
              <option value="all">All Years</option>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </FormField>
          <button type="button" className="btn btn--primary btn--sm" onClick={fetchBookings}
            style={{ marginBottom: 0, alignSelf: 'flex-end', marginTop: 'var(--space-2)' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-5)', marginBottom: 'var(--space-6)',
      }}>
        <StatCard label="Total Bookings" value={totalBookings} icon="📅" color="var(--brand-amber)" />
        <StatCard label="Full Day Bookings" value={fullDayBookings} icon="🔴" color="var(--color-error)" />
        <StatCard label="Time Slot Bookings" value={slotBookings} icon="🕐" color="var(--color-info)" />
      </div>

      {/* ── Table ── */}
      {error && <Alert type="error" onClose={() => setError(null)} style={{ marginBottom: 'var(--space-4)' }}>{error}</Alert>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && (
          <div style={{ padding: 'var(--space-16)', textAlign: 'center' }}>
            <Spinner size="lg" label="Loading bookings…" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <EmptyState icon="📭" title="No bookings found" description="Try adjusting the month/year filter." />
        )}
        {!loading && filtered.length > 0 && (
          <div className="table-wrapper">
            <table className="table" aria-label="Conference room bookings admin table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Date / Range</th>
                  <th scope="col">Type</th>
                  <th scope="col">Time</th>
                  <th scope="col">Booked By</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Attendees</th>
                  <th scope="col">Food</th>
                  <th scope="col">Remarks</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, idx) => {
                  const attendees = Array.isArray(b.attendees)
                    ? b.attendees
                    : (typeof b.attendees === 'string' ? JSON.parse(b.attendees || '[]') : []);
                  return (
                    <tr key={b.id}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{formatDate(b.startDate || b.date)}</div>
                        {b.endDate && b.endDate !== (b.startDate || b.date) && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            → {formatDate(b.endDate)}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: b.bookingType === 'full' ? 'var(--color-error-bg)' : 'var(--color-warning-bg)',
                          color: b.bookingType === 'full' ? 'var(--color-error)' : 'var(--color-warning)',
                          border: `1px solid ${b.bookingType === 'full' ? 'var(--color-error-border)' : 'var(--color-warning-border)'}`,
                        }}>
                          {b.bookingType === 'full' ? 'Full Day' : 'Time Slot'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {b.bookingType === 'full' ? '09:00 – 18:00' : `${formatTime(b.startTime)} – ${formatTime(b.endTime)}`}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{b.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{b.email}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{b.phone || '—'}</td>
                      <td style={{ maxWidth: 200, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        <span style={{
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {b.reason || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                        {attendees.length > 0 ? attendees.join(', ') : '—'}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {b.food && b.food !== 'none'
                          ? `${b.food}${b.foodCount ? ` (${b.foodCount})` : ''}`
                          : '—'}
                      </td>
                      <td style={{ maxWidth: 140, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                        {b.remarks || '—'}
                      </td>
                      <td>
                        <Badge
                          status={b.status === 'confirmed' ? 'approved' : b.status === 'rejected' ? 'rejected' : 'pending'}
                          label={b.status || 'pending'}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => setActiveDetailBooking(b)}
                            aria-label={`View details for booking by ${b.name}`}
                          >
                            🔍 Details
                          </button>
                          {(b.status || 'pending') === 'pending' && (
                            <>
                              <button
                                type="button"
                                className="btn btn--sm"
                                style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--color-success-border)' }}
                                onClick={() => { setApproveBookingId(b.id); setApprovalRemarks(''); }}
                                aria-label={`Approve booking by ${b.name}`}
                              >
                                Approve ✅
                              </button>
                              <button
                                type="button"
                                className="btn btn--sm"
                                style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', borderColor: 'var(--color-error-border)' }}
                                onClick={() => { setRejectBookingId(b.id); setRejectionReason(''); }}
                                aria-label={`Reject booking by ${b.name}`}
                              >
                                Reject ❌
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn btn--danger btn--sm"
                            onClick={() => setConfirmDelete(b.id)}
                            aria-label={`Delete booking by ${b.name}`}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Change Password ── */}
      <ChangePasswordPanel />

      {/* ── Login Audit ── */}
      {/* <LoginAuditSection /> */}

      {/* ── Confirm Delete ── */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete)}
        title="Delete Booking"
        message="Are you sure you want to delete this booking? This action cannot be undone."
        confirmLabel="Delete"
        dangerous
      />


      {/* ── Active Detail Booking Modal ── */}
      <Modal
        isOpen={!!activeDetailBooking}
        onClose={() => setActiveDetailBooking(null)}
        title="📅 Conference Room Reservation Details"
        footer={
          activeDetailBooking && (
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => printSingleBooking(activeDetailBooking)}
              >
                🖨️ Print Slip
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => setActiveDetailBooking(null)}>
                Close
              </button>
            </div>
          )
        }
      >
        {activeDetailBooking && (() => {
          const b = activeDetailBooking;
          const atts = parseAttendeesList(b.attendees);
          const foodName = b.food === 'others' && b.foodSpecify ? b.foodSpecify : b.food;
          const hasFood = b.food && b.food !== 'none';
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                <div>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Booking ID</strong>
                  <span style={{ fontWeight: 600, color: 'var(--color-info)' }}>#{String(b.id).slice(0, 8).toUpperCase()}</span>
                </div>
                <div>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Status</strong>
                  <Badge
                    status={b.status === 'confirmed' ? 'approved' : b.status === 'rejected' ? 'rejected' : 'pending'}
                    label={b.status || 'pending'}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                <div>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Meeting Date(s)</strong>
                  <span style={{ fontWeight: 600, color: '#172025' }}>
                    {formatDate(b.startDate || b.date)} {b.endDate && b.endDate !== (b.startDate || b.date) ? `→ ${formatDate(b.endDate)}` : ''}
                  </span>
                </div>
                <div>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Timing & Type</strong>
                  <span style={{ fontWeight: 600, color: '#172025' }}>
                    {b.bookingType === 'full' ? 'Full Day (09:00 - 18:00)' : `${b.startTime || '09:00'} – ${b.endTime || '18:00'}`}
                  </span>
                </div>
              </div>

              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Organizer Information</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)' }}>
                  <div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Name:</span> <strong style={{ fontWeight: 600 }}>{b.name || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Phone:</span> <strong>{b.phone || '—'}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Email:</span> <span>{b.email || '—'}</span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#f9f9fb', padding: 'var(--space-3)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
                <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Meeting Purpose</strong>
                <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.5, color: '#172025', fontWeight: 500 }}>
                  {b.reason || 'No specific purpose provided'}
                </p>
              </div>

              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
                  List of Attendees ({atts.length})
                </strong>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f9f9fb', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ padding: '6px 12px', width: '40px' }}>#</th>
                        <th style={{ padding: '6px 12px' }}>Attendee Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atts.length > 0 ? atts.map((att, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < atts.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                          <td style={{ padding: '6px 12px', color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 12px', fontWeight: 500 }}>{att}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={2} style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>No attendees listed</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                  Food & Refreshment Arrangement
                </strong>
                {hasFood ? (
                  <div style={{ background: '#fdf5e6', border: '1px solid #b27f0d', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 700, color: '#b27f0d', fontSize: '0.9rem', marginBottom: 2 }}>
                      🍽️ Food Selected: {foodName}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#172025' }}>
                      <strong>Quantity:</strong> {b.foodCount || 1} portions
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>None requested</span>
                )}
              </div>

              {b.remarks && (
                <div>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Remarks</strong>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>{b.remarks}</p>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ── Reject Booking Modal ── */}
      <Modal
        isOpen={!!rejectBookingId}
        onClose={() => setRejectBookingId(null)}
        title="Reject Booking"
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setRejectBookingId(null)}>Cancel</button>
            <button
              type="button"
              className="btn btn--danger"
              disabled={!rejectionReason.trim()}
              onClick={() => {
                handleStatusUpdate(rejectBookingId, 'rejected', rejectionReason);
                setRejectBookingId(null);
              }}
            >
              Confirm Reject
            </button>
          </>
        }
      >
        <FormField label="Rejection Reason" required htmlFor="dash-rej-reason">
          <textarea
            id="dash-rej-reason"
            className="form-textarea"
            rows={3}
            placeholder="Please specify why the booking is rejected..."
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
          />
        </FormField>
      </Modal>

      <Modal
        isOpen={!!approveBookingId}
        onClose={() => setApproveBookingId(null)}
        title="Approve Booking"
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setApproveBookingId(null)}>Cancel</button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                handleStatusUpdate(approveBookingId, 'confirmed', '', approvalRemarks);
                setApproveBookingId(null);
              }}
            >
              Confirm Approve
            </button>
          </>
        }
      >
        <FormField label="Approval Remarks (Optional)" htmlFor="dash-app-remarks">
          <textarea
            id="dash-app-remarks"
            className="form-textarea"
            rows={3}
            placeholder="e.g., Key can be collected from receptionist, projector is set up..."
            value={approvalRemarks}
            onChange={e => setApprovalRemarks(e.target.value)}
          />
        </FormField>
      </Modal>
    </div>
  );
}
