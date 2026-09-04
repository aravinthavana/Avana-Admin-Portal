import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import { Badge } from '../ui';

export default function ViewPurchaseModal({ purchase, onClose, onUpdate, onMarkPurchased }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleDownloadPdf = () => {
    window.open(`/api/purchase/${purchase.id}/export/pdf`, '_blank');
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

  // Normalize items
  let itemsList = [];
  if (purchase.itemsJson) {
    try {
      itemsList = typeof purchase.itemsJson === 'string' ? JSON.parse(purchase.itemsJson) : purchase.itemsJson;
    } catch (e) {
      itemsList = [];
    }
  }
  if (!Array.isArray(itemsList) || itemsList.length === 0) {
    itemsList = [{
      itemName: purchase.itemName || 'Item',
      quantity: purchase.quantity || 1,
      unitAmount: purchase.unitAmount || (purchase.finalAmount ? purchase.finalAmount / (purchase.quantity || 1) : 0),
      gstAmt: purchase.gstAmount || 0,
      finalAmt: purchase.finalAmount || purchase.unitAmount || 0
    }];
  }

  return (
    <div style={{ padding: '0', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn--outline" onClick={onClose}>&larr; Back</button>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-text)' }}>Purchase Details</h2>
          <span className="badge badge--neutral">{purchase.requestId}</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn--outline" onClick={handleDownloadPdf}>
            Download PDF
          </button>
          {purchase.status === 'Approved' && (
            <button className="btn btn--primary" onClick={onMarkPurchased}>
              Mark as Purchased
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Purchase Info */}
        <div>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>Items Requested</h3>
          
          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.9rem', tableLayout: 'auto', background: '#ffffff' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '10px 12px', borderBottom: '2px solid var(--color-border)', width: '40px' }}>#</th>
                    <th style={{ padding: '10px 12px', borderBottom: '2px solid var(--color-border)' }}>Item Name</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '2px solid var(--color-border)', width: '60px' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '2px solid var(--color-border)', width: '100px' }}>Unit Price</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '2px solid var(--color-border)', width: '90px' }}>GST</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '2px solid var(--color-border)', width: '110px' }}>Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsList.map((item, idx) => {
                    const qty = item.qty || item.quantity || 1;
                    const unitPrice = parseFloat(item.unitAmt || item.unitAmount || (item.subtotal && qty ? item.subtotal / qty : 0) || 0);
                    const gst = parseFloat(item.gstAmt !== undefined ? item.gstAmt : (item.gstAmount || 0));
                    const total = parseFloat(item.finalAmt !== undefined ? item.finalAmt : ((item.subtotal || unitPrice * qty) + gst));
                    return (
                      <tr key={idx} style={{ background: '#ffffff' }}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)', fontWeight: 500 }}>{item.itemName}</td>
                        <td style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '1px solid var(--color-border)' }}>{qty}</td>
                        <td style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '1px solid var(--color-border)' }}>₹{unitPrice.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '1px solid var(--color-border)' }}>₹{gst.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold' }}>₹{total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                    <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right', borderTop: '2px solid var(--color-border)' }}>Grand Total:</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', borderTop: '2px solid var(--color-border)', color: 'var(--color-success)', fontSize: '1.05rem' }}>₹{parseFloat(purchase.finalAmount || 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="card" style={{ background: '#ffffff', padding: '1rem', marginBottom: '1.5rem', border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', fontSize: '0.95rem', borderCollapse: 'collapse', background: '#ffffff' }}>
              <tbody>
                <tr><td style={{ padding: '0.75rem 0', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>Final Amount</td><td style={{ padding: '0.75rem 0', fontWeight: 800, color: 'var(--color-success)', fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>₹{purchase.finalAmount}</td></tr>
                <tr><td style={{ padding: '0.75rem 0', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>Mode</td><td style={{ padding: '0.75rem 0', fontWeight: 600, borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>{purchase.modeOfPurchase}</td></tr>
                {purchase.storeName && <tr><td style={{ padding: '0.75rem 0', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>Store</td><td style={{ padding: '0.75rem 0', fontWeight: 600, borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>{purchase.storeName}</td></tr>}
                {purchase.purchaseLink && <tr><td style={{ padding: '0.75rem 0', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>Link</td><td style={{ padding: '0.75rem 0', fontWeight: 600, borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}><a href={purchase.purchaseLink} target="_blank" rel="noreferrer">View Link</a></td></tr>}
                <tr><td style={{ padding: '0.75rem 0', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>Requested By</td><td style={{ padding: '0.75rem 0', fontWeight: 600, borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>{purchase.requestedBy.split('@')[0]}</td></tr>
                <tr><td style={{ padding: '0.75rem 0', color: 'var(--color-text-secondary)' }}>Date</td><td style={{ padding: '0.75rem 0', fontWeight: 600, textAlign: 'right' }}>{new Date(purchase.createdAt).toLocaleString('en-IN')}</td></tr>
              </tbody>
            </table>
          </div>

          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text)', fontSize: '0.95rem' }}>Reason for Purchase:</strong>
            <p style={{ margin: 0, color: 'var(--color-text)', lineHeight: 1.5 }}>{purchase.reason}</p>
          </div>

          {purchase.itemImage && (
            <div style={{ marginTop: '1rem', background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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
          <div style={{ marginBottom: '1.5rem', background: '#ffffff', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ marginBottom: '0.75rem' }}><strong>Status:</strong> {getStatusBadge(purchase.status)}</div>
            <div style={{ marginBottom: '0.75rem' }}><strong>Approver:</strong> {purchase.approvalPersonEmail}</div>
            {purchase.approvalDate && <div style={{ marginBottom: '0.75rem' }}><strong>Action Date:</strong> {new Date(purchase.approvalDate).toLocaleString('en-IN')}</div>}
            
            {purchase.approverComments && (
              <div style={{ marginTop: '1rem', background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <strong style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--color-text)', fontSize: '0.95rem' }}>Approver Comments:</strong>
                <p style={{ margin: 0, color: 'var(--color-text)', lineHeight: 1.5 }}>{purchase.approverComments}</p>
              </div>
            )}
            
            {purchase.rejectionReason && (
              <div style={{ marginTop: '1rem', background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-danger)' }}>
                <strong style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--color-danger)', fontSize: '0.95rem' }}>Rejection Reason:</strong>
                <p style={{ margin: 0, color: 'var(--color-text)', lineHeight: 1.5 }}>{purchase.rejectionReason}</p>
              </div>
            )}
          </div>

          {purchase.status === 'Purchased' && (
            <>
              <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--color-text)', marginTop: '2rem' }}>Final Purchase Details</h3>
              <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', fontSize: '0.95rem', background: '#ffffff' }}>
                  <tbody>
                    <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Order ID</td><td style={{ fontWeight: 600 }}>{purchase.orderId}</td></tr>
                    <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Exact Amount</td><td style={{ fontWeight: 800, color: 'var(--color-success)' }}>Rs. {purchase.exactPurchaseAmount}</td></tr>
                    <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Delivery Date</td><td style={{ fontWeight: 600 }}>{purchase.deliveryDate}</td></tr>
                    <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Purchase Date</td><td style={{ fontWeight: 600 }}>{new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}</td></tr>
                    {purchase.invoiceFile && <tr><td style={{ padding: '0.4rem 0', color: 'var(--color-text-secondary)' }}>Invoice/Bill</td><td style={{ fontWeight: 600 }}><a href={purchase.invoiceFile} target="_blank" rel="noreferrer">View Invoice</a></td></tr>}
                  </tbody>
                </table>
                {purchase.purchaseRemarks && (
                  <div style={{ marginTop: '1rem', background: '#ffffff', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <strong style={{ color: 'var(--color-text-secondary)' }}>Remarks:</strong>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text)' }}>{purchase.purchaseRemarks}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
