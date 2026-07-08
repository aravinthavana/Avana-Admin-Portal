import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiLogOut, FiCalendar, FiInbox, FiShoppingBag, FiCreditCard, FiActivity,
  FiPlus, FiTrash2, FiCheck, FiX, FiCheckSquare, FiAlertCircle
} from 'react-icons/fi';

const AdminDashboard = () => {
  const { adminToken, logoutAdmin } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('bookings');

  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [rejectId, setRejectId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Helpdesk state
  const [tickets, setTickets] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionText, setResolutionText] = useState('');

  // Inventory state
  const [invType, setInvType] = useState('stationery'); // 'stationery' | 'housekeeping'
  const [stock, setStock] = useState({});
  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState('');
  const [updateItem, setUpdateItem] = useState('');
  const [updateQty, setUpdateQty] = useState('');
  const [txType, setTxType] = useState('purchase'); // 'purchase' | 'use'
  
  // Audits state
  const [auditMonth, setAuditMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [auditData, setAuditData] = useState([]);
  const [overrideItem, setOverrideItem] = useState(null);
  const [overridesForm, setOverridesForm] = useState({ startingStock: '', purchased: '', used: '', endingStock: '' });

  // Billing states
  const [billType, setBillType] = useState('amc'); // 'amc' | 'utility' | 'tax'
  const [amcs, setAmcs] = useState([]);
  const [showAmcModal, setShowAmcModal] = useState(false);
  const [amcForm, setAmcForm] = useState({ equipment_name: '', vendor_name: '', contact_person: '', contact_number: '', contact_email: '', start_date: '', end_date: '', cost: '', remarks: '' });
  const [visitAmcId, setVisitAmcId] = useState(null);
  const [visitForm, setVisitForm] = useState({ visit_date: '', technician_name: '', work_done: '', status: 'Completed' });

  // Utilities & Taxes state
  const [utilities, setUtilities] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [showUtilityModal, setShowUtilityModal] = useState(false);
  const [utilityForm, setUtilityForm] = useState({ utility_type: '', provider_name: '', account_number: '', billing_cycle: '', due_date: '', amount: '', remarks: '' });
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxForm, setTaxForm] = useState({ tax_type: '', authority_name: '', assessment_year: '', due_date: '', amount: '', remarks: '' });

  // Logins state
  const [logins, setLogins] = useState([]);

  useEffect(() => {
    if (!adminToken) {
      navigate('/admin-login');
      return;
    }
    loadData();
  }, [adminToken, activeTab, invType, auditMonth, billType]);

  const loadData = () => {
    if (activeTab === 'bookings') fetchBookings();
    if (activeTab === 'tickets') fetchTickets();
    if (activeTab === 'inventory') {
      fetchStock();
      fetchAudit();
    }
    if (activeTab === 'billing') {
      if (billType === 'amc') fetchAMCs();
      if (billType === 'utility') fetchUtilities();
      if (billType === 'tax') fetchTaxes();
    }
    if (activeTab === 'logins') fetchLogins();
  };

  const getHeaders = () => ({
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  });

  // --- Fetchers ---
  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/admin/bookings', { headers: getHeaders() });
      if (res.ok) setBookings(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/helpdesk', { headers: getHeaders() });
      if (res.ok) {
        const allTickets = await res.json();
        setTickets(allTickets.filter(t => t.category !== 'conference'));
      }
    } catch (e) { console.error(e); }
  };

  const fetchStock = async () => {
    try {
      const res = await fetch(`/api/admin/${invType}-stock`, { headers: getHeaders() });
      if (res.ok) setStock(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAudit = async () => {
    try {
      const res = await fetch(`/api/admin/${invType}-audit?month=${auditMonth}`, { headers: getHeaders() });
      if (res.ok) setAuditData(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAMCs = async () => {
    try {
      const res = await fetch('/api/admin/amc', { headers: getHeaders() });
      if (res.ok) setAmcs(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchUtilities = async () => {
    try {
      const res = await fetch('/api/admin/utility-payments', { headers: getHeaders() });
      if (res.ok) setUtilities(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchTaxes = async () => {
    try {
      const res = await fetch('/api/admin/tax-payments', { headers: getHeaders() });
      if (res.ok) setTaxes(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchLogins = async () => {
    try {
      const res = await fetch('/api/admin/logins', { headers: getHeaders() });
      if (res.ok) setLogins(await res.json());
    } catch (e) { console.error(e); }
  };

  // --- Booking Operations ---
  const handleConfirmBooking = async (id) => {
    try {
      const res = await fetch('/api/helpdesk/status', {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ id, status: 'confirmed', category: 'conference' })
      });
      if (res.ok) {
        alert('Booking confirmed.');
        fetchBookings();
      }
    } catch (e) { console.error(e); }
  };

  const handleRejectBooking = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/helpdesk/status', {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ id: rejectId, status: 'rejected', category: 'conference', rejectionReason })
      });
      if (res.ok) {
        alert('Booking rejected.');
        setRejectId(null);
        setRejectionReason('');
        fetchBookings();
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Delete this booking?')) return;
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) fetchBookings();
    } catch (e) { console.error(e); }
  };

  // --- Ticket Operations ---
  const handleResolveTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/helpdesk/status', {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ id: resolvingId, status: 'completed', resolution: resolutionText })
      });
      if (res.ok) {
        alert('Ticket marked completed.');
        setResolvingId(null);
        setResolutionText('');
        fetchTickets();
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteTicket = async (id) => {
    if (!window.confirm('Delete this ticket?')) return;
    try {
      const res = await fetch(`/api/helpdesk?id=${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) fetchTickets();
    } catch (e) { console.error(e); }
  };

  // --- Inventory Operations ---
  const handleAddInventoryItem = async (e) => {
    e.preventDefault();
    if (!newItem || newQty === '') return;
    try {
      const res = await fetch(`/api/admin/${invType}-stock`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ item: newItem, quantity: parseInt(newQty) })
      });
      if (res.ok) {
        alert('Item initialized.');
        setNewItem('');
        setNewQty('');
        fetchStock();
      }
    } catch (e) { console.error(e); }
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!updateItem || !updateQty) return;
    try {
      const res = await fetch(`/api/admin/${invType}-stock`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ item: updateItem, quantity: parseInt(updateQty), transactionType: txType })
      });
      if (res.ok) {
        alert('Stock updated.');
        setUpdateQty('');
        fetchStock();
        fetchAudit();
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/${invType}-audit/override`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          month: auditMonth,
          item: overrideItem,
          startingStock: parseInt(overridesForm.startingStock) || 0,
          purchased: parseInt(overridesForm.purchased) || 0,
          used: parseInt(overridesForm.used) || 0,
          endingStock: parseInt(overridesForm.endingStock) || 0
        })
      });
      if (res.ok) {
        alert('Audit overrides saved.');
        setOverrideItem(null);
        fetchAudit();
      }
    } catch (e) { console.error(e); }
  };

  // --- AMC / Utility / Tax Operations ---
  const handleSaveAMC = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/amc', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(amcForm)
      });
      if (res.ok) {
        setShowAmcModal(false);
        setAmcForm({ equipment_name: '', vendor_name: '', contact_person: '', contact_number: '', contact_email: '', start_date: '', end_date: '', cost: '', remarks: '' });
        fetchAMCs();
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteAMC = async (id) => {
    if (!window.confirm('Delete contract?')) return;
    try {
      const res = await fetch(`/api/admin/amc/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) fetchAMCs();
    } catch (e) { console.error(e); }
  };

  const handleSaveVisit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/amc/visit', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amcId: visitAmcId, ...visitForm })
      });
      if (res.ok) {
        alert('Visit registered.');
        setVisitAmcId(null);
        setVisitForm({ visit_date: '', technician_name: '', work_done: '', status: 'Completed' });
        fetchAMCs();
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveUtility = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/utility-payments', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(utilityForm)
      });
      if (res.ok) {
        setShowUtilityModal(false);
        setUtilityForm({ utility_type: '', provider_name: '', account_number: '', billing_cycle: '', due_date: '', amount: '', remarks: '' });
        fetchUtilities();
      }
    } catch (e) { console.error(e); }
  };

  const handleUpdateUtilityStatus = async (id, status, ref = 'Paid inline') => {
    try {
      const res = await fetch(`/api/admin/utility-payments/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status, transaction_ref: ref, payment_date: new Date().toISOString().substring(0,10) })
      });
      if (res.ok) fetchUtilities();
    } catch (e) { console.error(e); }
  };

  const handleSaveTax = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/tax-payments', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(taxForm)
      });
      if (res.ok) {
        setShowTaxModal(false);
        setTaxForm({ tax_type: '', authority_name: '', assessment_year: '', due_date: '', amount: '', remarks: '' });
        fetchTaxes();
      }
    } catch (e) { console.error(e); }
  };

  const handleUpdateTaxStatus = async (id, status, ref = 'Paid') => {
    try {
      const res = await fetch(`/api/admin/tax-payments/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status, transaction_ref: ref, payment_date: new Date().toISOString().substring(0,10) })
      });
      if (res.ok) fetchTaxes();
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>
      {/* Sidebar Nav */}
      <aside style={{ width: '260px', background: 'white', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          🛡️ Admin Panel
        </h2>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexGrow: 1 }}>
          {[
            { id: 'bookings', label: 'Bookings List', icon: <FiCalendar /> },
            { id: 'tickets', label: 'Helpdesk Tickets', icon: <FiInbox /> },
            { id: 'inventory', label: 'Inventory Stock', icon: <FiShoppingBag /> },
            { id: 'billing', label: 'Billing & AMC', icon: <FiCreditCard /> },
            { id: 'logins', label: 'Logins Audit', icon: <FiActivity /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '10px', border: 'none',
                fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                textAlign: 'left'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <button 
          onClick={() => { logoutAdmin(); navigate('/admin-login'); }}
          className="btn btn-secondary" 
          style={{ width: '100%', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <FiLogOut /> Logout
        </button>
      </aside>

      {/* Content panel */}
      <main style={{ flexGrow: 1, padding: '2rem 2.5rem', overflowY: 'auto' }}>
        
        {/* TAB 1: Bookings List */}
        {activeTab === 'bookings' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem', textAlign: 'left' }}>Bookings List</h2>
            <div className="glass-panel" style={{ background: 'white', padding: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Hours</th>
                    <th>Requester</th>
                    <th>Details</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td>{b.startDate}</td>
                      <td>{b.bookingType === 'full' ? 'Full Day' : `${b.startTime} - ${b.endTime}`}</td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{b.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{b.phone}</div>
                      </td>
                      <td>{b.reason}</td>
                      <td>
                        <span className={`badge badge-${b.status}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {b.status === 'pending' && (
                            <>
                              <button onClick={() => handleConfirmBooking(b.id)} className="btn btn-primary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}><FiCheck /></button>
                              <button onClick={() => setRejectId(b.id)} className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', color: 'var(--accent-danger)' }}><FiX /></button>
                            </>
                          )}
                          <button onClick={() => handleDeleteBooking(b.id)} className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}><FiTrash2 /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Helpdesk Tickets */}
        {activeTab === 'tickets' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem', textAlign: 'left' }}>Helpdesk Tickets</h2>
            <div className="glass-panel" style={{ background: 'white', padding: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Requester</th>
                    <th>Query Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id}>
                      <td>{t.categoryTitle || t.category}</td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{t.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{t.phone}</div>
                      </td>
                      <td>{t.description || t.exact_issue}</td>
                      <td>
                        <span className={`badge badge-${t.status}`}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {t.status === 'pending' && (
                            <button onClick={() => setResolvingId(t.id)} className="btn btn-primary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}><FiCheckSquare /> Complete</button>
                          )}
                          <button onClick={() => handleDeleteTicket(t.id)} className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}><FiTrash2 /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Inventory Stock */}
        {activeTab === 'inventory' && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Inventory Stock Levels</h2>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="btn" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', background: invType === 'stationery' ? 'var(--primary)' : 'white', color: invType === 'stationery' ? 'white' : 'var(--text-secondary)' }} onClick={() => setInvType('stationery')}>Stationery</button>
                <button className="btn" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', background: invType === 'housekeeping' ? 'var(--primary)' : 'white', color: invType === 'housekeeping' ? 'white' : 'var(--text-secondary)' }} onClick={() => setInvType('housekeeping')}>Housekeeping</button>
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: '2rem' }}>
              {/* Add New Item */}
              <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Initialize New Item</h3>
                <form onSubmit={handleAddInventoryItem}>
                  <div className="form-group">
                    <label>Item Name</label>
                    <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Initial Stock</label>
                    <input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Item</button>
                </form>
              </div>

              {/* Adjust Stock */}
              <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Adjust Stock Level</h3>
                <form onSubmit={handleUpdateStock}>
                  <div className="form-group">
                    <label>Select Item</label>
                    <select value={updateItem} onChange={(e) => setUpdateItem(e.target.value)} required>
                      <option value="">— Select Item —</option>
                      {Object.keys(stock).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Action</label>
                      <select value={txType} onChange={(e) => setTxType(e.target.value)}>
                        <option value="purchase">Purchase (Add)</option>
                        <option value="use">Use (Remove)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Quantity</label>
                      <input type="number" value={updateQty} onChange={(e) => setUpdateQty(e.target.value)} required />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Transaction</button>
                </form>
              </div>
            </div>

            {/* Monthly Audits */}
            <div className="glass-panel" style={{ background: 'white', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Monthly Audit Sheet</h3>
                <input type="month" value={auditMonth} onChange={(e) => setAuditMonth(e.target.value)} style={{ width: '180px', padding: '0.4rem' }} />
              </div>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Starting</th>
                    <th>Purchased</th>
                    <th>Used</th>
                    <th>Ending (Calculated)</th>
                    <th>Actual / Override</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {auditData.map(d => (
                    <tr key={d.item}>
                      <td style={{ fontWeight: '600' }}>{d.item}</td>
                      <td>{d.startingStock}</td>
                      <td>{d.purchased}</td>
                      <td>{d.used}</td>
                      <td>{d.endingStock}</td>
                      <td>
                        {d.isOverridden ? (
                          <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{d.actualEndingStock} (Custom)</span>
                        ) : (
                          <span style={{ color: 'var(--text-light)' }}>Auto</span>
                        )}
                      </td>
                      <td>
                        <button onClick={() => {
                          setOverrideItem(d.item);
                          setOverridesForm({
                            startingStock: d.startingStock,
                            purchased: d.purchased,
                            used: d.used,
                            endingStock: d.actualEndingStock || d.endingStock
                          });
                        }} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px' }}>Override</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Billing & AMC */}
        {activeTab === 'billing' && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Billing & AMC Tracker</h2>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="btn" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', background: billType === 'amc' ? 'var(--primary)' : 'white', color: billType === 'amc' ? 'white' : 'var(--text-secondary)' }} onClick={() => setBillType('amc')}>AMC Contracts</button>
                <button className="btn" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', background: billType === 'utility' ? 'var(--primary)' : 'white', color: billType === 'utility' ? 'white' : 'var(--text-secondary)' }} onClick={() => setBillType('utility')}>Utility Bills</button>
                <button className="btn" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', background: billType === 'tax' ? 'var(--primary)' : 'white', color: billType === 'tax' ? 'white' : 'var(--text-secondary)' }} onClick={() => setBillType('tax')}>Taxes</button>
              </div>
            </div>

            {/* AMC Section */}
            {billType === 'amc' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                  <button className="btn btn-primary" onClick={() => setShowAmcModal(true)}><FiPlus /> New Contract</button>
                </div>
                <div className="glass-panel" style={{ background: 'white', padding: 0 }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Equipment</th>
                        <th>Vendor details</th>
                        <th>Period</th>
                        <th>Cost</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {amcs.map(a => (
                        <tr key={a.id}>
                          <td><strong>{a.equipment_name}</strong></td>
                          <td>
                            <div>{a.vendor_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{a.contact_person} ({a.contact_number})</div>
                          </td>
                          <td>{a.start_date} to {a.end_date}</td>
                          <td>₹{a.cost}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button onClick={() => setVisitAmcId(a.id)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}>Log Visit</button>
                              <button onClick={() => handleDeleteAMC(a.id)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}><FiTrash2 /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Utility payments */}
            {billType === 'utility' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                  <button className="btn btn-primary" onClick={() => setShowUtilityModal(true)}><FiPlus /> Log Utility Bill</button>
                </div>
                <div className="glass-panel" style={{ background: 'white', padding: 0 }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Provider</th>
                        <th>Type</th>
                        <th>Account</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {utilities.map(u => (
                        <tr key={u.id}>
                          <td><strong>{u.provider_name}</strong></td>
                          <td>{u.utility_type}</td>
                          <td>{u.account_number}</td>
                          <td>₹{u.amount}</td>
                          <td>
                            <span className={`badge badge-${u.status}`}>
                              {u.status}
                            </span>
                          </td>
                          <td>
                            {u.status === 'pending' && (
                              <button onClick={() => handleUpdateUtilityStatus(u.id, 'paid')} className="btn btn-primary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}><FiCheck /> Mark Paid</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tax payments */}
            {billType === 'tax' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                  <button className="btn btn-primary" onClick={() => setShowTaxModal(true)}><FiPlus /> Log Tax Bill</button>
                </div>
                <div className="glass-panel" style={{ background: 'white', padding: 0 }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Tax Type</th>
                        <th>Authority</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxes.map(t => (
                        <tr key={t.id}>
                          <td><strong>{t.tax_type}</strong></td>
                          <td>{t.authority_name}</td>
                          <td>{t.due_date}</td>
                          <td>₹{t.amount}</td>
                          <td>
                            <span className={`badge badge-${t.status}`}>
                              {t.status}
                            </span>
                          </td>
                          <td>
                            {t.status === 'pending' && (
                              <button onClick={() => handleUpdateTaxStatus(t.id, 'paid')} className="btn btn-primary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}><FiCheck /> Mark Paid</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Logins Audit */}
        {activeTab === 'logins' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem', textAlign: 'left' }}>Logins Audit</h2>
            <div className="glass-panel" style={{ background: 'white', padding: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>IP Address</th>
                    <th>User Agent</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logins.map(l => (
                    <tr key={l.id}>
                      <td>{l.timestamp}</td>
                      <td><strong>{l.username}</strong></td>
                      <td>{l.ip}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{l.userAgent}</td>
                      <td>
                        <span className={`badge badge-${l.status === 'success' ? 'completed' : 'pending'}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Booking Rejection Reason Modal */}
      {rejectId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Rejection Reason</h3>
              <button className="modal-close" onClick={() => setRejectId(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleRejectBooking}>
                <div className="form-group">
                  <label>Specify Reason *</label>
                  <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'var(--accent-danger)' }}>Confirm Rejection</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Helpdesk Ticket Completion Modal */}
      {resolvingId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Resolve Ticket</h3>
              <button className="modal-close" onClick={() => setResolvingId(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleResolveTicket}>
                <div className="form-group">
                  <label>Resolution Comments *</label>
                  <textarea value={resolutionText} onChange={(e) => setResolutionText(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'var(--accent-success)' }}>Resolve Ticket</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Override Modal */}
      {overrideItem && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Override Audit: {overrideItem}</h3>
              <button className="modal-close" onClick={() => setOverrideItem(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveOverride}>
                <div className="form-group">
                  <label>Starting Stock</label>
                  <input type="number" value={overridesForm.startingStock} onChange={(e) => setOverridesForm({ ...overridesForm, startingStock: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Purchased</label>
                  <input type="number" value={overridesForm.purchased} onChange={(e) => setOverridesForm({ ...overridesForm, purchased: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Used</label>
                  <input type="number" value={overridesForm.used} onChange={(e) => setOverridesForm({ ...overridesForm, used: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Ending Stock (Actual)</label>
                  <input type="number" value={overridesForm.endingStock} onChange={(e) => setOverridesForm({ ...overridesForm, endingStock: e.target.value })} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Override</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add AMC Modal */}
      {showAmcModal && (
        <div className="modal-overlay" onClick={() => setShowAmcModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Log New AMC Contract</h3>
              <button className="modal-close" onClick={() => setShowAmcModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveAMC}>
                <div className="form-group">
                  <label>Equipment Name *</label>
                  <input type="text" value={amcForm.equipment_name} onChange={(e) => setAmcForm({ ...amcForm, equipment_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Vendor Name *</label>
                  <input type="text" value={amcForm.vendor_name} onChange={(e) => setAmcForm({ ...amcForm, vendor_name: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Contact Person *</label>
                    <input type="text" value={amcForm.contact_person} onChange={(e) => setAmcForm({ ...amcForm, contact_person: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Contact No. *</label>
                    <input type="tel" value={amcForm.contact_number} onChange={(e) => setAmcForm({ ...amcForm, contact_number: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Contact Email</label>
                  <input type="email" value={amcForm.contact_email} onChange={(e) => setAmcForm({ ...amcForm, contact_email: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input type="date" value={amcForm.start_date} onChange={(e) => setAmcForm({ ...amcForm, start_date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>End Date *</label>
                    <input type="date" value={amcForm.end_date} onChange={(e) => setAmcForm({ ...amcForm, end_date: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Annual Cost *</label>
                  <input type="number" value={amcForm.cost} onChange={(e) => setAmcForm({ ...amcForm, cost: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Remarks</label>
                  <textarea value={amcForm.remarks} onChange={(e) => setAmcForm({ ...amcForm, remarks: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Contract</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* AMC Visit Modal */}
      {visitAmcId && (
        <div className="modal-overlay" onClick={() => setVisitAmcId(null)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Log AMC Maintenance Visit</h3>
              <button className="modal-close" onClick={() => setVisitAmcId(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveVisit}>
                <div className="form-group">
                  <label>Visit Date *</label>
                  <input type="date" value={visitForm.visit_date} onChange={(e) => setVisitForm({ ...visitForm, visit_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Technician Name *</label>
                  <input type="text" value={visitForm.technician_name} onChange={(e) => setVisitForm({ ...visitForm, technician_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Work Description *</label>
                  <textarea value={visitForm.work_done} onChange={(e) => setVisitForm({ ...visitForm, work_done: e.target.value })} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Submit Logs</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Utility Modal */}
      {showUtilityModal && (
        <div className="modal-overlay" onClick={() => setShowUtilityModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Log Utility Invoice</h3>
              <button className="modal-close" onClick={() => setShowUtilityModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveUtility}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Utility Type *</label>
                    <select value={utilityForm.utility_type} onChange={(e) => setUtilityForm({ ...utilityForm, utility_type: e.target.value })} required>
                      <option value="">— Select Type —</option>
                      <option>Electricity</option>
                      <option>Water</option>
                      <option>Internet / Phone</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Provider Name *</label>
                    <input type="text" value={utilityForm.provider_name} onChange={(e) => setUtilityForm({ ...utilityForm, provider_name: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Account Number *</label>
                    <input type="text" value={utilityForm.account_number} onChange={(e) => setUtilityForm({ ...utilityForm, account_number: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Billing Cycle *</label>
                    <input type="text" value={utilityForm.billing_cycle} placeholder="e.g. June 2026" onChange={(e) => setUtilityForm({ ...utilityForm, billing_cycle: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Due Date *</label>
                    <input type="date" value={utilityForm.due_date} onChange={(e) => setUtilityForm({ ...utilityForm, due_date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Amount *</label>
                    <input type="number" value={utilityForm.amount} onChange={(e) => setUtilityForm({ ...utilityForm, amount: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Remarks</label>
                  <textarea value={utilityForm.remarks} onChange={(e) => setUtilityForm({ ...utilityForm, remarks: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Submit</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Tax Modal */}
      {showTaxModal && (
        <div className="modal-overlay" onClick={() => setShowTaxModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Log Tax Bill</h3>
              <button className="modal-close" onClick={() => setShowTaxModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveTax}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tax Type *</label>
                    <input type="text" value={taxForm.tax_type} placeholder="e.g. Property Tax, Professional Tax" onChange={(e) => setTaxForm({ ...taxForm, tax_type: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Authority Name *</label>
                    <input type="text" value={taxForm.authority_name} onChange={(e) => setTaxForm({ ...taxForm, authority_name: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Assessment Year *</label>
                    <input type="text" value={taxForm.assessment_year} placeholder="e.g. 2026-2027" onChange={(e) => setTaxForm({ ...taxForm, assessment_year: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Due Date *</label>
                    <input type="date" value={taxForm.due_date} onChange={(e) => setTaxForm({ ...taxForm, due_date: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Amount *</label>
                  <input type="number" value={taxForm.amount} onChange={(e) => setTaxForm({ ...taxForm, amount: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Remarks</label>
                  <textarea value={taxForm.remarks} onChange={(e) => setTaxForm({ ...taxForm, remarks: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Submit</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
