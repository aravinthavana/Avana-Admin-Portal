import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiArrowLeft, FiPlus, FiChevronLeft, FiChevronRight, FiClock, FiCalendar } from 'react-icons/fi';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ConferenceBooking = () => {
  const { employee } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [modalOpen, setModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bookingType, setBookingType] = useState('time'); // 'time' | 'full'
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [reason, setReason] = useState('');
  const [attendees, setAttendees] = useState('');
  const [remarks, setRemarks] = useState('');
  const [food, setFood] = useState('none');
  const [foodSpecify, setFoodSpecify] = useState('');
  const [foodCount, setFoodCount] = useState(1);

  useEffect(() => {
    fetchBookings();
    if (employee) {
      setEmail(employee);
    }
  }, [employee]);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Pad start with empty days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Days numbers
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatDateString = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getDayStatus = (day) => {
    if (!day) return 'empty';
    const dayStr = formatDateString(day);
    const dayBookings = bookings.filter(b => {
      const start = b.startDate || b.date;
      const end = b.endDate || b.date;
      return dayStr >= start && dayStr <= end;
    });

    if (dayBookings.length === 0) return 'available';
    
    const hasFullDay = dayBookings.some(b => b.bookingType === 'full');
    if (hasFullDay) return 'booked';

    // Check if total duration of bookings is high (arbitrary check for part vs booked)
    if (dayBookings.length >= 3) return 'booked';
    return 'partially';
  };

  const getBookingsForSelectedDate = () => {
    const selectedStr = formatDateString(selectedDate);
    return bookings.filter(b => {
      const start = b.startDate || b.date;
      const end = b.endDate || b.date;
      return selectedStr >= start && selectedStr <= end;
    });
  };

  const handleOpenBooking = () => {
    const dateStr = formatDateString(selectedDate);
    setStartDate(dateStr);
    setEndDate(dateStr);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !name || !phone || !email || !reason || !attendees) {
      alert('Please fill in all required fields.');
      return;
    }

    setSubmitLoading(true);
    const payload = {
      name,
      email,
      phone,
      startDate,
      endDate,
      bookingType,
      startTime: bookingType === 'full' ? '00:00' : startTime,
      endTime: bookingType === 'full' ? '23:59' : endTime,
      reason,
      attendees,
      remarks,
      food,
      foodSpecify: food === 'others' ? foodSpecify : '',
      foodCount: food !== 'none' ? parseInt(foodCount) || 1 : 0
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        alert('✅ Booking request submitted for Admin approval.');
        setModalOpen(false);
        fetchBookings();
        // Reset form
        setReason('');
        setRemarks('');
        setAttendees('');
        setFood('none');
        setFoodSpecify('');
        setFoodCount(1);
      } else {
        alert(`🚨 Conflict or error: ${data.error || 'Please choose another time.'}`);
      }
    } catch (err) {
      alert('🚨 Connection failed.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const activeBookings = getBookingsForSelectedDate();

  return (
    <div style={{ padding: '2rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Back and Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <FiArrowLeft /> Back to Help Desk
          </button>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800' }}>Conference Room Booking</h1>
          <button onClick={handleOpenBooking} className="btn btn-primary" style={{ borderRadius: '12px' }}>
            <FiPlus /> New Booking
          </button>
        </div>

        {/* Calendar Grid Card */}
        <div className="glass-panel" style={{ background: 'white', padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <button className="btn btn-secondary" onClick={handlePrevMonth} style={{ padding: '0.5rem 1rem' }}>
              <FiChevronLeft /> Prev
            </button>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700' }}>
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button className="btn btn-secondary" onClick={handleNextMonth} style={{ padding: '0.5rem 1rem' }}>
              Next <FiChevronRight />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.75rem' }}>
            {DAY_NAMES.map(day => (
              <div key={day} style={{ textAlign: 'center', fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', paddingBottom: '0.5rem' }}>
                {day}
              </div>
            ))}
            
            {getDaysInMonth(currentDate).map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} style={{ aspectRatio: '1.1' }} />;
              
              const status = getDayStatus(day);
              const isSelected = formatDateString(day) === formatDateString(selectedDate);
              
              let bgColor = 'rgba(255,255,255,0.02)';
              let borderColor = 'var(--border-color)';
              
              if (status === 'available') {
                bgColor = 'var(--accent-success-glow)';
                borderColor = 'hsla(162, 76%, 39%, 0.3)';
              } else if (status === 'partially') {
                bgColor = 'var(--accent-warning-glow)';
                borderColor = 'hsla(36, 100%, 44%, 0.3)';
              } else if (status === 'booked') {
                bgColor = 'var(--accent-danger-glow)';
                borderColor = 'hsla(0, 72%, 51%, 0.3)';
              }

              return (
                <div 
                  key={day.getTime()} 
                  onClick={() => setSelectedDate(day)}
                  style={{
                    aspectRatio: '1.1',
                    background: bgColor,
                    border: `1.5px solid ${isSelected ? 'var(--primary)' : borderColor}`,
                    borderRadius: '14px',
                    padding: '0.6rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isSelected ? '0 0 10px var(--primary-glow)' : 'none',
                    transform: isSelected ? 'scale(1.02)' : 'none',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <span style={{ fontWeight: '700', fontSize: '1.05rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                    {day.getDate()}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                    {status === 'available' && 'Available'}
                    {status === 'partially' && 'Partial'}
                    {status === 'booked' && 'Booked'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '2rem', padding: '1rem', background: 'hsl(220, 10%, 98%)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-success)' }} />
              Available
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-warning)' }} />
              Partially Booked
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-danger)' }} />
              Fully Booked
            </div>
          </div>
        </div>

        {/* Selected Date slots card */}
        <div className="glass-panel" style={{ background: 'white', padding: '2rem', borderTop: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>
              📅 Booked Timings for {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
            </h3>
            <span style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '0.35rem 0.85rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: '700' }}>
              {activeBookings.length} Bookings
            </span>
          </div>

          {activeBookings.length === 0 ? (
            <div style={{ padding: '2.5rem', background: 'hsl(220, 10%, 98%)', borderRadius: '12px', color: 'var(--text-light)', fontWeight: '500', fontSize: '0.9rem' }}>
              No confirmed bookings for this date. The conference room is available.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeBookings.map((b) => (
                <div 
                  key={b.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.9rem 1.25rem',
                    background: 'hsl(220, 15%, 98%)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FiClock color="var(--primary)" />
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                      {b.bookingType === 'full' ? 'Full Day (00:00 - 23:59)' : `${b.startTime} - ${b.endTime}`}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{b.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reason: {b.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Form Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Book Conference Room</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleFormSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>End Date *</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" required />
                </div>

                <div className="form-group">
                  <label>Reason for Booking Room *</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Project Sync, Client Presentation..." required />
                </div>

                <div className="form-group">
                  <label>List of Attendees *</label>
                  <textarea value={attendees} onChange={(e) => setAttendees(e.target.value)} rows={3} placeholder="List attendee names (one per line)..." required />
                </div>

                <div className="form-group">
                  <label>Remarks</label>
                  <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Additional notes..." />
                </div>

                <div className="form-group">
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={bookingType === 'full'}
                      onChange={(e) => setBookingType(e.target.checked ? 'full' : 'time')}
                    />
                    Book for Full Day
                  </label>
                </div>

                {bookingType === 'time' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Start Time *</label>
                      <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>End Time *</label>
                      <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Food Arrangement</label>
                  <select value={food} onChange={(e) => setFood(e.target.value)}>
                    <option value="none">None</option>
                    <option value="mini meals">Mini Meals</option>
                    <option value="chapati">Chapati</option>
                    <option value="snacks">Snacks</option>
                    <option value="others">Others</option>
                  </select>
                </div>

                {food !== 'none' && (
                  <div className="form-row">
                    {food === 'others' && (
                      <div className="form-group">
                        <label>Specify Food *</label>
                        <input type="text" value={foodSpecify} onChange={(e) => setFoodSpecify(e.target.value)} placeholder="Specify meal items" required />
                      </div>
                    )}
                    <div className="form-group">
                      <label>Food Quantity</label>
                      <input type="number" value={foodCount} onChange={(e) => setFoodCount(e.target.value)} min={1} required />
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Phone No. *</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number" required />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" disabled={submitLoading} className="btn btn-primary">
                    {submitLoading ? 'Booking...' : 'Submit Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConferenceBooking;
