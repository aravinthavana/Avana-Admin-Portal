import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiLogOut, FiCalendar, FiEdit, FiTrash2, FiActivity, FiKey, FiLock,
  FiShoppingBag, FiTruck, FiTool, FiCheck, FiFolder, FiPrinter, FiUser
} from 'react-icons/fi';

const CATEGORIES = [
  {
    id: 'conference',
    title: 'Conference Room Booking',
    icon: '📅',
    desc: 'Book the conference room or view the current schedule',
    accent: '#4f46e5',
    iconBg: '#eef2ff',
    link: '/booking'
  },
  {
    id: 'stationery',
    title: 'Stationery Request',
    icon: '✏️',
    desc: 'Request office stationery and printing materials',
    accent: '#10b981',
    iconBg: '#d1fae5',
  },
  {
    id: 'hk_material',
    title: 'Housekeeping Material Request',
    icon: '🧴',
    desc: 'Request housekeeping and cleaning supplies',
    accent: '#0891b2',
    iconBg: '#e0f7fa',
    restrictTo: ['bhuvaneshravi@avanamedical.com']
  },
  {
    id: 'admin_support',
    title: 'Admin Support',
    icon: '🤝',
    desc: 'Get help with general administrative tasks',
    accent: '#0ea5e9',
    iconBg: '#e0f2fe',
  },
  {
    id: 'maintenance',
    title: 'Maintenance Complaint',
    icon: '🛠️',
    desc: 'Report AC, electrical, plumbing or furniture issues',
    accent: '#ef4444',
    iconBg: '#fee2e2',
  },
  {
    id: 'housekeeping',
    title: 'Housekeeping Request',
    icon: '🧹',
    desc: 'Request cleaning, pantry, or waste removal services',
    accent: '#f59e0b',
    iconBg: '#fef3c7',
  },
  {
    id: 'office_asset',
    title: 'Office Asset Request',
    icon: '💼',
    desc: 'Request furniture, equipment or asset replacement',
    accent: '#06b6d4',
    iconBg: '#cffafe',
  },
  {
    id: 'print_scan',
    title: 'Printing & Scanning',
    icon: '🖨️',
    desc: 'Submit bulk print, scan, or binding/lamination requests',
    accent: '#8b5cf6',
    iconBg: '#ede9fe',
  }
];

const HK_MATERIAL_ITEMS = [
  'Colin', 'Exo', 'Floor Broom', 'Garbage Bag Large', 'Garbage Bag Small',
  'Harpic', 'Hit Spray', 'J-son Tissue Box', 'Floor Cleaning Liquid',
  'Mop', 'Naphthaline / Freshener', 'Odonil Air Freshener Blocks Mix Pack',
  'Room Spray', 'Scrubber', 'Toilet Tissue Roll', 'Dishwash Liquid',
  'Waste Cloth', 'Phenol', 'Floor Wiper', 'EC Mop',
  'Handwash Tissue Roll', 'Handwash Liquid', 'Other'
];

const FLOOR_OPTIONS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', 'Other'];

