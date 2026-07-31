import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { bookingsApi } from '../lib/api';
import {
  Spinner, EmptyState, Alert, Modal, FormField, PageHeader, Badge,
} from '../components/ui';

/* ─── Helpers ─────────────────────────────────────────────── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS_OF_WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const FOOD_OPTIONS = ['None','Mini Meals','Chapati','Snacks','Others'];

function pad2(n) { return String(n).padStart(2,'0'); }

function toDateStr(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function todayStr() {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${pad2(d)} ${MONTHS[m-1]} ${y}`;
}

function formatTime12(t) {
  if (!t) return '';
  const [hh, mm] = t.split(':').map(Number);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${pad2(mm)} ${ampm}`;
}

/* Get all calendar days for a month grid (Sun-Sat, 6 rows) */
function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push({ day: null, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, dateStr: toDateStr(year, month, d) });
  }
  while (days.length % 7 !== 0) days.push({ day: null, dateStr: null });
  return days;
}

/* Calculate booked minutes on a given date from all bookings */
function getBookedMinutes(bookings, dateStr) {
  let total = 0;
  for (const b of bookings) {
    const start = b.startDate || b.date;
    const end = b.endDate || b.date || start;
    if (dateStr < start || dateStr > end) continue;
    if (b.bookingType === 'full') {
      total += 540;
    } else {
      const [sh, sm] = (b.startTime || '09:00').split(':').map(Number);
      const [eh, em] = (b.endTime || '18:00').split(':').map(Number);
      total += Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
    }
  }
  return total;
}

/* Get bookings for a specific date */
function getBookingsForDate(bookings, dateStr) {
  return bookings.filter(b => {
    const start = b.startDate || b.date;
    const end = b.endDate || b.date || start;
    return dateStr >= start && dateStr <= end;
  });
}

/* Day color based on booked minutes */
function getDayColor(dateStr, bookedMinutes, today) {
  if (!dateStr || dateStr < today) return null; // past/empty - gray
  if (bookedMinutes === 0) return 'available';
  if (bookedMinutes >= 540) return 'full';
  return 'partial';
}

const COLOR_MAP = {
  available: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.3)', text: 'var(--color-text-primary)', hover: 'rgba(16, 185, 129, 0.15)', indicator: '#10b981' },
  partial:   { bg: 'rgba(217, 119, 6, 0.08)', border: 'rgba(245, 158, 11, 0.3)', text: 'var(--color-text-primary)', hover: 'rgba(217, 119, 6, 0.15)', indicator: '#d97706' },
  full:      { bg: 'rgba(220, 38, 38, 0.08)', border: 'rgba(239, 68, 68, 0.3)', text: 'var(--color-text-primary)', hover: 'rgba(220, 38, 38, 0.15)', indicator: '#dc2626' },
};

/* ─── Booking Form Default State ──────────────────────────── */
function defaultForm(email = '', dateStr = '') {
  return {
    start_date: dateStr,
    end_date: dateStr,
    full_name: '',
    email: email || '',
    phone: '',
    reason: '',
    attendees: [''],
    full_day: false,
    start_time: '09:00',
    end_time: '10:00',
    food_arrangement: 'None',
    food_specify: '',
    food_count: 1,
    remarks: '',
  };
}

