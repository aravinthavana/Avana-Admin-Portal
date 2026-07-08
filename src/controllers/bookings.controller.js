const crypto = require('crypto');
const bookingService = require('../services/bookings.service');

exports.getBookings = async (req, res, next) => {
  try {
    const bookings = await bookingService.getAllBookings();
    const sanitized = bookings.map(b => ({
      id: b.id,
      date: b.date,
      startDate: b.startDate || b.date,
      endDate: b.endDate || b.date,
      bookingType: b.bookingType,
      startTime: b.startTime,
      endTime: b.endTime,
      name: b.name
    }));
    res.status(200).json(sanitized);
  } catch (error) {
    next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  try {
    const data = req.body;
    const { name, email, phone, startDate, endDate, bookingType, startTime, endTime, reason, attendees, remarks, food, foodSpecify, foodCount } = data;

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
      reason, attendees, remarks: remarks || '',
      food: food || 'none',
      foodSpecify: food === 'others' ? foodSpecify : '',
      foodCount: food !== 'none' ? parseInt(foodCount) || 1 : 0,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    const conflictError = bookingService.checkConflict(newBooking, bookings);
    if (conflictError) {
      return res.status(409).json({ error: conflictError });
    }

    if (await bookingService.saveBooking(newBooking)) {
      const host = req.headers.host ? `${req.protocol}://${req.headers.host}` : 'http://localhost:3000';
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
    const { id, email } = req.query;
    if (!id || !email) {
      return res.status(400).send('Invalid Request: Missing ID or email');
    }

    const bookings = await bookingService.getAllBookings();
    const booking = bookings.find(b => b.id === id && b.email.toLowerCase() === email.toLowerCase());

    if (!booking) {
      return res.status(404).send('Booking Not Found or already cancelled');
    }

    if (await bookingService.deleteBooking(id)) {
      res.status(200).send('Booking Cancelled Successfully');
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
      res.status(200).json({ message: 'Booking deleted successfully.' });
    } else {
      res.status(500).json({ error: 'Failed to delete booking.' });
    }
  } catch (error) {
    next(error);
  }
};