const EmployeeDashboard = () => {
  const { employee, employeeToken, logoutEmployee } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [activeModal, setActiveModal] = useState(null);

  // Form states
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [floor, setFloor] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [exactIssue, setExactIssue] = useState('');
  const [remarks, setRemarks] = useState('');
  
  // Custom multi-select stationery cart
  const [stationeryType, setStationeryType] = useState('printing'); // 'printing' | 'stationery'
  const [stationeryCatalog, setStationeryCatalog] = useState({});
  const [selectedStationery, setSelectedStationery] = useState([]);
  const [stationerySearch, setStationerySearch] = useState('');
  const [stationeryOpen, setStationeryOpen] = useState(false);

  // Housekeeping materials cart
  const [selectedHkItems, setSelectedHkItems] = useState([]);
  const [hkSearch, setHkSearch] = useState('');
  const [hkOpen, setHkOpen] = useState(false);

  // Password set states
  const [newPassword, setNewPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Global submit loading
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (!employeeToken) {
      navigate('/');
    } else {
      loadRequests();
      loadStationeryCatalog();
    }
  }, [employeeToken]);

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/employee/requests', {
        headers: { 'Authorization': `Bearer ${employeeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadStationeryCatalog = async () => {
    try {
      const res = await fetch('/api/employee/stationery-items');
      if (res.ok) {
        const data = await res.json();
        setStationeryCatalog(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    setPassLoading(true);
    try {
      const res = await fetch('/api/employee/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${employeeToken}`
        },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('🔑 Password saved successfully! You can now log in using this password.');
        setNewPassword('');
      } else {
        alert(`🚨 Failed to save password: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      alert('🚨 Connection failed.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setFloor('');
    setSubcategory('');
    setExactIssue('');
    setRemarks('');
    setSelectedStationery([]);
    setSelectedHkItems([]);
    setStationerySearch('');
    setHkSearch('');
    setStationeryOpen(false);
    setHkOpen(false);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!requesterName || !requesterPhone) {
      alert('Please fill in Name and Phone.');
      return;
    }

    setSubmitLoading(true);
    let payload = {
      category: activeModal.id,
      requester_name: requesterName,
      requester_phone: requesterPhone,
      requester_email: employee,
      location_dept: floor,
      remarks
    };

    if (activeModal.id === 'stationery') {
      if (selectedStationery.length === 0) {
        alert('Please select at least one stationery item.');
        setSubmitLoading(false);
        return;
      }
      payload.items = JSON.stringify(selectedStationery);
    } else if (activeModal.id === 'hk_material') {
      if (selectedHkItems.length === 0) {
        alert('Please select at least one housekeeping item.');
        setSubmitLoading(false);
        return;
      }
      payload.items = JSON.stringify(selectedHkItems);
    } else {
      payload.subcategory = subcategory;
      payload.issue_desc = exactIssue;
    }

    try {
      const res = await fetch('/api/helpdesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        alert('✅ Request submitted successfully.');
        handleCloseModal();
        loadRequests();
      } else {
        alert(`🚨 Failed: ${data.error || 'Server error.'}`);
      }
    } catch (err) {
      alert('🚨 Server connection failed.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'pending') return r.category !== 'conference' && (!r.status || r.status === 'pending');
    if (filter === 'completed') return r.category !== 'conference' && r.status === 'completed';
    return true;
  });

  const getFilteredStationery = () => {
    return Object.keys(stationeryCatalog).filter(item => {
      const isPrinting = stationeryCatalog[item] === 'printing';
      const matchType = stationeryType === 'printing' ? isPrinting : !isPrinting;
      const matchSearch = item.toLowerCase().includes(stationerySearch.toLowerCase());
      return matchType && matchSearch;
    }).sort();
  };

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Header Banner */}
      <header style={{
        background: 'linear-gradient(135deg, hsl(224, 71%, 15%) 0%, hsl(243, 75%, 45%) 100%)',
        color: 'white',
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* User Badging */}
        <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="glass-panel" style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            padding: '0.45rem 1rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: 'none'
          }}>
            <FiUser /> {employee}
            <button 
              onClick={() => { logoutEmployee(); navigate('/'); }} 
              style={{
                background: 'rgba(239,68,68,0.2)',
                color: '#fca5a5',
                border: '1px solid rgba(239,68,68,0.4)',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-0.03em' }}>Admin Help Desk</h1>
        <p style={{ margin: 0, opacity: 0.8, fontSize: '1rem', fontWeight: '400' }}>Select a category below to submit your request</p>
      </header>

      {/* Main Categories Grid */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem 0' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1.5rem', textAlign: 'left' }}>
          Available Services
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          {CATEGORIES.map(cat => {
            if (cat.restrictTo && !cat.restrictTo.includes(employee)) return null;
            return (
              <div 
                key={cat.id} 
                className="glass-panel" 
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  padding: '1.8rem 1.5rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem',
                  borderTop: `4px solid ${cat.accent}`
                }}
                onClick={() => cat.link ? navigate(cat.link) : setActiveModal(cat)}
              >
                <div style={{
                  width: '48px', height: '48px',
                  borderRadius: '12px',
                  background: cat.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  {cat.icon}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{cat.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>{cat.desc}</p>
                <div style={{ color: cat.accent, fontWeight: '600', fontSize: '0.8rem', marginTop: 'auto' }}>
                  {cat.link ? 'Book Conference Room →' : 'Submit Request →'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Requests Tracker */}
        <section style={{ marginTop: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              📋 Your Service Requests
            </h2>
            
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {['all', 'pending', 'completed'].map(tab => (
                <button 
                  key={tab}
                  className="btn"
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    background: filter === tab ? 'var(--primary)' : 'white',
                    color: filter === tab ? 'white' : 'var(--text-secondary)',
                    border: filter === tab ? 'none' : '1px solid var(--border-color)',
                    boxShadow: 'none'
                  }}
                  onClick={() => setFilter(tab)}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ background: 'white', overflow: 'hidden', padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              {filteredRequests.length === 0 ? (
                <div style={{ padding: '3rem', color: 'var(--text-light)', fontSize: '0.95rem' }}>
                  No requests found in this category.
                </div>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Category</th>
                      <th>Details / Issue</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => (
                      <tr key={req.id}>
                        <td style={{ fontWeight: '600', color: 'var(--primary)' }}>
                          #{req.id.substring(0, 8)}
                        </td>
                        <td>{req.categoryTitle || req.category}</td>
                        <td style={{ maxWidth: '350px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {req.details || req.description || req.exact_issue || 'N/A'}
                        </td>
                        <td>
                          <span className={`badge badge-${req.status || 'pending'}`}>
                            {req.status || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

        {/* Set Direct Password Panel */}
        <section style={{ marginTop: '3rem', textAlign: 'left' }}>
          <div className="glass-panel" style={{ background: 'white', padding: '2rem', maxWidth: '460px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🔑 Set Account Password
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Set a password so you can sign in directly next time without waiting for verification emails.
            </p>
            <form onSubmit={handleSetPassword} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }} className="form-group" style={{ marginBottom: 0 }}>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters" 
                  required 
                  style={{ padding: '0.65rem 0.85rem', fontSize: '0.9rem' }}
                />
              </div>
              <button type="submit" disabled={passLoading} className="btn btn-primary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}>
                {passLoading ? 'Saving...' : 'Save'}
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Dynamic Request Modals */}
      {activeModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{activeModal.icon}</span>
                <h3 style={{ color: 'var(--text-primary)' }}>{activeModal.title}</h3>
              </div>
              <button className="modal-close" onClick={handleCloseModal}>&times;</button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleSubmitRequest}>
                {/* Specific form fields depending on category ID */}
                
                {/* 1. Maintenance */}
                {activeModal.id === 'maintenance' && (
                  <>
                    <div className="form-group">
                      <label>Issue Type *</label>
                      <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} required>
                        <option value="">— Select Issue —</option>
                        <option>AC not working</option>
                        <option>Light / Fan issue</option>
                        <option>Electrical problem</option>
                        <option>Plumbing issue</option>
                        <option>Furniture repair</option>
                        <option>Office equipment issue</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Which Floor *</label>
                      <select value={floor} onChange={(e) => setFloor(e.target.value)} required>
                        <option value="">— Select Floor —</option>
                        {FLOOR_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Exact Issue *</label>
                      <textarea value={exactIssue} onChange={(e) => setExactIssue(e.target.value)} placeholder="Describe the problem in detail..." required />
                    </div>
                  </>
                )}

                {/* 2. Housekeeping Services */}
                {activeModal.id === 'housekeeping' && (
                  <>
                    <div className="form-group">
                      <label>Request Type *</label>
                      <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} required>
                        <option value="">— Select Type —</option>
                        <option>Cleaning request</option>
                        <option>Waste removal</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Which Floor *</label>
                      <select value={floor} onChange={(e) => setFloor(e.target.value)} required>
                        <option value="">— Select Floor —</option>
                        {FLOOR_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Exact Query *</label>
                      <textarea value={exactIssue} onChange={(e) => setExactIssue(e.target.value)} placeholder="Describe your request in detail..." required />
                    </div>
                  </>
                )}

                {/* 3. Office Asset Request */}
                {activeModal.id === 'office_asset' && (
                  <>
                    <div className="form-group">
                      <label>Request Type *</label>
                      <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} required>
                        <option value="">— Select Type —</option>
                        <option>Chair / Table requirement</option>
                        <option>New equipment request</option>
                        <option>Replacement request</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Which Floor *</label>
                      <select value={floor} onChange={(e) => setFloor(e.target.value)} required>
                        <option value="">— Select Floor —</option>
                        {FLOOR_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Exact Query *</label>
                      <textarea value={exactIssue} onChange={(e) => setExactIssue(e.target.value)} placeholder="Describe the asset needed..." required />
                    </div>
                  </>
                )}

                {/* 4. Printing & Scanning */}
                {activeModal.id === 'print_scan' && (
                  <>
                    <div className="form-group">
                      <label>Service Type *</label>
                      <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} required>
                        <option value="">— Select Service —</option>
                        <option>Bulk printing</option>
                        <option>Scanning</option>
                        <option>Binding / Lamination</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Exact Query *</label>
                      <textarea value={exactIssue} onChange={(e) => setExactIssue(e.target.value)} placeholder="Describe your requirement (quantity, paper size, etc.)..." required />
                    </div>
                  </>
                )}

                {/* 5. Admin Support */}
                {activeModal.id === 'admin_support' && (
                  <>
                    <div className="form-group">
                      <label>Support Type *</label>
                      <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} required>
                        <option value="">— Select Support Type —</option>
                        <option>Safety Concern Reporting</option>
                        <option>Pantry / Refreshment Request</option>
                        <option>Courier / Dispatch Request</option>
                        <option>Event / Celebration Support Request</option>
                        <option>Lost & Found Report</option>
                        <option>Feedback / Suggestions</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Which Floor *</label>
                      <select value={floor} onChange={(e) => setFloor(e.target.value)} required>
                        <option value="">— Select Floor —</option>
                        {FLOOR_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Description *</label>
                      <textarea value={exactIssue} onChange={(e) => setExactIssue(e.target.value)} rows={4} placeholder="Describe your request or issue in detail..." required />
                    </div>
                  </>
                )}

                {/* 6. Stationery Request */}
                {activeModal.id === 'stationery' && (
                  <>
                    <div className="form-group">
                      <label>Request Category *</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          type="button" 
                          className="btn"
                          style={{
                            flex: 1, padding: '0.5rem', fontSize: '0.85rem',
                            background: stationeryType === 'printing' ? 'var(--primary)' : 'hsl(220, 10%, 95%)',
                            color: stationeryType === 'printing' ? 'white' : 'var(--text-secondary)'
                          }}
                          onClick={() => setStationeryType('printing')}
                        >
                          🖨️ Printing Items
                        </button>
                        <button 
                          type="button" 
                          className="btn"
                          style={{
                            flex: 1, padding: '0.5rem', fontSize: '0.85rem',
                            background: stationeryType === 'stationery' ? 'var(--primary)' : 'hsl(220, 10%, 95%)',
                            color: stationeryType === 'stationery' ? 'white' : 'var(--text-secondary)'
                          }}
                          onClick={() => setStationeryType('stationery')}
                        >
                          📦 Stationery Items
                        </button>
                      </div>
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                      <label>Select & Search Items *</label>
                      <div 
                        onClick={() => setStationeryOpen(!stationeryOpen)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '0.75rem 1rem', border: '1.5px solid var(--border-color)',
                          borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '0.95rem'
                        }}
                      >
                        <span style={{ color: selectedStationery.length ? 'var(--text-primary)' : 'var(--text-light)' }}>
                          {selectedStationery.length ? `${selectedStationery.length} item(s) selected` : '— Select Items —'}
                        </span>
                        <span>▼</span>
                      </div>
                      
                      {stationeryOpen && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0,
                          background: 'white', border: '1.5px solid var(--border-color)',
                          borderRadius: '8px', zIndex: 100, padding: '0.5rem', marginTop: '4px',
                          boxShadow: 'var(--shadow-md)'
                        }}>
                          <input 
                            type="text" 
                            value={stationerySearch} 
                            onChange={(e) => setStationerySearch(e.target.value)}
                            placeholder="🔍 Search items..." 
                            style={{ padding: '0.45rem', marginBottom: '0.5rem', fontSize: '0.85rem' }} 
                          />
                          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {getFilteredStationery().map(item => {
                              const isChecked = selectedStationery.some(it => it.item === item);
                              return (
                                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedStationery([...selectedStationery, { item, quantity: 1 }]);
                                      } else {
                                        setSelectedStationery(selectedStationery.filter(it => it.item !== item));
                                      }
                                    }}
                                  />
                                  {item}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selected Stationery Cart list */}
                    {selectedStationery.length > 0 && (
                      <div className="form-group" style={{ background: 'hsl(220, 10%, 98%)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <label>Selected Items</label>
                        <table style={{ width: '100%', fontSize: '0.85rem' }}>
                          <tbody>
                            {selectedStationery.map((cartItem, idx) => (
                              <tr key={cartItem.item} style={{ borderBottom: '1px solid hsl(220, 10%, 94%)' }}>
                                <td style={{ padding: '0.4rem 0', fontWeight: '600' }}>{cartItem.item}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <button type="button" onClick={() => {
                                    const next = [...selectedStationery];
                                    next[idx].quantity = Math.max(1, next[idx].quantity - 1);
                                    setSelectedStationery(next);
                                  }} style={{ padding: '2px 6px', border: 'none', background: '#e2e8f0', borderRadius: '4px' }}>-</button>
                                  <span style={{ fontWeight: '700', padding: '0 0.5rem' }}>{cartItem.quantity}</span>
                                  <button type="button" onClick={() => {
                                    const next = [...selectedStationery];
                                    next[idx].quantity += 1;
                                    setSelectedStationery(next);
                                  }} style={{ padding: '2px 6px', border: 'none', background: '#e2e8f0', borderRadius: '4px' }}>+</button>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button type="button" onClick={() => setSelectedStationery(selectedStationery.filter(it => it.item !== cartItem.item))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>❌</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    <div className="form-group">
                      <label>Which Floor *</label>
                      <select value={floor} onChange={(e) => setFloor(e.target.value)} required>
                        <option value="">— Select Floor —</option>
                        {FLOOR_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* 7. Housekeeping Materials */}
                {activeModal.id === 'hk_material' && (
                  <>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label>Select Housekeeping Materials *</label>
                      <div 
                        onClick={() => setHkOpen(!hkOpen)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '0.75rem 1rem', border: '1.5px solid var(--border-color)',
                          borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '0.95rem'
                        }}
                      >
                        <span style={{ color: selectedHkItems.length ? 'var(--text-primary)' : 'var(--text-light)' }}>
                          {selectedHkItems.length ? `${selectedHkItems.length} item(s) selected` : '— Select Items —'}
                        </span>
                        <span>▼</span>
                      </div>
                      
                      {hkOpen && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0,
                          background: 'white', border: '1.5px solid var(--border-color)',
                          borderRadius: '8px', zIndex: 100, padding: '0.5rem', marginTop: '4px',
                          boxShadow: 'var(--shadow-md)'
                        }}>
                          <input 
                            type="text" 
                            value={hkSearch} 
                            onChange={(e) => setHkSearch(e.target.value)}
                            placeholder="🔍 Search items..." 
                            style={{ padding: '0.45rem', marginBottom: '0.5rem', fontSize: '0.85rem' }} 
                          />
                          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {HK_MATERIAL_ITEMS.filter(it => it.toLowerCase().includes(hkSearch.toLowerCase())).map(item => {
                              const isChecked = selectedHkItems.some(it => it.item === item);
                              return (
                                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedHkItems([...selectedHkItems, { item, quantity: 1 }]);
                                      } else {
                                        setSelectedHkItems(selectedHkItems.filter(it => it.item !== item));
                                      }
                                    }}
                                  />
                                  {item}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selected Housekeeping Materials Cart list */}
                    {selectedHkItems.length > 0 && (
                      <div className="form-group" style={{ background: 'hsl(220, 10%, 98%)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <label>Selected Materials</label>
                        <table style={{ width: '100%', fontSize: '0.85rem' }}>
                          <tbody>
                            {selectedHkItems.map((cartItem, idx) => (
                              <tr key={cartItem.item} style={{ borderBottom: '1px solid hsl(220, 10%, 94%)' }}>
                                <td style={{ padding: '0.4rem 0', fontWeight: '600' }}>{cartItem.item}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <button type="button" onClick={() => {
                                    const next = [...selectedHkItems];
                                    next[idx].quantity = Math.max(1, next[idx].quantity - 1);
                                    setSelectedHkItems(next);
                                  }} style={{ padding: '2px 6px', border: 'none', background: '#e2e8f0', borderRadius: '4px' }}>-</button>
                                  <span style={{ fontWeight: '700', padding: '0 0.5rem' }}>{cartItem.quantity}</span>
                                  <button type="button" onClick={() => {
                                    const next = [...selectedHkItems];
                                    next[idx].quantity += 1;
                                    setSelectedHkItems(next);
                                  }} style={{ padding: '2px 6px', border: 'none', background: '#e2e8f0', borderRadius: '4px' }}>+</button>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button type="button" onClick={() => setSelectedHkItems(selectedHkItems.filter(it => it.item !== cartItem.item))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>❌</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    <div className="form-group">
                      <label>Which Floor *</label>
                      <select value={floor} onChange={(e) => setFloor(e.target.value)} required>
                        <option value="">— Select Floor —</option>
                        {FLOOR_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>Remarks</label>
                  <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any additional comments..." />
                </div>

                <hr style={{ border: 'none', borderTop: '1px dashed var(--border-color)', margin: '1.25rem 0' }} />
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Your Name *</label>
                    <input type="text" value={requesterName} onChange={(e) => setRequesterName(e.target.value)} placeholder="Full Name" required />
                  </div>
                  <div className="form-group">
                    <label>Phone No. *</label>
                    <input type="tel" value={requesterPhone} onChange={(e) => setRequesterPhone(e.target.value)} placeholder="Phone Number" required />
                  </div>
                </div>

                <button type="submit" disabled={submitLoading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  {submitLoading ? 'Submitting Request...' : 'Submit Request'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
