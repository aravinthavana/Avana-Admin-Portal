import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import { Modal } from '../ui';

export default function ViewPurchaseModal({ purchase, onClose, onUpdate, onMarkPurchased }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleDownloadPdf = () => {
    window.open(`/api/purchase/${purchase.id}/export/pdf`, '_blank');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved': return <span className="badge badge--success">✓ Approved</span>;
      case 'Rejected': return <span className="badge badge--danger">✗ Rejected</span>;
      case 'Need to Discuss': return <span className="badge badge--warning">💬 Need to Discuss</span>;
      case 'Purchased': return <span className="badge badge--primary" style={{ background: '#9333ea', color: '#fff' }}>🛍️ Purchased</span>;
      default: return <span className="badge badge--warning">⏳ Pending Approval</span>;
    }
  };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
      <button className="btn btn--outline" onClick={handleDownloadPdf}>
        Download PDF
      </button>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="btn btn--outline" onClick={onClose}>Close</button>
        {purchase.status === 'Approved' && (
          <button className="btn btn--primary" style={{ background: '#9333ea', borderColor: '#7e22ce' }} onClick={onMarkPurchased}>
            Mark as Purchased
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Modal isOpen={true} onClose={onClose} title={`Purchase Request ${purchase.requestId}`} footer={footer} size="lg">
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Purchase Info */}
        <div>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>Items Requested</h3>
          
          {purchase.itemsJson ? (
            <div style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Unit</th>
                    <th style={{ textAlign: 'right' }}>GST</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {JSON.parse(purchase.itemsJson).map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.itemName}</td>
                      <td style={{ textAlign: 'right' }}>{item.qty}</td>
                      <td style={{ textAlign: 'right' }}>Rs. {item.unitAmt}</td>
                      <td style={{ textAlign: 'right' }}>Rs. {item.gstAmt}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Rs. {item.finalAmt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <table className="data-table" style={{ width: '100%', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              <tbody>
                <tr><td style={{ color: 'var(--color-text-secondary)' }}>Item Name</td><td style={{ fontWeight: 600 }}>{purchase.itemName}</td></tr>
                <tr><td style={{ color: 'var(--color-text-secondary)' }}>Quantity</td><td style={{ fontWeight: 600 }}>{purchase.quantity}</td></tr>
                <tr><td style={{ color: 'var(--color-text-secondary)' }}>Unit Amount</td><td style={{ fontWeight: 600 }}>Rs. {purchase.unitAmount}</td></tr>
                <tr><td style={{ color: 'var(--color-text-secondary)' }}>GST ({purchase.gstPercentage || 0}%)</td><td style={{ fontWeight: 600 }}>Rs. {purchase.gstAmount}</td></tr>
              </tbody>
            </table>
          )}

          <div style={{ background: 'var(--color-bg-offset)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', fontSize: '0.95rem' }}>
              <tbody>
                <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Final Amount</td><td style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: '1.1rem' }}>Rs. {purchase.finalAmount}</td></tr>
                <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Mode</td><td style={{ fontWeight: 600 }}>{purchase.modeOfPurchase}</td></tr>
                {purchase.storeName && <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Store</td><td style={{ fontWeight: 600 }}>{purchase.storeName}</td></tr>}
                {purchase.purchaseLink && <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Link</td><td style={{ fontWeight: 600 }}><a href={purchase.purchaseLink} target="_blank" rel="noreferrer">View Link</a></td></tr>}
                <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Requested By</td><td style={{ fontWeight: 600 }}>{purchase.requestedBy}</td></tr>
                <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Date</td><td style={{ fontWeight: 600 }}>{new Date(purchase.createdAt).toLocaleString('en-IN')}</td></tr>
              </tbody>
            </table>
          </div>

          <div style={{ background: 'var(--color-bg-offset)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>Reason for Purchase:</strong>
            <p style={{ margin: 0, color: 'var(--color-text)' }}>{purchase.reason}</p>
          </div>

          {purchase.itemImage && (
            <div style={{ marginTop: '1rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>Attached Image:</strong>
              <a href={purchase.itemImage} target="_blank" rel="noreferrer">
                <img src={purchase.itemImage} alt="Item" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </a>
            </div>
          )}
        </div>

        {/* Right Column: Approval & Status Info */}
        <div>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>Approval Information</h3>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '0.5rem' }}><strong>Status:</strong> {getStatusBadge(purchase.status)}</div>
            <div style={{ marginBottom: '0.5rem' }}><strong>Approver:</strong> {purchase.approvalPersonEmail}</div>
            {purchase.approvalDate && <div style={{ marginBottom: '0.5rem' }}><strong>Action Date:</strong> {new Date(purchase.approvalDate).toLocaleString('en-IN')}</div>}
            
            {purchase.approverComments && (
              <div style={{ marginTop: '1rem', background: 'var(--color-brand-amber-light)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-amber)' }}>
                <strong style={{ color: '#92400e' }}>Approver Comments:</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#b45309' }}>{purchase.approverComments}</p>
              </div>
            )}
            
            {purchase.rejectionReason && (
              <div style={{ marginTop: '1rem', background: 'var(--color-danger-light)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-danger)' }}>
                <strong style={{ color: 'var(--color-danger)' }}>Rejection Reason:</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-danger)' }}>{purchase.rejectionReason}</p>
              </div>
            )}
          </div>

          {purchase.status === 'Purchased' && (
            <>
              <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--color-text)', marginTop: '2rem' }}>Final Purchase Details</h3>
              <table style={{ width: '100%', fontSize: '0.95rem' }}>
                <tbody>
                  <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Order ID</td><td style={{ fontWeight: 600 }}>{purchase.orderId}</td></tr>
                  <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Exact Amount</td><td style={{ fontWeight: 800, color: '#9333ea' }}>Rs. {purchase.exactPurchaseAmount}</td></tr>
                  <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Delivery Date</td><td style={{ fontWeight: 600 }}>{purchase.deliveryDate}</td></tr>
                  <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Purchase Date</td><td style={{ fontWeight: 600 }}>{new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}</td></tr>
                  {purchase.invoiceFile && <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Invoice/Bill</td><td style={{ fontWeight: 600 }}><a href={purchase.invoiceFile} target="_blank" rel="noreferrer">View Invoice</a></td></tr>}
                </tbody>
              </table>
              {purchase.purchaseRemarks && (
                 <div style={{ marginTop: '1rem', background: 'var(--color-bg-offset)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                 <strong style={{ color: 'var(--color-text-secondary)' }}>Remarks:</strong>
                 <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text)' }}>{purchase.purchaseRemarks}</p>
               </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
