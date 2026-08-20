import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import {
  helpdeskApi, stationeryApi, housekeepingApi, amcApi, utilityApi, taxApi, adminApi,
  assetTrackerApi, courierApi, pettyCashApi, travelApi, billWarrantyApi, otherStockApi, remindersApi, purchaseApi,
} from '../../lib/api';
import {
  Badge, Spinner, EmptyState, Alert, Modal, ConfirmModal,
  FormField, PageHeader, StatCard,
} from '../../components/ui';
import { formatDate, formatDateTime, getStatusBadge, openLegacyPrintReport, CATEGORY_LABELS } from './utils';

export function UtilityPaymentsPage({ api }) {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ utility_type: 'Electricity' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [activeTab, setActiveTab] = useState('Mobile Bill');
  const [filterMonth, setFilterMonth] = useState(''); // e.g., '2026-07'

  const defaultTabs = ['Mobile Bill', 'Landline', 'Broadband', 'Electricity'];
  const tabs = Array.from(new Set([...defaultTabs, ...records.map(r => r.utility_type).filter(Boolean)]));

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try { setRecords((await api.getAll()) || []); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [api, toast]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function openNew() { setEditId(null); setForm({ utility_type: tabs[0], status: 'Unpaid' }); setShowForm(true); }
  function openEdit(r) { setEditId(r.id); setForm({ ...r }); setShowForm(true); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.provider_name || !form.account_number || !form.due_date || !form.amount) {
      toast.warning('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      if (editId) await api.update(editId, form);
      else await api.save(form);
      toast.success('Record saved.');
      setShowForm(false);
      fetchRecords();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    try { await api.delete(id); toast.success('Deleted.'); setRecords(prev => prev.filter(r => r.id !== id)); }
    catch (err) { toast.error(err.message); }
    finally { setConfirmId(null); }
  }

  function getPaytmLink(type) {
    if (type === 'Mobile Bill') return 'https://paytm.com/recharge';
    if (type === 'Landline' || type === 'Broadband') return 'https://paytm.com/landline-bill-payment';
    return 'https://paytm.com/electricity-bill-payment'; // Electricity
  }

  const filteredRecords = useMemo(() => {
    if (!filterMonth) return records;
    return records.filter(r => (r.due_date || r.payment_date || '').startsWith(filterMonth));
  }, [records, filterMonth]);

  if (showForm) {
    return (
      <div>
        <PageHeader title={editId ? 'Edit Utility Bill' : 'Add Utility Bill'} subtitle="Enter utility payment details" action={<button type="button" className="btn btn--outline btn--sm" onClick={() => setShowForm(false)}>← Back</button>} />
        <div className="card">
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'var(--space-4)' }}>
              <FormField label="Utility Type">
                <select className="form-select" value={form.utility_type} onChange={e=>setForm(f=>({...f, utility_type: e.target.value}))}>
                  {tabs.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Provider Name *" required><input type="text" className="form-input" required value={form.provider_name||''} onChange={e=>setForm(f=>({...f, provider_name: e.target.value}))}/></FormField>
              <FormField label="Account Number *" required><input type="text" className="form-input" required value={form.account_number||''} onChange={e=>setForm(f=>({...f, account_number: e.target.value}))}/></FormField>
              <FormField label="Billing Cycle"><input type="text" className="form-input" placeholder="e.g. July 2026" value={form.billing_cycle||''} onChange={e=>setForm(f=>({...f, billing_cycle: e.target.value}))}/></FormField>
              <FormField label="Due Date *" required><input type="date" className="form-input" required value={form.due_date||''} onChange={e=>setForm(f=>({...f, due_date: e.target.value}))}/></FormField>
              <FormField label="Amount *" required><input type="number" className="form-input" required value={form.amount||''} onChange={e=>setForm(f=>({...f, amount: e.target.value}))}/></FormField>
              <FormField label="Status">
                <select className="form-select" value={form.status||'Unpaid'} onChange={e=>setForm(f=>({...f, status: e.target.value}))}>
                  <option value="Unpaid">Unpaid</option><option value="Paid">Paid</option><option value="Overdue">Overdue</option>
                </select>
              </FormField>
              <FormField label="Payment Date"><input type="date" className="form-input" value={form.payment_date||''} onChange={e=>setForm(f=>({...f, payment_date: e.target.value}))}/></FormField>
              <FormField label="Transaction Ref"><input type="text" className="form-input" value={form.transaction_ref||''} onChange={e=>setForm(f=>({...f, transaction_ref: e.target.value}))}/></FormField>
            </div>
            <FormField label="Remarks"><input type="text" className="form-input" value={form.remarks||''} onChange={e=>setForm(f=>({...f, remarks: e.target.value}))}/></FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className={`btn btn--primary${saving?' btn--loading':''}`} disabled={saving}>{editId ? 'Update' : 'Save'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const handleLegacyPDF = () => {
    const totalSum = filteredRecords.reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0);
    const paidSum = filteredRecords.filter(r => r.status === 'Paid').reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0);

    openLegacyPrintReport({
      title: `Utility Payments Report`,
      subtitle: filterMonth ? `Records for ${filterMonth}` : `All Utility Records`,
      docNo: 'AMD-QSP05-03',
      summary: [
        { label: 'Total Entries', value: `${filteredRecords.length} Records` },
        { label: 'Total Amount', value: `Rs ${totalSum.toLocaleString('en-IN')}` },
        { label: 'Total Paid', value: `Rs ${paidSum.toLocaleString('en-IN')}`, color: '#16a34a' },
      ],
      headers: [
        { title: '#' },
        { title: 'Type' },
        { title: 'Provider' },
        { title: 'Account Number' },
        { title: 'Billing Cycle' },
        { title: 'Due Date' },
        { title: 'Amount', align: 'right' },
        { title: 'Status' },
      ],
      rows: filteredRecords.map((r, idx) => [
        idx + 1,
        r.utility_type || '—',
        r.provider_name || '—',
        r.account_number || '—',
        r.billing_cycle || '—',
        r.due_date || '—',
        `Rs ${(parseFloat(r.amount) || 0).toLocaleString('en-IN')}`,
        r.status === 'Paid' ? `Paid (${r.payment_date || ''})` : r.status,
      ])
    });
  };

  return (
    <div>
      <PageHeader title="💡 Utility Payments" subtitle="Manage utility bills and payments" action={
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button type="button" className="btn btn--secondary btn--sm" onClick={handleLegacyPDF}>📄 Download PDF</button>
          <button type="button" className="btn btn--primary btn--sm" onClick={openNew}>+ Add Bill</button>
        </div>
      } />

      <div className="card" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4) var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <FormField label="Filter by Month" htmlFor="util-month-filter">
            <input id="util-month-filter" type="month" className="form-input" value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)} style={{ width: 180 }} />
          </FormField>
          {filterMonth && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setFilterMonth('')} style={{ alignSelf: 'flex-end', marginBottom: 'var(--space-1)' }}>Clear Filter</button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
          : filteredRecords.length === 0 ? <EmptyState icon="💳" title="No bills found" description={filterMonth ? "No utility records found for this month" : "No utility records found"} />
          : (
            <div style={{ padding: 'var(--space-4)' }}>
              {tabs.map(tab => {
                const tabRecords = filteredRecords.filter(r => r.utility_type === tab);
                if (tabRecords.length === 0) return null;
                return (
                  <div key={tab} style={{ marginBottom: 'var(--space-8)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-primary-dark)', marginBottom: 'var(--space-3)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                      {tab}
                    </h3>
                    <div className="table-wrapper" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
                      <table className="table" aria-label={`${tab} payments`}>
                        <thead>
                          <tr>
                            <th scope="col">Provider Name</th>
                            <th scope="col">Account No</th>
                            <th scope="col">Due Date</th>
                            <th scope="col">Amount</th>
                            <th scope="col">Status</th>
                            <th scope="col">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tabRecords.map(r => (
                            <tr key={r.id}>
                              <td style={{ fontWeight: 600 }}>{r.provider_name}</td>
                              <td>{r.account_number}</td>
                              <td>{formatDate(r.due_date)}</td>
                              <td>₹{Number(r.amount).toLocaleString()}</td>
                              <td><Badge status={r.status === 'Paid' ? 'success' : (r.status === 'Overdue' ? 'danger' : 'warning')} label={r.status || 'Unpaid'} /></td>
                              <td>
                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                  <button type="button" className="btn btn--sm btn--secondary" onClick={() => openEdit(r)}>✏️ Edit</button>
                                  {r.status !== 'Paid' && (
                                    <a href={getPaytmLink(r.utility_type)} target="_blank" rel="noopener noreferrer" className="btn btn--sm btn--primary">💸 Pay Now</a>
                                  )}
                                  <button type="button" className="btn btn--sm btn--danger" onClick={() => setConfirmId(r.id)}>🗑️</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </div>
      <ConfirmModal isOpen={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={() => handleDelete(confirmId)} title="Delete Record" message="Are you sure you want to delete this bill?" confirmLabel="Delete" dangerous />
    </div>
  );
}

export function TaxPaymentsPage({ api }) {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ tax_type: 'Property Tax', term: 'First Half', year: new Date().getFullYear().toString() });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [activeTab, setActiveTab] = useState('Property Tax');
  const [filterYear, setFilterYear] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try { setRecords((await api.getAll()) || []); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [api, toast]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function openNew() { setEditId(null); setForm({ tax_type: activeTab, term: 'First Half', year: new Date().getFullYear().toString() }); setShowForm(true); }
  function openEdit(r) { setEditId(r.id); setForm({ ...r }); setShowForm(true); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.location || !form.bill_no || !form.due_date || !form.amount) {
      toast.warning('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      if (editId) await api.update(editId, form);
      else await api.save(form);
      toast.success('Record saved.');
      setShowForm(false);
      fetchRecords();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleMarkAsPaid(r) {
    try {
      await api.update(r.id, { ...r, status: 'Paid', payment_date: new Date().toISOString().split('T')[0] });
      toast.success('Marked as Paid.');
      fetchRecords();
    } catch (err) { toast.error(err.message); }
  }

  async function handleDelete(id) {
    try { await api.delete(id); toast.success('Deleted.'); setRecords(prev => prev.filter(r => r.id !== id)); }
    catch (err) { toast.error(err.message); }
    finally { setConfirmId(null); }
  }

  const years = ['All', ...Array.from({length: 10}, (_, i) => (new Date().getFullYear() - 5 + i).toString())];

  const filteredRecords = records.filter(r => {
    if (r.tax_type !== activeTab) return false;
    if (filterYear !== 'All' && r.year !== filterYear) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.location?.toLowerCase().includes(q) && !r.bill_no?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (showForm) {
    return (
      <div>
        <PageHeader title={editId ? 'Edit Tax Entry' : 'Add Tax Entry'} subtitle="Enter tax payment details" action={<button type="button" className="btn btn--outline btn--sm" onClick={() => setShowForm(false)}>← Back</button>} />
        <div className="card">
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'var(--space-4)' }}>
              <FormField label="Service Type"><select className="form-select" value={form.tax_type} onChange={e=>setForm(f=>({...f, tax_type: e.target.value}))}><option value="Property Tax">Property Tax</option><option value="Water Tax">Water Tax</option></select></FormField>
              <FormField label="Location *" required><input type="text" className="form-input" required value={form.location||''} onChange={e=>setForm(f=>({...f, location: e.target.value}))}/></FormField>
              <FormField label="Bill No *" required><input type="text" className="form-input" required value={form.bill_no||''} onChange={e=>setForm(f=>({...f, bill_no: e.target.value}))}/></FormField>
              <FormField label="Year"><select className="form-select" value={form.year} onChange={e=>setForm(f=>({...f, year: e.target.value}))}>{years.slice(1).map(y => <option key={y} value={y}>{y}</option>)}</select></FormField>
              <FormField label="Term"><select className="form-select" value={form.term} onChange={e=>setForm(f=>({...f, term: e.target.value}))}><option value="First Half">First Half</option><option value="Second Half">Second Half</option></select></FormField>
              <FormField label="Due Date (mm:yyyy) *" required><input type="month" className="form-input" required value={form.due_date||''} onChange={e=>setForm(f=>({...f, due_date: e.target.value}))}/></FormField>
              <FormField label="Amount *" required><input type="number" className="form-input" required value={form.amount||''} onChange={e=>setForm(f=>({...f, amount: e.target.value}))}/></FormField>
              <FormField label="Payment Status">
                <select className="form-select" value={form.status||'Unpaid'} onChange={e=>setForm(f=>({...f, status: e.target.value}))}>
                  <option value="Unpaid">Unpaid</option><option value="Paid">Paid</option>
                </select>
              </FormField>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className={`btn btn--primary${saving?' btn--loading':''}`} disabled={saving}>Save Entry</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const handleLegacyPDF = () => {
    const totalTaxSum = filteredRecords.reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0);
    const paidTaxSum = filteredRecords.filter(r => r.status === 'Paid').reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0);

    openLegacyPrintReport({
      title: `${activeTab} Statement Report`,
      subtitle: filterYear !== 'All' ? `Year: ${filterYear}` : 'All Tax Assessment Years',
      summary: [
        { label: 'Total Tax Entries', value: `${filteredRecords.length} Records` },
        { label: 'Total Assessment Amount', value: `Rs ${totalTaxSum.toLocaleString('en-IN')}` },
        { label: 'Total Paid', value: `Rs ${paidTaxSum.toLocaleString('en-IN')}`, color: '#16a34a' },
      ],
      headers: [
        { title: '#' },
        { title: 'Location / Office' },
        { title: 'Bill Number' },
        { title: 'Year & Term' },
        { title: 'Due Date' },
        { title: 'Amount', align: 'right' },
        { title: 'Status' },
      ],
      rows: filteredRecords.map((r, idx) => [
        idx + 1,
        r.location || '—',
        r.bill_no || '—',
        `${r.year || ''} - ${r.term || ''}`,
        r.due_date || '—',
        `Rs ${(parseFloat(r.amount) || 0).toLocaleString('en-IN')}`,
        r.status === 'Paid' ? `Paid (${r.payment_date || ''})` : 'Unpaid',
      ])
    });
  };

  return (
    <div>
      <PageHeader
        title="🏛️ Property & Water Tax Dashboard"
        subtitle="Manage and track half-yearly tax payments"
        action={
          <button type="button" className="btn btn--secondary" onClick={handleLegacyPDF}>📄 Download PDF</button>
        }
      />

      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className={`btn btn--sm ${activeTab === 'Property Tax' ? 'btn--primary' : 'btn--outline'}`} onClick={() => setActiveTab('Property Tax')}>
            🏠 Property Tax
          </button>
          <button className={`btn btn--sm ${activeTab === 'Water Tax' ? 'btn--primary' : 'btn--outline'}`} onClick={() => setActiveTab('Water Tax')}>
            💧 Water Tax
          </button>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <select className="form-select" value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ minWidth: 120 }}>
            {years.map(y => <option key={y} value={y}>{y === 'All' ? 'All Years' : y}</option>)}
          </select>
          <input type="text" className="form-input" placeholder="Search location or bill no..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <button className="btn btn--primary" onClick={openNew} style={{ background: '#2563eb', borderColor: 'transparent' }}>
            ➕ New Tax Entry
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
          : filteredRecords.length === 0 ? <EmptyState icon="🏛️" title="No tax records found" description="Adjust your filters or add a new entry." />
          : (
            <div className="table-wrapper">
              <table className="table" aria-label="Tax payments">
                <thead>
                  <tr>
                    <th scope="col">Location</th>
                    <th scope="col">Bill Number</th>
                    <th scope="col">Year & Term</th>
                    <th scope="col">Due Date</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Payment Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.location}</td>
                      <td>{r.bill_no}</td>
                      <td style={{ color: '#172025' }}>{r.year} - {r.term}</td>
                      <td style={{ color: '#172025' }}>{r.due_date}</td>
                      <td style={{ color: '#172025' }}>₹{Number(r.amount).toLocaleString()}</td>
                      <td><Badge status={r.status === 'Paid' ? 'success' : 'warning'} label={r.status || 'Unpaid'} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button type="button" className="btn btn--sm btn--secondary" onClick={() => openEdit(r)}>✏️ Edit</button>
                          {r.status !== 'Paid' && (
                            <>
                              <button type="button" className="btn btn--sm btn--outline" onClick={() => handleMarkAsPaid(r)}>✅ Mark as Paid</button>
                              <a href="https://paytm.com/municipal-payments" target="_blank" rel="noopener noreferrer" className="btn btn--sm btn--primary">💸 Pay Now</a>
                            </>
                          )}
                          <button type="button" className="btn btn--sm btn--danger" onClick={() => setConfirmId(r.id)}>🗑️</button>
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
      <ConfirmModal isOpen={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={() => handleDelete(confirmId)} title="Delete Entry" message="Are you sure you want to delete this tax entry?" confirmLabel="Delete" dangerous />
    </div>
  );
}

/* ─── Login Audit ─────────────────────────────────────────── */

export function PettyCashPage() {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthFilter, setMonthFilter] = useState('');
  const [search, setSearch] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({ date: new Date().toISOString().slice(0, 10), company: 'AMD', expenseName: 'Printing & stationary', reason: '', collectedFrom: '', amount: '', remarks: '' });
  const [showClearForm, setShowClearForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [clearForm, setClearForm] = useState({ clearAmount: '', remarks: '' });
  const [deleteId, setDeleteId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

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

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await pettyCashApi.create(addForm);
      toast.success('Petty cash voucher created successfully.');
      setShowAddForm(false);
      setAddForm({ date: new Date().toISOString().slice(0, 10), company: 'AMD', expenseName: 'Printing & stationary', reason: '', collectedFrom: '', amount: '', remarks: '' });
      fetchEntries();
    } catch (err) {
      toast.error(err.message || 'Failed to create voucher');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClearSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await pettyCashApi.clear(selectedEntry.id, clearForm.clearAmount, clearForm.remarks);
      toast.success('Voucher cleared successfully.');
      setShowClearForm(false);
      fetchEntries();
    } catch (err) {
      toast.error(err.message || 'Failed to clear voucher');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    try {
      await pettyCashApi.delete(deleteId);
      toast.success('Voucher deleted successfully.');
      setDeleteId(null);
      fetchEntries();
    } catch (err) {
      toast.error(err.message || 'Failed to delete voucher');
    }
  }

  const handleLegacyPDF = () => {
    openLegacyPrintReport({
      title: 'Petty Cash Report',
      subtitle: monthFilter ? `For month: ${monthFilter}` : 'All Vouchers',
      headers: [
        { title: 'Date' },
        { title: 'Company' },
        { title: 'Reason' },
        { title: 'Amount', align: 'right' },
        { title: 'Status' }
      ],
      rows: filtered.map(item => [
        item.date,
        item.company || 'AMD',
        item.reason,
        `₹${(item.amount || 0).toLocaleString()}`,
        item.cleared ? 'Cleared' : 'Pending'
      ])
    });
  };

  const filtered = useMemo(() => {
    return entries.filter(r => {
      if (search) {
        const q = search.toLowerCase();
        return (
          (r.reason || '').toLowerCase().includes(q) ||
          (r.collectedFrom || '').toLowerCase().includes(q) ||
          (r.expenseName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, search]);

  const totalAmount = filtered.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const clearedAmount = filtered.filter(f => f.cleared).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const pendingAmount = totalAmount - clearedAmount;

  if (showAddForm) {
    return (
      <div>
        <PageHeader
          title="➕ Add Petty Cash Voucher"
          subtitle="Record cash advance, company entity, expense type, recipient, and voucher amount"
          action={
            <button type="button" className="btn btn--outline" onClick={() => setShowAddForm(false)}>
              ← Back to Cash Ledger
            </button>
          }
        />
        <div className="card" style={{ maxWidth: 800, margin: '0 auto', padding: 'var(--space-6)' }}>
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
                <input type="text" className="form-input" placeholder="e.g. Light purchase, travel advance" value={addForm.reason} onChange={e => setAddForm(f => ({ ...f, reason: e.target.value }))} required />
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
              <button type="button" className="btn btn--secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Saving...' : 'Create Cash Voucher'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (showClearForm && selectedEntry) {
    return (
      <div>
        <PageHeader
          title={`✅ Clear Cash Voucher - ₹${selectedEntry.amount}`}
          subtitle="Record settlement clearance details and notes"
          action={
            <button type="button" className="btn btn--outline" onClick={() => setShowClearForm(false)}>
              ← Back to Cash Ledger
            </button>
          }
        />
        <div className="card" style={{ maxWidth: 650, margin: '0 auto', padding: 'var(--space-6)' }}>
          <form onSubmit={handleClearSubmit}>
            <p style={{ fontSize: '0.92rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
              Clear cash advance for <strong>{selectedEntry.reason}</strong> (Issued to: <strong>{selectedEntry.collectedFrom || 'N/A'}</strong>).
            </p>
            <FormField label="Amount to Clear (₹)" required>
              <input type="number" className="form-input" max={selectedEntry.amount} min="1" step="any" value={clearForm.clearAmount} onChange={e => setClearForm(f => ({ ...f, clearAmount: e.target.value }))} required />
            </FormField>
            <FormField label="Settlement Notes / Remarks">
              <input type="text" className="form-input" placeholder="Receipts verified & approved by accounts..." value={clearForm.remarks} onChange={e => setClearForm(f => ({ ...f, remarks: e.target.value }))} />
            </FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setShowClearForm(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Saving...' : 'Confirm Clear Cash'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="💵 Petty Cash & Cash Handling Ledger"
        subtitle="Track cash advances, office expense vouchers, reimbursements, and settlement clearances"
        action={
          <button type="button" className="btn btn--secondary" onClick={handleLegacyPDF}>📄 Download PDF</button>
        }
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
        <button className="btn btn--primary" onClick={() => setShowAddForm(true)} style={{ background: '#d97706', borderColor: 'transparent' }}>
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
                            onClick={() => { setSelectedEntry(item); setClearForm({ clearAmount: item.amount, remarks: '' }); setShowClearForm(true); }}
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


/* ─── Travel Expense Records Component ────────────────────── */
export function TravelExpensePage() {
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
    employeeName: '',
    fromLoc: '',
    toLoc: '',
    mode: 'Bike',
    totalKm: '',
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

  // Dynamic Rate Calculation
  const ratePerKm = addForm.mode === 'Car' ? 10 : 5;
  const kmNum = parseFloat(addForm.totalKm) || 0;
  const calculatedTotal = kmNum * ratePerKm;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!addForm.fromLoc || !addForm.toLoc) {
      toast.warning('From and To locations are required.');
      return;
    }
    if (kmNum <= 0) {
      toast.warning('Please enter valid Total KM.');
      return;
    }

    setSubmitting(true);
    try {
      await travelApi.create({ ...addForm, totalKm: kmNum, totalExpense: calculatedTotal });
      toast.success('Travel expense log created!');
      setShowForm(false);
      setAddForm({ date: new Date().toISOString().slice(0,10), employeeName: '', fromLoc: '', toLoc: '', mode: 'Bike', totalKm: '', remarks: '' });
      fetchEntries();
    } catch (err) {
      toast.error(err.message || 'Failed to save travel log');
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
           (item.mode || '').toLowerCase().includes(s) ||
           (item.remarks || '').toLowerCase().includes(s);
  });

  const totalKmSum = filtered.reduce((acc, cur) => acc + (cur.totalKm || 0), 0);
  const totalCostSum = filtered.reduce((acc, cur) => acc + (cur.totalExpense || 0), 0);

  const handleLegacyPDF = () => {
    openLegacyPrintReport({
      title: 'Travel & Fuel Expenses Report',
      subtitle: monthFilter ? `Month: ${monthFilter}` : 'All Trips',
      summary: [
        { label: 'Total Trips Logged', value: `${filtered.length} Trips` },
        { label: 'Total Distance', value: `${totalKmSum.toLocaleString('en-IN')} KM`, color: '#2563eb' },
        { label: 'Total Expense', value: `Rs ${totalCostSum.toLocaleString('en-IN')}`, color: '#b27f0d' },
      ],
      headers: [
        { title: 'Date' },
        { title: 'Travel Route (From ➔ To)' },
        { title: 'Employee / Driver' },
        { title: 'Mode' },
        { title: 'Total KM' },
        { title: 'Total Expense', align: 'right' },
        { title: 'Remarks' },
      ],
      rows: filtered.map(item => [
        item.date,
        `${item.fromLoc || '—'} ➔ ${item.toLoc || '—'}`,
        item.employeeName || 'Admin',
        item.mode === 'Car' ? 'Car (Rs 10/KM)' : 'Bike (Rs 5/KM)',
        `${item.totalKm || 0} KM`,
        `Rs ${(item.totalExpense || 0).toLocaleString('en-IN')}`,
        item.remarks || '—',
      ])
    });
  };

  if (showForm) {
    return (
      <div>
        <PageHeader
          title="➕ Log Travel Expense Record"
          subtitle="Calculate mileage expense by Total KM (Bike ₹5/KM, Car ₹10/KM)"
          action={
            <button type="button" className="btn btn--outline" onClick={() => setShowForm(false)}>
              ← Back to Travel List
            </button>
          }
        />
        <div className="card" style={{ maxWidth: 800, margin: '0 auto', padding: 'var(--space-6)' }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Travel Date" required>
                <input type="date" className="form-input" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} required />
              </FormField>
              <FormField label="Employee / Driver Name">
                <input type="text" className="form-input" placeholder="e.g. Dinesh, Siva" value={addForm.employeeName} onChange={e => setAddForm(f => ({ ...f, employeeName: e.target.value }))} />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="From Origin Location *" required>
                <input type="text" className="form-input" placeholder="HO / Head Office" value={addForm.fromLoc} onChange={e => setAddForm(f => ({ ...f, fromLoc: e.target.value }))} required />
              </FormField>
              <FormField label="To Destination Location *" required>
                <input type="text" className="form-input" placeholder="Site / Destination" value={addForm.toLoc} onChange={e => setAddForm(f => ({ ...f, toLoc: e.target.value }))} required />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <FormField label="Mode of Travel *" required>
                <select className="form-select" value={addForm.mode} onChange={e => setAddForm(f => ({ ...f, mode: e.target.value }))}>
                  <option value="Bike">🏍️ Bike (₹5 / KM)</option>
                  <option value="Car">🚗 Car (₹10 / KM)</option>
                </select>
              </FormField>
              <FormField label="Total KM *" required>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 15"
                  min="0"
                  step="0.1"
                  value={addForm.totalKm}
                  onChange={e => setAddForm(f => ({ ...f, totalKm: e.target.value }))}
                  required
                />
              </FormField>
            </div>

            <div style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                Rate: <strong>₹{ratePerKm} / KM</strong> ({kmNum} KM)
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                Total Amount: ₹{calculatedTotal.toLocaleString()}
              </span>
            </div>

            <FormField label="Purpose / Remarks">
              <textarea className="form-textarea" rows={2} placeholder="Site visit, client meeting notes..." value={addForm.remarks} onChange={e => setAddForm(f => ({ ...f, remarks: e.target.value }))} />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Logging...' : 'Save Travel Log'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="🚗 Travel Expenses Records"
        subtitle="Log vehicle distance (Total KM) and calculate travel expenses (Bike: ₹5/KM, Car: ₹10/KM)"
        action={
          <button type="button" className="btn btn--secondary" onClick={handleLegacyPDF}>📄 Download PDF</button>
        }
      />

      {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <StatCard title="Total Trips Logged" value={`${filtered.length} Trips`} icon="🗺️" />
        <StatCard title="Total Distance Travelled" value={`${totalKmSum.toLocaleString()} KM`} icon="🚗" />
        <StatCard title="Total Travel Expense" value={`₹${totalCostSum.toLocaleString()}`} icon="💳" />
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', flex: 1, maxWidth: 600 }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Search origin, destination, driver, mode..."
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
        <button className="btn btn--primary" onClick={() => setShowForm(true)} style={{ background: '#2563eb', borderColor: 'transparent' }}>
          ➕ Log Travel Record
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🚗" title="No Travel Logs found" description="Log vehicle trips to start tracking mileage & expenses." />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Travel Route (From ➔ To)</th>
                  <th scope="col">Employee / Driver</th>
                  <th scope="col">Transport Mode</th>
                  <th scope="col">Total KM</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Total Expense</th>
                  <th scope="col">Remarks</th>
                  <th scope="col" style={{ textAlign: 'right', width: 90 }} className="no-print">Actions</th>
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
                    <td style={{ fontSize: '0.88rem', fontWeight: 600 }}>{item.employeeName || 'Admin'}</td>
                    <td>
                      <span className={`badge ${item.mode === 'Car' ? 'badge--warning' : 'badge--info'}`} style={{ fontWeight: 600 }}>
                        {item.mode === 'Car' ? '🚗 Car (₹10/KM)' : '🏍️ Bike (₹5/KM)'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.92rem' }}>{item.totalKm || 0} KM</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary-dark)' }}>
                      ₹{(item.totalExpense || (item.totalKm * (item.mode === 'Car' ? 10 : 5)) || 0).toLocaleString()}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', maxWidth: 200 }}>
                      {item.remarks || '—'}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className="no-print">
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


/* ── Purchase Approval Component ────────────────────────────────────────── */
export function PurchaseApprovalPage() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPurchasedModal, setShowPurchasedModal] = useState(false);
  const [showMonthReportModal, setShowMonthReportModal] = useState(false);
  const [viewDetails, setViewDetails] = useState(null);
  
  // Forms
  const [addForm, setAddForm] = useState({
    itemName: '',
    quantity: 1,
    amount: '',
    modeOfPurchase: 'Amazon',
    link: '',
    itemImage: '',
    reason: '',
    gstStatus: 'With GST',
    approvalEmail: ''
  });
  
  const [purchasedForm, setPurchasedForm] = useState({
    orderId: '',
    deliveryDate: '',
    actualAmount: ''
  });
  
  const [reportForm, setReportForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const [selectedReqId, setSelectedReqId] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await purchaseApi.getAll();
      setRequests(data);
    } catch (err) {
      toast.error('Failed to load purchase requests');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.approvalEmail.endsWith('@avanamedical.com') && !addForm.approvalEmail.endsWith('@avanasurgical.com')) {
      return toast.error('Approval email must be an @avanamedical.com or @avanasurgical.com address.');
    }
    try {
      await purchaseApi.create({
        ...addForm,
        requesterName: 'Admin',
        requesterEmail: 'admin@avanamedical.com'
      });
      toast.success('Purchase request submitted.');
      setShowAddModal(false);
      setAddForm({ itemName: '', quantity: 1, amount: '', modeOfPurchase: 'Amazon', link: '', itemImage: '', reason: '', gstStatus: 'With GST', approvalEmail: '' });
      fetchRequests();
    } catch (err) {
      toast.error('Failed to submit purchase request.');
    }
  };

  const handlePurchasedSubmit = async (e) => {
    e.preventDefault();
    try {
      await purchaseApi.markPurchased(selectedReqId, purchasedForm);
      toast.success('Marked as purchased.');
      setShowPurchasedModal(false);
      setPurchasedForm({ orderId: '', deliveryDate: '', actualAmount: '' });
      fetchRequests();
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAddForm(f => ({ ...f, itemImage: reader.result }));
    reader.readAsDataURL(file);
  };

  const downloadReport = (req) => {
    const content = `Purchase Request Details\n====================================\nRequest ID: ${req.id}\nRequest Date: ${formatDate(req.createdAt)}\nRequester: ${req.requesterName} (${req.requesterEmail})\n\nItem Name: ${req.itemName}\nQuantity: ${req.quantity}\nAmount Per Unit: ₹${req.amount}\nTotal Requested Amount: ₹${req.totalAmount}\nMode of Purchase: ${req.modeOfPurchase}\nPurchase Link: ${req.link || 'N/A'}\nReason for Purchase: ${req.reason}\nGST Status: ${req.gstStatus}\n\nApproval Details\n------------------------------------\nApproval Person: ${req.approvalEmail}\nApproval Status: ${req.status}\nApproval Date: ${req.approvalDate ? formatDate(req.approvalDate) : 'N/A'}\nApproval Comments: ${req.approvalComment || 'None'}\n\nActual Purchase Details\n------------------------------------\nOrder ID: ${req.orderId || 'N/A'}\nActual Purchase Amount: ${req.actualAmount ? '₹' + req.actualAmount : 'N/A'}\nDelivery Date: ${req.deliveryDate ? formatDate(req.deliveryDate) : 'N/A'}\nFinal Purchase Status: ${req.status === 'Purchased' ? 'Purchased' : 'Pending'}\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PurchaseRequest_${req.id.substring(0,6)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMonthlyCSV = () => {
    const m = parseInt(reportForm.month);
    const y = parseInt(reportForm.year);
    
    const filtered = requests.filter(req => {
      const d = new Date(req.createdAt);
      return d.getMonth() + 1 === m && d.getFullYear() === y;
    });

    if (filtered.length === 0) {
      return toast.warning('No records found for this month.');
    }

    const headers = ['Request Date', 'Item', 'Qty', 'Requested Amount', 'Actual Amount', 'Difference', 'Mode', 'Approver', 'Status'];
    const rows = filtered.map(r => {
      const diff = r.actualAmount ? (parseFloat(r.totalAmount) - parseFloat(r.actualAmount)).toFixed(2) : 'N/A';
      return [
        formatDate(r.createdAt),
        r.itemName,
        r.quantity,
        r.totalAmount,
        r.actualAmount || 'N/A',
        diff,
        r.modeOfPurchase,
        r.approvalEmail,
        r.status
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(',') + "\n"
      + rows.map(e => e.join(',')).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    a.download = `Monthly_Purchase_Report_${y}_${m}.csv`;
    a.click();
  };

  return (
    <div className="fade-in">
      <PageHeader 
        title="🛒 Purchase Approvals"
        subtitle="Manage and track all purchase requests"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn--secondary" onClick={() => setShowMonthReportModal(true)}>
              📥 Monthly Report
            </button>
            <button className="btn btn--primary" onClick={() => setShowAddModal(true)}>
              + Add Purchase
            </button>
          </div>
        }
      />

      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}><Spinner /></div>
        ) : requests.length === 0 ? (
          <EmptyState title="No purchase requests found" icon="🛒" />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Approver</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td>{formatDate(req.createdAt)}</td>
                    <td>{req.itemName}</td>
                    <td>{req.quantity}</td>
                    <td>₹{req.totalAmount}</td>
                    <td>{req.modeOfPurchase}</td>
                    <td>{req.approvalEmail}</td>
                    <td><Badge status={req.status} /></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn--xs btn--outline" onClick={() => setViewDetails(req)}>View</button>
                      <button className="btn btn--xs btn--outline" style={{ marginLeft: 8 }} onClick={() => downloadReport(req)}>Download</button>
                      {req.status === 'Approved' && (
                        <button className="btn btn--xs btn--primary" style={{ marginLeft: 8 }} onClick={() => { setSelectedReqId(req.id); setShowPurchasedModal(true); }}>
                          Mark Purchased
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      <Modal isOpen={!!viewDetails} onClose={() => setViewDetails(null)} title="Purchase Request Details">
        {viewDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><strong>Item:</strong> {viewDetails.itemName}</div>
            <div><strong>Quantity:</strong> {viewDetails.quantity}</div>
            <div><strong>Amount:</strong> ₹{viewDetails.amount}</div>
            <div><strong>Total Amount:</strong> ₹{viewDetails.totalAmount}</div>
            <div><strong>Mode:</strong> {viewDetails.modeOfPurchase}</div>
            <div><strong>Reason:</strong> {viewDetails.reason}</div>
            <div><strong>GST Status:</strong> {viewDetails.gstStatus}</div>
            <div><strong>Approver:</strong> {viewDetails.approvalEmail}</div>
            <div><strong>Status:</strong> <Badge status={viewDetails.status} /></div>
            {viewDetails.link && <div><strong>Link:</strong> <a href={viewDetails.link} target="_blank" rel="noreferrer">View Product</a></div>}
            {viewDetails.itemImage && (
              <div>
                <strong>Attached Image:</strong><br/>
                <img src={viewDetails.itemImage} alt="Item" style={{ maxWidth: '100%', maxHeight: 300, marginTop: 8, borderRadius: 4, border: '1px solid #e4e4e7' }} />
              </div>
            )}
            {viewDetails.status === 'Purchased' && (
              <div style={{ padding: 12, background: '#f9f9fb', borderRadius: 4, marginTop: 12 }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Order Details</h4>
                <div><strong>Order ID:</strong> {viewDetails.orderId}</div>
                <div><strong>Delivery Date:</strong> {formatDate(viewDetails.deliveryDate)}</div>
                <div><strong>Actual Amount:</strong> ₹{viewDetails.actualAmount}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Monthly Report Modal */}
      <Modal isOpen={showMonthReportModal} onClose={() => setShowMonthReportModal(false)} title="Download Monthly Report">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <FormField label="Month">
            <select className="form-select" value={reportForm.month} onChange={e => setReportForm(f => ({ ...f, month: e.target.value }))}>
              {Array.from({length: 12}).map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
            </select>
          </FormField>
          <FormField label="Year">
            <input type="number" className="form-input" value={reportForm.year} onChange={e => setReportForm(f => ({ ...f, year: e.target.value }))} />
          </FormField>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn--primary" onClick={downloadMonthlyCSV}>Download CSV</button>
        </div>
      </Modal>

      {/* Add Purchase Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Purchase Request">
        <form onSubmit={handleAddSubmit}>
          <FormField label="Item Name" required>
            <input type="text" className="form-input" value={addForm.itemName} onChange={e => setAddForm(f => ({ ...f, itemName: e.target.value }))} required />
          </FormField>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label="Quantity" required>
              <input type="number" min="1" className="form-input" value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} required />
            </FormField>
            <FormField label="Amount per Unit (₹)" required>
              <input type="number" step="0.01" className="form-input" value={addForm.amount} onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))} required />
            </FormField>
          </div>

          <FormField label="Total Amount (₹)">
            <input type="text" className="form-input" value={(addForm.quantity * (parseFloat(addForm.amount) || 0)).toFixed(2)} disabled style={{ background: '#f9f9fb' }} />
          </FormField>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label="Mode of Purchase" required>
              <select className="form-select" value={addForm.modeOfPurchase} onChange={e => setAddForm(f => ({ ...f, modeOfPurchase: e.target.value }))} required>
                <option>Amazon</option>
                <option>Flipkart</option>
                <option>Other Online Portal</option>
                <option>Offline Store</option>
                <option>Others</option>
              </select>
            </FormField>
            <FormField label="GST Option" required>
              <select className="form-select" value={addForm.gstStatus} onChange={e => setAddForm(f => ({ ...f, gstStatus: e.target.value }))} required>
                <option>With GST</option>
                <option>Without GST</option>
              </select>
            </FormField>
          </div>

          <FormField label="Product Link (Optional)">
            <input type="url" className="form-input" value={addForm.link} onChange={e => setAddForm(f => ({ ...f, link: e.target.value }))} />
          </FormField>

          <FormField label="Item Image (Optional)">
            <input type="file" accept="image/*" className="form-input" onChange={handleFileUpload} />
          </FormField>

          <FormField label="Reason for Purchase" required>
            <textarea className="form-input" rows="3" value={addForm.reason} onChange={e => setAddForm(f => ({ ...f, reason: e.target.value }))} required />
          </FormField>

          <FormField label="Approval Person Email" required>
            <input type="email" className="form-input" value={addForm.approvalEmail} onChange={e => setAddForm(f => ({ ...f, approvalEmail: e.target.value }))} placeholder="manager@avanamedical.com" required />
          </FormField>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn--outline" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary">Submit Request</button>
          </div>
        </form>
      </Modal>

      {/* Mark Purchased Modal */}
      <Modal isOpen={showPurchasedModal} onClose={() => setShowPurchasedModal(false)} title="Mark as Purchased">
        <form onSubmit={handlePurchasedSubmit}>
          <FormField label="Order ID / Order Number" required>
            <input type="text" className="form-input" value={purchasedForm.orderId} onChange={e => setPurchasedForm(f => ({ ...f, orderId: e.target.value }))} required />
          </FormField>
          <FormField label="Delivery Date" required>
            <input type="date" className="form-input" value={purchasedForm.deliveryDate} onChange={e => setPurchasedForm(f => ({ ...f, deliveryDate: e.target.value }))} required />
          </FormField>
          <FormField label="Exact Purchase Amount (₹)" required>
            <input type="number" step="0.01" className="form-input" value={purchasedForm.actualAmount} onChange={e => setPurchasedForm(f => ({ ...f, actualAmount: e.target.value }))} required />
          </FormField>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn--outline" onClick={() => setShowPurchasedModal(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary">Confirm Purchase</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
