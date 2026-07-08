const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// A simple in-memory rate map to prevent brute force (we will move this to Redis later)
const _rateMap = new Map();

function isRateLimited(ip, action, maxRequests, windowMs) {
  const key = `${ip}::${action}`;
  const now = Date.now();
  let entry = _rateMap.get(key);
  if (!entry || now - entry.start > windowMs) {
    entry = { count: 0, start: now };
  }
  entry.count++;
  _rateMap.set(key, entry);
  return entry.count > maxRequests;
}

// Cleanup rate map every 15 minutes
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [k, v] of _rateMap.entries()) {
    if (v.start < cutoff) _rateMap.delete(k);
  }
}, 15 * 60 * 1000).unref();


exports.login = async (req, res, next) => {
  try {
    const loginIp = req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    
    // Rate limit admin login max 10 attempts per IP per 15 minutes
    if (isRateLimited(loginIp, 'admin-login', 10, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many login attempts. Please wait 15 minutes and try again.' });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Verify Password using legacy PBKDF2 logic
    let isMatch = false;
    const currentHash = process.env.ADMIN_PASSWORD_HASH || '';
    const parts = currentHash.split(':');
    
    if (parts.length === 2) {
      const salt = parts[0];
      const hash = parts[1];
      const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
      isMatch = (derivedKey === hash);
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    // Generate JWT Token (replacing the old random hex token)
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
    const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '2h' });

    res.status(200).json({ success: true, token, message: 'Successfully logged in.' });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    // With JWT, logout is usually handled client side by deleting the token.
    // If we want to blacklist tokens, we would implement it here.
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};
