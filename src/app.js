const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.json({ limit: '2mb' })); // Body parser with 2MB limit (like legacy getRequestBody)
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Import Routes
const bookingRoutes = require('./routes/bookings.routes');
const helpdeskRoutes = require('./routes/helpdesk.routes');
const employeeAuthRoutes = require('./routes/employee-auth.routes');
const adminRoutes = require('./routes/admin.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const purchaseRoutes = require('./routes/purchase.routes');

// Public Asset Acknowledgement Routes
const assetTrackerController = require('./controllers/asset-tracker.controller');
app.get('/api/assets/acknowledgement/:id', assetTrackerController.getAckDetails);
app.post('/api/assets/acknowledgement/:id', assetTrackerController.submitAck);

// Delivery Challan & Courier Merge Public Routes
const courierController = require('./controllers/courier-dispatch.controller');
app.get('/api/courier-dispatches/dc-print/:id', courierController.printDeliveryChallan);
app.get('/api/courier-dispatch/merge/accept', courierController.acceptMergeRequest);
app.get('/api/courier-dispatch/merge/reject-page', courierController.serveRejectPage);
app.post('/api/courier-dispatch/merge/reject', courierController.rejectMergeRequest);

// Mount routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/helpdesk', helpdeskRoutes);
app.use('/api/employee', employeeAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', inventoryRoutes);
app.use('/api/purchase', purchaseRoutes);

// Serve static frontend files (React SPA)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 404 Handler
app.use((req, res, next) => {
  console.log(`[404] Method: ${req.method} URL: ${req.originalUrl}`);
  if (req.originalUrl.startsWith('/api')) {
    res.status(404).json({ error: `Endpoint not found: ${req.originalUrl}` });
  } else {
    // Fallback to sending index.html for React SPA routing
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
});

// Prisma Error Handler
const prismaErrorHandler = require('./middlewares/prisma-error.middleware');
app.use(prismaErrorHandler);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Express Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