/* ─── Component ───────────────────────────────────────────── */
export default function BookingPage() {
  const { employeeEmail } = useAuth();
  const toast = useToast();

  const today = todayStr();
  const nowDate = new Date();
  const [calYear, setCalYear] = useState(nowDate.getFullYear());
  const [calMonth, setCalMonth] = useState(nowDate.getMonth());

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(() => defaultForm(employeeEmail, today));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  /* Fetch bookings */
  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/bookings');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBookings(data || []);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    document.title = 'Book Conference Room | Avana';
  }, [fetchBookings]);

  /* Calendar days */
  const calendarDays = useMemo(() => getCalendarDays(calYear, calMonth), [calYear, calMonth]);

  /* Check if we can go prev month */
  const canGoPrev = calYear > nowDate.getFullYear() || calMonth > nowDate.getMonth();

  function prevMonth() {
    if (!canGoPrev) return;
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  /* Day click */
  function handleDayClick(dateStr) {
    if (!dateStr || dateStr < today) return;
    setSelectedDate(dateStr);
    setForm(defaultForm(employeeEmail, dateStr));
    setErrors({});
    setModalOpen(true);
  }

  /* Form update helpers */
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  /* Live conflict check */
  const liveConflict = useMemo(() => {
    const newStart = form.start_date;
    const newEnd = form.end_date;
    if (!newStart || !newEnd) return null;

    if (new Date(newStart + 'T00:00:00') > new Date(newEnd + 'T00:00:00')) {
      return 'End date must be on or after start date.';
    }

    const dates = [];
    const current = new Date(newStart + 'T00:00:00');
    const endLimit = new Date(newEnd + 'T00:00:00');
    while (current <= endLimit) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      current.setDate(current.getDate() + 1);
    }

    for (const d of dates) {
      const sameDateBookings = bookings.filter(b => {
        if (b.status && b.status.toLowerCase() === 'rejected') return false;
        const bStart = b.startDate || b.date;
        const bEnd = b.endDate || b.date;
        return d >= bStart && d <= bEnd;
      });

      if (sameDateBookings.some(b => b.bookingType === 'full')) {
        return `The room is already booked for the entire day on ${formatDateDisplay(d)}.`;
      }

      if (form.full_day && sameDateBookings.length > 0) {
        return `The room has existing bookings on ${formatDateDisplay(d)} and cannot be booked for the full day.`;
      }

      if (!form.full_day) {
        const timeToMins = (t) => {
          if (!t) return 0;
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };

        const newTimeStart = timeToMins(form.start_time);
        const newTimeEnd = timeToMins(form.end_time);

        if (newTimeStart >= newTimeEnd) {
          return 'End time must be after start time.';
        }

        for (const b of sameDateBookings) {
          if (b.bookingType === 'full') {
            return `The room is already booked for the entire day on ${formatDateDisplay(d)}.`;
          }
          if (b.bookingType === 'partial' || b.bookingType === 'time') {
            const bTimeStart = timeToMins(b.startTime);
            const bTimeEnd = timeToMins(b.endTime);

            if (newTimeStart < bTimeEnd && newTimeEnd > bTimeStart) {
              return `Time slot conflicts with an existing booking on ${formatDateDisplay(d)}: ${formatTime12(b.startTime)} - ${formatTime12(b.endTime)} (${b.name})`;
            }
          }
        }
      }
    }
    return null;
  }, [form.start_date, form.end_date, form.start_time, form.end_time, form.full_day, bookings]);

  function updateAttendee(idx, val) {
    setForm(f => {
      const a = [...f.attendees];
      a[idx] = val;
      return { ...f, attendees: a };
    });
  }
  function addAttendee() {
    setForm(f => ({ ...f, attendees: [...f.attendees, ''] }));
  }
  function removeAttendee(idx) {
    setForm(f => {
      if (f.attendees.length <= 1) return f;
      const a = f.attendees.filter((_, i) => i !== idx);
      return { ...f, attendees: a };
    });
  }

  /* Validation */
  function validate() {
    const e = {};
    if (!form.start_date) e.start_date = 'Start date is required';
    if (!form.end_date) e.end_date = 'End date is required';
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      e.end_date = 'End date must be on or after start date';
    }
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    if (!form.email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Email must be a valid email address';
    }
    if (!form.phone.trim()) {
      e.phone = 'Phone is required';
    } else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      e.phone = 'Phone must be a valid 10-digit mobile number';
    }
    if (!form.reason.trim()) e.reason = 'Reason is required';
    if (form.attendees.length === 0 || !form.attendees[0].trim()) {
      e.attendees = 'At least one attendee name is required';
    }
    if (!form.full_day) {
      if (!form.start_time) e.start_time = 'Start time is required';
      if (!form.end_time) e.end_time = 'End time is required';
      if (form.start_time && form.end_time && form.end_time <= form.start_time) {
        e.end_time = 'End time must be after start time';
      }
    }
    if (form.food_arrangement === 'Others' && !form.food_specify.trim()) {
      e.food_specify = 'Please specify the food arrangement';
    }
    if (form.food_arrangement !== 'None' && (!form.food_count || form.food_count < 1)) {
      e.food_count = 'Food count must be at least 1';
    }
    return e;
  }

  /* Submit */
  async function handleSubmit(e) {
    e.preventDefault();
    if (liveConflict) { return; }
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await bookingsApi.submit({
        startDate: form.start_date,
        endDate: form.end_date,
        name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        reason: form.reason.trim(),
        attendees: form.attendees.filter(a => a.trim()),
        bookingType: form.full_day ? 'full' : 'partial',
        startTime: form.full_day ? '09:00' : form.start_time,
        endTime: form.full_day ? '18:00' : form.end_time,
        food: form.food_arrangement.toLowerCase(),
        foodSpecify: form.food_arrangement === 'Others' ? form.food_specify.trim() : '',
        foodCount: form.food_arrangement !== 'None' ? Number(form.food_count) : null,
        remarks: form.remarks.trim(),
      });
      toast.success('Conference room booked successfully! 🎉');
      setModalOpen(false);
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  /* Day's existing bookings */
  const selectedDateBookings = selectedDate ? getBookingsForDate(bookings, selectedDate) : [];

  /* ── Render ── */
  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 900, margin: '0 auto' }}>
      <PageHeader
        title="📅 Book Conference Room"
        subtitle="Select a date on the calendar to make a reservation"
      />

      {fetchError && (
        <Alert type="error" onClose={() => setFetchError(null)} style={{ marginBottom: 'var(--space-6)' }}>
          {fetchError}
        </Alert>
      )}

      {loadingBookings && (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <Spinner size="lg" label="Loading calendar…" />
        </div>
      )}

      {!loadingBookings && (
        <>
          {/* ── Calendar Card ── */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            {/* Month navigation */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 'var(--space-5)',
            }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={prevMonth}
                disabled={!canGoPrev}
                aria-label="Previous month"
              >
                ‹ Prev
              </button>
              <h3 style={{
                fontFamily: 'var(--font-heading)', fontSize: '1.15rem',
                fontWeight: 700, margin: 0, color: 'var(--color-text-primary)',
              }}>
                {MONTHS[calMonth]} {calYear}
              </h3>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={nextMonth}
                aria-label="Next month"
              >
                Next ›
              </button>
            </div>

            {/* Day headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4, marginBottom: 4,
            }}>
              {DAYS_OF_WEEK.map(d => (
                <div key={d} style={{
                  textAlign: 'center', fontSize: '0.72rem', fontWeight: 700,
                  color: 'var(--color-text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.05em', padding: 'var(--space-2)',
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
            }}>
              {calendarDays.map((cell, idx) => {
                if (!cell.dateStr) {
                  return <div key={`empty-${idx}`} style={{ aspectRatio: '1', minHeight: 52 }} />;
                }
                const booked = getBookedMinutes(bookings, cell.dateStr);
                const colorKey = getDayColor(cell.dateStr, booked, today);
                const isPast = cell.dateStr < today;
                const isToday = cell.dateStr === today;
                const isSelected = cell.dateStr === selectedDate;
                const colors = colorKey ? COLOR_MAP[colorKey] : null;

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => handleDayClick(cell.dateStr)}
                    disabled={isPast}
                    aria-label={`${formatDateDisplay(cell.dateStr)}${colorKey === 'full' ? ' – Fully booked' : colorKey === 'partial' ? ' – Partially booked' : colorKey === 'available' ? ' – Available' : ' – Past date'}`}
                    aria-pressed={isSelected}
                    style={{
                      aspectRatio: '1',
                      minHeight: 52,
                      border: isSelected
                        ? '2px solid var(--brand-amber)'
                        : isToday
                        ? '2px solid var(--brand-amber-light)'
                        : colors
                        ? `1px solid ${colors.border}`
                        : '1px solid var(--color-border-light)',
                      borderTop: colors && !isPast ? `4px solid ${colors.indicator}` : undefined,
                      borderRadius: 'var(--radius-md)',
                      background: isPast
                        ? 'var(--color-surface-2)'
                        : colors ? colors.bg : 'var(--color-surface-2)',
                      color: isPast
                        ? 'var(--color-text-muted)'
                        : colors ? colors.text : 'var(--color-text-muted)',
                      cursor: isPast ? 'default' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      fontWeight: isToday ? 700 : 500,
                      fontSize: '0.9rem',
                      transition: 'all var(--transition-fast)',
                      fontFamily: 'var(--font-heading)',
                      position: 'relative',
                      outline: 'none',
                    }}
                    onMouseEnter={e => {
                      if (!isPast && colors) e.currentTarget.style.background = colors.hover;
                    }}
                    onMouseLeave={e => {
                      if (!isPast && colors) e.currentTarget.style.background = colors.bg;
                    }}
                  >
                    {cell.day}
                    {isToday && (
                      <span style={{
                        fontSize: '0.45rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        opacity: 0.8,
                      }}>
                        TODAY
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{
              display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap',
              marginTop: 'var(--space-5)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px solid var(--color-border-light)',
            }}>
              {[
                { color: '#16a34a', label: 'Available' },
                { color: '#d97706', label: 'Partially booked' },
                { color: '#dc2626', label: 'Fully booked' },
                { color: 'var(--color-text-muted)', label: 'Past / Unavailable' },
              ].map(({ color, label }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  fontSize: '0.8rem', color: 'var(--color-text-secondary)',
                }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: 'var(--radius-sm)',
                    background: color, display: 'inline-block', flexShrink: 0,
                    boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)'
                  }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* ── Selected Date's Bookings ── */}
          <div className="card" style={{ marginBottom: 'var(--space-6)', borderTop: '4px solid var(--brand-charcoal)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '0.5rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📅 Booked Timings {selectedDate ? `for ${formatDateDisplay(selectedDate)}` : ''}
              </h3>
              {selectedDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{ background: 'var(--brand-amber-bg)', color: 'var(--brand-amber-dark)', padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700 }}>
                    {selectedDateBookings.length} Bookings
                  </span>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => { setForm(defaultForm(employeeEmail, selectedDate)); setErrors({}); setModalOpen(true); }}
                  >
                    + New Booking
                  </button>
                </div>
              )}
            </div>

            {!selectedDate ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                Select a date from the calendar above to view booked timings.
              </div>
            ) : selectedDateBookings.length === 0 ? (
              <EmptyState icon="🟢" title="No bookings for this date" description="The room is fully available." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {selectedDateBookings.map(b => (
                  <div key={b.id} style={{
                    padding: 'var(--space-4)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-2)',
                    display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)',
                    flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{b.name}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                        {b.bookingType === 'full' ? '🔴 Full Day' : `🕐 ${formatTime12(b.startTime)} – ${formatTime12(b.endTime)}`}
                      </div>
                    </div>
                    <div style={{ flex: 2, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      {b.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Booking Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`📅 Book Conference Room — ${selectedDate ? formatDateDisplay(selectedDate) : ''}`}
        size="wide"
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={`btn btn--primary${submitting ? ' btn--loading' : ''}`}
              onClick={handleSubmit}
              disabled={submitting || !!liveConflict}
            >
              {submitting ? 'Submitting…' : 'Confirm Booking'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} noValidate>
          {/* Existing Bookings Warning Box */}
          {selectedDateBookings.length > 0 && (
            <div style={{
              marginBottom: '1.2rem', padding: '1rem', background: '#fffbeb',
              border: '1px solid #fde68a', borderRadius: '10px'
            }}>
              <h4 style={{
                fontSize: '0.85rem', fontWeight: 700, color: '#b45309',
                marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Already Booked Timings for this Date:
              </h4>
              <div style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {selectedDateBookings.map(b => (
                  <div key={b.id}>
                    • {b.bookingType === 'full' ? 'Full Day' : `${formatTime12(b.startTime)} – ${formatTime12(b.endTime)}`}
                    <span style={{ opacity: 0.8, marginLeft: '0.5rem' }}>({b.name})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date range */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
          }}>
            <FormField label="Start Date" required htmlFor="booking-start-date" error={errors.start_date}>
              <input
                id="booking-start-date"
                type="date"
                className={`form-input${errors.start_date ? ' form-input--error' : ''}`}
                value={form.start_date}
                min={today}
                onChange={e => set('start_date', e.target.value)}
                required
              />
            </FormField>
            <FormField label="End Date" required htmlFor="booking-end-date" error={errors.end_date}>
              <input
                id="booking-end-date"
                type="date"
                className={`form-input${errors.end_date ? ' form-input--error' : ''}`}
                value={form.end_date}
                min={form.start_date || today}
                onChange={e => set('end_date', e.target.value)}
                required
              />
            </FormField>
          </div>

          {/* Full day checkbox */}
          <div style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <input
              id="booking-fullday"
              type="checkbox"
              checked={form.full_day}
              onChange={e => set('full_day', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--brand-amber)' }}
            />
            <label htmlFor="booking-fullday" style={{ fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>
              Book for Full Day (09:00 – 18:00)
            </label>
          </div>

          {/* Time */}
          {!form.full_day && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)',
              marginBottom: 'var(--space-4)',
            }}>
              <FormField label="Start Time" required htmlFor="booking-start-time" error={errors.start_time}>
                <input
                  id="booking-start-time"
                  type="time"
                  className={`form-input${errors.start_time ? ' form-input--error' : ''}`}
                  value={form.start_time}
                  min="09:00" max="18:00" step="900"
                  onChange={e => set('start_time', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="End Time" required htmlFor="booking-end-time" error={errors.end_time}>
                <input
                  id="booking-end-time"
                  type="time"
                  className={`form-input${errors.end_time ? ' form-input--error' : ''}`}
                  value={form.end_time}
                  min="09:00" max="18:00" step="900"
                  onChange={e => set('end_time', e.target.value)}
                  required
                />
              </FormField>
            </div>
          )}
          {/* Live Conflict Availability Banner */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            {liveConflict ? (
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-error-bg)',
                border: '1px solid var(--color-error-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-error)',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
              }}>
                <span>⚠️</span>
                <span>{liveConflict}</span>
              </div>
            ) : (
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-success-bg)',
                border: '1px solid var(--color-success-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-success)',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
              }}>
                <span>✅</span>
                <span>Room is available for the selected slot</span>
              </div>
            )}
          </div>

          {/* Name & Email */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
          }}>
            <FormField label="Full Name" required htmlFor="booking-name" error={errors.full_name}>
              <input
                id="booking-name"
                type="text"
                className={`form-input${errors.full_name ? ' form-input--error' : ''}`}
                value={form.full_name}
                placeholder="Your full name"
                onChange={e => set('full_name', e.target.value)}
                required
              />
            </FormField>
            <FormField label="Email" required htmlFor="booking-email" error={errors.email}>
              <input
                id="booking-email"
                type="email"
                className={`form-input${errors.email ? ' form-input--error' : ''}`}
                value={form.email}
                placeholder="your@email.com"
                onChange={e => set('email', e.target.value)}
                required
              />
            </FormField>
          </div>

          {/* Phone */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <FormField label="Phone Number" required htmlFor="booking-phone" error={errors.phone}>
              <input
                id="booking-phone"
                type="tel"
                className={`form-input${errors.phone ? ' form-input--error' : ''}`}
                value={form.phone}
                placeholder="+91 9876543210"
                onChange={e => set('phone', e.target.value)}
                required
              />
            </FormField>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <FormField label="Reason for Booking" required htmlFor="booking-reason" error={errors.reason}>
              <textarea
                id="booking-reason"
                className={`form-textarea${errors.reason ? ' form-textarea--error' : ''}`}
                value={form.reason}
                rows={3}
                placeholder="Describe the purpose of this booking…"
                onChange={e => set('reason', e.target.value)}
                required
              />
            </FormField>
          </div>

          {/* Attendees */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label form-label--required" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
              Attendees
            </label>
            {errors.attendees && <span className="form-error" role="alert">⚠ {errors.attendees}</span>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {form.attendees.map((a, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={a}
                    placeholder={`Attendee ${idx + 1} name`}
                    onChange={e => updateAttendee(idx, e.target.value)}
                    aria-label={`Attendee ${idx + 1} name`}
                    style={{ flex: 1 }}
                  />
                  {form.attendees.length > 1 && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => removeAttendee(idx)}
                      aria-label={`Remove attendee ${idx + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={addAttendee}
                style={{ alignSelf: 'flex-start', marginTop: 'var(--space-1)' }}
              >
                + Add Attendee
              </button>
            </div>
          </div>

          {/* Food Arrangement */}
          <div style={{
            display: 'grid', gridTemplateColumns: form.food_arrangement !== 'None' ? 'repeat(auto-fit, minmax(220px, 1fr))' : '1fr',
            gap: 'var(--space-4)', marginBottom: 'var(--space-4)',
          }}>
            <FormField label="Food Arrangement" htmlFor="booking-food">
              <select
                id="booking-food"
                className="form-select"
                value={form.food_arrangement}
                onChange={e => set('food_arrangement', e.target.value)}
              >
                {FOOD_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </FormField>
            {form.food_arrangement !== 'None' && (
              <FormField label="Food Count" required htmlFor="booking-food-count" error={errors.food_count}>
                <input
                  id="booking-food-count"
                  type="number"
                  className={`form-input${errors.food_count ? ' form-input--error' : ''}`}
                  value={form.food_count}
                  min={1}
                  onChange={e => set('food_count', e.target.value)}
                />
              </FormField>
            )}
          </div>

          {form.food_arrangement === 'Others' && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <FormField label="Please Specify Food" required htmlFor="booking-food-specify" error={errors.food_specify}>
                <input
                  id="booking-food-specify"
                  type="text"
                  className={`form-input${errors.food_specify ? ' form-input--error' : ''}`}
                  value={form.food_specify}
                  placeholder="Describe the food arrangement…"
                  onChange={e => set('food_specify', e.target.value)}
                />
              </FormField>
            </div>
          )}

          {/* Remarks */}
          <div>
            <FormField label="Remarks (Optional)" htmlFor="booking-remarks">
              <textarea
                id="booking-remarks"
                className="form-textarea"
                value={form.remarks}
                rows={2}
                placeholder="Any additional notes…"
                onChange={e => set('remarks', e.target.value)}
              />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}
