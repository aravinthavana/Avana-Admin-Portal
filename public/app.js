document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentDate = new Date();
  let bookings = [];

  // FRONT-S1: Simple HTML sanitization to prevent XSS
  function sanitize(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
    return str.toString().replace(/[&<>"']/g, m => map[m]);
  }

  // DOM Elements
  const prevMonthBtn = document.getElementById('prev-month-btn');
  const nextMonthBtn = document.getElementById('next-month-btn');
  const monthYearDisplay = document.getElementById('month-year-display');
  const calendarGrid = document.getElementById('calendar-grid');
  
  // Modal Elements
  const bookingModal = document.getElementById('booking-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelBookingBtn = document.getElementById('cancel-booking-btn');
  const bookingForm = document.getElementById('booking-form');
  const bookingStartDateInput = document.getElementById('booking-start-date');
  const bookingEndDateInput = document.getElementById('booking-end-date');
  const fullDayCheckbox = document.getElementById('booking-full-day');
  const timeInputsRow = document.getElementById('time-inputs-row');
  const startTimeInput = document.getElementById('booking-start-time');
  const endTimeInput = document.getElementById('booking-end-time');
  const foodSelect = document.getElementById('booking-food');
  const foodSpecifyGroup = document.getElementById('food-specify-group');
  const foodSpecifyInput = document.getElementById('booking-food-specify');
  const foodCountGroup = document.getElementById('food-count-group');
  const foodCountInput = document.getElementById('booking-food-count');
  const attendeesList = document.getElementById('attendees-list');
  const addAttendeeBtn = document.getElementById('add-attendee-btn');

  // Toast container
  const toastContainer = document.getElementById('toast-container');

  // Month Names
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function selectDateAndShowTimings(dateStr) {
    const selectedDisplay = document.getElementById('selected-date-display');
    const badge = document.getElementById('slot-count-badge');
    const listContainer = document.getElementById('booked-slots-list');
    const modalExistingBox = document.getElementById('modal-existing-bookings-box');
    const modalExistingList = document.getElementById('modal-existing-bookings-list');

    if (selectedDisplay) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const formattedDate = new Date(dateStr).toLocaleDateString(undefined, options);
      selectedDisplay.textContent = formattedDate;
    }

    // Filter bookings for this date
    const dayBookings = bookings.filter(b => {
      const start = b.startDate || b.date;
      const end = b.endDate || b.date;
      return dateStr >= start && dateStr <= end;
    });

    if (badge) badge.textContent = `${dayBookings.length} Booking${dayBookings.length === 1 ? '' : 's'}`;

    if (listContainer) {
      if (dayBookings.length === 0) {
        listContainer.innerHTML = `
          <div style="padding: 1.5rem; text-align: center; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; color: #065f46; font-weight: 600;">
            ✨ No bookings scheduled for this date. The conference room is available all day!
          </div>
        `;
      } else {
        listContainer.innerHTML = dayBookings.map(b => {
          const timeText = b.bookingType === 'full' ? '🌟 Full Day Booking (09:00 AM - 06:00 PM)' : `⏰ ${formatTimeAmPm(b.startTime)} to ${formatTimeAmPm(b.endTime)}`;
          return `
            <div style="padding: 1.2rem 1.5rem; background: #ffffff; border: 1px solid var(--border); border-left: 4px solid #ef4444; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.8rem;">
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: var(--text); margin-bottom: 0.2rem;">${timeText}</div>
                <div style="font-size: 0.88rem; color: var(--muted); font-weight: 500;">📌 Reason: <strong style="color: var(--text);">${sanitize(b.reason) || 'Reserved'}</strong> | Booked by: ${sanitize(b.name) || 'Employee'}</div>
              </div>
              <span style="background: #fee2e2; color: #dc2626; padding: 0.3rem 0.8rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700;">Confirmed / Booked</span>
            </div>
          `;
        }).join('');
      }
    }

    if (modalExistingBox && modalExistingList) {
      if (dayBookings.length === 0) {
        modalExistingBox.style.display = 'none';
        modalExistingList.innerHTML = '';
      } else {
        modalExistingBox.style.display = 'block';
        modalExistingList.innerHTML = dayBookings.map(b => {
          const timeText = b.bookingType === 'full' ? '🌟 Full Day Booking (09:00 AM - 06:00 PM)' : `⏰ ${formatTimeAmPm(b.startTime)} to ${formatTimeAmPm(b.endTime)}`;
          return `<div>• ${timeText} (${sanitize(b.reason) || 'Reserved'})</div>`;
        }).join('');
      }
    }
  }

  function formatTimeAmPm(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  // Initialize
  async function init() {
    await fetchBookings();
    renderCalendar();
    selectDateAndShowTimings(new Date().toISOString().slice(0,10));
    setupEventListeners();
  }

  // Fetch bookings from API
  async function fetchBookings() {
    calendarGrid.innerHTML = '<div style="grid-column: span 7; text-align: center; padding: 2rem; color: var(--text-secondary);">⏳ Loading reservations...</div>';
    try {
      const response = await fetch('/api/bookings');
      if (response.ok) {
        bookings = await response.json();
      } else {
        showToast('Failed to load bookings database', 'error');
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      showToast('Error communicating with booking server', 'error');
    }
  }

  // Render Calendar Grid
  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Set Month Year Display Text
    monthYearDisplay.textContent = `${months[month]} ${year}`;

    // Clear Grid
    calendarGrid.innerHTML = '';

    // Add Day Headers (Sun, Mon, Tue, etc.)
    dayNames.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header';
      dayHeader.textContent = day;
      calendarGrid.appendChild(dayHeader);
    });

    // Get First Day of Month and Total Days in Month
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Render Empty Days before first day of month
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'calendar-day empty';
      calendarGrid.appendChild(emptyDay);
    }

    // Operational business hours (9:00 AM to 6:00 PM = 9 hours = 540 minutes)
    const totalOpMinutes = 9 * 60;

    // Render Calendar Days
    for (let day = 1; day <= totalDays; day++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayBookings = bookings.filter(b => {
        const start = b.startDate || b.date;
        const end = b.endDate || b.date;
        return dayStr >= start && dayStr <= end;
      });

      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day';
      dayCell.dataset.date = dayStr;

      const dayNumSpan = document.createElement('span');
      dayNumSpan.className = 'day-number';
      dayNumSpan.textContent = day;
      dayCell.appendChild(dayNumSpan);

      // Determine color status code
      let status = 'available'; // Default
      let statusText = 'Available';

      const hasFullDay = dayBookings.some(b => b.bookingType === 'full');
      
      if (hasFullDay) {
        status = 'booked';
        statusText = 'Fully Booked';
      } else if (dayBookings.length > 0) {
        // Calculate total booked minutes
        let bookedMinutes = 0;
        dayBookings.forEach(b => {
          if (b.startTime && b.endTime) {
            const [sh, sm] = b.startTime.split(':').map(Number);
            const [eh, em] = b.endTime.split(':').map(Number);
            bookedMinutes += (eh * 60 + em) - (sh * 60 + sm);
          }
        });

        if (bookedMinutes >= totalOpMinutes) {
          status = 'booked';
          statusText = 'Fully Booked';
        } else {
          status = 'partially';
          statusText = `${dayBookings.length} booking${dayBookings.length > 1 ? 's' : ''}`;
        }
      }

      dayCell.classList.add(`status-${status}`);

      const infoSpan = document.createElement('span');
      infoSpan.className = 'day-info';
      infoSpan.textContent = statusText;
      dayCell.appendChild(infoSpan);

      // Accessibility attributes
      dayCell.setAttribute('role', 'button');
      dayCell.setAttribute('tabindex', '0');
      dayCell.setAttribute('aria-label', `${dayStr}, ${statusText}`);

      // Day Click Action
      dayCell.addEventListener('click', () => {
        selectDateAndShowTimings(dayStr);
        if (status !== 'booked') {
          openBookingModal(dayStr);
        } else {
          showToast('This day is fully booked! Check timings below.', 'error');
        }
      });

      // Keyboard support
      dayCell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dayCell.click();
        }
      });

      calendarGrid.appendChild(dayCell);
    }

    // FRONT-UX6: Disable past month navigation
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth())) {
      prevMonthBtn.disabled = true;
      prevMonthBtn.style.opacity = '0.5';
      prevMonthBtn.style.cursor = 'not-allowed';
    } else {
      prevMonthBtn.disabled = false;
      prevMonthBtn.style.opacity = '1';
      prevMonthBtn.style.cursor = 'pointer';
    }
  }

  // ─── Attendee Rows ────────────────────────────────────────────────
  function addAttendeeRow(value = '') {
    const row = document.createElement('div');
    row.className = 'attendee-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'attendee-input';
    input.placeholder = 'Enter attendee name...';
    input.value = value;
    input.autocomplete = 'off';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-attendee';
    removeBtn.title = 'Remove';
    removeBtn.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    removeBtn.addEventListener('click', () => {
      if (attendeesList.querySelectorAll('.attendee-row').length > 1) {
        row.remove();
        updateRemoveButtons();
      } else {
        showToast('At least one attendee name is required.', 'error');
      }
    });

    row.appendChild(input);
    row.appendChild(removeBtn);
    attendeesList.appendChild(row);
    updateRemoveButtons();
    input.focus();
    return row;
  }

  function updateRemoveButtons() {
    const rows = attendeesList.querySelectorAll('.attendee-row');
    rows.forEach((row, i) => {
      const btn = row.querySelector('.btn-remove-attendee');
      // Hide remove button when only one row left
      btn.style.opacity = rows.length === 1 ? '0.3' : '1';
      btn.style.pointerEvents = rows.length === 1 ? 'none' : 'auto';
    });
  }

  function resetAttendeeList() {
    attendeesList.innerHTML = '';
    addAttendeeRow('');
  }

  function getAttendeeNames() {
    const inputs = attendeesList.querySelectorAll('.attendee-input');
    return Array.from(inputs)
      .map(i => i.value.trim())
      .filter(v => v.length > 0);
  }

  // Open booking form modal
  function openBookingModal(dateStr) {
    bookingForm.reset();
    bookingStartDateInput.value = dateStr;
    bookingEndDateInput.value = dateStr;
    resetAttendeeList();

    const savedEmail = sessionStorage.getItem('employeeOutlookEmail');
    const emailInput = document.getElementById('booking-email');
    if (emailInput && savedEmail) {
      emailInput.value = savedEmail;
      emailInput.readOnly = true;
    }

    // Set min dates to prevent past date selections
    const todayStr = new Date().toISOString().split('T')[0];
    bookingStartDateInput.setAttribute('min', todayStr);
    bookingEndDateInput.setAttribute('min', dateStr);
    
    // Reset conditional inputs visibility
    foodSpecifyGroup.style.display = 'none';
    foodSpecifyInput.removeAttribute('required');
    foodCountGroup.style.display = 'none';
    
    // Enable time inputs
    timeInputsRow.style.opacity = '1';
    startTimeInput.removeAttribute('disabled');
    endTimeInput.removeAttribute('disabled');
    startTimeInput.setAttribute('required', 'true');
    endTimeInput.setAttribute('required', 'true');
    
    bookingModal.classList.add('active');
  }

  // Close booking form modal
  function closeBookingModal() {
    bookingModal.classList.remove('active');
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Navigation
    prevMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
    });

    // Close Modal triggers
    closeModalBtn.addEventListener('click', closeBookingModal);
    cancelBookingBtn.addEventListener('click', closeBookingModal);
    
    bookingModal.addEventListener('click', (e) => {
      if (e.target === bookingModal) {
        closeBookingModal();
      }
    });

    // Full day toggle handler
    fullDayCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        timeInputsRow.style.opacity = '0.5';
        startTimeInput.setAttribute('disabled', 'true');
        endTimeInput.setAttribute('disabled', 'true');
        startTimeInput.removeAttribute('required');
        endTimeInput.removeAttribute('required');
      } else {
        timeInputsRow.style.opacity = '1';
        startTimeInput.removeAttribute('disabled');
        endTimeInput.removeAttribute('disabled');
        startTimeInput.setAttribute('required', 'true');
        endTimeInput.setAttribute('required', 'true');
      }
    });

    // Food dropdown change handler
    foodSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'none') {
        foodSpecifyGroup.style.display = 'none';
        foodSpecifyInput.removeAttribute('required');
        foodCountGroup.style.display = 'none';
      } else if (val === 'others') {
        foodSpecifyGroup.style.display = 'block';
        foodSpecifyInput.setAttribute('required', 'true');
        foodCountGroup.style.display = 'block';
      } else {
        foodSpecifyGroup.style.display = 'none';
        foodSpecifyInput.removeAttribute('required');
        foodCountGroup.style.display = 'block';
      }
    });

    // Start date change handler to update min end date
    bookingStartDateInput.addEventListener('change', (e) => {
      bookingEndDateInput.setAttribute('min', e.target.value);
      if (bookingEndDateInput.value < e.target.value) {
        bookingEndDateInput.value = e.target.value;
      }
    });

    // Add attendee row on + click
    addAttendeeBtn.addEventListener('click', () => {
      addAttendeeRow('');
    });

    // Form Submission
    bookingForm.addEventListener('submit', handleFormSubmit);
  }

  // Form Submission Handler
  async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(bookingForm);
    const startDate = bookingStartDateInput.value;
    const endDate = bookingEndDateInput.value;

    if (new Date(startDate + 'T00:00:00') > new Date(endDate + 'T00:00:00')) {
      showToast('End Date must be on or after Start Date.', 'error');
      return;
    }

    // Collect and validate attendees
    const attendeeNames = getAttendeeNames();
    if (attendeeNames.length === 0) {
      showToast('Please enter at least one attendee name.', 'error');
      return;
    }

    const data = {
      startDate,
      endDate,
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      reason: formData.get('reason'),
      attendees: attendeeNames.join('\n'),
      remarks: formData.get('remarks'),
      bookingType: fullDayCheckbox.checked ? 'full' : 'time',
      startTime: fullDayCheckbox.checked ? '' : formData.get('startTime'),
      endTime: fullDayCheckbox.checked ? '' : formData.get('endTime'),
      food: formData.get('food'),
      foodSpecify: formData.get('foodSpecify'),
      foodCount: formData.get('foodCount')
    };

    const submitBtn = bookingForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const resData = await response.json();

      if (response.ok) {
        showToast('Room successfully booked! Email notifications triggered.', 'success');
        closeBookingModal();
        await fetchBookings();
        renderCalendar();
      } else {
        showToast(resData.error || 'Conflict or reservation failure.', 'error');
      }
    } catch (err) {
      console.error('Submission error:', err);
      showToast('Connection error, failed to send request.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  // Show Toast Message
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Trigger slide in
    setTimeout(() => {
      toast.classList.add('active');
    }, 10);

    // Remove toast after 4s
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
