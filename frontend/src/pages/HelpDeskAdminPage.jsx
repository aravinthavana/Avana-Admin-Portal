import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import {
  helpdeskApi, stationeryApi, housekeepingApi, amcApi, utilityApi, taxApi, adminApi,
  assetTrackerApi, courierApi, pettyCashApi, travelApi, billWarrantyApi, otherStockApi, remindersApi,
} from '../lib/api';
import {
  Badge, Spinner, EmptyState, Alert, Modal, ConfirmModal,
  FormField, PageHeader, StatCard,
} from '../components/ui';

/* ─── Helpers ─────────────────────────────────────────────── */
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
  try { return new Date(dateStr).toLocaleString('en-IN'); } catch { return dateStr; }
}

function getStatusBadge(status) {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'paid' || s === 'approved' || s === 'confirmed') return 'approved';
  if (s === 'pending' || s === 'unpaid') return 'pending';
  if (s === 'in-progress') return 'in-progress';
  if (s === 'rejected' || s === 'overdue') return 'rejected';
  return 'pending';
}

const CATEGORY_LABELS = {
  conference:    'Conference Room',
  stationery:    'Stationery',
  hk_material:   'HK Material',
  admin_support: 'Admin Support',
  maintenance:   'Maintenance',
  housekeeping:  'Housekeeping',
  office_asset:  'Office Asset',
  print_scan:    'Print & Scan',
};

