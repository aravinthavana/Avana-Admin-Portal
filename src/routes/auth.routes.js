const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// POST /api/admin/login
router.post('/login', authController.login);

// DELETE /api/admin/logout
router.delete('/logout', authController.logout);

module.exports = router;
