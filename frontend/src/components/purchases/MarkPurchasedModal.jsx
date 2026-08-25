import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';

export default function MarkPurchasedModal({ purchase, onClose, onSuccess }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    orderId: '',
    deliveryDate: '',
    exactPurchaseAmount: purchase.finalAmount || '',
    purchaseRemarks: ''
  });
  const [file, setFile] = useState(null);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (file) {
        data.append('invoiceFile', file);
      }

      const res = await apiFetch(`/purchase/${purchase.id}/purchase`, {
        method: 'PUT',
        body: data,
        isFormData: true
      });
      
      toast.success('Successfully marked as Purchased!');
      onSuccess(res);
    } catch (err) {
      toast.error(err.message || 'Failed to update purchase details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Mark as Purchased</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          
          <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <div style={{ marginBottom: '0.25rem' }}><strong>Item:</strong> {purchase.itemName}</div>
            <div style={{ marginBottom: '0.25rem' }}><strong>Requested Qty:</strong> {purchase.quantity}</div>
            <div style={{ marginBottom: '0.25rem' }}><strong>Approved Amount:</strong> ₹{purchase.finalAmount}</div>
          </div>

          <div className="form-group">
            <label>Order ID / Reference No *</label>
            <input type="text" name="orderId" required value={formData.orderId} onChange={handleChange} className="form-control" />
          </div>

          <div className="form-group">
            <label>Delivery Date *</label>
            <input type="date" name="deliveryDate" required value={formData.deliveryDate} onChange={handleChange} className="form-control" />
          </div>

          <div className="form-group">
            <label>Exact Purchase Amount (Rs) *</label>
            <input type="number" min="0" step="0.01" name="exactPurchaseAmount" required value={formData.exactPurchaseAmount} onChange={handleChange} className="form-control" />
            <small style={{ color: '#64748b' }}>Update this if the final actual purchase amount differs from the approved amount.</small>
          </div>

          <div className="form-group">
            <label>Upload Invoice / Bill (Optional)</label>
            <input type="file" onChange={handleFileChange} className="form-control" />
          </div>

          <div className="form-group">
            <label>Remarks (Optional)</label>
            <textarea name="purchaseRemarks" value={formData.purchaseRemarks} onChange={handleChange} className="form-control" rows="2"></textarea>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn--outline" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn--primary" style={{ background: '#9333ea', borderColor: '#7e22ce' }} disabled={loading}>
              {loading ? 'Saving...' : 'Save Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
