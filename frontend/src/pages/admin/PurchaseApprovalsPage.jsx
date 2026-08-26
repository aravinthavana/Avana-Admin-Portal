import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
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
      case 'Approved': return <span className="badge badge--success">🟢 Approved</span>;
      case 'Rejected': return <span className="badge badge--danger">🔴 Rejected</span>;
      case 'Need to Discuss': return <span className="badge badge--warning">🟠 Discuss</span>;
      case 'Purchased': return <span className="badge badge--primary" style={{ background: '#9333ea', color: '#fff' }}>🟣 Purchased</span>;
      default: return <span className="badge badge--warning">🟡 Pending</span>;
    }
  };

  
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
    <div style={{ padding: '0' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#172025' }}>
            🛒 Purchase Requests
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>Manage purchase requests, workflows, and actual purchases.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn--outline" onClick={handleDownloadExcel}>
            📊 Download Excel Report
          </button>
          <button className="btn btn--primary" onClick={() => setShowAddModal(true)}>
            + Add Purchase
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              placeholder="Search Request ID, Item, Employee..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="form-control"
            />
          </div>
          <div style={{ width: '200px' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-control">
              <option value="">All Statuses</option>
              <option value="Pending Approval">🟡 Pending Approval</option>
              <option value="Approved">🟢 Approved</option>
              <option value="Need to Discuss">🟠 Need to Discuss</option>
              <option value="Rejected">🔴 Rejected</option>
              <option value="Purchased">🟣 Purchased</option>
            </select>
          </div>
          <div style={{ width: '200px' }}>
            <input 
              type="month" 
              value={filterMonth} 
              onChange={e => setFilterMonth(e.target.value)} 
              className="form-control"
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Date</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Amount</th>
              <th>Requested By</th>
              <th>Approver</th>
              <th>Status</th>
              <th>Action</th>
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
                  <td><strong>{p.requestId}</strong></td>
                  <td>{new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td>{p.itemName}</td>
                  <td>{p.quantity}</td>
                  <td>₹{p.finalAmount}</td>
                  <td>{p.requestedBy.split('@')[0]}</td>
                  <td>{p.approvalPersonEmail.split('@')[0]}</td>
                  <td>{getStatusBadge(p.status)}</td>
                  <td>
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

      {showAddModal && (
        <AddPurchaseModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchPurchases();
          }}
        />
      )}

      

      

    </div>
  );
}
