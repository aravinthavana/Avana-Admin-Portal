const env = require('../config/env');
const crypto = require('crypto');
const bookingService = require('../services/bookings.service');
const auditLogger = require('../utils/audit-logger');

const getCancelSig = (id, email) => {
  const secret = env.JWT_SECRET;
  return crypto.createHmac('sha256', secret).update(`${id}:${email}`).digest('hex');
};

exports.getBookings = async (req, res, next) => {
  try {
    const bookings = await bookingService.getAllBookings();
    const activeBookings = bookings.filter(b => b.status && b.status.toLowerCase() === 'confirmed');
    const sanitized = activeBookings.map(b => ({
      id: b.id,
      date: b.date,
      startDate: b.startDate || b.date,
      endDate: b.endDate || b.date,
      bookingType: b.bookingType,
      startTime: b.startTime,
      endTime: b.endTime,
      name: b.name,
      status: b.status
    }));
    res.status(200).json(sanitized);
  } catch (error) {
    next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  try {
    const data = req.body;
    const { name, email, phone, startDate, endDate, bookingType, startTime, endTime, reason, attendees, remarks, food, foodSpecify, foodCount, origin } = data;

    const sDate = startDate || data.date;
    const eDate = endDate || data.date || sDate;

    // Basic Validation
    const missing = [];
    if (!name) missing.push('name');
    if (!email) missing.push('email');
    if (!phone) missing.push('phone');
    if (!sDate) missing.push('startDate');
    if (!eDate) missing.push('endDate');
    if (!bookingType) missing.push('bookingType');
    if (!reason) missing.push('reason');
    if (!attendees) missing.push('attendees');

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Please fill in all required fields. Missing: ' + missing.join(', ') });
    }

    const bookings = await bookingService.getAllBookings();

    const newBooking = {
      id: crypto.randomUUID(),
      name, email, phone,
      date: sDate, startDate: sDate, endDate: eDate,
      bookingType,
      startTime: bookingType === 'full' ? '00:00' : startTime,
      endTime: bookingType === 'full' ? '23:59' : endTime,
      reason,
      attendees: Array.isArray(attendees) ? JSON.stringify(attendees) : (typeof attendees === 'string' ? attendees : '[]'),
      remarks: remarks || '',
      food: food || 'none',
      foodSpecify: food === 'others' ? foodSpecify : '',
      foodCount: food !== 'none' ? parseInt(foodCount) || 1 : 0,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    
    newBooking.cancelSig = getCancelSig(newBooking.id, newBooking.email);

    const conflictError = bookingService.checkConflict(newBooking, bookings);
    if (conflictError) {
      return res.status(409).json({ error: conflictError });
    }

    if (await bookingService.saveBooking(newBooking)) {
      const host = origin || (req.headers.origin) || (req.headers.host ? `${req.protocol}://${req.headers.host}` : env.APP_URL);
      bookingService.sendBookingRequestToAdminNotification(newBooking, host).catch(console.error);
      res.status(201).json({ message: 'Booking request submitted for Admin approval.', booking: newBooking });
    } else {
      res.status(500).json({ error: 'Database save failure.' });
    }
  } catch (error) {
    next(error);
  }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const { id, email, sig } = req.query;
    if (!id || !email || !sig) {
      return res.status(400).send(`
        <html>
          <head>
            <title>Invalid Request</title>
            <style>
              body { font-family: sans-serif; background: #f5f5f7; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center; max-width: 400px; }
              h1 { color: #dc2626; margin-bottom: 10px; font-size: 24px; }
              p { color: #6b7280; font-size: 15px; line-height: 1.5; margin-bottom: 25px; }
              .btn { background: #c17f24; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; transition: background 0.2s; }
              .btn:hover { background: #9e6418; }
            </style>
          </head>
          <body>
            <div class="card">
              <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
              <h1>Invalid Link</h1>
              <p>Missing required parameters or signature. Make sure to click the link directly from your email.</p>
              <a href="/" class="btn">Go to Portal</a>
            </div>
          </body>
        </html>
      `);
    }

    const expectedSig = getCancelSig(id, email);
    if (sig !== expectedSig) {
      return res.status(403).send('Invalid signature.');
    }

    const bookings = await bookingService.getAllBookings();
    const booking = bookings.find(b => String(b.id) === String(id) && b.email && b.email.trim().toLowerCase() === email.trim().toLowerCase());

    if (!booking) {
      return res.status(404).send(`
        <html>
          <head>
            <title>Booking Not Found</title>
            <style>
              body { font-family: sans-serif; background: #f5f5f7; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center; max-width: 400px; }
              h1 { color: #dc2626; margin-bottom: 10px; font-size: 24px; }
              p { color: #6b7280; font-size: 15px; line-height: 1.5; margin-bottom: 25px; }
              .btn { background: #c17f24; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; transition: background 0.2s; }
              .btn:hover { background: #9e6418; }
            </style>
          </head>
          <body>
            <div class="card">
              <div style="font-size: 48px; margin-bottom: 20px;">ℹ️</div>
              <h1>Booking Not Found</h1>
              <p>The booking does not exist or has already been cancelled.</p>
              <a href="/" class="btn">Go to Portal</a>
            </div>
          </body>
        </html>
      `);
    }

    // Check if the meeting is already completed
    const endDateTimeStr = `${booking.endDate || booking.date || ''}T${booking.endTime || '18:00'}:00`;
    const meetingEndTime = new Date(endDateTimeStr);
    if (!isNaN(meetingEndTime.getTime()) && new Date() > meetingEndTime) {
      return res.status(200).send(`
        <html>
          <head>
            <title>Meeting Completed</title>
            <style>
              body { font-family: sans-serif; background: #f5f5f7; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center; max-width: 450px; }
              h1 { color: #f59e0b; margin-bottom: 10px; font-size: 24px; }
              p { color: #6b7280; font-size: 15px; line-height: 1.5; margin-bottom: 25px; }
              .btn { background: #c17f24; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; transition: background 0.2s; }
              .btn:hover { background: #9e6418; }
            </style>
          </head>
          <body>
            <div class="card">
              <div style="font-size: 48px; margin-bottom: 20px;">⏰</div>
              <h1>Meeting Already Completed</h1>
              <p>The meeting scheduled for <strong>${booking.startDate || booking.date || ''}</strong> (${booking.startTime || '09:00'} - ${booking.endTime || '18:00'}) is already over and cannot be cancelled.</p>
              <a href="/" class="btn">Go to Portal</a>
            </div>
          </body>
        </html>
      `);
    }

    booking.status = 'cancelled';
    if (await bookingService.saveBooking(booking)) {
      bookingService.sendBookingCancellationNotification(booking).catch(console.error);

      res.status(200).send(`
        <html>
          <head>
            <title>Booking Cancelled</title>
            <style>
              body { font-family: sans-serif; background: #f5f5f7; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center; max-width: 400px; }
              h1 { color: #1c1c1e; margin-bottom: 10px; font-size: 24px; }
              p { color: #6b7280; font-size: 15px; line-height: 1.5; margin-bottom: 25px; }
              .btn { background: #c17f24; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; transition: background 0.2s; }
              .btn:hover { background: #9e6418; }
            </style>
          </head>
          <body>
            <div class="card">
              <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
              <h1>Booking Cancelled</h1>
              <p>Your room booking has been successfully cancelled and the slot has been released.</p>
              <a href="/" class="btn">Go to Portal</a>
            </div>
          </body>
        </html>
      `);
    } else {
      res.status(500).send('Server Error updating database');
    }
  } catch (error) {
    next(error);
  }
};

// Admin Endpoints
exports.getAdminBookings = async (req, res, next) => {
  try {
    const bookings = await bookingService.getAllBookings();
    // They are already sorted by DESC in the service
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};

exports.deleteAdminBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bookings = await bookingService.getAllBookings();
    const exists = bookings.find(b => b.id === id);

    if (!exists) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (await bookingService.deleteBooking(id)) {
      await auditLogger.logAdminAction(req, 'DELETE_BOOKING', 'Booking', id, null);
      res.status(200).json({ message: 'Booking deleted successfully.' });
    } else {
      res.status(500).json({ error: 'Failed to delete booking.' });
    }
  } catch (error) {
    next(error);
  }
};