/* ─── Skeleton Rows ───────────────────────────────────────── */
function SkeletonRows({ cols = 8, rows = 5 }) {
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
function Pagination({ page, total, onPage }) {
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
function HelpdeskTable({ categoryFilter }) {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [catFilter, setCatFilter] = useState('all');
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
      return true;
    });
  }, [requests, categoryFilter, catFilter, fromDate, toDate]);

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

  const label = categoryFilter ? CATEGORY_LABELS[categoryFilter] || categoryFilter : 'All';

  return (
    <div>
      <PageHeader
        title={`📋 ${label} Requests${!categoryFilter && pendingCount > 0 ? ` (${pendingCount} pending)` : ''}`}
        subtitle={`Manage help desk requests${categoryFilter ? ` for ${CATEGORY_LABELS[categoryFilter] || categoryFilter}` : ''}`}
        action={
          <button type="button" className="btn btn--secondary btn--sm" onClick={fetchRequests}>
            🔄 Refresh
          </button>
        }
      />

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4) var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
            onClick={() => { setFromDate(''); setToDate(''); setCatFilter('all'); }}
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
          <table className="table" aria-label="Help desk requests" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Date</th>
                <th scope="col">Category</th>
                <th scope="col">Submitted By</th>
                <th scope="col">Location</th>
                <th scope="col">Details</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={8} rows={5} />
              ) : (
                filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r, idx) => {
                  const items = parseItems(r.items);
                  const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{globalIdx}</td>
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
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name || r.requester_name || r.full_name || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.email || r.requester_email || ''}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.phone || r.requester_phone || ''}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{r.location || r.floor || '—'}</td>
                      <td style={{ maxWidth: 220 }}>
                        <div style={{
                          fontSize: '0.83rem', color: 'var(--color-text-secondary)',
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {r.description || r.issue || r.exact_query || r.exact_issue || '—'}
                        </div>
                        {items.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                            Items: {items.map(i => `${i.item || i.name}(${i.qty || i.quantity || 1})`).join(', ')}
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
                                onClick={() => handleStatus(r.id, 'completed', r.category)}
                                aria-label="Mark as completed">
                                ✅
                              </button>
                              <button type="button" className="btn btn--sm btn--secondary"
                                title="Set Pending"
                                onClick={() => handleStatus(r.id, 'pending', r.category)}
                                aria-label="Set as pending">
                                🟡
                              </button>
                              <button type="button" className="btn btn--sm btn--secondary"
                                style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', borderColor: 'var(--color-error-border)' }}
                                title="Reject Request"
                                onClick={() => { setRejectBookingId(r.id); setRejectCategory(r.category); setRejectionReason(''); }}
                                aria-label="Reject request">
                                ❌
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
          const items = parseItems(r.items);
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

              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Exact Issue / Details</strong>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4', fontSize: '0.9rem' }}>
                  {r.description || r.issue || r.exact_query || r.exact_issue || '—'}
                </p>
              </div>

              {items.length > 0 && (
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
                      {items.map((it, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '6px 8px' }}>{it.item || it.name}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{it.qty || it.quantity || 1}</td>
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
function StockManager({ title, icon, type = 'stationery', getStock, updateStock, addItem, labelField = 'item_name' }) {
  const toast = useToast();
  const [stock, setStock] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addQtys, setAddQtys] = useState({});
  const [saving, setSaving] = useState({});

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('stationery');
  const [newItemStock, setNewItemStock] = useState('0');
  const [addingItem, setAddingItem] = useState(false);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStock();
      setStock(data || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getStock]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  async function handleUpdate(itemName, operation) {
    const qty = parseInt(addQtys[itemName] || 0, 10);
    if (isNaN(qty) || qty <= 0) { toast.warning('Enter a positive quantity.'); return; }
    setSaving(s => ({ ...s, [itemName]: true }));
    try {
      const modifier = operation === 'add' ? qty : -qty;
      const newQty = Math.max(0, (stock[itemName] || 0) + modifier);
      await updateStock({
        item: itemName,
        quantity: qty,
        transactionType: operation === 'add' ? 'purchase' : 'use'
      });
      setStock(s => ({ ...s, [itemName]: newQty }));
      setAddQtys(q => ({ ...q, [itemName]: '' }));
      toast.success(`${itemName} updated to ${newQty}.`);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSaving(s => ({ ...s, [itemName]: false }));
    }
  }

  async function handleAddItem(e) {
    e.preventDefault();
    if (!newItemName.trim()) { toast.warning('Enter an item name.'); return; }
    setAddingItem(true);
    try {
      if (type === 'stationery') {
        await addItem({ item: newItemName.trim(), type: newItemCategory, initialStock: parseInt(newItemStock, 10) || 0 });
      } else {
        await addItem({ item: newItemName.trim(), initialStock: parseInt(newItemStock, 10) || 0 });
      }
      toast.success(`"${newItemName}" added successfully.`);
      setNewItemName('');
      setNewItemStock('0');
      fetchStock();
    } catch (err) {
      toast.error(err.message || 'Failed to add item');
    } finally {
      setAddingItem(false);
    }
  }

  return (
    <div>
      <PageHeader title={`${icon} ${title}`} subtitle="Manage current inventory stock levels" />
      {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}
      {addItem && (
        <form onSubmit={handleAddItem} className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>➕ Add New {type === 'housekeeping' ? 'Housekeeping Item' : 'Item'}:</div>
          <input
            type="text"
            className="form-input"
            placeholder="Item Name (e.g. Gel Pen)"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            style={{ flex: 1, minWidth: '180px' }}
            required
          />
          {type === 'stationery' && (
            <select
              className="form-select"
              value={newItemCategory}
              onChange={e => setNewItemCategory(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="stationery">📦 Stationery Item</option>
              <option value="printing">🖨️ Printing / Form Item</option>
            </select>
          )}
          <input
            type="number"
            className="form-input"
            placeholder="Initial Stock"
            value={newItemStock}
            min="0"
            onChange={e => setNewItemStock(e.target.value)}
            style={{ width: '110px' }}
          />
          <button type="submit" className="btn btn-primary" disabled={addingItem} style={{ background: type === 'housekeeping' ? '#0d9488' : '#059669', borderColor: 'transparent' }}>
            {addingItem ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      )}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
        ) : Object.keys(stock).length === 0 ? (
          <EmptyState icon="📦" title="No stock data" description="Stock data will appear here once initialized." />
        ) : (
          <div className="table-wrapper">
            <table className="table" aria-label={`${title} stock table`}>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Item Name</th>
                  <th scope="col">Current Stock</th>
                  <th scope="col">Adjustment Quantity</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stock).map(([itemName, qty], idx) => (
                  <tr key={itemName}>
                    <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>{itemName}</td>
                    <td>
                      <span style={{
                        fontWeight: 700, fontSize: '1.1rem',
                        color: qty <= 0 ? 'var(--color-error)' : qty <= 5 ? 'var(--color-warning)' : 'var(--color-success)',
                      }}>
                        {qty}
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={addQtys[itemName] || ''}
                        placeholder="e.g. 5"
                        onChange={e => setAddQtys(q => ({ ...q, [itemName]: e.target.value }))}
                        aria-label={`Quantity change for ${itemName}`}
                        style={{ width: 120 }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                          type="button"
                          className="btn btn--sm"
                          style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--color-success-border)' }}
                          onClick={() => handleUpdate(itemName, 'add')}
                          disabled={saving[itemName]}
                          aria-label={`Add to ${itemName} stock`}
                        >
                          {saving[itemName] ? '...' : '+ Add'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--sm"
                          style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', borderColor: 'var(--color-error-border)' }}
                          onClick={() => handleUpdate(itemName, 'use')}
                          disabled={saving[itemName] || qty <= 0}
                          aria-label={`Consume from ${itemName} stock`}
                        >
                          {saving[itemName] ? '...' : '− Consume'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Stationery Audit ────────────────────────────────────── */
function StationeryAudit() {
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const fetchAudit = useCallback(() => {
    setLoading(true);
    stationeryApi.getAudit(month)
      .then(data => setAudit(data || {}))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  return (
    <div>
      <PageHeader 
        title="📊 Monthly Stationery Audit" 
        subtitle="View monthly consumption and stock audit records" 
        action={
          <input type="month" className="form-input" value={month} onChange={e => setMonth(e.target.value)} />
        }
      />
      {error && <Alert type="error">{error}</Alert>}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
          : Object.keys(audit).length === 0 ? <EmptyState icon="📊" title="No audit records" />
          : (
            <div className="table-wrapper">
              <table className="table" aria-label="Stationery monthly audit">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Month/Year</th>
                    <th scope="col">Item</th>
                    <th scope="col">Opening Stock</th>
                    <th scope="col">Issued</th>
                    <th scope="col">Closing Stock</th>
                    <th scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(audit).map(([itemName, a], idx) => (
                    <tr key={itemName}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 500 }}>{month}</td>
                      <td>{itemName}</td>
                      <td>{a.startingStock ?? '—'}</td>
                      <td>{a.used ?? '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{a.endingStock ?? '—'}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                        {a.purchased > 0 ? `Purchased: ${a.purchased}` : '—'}
                      </td>
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

/* ─── Housekeeping Audit ──────────────────────────────────── */
function HousekeepingAudit() {
  const [audit, setAudit] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const fetchAudit = useCallback(() => {
    setLoading(true);
    housekeepingApi.getAudit(month)
      .then(data => setAudit(data || {}))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  return (
    <div>
      <PageHeader
        title="🧴 Monthly Housekeeping Audit"
        subtitle="View monthly consumption and stock audit records"
        action={
          <input type="month" className="form-input" value={month} onChange={e => setMonth(e.target.value)} />
        }
      />
      {error && <Alert type="error">{error}</Alert>}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
          : Object.keys(audit).length === 0 ? <EmptyState icon="🧴" title="No audit records" description="No housekeeping stock transactions found for this month." />
          : (
            <div className="table-wrapper">
              <table className="table" aria-label="Housekeeping monthly audit">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Month/Year</th>
                    <th scope="col">Item</th>
                    <th scope="col">Opening Stock</th>
                    <th scope="col">Issued</th>
                    <th scope="col">Closing Stock</th>
                    <th scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(audit).map(([itemName, a], idx) => (
                    <tr key={itemName}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 500 }}>{month}</td>
                      <td>{itemName}</td>
                      <td>{a.startingStock ?? '—'}</td>
                      <td>{a.used ?? '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{a.endingStock ?? '—'}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                        {a.purchased > 0 ? `Purchased: ${a.purchased}` : '—'}
                      </td>
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

/* ─── AMC Contracts ───────────────────────────────────────── */
function AMCPage() {
  const toast = useToast();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [visitModal, setVisitModal] = useState(null); // contract id
  const [form, setForm] = useState({
    equipment_name: '', vendor_name: '', contact_person: '', start_date: '', end_date: '',
    cost: '', status: 'active', remarks: ''
  });
  const [visitForm, setVisitForm] = useState({
    visit_date: '', technician_name: '', work_done: '', status: 'completed',
  });
  const [formErrors, setFormErrors] = useState({});
  const [visitErrors, setVisitErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try { setContracts((await amcApi.getAll()) || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  async function handleSaveContract(e) {
    e.preventDefault();
    const errs = {};
    if (!form.equipment_name?.trim()) errs.equipment_name = 'Equipment required';
    if (!form.vendor_name?.trim()) errs.vendor_name = 'Vendor required';
    
    if (!form.start_date) {
      errs.start_date = 'Start date required';
    } else if (isNaN(Date.parse(form.start_date))) {
      errs.start_date = 'Start date must be a valid date';
    }

    if (!form.end_date) {
      errs.end_date = 'End date required';
    } else if (isNaN(Date.parse(form.end_date))) {
      errs.end_date = 'End date must be a valid date';
    } else if (form.start_date && new Date(form.end_date) < new Date(form.start_date)) {
      errs.end_date = 'End date must be after start date';
    }

    if (form.cost !== undefined && form.cost !== null && form.cost.toString().trim() !== '') {
      const costNum = Number(form.cost);
      if (isNaN(costNum) || costNum < 0) {
        errs.cost = 'Cost must be a valid positive number';
      }
    }
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      await amcApi.save(form);
      toast.success('Contract saved!');
      setShowForm(false);
      setForm({ equipment_name:'',vendor:'',contact:'',start_date:'',end_date:'',cost:'',status:'active' });
      fetchContracts();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteContract(id) {
    try {
      await amcApi.delete(id);
      toast.success('Contract deleted.');
      setContracts(prev => prev.filter(c => c.id !== id));
    } catch (err) { toast.error(err.message); }
  }

  async function handleLogVisit(e) {
    e.preventDefault();
    const errs = {};
    if (!visitForm.visit_date) errs.visit_date = 'Visit date required';
    if (!visitForm.work_done.trim()) errs.work_done = 'Work done required';
    if (Object.keys(errs).length > 0) { setVisitErrors(errs); return; }
    setSaving(true);
    try {
      await amcApi.saveVisit({ amc_id: visitModal, ...visitForm });
      toast.success('Visit logged!');
      setVisitModal(null);
      setVisitForm({ visit_date:'',technician_name:'',work_done:'',status:'completed' });
      fetchContracts();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  const AMC_STATUS_OPTIONS = ['active','expiring','expired'];

  return (
    <div>
      <PageHeader
        title="📋 AMC Contracts"
        subtitle="Annual Maintenance Contract management"
        action={
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowForm(s => !s)}>
            {showForm ? '✕ Cancel' : '+ Add Contract'}
          </button>
        }
      />

      {showForm && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-5)', fontSize: '1rem' }}>
            Add AMC Contract
          </h3>
          <form onSubmit={handleSaveContract} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'var(--space-4)' }}>
              <FormField label="Equipment Name" required htmlFor="amc-equip" error={formErrors.equipment_name}>
                <input id="amc-equip" type="text" className="form-input" value={form.equipment_name}
                  onChange={e => setForm(f => ({ ...f, equipment_name: e.target.value }))} />
              </FormField>
              <FormField label="Vendor" required htmlFor="amc-vendor" error={formErrors.vendor_name}>
                <input id="amc-vendor" type="text" className="form-input" value={form.vendor_name}
                  onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} />
              </FormField>
              <FormField label="Contact" htmlFor="amc-contact">
                <input id="amc-contact" type="text" className="form-input" value={form.contact_person}
                  onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
              </FormField>
              <FormField label="Start Date" required htmlFor="amc-start" error={formErrors.start_date}>
                <input id="amc-start" type="date" className="form-input" value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </FormField>
              <FormField label="End Date" required htmlFor="amc-end" error={formErrors.end_date}>
                <input id="amc-end" type="date" className="form-input" value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </FormField>
              <FormField label="Cost (₹)" htmlFor="amc-cost">
                <input id="amc-cost" type="number" className="form-input" value={form.cost}
                  onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
              </FormField>
              <FormField label="Status" htmlFor="amc-status">
                <select id="amc-status" className="form-select" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {AMC_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className={`btn btn--primary${saving ? ' btn--loading' : ''}`} disabled={saving}>
                {saving ? '' : 'Save Contract'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <Alert type="error">{error}</Alert>}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
          : contracts.length === 0 ? <EmptyState icon="📋" title="No contracts yet" description="Add your first AMC contract above." />
          : (
            <div className="table-wrapper">
              <table className="table" aria-label="AMC contracts" style={{ minWidth: 800 }}>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Equipment</th>
                    <th scope="col">Vendor / Contact</th>
                    <th scope="col">Period</th>
                    <th scope="col">Cost</th>
                    <th scope="col">Visits</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c, idx) => (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{c.equipment_name}</td>
                      <td>
                        <div>{c.vendor_name || c.vendor || '—'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                          {c.contact_person || c.contact_number || c.contact || '—'}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {formatDate(c.start_date)} – {formatDate(c.end_date)}
                      </td>
                      <td>{c.cost ? `₹${Number(c.cost).toLocaleString()}` : '—'}</td>
                      <td style={{ textAlign: 'center' }}>{c.visits_count ?? c.visits?.length ?? 0}</td>
                      <td>
                        {(() => {
                          const isExpiring = c.status === 'active' && c.end_date &&
                            (new Date(c.end_date) - new Date() < 30 * 24 * 60 * 60 * 1000) &&
                            (new Date(c.end_date) > new Date());
                          const statusVal = isExpiring ? 'expiring' : (c.status || 'active');
                          const labelVal = isExpiring ? 'Expiring Soon ⚠️' : (c.status || 'Active');
                          return <Badge status={statusVal} label={labelVal} />;
                        })()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button type="button" className="btn btn--sm btn--secondary"
                            onClick={() => setVisitModal(c.id)} aria-label={`Log visit for ${c.equipment_name}`}>
                            📝 Log Visit
                          </button>
                          <button type="button" className="btn btn--sm btn--danger"
                            onClick={() => handleDeleteContract(c.id)} aria-label={`Delete ${c.equipment_name}`}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>

      {/* Log Visit Modal */}
      <Modal
        isOpen={!!visitModal}
        onClose={() => { setVisitModal(null); setVisitErrors({}); }}
        title="📝 Log Service Visit"
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setVisitModal(null)}>Cancel</button>
            <button type="button" className={`btn btn--primary${saving ? ' btn--loading' : ''}`}
              onClick={handleLogVisit} disabled={saving}>
              {saving ? '' : 'Save Visit'}
            </button>
          </>
        }
      >
        <form onSubmit={handleLogVisit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <FormField label="Visit Date" required htmlFor="visit-date" error={visitErrors.visit_date}>
              <input id="visit-date" type="date" className="form-input" value={visitForm.visit_date}
                onChange={e => setVisitForm(f => ({ ...f, visit_date: e.target.value }))} />
            </FormField>
            <FormField label="Technician Name" htmlFor="visit-tech">
              <input id="visit-tech" type="text" className="form-input" value={visitForm.technician_name}
                onChange={e => setVisitForm(f => ({ ...f, technician_name: e.target.value }))} />
            </FormField>
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <FormField label="Work Done" required htmlFor="visit-work" error={visitErrors.work_done}>
              <textarea id="visit-work" className={`form-textarea${visitErrors.work_done ? ' form-textarea--error' : ''}`}
                rows={3} value={visitForm.work_done}
                onChange={e => setVisitForm(f => ({ ...f, work_done: e.target.value }))} />
            </FormField>
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <FormField label="Status" htmlFor="visit-status">
              <select id="visit-status" className="form-select" value={visitForm.status}
                onChange={e => setVisitForm(f => ({ ...f, status: e.target.value }))}>
                {['completed','pending','in-progress'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ─── Utility / Tax Payments (shared pattern) ─────────────── */
function PaymentsPage({ title, icon, api, fields }) {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try { setRecords((await api.getAll()) || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function openNew() {
    setEditId(null);
    setForm({});
    setFormErrors({});
    setShowForm(true);
  }

  function openEdit(r) {
    setEditId(r.id);
    setForm({ ...r });
    setFormErrors({});
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    const errs = {};
    fields.forEach(f => {
      const val = form[f.key];
      if (f.required && (val === undefined || val === null || val.toString().trim() === '')) {
        errs[f.key] = `${f.label} is required`;
      } else if (val !== undefined && val !== null && val.toString().trim() !== '') {
        if (f.type === 'number') {
          const num = Number(val);
          if (isNaN(num) || num < 0) {
            errs[f.key] = `${f.label} must be a valid positive number`;
          }
        } else if (f.type === 'date') {
          if (isNaN(Date.parse(val))) {
            errs[f.key] = `${f.label} must be a valid date`;
          }
        }
      }
    });
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      if (editId) { await api.update(editId, form); toast.success('Record updated.'); }
      else { await api.save(form); toast.success('Record added.'); }
      setShowForm(false);
      fetchRecords();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    try {
      await api.delete(id);
      toast.success('Record deleted.');
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) { toast.error(err.message); }
    finally { setConfirmId(null); }
  }

  const visibleFields = fields.filter(f => f.showInTable !== false);

  return (
    <div>
      <PageHeader
        title={`${icon} ${title}`}
        subtitle={`Manage ${title.toLowerCase()} records`}
        action={
          <button type="button" className="btn btn--primary btn--sm" onClick={openNew}>+ Add Record</button>
        }
      />

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-5)', fontSize: '1rem' }}>
            {editId ? 'Edit' : 'Add'} Record
          </h3>
          <form onSubmit={handleSave} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'var(--space-4)' }}>
              {fields.map(field => (
                <FormField key={field.key} label={field.label} required={field.required}
                  htmlFor={`pay-${field.key}`} error={formErrors[field.key]}>
                  {field.type === 'select' ? (
                    <select id={`pay-${field.key}`}
                      className={`form-select${formErrors[field.key] ? ' form-select--error' : ''}`}
                      value={form[field.key] || ''}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}>
                      <option value="">Select…</option>
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea id={`pay-${field.key}`}
                      className={`form-textarea${formErrors[field.key] ? ' form-textarea--error' : ''}`}
                      rows={2} value={form[field.key] || ''}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))} />
                  ) : (
                    <input id={`pay-${field.key}`} type={field.type || 'text'}
                      className={`form-input${formErrors[field.key] ? ' form-input--error' : ''}`}
                      value={form[field.key] || ''}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))} />
                  )}
                </FormField>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className={`btn btn--primary${saving ? ' btn--loading' : ''}`} disabled={saving}>
                {saving ? '' : editId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <Alert type="error">{error}</Alert>}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
          : records.length === 0 ? <EmptyState icon="💳" title="No records yet" />
          : (
            <div className="table-wrapper">
              <table className="table" aria-label={`${title} table`} style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    {visibleFields.map(f => <th key={f.key} scope="col">{f.label}</th>)}
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, idx) => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                      {visibleFields.map(f => (
                        <td key={f.key} style={{ fontSize: '0.87rem' }}>
                          {f.key === 'status' ? (() => {
                            const isOverdue = r.status === 'Unpaid' && r.due_date && new Date(r.due_date) < new Date(new Date().setHours(0,0,0,0));
                            const statusVal = isOverdue ? 'Overdue' : (r[f.key] || 'Unpaid');
                            return <Badge status={getStatusBadge(statusVal)} label={statusVal} />;
                          })() : f.type === 'date' ? formatDate(r[f.key])
                          : r[f.key] ?? '—'}
                        </td>
                      ))}
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button type="button" className="btn btn--sm btn--secondary"
                            onClick={() => openEdit(r)} aria-label="Edit record">✏️</button>
                          <button type="button" className="btn btn--sm btn--danger"
                            onClick={() => setConfirmId(r.id)} aria-label="Delete record">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>

      <ConfirmModal
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => handleDelete(confirmId)}
        title="Delete Record"
        message="Are you sure you want to delete this record?"
        confirmLabel="Delete"
        dangerous
      />
    </div>
  );
}

/* ─── Login Audit ─────────────────────────────────────────── */
function LoginAuditPage() {
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
function AdminSettings() {
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
function AssetTrackerPage() {
  const toast = useToast();
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [appendModalOpen, setAppendModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedHandover, setSelectedHandover] = useState(null);

  // Add Form State
  const [addForm, setAddForm] = useState({
    name: '', email: '', department: '', handoverDate: new Date().toISOString().slice(0,10), handoverBy: 'Admin', remarks: '', sendEmail: true,
    items: [{ itemName: '', serialNo: '', condition: 'Good' }]
  });
  const [submitting, setSubmitting] = useState(false);

  // Append Form State
  const [appendItems, setAppendItems] = useState([{ itemName: '', serialNo: '', condition: 'Good' }]);
  const [appendSendEmail, setAppendSendEmail] = useState(true);

  // Return Form State
  const [returnRemarks, setReturnRemarks] = useState('');

  const fetchHandovers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await assetTrackerApi.getAll();
      setHandovers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHandovers(); }, [fetchHandovers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!addForm.name || !addForm.email) { toast.warning('Name and email required.'); return; }
    setSubmitting(true);
    try {
      await assetTrackerApi.create(addForm);
      toast.success('Asset handover created & notification sent!');
      setAddModalOpen(false);
      setAddForm({
        name: '', email: '', department: '', handoverDate: new Date().toISOString().slice(0,10), handoverBy: 'Admin', remarks: '', sendEmail: true,
        items: [{ itemName: '', serialNo: '', condition: 'Good' }]
      });
      fetchHandovers();
    } catch (err) {
      toast.error(err.message || 'Creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemind = async (id) => {
    try {
      await assetTrackerApi.remind(id);
      toast.success('Reminder email sent successfully!');
    } catch (err) {
      toast.error(err.message || 'Reminder failed');
    }
  };

  const handleAppend = async (e) => {
    e.preventDefault();
    if (!selectedHandover) return;
    setSubmitting(true);
    try {
      await assetTrackerApi.append(selectedHandover.id, appendItems, appendSendEmail);
      toast.success('Additional items appended!');
      setAppendModalOpen(false);
      fetchHandovers();
    } catch (err) {
      toast.error(err.message || 'Append failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    if (!selectedHandover) return;
    setSubmitting(true);
    try {
      await assetTrackerApi.returnAssets(selectedHandover.id, null, returnRemarks);
      toast.success('Asset return processed!');
      setReturnModalOpen(false);
      fetchHandovers();
    } catch (err) {
      toast.error(err.message || 'Return processing failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await assetTrackerApi.delete(deleteId);
      toast.success('Handover record deleted.');
      fetchHandovers();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = handovers.filter(h => {
    const matchesSearch = (h.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (h.email || '').toLowerCase().includes(search.toLowerCase()) ||
                          (h.department || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || h.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <PageHeader
        title="💻 Asset Tracker & Employee Handovers"
        subtitle="Track corporate hardware & furniture assigned to employees with digital acknowledgements"
      />

      {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Top Action Bar & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flex: 1, minWidth: 260 }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Search employee name, email, department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 350 }}
          />
          <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">All Statuses</option>
            <option value="Pending Acknowledgement">Pending Ack</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resigned/Returned">Resigned/Returned</option>
          </select>
        </div>

        <button className="btn btn--primary" onClick={() => setAddModalOpen(true)} style={{ background: '#2563eb', borderColor: 'transparent' }}>
          ➕ New Asset Handover
        </button>
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="💻" title="No asset handovers found" description="Create a new asset handover to start tracking hardware issued to employees." />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Employee Name</th>
                  <th scope="col">Department</th>
                  <th scope="col">Handover Date</th>
                  <th scope="col">Assigned Items</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h, idx) => {
                  let badgeStatus = 'warning';
                  if (h.status === 'Acknowledged') badgeStatus = 'success';
                  if (h.status === 'Resigned/Returned') badgeStatus = 'neutral';

                  return (
                    <tr key={h.id}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{h.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{h.email}</div>
                      </td>
                      <td style={{ fontSize: '0.88rem' }}>{h.department || '—'}</td>
                      <td style={{ fontSize: '0.88rem', whiteSpace: 'nowrap' }}>{h.handoverDate}</td>
                      <td>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem' }}>
                          {(h.items || []).map((it, i) => (
                            <li key={it.id || i} style={{ textDecoration: it.status === 'Returned' ? 'line-through' : 'none', color: it.status === 'Returned' ? 'var(--color-text-muted)' : 'inherit' }}>
                              <strong>{it.itemName}</strong> {it.serialNo ? `(${it.serialNo})` : ''}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <Badge status={badgeStatus} label={h.status} />
                        {h.acknowledgedAt && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 3 }}>
                            Signed: {formatDateTime(h.acknowledgedAt)}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {h.status === 'Pending Acknowledgement' && (
                            <button className="btn btn--sm btn--secondary" title="Send reminder email" onClick={() => handleRemind(h.id)}>
                              🔔 Remind
                            </button>
                          )}
                          {h.status !== 'Resigned/Returned' && (
                            <>
                              <button className="btn btn--sm btn--outline" onClick={() => { setSelectedHandover(h); setAppendItems([{ itemName: '', serialNo: '', condition: 'Good' }]); setAppendModalOpen(true); }}>
                                ➕ Append
                              </button>
                              <button className="btn btn--sm btn--warning" onClick={() => { setSelectedHandover(h); setReturnRemarks(''); setReturnModalOpen(true); }}>
                                🔄 Return
                              </button>
                            </>
                          )}
                          <button className="btn btn--sm btn--danger" onClick={() => setDeleteId(h.id)}>
                            🗑️
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

      {/* Modal: New Handover */}
      {addModalOpen && (
        <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="➕ Create Asset Handover Record">
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Employee Name" required>
                <input type="text" className="form-input" required value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" />
              </FormField>
              <FormField label="Employee Email" required>
                <input type="email" className="form-input" required value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="john@avanamedical.com" />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Department">
                <input type="text" className="form-input" value={addForm.department} onChange={e => setAddForm(f => ({ ...f, department: e.target.value }))} placeholder="Sales / IT / HR" />
              </FormField>
              <FormField label="Handover Date">
                <input type="date" className="form-input" value={addForm.handoverDate} onChange={e => setAddForm(f => ({ ...f, handoverDate: e.target.value }))} />
              </FormField>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
              📦 Asset Items List
            </h4>
            {addForm.items.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                <input type="text" className="form-input" placeholder="Item (e.g. Laptop)" required value={it.itemName} onChange={e => {
                  const arr = [...addForm.items]; arr[idx].itemName = e.target.value; setAddForm(f => ({ ...f, items: arr }));
                }} style={{ flex: 2 }} />
                <input type="text" className="form-input" placeholder="Serial No / Specs" value={it.serialNo} onChange={e => {
                  const arr = [...addForm.items]; arr[idx].serialNo = e.target.value; setAddForm(f => ({ ...f, items: arr }));
                }} style={{ flex: 2 }} />
                <select className="form-select" value={it.condition} onChange={e => {
                  const arr = [...addForm.items]; arr[idx].condition = e.target.value; setAddForm(f => ({ ...f, items: arr }));
                }} style={{ flex: 1 }}>
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Used">Used</option>
                </select>
                {addForm.items.length > 1 && (
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => {
                    setAddForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
                  }}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn--sm btn--outline" onClick={() => setAddForm(f => ({ ...f, items: [...f.items, { itemName: '', serialNo: '', condition: 'Good' }] }))} style={{ marginBottom: 'var(--space-4)' }}>
              ➕ Add Another Item
            </button>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={addForm.sendEmail} onChange={e => setAddForm(f => ({ ...f, sendEmail: e.target.checked }))} />
                <span>Dispatched Email with Digital Acknowledgement Link to Employee</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setAddModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Creating...' : 'Save & Send Notification'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Append Items */}
      {appendModalOpen && selectedHandover && (
        <Modal isOpen={appendModalOpen} onClose={() => setAppendModalOpen(false)} title={`➕ Append Items for ${selectedHandover.name}`}>
          <form onSubmit={handleAppend}>
            {appendItems.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                <input type="text" className="form-input" placeholder="Item Name" required value={it.itemName} onChange={e => {
                  const arr = [...appendItems]; arr[idx].itemName = e.target.value; setAppendItems(arr);
                }} style={{ flex: 2 }} />
                <input type="text" className="form-input" placeholder="Serial No" value={it.serialNo} onChange={e => {
                  const arr = [...appendItems]; arr[idx].serialNo = e.target.value; setAppendItems(arr);
                }} style={{ flex: 2 }} />
                <select className="form-select" value={it.condition} onChange={e => {
                  const arr = [...appendItems]; arr[idx].condition = e.target.value; setAppendItems(arr);
                }} style={{ flex: 1 }}>
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Used">Used</option>
                </select>
              </div>
            ))}
            <button type="button" className="btn btn--sm btn--outline" onClick={() => setAppendItems([...appendItems, { itemName: '', serialNo: '', condition: 'Good' }])} style={{ marginBottom: 'var(--space-4)' }}>
              ➕ Add Another Row
            </button>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={appendSendEmail} onChange={e => setAppendSendEmail(e.target.checked)} />
                <span>Notify employee via email about appended items</span>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setAppendModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Saving...' : 'Append Items'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Process Return */}
      {returnModalOpen && selectedHandover && (
        <Modal isOpen={returnModalOpen} onClose={() => setReturnModalOpen(false)} title={`🔄 Resignation / Asset Return - ${selectedHandover.name}`}>
          <form onSubmit={handleReturn}>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', fontSize: '0.9rem' }}>
              Confirm that all assigned items have been returned by the employee. This will update the handover status to <strong>Resigned/Returned</strong>.
            </p>
            <FormField label="Return Remarks / Clearance Notes">
              <textarea className="form-textarea" rows={3} placeholder="All hardware returned intact, clearance granted..." value={returnRemarks} onChange={e => setReturnRemarks(e.target.value)} />
            </FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setReturnModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--danger" disabled={submitting}>{submitting ? 'Processing...' : 'Mark Resigned / Returned'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {deleteId && (
        <ConfirmModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Asset Handover Record"
          message="Are you sure you want to delete this asset handover record? This action cannot be undone."
          confirmLabel="Delete Record"
          dangerous
        />
      )}
    </div>
  );
}

/* ─── Courier Dispatches Component ────────────────────────── */
function CourierDispatchPage() {
  const toast = useToast();
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedDispatch, setSelectedDispatch] = useState(null);

  // New DC Form State
  const [addForm, setAddForm] = useState({
    dcDate: new Date().toISOString().slice(0,10),
    remarksType: 'Service',
    remarksOther: '',
    courierBilling: 'Avana Medical Devices Pvt Ltd',
    senderName: 'Admin',
    senderPhone: '',
    fromAddressText: 'Avana Medical Devices Pvt Ltd.,\nNo.91, Sundar Nagar 4th Avenue, Nandambakkam,\nChennai – 600032, Tamil Nadu, India.',
    receiverName: '',
    receiverPhone: '',
    toAddress: '',
    transporterName: 'Dexpress',
    docketNo: '',
    transporterAmount: '',
    noOfBoxes: 1,
    dimensions: '',
    weight: '',
    items: [{ description: '', serialNo: '', qty: 1, rate: 0 }]
  });
  const [submitting, setSubmitting] = useState(false);

  // Tracking Form State
  const [trackingForm, setTrackingForm] = useState({ transporterName: '', docketNo: '', transporterAmount: '' });

  // Merge Form State
  const [mergeItems, setMergeItems] = useState([{ description: '', serialNo: '', qty: 1, rate: 0 }]);
  const [mergeRemarks, setMergeRemarks] = useState('');

  const fetchDispatches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await courierApi.getAll();
      setDispatches(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDispatches(); }, [fetchDispatches]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!addForm.receiverName || !addForm.toAddress) { toast.warning('Receiver name and destination address required.'); return; }
    setSubmitting(true);
    try {
      await courierApi.create(addForm);
      toast.success('Delivery Challan created successfully!');
      setAddModalOpen(false);
      fetchDispatches();
    } catch (err) {
      toast.error(err.message || 'Creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTracking = async (e) => {
    e.preventDefault();
    if (!selectedDispatch) return;
    setSubmitting(true);
    try {
      await courierApi.updateTracking(selectedDispatch.id, trackingForm);
      toast.success('Tracking & courier info updated.');
      setTrackingModalOpen(false);
      fetchDispatches();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMerge = async (e) => {
    e.preventDefault();
    if (!selectedDispatch) return;
    setSubmitting(true);
    try {
      await courierApi.merge(selectedDispatch.id, mergeItems, mergeRemarks);
      toast.success('Parcels merged into Delivery Challan successfully!');
      setMergeModalOpen(false);
      fetchDispatches();
    } catch (err) {
      toast.error(err.message || 'Parcel merge failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await courierApi.delete(deleteId);
      toast.success('Delivery Challan deleted.');
      fetchDispatches();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = dispatches.filter(d => {
    const s = search.toLowerCase();
    return (d.dcNo || '').toLowerCase().includes(s) ||
           (d.receiverName || '').toLowerCase().includes(s) ||
           (d.senderName || '').toLowerCase().includes(s) ||
           (d.toAddress || '').toLowerCase().includes(s) ||
           (d.docketNo || '').toLowerCase().includes(s);
  });

  return (
    <div>
      <PageHeader
        title="🚚 Courier Dispatches & Delivery Challans"
        subtitle="Manage outbound shipments, auto-generate official Delivery Challan PDFs, and merge parcels"
      />

      {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <input
          type="text"
          className="form-input"
          placeholder="🔍 Search DC No, Recipient, City, Docket No..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
        <button className="btn btn--primary" onClick={() => setAddModalOpen(true)} style={{ background: '#0284c7', borderColor: 'transparent' }}>
          ➕ New Delivery Challan
        </button>
      </div>

      {/* Dispatches Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🚚" title="No Delivery Challans found" description="Create a new Delivery Challan to manage parcel dispatches." />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">DC #</th>
                  <th scope="col">Date</th>
                  <th scope="col">Billing Entity / Category</th>
                  <th scope="col">Consignee (Recipient)</th>
                  <th scope="col">Itemized Summary</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Total Value</th>
                  <th scope="col">Courier / Docket</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className="badge badge--info" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                        #{d.dcNo}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.88rem' }}>{d.dcDate}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{d.courierBilling || 'Avana Group'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{d.remarksType}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.receiverName || 'Recipient'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {d.toAddress}
                      </div>
                    </td>
                    <td>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.82rem' }}>
                        {(d.items || []).map((it, i) => (
                          <li key={it.id || i}>
                            {it.description} x{it.qty}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '0.92rem' }}>
                      ₹{(d.totalAmount || 0).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{d.transporterName || '—'}</div>
                      <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
                        {d.docketNo ? `Waybill: ${d.docketNo}` : 'No tracking'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <a
                          href={`/api/courier-dispatches/dc-print/${d.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn--sm btn--outline"
                          title="Print or download Delivery Challan HTML/PDF"
                        >
                          📄 View DC
                        </a>
                        <button
                          className="btn btn--sm btn--secondary"
                          title="Merge parcel into this shipment"
                          onClick={() => { setSelectedDispatch(d); setMergeItems([{ description: '', serialNo: '', qty: 1, rate: 0 }]); setMergeRemarks(''); setMergeModalOpen(true); }}
                        >
                          📦 Merge
                        </button>
                        <button
                          className="btn btn--sm btn--outline"
                          title="Edit vendor tracking number & fee"
                          onClick={() => { setSelectedDispatch(d); setTrackingForm({ transporterName: d.transporterName || '', docketNo: d.docketNo || '', transporterAmount: d.transporterAmount || '' }); setTrackingModalOpen(true); }}
                        >
                          ✏️
                        </button>
                        <button className="btn btn--sm btn--danger" onClick={() => setDeleteId(d.id)}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Delivery Challan */}
      {addModalOpen && (
        <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="➕ Create New Delivery Challan (DC)">
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Challan Date">
                <input type="date" className="form-input" value={addForm.dcDate} onChange={e => setAddForm(f => ({ ...f, dcDate: e.target.value }))} />
              </FormField>
              <FormField label="Billing Entity">
                <select className="form-select" value={addForm.courierBilling} onChange={e => setAddForm(f => ({ ...f, courierBilling: e.target.value }))}>
                  <option value="Avana Medical Devices Pvt Ltd">Avana Medical Devices Pvt Ltd</option>
                  <option value="Avana Technology Services Pvt Ltd">Avana Technology Services Pvt Ltd</option>
                </select>
              </FormField>
              <FormField label="Shipment Category / Remarks">
                <select className="form-select" value={addForm.remarksType} onChange={e => setAddForm(f => ({ ...f, remarksType: e.target.value }))}>
                  <option value="Stationery">Stationery</option>
                  <option value="Glass item">Glass item</option>
                  <option value="Service">Service</option>
                  <option value="Demo">Demo</option>
                  <option value="Others">Others</option>
                </select>
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div style={{ background: '#f8fafc', padding: 'var(--space-3)', borderRadius: 'var(--radius)', border: '1px solid #e2e8f0' }}>
                <h5 style={{ margin: '0 0 var(--space-2) 0', fontSize: '0.85rem', color: 'var(--color-primary-dark)' }}>SENDER / CONSIGNOR</h5>
                <FormField label="Sender Name">
                  <input type="text" className="form-input" value={addForm.senderName} onChange={e => setAddForm(f => ({ ...f, senderName: e.target.value }))} />
                </FormField>
                <FormField label="From Address">
                  <textarea className="form-textarea" rows={2} value={addForm.fromAddressText} onChange={e => setAddForm(f => ({ ...f, fromAddressText: e.target.value }))} />
                </FormField>
              </div>

              <div style={{ background: '#f0f9ff', padding: 'var(--space-3)', borderRadius: 'var(--radius)', border: '1px solid #bae6fd' }}>
                <h5 style={{ margin: '0 0 var(--space-2) 0', fontSize: '0.85rem', color: '#0369a1' }}>RECIPIENT / CONSIGNEE *</h5>
                <FormField label="Receiver Name" required>
                  <input type="text" className="form-input" required value={addForm.receiverName} onChange={e => setAddForm(f => ({ ...f, receiverName: e.target.value }))} placeholder="Dr. John Smith / Client" />
                </FormField>
                <FormField label="Destination Address" required>
                  <textarea className="form-textarea" rows={2} required value={addForm.toAddress} onChange={e => setAddForm(f => ({ ...f, toAddress: e.target.value }))} placeholder="Full address with Pincode & City..." />
                </FormField>
              </div>
            </div>

            {/* Dynamic Items Table */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>📦 Dispatched Items</h4>
            {addForm.items.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                <input type="text" className="form-input" placeholder="Item Description" required value={it.description} onChange={e => {
                  const arr = [...addForm.items]; arr[idx].description = e.target.value; setAddForm(f => ({ ...f, items: arr }));
                }} style={{ flex: 3 }} />
                <input type="text" className="form-input" placeholder="S/N" value={it.serialNo} onChange={e => {
                  const arr = [...addForm.items]; arr[idx].serialNo = e.target.value; setAddForm(f => ({ ...f, items: arr }));
                }} style={{ flex: 2 }} />
                <input type="number" className="form-input" placeholder="Qty" min="1" value={it.qty} onChange={e => {
                  const arr = [...addForm.items]; arr[idx].qty = parseInt(e.target.value, 10) || 1; setAddForm(f => ({ ...f, items: arr }));
                }} style={{ width: 70 }} />
                <input type="number" className="form-input" placeholder="Rate (₹)" min="0" value={it.rate} onChange={e => {
                  const arr = [...addForm.items]; arr[idx].rate = parseFloat(e.target.value) || 0; setAddForm(f => ({ ...f, items: arr }));
                }} style={{ width: 100 }} />
                {addForm.items.length > 1 && (
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => {
                    setAddForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
                  }}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn--sm btn--outline" onClick={() => setAddForm(f => ({ ...f, items: [...f.items, { description: '', serialNo: '', qty: 1, rate: 0 }] }))} style={{ marginBottom: 'var(--space-4)' }}>
              ➕ Add Another Item Row
            </button>

            {/* Courier & Tracking Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Courier Vendor">
                <input type="text" className="form-input" placeholder="Dexpress / DTDC / BlueDart" value={addForm.transporterName} onChange={e => setAddForm(f => ({ ...f, transporterName: e.target.value }))} />
              </FormField>
              <FormField label="Docket / Waybill No">
                <input type="text" className="form-input" placeholder="Tracking Number" value={addForm.docketNo} onChange={e => setAddForm(f => ({ ...f, docketNo: e.target.value }))} />
              </FormField>
              <FormField label="Courier Fee (₹)">
                <input type="number" className="form-input" placeholder="0.00" value={addForm.transporterAmount} onChange={e => setAddForm(f => ({ ...f, transporterAmount: e.target.value }))} />
              </FormField>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setAddModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Generating...' : 'Save & Create Delivery Challan'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Edit Tracking */}
      {trackingModalOpen && selectedDispatch && (
        <Modal isOpen={trackingModalOpen} onClose={() => setTrackingModalOpen(false)} title={`✏️ Update Tracking - DC #${selectedDispatch.dcNo}`}>
          <form onSubmit={handleUpdateTracking}>
            <FormField label="Courier Vendor / Transporter Name">
              <input type="text" className="form-input" value={trackingForm.transporterName} onChange={e => setTrackingForm(f => ({ ...f, transporterName: e.target.value }))} placeholder="Dexpress / Professional / DTDC" />
            </FormField>
            <FormField label="Docket / Tracking / Waybill Number">
              <input type="text" className="form-input" value={trackingForm.docketNo} onChange={e => setTrackingForm(f => ({ ...f, docketNo: e.target.value }))} placeholder="WAYBILL12345" />
            </FormField>
            <FormField label="Courier Charges (₹)">
              <input type="number" className="form-input" value={trackingForm.transporterAmount} onChange={e => setTrackingForm(f => ({ ...f, transporterAmount: e.target.value }))} placeholder="350" />
            </FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setTrackingModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Saving...' : 'Update Tracking'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Merge Parcel */}
      {mergeModalOpen && selectedDispatch && (
        <Modal isOpen={mergeModalOpen} onClose={() => setMergeModalOpen(false)} title={`📦 Merge Parcel into DC #${selectedDispatch.dcNo}`}>
          <form onSubmit={handleMerge}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-4)' }}>
              Add additional items to ship together under Delivery Challan <strong>#{selectedDispatch.dcNo}</strong> to <strong>{selectedDispatch.receiverName}</strong> ({selectedDispatch.toAddress}).
            </p>
            {mergeItems.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                <input type="text" className="form-input" placeholder="Item Description" required value={it.description} onChange={e => {
                  const arr = [...mergeItems]; arr[idx].description = e.target.value; setMergeItems(arr);
                }} style={{ flex: 3 }} />
                <input type="number" className="form-input" placeholder="Qty" min="1" value={it.qty} onChange={e => {
                  const arr = [...mergeItems]; arr[idx].qty = parseInt(e.target.value, 10) || 1; setMergeItems(arr);
                }} style={{ width: 70 }} />
                <input type="number" className="form-input" placeholder="Rate (₹)" min="0" value={it.rate} onChange={e => {
                  const arr = [...mergeItems]; arr[idx].rate = parseFloat(e.target.value) || 0; setMergeItems(arr);
                }} style={{ width: 100 }} />
              </div>
            ))}
            <button type="button" className="btn btn--sm btn--outline" onClick={() => setMergeItems([...mergeItems, { description: '', serialNo: '', qty: 1, rate: 0 }])} style={{ marginBottom: 'var(--space-4)' }}>
              ➕ Add Row
            </button>

            <FormField label="Merge Remarks / Notes">
              <input type="text" className="form-input" placeholder="Parcel merged for Dinesh Tech Team..." value={mergeRemarks} onChange={e => setMergeRemarks(e.target.value)} />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setMergeModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Merging...' : 'Merge Parcel Items'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {deleteId && (
        <ConfirmModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Delivery Challan"
          message="Are you sure you want to delete this Delivery Challan record? This action cannot be undone."
          confirmLabel="Delete Delivery Challan"
          dangerous
        />
      )}
    </div>
  );
}

/* ─── Petty Cash / Cash Handling Component ────────────────── */
function PettyCashPage() {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthFilter, setMonthFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // New Voucher Form
  const [addForm, setAddForm] = useState({
    date: new Date().toISOString().slice(0,10),
    reason: '',
    company: 'AMD',
    expenseName: 'Miscellaneous',
    collectedFrom: '',
    amount: '',
    remarks: ''
  });

  // Clear Form
  const [clearForm, setClearForm] = useState({ clearAmount: '', remarks: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pettyCashApi.getAll(monthFilter);
      setEntries(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [monthFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!addForm.reason || !addForm.amount) { toast.warning('Reason and amount are required.'); return; }
    setSubmitting(true);
    try {
      await pettyCashApi.create(addForm);
      toast.success('Petty cash voucher created!');
      setAddModalOpen(false);
      setAddForm({ date: new Date().toISOString().slice(0,10), reason: '', company: 'AMD', expenseName: 'Miscellaneous', collectedFrom: '', amount: '', remarks: '' });
      fetchEntries();
    } catch (err) {
      toast.error(err.message || 'Failed to create voucher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEntry) return;
    setSubmitting(true);
    try {
      await pettyCashApi.clear(selectedEntry.id, clearForm.clearAmount || selectedEntry.amount, clearForm.remarks);
      toast.success('Cash voucher updated / cleared!');
      setClearModalOpen(false);
      fetchEntries();
    } catch (err) {
      toast.error(err.message || 'Failed to clear voucher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await pettyCashApi.delete(deleteId);
      toast.success('Voucher deleted.');
      fetchEntries();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = entries.filter(item => {
    const s = search.toLowerCase();
    return (item.reason || '').toLowerCase().includes(s) ||
           (item.collectedFrom || '').toLowerCase().includes(s) ||
           (item.company || '').toLowerCase().includes(s) ||
           (item.expenseName || '').toLowerCase().includes(s) ||
           (item.remarks || '').toLowerCase().includes(s);
  });

  const totalAmount = filtered.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const clearedAmount = filtered.filter(f => f.cleared).reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const pendingAmount = filtered.filter(f => !f.cleared).reduce((acc, cur) => acc + (cur.amount || 0), 0);

  return (
    <div>
      <PageHeader
        title="💵 Petty Cash & Cash Handling Ledger"
        subtitle="Track cash advances, office expense vouchers, reimbursements, and settlement clearances"
      />

      {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <StatCard title="Total Cash Issued" value={`₹${totalAmount.toLocaleString()}`} icon="💵" />
        <StatCard title="Cleared & Settled" value={`₹${clearedAmount.toLocaleString()}`} icon="✅" />
        <StatCard title="Outstanding Balance" value={`₹${pendingAmount.toLocaleString()}`} icon="⏳" />
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', flex: 1, maxWidth: 600 }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Search reason, recipient, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 2, minWidth: 200 }}
          />
          <input
            type="month"
            className="form-input"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            style={{ flex: 1, minWidth: 150 }}
          />
        </div>
        <button className="btn btn--primary" onClick={() => setAddModalOpen(true)} style={{ background: '#ea580c', borderColor: 'transparent' }}>
          ➕ Add Cash Voucher
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="💵" title="No Cash Vouchers found" description="Create a new voucher entry to record cash transactions." />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Company</th>
                  <th scope="col">Reason / Purpose</th>
                  <th scope="col">Expense Category</th>
                  <th scope="col">Issued To / Collected From</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.88rem' }}>{item.date}</td>
                    <td>
                      <span className="badge badge--info" style={{ fontWeight: 600 }}>{item.company || 'AMD'}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.reason}</div>
                      {item.remarks && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{item.remarks}</div>}
                    </td>
                    <td style={{ fontSize: '0.88rem' }}>{item.expenseName || 'Miscellaneous'}</td>
                    <td style={{ fontWeight: 500, fontSize: '0.88rem' }}>{item.collectedFrom || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary-dark)' }}>
                      ₹{(item.amount || 0).toLocaleString()}
                    </td>
                    <td>
                      {item.cleared ? (
                        <span className="badge badge--success" style={{ fontWeight: 600 }}>
                          Cleared ({item.clearedDate || 'Done'})
                        </span>
                      ) : (
                        <span className="badge badge--warning" style={{ fontWeight: 600 }}>
                          Uncleared / Pending
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                        {!item.cleared && (
                          <button
                            className="btn btn--sm btn--primary"
                            onClick={() => { setSelectedEntry(item); setClearForm({ clearAmount: item.amount, remarks: '' }); setClearModalOpen(true); }}
                            style={{ background: '#16a34a', borderColor: 'transparent' }}
                          >
                            ✅ Clear Cash
                          </button>
                        )}
                        <button className="btn btn--sm btn--danger" onClick={() => setDeleteId(item.id)}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Cash Voucher */}
      {addModalOpen && (
        <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="➕ Add Petty Cash Voucher">
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Date" required>
                <input type="date" className="form-input" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} required />
              </FormField>
              <FormField label="Company / Billing Entity">
                <select className="form-select" value={addForm.company} onChange={e => setAddForm(f => ({ ...f, company: e.target.value }))}>
                  <option value="AMD">AMD (Avana Medical Devices)</option>
                  <option value="ATS">ATS (Avana Technology Services)</option>
                </select>
              </FormField>
              <FormField label="Expense Category">
                <select className="form-select" value={addForm.expenseName} onChange={e => setAddForm(f => ({ ...f, expenseName: e.target.value }))}>
                  <option value="Printing & stationary">Printing & Stationery</option>
                  <option value="Repair & maintance electrical">Repair & Maintenance Electrical</option>
                  <option value="Office Maintenance">Office Maintenance</option>
                  <option value="Food & Refreshments">Food & Refreshments</option>
                  <option value="Vehicle & Fuel">Vehicle & Fuel</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Reason / Purpose" required>
                <input type="text" className="form-input" placeholder="e.g. Over all cash till date, Light purchase" value={addForm.reason} onChange={e => setAddForm(f => ({ ...f, reason: e.target.value }))} required />
              </FormField>
              <FormField label="Issued To / Collected From">
                <input type="text" className="form-input" placeholder="e.g. Siva, Karthick S" value={addForm.collectedFrom} onChange={e => setAddForm(f => ({ ...f, collectedFrom: e.target.value }))} />
              </FormField>
              <FormField label="Amount (₹)" required>
                <input type="number" className="form-input" placeholder="0.00" min="1" step="any" value={addForm.amount} onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))} required />
              </FormField>
            </div>

            <FormField label="Remarks / Notes">
              <textarea className="form-textarea" rows={2} placeholder="Optional detailed notes..." value={addForm.remarks} onChange={e => setAddForm(f => ({ ...f, remarks: e.target.value }))} />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setAddModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Saving...' : 'Create Cash Voucher'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Clear Voucher */}
      {clearModalOpen && selectedEntry && (
        <Modal isOpen={clearModalOpen} onClose={() => setClearModalOpen(false)} title={`✅ Clear Cash Voucher - ₹${selectedEntry.amount}`}>
          <form onSubmit={handleClearSubmit}>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
              Clear or partially clear cash advance for <strong>{selectedEntry.reason}</strong> (Issued to: <strong>{selectedEntry.collectedFrom || 'N/A'}</strong>).
            </p>
            <FormField label="Amount to Clear (₹)" required>
              <input type="number" className="form-input" max={selectedEntry.amount} min="1" step="any" value={clearForm.clearAmount} onChange={e => setClearForm(f => ({ ...f, clearAmount: e.target.value }))} required />
            </FormField>
            <FormField label="Settlement Notes / Remarks">
              <input type="text" className="form-input" placeholder="Receipts verified & approved by accounts..." value={clearForm.remarks} onChange={e => setClearForm(f => ({ ...f, remarks: e.target.value }))} />
            </FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setClearModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Saving...' : 'Confirm Clear Cash'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {deleteId && (
        <ConfirmModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Cash Voucher"
          message="Are you sure you want to delete this petty cash voucher entry?"
          confirmLabel="Delete Voucher"
          dangerous
        />
      )}
    </div>
  );
}

/* ─── Travel Expenses & Fuel Records Component ───────────── */
function TravelExpensePage() {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthFilter, setMonthFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // New Travel Log Form
  const [addForm, setAddForm] = useState({
    date: new Date().toISOString().slice(0,10),
    employeeName: 'Admin',
    vehicleNo: '',
    fromLoc: 'HO',
    toLoc: '',
    mode: 'Bike',
    totalKm: '',
    fuelLiters: '',
    fuelCost: '',
    tollParking: '',
    remarks: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await travelApi.getAll(monthFilter);
      setEntries(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [monthFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!addForm.fromLoc || !addForm.toLoc) { toast.warning('From and To locations required.'); return; }
    setSubmitting(true);
    try {
      await travelApi.create(addForm);
      toast.success('Travel expense & fuel record logged!');
      setAddModalOpen(false);
      setAddForm({ date: new Date().toISOString().slice(0,10), employeeName: 'Admin', vehicleNo: '', fromLoc: 'HO', toLoc: '', mode: 'Bike', totalKm: '', fuelLiters: '', fuelCost: '', tollParking: '', remarks: '' });
      fetchEntries();
    } catch (err) {
      toast.error(err.message || 'Failed to log travel expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await travelApi.delete(deleteId);
      toast.success('Travel log deleted.');
      fetchEntries();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = entries.filter(item => {
    const s = search.toLowerCase();
    return (item.fromLoc || '').toLowerCase().includes(s) ||
           (item.toLoc || '').toLowerCase().includes(s) ||
           (item.employeeName || '').toLowerCase().includes(s) ||
           (item.vehicleNo || '').toLowerCase().includes(s) ||
           (item.mode || '').toLowerCase().includes(s) ||
           (item.remarks || '').toLowerCase().includes(s);
  });

  const totalKmSum = filtered.reduce((acc, cur) => acc + (cur.totalKm || 0), 0);
  const totalCostSum = filtered.reduce((acc, cur) => acc + (cur.totalExpense || cur.fuelCost || 0), 0);

  return (
    <div>
      <PageHeader
        title="🚗 Travel Expenses & Fuel Records"
        subtitle="Log vehicle distance (KM), site visit travel routes, fuel fills, and toll expenses"
      />

      {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <StatCard title="Total Trips Logged" value={`${filtered.length} Trips`} icon="🗺️" />
        <StatCard title="Total Distance Travelled" value={`${totalKmSum.toLocaleString()} KM`} icon="🚗" />
        <StatCard title="Total Fuel & Travel Cost" value={`₹${totalCostSum.toLocaleString()}`} icon="⛽" />
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', flex: 1, maxWidth: 600 }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Search origin, destination, vehicle, mode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 2, minWidth: 200 }}
          />
          <input
            type="month"
            className="form-input"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            style={{ flex: 1, minWidth: 150 }}
          />
        </div>
        <button className="btn btn--primary" onClick={() => setAddModalOpen(true)} style={{ background: '#0284c7', borderColor: 'transparent' }}>
          ➕ Log Travel & Fuel
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🚗" title="No Travel Logs found" description="Log vehicle trips and fuel expenses to start tracking." />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Travel Route (From ➔ To)</th>
                  <th scope="col">Transport Mode</th>
                  <th scope="col">Distance (KM)</th>
                  <th scope="col">Driver / Vehicle No</th>
                  <th scope="col">Purpose / Remarks</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Total Expense</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.88rem' }}>{item.date}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '0.9rem' }}>
                        {item.fromLoc} ➔ {item.toLoc}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge--info" style={{ fontWeight: 600 }}>{item.mode || 'Bike'}</span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.92rem' }}>{item.totalKm || 0} KM</td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <div>{item.employeeName || 'Admin'}</div>
                      {item.vehicleNo && <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{item.vehicleNo}</div>}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', maxWidth: 200 }}>
                      {item.remarks || '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary-dark)' }}>
                      ₹{(item.totalExpense || item.fuelCost || 0).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn--sm btn--danger" onClick={() => setDeleteId(item.id)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Travel Log */}
      {addModalOpen && (
        <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="➕ Log Travel & Fuel Expense">
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Travel Date" required>
                <input type="date" className="form-input" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} required />
              </FormField>
              <FormField label="Employee / Driver Name">
                <input type="text" className="form-input" placeholder="e.g. Dinesh, Siva" value={addForm.employeeName} onChange={e => setAddForm(f => ({ ...f, employeeName: e.target.value }))} />
              </FormField>
              <FormField label="Vehicle Number">
                <input type="text" className="form-input" placeholder="TN-01-AB-1234" value={addForm.vehicleNo} onChange={e => setAddForm(f => ({ ...f, vehicleNo: e.target.value }))} />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="From Origin Location *" required>
                <input type="text" className="form-input" placeholder="HO / Head Office" value={addForm.fromLoc} onChange={e => setAddForm(f => ({ ...f, fromLoc: e.target.value }))} required />
              </FormField>
              <FormField label="To Destination Location *" required>
                <input type="text" className="form-input" placeholder="St Thomas Mount Cantonment / Site" value={addForm.toLoc} onChange={e => setAddForm(f => ({ ...f, toLoc: e.target.value }))} required />
              </FormField>
              <FormField label="Mode of Travel">
                <select className="form-select" value={addForm.mode} onChange={e => setAddForm(f => ({ ...f, mode: e.target.value }))}>
                  <option value="Bike">Bike</option>
                  <option value="Car">Car</option>
                  <option value="Auto">Auto</option>
                  <option value="Bus">Bus</option>
                  <option value="Train">Train</option>
                  <option value="Flight">Flight</option>
                </select>
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Distance (KM)">
                <input type="number" className="form-input" placeholder="15" min="0" step="any" value={addForm.totalKm} onChange={e => setAddForm(f => ({ ...f, totalKm: e.target.value }))} />
              </FormField>
              <FormField label="Fuel Fill (Liters)">
                <input type="number" className="form-input" placeholder="2.5" min="0" step="any" value={addForm.fuelLiters} onChange={e => setAddForm(f => ({ ...f, fuelLiters: e.target.value }))} />
              </FormField>
              <FormField label="Fuel Cost (₹)">
                <input type="number" className="form-input" placeholder="250" min="0" step="any" value={addForm.fuelCost} onChange={e => setAddForm(f => ({ ...f, fuelCost: e.target.value }))} />
              </FormField>
              <FormField label="Toll & Parking (₹)">
                <input type="number" className="form-input" placeholder="50" min="0" step="any" value={addForm.tollParking} onChange={e => setAddForm(f => ({ ...f, tollParking: e.target.value }))} />
              </FormField>
            </div>

            <FormField label="Purpose / Remarks">
              <textarea className="form-textarea" rows={2} placeholder="Site visit, Property tax verification..." value={addForm.remarks} onChange={e => setAddForm(f => ({ ...f, remarks: e.target.value }))} />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setAddModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Logging...' : 'Save Travel Log'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {deleteId && (
        <ConfirmModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Travel Log"
          message="Are you sure you want to delete this travel expense log?"
          confirmLabel="Delete Log"
          dangerous
        />
      )}
    </div>
  );
}

/* ─── Bills & Warranty Register Component ─────────────────── */
function BillWarrantyPage() {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthFilter, setMonthFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Form State
  const [addForm, setAddForm] = useState({
    date: new Date().toISOString().slice(0,10),
    billNo: '',
    vendorName: '',
    approvedBy: '',
    items: [{ name: '', amount: 0 }],
    totalAmount: '',
    warrantyDate: '',
    remarks: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await billWarrantyApi.getAll(monthFilter);
      setEntries(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [monthFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!addForm.billNo) { toast.warning('Bill/Invoice number is required.'); return; }
    setSubmitting(true);
    try {
      await billWarrantyApi.create(addForm);
      toast.success('Bill & Warranty record saved!');
      setAddModalOpen(false);
      setAddForm({ date: new Date().toISOString().slice(0,10), billNo: '', vendorName: '', approvedBy: '', items: [{ name: '', amount: 0 }], totalAmount: '', warrantyDate: '', remarks: '' });
      fetchEntries();
    } catch (err) {
      toast.error(err.message || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await billWarrantyApi.delete(deleteId);
      toast.success('Record deleted.');
      fetchEntries();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = entries.filter(item => {
    const s = search.toLowerCase();
    const itemsText = (item.items || []).map(i => i.name).join(' ').toLowerCase();
    return (item.billNo || '').toLowerCase().includes(s) ||
           (item.vendorName || '').toLowerCase().includes(s) ||
           (item.approvedBy || '').toLowerCase().includes(s) ||
           itemsText.includes(s) ||
           (item.remarks || '').toLowerCase().includes(s);
  });

  const totalValueSum = filtered.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
  const activeWarrantyCount = filtered.filter(f => f.warrantyDate && new Date(f.warrantyDate) >= new Date()).length;

  return (
    <div>
      <PageHeader
        title="📜 Bills & Warranty Register"
        subtitle="Archive equipment purchase bills, invoice amounts, warranty expiration dates, and vendor approvals"
      />

      {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <StatCard title="Total Bills Archived" value={`${filtered.length} Invoices`} icon="📄" />
        <StatCard title="Active Warranties" value={`${activeWarrantyCount} Active`} icon="🛡️" />
        <StatCard title="Total Invoice Value" value={`₹${totalValueSum.toLocaleString()}`} icon="💳" />
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', flex: 1, maxWidth: 600 }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Search Bill No, item, vendor, approver..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 2, minWidth: 200 }}
          />
          <input
            type="month"
            className="form-input"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            style={{ flex: 1, minWidth: 150 }}
          />
        </div>
        <button className="btn btn--primary" onClick={() => setAddModalOpen(true)} style={{ background: '#7c3aed', borderColor: 'transparent' }}>
          ➕ Log Bill & Warranty
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📜" title="No Bill & Warranty Records found" description="Log purchase bills and equipment warranties to start tracking." />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Bill No</th>
                  <th scope="col">Bill Date</th>
                  <th scope="col">Vendor / Approver</th>
                  <th scope="col">Purchased Items</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Total Amount</th>
                  <th scope="col">Warranty Expiry</th>
                  <th scope="col">Remarks</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isExp = item.warrantyDate ? new Date(item.warrantyDate) < new Date() : false;
                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="badge badge--info" style={{ fontWeight: 700 }}>
                          #{item.billNo}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.88rem' }}>{item.date}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{item.vendorName || '—'}</div>
                        {item.approvedBy && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Approved by: {item.approvedBy}</div>}
                      </td>
                      <td>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.82rem' }}>
                          {(item.items || []).map((it, idx) => (
                            <li key={idx}>{it.name} {it.amount ? `(₹${it.amount})` : ''}</li>
                          ))}
                        </ul>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary-dark)' }}>
                        ₹{(item.totalAmount || 0).toLocaleString()}
                      </td>
                      <td>
                        {item.warrantyDate ? (
                          isExp ? (
                            <span className="badge badge--danger">Expired ({item.warrantyDate})</span>
                          ) : (
                            <span className="badge badge--success">Active until {item.warrantyDate}</span>
                          )
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>No Warranty</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', maxWidth: 200 }}>
                        {item.remarks || '—'}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn btn--sm btn--danger" onClick={() => setDeleteId(item.id)}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Bill & Warranty Record */}
      {addModalOpen && (
        <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="➕ Log Purchase Bill & Warranty">
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Bill Date" required>
                <input type="date" className="form-input" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} required />
              </FormField>
              <FormField label="Bill / Invoice Number *" required>
                <input type="text" className="form-input" placeholder="INV-984" value={addForm.billNo} onChange={e => setAddForm(f => ({ ...f, billNo: e.target.value }))} required />
              </FormField>
              <FormField label="Vendor Name">
                <input type="text" className="form-input" placeholder="e.g. Electrical Traders" value={addForm.vendorName} onChange={e => setAddForm(f => ({ ...f, vendorName: e.target.value }))} />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Approved By">
                <input type="text" className="form-input" placeholder="e.g. Srini Sir" value={addForm.approvedBy} onChange={e => setAddForm(f => ({ ...f, approvedBy: e.target.value }))} />
              </FormField>
              <FormField label="Warranty Expiry Date">
                <input type="date" className="form-input" value={addForm.warrantyDate} onChange={e => setAddForm(f => ({ ...f, warrantyDate: e.target.value }))} />
              </FormField>
            </div>

            {/* Dynamic Line Items */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>📦 Purchased Items</h4>
            {addForm.items.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                <input type="text" className="form-input" placeholder="Item Name / Description" required value={it.name} onChange={e => {
                  const arr = [...addForm.items]; arr[idx].name = e.target.value; setAddForm(f => ({ ...f, items: arr }));
                }} style={{ flex: 3 }} />
                <input type="number" className="form-input" placeholder="Amount (₹)" min="0" value={it.amount} onChange={e => {
                  const arr = [...addForm.items]; arr[idx].amount = parseFloat(e.target.value) || 0; setAddForm(f => ({ ...f, items: arr }));
                }} style={{ flex: 1 }} />
                {addForm.items.length > 1 && (
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => {
                    setAddForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
                  }}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn--sm btn--outline" onClick={() => setAddForm(f => ({ ...f, items: [...f.items, { name: '', amount: 0 }] }))} style={{ marginBottom: 'var(--space-4)' }}>
              ➕ Add Item Row
            </button>

            <FormField label="Remarks / Location Notes">
              <textarea className="form-textarea" rows={2} placeholder="Installed in Ground Floor Light #1-#5..." value={addForm.remarks} onChange={e => setAddForm(f => ({ ...f, remarks: e.target.value }))} />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setAddModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Bill & Warranty Record'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {deleteId && (
        <ConfirmModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Bill & Warranty Record"
          message="Are you sure you want to delete this purchase bill record?"
          confirmLabel="Delete Record"
          dangerous
        />
      )}
    </div>
  );
}

/* ─── Other Stock Items Catalog Component ──────────────────── */
function OtherStockPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [useModalOpen, setUseModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form State for Add / Edit
  const [addForm, setAddForm] = useState({
    id: null,
    stockName: '',
    availableQty: 0,
    subtitles: [{ title: 'Size', details: '', qty: 0 }],
    location: 'HO',
    remarks: ''
  });

  // Form State for Use Stock
  const [useForm, setUseForm] = useState({
    subtitleId: '',
    qtyToUse: 1,
    usedBy: 'Admin',
    remarks: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await otherStockApi.getAll();
      setItems(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!addForm.stockName) { toast.warning('Stock name is required.'); return; }
    setSubmitting(true);
    try {
      await otherStockApi.save(addForm);
      toast.success('Other stock item saved successfully!');
      setAddModalOpen(false);
      setAddForm({ id: null, stockName: '', availableQty: 0, subtitles: [{ title: 'Size', details: '', qty: 0 }], location: 'HO', remarks: '' });
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Failed to save stock item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await otherStockApi.useStock(selectedItem.id, useForm.subtitleId, useForm.qtyToUse, useForm.usedBy, useForm.remarks);
      toast.success('Stock usage recorded!');
      setUseModalOpen(false);
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Failed to record usage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await otherStockApi.delete(deleteId);
      toast.success('Stock item deleted.');
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = items.filter(item => {
    const s = search.toLowerCase();
    const subText = (item.subtitles || []).map(st => `${st.title} ${st.details}`).join(' ').toLowerCase();
    return (item.stockName || '').toLowerCase().includes(s) ||
           (item.location || '').toLowerCase().includes(s) ||
           subText.includes(s) ||
           (item.remarks || '').toLowerCase().includes(s);
  });

  const totalAvailableSum = filtered.reduce((acc, cur) => acc + (cur.availableQty || 0), 0);
  const totalUsedSum = filtered.reduce((acc, cur) => acc + (cur.usedQty || 0), 0);

  return (
    <div>
      <PageHeader
        title="📦 Other Stock Items Catalog"
        subtitle="Manage uniforms, T-shirts, promotional merchandise, equipment stock, and size variations"
      />

      {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <StatCard title="Total Stock Catalog Items" value={`${filtered.length} Items`} icon="📦" />
        <StatCard title="Total Available Inventory" value={`${totalAvailableSum} Units`} icon="📊" />
        <StatCard title="Total Consumed Stock" value={`${totalUsedSum} Units`} icon="📤" />
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <input
          type="text"
          className="form-input"
          placeholder="🔍 Search stock name, size/subtitles, location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
        <button className="btn btn--primary" onClick={() => {
          setAddForm({ id: null, stockName: '', availableQty: 0, subtitles: [{ title: 'Size', details: '', qty: 0 }], location: 'HO', remarks: '' });
          setAddModalOpen(true);
        }} style={{ background: '#059669', borderColor: 'transparent' }}>
          ➕ Add Stock Item
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📦" title="No Stock Items found" description="Create a new stock item entry to manage office merchandise and uniforms." />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Stock Name</th>
                  <th scope="col">Location</th>
                  <th scope="col">Size / Variation Breakdown</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Available Qty</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Used Qty</th>
                  <th scope="col">Remarks</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '0.95rem' }}>{item.stockName}</div>
                    </td>
                    <td>
                      <span className="badge badge--info" style={{ fontWeight: 600 }}>{item.location || 'HO'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                        {(item.subtitles || []).map((st, idx) => (
                          <span key={st.id || idx} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.15rem 0.45rem', borderRadius: 4, fontSize: '0.78rem' }}>
                            <strong>{st.details || st.title}:</strong> {st.qty} avail
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem', color: '#059669' }}>
                      {item.availableQty}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.9rem', color: '#64748b' }}>
                      {item.usedQty || 0}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', maxWidth: 180 }}>
                      {item.remarks || '—'}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn--sm btn--primary"
                          onClick={() => { setSelectedItem(item); setUseForm({ subtitleId: item.subtitles?.[0]?.id || '', qtyToUse: 1, usedBy: 'Admin', remarks: '' }); setUseModalOpen(true); }}
                          style={{ background: '#ea580c', borderColor: 'transparent' }}
                        >
                          📤 Use Stock
                        </button>
                        <button
                          className="btn btn--sm btn--outline"
                          onClick={() => { setAddForm({ id: item.id, stockName: item.stockName, availableQty: item.availableQty, subtitles: item.subtitles || [], location: item.location || 'HO', remarks: item.remarks || '' }); setAddModalOpen(true); }}
                        >
                          ✏️ Edit
                        </button>
                        <button className="btn btn--sm btn--danger" onClick={() => setDeleteId(item.id)}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add / Edit Stock Item */}
      {addModalOpen && (
        <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title={addForm.id ? "✏️ Edit Stock Item" : "➕ Add New Stock Item"}>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Stock Item Name *" required>
                <input type="text" className="form-input" placeholder="e.g. Avana ADM White 2026, Cricket Jersey" value={addForm.stockName} onChange={e => setAddForm(f => ({ ...f, stockName: e.target.value }))} required />
              </FormField>
              <FormField label="Storage Location">
                <input type="text" className="form-input" placeholder="HO / Nandambakkam" value={addForm.location} onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))} />
              </FormField>
            </div>

            {/* Subtitles / Size Variations */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>📏 Size / Sub-Category Variations</h4>
            {addForm.subtitles.map((st, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                <input type="text" className="form-input" placeholder="Title (e.g. Size)" required value={st.title} onChange={e => {
                  const arr = [...addForm.subtitles]; arr[idx].title = e.target.value; setAddForm(f => ({ ...f, subtitles: arr }));
                }} style={{ flex: 2 }} />
                <input type="text" className="form-input" placeholder="Detail (e.g. M / L / XL)" required value={st.details} onChange={e => {
                  const arr = [...addForm.subtitles]; arr[idx].details = e.target.value; setAddForm(f => ({ ...f, subtitles: arr }));
                }} style={{ flex: 2 }} />
                <input type="number" className="form-input" placeholder="Qty" min="0" value={st.qty} onChange={e => {
                  const arr = [...addForm.subtitles]; arr[idx].qty = parseInt(e.target.value, 10) || 0; setAddForm(f => ({ ...f, subtitles: arr }));
                }} style={{ width: 90 }} />
                {addForm.subtitles.length > 1 && (
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => {
                    setAddForm(f => ({ ...f, subtitles: f.subtitles.filter((_, i) => i !== idx) }));
                  }}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn--sm btn--outline" onClick={() => setAddForm(f => ({ ...f, subtitles: [...f.subtitles, { title: 'Size', details: '', qty: 0 }] }))} style={{ marginBottom: 'var(--space-4)' }}>
              ➕ Add Size Variation
            </button>

            <FormField label="Remarks / General Notes">
              <textarea className="form-textarea" rows={2} placeholder="Optional notes..." value={addForm.remarks} onChange={e => setAddForm(f => ({ ...f, remarks: e.target.value }))} />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setAddModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Stock Item'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Use Stock */}
      {useModalOpen && selectedItem && (
        <Modal isOpen={useModalOpen} onClose={() => setUseModalOpen(false)} title={`📤 Record Stock Consumption - ${selectedItem.stockName}`}>
          <form onSubmit={handleUseSubmit}>
            <FormField label="Select Size / Variation" required>
              <select className="form-select" value={useForm.subtitleId} onChange={e => setUseForm(f => ({ ...f, subtitleId: e.target.value }))}>
                {(selectedItem.subtitles || []).map(st => (
                  <option key={st.id} value={st.id}>
                    {st.title}: {st.details} (Available: {st.qty})
                  </option>
                ))}
              </select>
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Quantity Consumed" required>
                <input type="number" className="form-input" min="1" value={useForm.qtyToUse} onChange={e => setUseForm(f => ({ ...f, qtyToUse: parseInt(e.target.value, 10) || 1 }))} required />
              </FormField>
              <FormField label="Issued To / Employee">
                <input type="text" className="form-input" placeholder="e.g. Ramesh, Tech Team" value={useForm.usedBy} onChange={e => setUseForm(f => ({ ...f, usedBy: e.target.value }))} />
              </FormField>
            </div>

            <FormField label="Usage Notes">
              <input type="text" className="form-input" placeholder="Issued for client demo / new joiner..." value={useForm.remarks} onChange={e => setUseForm(f => ({ ...f, remarks: e.target.value }))} />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setUseModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Saving...' : 'Confirm Stock Issue'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {deleteId && (
        <ConfirmModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Stock Item"
          message="Are you sure you want to delete this stock item record?"
          confirmLabel="Delete Stock Item"
          dangerous
        />
      )}
    </div>
  );
}

/* ─── Renewal & Task Reminders Audit Component ───────────── */
function RemindersPage() {
  const toast = useToast();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Form State
  const [addForm, setAddForm] = useState({
    text: '',
    dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    priority: 'Medium',
    adminEmail: 'Karthicksankar@avanamedical.com'
  });
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await remindersApi.getAll();
      setReminders(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!addForm.text || !addForm.dateTime) { toast.warning('Task text and date/time are required.'); return; }
    setSubmitting(true);
    try {
      await remindersApi.create(addForm);
      toast.success('Custom reminder scheduled!');
      setAddModalOpen(false);
      setAddForm({ text: '', dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), priority: 'Medium', adminEmail: 'Karthicksankar@avanamedical.com' });
      fetchReminders();
    } catch (err) {
      toast.error(err.message || 'Failed to schedule reminder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerScan = async () => {
    setScanning(true);
    try {
      const res = await remindersApi.triggerScan();
      toast.success(res.message || 'Deadline & renewal scan executed! Email sent if alerts found.');
      fetchReminders();
    } catch (err) {
      toast.error(err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await remindersApi.delete(deleteId);
      toast.success('Reminder deleted.');
      fetchReminders();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = reminders.filter(item => {
    const s = search.toLowerCase();
    return (item.text || '').toLowerCase().includes(s) ||
           (item.priority || '').toLowerCase().includes(s) ||
           (item.adminEmail || '').toLowerCase().includes(s);
  });

  const pendingCount = filtered.filter(r => !r.sent).length;
  const sentCount = filtered.filter(r => r.sent).length;

  return (
    <div>
      <PageHeader
        title="⏰ Renewal Reminders & Deadline Audit"
        subtitle="Schedule custom admin reminders and run instant automated scans for expiring AMCs, utility bills, and tax deadlines"
      />

      {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <StatCard title="Total Scheduled Reminders" value={`${filtered.length} Tasks`} icon="⏰" />
        <StatCard title="Pending / Due Reminders" value={`${pendingCount} Pending`} icon="⏳" />
        <StatCard title="Dispatched Alerts" value={`${sentCount} Sent`} icon="📩" />
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <input
          type="text"
          className="form-input"
          placeholder="🔍 Search reminder text, priority, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 380 }}
        />
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn--secondary" onClick={handleTriggerScan} disabled={scanning} style={{ borderColor: '#6366f1', color: '#6366f1' }}>
            {scanning ? 'Scanning...' : '⚡ Run Instant Scan'}
          </button>
          <button className="btn btn--primary" onClick={() => setAddModalOpen(true)} style={{ background: '#6366f1', borderColor: 'transparent' }}>
            ➕ Schedule Reminder
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="⏰" title="No Custom Reminders found" description="Schedule a new task reminder or run an instant deadline scan." />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Scheduled Date & Time</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Reminder Task / Details</th>
                  <th scope="col">Target Email</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600, fontSize: '0.88rem' }}>
                      {item.dateTime ? item.dateTime.replace('T', ' ') : '—'}
                    </td>
                    <td>
                      {item.priority === 'High' ? (
                        <span className="badge badge--danger" style={{ fontWeight: 700 }}>🔴 High</span>
                      ) : item.priority === 'Medium' ? (
                        <span className="badge badge--warning" style={{ fontWeight: 700 }}>🟡 Medium</span>
                      ) : (
                        <span className="badge badge--info" style={{ fontWeight: 600 }}>🟢 Low</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.text}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{item.adminEmail || '—'}</td>
                    <td>
                      {item.sent ? (
                        <span className="badge badge--success">Sent ({formatDateTime(item.sentAt)})</span>
                      ) : (
                        <span className="badge badge--warning">Scheduled</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn--sm btn--danger" onClick={() => setDeleteId(item.id)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Custom Reminder */}
      {addModalOpen && (
        <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="➕ Schedule Custom Admin Reminder">
          <form onSubmit={handleCreate}>
            <FormField label="Reminder Task / Description *" required>
              <textarea className="form-textarea" rows={3} placeholder="e.g. Birthday cake order, Verify AMC invoice..." value={addForm.text} onChange={e => setAddForm(f => ({ ...f, text: e.target.value }))} required />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Scheduled Date & Time *" required>
                <input type="datetime-local" className="form-input" value={addForm.dateTime} onChange={e => setAddForm(f => ({ ...f, dateTime: e.target.value }))} required />
              </FormField>
              <FormField label="Priority">
                <select className="form-select" value={addForm.priority} onChange={e => setAddForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="High">🔴 High</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Low">🟢 Low</option>
                </select>
              </FormField>
            </div>

            <FormField label="Target Admin Email">
              <input type="email" className="form-input" value={addForm.adminEmail} onChange={e => setAddForm(f => ({ ...f, adminEmail: e.target.value }))} />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setAddModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Scheduling...' : 'Schedule Reminder'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {deleteId && (
        <ConfirmModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Reminder Task"
          message="Are you sure you want to delete this scheduled reminder task?"
          confirmLabel="Delete Reminder"
          dangerous
        />
      )}
    </div>
  );
}

/* ─── Main Export ─────────────────────────────────────────── */
export default function HelpDeskAdminPage() {
  useEffect(() => {
    document.title = 'Help Desk Admin | Avana';
  }, []);

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 1200, margin: '0 auto' }}>
      <Routes>
        {/* Default: all requests */}
        <Route index element={<HelpdeskTable categoryFilter={null} />} />

        {/* Category-filtered views */}
        <Route path="conference"   element={<HelpdeskTable categoryFilter="conference" />} />
        <Route path="stationery"   element={<HelpdeskTable categoryFilter="stationery" />} />
        <Route path="admin-support" element={<HelpdeskTable categoryFilter="admin_support" />} />
        <Route path="maintenance"  element={<HelpdeskTable categoryFilter="maintenance" />} />
        <Route path="housekeeping" element={<HelpdeskTable categoryFilter="housekeeping" />} />
        <Route path="office-asset" element={<HelpdeskTable categoryFilter="office_asset" />} />
        <Route path="print-scan"   element={<HelpdeskTable categoryFilter="print_scan" />} />

        {/* Inventory & Asset Tracker */}
        <Route path="stationery-stock" element={
          <StockManager
            title="Stationery Stock"
            icon="✏️"
            type="stationery"
            getStock={stationeryApi.getStock}
            updateStock={stationeryApi.updateStock}
            addItem={stationeryApi.addItem}
          />
        } />
        <Route path="housekeeping-stock" element={
          <StockManager
            title="Housekeeping Stock"
            icon="housekeeping"
            type="housekeeping"
            getStock={housekeepingApi.getStock}
            updateStock={housekeepingApi.updateStock}
            addItem={housekeepingApi.addItem}
          />
        } />
        <Route path="stationery-audit" element={<StationeryAudit />} />
        <Route path="housekeeping-audit" element={<HousekeepingAudit />} />
        <Route path="asset-tracker" element={<AssetTrackerPage />} />
        <Route path="other-stock" element={<OtherStockPage />} />

        {/* AMC & Bills */}
        <Route path="amc" element={<AMCPage />} />
        <Route path="courier" element={<CourierDispatchPage />} />
        <Route path="cash-handling" element={<PettyCashPage />} />
        <Route path="travel" element={<TravelExpensePage />} />
        <Route path="bill-warranty" element={<BillWarrantyPage />} />

        {/* System & Security */}
        <Route path="reminders" element={<RemindersPage />} />







        {/* Payments */}
        <Route path="utility-payments" element={
          <PaymentsPage
            title="Utility Payments"
            icon="⚡"
            api={utilityApi}
            fields={UTILITY_FIELDS}
          />
        } />
        <Route path="tax-payments" element={
          <PaymentsPage
            title="Tax Payments"
            icon="🏛️"
            api={taxApi}
            fields={TAX_FIELDS}
          />
        } />

        {/* Admin */}
        <Route path="logins"   element={<LoginAuditPage />} />
        <Route path="settings" element={<AdminSettings />} />
      </Routes>
    </div>
  );
}
