const express = require('express');
const router = express.Router();
const employeeAuthController = require('../controllers/employee-auth.controller');

// GET /api/employee/captcha
router.get('/captcha', employeeAuthController.getCaptcha);

// POST /api/employee/send-otp
router.post('/send-otp', employeeAuthController.sendOtp);

// POST /api/employee/verify-otp
router.post('/verify-otp', employeeAuthController.login);

// GET /api/employee/requests
router.get('/requests', employeeAuthController.getRequests);

// POST /api/employee/set-password
router.post('/set-password', employeeAuthController.setPassword);

// POST /api/employee/login-password
router.post('/login-password', employeeAuthController.loginPassword);

// GET /api/employee/stationery-items
const inventoryController = require('../controllers/inventory.controller');
router.get('/stationery-items', inventoryController.getStationeryCatalog);

// Courier Dispatch (Employee Side)
const courierController = require('../controllers/courier-dispatch.controller');
router.get('/courier-dispatch/next-dc', courierController.getNextDcNumber);
router.post('/courier-dispatch', courierController.createDispatch);
router.post('/shipping-label', courierController.generateShippingLabel);

// Address Book (per-user)
const addressBookController = require('../controllers/address-book.controller');
router.get('/address-book', addressBookController.getAddresses);
router.post('/address-book', addressBookController.saveAddress);
router.delete('/address-book/:id', addressBookController.deleteAddress);

module.exports = router;
