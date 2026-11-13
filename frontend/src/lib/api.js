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

async function downloadBlobFromApi(path, defaultFilename, role = 'employee') {
  const token = getToken(role);
  const response = await fetch(`${BASE}${path}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    let err;
    try { err = await response.json(); } catch { err = {}; }
    throw new Error(err.error || `Download failed (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = defaultFilename || 'document.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
}

async function openBlobFromApi(path, role = 'employee') {
  const token = getToken(role);
  const response = await fetch(`${BASE}${path}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    let err;
    try { err = await response.json(); } catch { err = {}; }
    throw new Error(err.error || `Preview failed (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
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

  cancelBooking: (id) =>
    request(`/employee/bookings/${id}/cancel`, { method: 'POST' }, 'employee'),

  getDispatchesByDate: (date) =>
    request(`/employee/courier-dispatch/by-date?date=${date}`, {}, 'employee'),

  createMergeRequest: (targetDispatchId, items, requesterEmail, requesterName) =>
    request('/employee/courier-dispatch/merge-request', {
      method: 'POST',
      body: JSON.stringify({ targetDispatchId, items, requesterEmail, requesterName })
    }, 'employee'),

  getStationeryItems: () =>
    request('/employee/stationery-items', {}, 'employee'),

  createCourierDispatch: (data) =>
    request('/employee/courier-dispatch', { method: 'POST', body: JSON.stringify(data) }, 'employee'),
  updateCourierDispatch: (id, data) =>
    request(`/employee/courier-dispatch/${id}`, { method: 'PUT', body: JSON.stringify(data) }, 'employee'),
  deleteCourierDispatch: (id) =>
    request(`/employee/courier-dispatch/${id}`, { method: 'DELETE' }, 'employee'),

  getAllCourierDispatches: () =>
    request('/employee/courier-dispatch/all', {}, 'employee'),

  // Address Book
  getAddressBook: () =>
    request('/employee/address-book', {}, 'employee'),

  saveAddress: (data) =>
    request('/employee/address-book', { method: 'POST', body: JSON.stringify(data) }, 'employee'),

  updateAddress: (id, data) =>
    request(`/employee/address-book/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, 'employee'),

  deleteAddress: (id) =>
    request(`/employee/address-book/${id}`, { method: 'DELETE' }, 'employee'),

  // Shipping Label — returns a PDF blob
  generateShippingLabel: async (from, to, recipientEmail, isFragile) => {
    const token = localStorage.getItem('avana_employee_token');
    const response = await fetch('/api/employee/shipping-label', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ from, to, recipientEmail, isFragile }),
    });
    if (!response.ok) {
      let err;
      try { err = await response.json(); } catch { err = {}; }
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    return response.blob(); // returns PDF blob
  },

  downloadDCPdf: (id, dcNo) =>
    downloadBlobFromApi(`/employee/courier-dispatch/${id}/pdf`, `DC_Copy_${dcNo || id}.pdf`, 'employee'),
  downloadAddressLabelPdf: (id, dcNo) =>
    downloadBlobFromApi(`/employee/courier-dispatch/${id}/label`, `Address_Label_${dcNo || id}.pdf`, 'employee'),
  viewDCPdf: (id) =>
    openBlobFromApi(`/employee/courier-dispatch/${id}/pdf`, 'employee'),
  viewAddressLabelPdf: (id) =>
    openBlobFromApi(`/employee/courier-dispatch/${id}/label`, 'employee'),
};

// ─── Admin Auth ──────────────────────────────────────────────
export const adminApi = {
  login: (password) =>
    request('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),

  logout: () =>
    request('/admin/logout', { method: 'DELETE' }, 'admin'),

  changePassword: (oldPassword, newPassword) =>
    request('/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    }, 'admin'),

  getLogins: () =>
    request('/admin/logins', {}, 'admin'),

  getAuditLogs: () =>
    request('/admin/audit-logs', {}, 'admin'),
};

export const globalAddressApi = {
  getAll: () => request('/admin/global-addresses', {}, 'admin'),
  save: (data) => request('/admin/global-addresses', { method: 'POST', body: JSON.stringify(data) }, 'admin'),
  update: (id, data) => request(`/admin/global-addresses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, 'admin'),
  delete: (id) => request(`/admin/global-addresses/${id}`, { method: 'DELETE' }, 'admin'),
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

  updateStatus: (id, status, resolution, category, rejectionReason, approvalRemarks, fulfilledItems, unfulfilledItems) =>
    request(`/helpdesk/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolution, category, rejectionReason, approvalRemarks, fulfilledItems, unfulfilledItems }),
    }, 'admin'),

  delete: (id) =>
    request(`/helpdesk/${id}`, { method: 'DELETE' }, 'admin'),
};

// ─── Inventory — Stationery ──────────────────────────────────
export const printingApi = {
  getStock: () => request('/admin/printing-stock', {}, 'admin'),
  updateStock: (data) => request('/admin/printing-stock', { method: 'POST', body: JSON.stringify(data) }, 'admin'),
  addItem: (data) => request('/admin/stationery-items', { method: 'POST', body: JSON.stringify(data) }, 'admin'),
  deleteItem: (itemName) => request(`/admin/stationery-items/${encodeURIComponent(itemName)}`, { method: 'DELETE' }, 'admin'),
};

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

  deleteItem: (itemName) =>
    request(`/admin/stationery-items/${encodeURIComponent(itemName)}`, { method: 'DELETE' }, 'admin'),
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

  deleteItem: (itemName) =>
    request(`/admin/housekeeping-items/${encodeURIComponent(itemName)}`, { method: 'DELETE' }, 'admin'),
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

  deleteConnection: (utility_type, provider_name, account_number) =>
    request(`/admin/utility-connections?utility_type=${encodeURIComponent(utility_type)}&provider_name=${encodeURIComponent(provider_name)}&account_number=${encodeURIComponent(account_number)}`, { method: 'DELETE' }, 'admin'),

  uploadBill: (formData) =>
    apiFetch('/admin/utility-payments/upload-bill', {
      method: 'POST',
      body: formData,
      isFormData: true,
    }, 'admin'),
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

  returnAssets: (id, items, remarks) =>
    request('/admin/assets/return', { method: 'POST', body: JSON.stringify({ id, items, remarks }) }, 'admin'),

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

  updateTracking: (id, data) => {
    const isFormData = data instanceof FormData;
    return apiFetch(`/admin/courier-dispatches/${id}`, {
      method: 'PATCH',
      body: isFormData ? data : JSON.stringify(data),
      isFormData
    }, 'admin');
  },

  merge: (parentDispatchId, items, remarks) =>
    request('/admin/courier-dispatches/merge', { method: 'POST', body: JSON.stringify({ parentDispatchId, items, remarks }) }, 'admin'),

  delete: (id) =>
    request(`/admin/courier-dispatches/${id}`, { method: 'DELETE' }, 'admin'),

  downloadDCPdf: (id, dcNo) =>
    downloadBlobFromApi(`/admin/courier-dispatches/${id}/pdf`, `DC_Copy_${dcNo || id}.pdf`, 'admin'),
  downloadAddressLabelPdf: (id, dcNo) =>
    downloadBlobFromApi(`/admin/courier-dispatches/${id}/label`, `Address_Label_${dcNo || id}.pdf`, 'admin'),
  viewDCPdf: (id) =>
    openBlobFromApi(`/admin/courier-dispatches/${id}/pdf`, 'admin'),
  viewAddressLabelPdf: (id) =>
    openBlobFromApi(`/admin/courier-dispatches/${id}/label`, 'admin'),
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

  updateUsage: (stockId, usageId, qty, remarks) =>
    request(`/admin/other-stock/${stockId}/usage/${usageId}`, { method: 'PUT', body: JSON.stringify({ qty, remarks }) }, 'admin'),

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

export const purchaseApi = {
  getAll: () =>
    request('/purchase', {}, 'admin'),

  create: (data) =>
    request('/purchase', { method: 'POST', body: JSON.stringify(data) }, 'admin'),

  markPurchased: (id, data) =>
    request(`/purchase/${id}/purchased`, { method: 'POST', body: JSON.stringify(data) }, 'admin'),
};

// ─── Office Locations ──────────────────────────────────────
export const locationsApi = {
  getLocations: () =>
    request('/locations'),

  createLocation: (name) =>
    request('/admin/locations', { method: 'POST', body: JSON.stringify({ name }) }, 'admin'),

  deleteLocation: (id) =>
    request(`/admin/locations/${id}`, { method: 'DELETE' }, 'admin'),
};

// ─── User Management ───────────────────────────────────────
export const userManagementApi = {
  getUsers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.department && params.department !== 'all') query.set('department', params.department);
    if (params.role && params.role !== 'all') query.set('role', params.role);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    const qs = query.toString();
    return request(`/admin/users${qs ? `?${qs}` : ''}`, {}, 'admin');
  },
  getUserById: (id) =>
    request(`/admin/users/${id}`, {}, 'admin'),
  createUser: (data) =>
    request('/admin/users', { method: 'POST', body: JSON.stringify(data) }, 'admin'),
  updateUser: (id, data) =>
    request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }, 'admin'),
  toggleStatus: (id, status) =>
    request(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, 'admin'),
  resetPassword: (id, password) =>
    request(`/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }, 'admin'),
  deleteUser: (id) =>
    request(`/admin/users/${id}`, { method: 'DELETE' }, 'admin'),
};









export const apiFetch = async (path, options = {}, role = 'admin') => {
  const token = getToken(role);
  const headers = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  if (!options.isFormData) {
    headers['Content-Type'] = 'application/json';
  }

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

  return response.json();
};
