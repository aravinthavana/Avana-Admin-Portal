const express = require('express');
const router = express.Router();
const helpdeskController = require('../controllers/helpdesk.controller');

// Public Endpoints
router.post('/', helpdeskController.createRequest);
router.get('/counts', helpdeskController.getCounts);

// Admin Endpoints
// Note: We will secure these with JWT middleware in the future.
router.get('/', helpdeskController.getHelpdeskRequests);
router.patch('/status', helpdeskController.updateStatus);
router.delete('/', helpdeskController.deleteRequest);

module.exports = router;
