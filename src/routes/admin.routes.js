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
router.get('/audit-logs', adminAuthController.getAuditLogs);

// Global Address Book
router.get('/global-addresses', adminAuthController.getGlobalAddresses);
router.post('/global-addresses', adminAuthController.saveGlobalAddress);
router.patch('/global-addresses/:id', adminAuthController.updateGlobalAddress);
router.delete('/global-addresses/:id', adminAuthController.deleteGlobalAddress);

// Bookings
const bookingsController = require('../controllers/bookings.controller');
router.get('/bookings', bookingsController.getAdminBookings);
router.delete('/bookings/:id', bookingsController.deleteAdminBooking);

// Inventory - Stationery
router.get('/stationery-stock', inventoryController.getStationeryStock);
router.post('/stationery-stock', inventoryController.updateStationeryStock);
router.get('/stationery-audit', inventoryController.getStationeryAudit);
router.post('/stationery-audit/override', inventoryController.overrideStationeryAudit);
router.post('/stationery-items', inventoryController.addStationeryItemType);

// Inventory - Housekeeping
router.get('/housekeeping-stock', inventoryController.getHousekeepingStock);
router.post('/housekeeping-stock', inventoryController.updateHousekeepingStock);
router.post('/housekeeping-items', inventoryController.addHousekeepingItemType);
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

// Asset Tracker & Handovers
const assetTrackerController = require('../controllers/asset-tracker.controller');
router.get('/assets', assetTrackerController.getAllHandovers);
router.post('/assets', assetTrackerController.createHandover);
router.post('/assets/remind', assetTrackerController.remindHandover);
router.post('/assets/append', assetTrackerController.appendAssets);
router.post('/assets/return', assetTrackerController.returnAssets);
router.delete('/assets/:id', assetTrackerController.deleteHandover);

// Courier Dispatches & Delivery Challans
const courierController = require('../controllers/courier-dispatch.controller');
router.get('/courier-dispatches', courierController.getAllDispatches);
router.post('/courier-dispatches', courierController.createDispatch);
router.patch('/courier-dispatches/:id', courierController.updateTrackingInfo);
router.post('/courier-dispatches/merge', courierController.mergeParcel);
router.delete('/courier-dispatches/:id', courierController.deleteDispatch);

// Petty Cash / Cash Handling Ledger
const pettyCashController = require('../controllers/petty-cash.controller');
router.get('/cash-handling', pettyCashController.getAll);
router.post('/cash-handling', pettyCashController.create);
router.put('/cash-handling/:id', pettyCashController.update);
router.patch('/cash-handling/:id', pettyCashController.update);
router.delete('/cash-handling/:id', pettyCashController.delete);

// Travel Expenses & Fuel Records
const travelController = require('../controllers/travel-expense.controller');
router.get('/travel-expenses', travelController.getAll);
router.post('/travel-expenses', travelController.create);
router.put('/travel-expenses/:id', travelController.update);
router.patch('/travel-expenses/:id', travelController.update);
router.delete('/travel-expenses/:id', travelController.delete);

// Bills & Warranty Register
const billWarrantyController = require('../controllers/bill-warranty.controller');
router.get('/bill-warranty', billWarrantyController.getAll);
router.post('/bill-warranty', billWarrantyController.create);
router.put('/bill-warranty/:id', billWarrantyController.update);
router.patch('/bill-warranty/:id', billWarrantyController.update);
router.delete('/bill-warranty/:id', billWarrantyController.delete);

// Other Stock Items Catalog
const otherStockController = require('../controllers/other-stock.controller');
router.get('/other-stock', otherStockController.getAll);
router.post('/other-stock', otherStockController.save);
router.post('/other-stock/use', otherStockController.useStock);
router.delete('/other-stock/:id', otherStockController.delete);
router.put('/other-stock/:id/usage/:usageId', otherStockController.updateUsage);

// Renewal Reminders & Deadline Audit
const remindersController = require('../controllers/reminders.controller');
router.get('/reminders', remindersController.getAll);
router.post('/reminders', remindersController.create);
router.post('/reminders/trigger', remindersController.triggerScan);
router.delete('/reminders/:id', remindersController.delete);

// Office Locations Management
const locationController = require('../controllers/location.controller');
router.get('/locations', locationController.getLocations);
router.post('/locations', locationController.createLocation);
router.delete('/locations/:id', locationController.deleteLocation);

module.exports = router;

