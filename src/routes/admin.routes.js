const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/admin-auth.controller');
// We will add inventory and billing controllers here soon
const inventoryController = require('../controllers/inventory.controller');
// const billingController = require('../controllers/billing.controller');

// Admin Auth
router.post('/login', adminAuthController.login);
router.delete('/logout', adminAuthController.logout);
router.post('/reset-password', adminAuthController.resetPassword);

// Protected Admin Routes
router.use(adminAuthController.requireAdmin);

router.post('/change-password', adminAuthController.changePassword);
router.get('/logins', adminAuthController.getLogins);

// Bookings
const bookingsController = require('../controllers/bookings.controller');
router.get('/bookings', bookingsController.getAdminBookings);
router.delete('/bookings/:id', bookingsController.deleteAdminBooking);

// Inventory - Stationery
router.get('/stationery-stock', inventoryController.getStationeryStock);
router.post('/stationery-stock', inventoryController.updateStationeryStock);
router.get('/stationery-audit', inventoryController.getStationeryAudit);
router.post('/stationery-audit/override', inventoryController.overrideStationeryAudit);
router.post('/stationery-items', inventoryController.updateStationeryStock); // legacy used POST /api/admin/stationery-items for new items

// Inventory - Housekeeping
router.get('/housekeeping-stock', inventoryController.getHousekeepingStock);
router.post('/housekeeping-stock', inventoryController.updateHousekeepingStock);
router.post('/housekeeping-items', inventoryController.updateHousekeepingStock);
router.get('/housekeeping-audit', inventoryController.getHousekeepingAudit);
router.post('/housekeeping-audit/override', inventoryController.overrideHousekeepingAudit);

const billingController = require('../controllers/billing.controller');

// Billing & AMC
// AMC
router.get('/amc', billingController.getAMCs);
router.post('/amc', billingController.saveAMC);
router.delete('/amc/:id', billingController.deleteAMC);
router.post('/amc/visit', billingController.saveAMCVisit);

// Utilities
router.get('/utility-payments', billingController.getUtilityPayments);
router.post('/utility-payments', billingController.saveUtilityPayment);
router.patch('/utility-payments/:id', billingController.patchUtilityPayment);
router.delete('/utility-payments/:id', billingController.deleteUtilityPayment);

// Taxes
router.get('/tax-payments', billingController.getTaxPayments);
router.post('/tax-payments', billingController.saveTaxPayment);
router.patch('/tax-payments/:id', billingController.patchTaxPayment);
router.delete('/tax-payments/:id', billingController.deleteTaxPayment);

module.exports = router;
