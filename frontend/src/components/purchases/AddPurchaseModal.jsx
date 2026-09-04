import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import { Modal, FormField } from '../ui';

export default function AddPurchaseModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  
  const [items, setItems] = useState([
    { itemName: '', quantity: 1, unitAmount: '', hasGst: 'true', gstPercentage: 18 }
  ]);

  const [formData, setFormData] = useState({
    modeOfPurchase: 'Amazon',
    storeName: '',
    purchaseLink: '',
    reason: '',
    approvalPersonEmail: ''
  });

  const [attachment, setAttachment] = useState(null);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { itemName: '', quantity: 1, unitAmount: '', hasGst: 'true', gstPercentage: 18 }]);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const calculatedItems = items.map(item => {
    const qty = parseInt(item.quantity) || 1;
    const unitAmt = parseFloat(item.unitAmount) || 0;
    const subtotal = qty * unitAmt;
    let gstAmt = 0;
    
    if (item.hasGst === 'true') {
      const gstPct = parseFloat(item.gstPercentage) || 0;
      gstAmt = (subtotal * gstPct) / 100;
    }
    
    return {
      ...item,
      qty,
      quantity: qty,
      unitAmt,
      unitAmount: unitAmt,
      price: unitAmt,
      subtotal,
      gstAmt,
      finalAmt: subtotal + gstAmt
    };
  });

  const totalSubtotal = calculatedItems.reduce((acc, curr) => acc + curr.subtotal, 0);
  const totalGst = calculatedItems.reduce((acc, curr) => acc + curr.gstAmt, 0);
  const grandTotal = totalSubtotal + totalGst;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = new FormData();
      payload.append('itemsJson', JSON.stringify(calculatedItems));
      const combinedItemName = items.map(i => i.itemName).filter(Boolean).join(', ');
      payload.append('itemName', combinedItemName);
      payload.append('quantity', items.length === 1 ? items[0].quantity : items.reduce((a, b) => a + parseInt(b.quantity || 1), 0));
      payload.append('unitAmount', items.length === 1 ? items[0].unitAmount : totalSubtotal);
      payload.append('gstAmount', totalGst);
      payload.append('finalAmount', grandTotal);
      payload.append('modeOfPurchase', formData.modeOfPurchase);
      
      if (formData.modeOfPurchase === 'Offline Stores' || formData.modeOfPurchase === 'Others') {
        payload.append('storeName', formData.storeName);
      }
      
      if (formData.purchaseLink) payload.append('purchaseLink', formData.purchaseLink);
      payload.append('reason', formData.reason);
      payload.append('approvalPersonEmail', formData.approvalPersonEmail);
      
      if (attachment) {
        payload.append('itemImage', attachment);
      }

      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: payload
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      
      toast.success('Purchase request submitted successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to submit purchase request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '0', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button type="button" className="btn btn--outline" onClick={onClose} disabled={loading}>&larr; Back</button>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-text)' }}>Add Purchase Request</h2>
        </div>
        <div>
          <button type="submit" form="add-purchase-form" className="btn btn--primary" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} id="add-purchase-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        
        {items.map((item, index) => (
          <div key={index} style={{ background: 'var(--color-bg-offset)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', position: 'relative' }}>
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(index)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--color-danger-light)', color: 'var(--color-danger)', border: 'none', padding: '5px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                &times; Remove
              </button>
            )}
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-text)', fontSize: '1.1rem' }}>Item {index + 1}</h4>
            
            <FormField label="Item Name" required>
              <input type="text" required value={item.itemName} onChange={(e) => handleItemChange(index, 'itemName', e.target.value)} className="form-input" />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <FormField label="Quantity" required>
                <input type="number" min="1" required value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="form-input" />
              </FormField>
              <FormField label="Unit Amount (Rs)" required>
                <input type="number" min="0" step="0.01" required value={item.unitAmount} onChange={(e) => handleItemChange(index, 'unitAmount', e.target.value)} className="form-input" />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <FormField label="GST Status">
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="radio" value="false" checked={item.hasGst === 'false'} onChange={(e) => handleItemChange(index, 'hasGst', e.target.value)} />
                    Without GST
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="radio" value="true" checked={item.hasGst === 'true'} onChange={(e) => handleItemChange(index, 'hasGst', e.target.value)} />
                    With GST
                  </label>
                </div>
              </FormField>

              {item.hasGst === 'true' && (
                <FormField label="GST Percentage (%)" required>
                  <input type="number" min="0" max="100" required value={item.gstPercentage} onChange={(e) => handleItemChange(index, 'gstPercentage', e.target.value)} className="form-input" />
                </FormField>
              )}
            </div>
            
            <div style={{ textAlign: 'right', fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
              Item Total: <strong style={{ color: 'var(--color-text)', fontSize: '1.1rem' }}>Rs. {calculatedItems[index].finalAmt.toFixed(2)}</strong>
            </div>
          </div>
        ))}

        <div>
          <button type="button" onClick={addItem} className="btn btn--outline btn--sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span> Add Another Item
          </button>
        </div>

        <div style={{ background: 'var(--color-brand-amber-light)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-amber)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Total Subtotal:</span>
            <strong>Rs. {totalSubtotal.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
            <span>Total GST:</span>
            <strong>Rs. {totalGst.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', marginTop: '0.5rem', fontSize: '1.1rem' }}>
            <span>Grand Total:</span>
            <strong style={{ color: 'var(--color-success)' }}>Rs. {grandTotal.toFixed(2)}</strong>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="Mode of Purchase" required>
            <select name="modeOfPurchase" required value={formData.modeOfPurchase} onChange={handleChange} className="form-input">
              <option value="Amazon">Amazon</option>
              <option value="Flipkart">Flipkart</option>
              <option value="Other Online Portal">Other Online Portal</option>
              <option value="Offline Stores">Offline Stores</option>
              <option value="Others">Others</option>
            </select>
          </FormField>

          {(formData.modeOfPurchase === 'Offline Stores' || formData.modeOfPurchase === 'Others') && (
            <FormField label={formData.modeOfPurchase === 'Offline Stores' ? 'Store Name' : 'Enter Purchase Mode'} required>
              <input type="text" name="storeName" required value={formData.storeName} onChange={handleChange} className="form-input" />
            </FormField>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="Purchase Link" hint="Optional link to item">
            <input type="url" name="purchaseLink" value={formData.purchaseLink} onChange={handleChange} className="form-input" />
          </FormField>
          
          <FormField label="Attachment / Image" hint="Optional reference file">
            <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="form-input" />
          </FormField>
        </div>

        <FormField label="Reason for Purchase" required>
          <textarea name="reason" required value={formData.reason} onChange={handleChange} className="form-input" rows="3"></textarea>
        </FormField>

        <FormField label="Approval Person Email" required hint="Must be @avanamedical.com or @avanasurgical.com">
          <input type="email" name="approvalPersonEmail" required placeholder="manager@avanamedical.com" value={formData.approvalPersonEmail} onChange={handleChange} className="form-input" />
        </FormField>

      </form>
    </div>
  );
}
