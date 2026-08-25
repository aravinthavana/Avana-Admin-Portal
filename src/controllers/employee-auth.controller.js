const env = require('../config/env');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../utils/notifications');
const prisma = require('../config/db');

// In-memory store for OTPs
const otpStore = new Map();

// Helper to clean up expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otpStore.entries()) {
    if (now > v.expires) otpStore.delete(k);
  }
}, 5 * 60 * 1000).unref();

// Dummy Captcha Endpoint (Legacy UI compatibility)
exports.getCaptcha = (req, res) => {
  // Returns a simple SVG to prevent the UI from breaking, but captcha logic is disabled for security/simplicity.
  const svg = `
    <svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f9fafb" rx="8" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="20" fill="#374151">SECURE</text>
    </svg>
  `;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(svg);
};

exports.sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    // Note: Captcha validation has been explicitly removed per user request.

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    const otpIp = req.socket.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
    otpStore.set(otpIp, { email: email.toLowerCase(), otp, expires });

    const subject = `Your Avana Employee Login OTP`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Avana Login OTP</h2>
        <p>Your One-Time Password is: <strong style="font-size: 24px;">${otp}</strong></p>
        <p>This code will expire in 5 minutes.</p>
      </div>
    `;

    await sendEmail({ to: email, subject, htmlBody });

    // Send success response (don't send OTP to client in prod!)
    res.status(200).json({ success: true, message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('OTP Send Error:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP.' });
  }
};

exports.login = (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP are required.' });
    }

    const otpIp = req.socket.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
    const storedOtpData = otpStore.get(otpIp);

    if (!storedOtpData || Date.now() > storedOtpData.expires) {
      return res.status(400).json({ success: false, error: 'OTP has expired or was not requested.' });
    }

    if (storedOtpData.email !== email.toLowerCase() || storedOtpData.otp !== otp) {
      return res.status(400).json({ success: false, error: 'Invalid OTP.' });
    }

    // Success! Clear the OTP and issue a JWT token.
    otpStore.delete(otpIp);

    const jwtSecret = env.JWT_SECRET;
    const token = jwt.sign({ role: 'employee', email: storedOtpData.email }, jwtSecret, { expiresIn: '8h' });
    
    // Track employee login
    prisma.adminLogin.create({
      data: {
        username: storedOtpData.email,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: 'login'
      }
    }).catch(err => console.error('[Employee Login Audit] Failed to log:', err));

    res.status(200).json({ success: true, message: 'Login successful.', token });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, error: 'An internal error occurred.' });
  }
};

exports.getRequests = async (req, res, next) => {
  try {
    const emailLower = req.user.email.toLowerCase();
    
    const helpdeskService = require('../services/helpdesk.service');
    const bookingService = require('../services/bookings.service');
    const courierService = require('../services/courier-dispatch.service');

    const requests = await helpdeskService.getAllRequests();
    const myRequests = requests
      .filter(r => r.email && r.email.toLowerCase() === emailLower)
      .map(r => ({
        ...r,
        submittedAt: r.createdAt || r.submittedAt || new Date().toISOString(),
        createdAt: r.createdAt || r.submittedAt || new Date().toISOString(),
        created_at: r.createdAt || r.submittedAt || new Date().toISOString(),
      }));

    const bookings = await bookingService.getAllBookings();
    const myBookings = bookings
      .filter(b => b.email && b.email.toLowerCase() === emailLower)
      .map(b => {
        const dateStr = b.createdAt || (b.startDate ? `${b.startDate}T09:00:00.000Z` : new Date().toISOString());
        return {
          id: b.id,
          submittedAt: dateStr,
          createdAt: dateStr,
          created_at: dateStr,
          category: 'conference',
          categoryTitle: 'Conference Room Booking',
          status: b.status,
          description: `Date: ${b.startDate || b.date}, Time: ${b.bookingType === 'full' ? 'Full Day' : `${b.startTime} - ${b.endTime}`}, Reason: ${b.reason || 'N/A'}`,
          details: `Date: ${b.startDate || b.date}, Time: ${b.bookingType === 'full' ? 'Full Day' : `${b.startTime} - ${b.endTime}`}, Reason: ${b.reason || 'N/A'}`
        };
      });

    let myDispatches = [];
    try {
      const dispatches = await courierService.getAllDispatches();
      myDispatches = dispatches
        .filter(d => d.requesterEmail && d.requesterEmail.toLowerCase() === emailLower)
        .map(d => {
          const dateStr = d.submittedAt || d.createdAt || (d.dcDate ? `${d.dcDate}T09:00:00.000Z` : new Date().toISOString());
          return {
            id: d.id,
            submittedAt: dateStr,
            createdAt: dateStr,
            created_at: dateStr,
            category: 'courier_dispatch',
            categoryTitle: 'Courier & Dispatch',
            status: d.status || 'approved',
            description: `DC #${d.dcNo} | To: ${d.receiverName || 'Receiver'} | Transporter: ${d.transporterName || 'N/A'}`,
            details: `DC #${d.dcNo} | To: ${d.receiverName || 'Receiver'} | Transporter: ${d.transporterName || 'N/A'}`
          };
        });
    } catch (dErr) {
      console.error('Error fetching employee dispatches:', dErr);
    }

    const consolidated = [...myRequests, ...myBookings, ...myDispatches].sort(
      (a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt)
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(consolidated);
  } catch (error) {
    console.error('Fetch requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

exports.setPassword = async (req, res, next) => {
  try {
    const email = req.user.email;
    const password = req.body.newPassword || req.body.password;
    const otp = req.body.otp;
    if (!email || !password || !otp) {
      return res.status(400).json({ success: false, error: 'Missing email, password, or OTP.' });
    }

    const otpIp = req.socket.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
    const storedOtpData = otpStore.get(otpIp);

    if (!storedOtpData || Date.now() > storedOtpData.expires) {
      return res.status(400).json({ success: false, error: 'OTP has expired or was not requested.' });
    }

    if (storedOtpData.email !== email.toLowerCase() || storedOtpData.otp !== otp) {
      return res.status(400).json({ success: false, error: 'Invalid OTP.' });
    }

    otpStore.delete(otpIp);

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const newStored = `${salt}:${hash}`;

    const emailLower = email.toLowerCase();
    await prisma.employeeCredential.upsert({
      where: { email: emailLower },
      update: { passwordHash: newStored },
      create: { email: emailLower, passwordHash: newStored }
    });

    res.status(200).json({ success: true, message: 'Password set successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.loginPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Missing email or password.' });
    }

    const emailLower = email.toLowerCase();
    const cred = await prisma.employeeCredential.findUnique({
      where: { email: emailLower }
    });

    if (!cred) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const parts = cred.passwordHash.split(':');
    if (parts.length !== 2) {
      return res.status(401).json({ success: false, error: 'Invalid stored password.' });
    }

    const salt = parts[0];
    const hash = parts[1];
    const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

    if (derivedKey === hash) {
      const jwtSecret = env.JWT_SECRET;
      const token = jwt.sign({ role: 'employee', email: emailLower }, jwtSecret, { expiresIn: '8h' });
    
    // Track employee login
    prisma.adminLogin.create({
      data: {
        username: emailLower,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: 'login'
      }
    }).catch(err => console.error('[Employee Login Audit] Failed to log:', err));
      res.status(200).json({ success: true, message: 'Login successful', token, email: emailLower });
    } else {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }
  } catch (error) {
    next(error);
  }
};
