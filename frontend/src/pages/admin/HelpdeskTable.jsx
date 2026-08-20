import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import {
  helpdeskApi, stationeryApi, housekeepingApi, amcApi, utilityApi, taxApi, adminApi,
  assetTrackerApi, courierApi, pettyCashApi, travelApi, billWarrantyApi, otherStockApi, remindersApi,
} from '../../lib/api';
import {
  Badge, Spinner, EmptyState, Alert, Modal, ConfirmModal,
  FormField, PageHeader, StatCard,
} from '../../components/ui';
import { formatDate, formatDateTime, getStatusBadge, openLegacyPrintReport, CATEGORY_LABELS } from './utils';
import { PrintHeader } from './PrintHeader';

/* ─── Skeleton Rows ───────────────────────────────────────── */
export function SkeletonRows({ cols = 8, rows = 5 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i}>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>
      ))}
    </tr>
  ));
}

/* ─── Pagination ──────────────────────────────────────────── */
const PAGE_SIZE = 20;
export function Pagination({ page, total, onPage }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
      <button className="btn btn--sm btn--secondary" onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Previous page">
        ← Prev
      </button>
      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
        Page {page} of {totalPages} ({total} records)
      </span>
      <button className="btn btn--sm btn--secondary" onClick={() => onPage(page + 1)} disabled={page === totalPages} aria-label="Next page">
        Next →
      </button>
    </div>
  );
}

