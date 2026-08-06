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

export function AMCPage() {
  const toast = useToast();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewModal, setViewModal] = useState(null); // stores the contract object to view details
  
  const [form, setForm] = useState({
    doc_no: '', amc_name: '', category: 'AC', no_of_visits: '', units_location: '',
    pricing: '', frequency: 'Monthly', start_date: '', end_date: '', last_service: '',
    next_service: '', vendor_contact: '', vendor_phone: '', coverage_specs: '', status: 'Active'
  });
  const [visitForm, setVisitForm] = useState({
    scheduled_date: '', last_service_date: '', next_service_date: '',
    service_no: '', service_person: '', contact_number: '', remarks: '', status: 'Pending'
  });
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
    if (!form.amc_name || !form.category || !form.no_of_visits || !form.units_location || !form.pricing || !form.start_date || !form.end_date) {
      toast.warning('Please fill in all required fields marked with *');
      return;
    }
    setSaving(true);
    try {
      await amcApi.save(form);
      toast.success('Contract saved!');
      setShowForm(false);
      setForm({
        doc_no: '', amc_name: '', category: 'AC', no_of_visits: '', units_location: '',
        pricing: '', frequency: 'Monthly', start_date: '', end_date: '', last_service: '',
        next_service: '', vendor_contact: '', vendor_phone: '', coverage_specs: '', status: 'Active'
      });
      fetchContracts();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteContract(id) {
    if (!window.confirm('Are you sure you want to delete this contract?')) return;
    try {
      await amcApi.delete(id);
      toast.success('Contract deleted.');
      setContracts(prev => prev.filter(c => c.id !== id));
      if (viewModal && viewModal.id === id) setViewModal(null);
    } catch (err) { toast.error(err.message); }
  }

  async function handleLogVisit(e) {
    e.preventDefault();
    if (!visitForm.scheduled_date && !visitForm.last_service_date) {
      toast.warning('Please provide a date for the visit.');
      return;
    }
    setSaving(true);
    try {
      await amcApi.saveVisit({ amc_id: viewModal.id, ...visitForm });
      toast.success('Visit logged!');
      setVisitForm({
        scheduled_date: '', last_service_date: '', next_service_date: '',
        service_no: '', service_person: '', contact_number: '', remarks: '', status: 'Pending'
      });
      // Refresh the specific contract
      fetchContracts();
      // Wait for fetch, then update viewModal with fresh data
      const updatedList = await amcApi.getAll();
      const updatedContract = updatedList.find(c => c.id === viewModal.id);
      if (updatedContract) setViewModal(updatedContract);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  if (showForm) {
    return (
      <div>
        <PageHeader
          title="➕ Add New AMC Contract"
          subtitle="Enter AMC details"
          action={
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setShowForm(false)}>
              ← Back
            </button>
          }
        />
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-5)', fontSize: '1.1rem', color: 'var(--color-primary-dark)' }}>
            ➕ Add New AMC Contract
          </h3>
          <form onSubmit={handleSaveContract}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 'var(--space-4)' }}>
              <FormField label="Doc No"><input type="text" className="form-input" value={form.doc_no} onChange={e=>setForm(f=>({...f, doc_no: e.target.value}))} /></FormField>
              <FormField label="AMC Name *" required><input type="text" className="form-input" required value={form.amc_name} onChange={e=>setForm(f=>({...f, amc_name: e.target.value}))} /></FormField>
              <FormField label="AMC Category *" required>
                <select className="form-select" value={form.category} onChange={e=>setForm(f=>({...f, category: e.target.value}))}>
                  {['AC', 'Lift', 'Pest control', 'Other'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormField>
              <FormField label="No. of Visits *" required><input type="number" className="form-input" required value={form.no_of_visits} onChange={e=>setForm(f=>({...f, no_of_visits: e.target.value}))} placeholder="e.g. 6" /></FormField>
              <FormField label="Units / Location *" required><input type="text" className="form-input" required value={form.units_location} onChange={e=>setForm(f=>({...f, units_location: e.target.value}))} placeholder="e.g. 15 ACs - Ground Floor" /></FormField>
              <FormField label="Pricing (INR paid) *" required><input type="number" className="form-input" required value={form.pricing} onChange={e=>setForm(f=>({...f, pricing: e.target.value}))} /></FormField>
              <FormField label="Maintenance Frequency">
                <select className="form-select" value={form.frequency} onChange={e=>setForm(f=>({...f, frequency: e.target.value}))}>
                  {['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'As Needed'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormField>
              <FormField label="Start Date *" required><input type="date" className="form-input" required value={form.start_date} onChange={e=>setForm(f=>({...f, start_date: e.target.value}))} /></FormField>
              <FormField label="End Date *" required><input type="date" className="form-input" required value={form.end_date} onChange={e=>setForm(f=>({...f, end_date: e.target.value}))} /></FormField>
              <FormField label="Last Service Date"><input type="date" className="form-input" value={form.last_service} onChange={e=>setForm(f=>({...f, last_service: e.target.value}))} /></FormField>
              <FormField label="Next Service Date"><input type="date" className="form-input" value={form.next_service} onChange={e=>setForm(f=>({...f, next_service: e.target.value}))} /></FormField>
              <FormField label="Vendor Contact Person"><input type="text" className="form-input" value={form.vendor_contact} onChange={e=>setForm(f=>({...f, vendor_contact: e.target.value}))} /></FormField>
              <FormField label="Vendor Contact Number"><input type="text" className="form-input" value={form.vendor_phone} onChange={e=>setForm(f=>({...f, vendor_phone: e.target.value}))} /></FormField>
            </div>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <FormField label="Details of What is in the AMC (Coverage, Specifications)">
                <textarea className="form-textarea" rows={3} value={form.coverage_specs} onChange={e=>setForm(f=>({...f, coverage_specs: e.target.value}))} />
              </FormField>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
              <button type="submit" className={`btn btn--primary${saving ? ' btn--loading' : ''}`} disabled={saving}>Save Contract</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (viewModal) {
    return (
      <div>
        <PageHeader
          title={`📋 ${viewModal.amc_name || viewModal.equipment_name} Details`}
          subtitle="Contract Specifications and Service Log"
          action={
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setViewModal(null)}>
              ← Back to Contracts
            </button>
          }
        />
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <div style={{ background: '#f8fafc', padding: 'var(--space-4)', borderRadius: 'var(--radius)', border: '1px solid #e2e8f0' }}>
              <h4 style={{ color: 'var(--color-primary-dark)', marginBottom: 'var(--space-3)', fontSize: '0.95rem' }}>📄 Contract Specifications</h4>
              <div style={{ fontSize: '0.88rem', lineHeight: 1.8 }}>
                <div><strong>Doc No:</strong> {viewModal.doc_no || '-'}</div>
                <div><strong>Units / Location:</strong> {viewModal.units_location || '-'}</div>
                <div><strong>Pricing / Cost Paid:</strong> {viewModal.pricing ? `₹${Number(viewModal.pricing).toLocaleString()}` : '-'}</div>
                <div><strong>Frequency:</strong> {viewModal.frequency || '-'}</div>
                <div><strong>Start Date:</strong> {viewModal.start_date || '-'}</div>
                <div><strong>End Date:</strong> {viewModal.end_date || '-'}</div>
                <div><strong>Next Overall Service:</strong> {viewModal.next_service || 'N/A'}</div>
              </div>
            </div>
            
            <div style={{ background: '#f8fafc', padding: 'var(--space-4)', borderRadius: 'var(--radius)', border: '1px solid #e2e8f0' }}>
              <h4 style={{ color: 'var(--color-primary-dark)', marginBottom: 'var(--space-3)', fontSize: '0.95rem' }}>📞 Vendor & Contact Info</h4>
              <div style={{ fontSize: '0.88rem', lineHeight: 1.8 }}>
                <div><strong>Vendor Contact:</strong> {viewModal.vendor_contact || '-'}</div>
                <div><strong>Contact Phone:</strong> {viewModal.vendor_phone || '-'}</div>
              </div>
              <h4 style={{ color: 'var(--color-primary-dark)', margin: 'var(--space-4) 0 var(--space-2)', fontSize: '0.95rem' }}>Coverage Scope:</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', background: '#fff', padding: 'var(--space-2)', border: '1px solid #e2e8f0', borderRadius: 4, minHeight: 60 }}>
                {viewModal.coverage_specs || 'No coverage details provided.'}
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: 'var(--space-4)', borderBottom: '2px solid #e2e8f0', paddingBottom: 'var(--space-2)' }}>
            🛠️ Service Visits History Logs ({viewModal.visits?.length || 0})
          </h4>
          
          <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 'var(--space-5)', border: '1px solid #e2e8f0', borderRadius: 'var(--radius)', padding: 'var(--space-3)', background: '#f1f5f9' }}>
            {(!viewModal.visits || viewModal.visits.length === 0) ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>No visits logged yet.</div>
            ) : (
              viewModal.visits.map((v, i) => (
                <div key={v.id} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 'var(--radius)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <div style={{ fontWeight: 600 }}>Visit #{v.visit_no || (i + 1)} <Badge status={v.status === 'Completed' ? 'success' : 'warning'} label={v.status || 'Pending'} /></div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Scheduled: {v.scheduled_date || v.last_service_date || '-'}</div>
                  </div>
                  <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#334155' }}>
                    <div><strong>Technician:</strong> {v.service_person || '-'} ({v.contact_number || '-'})</div>
                    <div><strong>Service No:</strong> {v.service_no || '-'}</div>
                    {v.remarks && <div><strong>Remarks:</strong> {v.remarks}</div>}
                  </div>
                </div>
              ))
            )}
          </div>

          <h4 style={{ fontSize: '1rem', color: 'var(--color-primary-dark)', marginBottom: 'var(--space-4)', marginTop: 'var(--space-5)' }}>➕ Log New Visit</h4>
          <form onSubmit={handleLogVisit} style={{ background: '#f8fafc', padding: 'var(--space-4)', borderRadius: 'var(--radius)', border: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'var(--space-4)' }}>
              <FormField label="Scheduled Date"><input type="date" className="form-input" value={visitForm.scheduled_date} onChange={e=>setVisitForm(f=>({...f, scheduled_date: e.target.value}))} /></FormField>
              <FormField label="Actual Visit Date"><input type="date" className="form-input" value={visitForm.last_service_date} onChange={e=>setVisitForm(f=>({...f, last_service_date: e.target.value}))} /></FormField>
              <FormField label="Next Due Date"><input type="date" className="form-input" value={visitForm.next_service_date} onChange={e=>setVisitForm(f=>({...f, next_service_date: e.target.value}))} /></FormField>
              <FormField label="Technician Name"><input type="text" className="form-input" value={visitForm.service_person} onChange={e=>setVisitForm(f=>({...f, service_person: e.target.value}))} /></FormField>
              <FormField label="Contact Number"><input type="text" className="form-input" value={visitForm.contact_number} onChange={e=>setVisitForm(f=>({...f, contact_number: e.target.value}))} /></FormField>
              <FormField label="Service Report / Invoice No"><input type="text" className="form-input" value={visitForm.service_no} onChange={e=>setVisitForm(f=>({...f, service_no: e.target.value}))} /></FormField>
              <FormField label="Status">
                <select className="form-select" value={visitForm.status} onChange={e=>setVisitForm(f=>({...f, status: e.target.value}))}>
                  <option value="Pending">Pending</option><option value="Completed">Completed</option><option value="Missed">Missed</option>
                </select>
              </FormField>
            </div>
            <FormField label="Work Done / Remarks"><input type="text" className="form-input" value={visitForm.remarks} onChange={e=>setVisitForm(f=>({...f, remarks: e.target.value}))} /></FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
              <button type="submit" className={`btn btn--primary${saving ? ' btn--loading' : ''}`} disabled={saving}>Log Visit</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const handleLegacyPDF = () => {
    openLegacyPrintReport({
      title: 'AMC Contracts & Service Log Report',
      subtitle: 'Annual Maintenance Contracts',
      summary: [
        { label: 'Total AMC Contracts', value: `${contracts.length} Contracts` },
        { label: 'Active Contracts', value: `${contracts.filter(c => (c.status || '').toLowerCase() !== 'expired').length} Active`, color: '#16a34a' },
      ],
      headers: [
        { title: 'Equipment / AMC' },
        { title: 'Category' },
        { title: 'Vendor & Contact' },
        { title: 'Contract Dates' },
        { title: 'Pricing (INR)' },
        { title: 'Status' },
      ],
      rows: contracts.map(c => [
        c.equipment_name || c.amc_name || '—',
        c.category || 'AC',
        `${c.vendor_name || '—'}<br/><span style="font-size:0.75rem;color:#64748b">${c.vendor_phone || ''}</span>`,
        `${c.start_date || ''} to ${c.end_date || ''}`,
        `Rs ${(parseFloat(c.pricing) || 0).toLocaleString('en-IN')}`,
        c.status || 'Active',
      ])
    });
  };

  return (
    <div>
      <PageHeader
        title="📋 AMC Contracts"
        subtitle="Manage Annual Maintenance Contracts & Service Visits"
        action={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn--secondary btn--sm" onClick={handleLegacyPDF}>📄 Download PDF</button>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowForm(true)}>
              + Add Contract
            </button>
          </div>
        }
  const handleDownloadSingleAMC = (c) => {
    const visitsRows = (c.visits || []).map(v => [
      `Visit #${v.visit_no || v.visitNo || 1}`,
      v.scheduled_date || v.scheduledDate || '—',
      v.last_service_date || v.actualDate || '—',
      v.service_person || '—',
      v.status || 'Pending',
      v.remarks || '—'
    ]);

    openLegacyPrintReport({
      title: `AMC Contract: ${c.amc_name || c.equipment_name || 'Details'}`,
      subtitle: `Doc No: ${c.doc_no || '—'} | Category: ${c.category || '—'}`,
      summary: [
        { label: 'Contract Name', value: c.amc_name || c.equipment_name || '—' },
        { label: 'Units / Location', value: c.units_location || '—' },
        { label: 'Pricing / Cost', value: c.pricing ? `₹${Number(c.pricing).toLocaleString('en-IN')}` : '—' },
        { label: 'Status', value: c.status || 'Active', color: c.status === 'Active' ? '#16a34a' : '#d97706' },
      ],
      headers: [
        { title: 'Visit #' },
        { title: 'Scheduled Date' },
        { title: 'Completed Date' },
        { title: 'Service Person' },
        { title: 'Status' },
        { title: 'Remarks' },
      ],
      rows: visitsRows.length > 0 ? visitsRows : [['No service visits logged', '—', '—', '—', '—', '—']]
    });
  };

  return (
    <div>
      <PageHeader
        title="📋 AMC Contracts & Service Log"
        subtitle="Manage equipment & facility Annual Maintenance Contracts and track service visit logs"
        action={
          <button type="button" className="btn btn--secondary" onClick={handleLegacyPDF}>
            📄 Download PDF Report
          </button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
          : contracts.length === 0 ? <EmptyState icon="📋" title="No AMC Contracts" description="Add your first AMC contract." />
          : (
            <div className="table-wrapper">
              <table className="table" aria-label="AMC contracts">
                <thead>
                  <tr>
                    <th scope="col">AMC Contract Name</th>
                    <th scope="col">Category</th>
                    <th scope="col">Status</th>
                    <th scope="col">Units / Location</th>
                    <th scope="col">Pricing</th>
                    <th scope="col">End Date</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.amc_name || c.equipment_name || '-'}</td>
                      <td>{c.category || '-'}</td>
                      <td><Badge status={c.status === 'Active' ? 'success' : 'neutral'} label={c.status || 'Active'} /></td>
                      <td>{c.units_location || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{c.pricing ? `₹${Number(c.pricing).toLocaleString()}` : (c.cost ? `₹${Number(c.cost).toLocaleString()}` : '-')}</td>
                      <td>{formatDate(c.end_date)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button type="button" className="btn btn--sm btn--outline" onClick={() => setViewModal(c)}>
                            🔍 View Details
                          </button>
                          <button type="button" className="btn btn--sm btn--secondary" onClick={() => handleDownloadSingleAMC(c)}>
                            📄 Download
                          </button>
                          <button type="button" className="btn btn--sm btn--danger" onClick={() => handleDeleteContract(c.id)}>
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

      {/* View Details Modal */}
      {viewModal && (
        <Modal isOpen={!!viewModal} onClose={() => setViewModal(null)} title={`📋 ${viewModal.amc_name || viewModal.equipment_name} Details`} size="lg">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <div style={{ background: '#f8fafc', padding: 'var(--space-4)', borderRadius: 'var(--radius)', border: '1px solid #e2e8f0' }}>
              <h4 style={{ color: 'var(--color-primary-dark)', marginBottom: 'var(--space-3)', fontSize: '0.95rem' }}>📄 Contract Specifications</h4>
              <div style={{ fontSize: '0.88rem', lineHeight: 1.8 }}>
                <div><strong>Doc No:</strong> {viewModal.doc_no || '-'}</div>
                <div><strong>Units / Location:</strong> {viewModal.units_location || '-'}</div>
                <div><strong>Pricing / Cost Paid:</strong> {viewModal.pricing ? `₹${Number(viewModal.pricing).toLocaleString()}` : '-'}</div>
                <div><strong>Frequency:</strong> {viewModal.frequency || '-'}</div>
                <div><strong>Start Date:</strong> {viewModal.start_date || '-'}</div>
                <div><strong>End Date:</strong> {viewModal.end_date || '-'}</div>
                <div><strong>Next Overall Service:</strong> {viewModal.next_service || 'N/A'}</div>
              </div>
            </div>
            
            <div style={{ background: '#f8fafc', padding: 'var(--space-4)', borderRadius: 'var(--radius)', border: '1px solid #e2e8f0' }}>
              <h4 style={{ color: 'var(--color-primary-dark)', marginBottom: 'var(--space-3)', fontSize: '0.95rem' }}>📞 Vendor & Contact Info</h4>
              <div style={{ fontSize: '0.88rem', lineHeight: 1.8 }}>
                <div><strong>Vendor Contact:</strong> {viewModal.vendor_contact || '-'}</div>
                <div><strong>Contact Phone:</strong> {viewModal.vendor_phone || '-'}</div>
              </div>
              <h4 style={{ color: 'var(--color-primary-dark)', margin: 'var(--space-4) 0 var(--space-2)', fontSize: '0.95rem' }}>Coverage Scope:</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', background: '#fff', padding: 'var(--space-2)', border: '1px solid #e2e8f0', borderRadius: 4, minHeight: 60 }}>
                {viewModal.coverage_specs || 'No coverage details provided.'}
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: 'var(--space-4)', borderBottom: '2px solid #e2e8f0', paddingBottom: 'var(--space-2)' }}>
            🛠️ Service Visits History Logs ({viewModal.visits?.length || 0})
          </h4>
          
          <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 'var(--space-5)', border: '1px solid #e2e8f0', borderRadius: 'var(--radius)', padding: 'var(--space-3)', background: '#f1f5f9' }}>
            {(!viewModal.visits || viewModal.visits.length === 0) ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>No visits logged yet.</div>
            ) : (
              viewModal.visits.map((v, i) => (
                <div key={v.id} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 'var(--radius)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <strong style={{ color: 'var(--color-primary)' }}>Visit #{v.visit_no || (i + 1)}</strong>
                    <Badge status={v.status === 'Completed' ? 'success' : 'warning'} label={v.status || 'Pending'} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-2)', fontSize: '0.85rem', color: '#475569' }}>
                    <div><strong>Scheduled:</strong> {v.scheduled_date || '-'}</div>
                    <div><strong>Last Service:</strong> {v.last_service_date || '-'}</div>
                    <div><strong>Next Service:</strong> {v.next_service_date || '-'}</div>
                    <div><strong>Service No:</strong> {v.service_no || '-'}</div>
                    <div><strong>Person:</strong> {v.service_person || '-'}</div>
                    <div><strong>Contact:</strong> {v.contact_number || '-'}</div>
                  </div>
                  {v.remarks && (
                    <div style={{ marginTop: 'var(--space-2)', fontSize: '0.85rem', background: '#f8fafc', padding: 'var(--space-2)', borderRadius: 4 }}>
                      <strong>Remarks:</strong> {v.remarks}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div style={{ background: '#fff', border: '1px dashed #94a3b8', borderRadius: 'var(--radius)', padding: 'var(--space-4)' }}>
            <h5 style={{ margin: '0 0 var(--space-3) 0', color: 'var(--color-primary-dark)' }}>📝 Log New Visit</h5>
            <form onSubmit={handleLogVisit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <FormField label="Visit #"><input type="number" className="form-input" value={visitForm.visit_no} onChange={e=>setVisitForm(f=>({...f, visit_no: e.target.value}))} placeholder="e.g. 1" /></FormField>
                <FormField label="Scheduled Date"><input type="date" className="form-input" value={visitForm.scheduled_date} onChange={e=>setVisitForm(f=>({...f, scheduled_date: e.target.value}))} /></FormField>
                <FormField label="Last Service Date *"><input type="date" className="form-input" required value={visitForm.last_service_date} onChange={e=>setVisitForm(f=>({...f, last_service_date: e.target.value}))} /></FormField>
                <FormField label="Next Service Date"><input type="date" className="form-input" value={visitForm.next_service_date} onChange={e=>setVisitForm(f=>({...f, next_service_date: e.target.value}))} /></FormField>
                <FormField label="Service No"><input type="text" className="form-input" value={visitForm.service_no} onChange={e=>setVisitForm(f=>({...f, service_no: e.target.value}))} /></FormField>
                <FormField label="Service Person"><input type="text" className="form-input" value={visitForm.service_person} onChange={e=>setVisitForm(f=>({...f, service_person: e.target.value}))} /></FormField>
                <FormField label="Contact Number"><input type="text" className="form-input" value={visitForm.contact_number} onChange={e=>setVisitForm(f=>({...f, contact_number: e.target.value}))} /></FormField>
                <FormField label="Status">
                  <select className="form-select" value={visitForm.status} onChange={e=>setVisitForm(f=>({...f, status: e.target.value}))}>
                    {['Pending', 'Completed', 'Skipped'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
              </div>
              <FormField label="Remarks">
                <textarea className="form-textarea" rows={2} value={visitForm.remarks} onChange={e=>setVisitForm(f=>({...f, remarks: e.target.value}))} />
              </FormField>
              <div style={{ textAlign: 'right', marginTop: 'var(--space-3)' }}>
                <button type="submit" className={`btn btn--primary${saving ? ' btn--loading' : ''}`} disabled={saving}>
                  💾 Save Visit Details
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Utility / Tax Payments (shared pattern) ─────────────── */
