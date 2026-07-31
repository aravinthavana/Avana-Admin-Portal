/**
 * Avana Portal API Client
 * Centralizes all fetch calls to the backend Express API.
 * Automatically attaches Authorization headers where needed.
 */

const BASE = '/api';

function getToken(role = 'employee') {
  if (role === 'admin') return localStorage.getItem('avana_admin_token');
  return localStorage.getItem('avana_employee_token');
}

async function request(path, options = {}, role = 'employee') {
  const token = getToken(role);
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errBody;
    try { errBody = await response.json(); } catch { errBody = {}; }
    const msg = errBody.error || errBody.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  // 204 No Content
  if (response.status === 204) return null;
  return response.json();
}

// ─── Employee Auth ───────────────────────────────────────────
export const employeeApi = {
  sendOtp: (email) =>
    request('/employee/send-otp', { method: 'POST', body: JSON.stringify({ email }) }),

  verifyOtp: (email, otp) =>
    request('/employee/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),

  loginPassword: (email, password) =>
    request('/employee/login-password', { method: 'POST', body: JSON.stringify({ email, password }) }),

  setPassword: (newPassword, token) =>
    request('/employee/set-password', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ newPassword }),
    }),

  getRequests: () =>
    request('/employee/requests', {}, 'employee'),

  getStationeryItems: () =>
    request('/employee/stationery-items', {}, 'employee'),
};