/* ─── Helpdesk Table (shared for all categories + all) ────── */
export function HelpdeskTable({ categoryFilter }) {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('');
  const [page, setPage] = useState(1);
  const [confirmId, setConfirmId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectBookingId, setRejectBookingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectCategory, setRejectCategory] = useState('');
  const [activeDetailRequest, setActiveDetailRequest] = useState(null);
  const [approveBookingId, setApproveBookingId] = useState(null);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [approveCategory, setApproveCategory] = useState('');
  const [completeRequestId, setCompleteRequestId] = useState(null);
  const [completeCategory, setCompleteCategory] = useState('');
  const [completionRemarks, setCompletionRemarks] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await helpdeskApi.getAll();
      const rows = data || [];
      setRequests(rows);
      setPendingCount(rows.filter(r => (r.status || '').toLowerCase() === 'pending').length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  /* Filter */
  const filtered = useMemo(() => {
    setPage(1); // reset page on filter change (side-effectish but acceptable in useMemo deps reset)
    return requests.filter(r => {
      // Category filter from route
      if (categoryFilter && categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      // Category dropdown (only shown on 'all' view)
      if (!categoryFilter && catFilter !== 'all' && r.category !== catFilter) return false;
      // Date filter
      const d = (r.createdAt || r.created_at || '').split('T')[0];
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      // Name filter
      if (nameFilter) {
        const query = nameFilter.toLowerCase();
        const rName = (r.name || r.requester_name || r.full_name || '').toLowerCase();
        if (!rName.includes(query)) return false;
      }
      return true;
    });
  }, [requests, categoryFilter, catFilter, fromDate, toDate, nameFilter]);

  async function handleStatus(id, status, category, rejectionReason, approvalRemarks) {
    try {
      await helpdeskApi.updateStatus(id, status, undefined, category, rejectionReason, approvalRemarks);
      toast.success(`Marked as ${status}.`);
      setRequests(prev => {
        const updated = prev.map(r => r.id === id ? { ...r, status } : r);
        setPendingCount(updated.filter(r => (r.status || '').toLowerCase() === 'pending').length);
        return updated;
      });
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  }

  async function handleDelete(id) {
    try {
      await helpdeskApi.delete(id);
      toast.success('Request deleted.');
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setConfirmId(null);
    }
  }

  function parseItems(items) {
    if (!items) return [];
    try {
      const parsed = typeof items === 'string' ? JSON.parse(items) : items;
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch { return []; }
  }

  function parseItemsData(items) {
    if (!items) return null;
    try {
      const parsed = typeof items === 'string' ? JSON.parse(items) : items;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
      return null;
    } catch { return null; }
  }

  const label = categoryFilter ? CATEGORY_LABELS[categoryFilter] || categoryFilter : 'All';

  const handleLegacyPDF = () => {
    openLegacyPrintReport({
      title: `${label} Requests Report`,
      subtitle: fromDate || toDate ? `Date range: ${fromDate || 'Start'} to ${toDate || 'Today'}` : 'All Help Desk Requests',
      summary: [
        { label: 'Total Requests', value: `${filtered.length} Requests` },
        { label: 'Pending Requests', value: `${filtered.filter(r => (r.status || '').toLowerCase() === 'pending').length}`, color: '#d97706' },
        { label: 'Completed', value: `${filtered.filter(r => (r.status || '').toLowerCase() === 'completed').length}`, color: '#16a34a' },
      ],
      headers: [
        { title: '#' },
        { title: 'Date' },
        { title: 'Category' },
        { title: 'Submitted By' },
        { title: 'Location / Floor' },
        { title: 'Details' },
        { title: 'Status' },
      ],
      rows: filtered.map((req, idx) => {
        const parsed = parseItems(req.items);
        const itemStr = parsed.length > 0 ? `<br/><strong>Items:</strong> ${parsed.map(i => `${i.item || i.name}(${i.qty || i.quantity || 1})`).join(', ')}` : '';
        const details = req.exact_query || req.description || req.details || '—';
        return [
          idx + 1,
          formatDateTime(req.created_at || req.createdAt),
          CATEGORY_LABELS[req.category] || req.category || 'General',
          `${req.name || req.full_name || req.requester_name || req.requesterName || 'Employee'}<br/><span style="font-size:0.75rem;color:#6b7280">${req.email || req.requester_email || req.requesterEmail || ''}</span>`,
          req.floor_no || req.floorNo || req.location || req.floor || 'N/A',
          `${details}${itemStr}`,
          req.status || 'Pending',
        ];
      })
    });
  };

  return (
    <div>
      <PageHeader
        title={`📋 ${label} Requests${!categoryFilter && pendingCount > 0 ? ` (${pendingCount} pending)` : ''}`}
        subtitle={`Manage help desk requests${categoryFilter ? ` for ${CATEGORY_LABELS[categoryFilter] || categoryFilter}` : ''}`}
        action={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn--secondary btn--sm" onClick={handleLegacyPDF}>📄 Download PDF</button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={fetchRequests}>
              🔄 Refresh
            </button>
          </div>
        }
      />
      <PrintHeader title={`${label} Requests Report`} subtitle={fromDate || toDate ? `Date range: ${fromDate || 'Start'} to ${toDate || 'Today'}` : 'All Requests'} />

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4) var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <FormField label="Search Name" htmlFor="hda-search">
            <input id="hda-search" type="text" className="form-input" placeholder="Requester name..." value={nameFilter}
              onChange={e => setNameFilter(e.target.value)} style={{ width: 160 }} />
          </FormField>
          <FormField label="From Date" htmlFor="hda-from">
            <input id="hda-from" type="date" className="form-input" value={fromDate}
              onChange={e => setFromDate(e.target.value)} style={{ width: 160 }} />
          </FormField>
          <FormField label="To Date" htmlFor="hda-to">
            <input id="hda-to" type="date" className="form-input" value={toDate}
              onChange={e => setToDate(e.target.value)} style={{ width: 160 }} />
          </FormField>
          {!categoryFilter && (
            <FormField label="Category" htmlFor="hda-cat">
              <select id="hda-cat" className="form-select" value={catFilter}
                onChange={e => setCatFilter(e.target.value)} style={{ width: 180 }}>
                <option value="all">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </FormField>
          )}
          <button type="button" className="btn btn--ghost btn--sm"
            onClick={() => { setFromDate(''); setToDate(''); setCatFilter('all'); setNameFilter(''); }}
            style={{ alignSelf: 'flex-end', marginTop: 'var(--space-2)' }}>
            Clear
          </button>
        </div>
      </div>

      {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {!loading && filtered.length === 0 && (
          <EmptyState icon="📭" title="No requests found" description="Adjust the filters or check back later." />
        )}
        <div className="table-wrapper">
          <table className="table" aria-label="Help desk requests" style={{ width: '100%', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th scope="col" style={{ width: '6%' }}>#</th>
                <th scope="col" style={{ width: '12%' }}>Date</th>
                <th scope="col" style={{ width: '12%' }}>Category</th>
                <th scope="col" style={{ width: '15%' }}>Submitted By</th>
                <th scope="col" style={{ width: '12%' }}>Location</th>
                <th scope="col" style={{ width: '20%' }}>Details</th>
                <th scope="col" style={{ width: '11%' }}>Status</th>
                <th scope="col" style={{ width: '12%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={8} rows={5} />
              ) : (
                filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r, idx) => {
                  const itemsList = parseItems(r.items);
                  const meta = parseItemsData(r.items);
                  
                  let shortId = r.id ? r.id.substring(0,4).toUpperCase() : '0000';
                  const dateStr = (r.createdAt || r.created_at || '').split('T')[0];
                  if (dateStr) {
                    const dObj = new Date(dateStr);
                    const dd = String(dObj.getDate()).padStart(2, '0');
                    const mm = String(dObj.getMonth()+1).padStart(2, '0');
                    shortId = `[${dd}${mm}-${shortId}]`;
                  }

                  return (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '0.85rem' }}>{shortId}</td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {formatDate(r.createdAt || r.created_at)}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--color-info-bg)', color: 'var(--color-info)',
                          border: '1px solid var(--color-info-border)',
                        }}>
                          {CATEGORY_LABELS[r.category] || r.category}
                        </span>
                      </td>
                      <td style={{ wordBreak: 'break-word' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name || r.requester_name || r.full_name || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.email || r.requester_email || ''}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.phone || r.requester_phone || ''}</div>
                      </td>
                      <td style={{ wordBreak: 'break-word', fontSize: '0.85rem' }}>{r.location || r.floor || '—'}</td>
                      <td style={{ wordBreak: 'break-word' }}>
                        <div style={{
                          fontSize: '0.83rem', color: 'var(--color-text-secondary)',
                          display: '-webkit-box', WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {meta && meta.request_type ? <strong>[{meta.request_type}] </strong> : ''}
                          {r.description || r.issue || r.exact_query || r.exact_issue || '—'}
                          {meta && meta.remarks ? <div style={{marginTop: 4}}><em>Remarks: {meta.remarks}</em></div> : null}
                        </div>
                        {itemsList.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                            Items: {itemsList.map(i => `${i.item || i.name}(${i.qty || i.quantity || 1})`).join(', ')}
                          </div>
                        )}
                        {r.remarks && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                            Remarks: {r.remarks}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge status={getStatusBadge(r.status)} label={r.status || 'Pending'} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          <button type="button" className="btn btn--sm btn--secondary"
                            title="View Details"
                            onClick={() => setActiveDetailRequest(r)}
                            aria-label="View request details">
                            🔍 Details
                          </button>
                          {r.category === 'conference' ? (
                            <>
                              <button type="button" className="btn btn--sm btn--secondary"
                                style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--color-success-border)' }}
                                title="Approve Booking"
                                onClick={() => { setApproveBookingId(r.id); setApproveCategory(r.category); setApprovalRemarks(''); }}
                                aria-label="Approve booking">
                                Approve ✅
                              </button>
                              <button type="button" className="btn btn--sm btn--secondary"
                                style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', borderColor: 'var(--color-error-border)' }}
                                title="Reject Booking"
                                onClick={() => { setRejectBookingId(r.id); setRejectCategory(r.category); setRejectionReason(''); }}
                                aria-label="Reject booking">
                                Reject ❌
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="btn btn--sm btn--secondary"
                                title="Mark Complete"
                                onClick={() => { setCompleteRequestId(r.id); setCompleteCategory(r.category); setCompletionRemarks(''); }}
                                aria-label="Mark as completed">
                                ✅ Complete
                              </button>
                              <button type="button" className="btn btn--sm btn--secondary"
                                title="Set Pending"
                                onClick={() => handleStatus(r.id, 'pending', r.category)}
                                aria-label="Set as pending">
                                🟡 Pending
                              </button>
                              <button type="button" className="btn btn--sm btn--secondary"
                                style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', borderColor: 'var(--color-error-border)' }}
                                title="Reject Request"
                                onClick={() => { setRejectBookingId(r.id); setRejectCategory(r.category); setRejectionReason(''); }}
                                aria-label="Reject request">
                                ❌ Reject
                              </button>
                            </>
                          )}
                          <button type="button" className="btn btn--sm btn--danger"
                            title="Delete"
                            onClick={() => setConfirmId(r.id)}
                            aria-label="Delete request">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={filtered.length} onPage={setPage} />
      </div>

      <ConfirmModal
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => handleDelete(confirmId)}
        title="Delete Request"
        message="Are you sure you want to delete this help desk request? This cannot be undone."
        confirmLabel="Delete"
        dangerous
      />

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
                handleStatus(rejectBookingId, 'rejected', rejectCategory, rejectionReason);
                setRejectBookingId(null);
              }}
            >
              Confirm Reject
            </button>
          </>
        }
      >
        <FormField label="Rejection Reason" required htmlFor="hd-rej-reason">
          <textarea
            id="hd-rej-reason"
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
                handleStatus(approveBookingId, 'confirmed', approveCategory, undefined, approvalRemarks);
                setApproveBookingId(null);
              }}
            >
              Confirm Approve
            </button>
          </>
        }
      >
        <FormField label="Approval Remarks (Optional)" htmlFor="hd-app-remarks">
          <textarea
            id="hd-app-remarks"
            className="form-textarea"
            rows={3}
            placeholder="e.g., Key can be collected from receptionist, projector is set up..."
            value={approvalRemarks}
            onChange={e => setApprovalRemarks(e.target.value)}
          />
        </FormField>
      </Modal>

      <Modal
        isOpen={!!completeRequestId}
        onClose={() => setCompleteRequestId(null)}
        title="Complete Service Request"
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setCompleteRequestId(null)}>Cancel</button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                handleStatus(completeRequestId, 'completed', completeCategory, undefined, completionRemarks);
                setCompleteRequestId(null);
              }}
            >
              Confirm Complete
            </button>
          </>
        }
      >
        <FormField label="Resolution Remarks (Optional)" htmlFor="hd-comp-remarks">
          <textarea
            id="hd-comp-remarks"
            className="form-textarea"
            rows={3}
            placeholder="e.g., Issue resolved, items delivered, etc..."
            value={completionRemarks}
            onChange={e => setCompletionRemarks(e.target.value)}
          />
        </FormField>
      </Modal>

      {/* ── Details Preview Modal ── */}
      <Modal
        isOpen={!!activeDetailRequest}
        onClose={() => setActiveDetailRequest(null)}
        title="📋 Service Request Details"
        footer={
          <button type="button" className="btn btn--secondary" onClick={() => setActiveDetailRequest(null)}>Close</button>
        }
      >
        {activeDetailRequest && (() => {
          const r = activeDetailRequest;
          const itemsList = parseItems(r.items);
          const meta = parseItemsData(r.items);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                <div>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Request Number</strong>
                  <span style={{ fontWeight: 600, color: 'var(--color-info)' }}>#{r.id}</span>
                </div>
                <div>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Status</strong>
                  <Badge status={getStatusBadge(r.status)} label={r.status || 'Pending'} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                <div>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Date Submitted</strong>
                  <span>{formatDateTime(r.createdAt || r.created_at)}</span>
                </div>
                <div>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Category</strong>
                  <span>{CATEGORY_LABELS[r.category] || r.category}</span>
                </div>
              </div>

              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Requester Information</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)' }}>
                  <div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Name:</span> <strong style={{ fontWeight: 500 }}>{r.name || r.requester_name || r.full_name || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Phone:</span> <strong>{r.phone || r.requester_phone || '—'}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Email:</span> <span>{r.email || r.requester_email || '—'}</span>
                  </div>
                </div>
              </div>

              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Location/Floor</strong>
                <span>{r.location || r.floor || '—'}</span>
              </div>

              <div style={{ background: '#f9f9fb', padding: 'var(--space-3)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
                <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Request Details</strong>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--color-text-primary)' }}>
                  {meta && meta.request_type ? <strong>[{meta.request_type}] </strong> : ''}
                  {r.description || r.issue || r.exact_query || r.exact_issue || 'No details provided'}
                </p>
                {meta && meta.remarks && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    Remarks: {meta.remarks}
                  </p>
                )}
              </div>

              {itemsList.length > 0 && (
                <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Requested Items</strong>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-background-secondary)', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px' }}>Item Name</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsList.map((i, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '6px 8px' }}>
                            {i.item || i.name || 'Item'}
                            {i.remarks && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'block' }}>{i.remarks}</span>}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{i.qty || i.quantity || 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {r.remarks && (
                <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Remarks</strong>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>{r.remarks}</p>
                </div>
              )}

              {r.resolution && (
                <div>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Resolution</strong>
                  <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 500, color: 'var(--color-success)' }}>{r.resolution}</p>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

/* ─── Stock Management ────────────────────────────────────── */
