import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import { Modal } from '../ui';

export default function AddPurchaseModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([
    { itemName: '', quantity: '1', unitAmount: '', hasGst: 'false', gstPercentage: '18' }
  ]);
  const [formData, setFormData] = useState({
    modeOfPurchase: 'Amazon',
    storeName: '',
    purchaseLink: '',
    reason: '',
    approvalPersonEmail: ''
  });
  const [file, setFile] = useState(null);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { itemName: '', quantity: '1', unitAmount: '', hasGst: 'false', gstPercentage: '18' }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

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

  let totalSubtotal = 0;
  let totalGst = 0;
  let grandTotal = 0;

  const calculatedItems = items.map(item => {
    const unitAmt = parseFloat(item.unitAmount) || 0;
    const qty = parseInt(item.quantity) || 1;
    const subtotal = unitAmt * qty;
    const hasGst = item.hasGst === 'true';
    const gstPct = parseFloat(item.gstPercentage) || 0;
    const gstAmt = hasGst ? (subtotal * gstPct / 100) : 0;
    const finalAmt = subtotal + gstAmt;

    totalSubtotal += subtotal;
    totalGst += gstAmt;
    grandTotal += finalAmt;

    return { ...item, unitAmt, qty, subtotal, gstAmt, finalAmt };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail(formData.approvalPersonEmail)) {
      toast.error('Please enter a valid Avana company email address (@avanamedical.com or @avanasurgical.com).');
      return;
    }
    
    if (items.some(i => !i.itemName.trim())) {
      toast.error('Please enter an Item Name for all items.');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      
      data.append('itemsJson', JSON.stringify(calculatedItems));
      
      data.append('itemName', calculatedItems.map(i => i.itemName).join(', '));
      data.append('quantity', calculatedItems.reduce((acc, i) => acc + i.qty, 0));
      data.append('unitAmount', (totalSubtotal / (calculatedItems.reduce((acc, i) => acc + i.qty, 0) || 1)).toFixed(2));
      data.append('hasGst', calculatedItems.some(i => i.hasGst === 'true') ? 'true' : 'false');
      data.append('gstPercentage', calculatedItems[0].gstPercentage || '0');
      data.append('gstAmount', totalGst.toFixed(2));
      data.append('finalAmount', grandTotal.toFixed(2));

      if (file) {
        data.append('itemImage', file);
      }
      
      const email = localStorage.getItem('avana_admin_email') || 'admin@avanamedical.com';
      data.append('requestedBy', email);

      const res = await apiFetch('/purchase', {
        method: 'POST',
        body: data,
        isFormData: true
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
    <Modal isOpen={true} onClose={onClose} title="Add Purchase Request" size="xl">
      <form onSubmit={handleSubmit}>
        
        {items.map((item, index) => (
          <div key={index} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0', position: 'relative' }}>
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(index)} style={{ position: 'absolute', top: '10px', right: '10px', background: '#fee2e2', color: '#dc2626', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                &times; Remove
              </button>
            )}
            <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1rem' }}>Item {index + 1}</h4>
            
            <div className="form-group">
              <label>Item Name *</label>
              <input type="text" required value={item.itemName} onChange={(e) => handleItemChange(index, 'itemName', e.target.value)} className="form-control" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Quantity *</label>
                <input type="number" min="1" required value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="form-control" />
              </div>
              <div className="form-group">
                <label>Unit Amount (Rs) *</label>
                <input type="number" min="0" step="0.01" required value={item.unitAmount} onChange={(e) => handleItemChange(index, 'unitAmount', e.target.value)} className="form-control" />
              </div>
            </div>

            <div className="form-group">
              <label>GST</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="radio" value="false" checked={item.hasGst === 'false'} onChange={(e) => handleItemChange(index, 'hasGst', e.target.value)} />
                  Without GST
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="radio" value="true" checked={item.hasGst === 'true'} onChange={(e) => handleItemChange(index, 'hasGst', e.target.value)} />
                  With GST
                </label>
              </div>
            </div>

            {item.hasGst === 'true' && (
              <div className="form-group">
                <label>GST Percentage (%) *</label>
                <input type="number" min="0" max="100" required value={item.gstPercentage} onChange={(e) => handleItemChange(index, 'gstPercentage', e.target.value)} className="form-control" />
              </div>
            )}
            
            <div style={{ textAlign: 'right', fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>
              Item Total: <strong style={{ color: '#0f172a' }}>Rs. {calculatedItems[index].finalAmt.toFixed(2)}</strong>
            </div>
          </div>
        ))}

        <div style={{ marginBottom: '1.5rem' }}>
          <button type="button" onClick={addItem} className="btn btn--outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span> Add Another Item
          </button>
        </div>

        <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Total Subtotal:</span>
            <strong>Rs. {totalSubtotal.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#475569' }}>
            <span>Total GST:</span>
            <strong>Rs. {totalGst.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #94a3b8', paddingTop: '0.5rem', marginTop: '0.5rem', fontSize: '1.1rem' }}>
            <span>Grand Total:</span>
            <strong style={{ color: '#16a34a' }}>Rs. {grandTotal.toFixed(2)}</strong>
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
          <label>Attachment / Image (Optional)</label>
          <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="form-control" />
        </div>

        <div className="form-group">
          <label>Reason for Purchase *</label>
          <textarea name="reason" required value={formData.reason} onChange={handleChange} className="form-control" rows="3"></textarea>
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
