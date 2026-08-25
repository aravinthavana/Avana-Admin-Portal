import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';

export default function ViewPurchaseModal({ purchase, onClose, onUpdate, onMarkPurchased }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null); // 'Approve', 'Reject', 'Need to Discuss'
  const [comments, setComments] = useState('');

  const handleStatusUpdate = async (status) => {
    if ((status === 'Rejected' || status === 'Need to Discuss') && !comments.trim()) {
      toast.error(`Please provide a reason for ${status === 'Rejected' ? 'rejection' : 'discussion'}.`);
      return;
    }

    setLoading(true);
    try {
      const email = localStorage.getItem('avana_admin_email') || 'admin@avanamedical.com'; // In a real app this is the logged in user
      
      const payload = {
        status,
        approverEmail: email,
        comments: status === 'Approved' || status === 'Need to Discuss' ? comments : null,
        reason: status === 'Rejected' ? comments : null
      };

      const res = await apiFetch(`/purchase/${purchase.id}/status`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      
      toast.success(`Request marked as ${status}`);
      onUpdate(res);
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleDownloadPdf = () => {
    window.open(`/api/purchase/${purchase.id}/export/pdf`, '_blank');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved': return <span className="badge badge--success">🟢 Approved</span>;
      case 'Rejected': return <span className="badge badge--danger">🔴 Rejected</span>;
      case 'Need to Discuss': return <span className="badge badge--warning">🟠 Need to Discuss</span>;
      case 'Purchased': return <span className="badge badge--primary" style={{ background: '#9333ea', color: '#fff' }}>🟣 Purchased</span>;
      default: return <span className="badge badge--warning">🟡 Pending Approval</span>;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>Purchase Details</h2>
            <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.25rem' }}>{purchase.requestId}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn--outline btn--sm" onClick={handleDownloadPdf}>📥 Download PDF</button>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div style={{ padding: '1.5rem 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            
            {/* Left Column: Purchase Info */}
            <div>
              <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#0f172a' }}>Purchase Information</h3>
              <table style={{ width: '100%', fontSize: '0.95rem' }}>
                <tbody>
                  <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Item Name</td><td style={{ fontWeight: 600 }}>{purchase.itemName}</td></tr>
                  <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Quantity</td><td style={{ fontWeight: 600 }}>{purchase.quantity}</td></tr>
                  <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Unit Amount</td><td style={{ fontWeight: 600 }}>₹{purchase.unitAmount}</td></tr>
                  <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>GST ({purchase.gstPercentage || 0}%)</td><td style={{ fontWeight: 600 }}>₹{purchase.gstAmount}</td></tr>
                  <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Final Amount</td><td style={{ fontWeight: 800, color: '#16a34a' }}>₹{purchase.finalAmount}</td></tr>
                  <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Mode</td><td style={{ fontWeight: 600 }}>{purchase.modeOfPurchase}</td></tr>
                  {purchase.storeName && <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Store</td><td style={{ fontWeight: 600 }}>{purchase.storeName}</td></tr>}
                  {purchase.purchaseLink && <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Link</td><td style={{ fontWeight: 600 }}><a href={purchase.purchaseLink} target="_blank" rel="noreferrer">View Link</a></td></tr>}
                  <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Requested By</td><td style={{ fontWeight: 600 }}>{purchase.requestedBy}</td></tr>
                  <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Date</td><td style={{ fontWeight: 600 }}>{new Date(purchase.createdAt).toLocaleString('en-IN')}</td></tr>
                </tbody>
              </table>

              <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#475569' }}>Reason for Purchase:</strong>
                <p style={{ margin: 0, color: '#1e293b' }}>{purchase.reason}</p>
              </div>

              {purchase.itemImage && (
                <div style={{ marginTop: '1rem' }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#475569' }}>Attached Image:</strong>
                  <a href={purchase.itemImage} target="_blank" rel="noreferrer">
                    <img src={purchase.itemImage} alt="Item" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  </a>
                </div>
              )}
            </div>

            {/* Right Column: Approval & Status Info */}
            <div>
              <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#0f172a' }}>Approval Information</h3>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '0.5rem' }}><strong>Status:</strong> {getStatusBadge(purchase.status)}</div>
                <div style={{ marginBottom: '0.5rem' }}><strong>Approver:</strong> {purchase.approvalPersonEmail}</div>
                {purchase.approvalDate && <div style={{ marginBottom: '0.5rem' }}><strong>Action Date:</strong> {new Date(purchase.approvalDate).toLocaleString('en-IN')}</div>}
                
                {purchase.approverComments && (
                  <div style={{ marginTop: '1rem', background: '#fef3c7', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
                    <strong style={{ color: '#92400e' }}>Approver Comments:</strong>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#b45309' }}>{purchase.approverComments}</p>
                  </div>
                )}
                
                {purchase.rejectionReason && (
                  <div style={{ marginTop: '1rem', background: '#fee2e2', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                    <strong style={{ color: '#991b1b' }}>Rejection Reason:</strong>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#b91c1c' }}>{purchase.rejectionReason}</p>
                  </div>
                )}
              </div>

              {purchase.status === 'Purchased' && (
                <>
                  <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#0f172a', marginTop: '2rem' }}>Final Purchase Details</h3>
                  <table style={{ width: '100%', fontSize: '0.95rem' }}>
                    <tbody>
                      <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Order ID</td><td style={{ fontWeight: 600 }}>{purchase.orderId}</td></tr>
                      <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Exact Amount</td><td style={{ fontWeight: 800, color: '#9333ea' }}>₹{purchase.exactPurchaseAmount}</td></tr>
                      <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Delivery Date</td><td style={{ fontWeight: 600 }}>{purchase.deliveryDate}</td></tr>
                      <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Purchase Date</td><td style={{ fontWeight: 600 }}>{new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}</td></tr>
                      {purchase.invoiceFile && <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Invoice/Bill</td><td style={{ fontWeight: 600 }}><a href={purchase.invoiceFile} target="_blank" rel="noreferrer">View Invoice</a></td></tr>}
                    </tbody>
                  </table>
                  {purchase.purchaseRemarks && (
                     <div style={{ marginTop: '1rem', background: '#f3f4f6', padding: '0.75rem', borderRadius: '8px' }}>
                     <strong style={{ color: '#475569' }}>Remarks:</strong>
                     <p style={{ margin: '0.25rem 0 0 0', color: '#1e293b' }}>{purchase.purchaseRemarks}</p>
                   </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {purchase.status === 'Approved' && (
              <button className="btn btn--primary" style={{ background: '#9333ea', borderColor: '#7e22ce' }} onClick={onMarkPurchased}>
                🟣 Mark as Purchased
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {purchase.status === 'Pending Approval' && !action && (
              <>
                <button className="btn btn--outline" style={{ color: '#f59e0b', borderColor: '#f59e0b' }} onClick={() => setAction('Need to Discuss')}>Need to Discuss</button>
                <button className="btn btn--outline" style={{ color: '#dc2626', borderColor: '#dc2626' }} onClick={() => setAction('Rejected')}>Reject</button>
                <button className="btn btn--primary" style={{ background: '#16a34a', borderColor: '#15803d' }} onClick={() => setAction('Approved')}>Approve</button>
              </>
            )}

            {action && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={action === 'Rejected' ? 'Rejection Reason *' : 'Comments (Optional)'} 
                  value={comments} 
                  onChange={e => setComments(e.target.value)}
                  style={{ width: '300px' }}
                />
                <button className="btn btn--primary" onClick={() => handleStatusUpdate(action)} disabled={loading}>
                  {loading ? 'Processing...' : `Confirm ${action}`}
                </button>
                <button className="btn btn--outline" onClick={() => setAction(null)} disabled={loading}>Cancel</button>
              </div>
            )}

            {!action && <button className="btn btn--outline" onClick={onClose}>Close</button>}
          </div>
        </div>

      </div>
    </div>
  );
}
