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

export function StationeryAudit() {
  const toast = useToast();
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ startingStock: '', purchased: '', used: '', endingStock: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAudit = useCallback(() => {
    setLoading(true);
    stationeryApi.getAudit(month)
      .then(data => setAudit(data || {}))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  const handleEdit = (itemName, row) => {
    setEditingItem(itemName);
    setEditForm({
      startingStock: row.startingStock || 0,
      purchased: row.purchased || 0,
      used: row.used || 0,
      endingStock: row.endingStock || 0
    });
  };

  const handleSave = async (itemName) => {
    setSubmitting(true);
    try {
      await stationeryApi.overrideAudit({ month, item: itemName, ...editForm });
      toast.success('Audit overridden successfully');
      setEditingItem(null);
      fetchAudit();
    } catch (err) {
      toast.error(err.message || 'Override failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader 
        title="📊 Monthly Stationery Audit" 
        subtitle="View monthly consumption and stock audit records" 
        action={
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <input type="month" className="form-input" value={month} onChange={e => setMonth(e.target.value)} />
            <button type="button" className="btn btn--secondary" onClick={() => window.print()}>🖨️ Download PDF</button>
          </div>
        }
      />
      <PrintHeader title="Stationery Audit Report" subtitle={`Report Month: ${month}`} />
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
                    <th scope="col">Purchased</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(audit).map(([itemName, a], idx) => {
                    const isEditing = editingItem === itemName;
                    return (
                      <tr key={itemName}>
                        <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 500 }}>{month}</td>
                        <td>{itemName}</td>
                        <td>
                          {isEditing ? (
                            <input type="number" className="form-input form-input--sm" value={editForm.startingStock} onChange={e => setEditForm(f => ({ ...f, startingStock: e.target.value }))} style={{ width: 80 }} />
                          ) : (a.startingStock ?? '—')}
                        </td>
                        <td>
                          {isEditing ? (
                            <input type="number" className="form-input form-input--sm" value={editForm.used} onChange={e => setEditForm(f => ({ ...f, used: e.target.value }))} style={{ width: 80 }} />
                          ) : (a.used ?? '—')}
                        </td>
                        <td style={{ fontWeight: isEditing ? 'normal' : 700, color: isEditing ? 'inherit' : 'var(--color-text-primary)' }}>
                          {isEditing ? (
                            <input type="number" className="form-input form-input--sm" value={editForm.endingStock} onChange={e => setEditForm(f => ({ ...f, endingStock: e.target.value }))} style={{ width: 80 }} />
                          ) : (a.endingStock ?? '—')}
                        </td>
                        <td>
                          {isEditing ? (
                            <input type="number" className="form-input form-input--sm" value={editForm.purchased} onChange={e => setEditForm(f => ({ ...f, purchased: e.target.value }))} style={{ width: 80 }} />
                          ) : (a.purchased > 0 ? a.purchased : '—')}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                              <button className="btn btn--sm btn--secondary" onClick={() => setEditingItem(null)} disabled={submitting}>Cancel</button>
                              <button className="btn btn--sm btn--primary" onClick={() => handleSave(itemName)} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                            </div>
                          ) : (
                            <button className="btn btn--sm btn--outline" onClick={() => handleEdit(itemName, a)}>
                              ✏️ Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
export function HousekeepingAudit() {
  const toast = useToast();
  const [audit, setAudit] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ startingStock: '', purchased: '', used: '', endingStock: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAudit = useCallback(() => {
    setLoading(true);
    housekeepingApi.getAudit(month)
      .then(data => setAudit(data || {}))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  const handleEdit = (itemName, row) => {
    setEditingItem(itemName);
    setEditForm({
      startingStock: row.startingStock || 0,
      purchased: row.purchased || 0,
      used: row.used || 0,
      endingStock: row.endingStock || 0
    });
  };

  const handleSave = async (itemName) => {
    setSubmitting(true);
    try {
      await housekeepingApi.overrideAudit({ month, item: itemName, ...editForm });
      toast.success('Audit overridden successfully');
      setEditingItem(null);
      fetchAudit();
    } catch (err) {
      toast.error(err.message || 'Override failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="🧴 Monthly Housekeeping Audit"
        subtitle="View monthly consumption and stock audit records"
        action={
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <input type="month" className="form-input" value={month} onChange={e => setMonth(e.target.value)} />
            <button type="button" className="btn btn--secondary" onClick={() => window.print()}>🖨️ Download PDF</button>
          </div>
        }
      />
      <PrintHeader title="Housekeeping Audit Report" subtitle={`Report Month: ${month}`} />
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
                    <th scope="col">Purchased</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(audit).map(([itemName, a], idx) => {
                    const isEditing = editingItem === itemName;
                    return (
                      <tr key={itemName}>
                        <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 500 }}>{month}</td>
                        <td>{itemName}</td>
                        <td>
                          {isEditing ? (
                            <input type="number" className="form-input form-input--sm" value={editForm.startingStock} onChange={e => setEditForm(f => ({ ...f, startingStock: e.target.value }))} style={{ width: 80 }} />
                          ) : (a.startingStock ?? '—')}
                        </td>
                        <td>
                          {isEditing ? (
                            <input type="number" className="form-input form-input--sm" value={editForm.used} onChange={e => setEditForm(f => ({ ...f, used: e.target.value }))} style={{ width: 80 }} />
                          ) : (a.used ?? '—')}
                        </td>
                        <td style={{ fontWeight: isEditing ? 'normal' : 700, color: isEditing ? 'inherit' : 'var(--color-text-primary)' }}>
                          {isEditing ? (
                            <input type="number" className="form-input form-input--sm" value={editForm.endingStock} onChange={e => setEditForm(f => ({ ...f, endingStock: e.target.value }))} style={{ width: 80 }} />
                          ) : (a.endingStock ?? '—')}
                        </td>
                        <td>
                          {isEditing ? (
                            <input type="number" className="form-input form-input--sm" value={editForm.purchased} onChange={e => setEditForm(f => ({ ...f, purchased: e.target.value }))} style={{ width: 80 }} />
                          ) : (a.purchased > 0 ? a.purchased : '—')}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                              <button className="btn btn--sm btn--secondary" onClick={() => setEditingItem(null)} disabled={submitting}>Cancel</button>
                              <button className="btn btn--sm btn--primary" onClick={() => handleSave(itemName)} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                            </div>
                          ) : (
                            <button className="btn btn--sm btn--outline" onClick={() => handleEdit(itemName, a)}>
                              ✏️ Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
