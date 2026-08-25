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

const rateLimit = require('express-rate-limit');

// Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Strict Rate Limiter for Auth Routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15, // Limit each IP to 15 login/auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

app.use('/api', globalLimiter);
app.use('/api/admin/login', authLimiter);
app.use('/api/employee/login', authLimiter);
app.use('/api/employee/verify-otp', authLimiter);
app.use('/api/admin/reset-password', authLimiter);

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
const locationController = require('./controllers/location.controller');
app.get('/api/locations', locationController.getLocations);

app.use('/api/bookings', bookingRoutes);
app.use('/api/helpdesk', helpdeskRoutes);
app.use('/api/employee', employeeAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', inventoryRoutes);
app.use('/api/purchase', purchaseRoutes);


// Serve static frontend files (React SPA)
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));
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
