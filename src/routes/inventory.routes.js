const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');

// GET /api/employee/stationery-items
router.get('/employee/stationery-items', inventoryController.getStationeryCatalog);

module.exports = router;
