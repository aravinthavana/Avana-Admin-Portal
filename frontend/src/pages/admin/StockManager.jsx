import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import {
  helpdeskApi, stationeryApi, housekeepingApi, amcApi, utilityApi, taxApi, adminApi,
  assetTrackerApi, courierApi, pettyCashApi, travelApi, billWarrantyApi, otherStockApi, remindersApi,
} from '../../lib/api';
import {
  Badge, Spinner, EmptyState, Alert, Modal, ConfirmModal,
  FormField, PageHeader, StatCard,
} from '../../components/ui';
import { formatDate, formatDateTime, getStatusBadge, openLegacyPrintReport, CATEGORY_LABELS } from './utils';
import { PrintHeader } from './PrintHeader';

export function StockManager({ title, icon, type = 'stationery', getStock, updateStock, addItem, labelField = 'item_name' }) {
  const toast = useToast();
  const [stock, setStock] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addQtys, setAddQtys] = useState({});
  const [saving, setSaving] = useState({});

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('stationery');
  const [newItemStock, setNewItemStock] = useState('0');
  const [addingItem, setAddingItem] = useState(false);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStock();
      setStock(data || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getStock]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  async function handleUpdate(itemName, operation) {
    const qty = parseInt(addQtys[itemName] || 0, 10);
    if (isNaN(qty) || qty <= 0) { toast.warning('Enter a positive quantity.'); return; }
    setSaving(s => ({ ...s, [itemName]: true }));
    try {
      const modifier = operation === 'add' ? qty : -qty;
      const newQty = Math.max(0, (stock[itemName] || 0) + modifier);
      await updateStock({
        item: itemName,
        quantity: qty,
        transactionType: operation === 'add' ? 'purchase' : 'use'
      });
      setStock(s => ({ ...s, [itemName]: newQty }));
      setAddQtys(q => ({ ...q, [itemName]: '' }));
      toast.success(`${itemName} updated to ${newQty}.`);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSaving(s => ({ ...s, [itemName]: false }));
    }
  }

  async function handleAddItem(e) {
    e.preventDefault();
    if (!newItemName.trim()) { toast.warning('Enter an item name.'); return; }
    setAddingItem(true);
    try {
      if (type === 'stationery') {
        await addItem({ item: newItemName.trim(), type: newItemCategory, initialStock: parseInt(newItemStock, 10) || 0 });
      } else {
        await addItem({ item: newItemName.trim(), initialStock: parseInt(newItemStock, 10) || 0 });
      }
      toast.success(`"${newItemName}" added successfully.`);
      setNewItemName('');
      setNewItemStock('0');
      fetchStock();
    } catch (err) {
      toast.error(err.message || 'Failed to add item');
    } finally {
      setAddingItem(false);
    }
  }

  const handleLegacyPDF = () => {
    const itemsList = Object.entries(stock);
    const lowStockCount = itemsList.filter(([_, q]) => (q || 0) < 5).length;

    openLegacyPrintReport({
      title: `${title} Inventory Stock Report`,
      subtitle: 'Current Inventory Levels',
      docNo: title.toLowerCase().includes('stationery') ? 'AMD-QSP05-02' : null,
      summary: [
        { label: 'Total Catalog Items', value: `${itemsList.length} Items` },
        { label: 'Low Stock Warnings (<5)', value: `${lowStockCount} Items`, color: lowStockCount > 0 ? '#dc2626' : '#16a34a' },
      ],
      headers: [
        { title: '#' },
        { title: 'Item Name' },
        { title: 'Current Stock Level', align: 'right' },
        { title: 'Stock Status' },
      ],
      rows: itemsList.map(([name, qty], idx) => [
        idx + 1,
        name,
        qty || 0,
        qty < 5 ? '⚠️ Low Stock' : '✓ Normal',
      ])
    });
  };

  return (
    <div>
      <PageHeader
        title={`${icon} ${title}`}
        subtitle="Manage current inventory stock levels"
        action={
          <button type="button" className="btn btn--secondary" onClick={handleLegacyPDF}>📄 Download PDF</button>
        }
      />
      <PrintHeader title={`${title} Inventory Report`} subtitle="Current Stock Levels" />
      {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}
      {addItem && (
        <form autoComplete="off" onSubmit={handleAddItem} className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>➕ Add New {type === 'housekeeping' ? 'Housekeeping Item' : 'Item'}:</div>
          <input
            type="text"
            className="form-input"
            placeholder="Item Name (e.g. Gel Pen)"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            style={{ flex: 1, minWidth: '180px' }}
            required
          />
          {type === 'stationery' && (
            <select
              className="form-select"
              value={newItemCategory}
              onChange={e => setNewItemCategory(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="stationery">📦 Stationery Item</option>
              <option value="printing">🖨️ Printing / Form Item</option>
            </select>
          )}
          <input
            type="number"
            className="form-input"
            placeholder="Initial Stock"
            value={newItemStock}
            min="0"
            onChange={e => setNewItemStock(e.target.value)}
            style={{ width: '110px' }}
          />
          <button type="submit" className="btn btn-primary" disabled={addingItem} style={{ background: type === 'housekeeping' ? '#404131' : '#16a34a', borderColor: 'transparent' }}>
            {addingItem ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      )}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
        ) : Object.keys(stock).length === 0 ? (
          <EmptyState icon="📦" title="No stock data" description="Stock data will appear here once initialized." />
        ) : (
          <div className="table-wrapper">
            <table className="table" aria-label={`${title} stock table`}>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Item Name</th>
                  <th scope="col">Current Stock</th>
                  <th scope="col">Adjustment Quantity</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stock).map(([itemName, qty], idx) => (
                  <tr key={itemName}>
                    <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>{itemName}</td>
                    <td>
                      <span style={{
                        fontWeight: 700, fontSize: '1.1rem',
                        color: qty <= 0 ? 'var(--color-error)' : qty <= 5 ? 'var(--color-warning)' : 'var(--color-success)',
                      }}>
                        {qty}
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={addQtys[itemName] || ''}
                        placeholder="e.g. 5"
                        onChange={e => setAddQtys(q => ({ ...q, [itemName]: e.target.value }))}
                        aria-label={`Quantity change for ${itemName}`}
                        style={{ width: 120 }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                          type="button"
                          className="btn btn--sm"
                          style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--color-success-border)' }}
                          onClick={() => handleUpdate(itemName, 'add')}
                          disabled={saving[itemName]}
                          aria-label={`Add to ${itemName} stock`}
                        >
                          {saving[itemName] ? '...' : '+ Add'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--sm"
                          style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', borderColor: 'var(--color-error-border)' }}
                          onClick={() => handleUpdate(itemName, 'use')}
                          disabled={saving[itemName] || qty <= 0}
                          aria-label={`Consume from ${itemName} stock`}
                        >
                          {saving[itemName] ? '...' : '− Consume'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Stationery Audit ────────────────────────────────────── */
