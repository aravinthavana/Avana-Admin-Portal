const express = require('express');
const router = express.Router();
const employeeAuthController = require('../controllers/employee-auth.controller');

// GET /api/employee/captcha
router.get('/captcha', employeeAuthController.getCaptcha);

// POST /api/employee/send-otp
router.post('/send-otp', employeeAuthController.sendOtp);

// POST /api/employee/verify-otp
router.post('/verify-otp', employeeAuthController.login);

const addressBookController = require('../controllers/address-book.controller');
const { requireEmployee } = require('../middlewares/employee-auth.middleware');

// GET /api/employee/requests
router.get('/requests', requireEmployee, employeeAuthController.getRequests);

// POST /api/employee/set-password
router.post('/set-password', requireEmployee, employeeAuthController.setPassword);

// POST /api/employee/login-password
router.post('/login-password', employeeAuthController.loginPassword);

// GET /api/employee/stationery-items
const inventoryController = require('../controllers/inventory.controller');
router.get('/stationery-items', requireEmployee, inventoryController.getStationeryCatalog);

// Courier Dispatch (Employee Side)
const courierController = require('../controllers/courier-dispatch.controller');
router.get('/courier-dispatch/next-dc', requireEmployee, courierController.getNextDcNumber);
router.get('/courier-dispatch/by-date', requireEmployee, courierController.getDispatchesByDate);
router.get('/courier-dispatch/all', requireEmployee, courierController.getAllDispatches);
router.post('/courier-dispatch/merge-request', requireEmployee, courierController.createMergeRequest);
router.post('/courier-dispatch', requireEmployee, courierController.createDispatch);
router.put('/courier-dispatch/:id', requireEmployee, courierController.updateDispatchEmployee);
router.delete('/courier-dispatch/:id', requireEmployee, courierController.deleteDispatchEmployee);
router.post('/shipping-label', requireEmployee, courierController.generateShippingLabel);

// Address Book (per-user)
router.get('/address-book', requireEmployee, addressBookController.getAddresses);
router.post('/address-book', requireEmployee, addressBookController.saveAddress);
router.patch('/address-book/:id', requireEmployee, addressBookController.updateAddress);
router.delete('/address-book/:id', requireEmployee, addressBookController.deleteAddress);

module.exports = router;
