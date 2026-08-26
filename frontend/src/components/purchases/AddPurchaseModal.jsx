import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import { Modal } from '../ui';

export default function AddPurchaseModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    itemName: '',
    quantity: '1',
    unitAmount: '',
    modeOfPurchase: 'Amazon',
    storeName: '',
    purchaseLink: '',
    reason: '',
    hasGst: 'false',
    gstPercentage: '18',
    approvalPersonEmail: ''
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

  const validateEmail = (email) => {
    return email.endsWith('@avanamedical.com') || email.endsWith('@avanasurgical.com');
  };

  const unitAmt = parseFloat(formData.unitAmount) || 0;
  const qty = parseInt(formData.quantity) || 1;
  const subtotal = unitAmt * qty;
  const hasGst = formData.hasGst === 'true';
  const gstPct = parseFloat(formData.gstPercentage) || 0;
  const gstAmt = hasGst ? (subtotal * gstPct / 100) : 0;
  const finalAmt = subtotal + gstAmt;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail(formData.approvalPersonEmail)) {
      toast.error('Please enter a valid Avana company email address (@avanamedical.com or @avanasurgical.com).');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (file) {
        data.append('itemImage', file);
      }
      
      const email = localStorage.getItem('avana_admin_email') || 'admin@avanamedical.com';
      data.append('requestedBy', email);

      const res = await apiFetch('/purchase', {
        method: 'POST',
        body: data,
        isFormData: true // handled by api wrapper to NOT set Content-Type header
      });
      
      toast.success('Purchase request submitted successfully!');
      onSuccess(res);
    } catch (err) {
      toast.error(err.message || 'Failed to submit purchase request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Purchase Request" size="wide">
      <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Item Name *</label>
            <input type="text" name="itemName" required value={formData.itemName} onChange={handleChange} className="form-control" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Quantity *</label>
              <input type="number" min="1" name="quantity" required value={formData.quantity} onChange={handleChange} className="form-control" />
            </div>
            <div className="form-group">
              <label>Unit Amount (Rs) *</label>
              <input type="number" min="0" step="0.01" name="unitAmount" required value={formData.unitAmount} onChange={handleChange} className="form-control" />
            </div>
          </div>

          <div className="form-group">
            <label>Mode of Purchase *</label>
            <select name="modeOfPurchase" required value={formData.modeOfPurchase} onChange={handleChange} className="form-control">
              <option value="Amazon">Amazon</option>
              <option value="Flipkart">Flipkart</option>
              <option value="Other Online Portal">Other Online Portal</option>
              <option value="Offline Stores">Offline Stores</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {formData.modeOfPurchase === 'Offline Stores' && (
            <div className="form-group">
              <label>Store Name *</label>
              <input type="text" name="storeName" required value={formData.storeName} onChange={handleChange} className="form-control" />
            </div>
          )}

          {formData.modeOfPurchase === 'Others' && (
            <div className="form-group">
              <label>Enter Purchase Mode *</label>
              <input type="text" name="storeName" required value={formData.storeName} onChange={handleChange} className="form-control" />
            </div>
          )}

          <div className="form-group">
            <label>Purchase Link (Optional)</label>
            <input type="url" name="purchaseLink" value={formData.purchaseLink} onChange={handleChange} className="form-control" />
          </div>

          <div className="form-group">
            <label>Item Image (Optional)</label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="form-control" />
          </div>

          <div className="form-group">
            <label>Reason for Purchase *</label>
            <textarea name="reason" required value={formData.reason} onChange={handleChange} className="form-control" rows="3"></textarea>
          </div>

          <div className="form-group">
            <label>GST</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="radio" name="hasGst" value="false" checked={formData.hasGst === 'false'} onChange={handleChange} />
                Without GST
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="radio" name="hasGst" value="true" checked={formData.hasGst === 'true'} onChange={handleChange} />
                With GST
              </label>
            </div>
          </div>

          {formData.hasGst === 'true' && (
            <div className="form-group">
              <label>GST Percentage (%) *</label>
              <input type="number" min="0" max="100" name="gstPercentage" required value={formData.gstPercentage} onChange={handleChange} className="form-control" />
            </div>
          )}

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Subtotal:</span>
              <strong>Rs. {subtotal.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: formData.hasGst === 'true' ? '#475569' : '#94a3b8' }}>
              <span>GST ({formData.hasGst === 'true' ? formData.gstPercentage : '0'}%):</span>
              <strong>Rs. {gstAmt.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem', marginTop: '0.5rem', fontSize: '1.1rem' }}>
              <span>Final Amount:</span>
              <strong style={{ color: '#0f172a' }}>Rs. {finalAmt.toFixed(2)}</strong>
            </div>
          </div>

          <div className="form-group">
            <label>Approval Person Email *</label>
            <input type="email" name="approvalPersonEmail" required placeholder="manager@avanamedical.com" value={formData.approvalPersonEmail} onChange={handleChange} className="form-control" />
            <small style={{ color: '#64748b' }}>Must be @avanamedical.com or @avanasurgical.com</small>
          </div>

                  <div className="modal__footer">
          <button type="button" className="btn btn--outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit Request'}</button>
        </div>
      </form>
    </Modal>
  );
}


