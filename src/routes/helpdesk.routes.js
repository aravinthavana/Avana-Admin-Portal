const express = require('express');
const router = express.Router();
const helpdeskController = require('../controllers/helpdesk.controller');
const { requireAdmin } = require('../controllers/admin-auth.controller');

// Public Endpoints
router.post('/', helpdeskController.createRequest);
router.get('/counts', helpdeskController.getCounts);

// Admin Endpoints
router.get('/', requireAdmin, helpdeskController.getHelpdeskRequests);
router.patch('/:id/status', requireAdmin, helpdeskController.updateStatus);
router.delete('/:id', requireAdmin, helpdeskController.deleteRequest);

module.exports = router;
