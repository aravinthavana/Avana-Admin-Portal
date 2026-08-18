const express = require('express');
const router = express.Router();
const controller = require('../controllers/purchase.controller');

router.post('/', controller.createRequest);
router.get('/', controller.getAllRequests);
router.get('/approve/:token/:action', controller.handleAction);
router.post('/:id/purchased', controller.markPurchased);

module.exports = router;
