const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');
const addressBookService = require('../services/address-book.service');

// ─── Session helpers ──────────────────────────────────────────
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function createSession(token) {
  const now = new Date().toISOString();
  await prisma.adminSession.create({ data: { token, createdAt: now, lastUsed: now } });
}

async function validateSession(token) {
  if (!token) return false;
  const session = await prisma.adminSession.findUnique({ where: { token } });
  if (!session) return false;
  if (Date.now() - new Date(session.lastUsed).getTime() > SESSION_TTL_MS) {
    await prisma.adminSession.delete({ where: { token } }).catch(() => {});
    return false;
  }
  // Refresh lastUsed
  await prisma.adminSession.update({ where: { token }, data: { lastUsed: new Date().toISOString() } }).catch(() => {});
  return true;
}

async function deleteSession(token) {
  await prisma.adminSession.delete({ where: { token } }).catch(() => {});
}

// Purge sessions older than TTL on server start
async function purgeStaleSessions() {
  const cutoff = new Date(Date.now() - SESSION_TTL_MS).toISOString();
  const result = await prisma.adminSession.deleteMany({ where: { lastUsed: { lt: cutoff } } }).catch(() => ({ count: 0 }));
  if (result.count > 0) console.log(`[Session] Purged ${result.count} stale admin session(s).`);
}
purgeStaleSessions();

// ─── Password helpers ─────────────────────────────────────────
function verifyPassword(password, storedHash) {
  const parts = storedHash.split(':');
  if (parts.length === 2) {
    const [salt, hash] = parts;
    const derived = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return derived === hash;
  }
  // Fallback: plain text (legacy)
  return password === storedHash;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function getAdminPasswordHash() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin';
  try {
    const cred = await prisma.employeeCredential.findUnique({ where: { email: adminEmail } });
    if (cred && cred.passwordHash) return cred.passwordHash;
  } catch (e) {
    console.error('Failed to read admin creds from DB', e);
  }
  return process.env.ADMIN_PASSWORD_HASH || '';
}

async function setAdminPasswordHash(newStored) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin';
  await prisma.employeeCredential.upsert({
    where: { email: adminEmail },
    update: { passwordHash: newStored },
    create: { email: adminEmail, passwordHash: newStored }
  });
  process.env.ADMIN_PASSWORD_HASH = newStored;
}

// ─── Controllers ──────────────────────────────────────────────

exports.resetPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(400).json({ error: 'Invalid admin email.' });
    }
    const tempPassword = crypto.randomBytes(6).toString('hex');
    await setAdminPasswordHash(hashPassword(tempPassword));

    const { sendEmail } = require('../utils/notifications');
    await sendEmail({
      to: email,
      subject: 'Admin Password Reset — Avana Portal',
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
    const currentHash = await getAdminPasswordHash();
    const isMatch = verifyPassword(password, currentHash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await createSession(token);

    // Audit log
    prisma.adminLogin.create({
      data: {
        username: 'admin',
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: 'success'
      }
    }).catch(err => console.error('[Admin Login Audit] Failed to log:', err));

    res.setHeader('Set-Cookie', `admin_token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`);
    return res.status(200).json({ success: true, message: 'Login successful', token });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const token = req.cookies?.admin_token;
    if (token) await deleteSession(token);
    res.setHeader('Set-Cookie', 'admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const currentHash = await getAdminPasswordHash();
    if (!verifyPassword(oldPassword, currentHash)) {
      return res.status(401).json({ error: 'Invalid old password.' });
    }
    await setAdminPasswordHash(hashPassword(newPassword));
    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getLogins = async (req, res, next) => {
  try {
    const logins = await prisma.adminLogin.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.status(200).json(logins);
  } catch (error) {
    next(error);
  }
};

// ─── Middleware ───────────────────────────────────────────────
exports.requireAdmin = async (req, res, next) => {
  let token = req.cookies?.admin_token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
  }
  const valid = await validateSession(token);
  if (!valid) {
    return res.status(401).json({ error: 'Unauthorized. Admin token required.' });
  }
  next();
};

// ─── Global Address Book ─────────────────────────────────────
exports.getGlobalAddresses = async (req, res, next) => {
  try {
    const addresses = await addressBookService.getGlobalAddresses();
    res.json(addresses);
  } catch (err) {
    next(err);
  }
};

exports.saveGlobalAddress = async (req, res, next) => {
  try {
    const saved = await addressBookService.saveAddress('GLOBAL', req.body);
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

exports.deleteGlobalAddress = async (req, res, next) => {
  try {
    const result = await addressBookService.deleteAddress('GLOBAL', req.params.id);
    if (!result) return res.status(404).json({ error: 'Global address not found.' });
    res.json({ message: 'Global address deleted.' });
  } catch (err) {
    next(err);
  }
};
