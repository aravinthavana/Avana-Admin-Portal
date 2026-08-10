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
import { PrintHeader } from './PrintHeader';

export function AssetTrackerPage() {
  const toast = useToast();
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [appendModalOpen, setAppendModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
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
  const [returnItemsState, setReturnItemsState] = useState({});

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
    
    const items = Object.entries(returnItemsState)
      .filter(([_, state]) => state.selected)
      .map(([id, state]) => ({ itemId: parseInt(id, 10) || id, condition: state.condition }));

    try {
      await assetTrackerApi.returnAssets(selectedHandover.id, items, returnRemarks);
      toast.success('Asset return processed!');
      setDetailsModalOpen(false);
      fetchHandovers();
    } catch (err) {
      toast.error(err.message || 'Return processing failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedHandover) return;
    const printWin = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Asset Handover - ${selectedHandover.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1c1c1e; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #c17f24; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { max-height: 50px; }
            .title { font-size: 24px; font-weight: bold; color: #c17f24; }
            .details { margin-bottom: 30px; }
            .details p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; border: 1px solid #e4e4e7; text-align: left; }
            th { background-color: #f9f9fb; }
            .signature-box { margin-top: 60px; display: flex; justify-content: space-between; }
            .sign-line { border-top: 1px solid #000; padding-top: 10px; width: 250px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${window.location.origin}/Logo%20new.png" class="logo" alt="Avana Logo" />
            <div class="title">Asset Handover Form</div>
          </div>
          <div class="details">
            <p><strong>Employee Name:</strong> ${selectedHandover.name}</p>
            <p><strong>Email:</strong> ${selectedHandover.email}</p>
            <p><strong>Department:</strong> ${selectedHandover.department || 'N/A'}</p>
            <p><strong>Handover Date:</strong> ${selectedHandover.handoverDate}</p>
            <p><strong>Handover By:</strong> ${selectedHandover.handoverBy || 'Admin'}</p>
            <p><strong>Status:</strong> ${selectedHandover.status}</p>
          </div>
          <h3>Assigned Items</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item Name</th>
                <th>Serial / Specs</th>
                <th>Condition</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${(selectedHandover.items || []).map((it, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${it.itemName}</strong></td>
                  <td>${it.serialNo || 'N/A'}</td>
                  <td>${it.condition || 'N/A'}</td>
                  <td>${it.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="signature-box">
            <div><br/><br/><br/><div class="sign-line">Handover By (Admin)</div></div>
            <div>
              <p style="margin-top: 0; text-align: center; min-height: 50px;">
                ${selectedHandover.acknowledgedAt ? `Digital Ack: ${new Date(selectedHandover.acknowledgedAt).toLocaleDateString()}` : ''}
              </p>
              <div class="sign-line">Employee Signature</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }
          </script>
        </body>
      </html>
    `;
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
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

  const handleDownloadPDF = () => {
    const totalCount = filtered.length;
    const ackCount = filtered.filter(h => h.status === 'Acknowledged').length;
    const pendingCount = filtered.filter(h => h.status === 'Pending Acknowledgement').length;

    openLegacyPrintReport({
      title: 'Stationery & Asset Tracking Report',
      subtitle: 'Employee Hardware & Stationery Asset Handovers',
      summary: [
        { label: 'Total Handovers', value: `${totalCount} Records` },
        { label: 'Acknowledged', value: `${ackCount} Records`, color: '#16a34a' },
        { label: 'Pending Ack', value: `${pendingCount} Records`, color: '#d97706' },
      ],
      headers: [
        { title: '#' },
        { title: 'Employee Name' },
        { title: 'Email' },
        { title: 'Department' },
        { title: 'Handover Date' },
        { title: 'Items' },
        { title: 'Status' },
      ],
      rows: filtered.map((h, idx) => [
        idx + 1,
        h.name || '—',
        h.email || '—',
        h.department || '—',
        formatDate(h.handoverDate),
        (h.items || []).map(i => `${i.qty || 1}x ${i.itemName || i.particular}`).join(', ') || '—',
        h.status || 'Pending',
      ])
    });
  };

  return (
    <div>
      <PageHeader
        title="💻 Asset Tracker & Employee Handovers"
        subtitle="Track corporate hardware & furniture assigned to employees with digital acknowledgements"
        action={
          <button type="button" className="btn btn--secondary" onClick={handleDownloadPDF}>
            📄 Download PDF Report
          </button>
        }
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
                            <button className="btn btn--sm btn--outline" onClick={() => { setSelectedHandover(h); setAppendItems([{ itemName: '', serialNo: '', condition: 'Good' }]); setAppendModalOpen(true); }}>
                              ➕ Append
                            </button>
                          )}
                          <button className="btn btn--sm btn--secondary" onClick={() => {
                            setSelectedHandover(h);
                            setReturnRemarks('');
                            setReturnItemsState((h.items || []).reduce((acc, it) => {
                              if (it.status === 'Assigned') acc[it.id] = { selected: false, condition: 'Reusable' };
                              return acc;
                            }, {}));
                            setDetailsModalOpen(true);
                          }}>
                            🔍 View Details
                          </button>
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

      {/* Modal: View Details & Process Return */}
      {detailsModalOpen && selectedHandover && (
        <Modal isOpen={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} title={`📋 Asset Details - ${selectedHandover.name}`}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <button type="button" className="btn btn--outline" onClick={handleDownloadPdf}>
                📄 Download PDF
              </button>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn--secondary" onClick={() => setDetailsModalOpen(false)}>Close</button>
                {Object.keys(returnItemsState).length > 0 && (
                  <button type="button" className="btn btn--primary" disabled={submitting} onClick={handleReturn}>
                    {submitting ? 'Processing...' : 'Submit Selected Returns'}
                  </button>
                )}
              </div>
            </div>
          }
        >
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', fontSize: '0.9rem', marginBottom: 'var(--space-4)' }}>
              <div><strong>Email:</strong> {selectedHandover.email}</div>
              <div><strong>Department:</strong> {selectedHandover.department || '—'}</div>
              <div><strong>Handover Date:</strong> {selectedHandover.handoverDate}</div>
              <div><strong>Status:</strong> <Badge status={selectedHandover.status === 'Acknowledged' ? 'success' : 'neutral'} label={selectedHandover.status} /></div>
            </div>

            <h4 style={{ fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>Assigned Items</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {(selectedHandover.items || []).map((it, idx) => (
                <div key={it.id || idx} style={{ padding: 'var(--space-3)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, textDecoration: it.status === 'Returned' ? 'line-through' : 'none' }}>{it.itemName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{it.serialNo || 'No Serial'} • {it.condition}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: it.status === 'Returned' ? 'var(--color-warning)' : 'var(--color-success)' }}>{it.status}</div>
                  </div>
                  
                  {it.status === 'Assigned' && returnItemsState[it.id] && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--color-surface)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={returnItemsState[it.id].selected} onChange={e => {
                          setReturnItemsState(prev => ({ ...prev, [it.id]: { ...prev[it.id], selected: e.target.checked } }));
                        }} />
                        <strong>Mark Return</strong>
                      </label>
                      {returnItemsState[it.id].selected && (
                        <select className="form-select form-select--sm" value={returnItemsState[it.id].condition} onChange={e => {
                          setReturnItemsState(prev => ({ ...prev, [it.id]: { ...prev[it.id], condition: e.target.value } }));
                        }}>
                          <option value="Reusable">Reusable</option>
                          <option value="Damaged">Damaged</option>
                        </select>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {Object.keys(returnItemsState).length > 0 && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <FormField label="Return Remarks (Optional)">
                  <textarea className="form-textarea" rows={2} placeholder="Notes on returned items..." value={returnRemarks} onChange={e => setReturnRemarks(e.target.value)} />
                </FormField>
              </div>
            )}
          </div>
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

/* ─── Global Address Settings Component ───────────────────── */
function GlobalAddressSettings() {
  const toast = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ id: null, name: '', phone: '', address: '', label: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

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

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name || !form.address) { toast.warning('Name and Address are required'); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        await globalAddressApi.update(editingId, form);
        toast.success('Global address updated!');
      } else {
        await globalAddressApi.save(form);
        toast.success('Global address added!');
      }
      setForm({ id: null, name: '', phone: '', address: '', label: '' });
      setEditingId(null);
      fetchAddresses();
    } catch (err) {
      toast.error(err.message || 'Failed to save address');
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(addr) {
    setEditingId(addr.id);
    setForm({ id: addr.id, name: addr.name, phone: addr.phone || '', address: addr.address, label: addr.label || '' });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm({ id: null, name: '', phone: '', address: '', label: '' });
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this global address?')) return;
    try {
      await globalAddressApi.delete(id);
      toast.success('Global address deleted');
      setAddresses(prev => prev.filter(a => a.id !== id));
      if (editingId === id) handleCancelEdit();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  }

  return (
    <div className="card" style={{ maxWidth: '100%', marginBottom: 'var(--space-8)' }}>
      <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-5)', fontSize: '1.1rem' }}>
        🏢 Global Address Book (Company Defaults)
      </h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-5)' }}>
        Addresses added here will be available to all employees in the Courier Dispatch form under "Company Addresses".
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Add/Edit Form */}
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', position: 'sticky', top: 'var(--space-4)' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-4)' }}>{editingId ? 'Edit Address' : 'Add New Address'}</h4>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
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
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <button type="submit" className="btn btn--primary" disabled={submitting} style={{ flex: 1 }}>
                {submitting ? 'Saving...' : (editingId ? 'Update Address' : 'Add Address')}
              </button>
              {editingId && (
                <button type="button" className="btn btn--outline" onClick={handleCancelEdit}>
                  Cancel
                </button>
              )}
            </div>
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
                  padding: 'var(--space-3)', border: editingId === a.id ? '2px solid var(--brand-amber)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--color-surface)'
                }}>
                  <div>
                    {a.label && <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-amber)', textTransform: 'uppercase' }}>{a.label}</div>}
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    {a.phone && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{a.phone}</div>}
                    <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', marginTop: 4 }}>{a.address}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button type="button" className="btn btn--sm btn--outline" onClick={() => handleEdit(a)}>Edit</button>
                    <button type="button" className="btn btn--sm btn--danger" onClick={() => handleDelete(a.id)}>Del</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Courier Dispatches Component ────────────────────────── */
export function CourierDispatchPage() {
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

  const [globalAddresses, setGlobalAddresses] = useState([]);

  useEffect(() => {
    globalAddressApi.getAll().then(data => setGlobalAddresses(data || [])).catch(() => {});
  }, []);

  const ADDRESS_OPTIONS = [
    ...globalAddresses.map(a => ({
      label: a.label ? `${a.name} - ${a.label}` : a.name,
      value: a.address
    })),
    { label: 'Other (Manually Editable)', value: 'other' }
  ];

  // New DC Form State
  const [addForm, setAddForm] = useState({
    dcDate: new Date().toISOString().slice(0,10),
    remarksType: 'Service',
    remarksOther: '',
    courierBilling: 'Avana Medical Devices Pvt Ltd',
    signatoryCompany: 'Avana Medical Devices Pvt. Ltd',
    senderName: 'Admin',
    senderPhone: '',
    fromAddressSelection: 'other',
    fromAddressText: '',
    receiverName: '',
    receiverPhone: '',
    toAddressSelection: 'other',
    toAddress: '',
    transporterName: 'Dexpress',
    docketNo: '',
    transporterAmount: '',
    boxes: [{ boxNo: 1, dimensions: '', weight: '' }],
    items: [{ itemCode: '', description: '', serialNo: '', qty: 1, rate: 0, value: 0 }]
  });
  const [submitting, setSubmitting] = useState(false);

  // Tracking Form State
  const [trackingForm, setTrackingForm] = useState({ transporterName: '', docketNo: '', transporterAmount: '' });

  // Merge Form State
  const [mergeItems, setMergeItems] = useState([{ itemCode: '', description: '', serialNo: '', qty: 1, rate: 0, value: 0 }]);
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

  if (addModalOpen) {
    return (
      <div>
        <PageHeader title="➕ Create New Delivery Challan (DC)" subtitle="Enter dispatch details" action={<button type="button" className="btn btn--outline btn--sm" onClick={() => setAddModalOpen(false)}>← Back</button>} />
        <div className="card">
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Challan Date">
                <input type="date" className="form-input" value={addForm.dcDate} onChange={e => setAddForm(f => ({ ...f, dcDate: e.target.value }))} />
              </FormField>
              <FormField label="Billing Entity">
                <select className="form-select" value={addForm.courierBilling} onChange={e => setAddForm(f => ({ ...f, courierBilling: e.target.value }))}>
                  <option value="Avana Medical Devices Pvt. Ltd.">Avana Medical Devices Pvt. Ltd.</option>
                  <option value="Avana Technology Services Pvt. Ltd.">Avana Technology Services Pvt. Ltd.</option>
                </select>
              </FormField>
              <FormField label="Authority Signatory Company">
                <select className="form-select" value={addForm.signatoryCompany} onChange={e => setAddForm(f => ({ ...f, signatoryCompany: e.target.value }))}>
                  <option value="Avana Medical Devices Pvt. Ltd.">Avana Medical Devices Pvt. Ltd.</option>
                  <option value="Avana Surgical Systems Pvt. Ltd.">Avana Surgical Systems Pvt. Ltd.</option>
                  <option value="Avana Technology Services Pvt. Ltd.">Avana Technology Services Pvt. Ltd.</option>
                  <option value="None">None</option>
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
                <FormField label="Select From Address">
                  <select className="form-select" value={addForm.fromAddressSelection} onChange={e => {
                    const val = e.target.value;
                    if (val === 'other') {
                      setAddForm(f => ({ ...f, fromAddressSelection: val, fromAddressText: '' }));
                    } else {
                      setAddForm(f => ({ ...f, fromAddressSelection: val, fromAddressText: val }));
                    }
                  }}>
                    {ADDRESS_OPTIONS.map(opt => <option key={opt.label} value={opt.value === 'other' ? 'other' : opt.value}>{opt.label}</option>)}
                  </select>
                </FormField>
                <FormField label="From Address">
                  <textarea className="form-textarea" rows={2} value={addForm.fromAddressText} onChange={e => setAddForm(f => ({ ...f, fromAddressText: e.target.value }))} readOnly={addForm.fromAddressSelection !== 'other'} />
                </FormField>
              </div>

              <div style={{ background: '#f0f9ff', padding: 'var(--space-3)', borderRadius: 'var(--radius)', border: '1px solid #bae6fd' }}>
                <h5 style={{ margin: '0 0 var(--space-2) 0', fontSize: '0.85rem', color: '#0369a1' }}>RECIPIENT / CONSIGNEE *</h5>
                <FormField label="Receiver Name" required>
                  <input type="text" className="form-input" required value={addForm.receiverName} onChange={e => setAddForm(f => ({ ...f, receiverName: e.target.value }))} placeholder="Dr. John Smith / Client" />
                </FormField>
                <FormField label="Select To Address">
                  <select className="form-select" value={addForm.toAddressSelection} onChange={e => {
                    const val = e.target.value;
                    if (val === 'other') {
                      setAddForm(f => ({ ...f, toAddressSelection: val, toAddress: '' }));
                    } else {
                      setAddForm(f => ({ ...f, toAddressSelection: val, toAddress: val }));
                    }
                  }}>
                    {ADDRESS_OPTIONS.map(opt => <option key={opt.label} value={opt.value === 'other' ? 'other' : opt.value}>{opt.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Destination Address" required>
                  <textarea className="form-textarea" rows={2} required value={addForm.toAddress} onChange={e => setAddForm(f => ({ ...f, toAddress: e.target.value }))} placeholder="Full address with Pincode & City..." readOnly={addForm.toAddressSelection !== 'other'} />
                </FormField>
              </div>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>📦 Dispatched Items</h4>
            {addForm.items.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="text" className="form-input" placeholder="Item Code" value={it.itemCode} onChange={e => {
                  const arr = [...addForm.items]; arr[idx].itemCode = e.target.value; setAddForm(f => ({ ...f, items: arr }));
                }} style={{ width: 100 }} />
                <input type="text" className="form-input" placeholder="Item Description *" required value={it.description} onChange={e => {
                  const arr = [...addForm.items]; arr[idx].description = e.target.value; setAddForm(f => ({ ...f, items: arr }));
                }} style={{ flex: 2, minWidth: 200 }} />
                <input type="text" className="form-input" placeholder="Serial No" value={it.serialNo} onChange={e => {
                  const arr = [...addForm.items]; arr[idx].serialNo = e.target.value; setAddForm(f => ({ ...f, items: arr }));
                }} style={{ width: 120 }} />
                <input type="number" className="form-input" placeholder="Qty" min="1" value={it.qty} onChange={e => {
                  const qty = parseInt(e.target.value, 10) || 1;
                  const arr = [...addForm.items]; 
                  arr[idx].qty = qty; 
                  arr[idx].value = qty * arr[idx].rate;
                  setAddForm(f => ({ ...f, items: arr }));
                }} style={{ width: 70 }} />
                <input type="number" className="form-input" placeholder="Rate (₹)" min="0" value={it.rate} onChange={e => {
                  const rate = parseFloat(e.target.value) || 0;
                  const arr = [...addForm.items]; 
                  arr[idx].rate = rate; 
                  arr[idx].value = arr[idx].qty * rate;
                  setAddForm(f => ({ ...f, items: arr }));
                }} style={{ width: 100 }} />
                <input type="number" className="form-input" placeholder="Value (₹)" value={it.value} readOnly style={{ width: 100, background: '#f8fafc' }} />
                
                {addForm.items.length > 1 && (
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => {
                    setAddForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
                  }}>✕</button>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <button type="button" className="btn btn--sm btn--outline" onClick={() => setAddForm(f => ({ ...f, items: [...f.items, { itemCode: '', description: '', serialNo: '', qty: 1, rate: 0, value: 0 }] }))}>
                ➕ Add Another Item Row
              </button>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary-dark)' }}>
                Total Declared Value: ₹{addForm.items.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0).toLocaleString()}
              </div>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>📦 Box Details (Dimensions & Weight)</h4>
            {addForm.boxes.map((b, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                <div style={{ width: 60, fontWeight: 600 }}>Box {b.boxNo}</div>
                <input type="text" className="form-input" placeholder="Dimensions (L x W x H)" value={b.dimensions} onChange={e => {
                  const arr = [...addForm.boxes]; arr[idx].dimensions = e.target.value; setAddForm(f => ({ ...f, boxes: arr }));
                }} style={{ flex: 1 }} />
                <input type="text" className="form-input" placeholder="Weight (e.g. 5kg)" value={b.weight} onChange={e => {
                  const arr = [...addForm.boxes]; arr[idx].weight = e.target.value; setAddForm(f => ({ ...f, boxes: arr }));
                }} style={{ flex: 1 }} />
                {addForm.boxes.length > 1 && (
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => {
                    const filtered = addForm.boxes.filter((_, i) => i !== idx).map((box, i) => ({ ...box, boxNo: i + 1 }));
                    setAddForm(f => ({ ...f, boxes: filtered }));
                  }}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn--sm btn--outline" onClick={() => setAddForm(f => ({ ...f, boxes: [...f.boxes, { boxNo: f.boxes.length + 1, dimensions: '', weight: '' }] }))} style={{ marginBottom: 'var(--space-4)' }}>
              ➕ Add Another Box
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Courier Vendor">
                <input type="text" className="form-input" placeholder="Dxpress / DTDC / BlueDart" value={addForm.transporterName} onChange={e => setAddForm(f => ({ ...f, transporterName: e.target.value }))} />
              </FormField>
              <FormField label="Docket / Waybill No">
                <input type="text" className="form-input" placeholder="Tracking Number" value={addForm.docketNo} onChange={e => setAddForm(f => ({ ...f, docketNo: e.target.value }))} />
              </FormField>
              <FormField label="Courier Fee (₹)">
                <input type="number" className="form-input" placeholder="0.00" value={addForm.transporterAmount} onChange={e => setAddForm(f => ({ ...f, transporterAmount: e.target.value }))} />
              </FormField>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Generating...' : 'Save & Create Delivery Challan'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (trackingModalOpen && selectedDispatch) {
    return (
      <div>
        <PageHeader title={`🚀 Send Tracking - DC #${selectedDispatch.dcNo}`} subtitle="Update tracking and notify sender" action={<button type="button" className="btn btn--outline btn--sm" onClick={() => setTrackingModalOpen(false)}>← Back</button>} />
        <div className="card">
          <form onSubmit={handleUpdateTracking}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
              Entering tracking details and setting status to "Dispatched" will automatically send an email to {selectedDispatch.requesterEmail}.
            </p>
            <FormField label="Courier Vendor / Transporter Name">
              <select className="form-select" value={trackingForm.transporterName} onChange={e => setTrackingForm(f => ({ ...f, transporterName: e.target.value }))}>
                <option value="Dxpress">Dxpress</option>
                <option value="Bluedart">Bluedart</option>
                <option value="Professional Courier">Professional Courier</option>
                <option value="DTDC">DTDC</option>
                <option value="Delhivery">Delhivery</option>
                <option value="Other">Other</option>
              </select>
            </FormField>
            
            {trackingForm.transporterName === 'Other' && (
              <FormField label="Custom Tracking Link" required>
                <input type="text" className="form-input" required value={trackingForm.customTrackingLink || ''} onChange={e => setTrackingForm(f => ({ ...f, customTrackingLink: e.target.value }))} placeholder="https://..." />
              </FormField>
            )}

            <FormField label="Docket / Tracking / Waybill Number" required>
              <input type="text" className="form-input" required value={trackingForm.docketNo} onChange={e => setTrackingForm(f => ({ ...f, docketNo: e.target.value }))} placeholder="WAYBILL12345" />
            </FormField>
            <FormField label="Remarks">
              <input type="text" className="form-input" value={trackingForm.remarks} onChange={e => setTrackingForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional remarks" />
            </FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="submit" className={`btn btn--primary${submitting?' btn--loading':''}`} disabled={submitting}>Save & Send Update</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const handleLegacyPDF = () => {
    openLegacyPrintReport({
      title: 'Courier Dispatches & Delivery Challans Report',
      subtitle: search ? `Search: "${search}"` : 'All Shipments',
      summary: [
        { label: 'Total Shipments', value: `${filtered.length} Dispatches` },
        { label: 'Pending Shipments', value: `${filtered.filter(d => d.status === 'Pending').length}`, color: '#ea580c' },
        { label: 'Dispatched', value: `${filtered.filter(d => d.status === 'Dispatched').length}`, color: '#16a34a' },
      ],
      headers: [
        { title: 'DC #' },
        { title: 'Date' },
        { title: 'Sender' },
        { title: 'Consignee (Recipient)' },
        { title: 'Courier / Docket' },
        { title: 'Status' },
      ],
      rows: filtered.map(d => [
        `#${d.dcNo || d.id}`,
        d.dcDate || d.createdAt?.slice(0,10) || '—',
        `${d.senderName || 'Admin'} (${d.requesterEmail || ''})${d.mergedRequesters ? '\n+ Merged: ' + d.mergedRequesters : ''}`,
        `${d.receiverName || '—'}, ${d.toAddress || ''}`,
        d.docketNo ? `${d.transporterName || 'Courier'}: ${d.docketNo}` : 'Unassigned',
        d.status || 'Pending',
      ])
    });
  };

  const handleDownloadSingleDC = (d) => {
    openLegacyPrintReport({
      title: 'DELIVERY CHALLAN',
      subtitle: `DC No: ${d.dcNo || '—'} | Date: ${d.dcDate || '—'}`,
      details: [
        { label: 'Sender Name', value: d.senderName || '—' },
        { label: 'Consignee Name', value: d.receiverName || '—' },
        { label: 'Delivery Address', value: d.toAddress || '—' },
        { label: 'Transporter', value: d.transporterName || '—' },
        { label: 'Docket No', value: d.docketNo || '—' },
      ],
      headers: [
        { title: 'S.No.' },
        { title: 'Item Description' },
        { title: 'Item Code/Serial No' },
        { title: 'Quantity' },
        { title: 'Rate', align: 'right' },
        { title: 'Value', align: 'right' }
      ],
      rows: (d.items || []).map((it, i) => [
        i + 1,
        it.description || '—',
        it.itemCode || it.serialNo || '—',
        it.qty || 1,
        it.rate ? `₹${it.rate.toLocaleString()}` : '—',
        it.value ? `₹${it.value.toLocaleString()}` : '—'
      ])
    });
  };

  return (
    <div>
      <PageHeader
        title="🚚 Courier Dispatches & Delivery Challans"
        subtitle="Manage outbound shipments, auto-generate official Delivery Challan PDFs, and merge parcels"
        action={
          <button type="button" className="btn btn--secondary" onClick={handleLegacyPDF}>📄 Download PDF</button>
        }
      />

      <GlobalAddressSettings />

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
                  <th scope="col">Requested By</th>
                  <th scope="col">Billing / Category</th>
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
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.88rem', fontWeight: 600, color: 'var(--brand-amber)' }}>{formatDate(d.dcDate)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.senderName || 'Admin'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{d.requesterEmail || d.senderPhone}</div>
                      {d.mergedRequesters && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--brand-amber)', marginTop: 4 }}>
                          + Merged: {d.mergedRequesters.split(',').join(', ')}
                        </div>
                      )}
                    </td>
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
                        <button
                          className="btn btn--sm btn--outline"
                          title="View Delivery Challan PDF"
                          onClick={() => handleDownloadSingleDC(d)}
                        >
                          🔍 View DC
                        </button>
                        {(d.dcDate || '').slice(0, 10) === new Date().toISOString().slice(0, 10) && (
                          <button
                            className="btn btn--sm btn--primary"
                            title="Recall and Refill into New DC Form"
                            style={{ background: '#d97706', borderColor: '#b45309' }}
                            onClick={() => {
                              setAddForm({
                                dcNo: d.dcNo || '',
                                dcDate: d.dcDate || new Date().toISOString().slice(0,10),
                                remarksType: d.remarksType || 'Service',
                                remarksOther: d.remarksOther || '',
                                courierBilling: d.courierBilling || 'Avana Medical Devices Pvt Ltd',
                                signatoryCompany: d.signatoryCompany || 'Avana Medical Devices Pvt. Ltd',
                                senderName: d.senderName || 'Admin',
                                senderPhone: d.senderPhone || '',
                                fromAddressSelection: 'other',
                                fromAddressText: d.fromAddressText || '',
                                receiverName: d.receiverName || '',
                                receiverPhone: d.receiverPhone || '',
                                toAddressSelection: 'other',
                                toAddress: d.toAddress || '',
                                transporterName: d.transporterName || '',
                                docketNo: d.docketNo || '',
                                transporterAmount: d.transporterAmount || '',
                                items: d.items && d.items.length > 0 ? d.items : [{ itemCode: '', description: '', serialNo: '', qty: 1, rate: 0, value: 0 }],
                                declaration: !!d.declaration
                              });
                              setModalOpen(true);
                              toast.info(`🔄 Recalled DC #${d.dcNo}! All form fields populated.`);
                            }}
                          >
                            🔄 Refill
                          </button>
                        )}
                        <button
                          className="btn btn--sm btn--outline"
                          title="Send tracking details to requester"
                          onClick={() => {
                            setSelectedDispatch(d);
                            const tName = d.transporterName || 'Dxpress';
                            const isKnown = ['Dxpress', 'Bluedart', 'Professional Courier', 'DTDC', 'Delhivery'].includes(tName);
                            setTrackingForm({ 
                              transporterName: isKnown ? tName : 'Other', 
                              customTrackingLink: !isKnown && tName !== 'Dxpress' ? '' : '', 
                              docketNo: d.docketNo || '', 
                              transporterAmount: d.transporterAmount || '', 
                              status: d.status || 'Assigned' 
                            });
                            setTrackingModalOpen(true);
                          }}
                        >
                          🚀 Send Tracking
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

export function BillWarrantyPage() {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthFilter, setMonthFilter] = useState('');
  const [search, setSearch] = useState('');

  // Page View state (replacing pop-up modal)
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Form State
  const [addForm, setAddForm] = useState({
    date: new Date().toISOString().slice(0,10),
    billNo: '',
    vendorName: '',
    approvedBy: '',
    items: [{ name: '', qty: 1, assetNo: '', rate: 0, amount: 0 }],
    warrantyDate: '',
    remarks: '',
    billFileUrl: null,
    billFileName: null,
    warrantyFileUrl: null,
    warrantyFileName: null,
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

  // Compute final total bill amount from items
  const finalTotalAmount = addForm.items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);

  const handleFileUpload = (e, urlField, nameField) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.warning('File size exceeds 5MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setAddForm(f => ({
        ...f,
        [urlField]: evt.target.result,
        [nameField]: file.name,
      }));
      toast.success(`Attached ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!addForm.billNo) { toast.warning('Bill/Invoice number is required.'); return; }
    setSubmitting(true);
    try {
      await billWarrantyApi.create({ ...addForm, totalAmount: finalTotalAmount });
      toast.success('Bill & Warranty record saved!');
      setShowForm(false);
      setAddForm({
        date: new Date().toISOString().slice(0,10),
        billNo: '',
        vendorName: '',
        approvedBy: '',
        items: [{ name: '', qty: 1, assetNo: '', rate: 0, amount: 0 }],
        warrantyDate: '',
        remarks: '',
        billFileUrl: null,
        billFileName: null,
        warrantyFileUrl: null,
        warrantyFileName: null,
      });
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
    const itemsText = (item.items || []).map(i => `${i.name} ${i.assetNo || ''}`).join(' ').toLowerCase();
    return (item.billNo || '').toLowerCase().includes(s) ||
           (item.vendorName || '').toLowerCase().includes(s) ||
           (item.approvedBy || '').toLowerCase().includes(s) ||
           itemsText.includes(s) ||
           (item.remarks || '').toLowerCase().includes(s);
  });

  const totalValueSum = filtered.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
  const activeWarrantyCount = filtered.filter(f => f.warrantyDate && new Date(f.warrantyDate) >= new Date()).length;

  const handleLegacyPDF = () => {
    openLegacyPrintReport({
      title: 'Bills & Warranty Register Report',
      subtitle: monthFilter ? `Month: ${monthFilter}` : 'All Invoices',
      summary: [
        { label: 'Total Bills Archived', value: `${filtered.length} Invoices` },
        { label: 'Active Warranties', value: `${activeWarrantyCount} Active`, color: '#16a34a' },
        { label: 'Total Invoice Value', value: `Rs ${totalValueSum.toLocaleString('en-IN')}`, color: '#C59100' },
      ],
      headers: [
        { title: 'Bill No' },
        { title: 'Asset No' },
        { title: 'Bill Date' },
        { title: 'Purchased Items' },
        { title: 'Total Bill Amount', align: 'right' },
        { title: 'Warranty Expiry' },
      ],
      rows: filtered.map(item => {
        const assetNos = (item.items || []).map(i => i.assetNo).filter(Boolean).join(', ') || '—';
        const itemsStr = (item.items || []).map(i => `${i.name} (x${i.qty || 1})`).join(', ');
        return [
          `#${item.billNo}`,
          assetNos,
          item.date,
          itemsStr,
          `Rs ${(item.totalAmount || 0).toLocaleString('en-IN')}`,
          item.warrantyDate || 'No Warranty',
        ];
      })
    });
  };

  if (showForm) {
    return (
      <div>
        <PageHeader
          title="➕ Log Purchase Bill & Warranty"
          subtitle="Record invoice details, item asset numbers, rate & optional bill/warranty attachments"
          action={
            <button type="button" className="btn btn--outline" onClick={() => setShowForm(false)}>
              ← Back to Bills List
            </button>
          }
        />
        <div className="card" style={{ maxWidth: 900, margin: '0 auto', padding: 'var(--space-6)' }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Bill Date" required>
                <input type="date" className="form-input" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} required />
              </FormField>
              <FormField label="Bill / Invoice Number *" required>
                <input type="text" className="form-input" placeholder="e.g. INV-984" value={addForm.billNo} onChange={e => setAddForm(f => ({ ...f, billNo: e.target.value }))} required />
              </FormField>
              <FormField label="Vendor Name">
                <input type="text" className="form-input" placeholder="e.g. Surgical / Electrical Traders" value={addForm.vendorName} onChange={e => setAddForm(f => ({ ...f, vendorName: e.target.value }))} />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Approved By">
                <input type="text" className="form-input" placeholder="e.g. Admin / Director" value={addForm.approvedBy} onChange={e => setAddForm(f => ({ ...f, approvedBy: e.target.value }))} />
              </FormField>
              <FormField label="Warranty Expiry Date">
                <input type="date" className="form-input" value={addForm.warrantyDate} onChange={e => setAddForm(f => ({ ...f, warrantyDate: e.target.value }))} />
              </FormField>
            </div>

            {/* Itemized Purchased Items */}
            <div style={{ background: 'var(--color-surface-2)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: 'var(--space-4)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📦 Purchased Items</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>Item Name, Qty, Asset No, Rate & Amount</span>
              </h4>

              {addForm.items.map((it, idx) => {
                const rowQty = parseFloat(it.qty) || 1;
                const rowRate = parseFloat(it.rate) || 0;
                const rowAmount = rowQty * rowRate;

                const updateRow = (key, val) => {
                  const arr = [...addForm.items];
                  arr[idx][key] = val;
                  arr[idx].amount = (parseFloat(arr[idx].qty) || 1) * (parseFloat(arr[idx].rate) || 0);
                  setAddForm(f => ({ ...f, items: arr }));
                };

                return (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 1.2fr 1fr 1fr 40px', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                    <input type="text" className="form-input" placeholder="Item Name *" required value={it.name} onChange={e => updateRow('name', e.target.value)} />
                    <input type="number" className="form-input" placeholder="Qty" min="1" value={it.qty} onChange={e => updateRow('qty', e.target.value)} />
                    <input type="text" className="form-input" placeholder="Asset No" value={it.assetNo} onChange={e => updateRow('assetNo', e.target.value)} />
                    <input type="number" className="form-input" placeholder="Rate (₹)" min="0" step="any" value={it.rate} onChange={e => updateRow('rate', e.target.value)} />
                    <input type="number" className="form-input" placeholder="Amount (₹)" value={rowAmount} disabled style={{ background: 'var(--color-surface)', fontWeight: 700 }} />
                    {addForm.items.length > 1 && (
                      <button type="button" className="btn btn--sm btn--danger" onClick={() => {
                        setAddForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
                      }}>✕</button>
                    )}
                  </div>
                );
              })}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)' }}>
                <button type="button" className="btn btn--sm btn--outline" onClick={() => setAddForm(f => ({ ...f, items: [...f.items, { name: '', qty: 1, assetNo: '', rate: 0, amount: 0 }] }))}>
                  ➕ Add Item Row
                </button>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                  Final Total Bill Amount: ₹{finalTotalAmount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Attachments (Optional) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Attach Purchase Bill (PDF or Image)" hint="Optional attachment">
                <input type="file" accept="image/*,.pdf" className="form-input" onChange={e => handleFileUpload(e, 'billFileUrl', 'billFileName')} />
                {addForm.billFileName && <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', marginTop: 4 }}>✓ Attached: {addForm.billFileName}</div>}
              </FormField>

              <FormField label="Attach Warranty Copy (PDF or Image)" hint="Optional attachment">
                <input type="file" accept="image/*,.pdf" className="form-input" onChange={e => handleFileUpload(e, 'warrantyFileUrl', 'warrantyFileName')} />
                {addForm.warrantyFileName && <div style={{ fontSize: '0.8rem', color: '#7c3aed', marginTop: 4 }}>✓ Attached: {addForm.warrantyFileName}</div>}
              </FormField>
            </div>

            <FormField label="Remarks / Location Notes">
              <textarea className="form-textarea" rows={2} placeholder="Installed in Ground Floor Light #1-#5..." value={addForm.remarks} onChange={e => setAddForm(f => ({ ...f, remarks: e.target.value }))} />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Bill & Warranty Record'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="📜 Bills & Warranty Register"
        subtitle="Archive equipment purchase bills, itemized details, warranty expiration dates, attachments, and vendor approvals"
        action={
          <button type="button" className="btn btn--secondary" onClick={handleLegacyPDF}>📄 Download PDF</button>
        }
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
            placeholder="🔍 Search Bill No, item, asset no..."
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
        <button className="btn btn--primary" onClick={() => setShowForm(true)} style={{ background: '#7c3aed', borderColor: 'transparent' }}>
          ➕ Log Bill & Warranty
        </button>
      </div>

      {/* Table according to exact requested layout: Bill No | Asset No | Bill Date | Purchased Items | Total Bill Amount | Warranty Expiry | Attachments | Actions */}
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
                  <th scope="col">Asset No</th>
                  <th scope="col">Bill Date</th>
                  <th scope="col">Purchased Items</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Total Bill Amount</th>
                  <th scope="col">Warranty Expiry</th>
                  <th scope="col">Attachments</th>
                  <th scope="col" style={{ textAlign: 'right', width: 90 }} className="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isExp = item.warrantyDate ? new Date(item.warrantyDate) < new Date() : false;
                  const assetNos = (item.items || []).map(i => i.assetNo).filter(Boolean).join(', ') || '—';

                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="badge badge--info" style={{ fontWeight: 700 }}>
                          #{item.billNo}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>
                        {assetNos}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.88rem' }}>{item.date}</td>
                      <td>
                        <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                              <th style={{ padding: '2px 4px' }}>Item Name</th>
                              <th style={{ padding: '2px 4px' }}>Qty</th>
                              <th style={{ padding: '2px 4px', textAlign: 'right' }}>Rate</th>
                              <th style={{ padding: '2px 4px', textAlign: 'right' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(item.items || []).map((it, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px dashed var(--color-border)' }}>
                                <td style={{ padding: '2px 4px', fontWeight: 600 }}>{it.name || '—'}</td>
                                <td style={{ padding: '2px 4px' }}>{it.qty || 1}</td>
                                <td style={{ padding: '2px 4px', textAlign: 'right' }}>₹{it.rate || 0}</td>
                                <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 600 }}>₹{it.amount || ((it.qty || 1) * (it.rate || 0)) || 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {item.billFileUrl ? (
                            <a href={item.billFileUrl} download={item.billFileName || `Bill-${item.billNo}.pdf`} className="btn btn--xs btn--outline" style={{ fontSize: '0.75rem', textDecoration: 'none' }}>
                              📄 Bill Copy
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>None</span>
                          )}
                          {item.warrantyFileUrl ? (
                            <a href={item.warrantyFileUrl} download={item.warrantyFileName || `Warranty-${item.billNo}.pdf`} className="btn btn--xs btn--outline" style={{ fontSize: '0.75rem', textDecoration: 'none', color: '#7c3aed', borderColor: '#7c3aed' }}>
                              🛡️ Warranty Copy
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className="no-print">
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
export function OtherStockPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Page View States (replacing popups)
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUseForm, setShowUseForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form State for Add / Edit
  const [addForm, setAddForm] = useState({
    id: null,
    stockName: '',
    availableQty: 0,
    subtitles: [{ title: '', details: '', qty: 0, remarks: '' }],
    location: 'HO Store',
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
      setShowAddForm(false);
      setAddForm({ id: null, stockName: '', availableQty: 0, subtitles: [{ title: '', details: '', qty: 0, remarks: '' }], location: 'HO Store', remarks: '' });
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

  const handleLegacyPDF = () => {
    window.print();
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

  if (showAddForm) {
    return (
      <div>
        <PageHeader
          title={addForm.id ? "✏️ Edit Stock Item" : "➕ Add New Stock Item"}
          subtitle="Enter item details, location, and dynamic specifications/subtitles"
          action={
            <button type="button" className="btn btn--outline" onClick={() => setShowAddForm(false)}>
              ← Back to Catalog
            </button>
          }
        />
        <div className="card" style={{ maxWidth: 850, margin: '0 auto', padding: 'var(--space-6)' }}>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Stock Item Name *" required>
                <input type="text" className="form-input" placeholder="e.g. Dell Monitor 24-inch, T-Shirt, Water Pump" value={addForm.stockName} onChange={e => setAddForm(f => ({ ...f, stockName: e.target.value }))} required />
              </FormField>
              <FormField label="Storage Location">
                <input type="text" className="form-input" placeholder="e.g. Server Room / HO Store" value={addForm.location} onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))} />
              </FormField>
            </div>

            {/* Subtitles / Specifications (Matching Legacy App) */}
            <div style={{ background: '#f8fafc', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e3a8a' }}>Add Subtitle + (Custom Specifications / Details)</span>
                <button type="button" className="btn btn--sm btn--outline" onClick={() => setAddForm(f => ({ ...f, subtitles: [...f.subtitles, { title: '', details: '', qty: 0, remarks: '' }] }))}>
                  ➕ Add Subtitle
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.8fr 1.2fr 40px', gap: 'var(--space-2)', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                <span>Title / Custom Spec</span>
                <span>Details / Value</span>
                <span>Qty</span>
                <span>Remarks</span>
                <span></span>
              </div>

              {addForm.subtitles.map((st, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.8fr 1.2fr 40px', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                  <input type="text" className="form-input" placeholder="e.g. Size / Color" value={st.title} onChange={e => {
                    const arr = [...addForm.subtitles]; arr[idx].title = e.target.value; setAddForm(f => ({ ...f, subtitles: arr }));
                  }} />
                  <input type="text" className="form-input" placeholder="e.g. XL / Black" value={st.details} onChange={e => {
                    const arr = [...addForm.subtitles]; arr[idx].details = e.target.value; setAddForm(f => ({ ...f, subtitles: arr }));
                  }} />
                  <input type="number" className="form-input" placeholder="Qty" min="0" value={st.qty} onChange={e => {
                    const arr = [...addForm.subtitles]; arr[idx].qty = parseInt(e.target.value, 10) || 0; setAddForm(f => ({ ...f, subtitles: arr }));
                  }} />
                  <input type="text" className="form-input" placeholder="Remarks" value={st.remarks || ''} onChange={e => {
                    const arr = [...addForm.subtitles]; arr[idx].remarks = e.target.value; setAddForm(f => ({ ...f, subtitles: arr }));
                  }} />
                  {addForm.subtitles.length > 1 && (
                    <button type="button" className="btn btn--sm btn--danger" onClick={() => {
                      setAddForm(f => ({ ...f, subtitles: f.subtitles.filter((_, i) => i !== idx) }));
                    }}>✕</button>
                  )}
                </div>
              ))}
            </div>

            <FormField label="General Remarks / Notes">
              <textarea className="form-textarea" rows={2} placeholder="Optional detailed notes..." value={addForm.remarks} onChange={e => setAddForm(f => ({ ...f, remarks: e.target.value }))} />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Stock Item'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (showUseForm && selectedItem) {
    return (
      <div>
        <PageHeader
          title={`📤 Record Stock Consumption - ${selectedItem.stockName}`}
          subtitle="Issue inventory item and record recipient"
          action={
            <button type="button" className="btn btn--outline" onClick={() => setShowUseForm(false)}>
              ← Back to Catalog
            </button>
          }
        />
        <div className="card" style={{ maxWidth: 650, margin: '0 auto', padding: 'var(--space-6)' }}>
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
              <button type="button" className="btn btn--secondary" onClick={() => setShowUseForm(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Saving...' : 'Confirm Stock Issue'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="📦 Other Stock Items Catalog"
        subtitle="Manage uniforms, T-shirts, promotional merchandise, equipment stock, and size variations"
      />
      <PrintHeader title="Other Stock Items Report" subtitle={`Generated on: ${new Date().toLocaleDateString()}`} />

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
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn--secondary" onClick={handleLegacyPDF}>
            📄 Download PDF
          </button>
          <button className="btn btn--primary" onClick={() => {
            setAddForm({ id: null, stockName: '', availableQty: 0, subtitles: [{ title: '', details: '', qty: 0, remarks: '' }], location: 'HO Store', remarks: '' });
            setShowAddForm(true);
          }} style={{ background: '#059669', borderColor: 'transparent' }}>
            ➕ Add Stock Item
          </button>
        </div>
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
                          onClick={() => { setSelectedItem(item); setUseForm({ subtitleId: item.subtitles?.[0]?.id || '', qtyToUse: 1, usedBy: 'Admin', remarks: '' }); setShowUseForm(true); }}
                          style={{ background: '#ea580c', borderColor: 'transparent' }}
                        >
                          📤 Use Stock
                        </button>
                        <button
                          className="btn btn--sm btn--outline"
                          onClick={() => { setAddForm({ id: item.id, stockName: item.stockName, availableQty: item.availableQty, subtitles: item.subtitles || [], location: item.location || 'HO Store', remarks: item.remarks || '' }); setShowAddForm(true); }}
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
export function RemindersPage() {
  const toast = useToast();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Page View state (replacing popup)
  const [showForm, setShowForm] = useState(false);
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
      setShowForm(false);
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

  const handleLegacyPDF = () => {
    openLegacyPrintReport({
      title: 'Task & Deadline Reminders Schedule Report',
      subtitle: 'Renewal & Deadline Tracking Log',
      summary: [
        { label: 'Total Scheduled Tasks', value: `${filtered.length} Reminders` },
        { label: 'Pending Due Tasks', value: `${pendingCount} Pending`, color: '#ea580c' },
        { label: 'Dispatched Email Alerts', value: `${sentCount} Sent`, color: '#16a34a' },
      ],
      headers: [
        { title: '#' },
        { title: 'Scheduled Date & Time' },
        { title: 'Priority' },
        { title: 'Reminder Task Details' },
        { title: 'Recipient Email' },
        { title: 'Status' },
      ],
      rows: filtered.map((item, idx) => [
        idx + 1,
        item.dateTime ? item.dateTime.replace('T', ' ') : '—',
        item.priority || 'Medium',
        item.text || '—',
        item.adminEmail || '—',
        item.sent ? '✓ Dispatched' : '⏳ Scheduled',
      ])
    });
  };

  if (showForm) {
    return (
      <div>
        <PageHeader
          title="➕ Schedule New Deadline Reminder"
          subtitle="Set custom email alert date, priority, and notification text"
          action={
            <button type="button" className="btn btn--outline" onClick={() => setShowForm(false)}>
              ← Back to Reminders List
            </button>
          }
        />
        <div className="card" style={{ maxWidth: 700, margin: '0 auto', padding: 'var(--space-6)' }}>
          <form onSubmit={handleCreate}>
            <FormField label="Reminder Task / Description *" required>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="e.g. Renew AMC contract for Elevator #1, Pay Property Tax for Ground Floor..."
                value={addForm.text}
                onChange={e => setAddForm(f => ({ ...f, text: e.target.value }))}
                required
              />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Scheduled Date & Time *" required>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={addForm.dateTime}
                  onChange={e => setAddForm(f => ({ ...f, dateTime: e.target.value }))}
                  required
                />
              </FormField>
              <FormField label="Priority Level">
                <select
                  className="form-select"
                  value={addForm.priority}
                  onChange={e => setAddForm(f => ({ ...f, priority: e.target.value }))}
                >
                  <option value="Low">🔵 Low Priority</option>
                  <option value="Medium">🟡 Medium Priority</option>
                  <option value="High">🚨 High / Urgent Priority</option>
                </select>
              </FormField>
            </div>

            <FormField label="Recipient Notification Email *" required>
              <input
                type="email"
                className="form-input"
                value={addForm.adminEmail}
                onChange={e => setAddForm(f => ({ ...f, adminEmail: e.target.value }))}
                required
              />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Scheduling...' : 'Schedule Reminder'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="⏰ Renewal Reminders & Deadline Audit"
        subtitle="Schedule custom admin reminders and run instant automated scans for expiring AMCs, utility bills, and tax deadlines"
        action={
          <button type="button" className="btn btn--secondary" onClick={handleLegacyPDF}>📄 Download PDF</button>
        }
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
          <button className="btn btn--primary" onClick={() => setShowForm(true)} style={{ background: '#6366f1', borderColor: 'transparent' }}>
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
                      <span className={`badge ${item.priority === 'High' ? 'badge--danger' : item.priority === 'Medium' ? 'badge--warning' : 'badge--info'}`}>
                        {item.priority || 'Medium'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>{item.text}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{item.adminEmail || '—'}</td>
                    <td>
                      {item.sent ? (
                        <span className="badge badge--success">✓ Dispatched</span>
                      ) : (
                        <span className="badge badge--warning">⏳ Scheduled</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
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

      {/* Confirm Delete Modal */}
      {deleteId && (
        <ConfirmModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Reminder"
          message="Are you sure you want to cancel and delete this reminder?"
          confirmLabel="Delete Reminder"
          dangerous
        />
      )}
    </div>
  );
}


/* ─── Main Export ─────────────────────────────────────────── */

