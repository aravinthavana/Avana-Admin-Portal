import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import { Modal, FormField } from '../ui';

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

  const footer = (
    <>
      <button type="button" className="btn btn--outline" onClick={onClose} disabled={loading}>Cancel</button>
      <button type="submit" form="mark-purchased-form" className="btn btn--primary" style={{ background: '#9333ea', borderColor: '#7e22ce' }} disabled={loading}>
        {loading ? 'Saving...' : 'Save Purchase'}
      </button>
    </>
  );

  return (
    <Modal isOpen={true} onClose={onClose} title="Mark as Purchased" footer={footer}>
      <form onSubmit={handleSubmit} id="mark-purchased-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ background: 'var(--color-bg-offset)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem', fontSize: '0.9rem', border: '1px solid var(--color-border)' }}>
            <div style={{ marginBottom: '0.25rem' }}><strong>Item:</strong> {purchase.itemName}</div>
            <div style={{ marginBottom: '0.25rem' }}><strong>Requested Qty:</strong> {purchase.quantity}</div>
            <div style={{ marginBottom: '0.25rem' }}><strong>Approved Amount:</strong> Rs. {purchase.finalAmount}</div>
          </div>

          <FormField label="Order ID / Reference No" required>
            <input type="text" name="orderId" required value={formData.orderId} onChange={handleChange} className="form-input" />
          </FormField>

          <FormField label="Delivery Date" required>
            <input type="date" name="deliveryDate" required value={formData.deliveryDate} onChange={handleChange} className="form-input" />
          </FormField>

          <FormField label="Exact Purchase Amount (Rs)" required hint="Update this if the final actual purchase amount differs from the approved amount.">
            <input type="number" min="0" step="0.01" name="exactPurchaseAmount" required value={formData.exactPurchaseAmount} onChange={handleChange} className="form-input" />
          </FormField>

          <FormField label="Upload Invoice / Bill" hint="Optional">
            <input type="file" onChange={handleFileChange} className="form-input" />
          </FormField>

          <FormField label="Remarks" hint="Optional">
            <textarea name="purchaseRemarks" value={formData.purchaseRemarks} onChange={handleChange} className="form-input" rows="2"></textarea>
          </FormField>
      </form>
    </Modal>
  );
}
