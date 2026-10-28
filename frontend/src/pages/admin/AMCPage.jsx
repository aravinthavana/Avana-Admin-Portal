import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { amcApi } from '../../lib/api';
import {
  Badge, Spinner, EmptyState, Alert, Modal,
  FormField, PageHeader,
} from '../../components/ui';
import { formatDate, openLegacyPrintReport } from './utils';

export function AMCPage() {
  const toast = useToast();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewModal, setViewModal] = useState(null); // stores the contract object to view details
  const [editId, setEditId] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'expired'
  
  const [form, setForm] = useState({
    doc_no: '', amc_name: '', category: 'AC', no_of_visits: '', units_location: '',
    pricing: '', frequency: 'Monthly', start_date: '', end_date: '', last_service: '',
    next_service: '', vendor_contact: '', vendor_phone: '', coverage_specs: '', status: 'Active'
  });

  // State for editing individual visit logs
  const [editingVisit, setEditingVisit] = useState(null);
  const [editVisitForm, setEditVisitForm] = useState({
    visit_no: '',
    last_service_date: '',
    next_service_date: '',
    scheduled_date: '',
    service_person: '',
    contact_number: '',
    service_no: '',
    status: 'Pending',
    remarks: ''
  });

  const [saving, setSaving] = useState(false);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await amcApi.getAll()) || [];
      setContracts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Today in local YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
  }, []);

  const isContractExpired = useCallback((c) => {
    if (!c || !c.end_date) return false;
    return c.end_date < todayStr;
  }, [todayStr]);

  const activeContracts = useMemo(() => {
    return contracts.filter(c => !isContractExpired(c));
  }, [contracts, isContractExpired]);

  const expiredContracts = useMemo(() => {
    return contracts.filter(c => isContractExpired(c));
  }, [contracts, isContractExpired]);

  const displayedContracts = activeTab === 'active' ? activeContracts : expiredContracts;

  function openNew() {
    setEditId(null);
    setForm({
      doc_no: '', amc_name: '', category: 'AC', no_of_visits: '', units_location: '',
      pricing: '', frequency: 'Monthly', start_date: '', end_date: '', last_service: '',
      next_service: '', vendor_contact: '', vendor_phone: '', coverage_specs: '', status: 'Active'
    });
    setShowForm(true);
  }

  function openEdit(c) {
    setEditId(c.id);
    setForm({ ...c });
    setShowForm(true);
  }

  async function handleSaveContract(e) {
    e.preventDefault();
    if (!form.amc_name || !form.category || !form.no_of_visits || !form.units_location || !form.pricing || !form.start_date || !form.end_date) {
      toast.warning('Please fill in all required fields marked with *');
      return;
    }
    setSaving(true);
    try {
      await amcApi.save({ ...form, id: editId || undefined });
      toast.success(editId ? 'Contract updated successfully!' : 'Contract created with visit logs!');
      setShowForm(false);
      await fetchContracts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteContract(id) {
    if (!window.confirm('Are you sure you want to delete this contract and all its visit logs?')) return;
    try {
      await amcApi.delete(id);
      toast.success('Contract deleted.');
      setContracts(prev => prev.filter(c => c.id !== id));
      if (viewModal && viewModal.id === id) setViewModal(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Open modal to edit a specific visit log
  function openEditVisit(v, idx) {
    setEditingVisit(v);
    setEditVisitForm({
      visit_no: v.visit_no || (idx + 1),
      last_service_date: v.last_service_date || '',
      next_service_date: v.next_service_date || '',
      scheduled_date: v.scheduled_date || '',
      service_person: v.service_person || '',
      contact_number: v.contact_number || '',
      service_no: v.service_no || '',
      status: v.status || 'Pending',
      remarks: v.remarks || ''
    });
  }

  // Save an individual visit log
  async function handleSaveEditedVisit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await amcApi.saveVisit({
        id: editingVisit.id,
        amc_id: viewModal.id,
        ...editVisitForm
      });
      toast.success(`Visit #${editVisitForm.visit_no} updated successfully!`);
      setEditingVisit(null);

      // Refresh the specific contract and contracts list
      const updatedList = await amcApi.getAll();
      setContracts(updatedList || []);
      const updatedContract = updatedList.find(c => c.id === viewModal.id);
      if (updatedContract) setViewModal(updatedContract);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const handleLegacyPDF = () => {
    const sections = contracts.map(c => {
      const visitsRows = (c.visits || []).map((v, i) => [
        `Visit #${v.visit_no || v.visitNo || i + 1}`,
        v.last_service_date || v.scheduled_date || '—',
        v.next_service_date || '—',
        v.service_person ? `${v.service_person} (${v.contact_number || '—'})` : '—',
        v.status || 'Pending',
        v.remarks || '—'
      ]);

      const expired = isContractExpired(c);

      return {
        sectionTitle: `AMC Contract: ${c.amc_name || c.equipment_name || 'Details'}`,
        subtitle: `Doc No: ${c.doc_no || '—'} | Category: ${c.category || '—'}`,
        details: [
          { label: 'Contract Name', value: c.amc_name || c.equipment_name || '—' },
          { label: 'Units / Location', value: c.units_location || '—' },
          { label: 'Vendor Name', value: c.vendor_name || '—' },
          { label: 'Contact Person', value: c.vendor_contact || c.contact_person || '—' },
          { label: 'Vendor Phone', value: c.vendor_phone || '—' },
          { label: 'Contract Period', value: `${c.start_date || '—'} to ${c.end_date || '—'}` },
          { label: 'Total Visits', value: `${c.no_of_visits || c.visits?.length || 0} visits` },
          { label: 'Maintenance Freq', value: c.frequency || '—' },
          { label: 'Pricing (INR)', value: c.pricing ? `₹${Number(c.pricing).toLocaleString('en-IN')}` : '—' },
          { label: 'Status', value: expired ? 'Expired' : 'Active', color: expired ? '#dc2626' : '#16a34a' },
          { label: 'Coverage / Specs', value: c.coverage_specs || '—' },
        ],
        headers: [
          { title: 'Visit #' },
          { title: 'Visit Date' },
          { title: 'Next Visit Date' },
          { title: 'Service Person' },
          { title: 'Status' },
          { title: 'Remarks' },
        ],
        rows: visitsRows.length > 0 ? visitsRows : [['No service visits logged', '—', '—', '—', '—', '—']]
      };
    });

    openLegacyPrintReport({
      title: 'AMC Contracts & Service Log Report',
      docNo: 'AMD-QSP05-04',
      sections
    });
  };

  const handleDownloadSingleAMC = (c) => {
    const visitsRows = (c.visits || []).map((v, i) => [
      `Visit #${v.visit_no || v.visitNo || i + 1}`,
      v.last_service_date || v.scheduled_date || '—',
      v.next_service_date || '—',
      v.service_person ? `${v.service_person} (${v.contact_number || '—'})` : '—',
      v.status || 'Pending',
      v.remarks || '—'
    ]);

    const expired = isContractExpired(c);

    openLegacyPrintReport({
      title: `AMC Contract: ${c.amc_name || c.equipment_name || 'Details'}`,
      subtitle: 'Contract Specifications and Service Log',
      docNo: 'AMD-QSP05-04',
      sections: [{
        customHtml: `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
            <div style="background: #f9f9fb; padding: 1rem; border-radius: 6px; border: 1px solid #e4e4e7;">
              <h4 style="color: #172025; margin-bottom: 0.75rem; font-size: 0.95rem;">📄 Contract Specifications</h4>
              <div style="font-size: 0.88rem; line-height: 1.8;">
                <div><strong>Doc No:</strong> ${c.doc_no || '-'}</div>
                <div><strong>Units / Location:</strong> ${c.units_location || '-'}</div>
                <div><strong>Pricing / Cost Paid:</strong> ${c.pricing ? '₹' + Number(c.pricing).toLocaleString() : '-'}</div>
                <div><strong>Total Visits:</strong> ${c.no_of_visits || c.visits?.length || 0} visits</div>
                <div><strong>Frequency:</strong> ${c.frequency || '-'}</div>
                <div><strong>Start Date:</strong> ${c.start_date || '-'}</div>
                <div><strong>End Date:</strong> ${c.end_date || '-'}</div>
                <div><strong>Contract Status:</strong> <strong style="color: ${expired ? '#dc2626' : '#16a34a'};">${expired ? 'Expired' : 'Active'}</strong></div>
              </div>
            </div>
            <div style="background: #f9f9fb; padding: 1rem; border-radius: 6px; border: 1px solid #e4e4e7;">
              <h4 style="color: #172025; margin-bottom: 0.75rem; font-size: 0.95rem;">📞 Vendor & Contact Info</h4>
              <div style="font-size: 0.88rem; line-height: 1.8;">
                <div><strong>Vendor Contact:</strong> ${c.vendor_contact || '-'}</div>
                <div><strong>Contact Phone:</strong> ${c.vendor_phone || '-'}</div>
              </div>
              <h4 style="color: #172025; margin: 1rem 0 0.5rem; font-size: 0.95rem;">Coverage Scope:</h4>
              <div style="font-size: 0.85rem; color: #6b7280; background: #fff; padding: 0.5rem; border: 1px solid #e4e4e7; border-radius: 4px; min-height: 60px;">
                ${c.coverage_specs || 'No coverage details provided.'}
              </div>
            </div>
          </div>
        `,
        headers: [
          { title: 'Visit #' },
          { title: 'Visit Date' },
          { title: 'Next Visit Date' },
          { title: 'Service Person' },
          { title: 'Status' },
          { title: 'Remarks' },
        ],
        rows: visitsRows.length > 0 ? visitsRows : [['No service visits logged', '—', '—', '—', '—', '—']]
      }]
    });
  };

  // ── Render AMC Creation / Edit Form ──────────────────────────────────────────
  if (showForm) {
    return (
      <div>
        <PageHeader
          title={editId ? "✏️ Edit AMC Contract" : "➕ Add New AMC Contract"}
          subtitle="Enter AMC details and number of scheduled visits"
          action={
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setShowForm(false)}>
              ← Back to Contracts
            </button>
          }
        />
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-5)', fontSize: '1.1rem', color: 'var(--color-primary-dark)' }}>
            {editId ? "✏️ Edit AMC Contract" : "➕ Add New AMC Contract"}
          </h3>
          <form autoComplete="off" onSubmit={handleSaveContract}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 'var(--space-4)' }}>
              <FormField label="Doc No"><input type="text" className="form-input" value={form.doc_no || ''} onChange={e=>setForm(f=>({...f, doc_no: e.target.value}))} /></FormField>
              <FormField label="AMC Name / Equipment *" required><input type="text" className="form-input" required value={form.amc_name || ''} onChange={e=>setForm(f=>({...f, amc_name: e.target.value}))} placeholder="e.g. Lift AMC, AC Units Ground Floor" /></FormField>
              <FormField label="AMC Category *" required>
                <select className="form-select" value={form.category || 'AC'} onChange={e=>setForm(f=>({...f, category: e.target.value}))}>
                  {['AC', 'Lift', 'Pest control', 'Genset', 'Fire Extinguisher', 'Other'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormField>
              <FormField label="No. of Visits *" required>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="form-input"
                  required
                  value={form.no_of_visits || ''}
                  onChange={e=>setForm(f=>({...f, no_of_visits: e.target.value}))}
                  placeholder="e.g. 4"
                />
                <small style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>Visit logs will be automatically generated based on this count.</small>
              </FormField>
              <FormField label="Units / Location *" required><input type="text" className="form-input" required value={form.units_location || ''} onChange={e=>setForm(f=>({...f, units_location: e.target.value}))} placeholder="e.g. 4 Lifts - Tower A & B" /></FormField>
              <FormField label="Pricing (INR paid) *" required><input type="number" className="form-input" required value={form.pricing || ''} onChange={e=>setForm(f=>({...f, pricing: e.target.value}))} /></FormField>
              <FormField label="Maintenance Frequency">
                <select className="form-select" value={form.frequency || 'Monthly'} onChange={e=>setForm(f=>({...f, frequency: e.target.value}))}>
                  {['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'As Needed'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormField>
              <FormField label="Start Date *" required><input type="date" className="form-input" required value={form.start_date || ''} onChange={e=>setForm(f=>({...f, start_date: e.target.value}))} /></FormField>
              <FormField label="End Date *" required><input type="date" className="form-input" required value={form.end_date || ''} onChange={e=>setForm(f=>({...f, end_date: e.target.value}))} /></FormField>
              <FormField label="Vendor Contact Person"><input type="text" className="form-input" value={form.vendor_contact || ''} onChange={e=>setForm(f=>({...f, vendor_contact: e.target.value}))} placeholder="e.g. ABC Services / John" /></FormField>
              <FormField label="Vendor Phone Number"><input type="text" className="form-input" value={form.vendor_phone || ''} onChange={e=>setForm(f=>({...f, vendor_phone: e.target.value}))} placeholder="e.g. +91 9876543210" /></FormField>
            </div>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <FormField label="Details of What is in the AMC (Coverage, Specifications)">
                <textarea className="form-textarea" rows={3} value={form.coverage_specs || ''} onChange={e=>setForm(f=>({...f, coverage_specs: e.target.value}))} placeholder="Scope of maintenance, parts included/excluded..." />
              </FormField>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className={`btn btn--primary${saving ? ' btn--loading' : ''}`} disabled={saving}>
                {editId ? 'Update Contract' : 'Save Contract & Generate Visits'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Render Contract Details View with Individual Visit Logs ─────────────────
  if (viewModal) {
    const expired = isContractExpired(viewModal);
    const visits = viewModal.visits || [];
    const completedCount = visits.filter(v => v.status === 'Completed').length;
    const pendingCount = visits.length - completedCount;

    return (
      <div>
        <PageHeader
          title={`📋 ${viewModal.amc_name || viewModal.equipment_name || 'AMC'} Details`}
          subtitle="Contract specifications and individual service visit logs"
          action={
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => handleDownloadSingleAMC(viewModal)}>
                📄 Download PDF
              </button>
              <button type="button" className="btn btn--outline btn--sm" onClick={() => setViewModal(null)}>
                ← Back to Contracts
              </button>
            </div>
          }
        />

        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div style={{ background: '#f8fafc', padding: 'var(--space-4)', borderRadius: 'var(--radius)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h4 style={{ color: 'var(--color-primary-dark)', margin: 0, fontSize: '0.95rem' }}>📄 Contract Specifications</h4>
                <Badge status={expired ? 'danger' : 'success'} label={expired ? 'Expired AMC' : 'Active AMC'} />
              </div>
              <div style={{ fontSize: '0.88rem', lineHeight: 1.8 }}>
                <div><strong>Doc No:</strong> {viewModal.doc_no || '-'}</div>
                <div><strong>Units / Location:</strong> {viewModal.units_location || '-'}</div>
                <div><strong>Pricing / Cost:</strong> {viewModal.pricing ? `₹${Number(viewModal.pricing).toLocaleString('en-IN')}` : '-'}</div>
                <div><strong>Contract Validity:</strong> {viewModal.start_date || '-'} to <strong style={{ color: expired ? '#dc2626' : '#16a34a' }}>{viewModal.end_date || '-'}</strong></div>
                <div><strong>Total Scheduled Visits:</strong> <strong>{viewModal.no_of_visits || visits.length} visits</strong></div>
                <div><strong>Maintenance Frequency:</strong> {viewModal.frequency || '-'}</div>
              </div>
            </div>
            
            <div style={{ background: '#f8fafc', padding: 'var(--space-4)', borderRadius: 'var(--radius)', border: '1px solid #e2e8f0' }}>
              <h4 style={{ color: 'var(--color-primary-dark)', marginBottom: 'var(--space-3)', fontSize: '0.95rem' }}>📞 Vendor & Contact Info</h4>
              <div style={{ fontSize: '0.88rem', lineHeight: 1.8 }}>
                <div><strong>Vendor Contact:</strong> {viewModal.vendor_contact || '-'}</div>
                <div><strong>Contact Phone:</strong> {viewModal.vendor_phone || '-'}</div>
              </div>
              <h4 style={{ color: 'var(--color-primary-dark)', margin: 'var(--space-3) 0 var(--space-1)', fontSize: '0.9rem' }}>Coverage Scope:</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', background: '#fff', padding: 'var(--space-2)', border: '1px solid #e2e8f0', borderRadius: 4, minHeight: 48 }}>
                {viewModal.coverage_specs || 'No coverage details provided.'}
              </div>
            </div>
          </div>

          {/* Visits Summary Pills */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius)', padding: 'var(--space-3) var(--space-4)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: '1.2rem' }}>🛠️</span>
            <div style={{ fontSize: '0.9rem', color: '#1e3a8a' }}>
              <strong>Total Visits:</strong> {viewModal.no_of_visits || visits.length} &nbsp;|&nbsp;
              <strong> Completed:</strong> <span style={{ color: '#16a34a', fontWeight: 600 }}>{completedCount}</span> &nbsp;|&nbsp;
              <strong> Pending:</strong> <span style={{ color: '#d97706', fontWeight: 600 }}>{pendingCount}</span>
            </div>
          </div>

          {/* Individual Visit Logs List */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', borderBottom: '2px solid #e2e8f0', paddingBottom: 'var(--space-2)' }}>
            <h4 style={{ fontSize: '1.05rem', color: '#172025', margin: 0 }}>
              📅 Visit Logs ({visits.length})
            </h4>
            <small style={{ color: 'var(--color-text-muted)' }}>
              Click <strong>"✏️ Edit Visit"</strong> on any log to update dates, technician, or status.
            </small>
          </div>

          {visits.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-6)', background: '#f8fafc', borderRadius: 'var(--radius)' }}>
              No visit logs generated.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {visits.map((v, i) => {
                const visitNumber = v.visit_no || (i + 1);
                const isCompleted = v.status === 'Completed';
                const isMissed = v.status === 'Missed';
                return (
                  <div
                    key={v.id || i}
                    style={{
                      background: '#ffffff',
                      border: isCompleted ? '1px solid #bbf7d0' : isMissed ? '1px solid #fecaca' : '1px solid #e2e8f0',
                      borderRadius: 'var(--radius)',
                      padding: 'var(--space-4)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <strong style={{ fontSize: '1rem', color: 'var(--color-primary-dark)' }}>
                          Visit {visitNumber}
                        </strong>
                        <Badge
                          status={isCompleted ? 'success' : isMissed ? 'danger' : 'warning'}
                          label={v.status || 'Pending'}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn--sm btn--primary"
                        onClick={() => openEditVisit(v, i)}
                      >
                        ✏️ Edit Visit
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', fontSize: '0.88rem' }}>
                      <div style={{ background: '#f8fafc', padding: 'var(--space-2) var(--space-3)', borderRadius: 6 }}>
                        <div style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>Visit Date</div>
                        <div style={{ fontWeight: 600, marginTop: 2, color: v.last_service_date ? '#0f172a' : (v.scheduled_date ? '#2563eb' : '#94a3b8') }}>
                          {v.last_service_date || (v.scheduled_date ? `Scheduled: ${v.scheduled_date}` : 'Not recorded')}
                        </div>
                      </div>

                      <div style={{ background: '#fefce8', padding: 'var(--space-2) var(--space-3)', borderRadius: 6, border: '1px solid #fef08a' }}>
                        <div style={{ color: '#854d0e', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>Next Visit Date</div>
                        <div style={{ fontWeight: 600, marginTop: 2, color: v.next_service_date ? '#b45309' : '#94a3b8' }}>
                          {v.next_service_date ? (
                            <span>
                              {v.next_service_date}
                              <span style={{ display: 'inline-block', marginLeft: 6, fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4 }}>
                                🔔 2-day reminder
                              </span>
                            </span>
                          ) : 'Not scheduled'}
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: 'var(--space-2) var(--space-3)', borderRadius: 6 }}>
                        <div style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>Service Person</div>
                        <div style={{ fontWeight: 500, marginTop: 2 }}>{v.service_person || '—'}</div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: 'var(--space-2) var(--space-3)', borderRadius: 6 }}>
                        <div style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>Contact Number</div>
                        <div style={{ fontWeight: 500, marginTop: 2 }}>{v.contact_number || '—'}</div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: 'var(--space-2) var(--space-3)', borderRadius: 6 }}>
                        <div style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>Service / Invoice No</div>
                        <div style={{ fontWeight: 500, marginTop: 2 }}>{v.service_no || '—'}</div>
                      </div>
                    </div>

                    {v.remarks && (
                      <div style={{ marginTop: 'var(--space-3)', fontSize: '0.85rem', background: '#f1f5f9', padding: 'var(--space-2) var(--space-3)', borderRadius: 6, color: '#334155' }}>
                        <strong>Remarks / Service Details:</strong> {v.remarks}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Visit Modal */}
        {editingVisit && (
          <Modal
            isOpen={!!editingVisit}
            onClose={() => setEditingVisit(null)}
            title={`✏️ Edit Visit #${editVisitForm.visit_no}`}
            size="md"
          >
            <form autoComplete="off" onSubmit={handleSaveEditedVisit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
                <FormField label="Visit Date">
                  <input
                    type="date"
                    className="form-input"
                    value={editVisitForm.last_service_date || ''}
                    onChange={e => setEditVisitForm(f => ({ ...f, last_service_date: e.target.value }))}
                  />
                  <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Date this service visit was conducted.</small>
                </FormField>

                <FormField label="Next Visit Date">
                  <input
                    type="date"
                    className="form-input"
                    value={editVisitForm.next_service_date || ''}
                    onChange={e => setEditVisitForm(f => ({ ...f, next_service_date: e.target.value }))}
                  />
                  <small style={{ color: '#b45309', fontSize: '0.75rem' }}>
                    🔔 A reminder email will be automatically sent to the Admin 2 days before this date.
                  </small>
                </FormField>

                <FormField label="Visit Status">
                  <select
                    className="form-select"
                    value={editVisitForm.status || 'Pending'}
                    onChange={e => setEditVisitForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Missed">Missed</option>
                  </select>
                </FormField>

                <FormField label="Service Report / Invoice No">
                  <input
                    type="text"
                    className="form-input"
                    value={editVisitForm.service_no || ''}
                    onChange={e => setEditVisitForm(f => ({ ...f, service_no: e.target.value }))}
                    placeholder="e.g. SR-89012"
                  />
                </FormField>

                <FormField label="Service Person Name">
                  <input
                    type="text"
                    className="form-input"
                    value={editVisitForm.service_person || ''}
                    onChange={e => setEditVisitForm(f => ({ ...f, service_person: e.target.value }))}
                    placeholder="e.g. John Doe"
                  />
                </FormField>

                <FormField label="Service Person Phone No">
                  <input
                    type="text"
                    className="form-input"
                    value={editVisitForm.contact_number || ''}
                    onChange={e => setEditVisitForm(f => ({ ...f, contact_number: e.target.value }))}
                    placeholder="e.g. +91 9876543210"
                  />
                </FormField>
              </div>

              <div style={{ marginTop: 'var(--space-3)' }}>
                <FormField label="Remarks / Service Details">
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={editVisitForm.remarks || ''}
                    onChange={e => setEditVisitForm(f => ({ ...f, remarks: e.target.value }))}
                    placeholder="Enter details of service carried out, parts inspected or replaced, oil changes, etc."
                  />
                </FormField>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setEditingVisit(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn--primary${saving ? ' btn--loading' : ''}`}
                  disabled={saving}
                >
                  💾 Save Visit Details
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    );
  }

  // ── Render AMC Contracts List with Active / Expired Tabs ────────────────────
  return (
    <div>
      <PageHeader
        title="📋 AMC Contracts & Service Log"
        subtitle="Manage equipment & facility Annual Maintenance Contracts and track service visit logs"
        action={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn--secondary" onClick={handleLegacyPDF}>
              📄 Download PDF Report
            </button>
            <button type="button" className="btn btn--primary" onClick={openNew}>
              + Add AMC Contract
            </button>
          </div>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      {/* Tabs: Active AMC and Expired AMC */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', borderBottom: '2px solid #e2e8f0', paddingBottom: 'var(--space-2)' }}>
        <button
          type="button"
          className={`btn btn--sm ${activeTab === 'active' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('active')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
        >
          <span>✅ Active AMC</span>
          <span style={{
            background: activeTab === 'active' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
            color: activeTab === 'active' ? '#ffffff' : '#475569',
            padding: '1px 8px',
            borderRadius: 12,
            fontSize: '0.78rem'
          }}>
            {activeContracts.length}
          </span>
        </button>

        <button
          type="button"
          className={`btn btn--sm ${activeTab === 'expired' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('expired')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
        >
          <span>⌛ Expired AMC</span>
          <span style={{
            background: activeTab === 'expired' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
            color: activeTab === 'expired' ? '#ffffff' : '#475569',
            padding: '1px 8px',
            borderRadius: 12,
            fontSize: '0.78rem'
          }}>
            {expiredContracts.length}
          </span>
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
        ) : displayedContracts.length === 0 ? (
          <EmptyState
            icon={activeTab === 'active' ? "📋" : "⌛"}
            title={activeTab === 'active' ? "No Active AMC Contracts" : "No Expired AMC Contracts"}
            description={
              activeTab === 'active'
                ? "No active AMC contracts currently in effect. Click '+ Add AMC Contract' to create one."
                : "No expired contracts. Expired contracts will automatically appear here once their validity ends."
            }
          />
        ) : (
          <div className="table-wrapper">
            <table className="table" aria-label="AMC contracts">
              <thead>
                <tr>
                  <th scope="col">AMC / Equipment Name</th>
                  <th scope="col">Category</th>
                  <th scope="col">Status</th>
                  <th scope="col">Total Visits</th>
                  <th scope="col">Units / Location</th>
                  <th scope="col">Pricing</th>
                  <th scope="col">Contract Expiry</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedContracts.map(c => {
                  const expired = isContractExpired(c);
                  const totalVisits = c.no_of_visits || c.visits?.length || 0;
                  const completedVisits = (c.visits || []).filter(v => v.status === 'Completed').length;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.amc_name || c.equipment_name || '-'}</td>
                      <td>{c.category || '-'}</td>
                      <td>
                        <Badge
                          status={expired ? 'danger' : 'success'}
                          label={expired ? 'Expired' : 'Active'}
                        />
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {completedVisits} / {totalVisits}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: 4 }}>visits</span>
                      </td>
                      <td>{c.units_location || '-'}</td>
                      <td style={{ fontWeight: 600 }}>
                        {c.pricing ? `₹${Number(c.pricing).toLocaleString('en-IN')}` : (c.cost ? `₹${Number(c.cost).toLocaleString('en-IN')}` : '-')}
                      </td>
                      <td style={{ fontWeight: 600, color: expired ? '#dc2626' : '#16a34a' }}>
                        {formatDate(c.end_date)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button
                            type="button"
                            className="btn btn--sm btn--outline"
                            onClick={() => setViewModal(c)}
                            title="View visit logs and contract details"
                          >
                            🔍 Visits & Details
                          </button>
                          <button
                            type="button"
                            className="btn btn--sm btn--secondary"
                            onClick={() => openEdit(c)}
                            title="Edit contract details"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn--sm btn--secondary"
                            onClick={() => handleDownloadSingleAMC(c)}
                            title="Download PDF"
                          >
                            📄 PDF
                          </button>
                          <button
                            type="button"
                            className="btn btn--sm btn--danger"
                            onClick={() => handleDeleteContract(c.id)}
                            title="Delete contract"
                          >
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
    </div>
  );
}
