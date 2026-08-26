import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import { Modal } from '../ui'; // <-- ADDED THIS

export default function ViewPurchaseModal({ purchase, onClose, onUpdate, onMarkPurchased }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleDownloadPdf = () => {
    window.open(`/api/purchase/${purchase.id}/export/pdf`, '_blank');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved': return <span className="badge badge--success">Rs. Rs.  Approved</span>;
      case 'Rejected': return <span className="badge badge--danger">Rs.  Rejected</span>;
      case 'Need to Discuss': return <span className="badge badge--warning">Rs. Rs.  Need to Discuss</span>;
      case 'Purchased': return <span className="badge badge--primary" style={{ background: '#9333ea', color: '#fff' }}>Rs. Rs. Rs.  Purchased</span>;
      default: return <span className="badge badge--warning">Rs.  Pending Approval</span>;
    }
  };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
      <div>
        {purchase.status === 'Approved' && (
          <button className="btn btn--primary" style={{ background: '#9333ea', borderColor: '#7e22ce' }} onClick={onMarkPurchased}>
            Rs. Rs. Rs.  Mark as Purchased
          </button>
        )}
      </div>
      <div>
        <button className="btn btn--outline" onClick={onClose}>Close</button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={true} onClose={onClose} title={<div style={{display:'flex', alignItems:'center', gap:'1rem'}}><span>Purchase Details</span><span style={{fontSize:'0.9rem', color:'#64748b', fontWeight:'normal'}}>{purchase.requestId}</span><button className="btn btn--outline btn--sm" onClick={handleDownloadPdf} style={{marginLeft:'auto', fontWeight:'normal'}}>Rs. Rs.  Download PDF</button></div>} size="xl" footer={footer}>
      <div style={{ padding: '0.5rem 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Left Column: Purchase Info */}
          <div>
            <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#0f172a' }}>Purchase Information</h3>
            <table style={{ width: '100%', fontSize: '0.95rem' }}>
              <tbody>
                <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Item Name</td><td style={{ fontWeight: 600 }}>{purchase.itemName}</td></tr>
                <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Quantity</td><td style={{ fontWeight: 600 }}>{purchase.quantity}</td></tr>
                <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Unit Amount</td><td style={{ fontWeight: 600 }}>Rs. {purchase.unitAmount}</td></tr>
                <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>GST ({purchase.gstPercentage || 0}%)</td><td style={{ fontWeight: 600 }}>Rs. {purchase.gstAmount}</td></tr>
                <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Final Amount</td><td style={{ fontWeight: 800, color: '#16a34a' }}>Rs. {purchase.finalAmount}</td></tr>
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
                    <tr><td style={{ padding: '0.4rem 0', color: '#64748b' }}>Exact Amount</td><td style={{ fontWeight: 800, color: '#9333ea' }}>Rs. {purchase.exactPurchaseAmount}</td></tr>
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
    </Modal>
  );
}
