const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// Standard middlewares
// Removed helmet entirely to prevent strict CSP rules from breaking legacy inline event handlers
app.use(cors());
app.use(express.json({ limit: '2mb' })); // Body parser with 2MB limit (like legacy getRequestBody)
app.use(cookieParser());

// Import Routes
const bookingRoutes = require('./routes/bookings.routes');
const helpdeskRoutes = require('./routes/helpdesk.routes');
const employeeAuthRoutes = require('./routes/employee-auth.routes');
const adminRoutes = require('./routes/admin.routes');
const inventoryRoutes = require('./routes/inventory.routes');

// Mount routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/helpdesk', helpdeskRoutes);
app.use('/api/employee', employeeAuthRoutes);
app.use('/api/admin', adminRoutes);
// We will mount inventory routes inside admin routes or directly here
// For now, let's just mount legacy inventory route base if needed
// app.use('/api', inventoryRoutes);

// Serve static frontend files (legacy compatibility)
app.use(express.static(path.join(__dirname, '../public')));

// HTML Aliases (Legacy support)
app.get('/booking', (req, res) => res.sendFile(path.join(__dirname, '../public/booking.html')));
app.get('/helpdesk', (req, res) => res.sendFile(path.join(__dirname, '../public/helpdesk-admin.html'))); // Or whatever it maps to
app.get('/helpdesk-admin', (req, res) => res.sendFile(path.join(__dirname, '../public/helpdesk-admin.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../public/admin.html')));

// 404 Handler
app.use((req, res, next) => {
  console.log(`[404] Method: ${req.method} URL: ${req.originalUrl}`);
  if (req.originalUrl.startsWith('/api')) {
    res.status(404).json({ error: `Endpoint not found: ${req.originalUrl}` });
  } else {
    // Fallback to sending index.html for SPA if you have one, or just a 404 text
    res.status(404).send('404 Not Found');
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Express Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