// ─── Admin Auth ──────────────────────────────────────────────
export const adminApi = {
  login: (password) =>
    request('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),

  logout: () =>
    request('/admin/logout', { method: 'DELETE' }, 'admin'),

  changePassword: (currentPassword, newPassword) =>
    request('/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }, 'admin'),

  getLogins: () =>
    request('/admin/logins', {}, 'admin'),
};

// ─── Bookings ────────────────────────────────────────────────
export const bookingsApi = {
  submit: (data) =>
    request('/bookings', { method: 'POST', body: JSON.stringify(data) }),

  getAll: () =>
    request('/admin/bookings', {}, 'admin'),

  delete: (id) =>
    request(`/admin/bookings/${id}`, { method: 'DELETE' }, 'admin'),
};

// ─── Helpdesk ────────────────────────────────────────────────
export const helpdeskApi = {
  submit: (data) =>
    request('/helpdesk', { method: 'POST', body: JSON.stringify(data) }),

  getAll: () =>
    request('/helpdesk', {}, 'admin'),

  updateStatus: (id, status, resolution, category, rejectionReason, approvalRemarks) =>
    request(`/helpdesk/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolution, category, rejectionReason, approvalRemarks }),
    }, 'admin'),

  delete: (id) =>
    request(`/helpdesk/${id}`, { method: 'DELETE' }, 'admin'),
};

// ─── Inventory — Stationery ──────────────────────────────────
export const stationeryApi = {
  getStock: () =>
    request('/admin/stationery-stock', {}, 'admin'),

  updateStock: (data) =>
    request('/admin/stationery-stock', {
      method: 'POST', body: JSON.stringify(data),
    }, 'admin'),

  getAudit: (month) =>
    request(`/admin/stationery-audit?month=${month}`, {}, 'admin'),

  overrideAudit: (data) =>
    request('/admin/stationery-audit/override', {
      method: 'POST', body: JSON.stringify(data),
    }, 'admin'),

  addItem: (data) =>
    request('/admin/stationery-items', {
      method: 'POST', body: JSON.stringify(data),
    }, 'admin'),
};

// ─── Inventory — Housekeeping ────────────────────────────────
export const housekeepingApi = {
  getStock: () =>
    request('/admin/housekeeping-stock', {}, 'admin'),

  updateStock: (data) =>
    request('/admin/housekeeping-stock', {
      method: 'POST', body: JSON.stringify(data),
    }, 'admin'),

  getAudit: (month) =>
    request(`/admin/housekeeping-audit?month=${month}`, {}, 'admin'),

  overrideAudit: (data) =>
    request('/admin/housekeeping-audit/override', {
      method: 'POST', body: JSON.stringify(data),
    }, 'admin'),

  addItem: (data) =>
    request('/admin/housekeeping-items', {
      method: 'POST', body: JSON.stringify(data),
    }, 'admin'),
};

// ─── AMC ─────────────────────────────────────────────────────
export const amcApi = {
  getAll: () =>
    request('/admin/amc', {}, 'admin'),

  save: (data) =>
    request('/admin/amc', { method: 'POST', body: JSON.stringify(data) }, 'admin'),

  delete: (id) =>
    request(`/admin/amc/${id}`, { method: 'DELETE' }, 'admin'),

  saveVisit: (data) =>
    request('/admin/amc/visit', { method: 'POST', body: JSON.stringify(data) }, 'admin'),
};

// ─── Utility Payments ────────────────────────────────────────
export const utilityApi = {
  getAll: () =>
    request('/admin/utility-payments', {}, 'admin'),

  save: (data) =>
    request('/admin/utility-payments', { method: 'POST', body: JSON.stringify(data) }, 'admin'),

  update: (id, data) =>
    request(`/admin/utility-payments/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    }, 'admin'),

  delete: (id) =>
    request(`/admin/utility-payments/${id}`, { method: 'DELETE' }, 'admin'),
};

// ─── Tax Payments ────────────────────────────────────────────
export const taxApi = {
  getAll: () =>
    request('/admin/tax-payments', {}, 'admin'),

  save: (data) =>
    request('/admin/tax-payments', { method: 'POST', body: JSON.stringify(data) }, 'admin'),

  update: (id, data) =>
    request(`/admin/tax-payments/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    }, 'admin'),

  delete: (id) =>
    request(`/admin/tax-payments/${id}`, { method: 'DELETE' }, 'admin'),
};

// ─── Asset Tracker ───────────────────────────────────────────
export const assetTrackerApi = {
  getAll: () =>
    request('/admin/assets', {}, 'admin'),

  create: (data) =>
    request('/admin/assets', { method: 'POST', body: JSON.stringify(data) }, 'admin'),

  remind: (id) =>
    request('/admin/assets/remind', { method: 'POST', body: JSON.stringify({ id }) }, 'admin'),

  append: (id, assets, sendEmail = true) =>
    request('/admin/assets/append', { method: 'POST', body: JSON.stringify({ id, assets, sendEmail }) }, 'admin'),

  returnAssets: (id, itemIds, remarks) =>
    request('/admin/assets/return', { method: 'POST', body: JSON.stringify({ id, itemIds, remarks }) }, 'admin'),

  delete: (id) =>
    request(`/admin/assets/${id}`, { method: 'DELETE' }, 'admin'),

  getAckDetails: (id) =>
    request(`/assets/acknowledgement/${id}`, {}),

  submitAck: (id, signature, remarks) =>
    request(`/assets/acknowledgement/${id}`, { method: 'POST', body: JSON.stringify({ signature, remarks }) }),
};

// ─── Courier Dispatches & Delivery Challans ─────────────────
export const courierApi = {
  getAll: () =>
    request('/admin/courier-dispatches', {}, 'admin'),

  getById: (id) =>
    request(`/admin/courier-dispatches/${id}`, {}, 'admin'),

  create: (data) =>
    request('/admin/courier-dispatches', { method: 'POST', body: JSON.stringify(data) }, 'admin'),

  updateTracking: (id, data) =>
    request(`/admin/courier-dispatches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, 'admin'),

  merge: (parentDispatchId, items, remarks) =>
    request('/admin/courier-dispatches/merge', { method: 'POST', body: JSON.stringify({ parentDispatchId, items, remarks }) }, 'admin'),

  delete: (id) =>
    request(`/admin/courier-dispatches/${id}`, { method: 'DELETE' }, 'admin'),
};

// ─── Petty Cash / Cash Handling Ledger ─────────────────────
export const pettyCashApi = {
  getAll: (month) =>
    request(`/admin/cash-handling${month ? `?month=${month}` : ''}`, {}, 'admin'),

  create: (data) =>
    request('/admin/cash-handling', { method: 'POST', body: JSON.stringify(data) }, 'admin'),

  update: (id, data) =>
    request(`/admin/cash-handling/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, 'admin'),

  clear: (id, clearAmount, remarks) =>
    request(`/admin/cash-handling/${id}`, { method: 'PATCH', body: JSON.stringify({ clearAmount, remarks, cleared: true, clearedDate: new Date().toISOString().slice(0,10) }) }, 'admin'),

  delete: (id) =>
    request(`/admin/cash-handling/${id}`, { method: 'DELETE' }, 'admin'),
};

// ─── Travel Expenses & Fuel Records ────────────────────────
export const travelApi = {
  getAll: (month) =>
    request(`/admin/travel-expenses${month ? `?month=${month}` : ''}`, {}, 'admin'),

  create: (data) =>
    request('/admin/travel-expenses', { method: 'POST', body: JSON.stringify(data) }, 'admin'),

  update: (id, data) =>
    request(`/admin/travel-expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, 'admin'),

  delete: (id) =>
    request(`/admin/travel-expenses/${id}`, { method: 'DELETE' }, 'admin'),
};

// ─── Bills & Warranty Register ─────────────────────────────
export const billWarrantyApi = {
  getAll: (month) =>
    request(`/admin/bill-warranty${month ? `?month=${month}` : ''}`, {}, 'admin'),

  create: (data) =>
    request('/admin/bill-warranty', { method: 'POST', body: JSON.stringify(data) }, 'admin'),

  update: (id, data) =>
    request(`/admin/bill-warranty/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, 'admin'),

  delete: (id) =>
    request(`/admin/bill-warranty/${id}`, { method: 'DELETE' }, 'admin'),
};

// ─── Other Stock Items Catalog ─────────────────────────────
export const otherStockApi = {
  getAll: () =>
    request('/admin/other-stock', {}, 'admin'),

  save: (data) =>
    request('/admin/other-stock', { method: 'POST', body: JSON.stringify(data) }, 'admin'),

  useStock: (stockId, subtitleId, qtyToUse, usedBy, remarks) =>
    request('/admin/other-stock/use', { method: 'POST', body: JSON.stringify({ stockId, subtitleId, qtyToUse, usedBy, remarks }) }, 'admin'),

  delete: (id) =>
    request(`/admin/other-stock/${id}`, { method: 'DELETE' }, 'admin'),
};

// ─── Renewal Reminders & Deadline Audit ────────────────────
export const remindersApi = {
  getAll: () =>
    request('/admin/reminders', {}, 'admin'),

  create: (data) =>
    request('/admin/reminders', { method: 'POST', body: JSON.stringify(data) }, 'admin'),

  triggerScan: () =>
    request('/admin/reminders/trigger', { method: 'POST' }, 'admin'),

  delete: (id) =>
    request(`/admin/reminders/${id}`, { method: 'DELETE' }, 'admin'),
};







