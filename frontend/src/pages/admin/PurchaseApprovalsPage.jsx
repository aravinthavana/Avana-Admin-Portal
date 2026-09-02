import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import { PageHeader, Badge } from '../../components/ui';
import { PageHeader } from '../../components/ui';
import AddPurchaseModal from '../../components/purchases/AddPurchaseModal';
import ViewPurchaseModal from '../../components/purchases/ViewPurchaseModal';
import MarkPurchasedModal from '../../components/purchases/MarkPurchasedModal';

export default function PurchaseApprovalsPage() {
  const toast = useToast();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewPurchase, setViewPurchase] = useState(null);
  const [markPurchasedFor, setMarkPurchasedFor] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      let url = '/purchase?';
      if (filterStatus) url += `status=${encodeURIComponent(filterStatus)}&`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (filterMonth) {
        const [y, m] = filterMonth.split('-');
        url += `year=${y}&month=${m}&`;
      }
      
      const data = await apiFetch(url);
      setPurchases(data);
    } catch (err) {
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [filterStatus, searchTerm, filterMonth]);

  const handleDownloadExcel = () => {
    let url = '/api/purchase/export/excel?';
    if (filterStatus) url += `status=${encodeURIComponent(filterStatus)}&`;
    if (filterMonth) {
      const [y, m] = filterMonth.split('-');
      url += `year=${y}&month=${m}&`;
    }
    window.open(url, '_blank');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved': return <Badge status="approved" />;
      case 'Rejected': return <Badge status="rejected" />;
      case 'Need to Discuss': return <Badge status="warning" label="Need to Discuss" />;
      case 'Purchased': return <Badge status="success" label="Purchased" />;
      default: return <Badge status="pending" label="Pending" />;
    }
  };

  if (showAddModal) {
    return (
      <AddPurchaseModal 
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          fetchPurchases();
        }}
      />
    );
  }

  if (viewPurchase) {
    return (
      <ViewPurchaseModal 
        purchase={viewPurchase}
        onClose={() => setViewPurchase(null)}
        onUpdate={(updated) => {
          setViewPurchase(updated);
          fetchPurchases();
        }}
        onMarkPurchased={() => {
          setMarkPurchasedFor(viewPurchase);
          setViewPurchase(null);
        }}
      />
    );
  }

  if (markPurchasedFor) {
    return (
      <MarkPurchasedModal
        purchase={markPurchasedFor}
        onClose={() => setMarkPurchasedFor(null)}
        onSuccess={(updated) => {
          setMarkPurchasedFor(null);
          fetchPurchases();
        }}
      />
    );
  }

  return (
    <div style={{ padding: '0', animation: 'fadeIn 0.2s ease-out' }}>
      
      <PageHeader 
        title="Purchase Requests" 
        subtitle="Manage purchase requests, workflows, and actual purchases."
        action={
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn--outline" onClick={handleDownloadExcel}>
              Download Excel Report
            </button>
            <button className="btn btn--primary" onClick={() => setShowAddModal(true)}>
              + Add Purchase
            </button>
          </div>
        }
      />

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: 'var(--color-bg-offset)', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              placeholder="Search Request ID, Item, Employee..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="form-input"
            />
          </div>
          <div style={{ width: '200px' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-input">
              <option value="">All Statuses</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Need to Discuss">Need to Discuss</option>
              <option value="Rejected">Rejected</option>
              <option value="Purchased">Purchased</option>
            </select>
          </div>
          <div style={{ width: '200px' }}>
            <input 
              type="month" 
              value={filterMonth} 
              onChange={e => setFilterMonth(e.target.value)} 
              className="form-input"
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={{ whiteSpace: 'nowrap' }}>Request ID</th>
              <th style={{ whiteSpace: 'nowrap' }}>Date</th>
              <th style={{ minWidth: '350px' }}>Item</th>
              <th style={{ whiteSpace: 'nowrap' }}>Qty</th>
              <th style={{ whiteSpace: 'nowrap' }}>Amount</th>
              <th style={{ whiteSpace: 'nowrap' }}>Requested By</th>
              <th style={{ whiteSpace: 'nowrap' }}>Approver</th>
              <th style={{ whiteSpace: 'nowrap' }}>Status</th>
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>Loading purchases...</td></tr>
            ) : purchases.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>No purchase requests found.</td></tr>
            ) : (
              purchases.map(p => (
                <tr key={p.id}>
                  <td style={{ whiteSpace: 'nowrap' }}><strong>{p.requestId}</strong></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td>{p.itemName}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{p.quantity}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>₹{p.finalAmount}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{p.requestedBy.split('@')[0]}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{p.approvalPersonEmail.split('@')[0]}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{getStatusBadge(p.status)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn--outline btn--sm" onClick={() => setViewPurchase(p)}>
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
