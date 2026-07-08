const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookings.controller');

// Public Endpoints
router.get('/', bookingsController.getBookings);
router.post('/', bookingsController.createBooking);
router.get('/cancel', bookingsController.cancelBooking);

module.exports = router;
