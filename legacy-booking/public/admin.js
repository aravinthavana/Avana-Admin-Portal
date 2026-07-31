document.addEventListener('DOMContentLoaded', () => {
  // FRONT-S1: Simple HTML sanitization to prevent XSS
  function sanitize(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
    return str.toString().replace(/[&<>"']/g, m => map[m]);
  }

  // State
  let adminToken = sessionStorage.getItem('adminToken') || null;
  let allBookings = []; // store all loaded bookings
  let filteredBookings = []; // bookings currently visible after filtering

  // DOM Elements
  const loginView = document.getElementById('admin-login-view');
  const dashboardView = document.getElementById('admin-dashboard-view');
  const loginForm = document.getElementById('admin-login-form');
  const passwordInput = document.getElementById('admin-password');
  const logoutBtn = document.getElementById('admin-logout-btn');
  const tableBody = document.getElementById('admin-bookings-table-body');
  const toastContainer = document.getElementById('toast-container');

  // Change Password DOM
  const settingsBtn = document.getElementById('admin-settings-btn');
  const settingsPanel = document.getElementById('admin-settings-panel');
  const changePasswordForm = document.getElementById('admin-change-password-form');

  // Filter & report DOM
  const filterMonthSelect = document.getElementById('filter-month');
  const filterYearSelect = document.getElementById('filter-year');
  const applyFilterBtn = document.getElementById('apply-filter-btn');
  const downloadReportBtn = document.getElementById('download-report-btn');
  const reportSummary = document.getElementById('report-summary');
  const statTotal = document.getElementById('stat-total');
  const statFullday = document.getElementById('stat-fullday');
  const statTimeslot = document.getElementById('stat-timeslot');

  const months = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Initialize view states
  function init() {
    populateYearFilter();
    if (adminToken) {
      showDashboard();
    } else {
      showLogin();
    }
    setupEventListeners();
  }

  // Populate year dropdown with current year ±2
  function populateYearFilter() {
    const currentYear = new Date().getFullYear();
    filterYearSelect.innerHTML = '';
    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      filterYearSelect.appendChild(opt);
    }
  }

  function setupEventListeners() {
    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = passwordInput.value;

      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          adminToken = data.token;
          sessionStorage.setItem('adminToken', adminToken);
          showToast('Authentication successful!', 'success');
          showDashboard();
        } else {
          showToast(data.error || 'Invalid credentials.', 'error');
        }
      } catch (err) {
        console.error('Login error:', err);
        showToast('Server connection failed.', 'error');
      }
    });

    // Forgot Password Link Click
    const forgotLink = document.getElementById('forgot-password-link');
    const loginCard = document.getElementById('admin-login-view');
    const forgotCard = document.getElementById('admin-forgot-password-view');
    const forgotReqForm = document.getElementById('forgot-request-form');
    const forgotVerifyForm = document.getElementById('forgot-verify-form');

    if (forgotLink) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginCard.style.display = 'none';
        forgotCard.style.display = 'block';
        forgotReqForm.style.display = 'block';
        forgotVerifyForm.style.display = 'none';
        document.getElementById('forgot-email').value = '';
      });
    }

    window.showLoginFromForgot = function() {
      forgotCard.style.display = 'none';
      loginCard.style.display = 'block';
      document.getElementById('forgot-email').value = '';
      document.getElementById('forgot-otp').value = '';
      document.getElementById('forgot-new-password').value = '';
    };

    // Forgot Request Form Submit
    if (forgotReqForm) {
      forgotReqForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value.trim();
        const submitBtn = forgotReqForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        try {
          const res = await fetch('/api/admin/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast('Verification code sent!', 'success');
            forgotReqForm.style.display = 'none';
            forgotVerifyForm.style.display = 'block';
            document.getElementById('forgot-otp').value = '';
            document.getElementById('forgot-new-password').value = '';
          } else {
            showToast(data.error || 'Failed to request reset.', 'error');
          }
        } catch (err) {
          showToast('Connection failed.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Verification Code';
        }
      });
    }

    // Forgot Verify Form Submit
    if (forgotVerifyForm) {
      forgotVerifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const otp = document.getElementById('forgot-otp').value.trim();
        const newPassword = document.getElementById('forgot-new-password').value;
        const submitBtn = forgotVerifyForm.querySelector('button[type="submit"]');

        if (newPassword.length < 6) {
          showToast('Password must be at least 6 characters.', 'error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Resetting...';

        try {
          const res = await fetch('/api/admin/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp, newPassword })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast('🔑 Password reset successfully!', 'success');
            showLoginFromForgot();
          } else {
            showToast(data.error || 'Reset failed.', 'error');
          }
        } catch (err) {
          showToast('Connection failed.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Reset Password';
        }
      });
    }

    // Logout click
    logoutBtn.addEventListener('click', async () => {
      if (adminToken) {
        try {
          await fetch('/api/admin/logout', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
          });
        } catch(e) {}
      }
      adminToken = null;
      sessionStorage.removeItem('adminToken');
      if (settingsPanel) settingsPanel.style.display = 'none';
      showToast('Logged out successfully.', 'success');
      showLogin();
    });

    // Toggle settings panel
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        if (settingsPanel.style.display === 'none') {
          settingsPanel.style.display = 'block';
          document.getElementById('admin-curr-pass').value = '';
          document.getElementById('admin-new-pass').value = '';
        } else {
          settingsPanel.style.display = 'none';
        }
      });
    }

    // Save settings (change password)
    if (changePasswordForm) {
      changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('admin-curr-pass').value;
        const newPassword = document.getElementById('admin-new-pass').value;

        if (!adminToken) return;

        try {
          const res = await fetch('/api/admin/change-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast('Password changed successfully!', 'success');
            settingsPanel.style.display = 'none';
          } else {
            showToast(data.error || 'Failed to change password.', 'error');
          }
        } catch (err) {
          showToast('Server connection failed.', 'error');
        }
      });
    }

    // Apply filter
    applyFilterBtn.addEventListener('click', () => {
      applyFilter();
    });

    // Download CSV report
    downloadReportBtn.addEventListener('click', () => {
      downloadCSVReport();
    });
  }

  // Toggle to login view
  function showLogin() {
    loginView.style.display = 'block';
    dashboardView.style.display = 'none';
    passwordInput.value = '';
  }

  // Toggle to dashboard view and fetch bookings
  async function showDashboard() {
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';
    await fetchBookings();
  }

  // Fetch all detailed bookings from API
  async function fetchBookings() {
    tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-secondary);">⏳ Loading reservations...</td></tr>`;
    try {
      const response = await fetch('/api/admin/bookings', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (response.ok) {
        allBookings = await response.json();
        // Auto-set year filter based on bookings if available
        if (allBookings.length > 0) {
          const years = [...new Set(allBookings.map(b => {
            const d = b.startDate || b.date;
            return d ? d.substring(0, 4) : null;
          }).filter(Boolean))].sort();
          const currentYear = new Date().getFullYear().toString();
          filterYearSelect.innerHTML = '';
          years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (y === currentYear) opt.selected = true;
            filterYearSelect.appendChild(opt);
          });
          // Add current year if not in bookings
          if (!years.includes(currentYear)) {
            const opt = document.createElement('option');
            opt.value = currentYear;
            opt.textContent = currentYear;
            opt.selected = true;
            filterYearSelect.appendChild(opt);
          }
        }
        applyFilter();
      } else if (response.status === 401) {
        showToast('Session expired. Please log in again.', 'error');
        adminToken = null;
        sessionStorage.removeItem('adminToken');
        showLogin();
      } else {
        showToast('Failed to fetch detailed reservations list.', 'error');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Could not load reservations from server.', 'error');
    }
  }

  // Apply month/year filter to allBookings
  function applyFilter() {
    const selectedMonth = parseInt(filterMonthSelect.value); // 0 = all
    const selectedYear = parseInt(filterYearSelect.value);

    filteredBookings = allBookings.filter(b => {
      const dateStr = b.startDate || b.date || '';
      if (!dateStr) return false;
      const [bYear, bMonth] = dateStr.split('-').map(Number);
      const yearMatch = bYear === selectedYear;
      const monthMatch = selectedMonth === 0 || bMonth === selectedMonth;
      return yearMatch && monthMatch;
    });

    updateSummaryStats(filteredBookings, selectedMonth, selectedYear);
    renderBookingsTable(filteredBookings);
  }

  // Update summary stats cards
  function updateSummaryStats(bookings, month, year) {
    const total = bookings.length;
    const fullDay = bookings.filter(b => b.bookingType === 'full').length;
    const timeSlot = bookings.filter(b => b.bookingType === 'time').length;

    statTotal.textContent = total;
    statFullday.textContent = fullDay;
    statTimeslot.textContent = timeSlot;

    const monthLabel = month === 0 ? `Year ${year}` : `${months[month]} ${year}`;
    document.querySelector('.report-summary').title = `Stats for ${monthLabel}`;
    reportSummary.style.display = 'flex';
  }

  // Render bookings in table rows
  function renderBookingsTable(bookings) {
    tableBody.innerHTML = '';

    if (bookings.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
            No reservations found for the selected period.
          </td>
        </tr>
      `;
      downloadReportBtn.disabled = true;
      downloadReportBtn.style.opacity = '0.5';
      downloadReportBtn.style.cursor = 'not-allowed';
      return;
    } else {
      downloadReportBtn.disabled = false;
      downloadReportBtn.style.opacity = '1';
      downloadReportBtn.style.cursor = 'pointer';
    }

    bookings.forEach((b, index) => {
      const tr = document.createElement('tr');

      // Row number
      const numCell = document.createElement('td');
      numCell.textContent = index + 1;
      numCell.style.color = 'var(--text-secondary)';
      numCell.style.fontSize = '0.85rem';
      tr.appendChild(numCell);

      // Date / Range
      const dateCell = document.createElement('td');
      dateCell.style.fontWeight = '600';
      const startDate = b.startDate || b.date;
      const endDate = b.endDate || b.date;
      if (startDate === endDate) {
        dateCell.textContent = formatDate(startDate);
      } else {
        dateCell.innerHTML = `<span>${formatDate(startDate)}</span><br><span style="color:var(--text-secondary);font-size:0.85rem;">to ${formatDate(endDate)}</span>`;
      }
      tr.appendChild(dateCell);

      // Time Format
      const timeCell = document.createElement('td');
      const typeBadge = document.createElement('span');
      typeBadge.className = `badge badge-type ${b.bookingType}`;
      typeBadge.textContent = b.bookingType === 'full' ? 'Full Day' : `${b.startTime} - ${b.endTime}`;
      timeCell.appendChild(typeBadge);
      tr.appendChild(timeCell);

      // User name
      const nameCell = document.createElement('td');
      nameCell.textContent = b.name;
      tr.appendChild(nameCell);

      // Contact Info
      const contactCell = document.createElement('td');
      contactCell.innerHTML = `
        <div style="font-size: 0.9rem;">📧 ${sanitize(b.email)}</div>
        <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.2rem;">📞 ${sanitize(b.phone)}</div>
      `;
      tr.appendChild(contactCell);

      // Reason
      const reasonCell = document.createElement('td');
      reasonCell.textContent = b.reason;
      reasonCell.style.maxWidth = '160px';
      reasonCell.style.whiteSpace = 'pre-wrap';
      tr.appendChild(reasonCell);

      // Attendees
      const attendeesCell = document.createElement('td');
      attendeesCell.style.maxWidth = '160px';
      attendeesCell.style.whiteSpace = 'pre-wrap';
      attendeesCell.style.fontSize = '0.9rem';
      attendeesCell.textContent = b.attendees || '—';
      tr.appendChild(attendeesCell);

      // Remarks
      const remarksCell = document.createElement('td');
      remarksCell.style.fontSize = '0.9rem';
      remarksCell.style.color = b.remarks ? 'var(--text-primary)' : 'var(--text-secondary)';
      remarksCell.textContent = b.remarks || 'None';
      tr.appendChild(remarksCell);

      // Food specifications
      const foodCell = document.createElement('td');
      if (b.food === 'none') {
        foodCell.innerHTML = `<span style="color: var(--text-secondary); font-size: 0.9rem;">None</span>`;
      } else {
        const foodName = b.food === 'others' ? b.foodSpecify : b.food;
        foodCell.innerHTML = `
          <span class="badge badge-food">${sanitize(foodName)}</span>
          <span style="font-size: 0.9rem; margin-left: 0.5rem; color: var(--text-secondary);">x${b.foodCount}</span>
        `;
      }
      tr.appendChild(foodCell);

      // Delete Action Button
      const actionCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.textContent = 'Cancel';
      deleteBtn.addEventListener('click', () => handleDeleteBooking(b.id, b.name, b.startDate || b.date));
      actionCell.appendChild(deleteBtn);
      tr.appendChild(actionCell);

      tableBody.appendChild(tr);
    });
  }

  // Handle Deleting Booking
  async function handleDeleteBooking(id, name, date) {
    if (!confirm(`Are you sure you want to cancel the booking for ${name} on ${formatDate(date)}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/bookings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (response.ok) {
        showToast('Reservation deleted successfully.', 'success');
        await fetchBookings();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to delete reservation.', 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Connection error, deletion failed.', 'error');
    }
  }

  // ─── Download CSV Report ───────────────────────────────────────────────────
  function downloadCSVReport() {
    if (filteredBookings.length === 0) {
      showToast('No bookings to export for the selected period.', 'error');
      return;
    }

    const selectedMonth = parseInt(filterMonthSelect.value);
    const selectedYear = parseInt(filterYearSelect.value);
    const monthLabel = selectedMonth === 0 ? 'All' : months[selectedMonth];
    const reportTitle = `Avana Conference Room Bookings - ${monthLabel} ${selectedYear}`;

    // CSV Header
    const headers = [
      'S.No',
      'Start Date',
      'End Date',
      'Booking Type',
      'Time',
      'Booked By',
      'Email',
      'Phone',
      'Reason',
      'Attendees',
      'Remarks',
      'Food Arrangement',
      'Food Count',
      'Booked On'
    ];

    const rows = filteredBookings.map((b, i) => {
      const startDate = b.startDate || b.date;
      const endDate = b.endDate || b.date;
      const timeText = b.bookingType === 'full' ? 'Full Day' : `${b.startTime} - ${b.endTime}`;
      const foodName = b.food === 'none' ? 'None' : (b.food === 'others' ? b.foodSpecify : b.food);
      const foodCount = b.food === 'none' ? '' : b.foodCount;
      const bookedOn = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

      return [
        i + 1,
        formatDate(startDate),
        formatDate(endDate),
        b.bookingType === 'full' ? 'Full Day' : 'Time Slot',
        timeText,
        b.name,
        b.email,
        b.phone,
        b.reason,
        b.attendees || '',
        b.remarks || '',
        foodName,
        foodCount,
        bookedOn
      ].map(val => `"${String(val || '').replace(/"/g, '""')}"`);
    });

    // Build CSV content with BOM for Excel UTF-8 support
    const BOM = '\uFEFF';
    const summaryLines = [
      `"${reportTitle}"`,
      `"Generated On:","${new Date().toLocaleString('en-IN')}"`,
      `"Total Bookings:","${filteredBookings.length}"`,
      `"Full Day Bookings:","${filteredBookings.filter(b => b.bookingType === 'full').length}"`,
      `"Time Slot Bookings:","${filteredBookings.filter(b => b.bookingType === 'time').length}"`,
      '',
    ];

    const csvContent = BOM +
      summaryLines.join('\n') + '\n' +
      headers.map(h => `"${h}"`).join(',') + '\n' +
      rows.map(r => r.join(',')).join('\n');

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Avana_Bookings_${monthLabel}_${selectedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Report downloaded: ${filteredBookings.length} booking(s) exported.`, 'success');
  }

  // Format Date from "YYYY-MM-DD" to human readable "26 Jun 2026"
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Show Toast Message
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('active');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('active');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4000);
  }

  // Start initialization
  init();
});
