const crypto = require('crypto');
const fs = require('fs');
const path = require('path');


// In-memory sessions (like legacy)
const adminSessions = new Map();

exports.resetPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(400).json({ error: 'Invalid admin email.' });
    }

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = crypto.pbkdf2Sync(tempPassword, newSalt, 100000, 64, 'sha512').toString('hex');
    const newStored = `${newSalt}:${newHash}`;

    // Update .env file
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    if (envContent.includes('ADMIN_PASSWORD_HASH=')) {
      envContent = envContent.replace(/ADMIN_PASSWORD_HASH=.*/, `ADMIN_PASSWORD_HASH=${newStored}`);
    } else {
      envContent += `\nADMIN_PASSWORD_HASH=${newStored}`;
    }
    fs.writeFileSync(envPath, envContent);
    process.env.ADMIN_PASSWORD_HASH = newStored;

    const { sendEmail } = require('../utils/notifications');
    await sendEmail({
      to: email,
      subject: 'Admin Password Reset',
      textBody: `Your temporary admin password is: ${tempPassword}\nPlease login and change it immediately.`,
      htmlBody: `<p>Your temporary admin password is: <strong>${tempPassword}</strong></p><p>Please login and change it immediately.</p>`
    });

    res.status(200).json({ message: 'A temporary password has been sent to the admin email.' });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { password } = req.body;
    let isMatch = false;
    const currentHash = process.env.ADMIN_PASSWORD_HASH || '';
    const parts = currentHash.split(':');
    
    if (parts.length === 2) {
      const salt = parts[0];
      const hash = parts[1];
      const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
      isMatch = (derivedKey === hash);
    } else if (password === process.env.ADMIN_PASSWORD_HASH) {
      // Fallback for plain text if they haven't hashed it yet
      isMatch = true;
    }

    if (isMatch) {
      const token = crypto.randomBytes(32).toString('hex');
      adminSessions.set(token, Date.now());
      
      res.setHeader('Set-Cookie', `admin_token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=3600`);
      return res.status(200).json({ success: true, message: 'Login successful', token: token });
    } else {
      return res.status(401).json({ error: 'Invalid password.' });
    }
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res, next) => {
  try {
    const token = req.cookies?.admin_token;
    if (token) {
      adminSessions.delete(token);
    }
    res.setHeader('Set-Cookie', 'admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    let isMatch = false;
    const currentHash = process.env.ADMIN_PASSWORD_HASH || '';
    const parts = currentHash.split(':');
    
    if (parts.length === 2) {
      const salt = parts[0];
      const hash = parts[1];
      const derivedKey = crypto.pbkdf2Sync(oldPassword, salt, 100000, 64, 'sha512').toString('hex');
      isMatch = (derivedKey === hash);
    } else if (oldPassword === process.env.ADMIN_PASSWORD_HASH) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid old password.' });
    }

    // Generate new hash
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = crypto.pbkdf2Sync(newPassword, newSalt, 100000, 64, 'sha512').toString('hex');
    const newStored = `${newSalt}:${newHash}`;

    // Update .env file
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    if (envContent.includes('ADMIN_PASSWORD_HASH=')) {
      envContent = envContent.replace(/ADMIN_PASSWORD_HASH=.*/, `ADMIN_PASSWORD_HASH=${newStored}`);
    } else {
      envContent += `\nADMIN_PASSWORD_HASH=${newStored}`;
    }
    fs.writeFileSync(envPath, envContent);
    process.env.ADMIN_PASSWORD_HASH = newStored;

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

const prisma = require('../config/db');

exports.getLogins = async (req, res, next) => {
  try {
    const logins = await prisma.adminLogin.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50
    });
    res.status(200).json(logins);
  } catch (error) {
    next(error);
  }
};

// Middleware to protect admin routes
exports.requireAdmin = (req, res, next) => {
  // Try cookie first, then authorization header (Bearer token)
  let token = req.cookies?.admin_token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized. Admin token required.' });
  }
  
  const timestamp = adminSessions.get(token);
  if (Date.now() - timestamp > 3600000) { // 1 hour
    adminSessions.delete(token);
    return res.status(401).json({ error: 'Session expired.' });
  }
  adminSessions.set(token, Date.now()); // refresh
  next();
};
