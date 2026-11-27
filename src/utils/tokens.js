const crypto = require('crypto');
const env = require('../config/env');

/**
 * Constant-time string comparison.
 */
function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generates an HMAC-SHA256 action token bound to a purpose, record ID, and optional salt.
 */
function signActionToken(purpose, id, salt = '') {
  return crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${purpose}:${id}:${salt}`)
    .digest('hex');
}

/**
 * Verifies an HMAC-SHA256 action token in constant time.
 */
function verifyActionToken(purpose, id, token, salt = '') {
  if (!token || typeof token !== 'string') return false;
  const expected = signActionToken(purpose, id, salt);
  return timingSafeEqualStr(token, expected);
}

/**
 * Escapes HTML special characters to prevent XSS in server-rendered HTML and emails.
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  timingSafeEqualStr,
  signActionToken,
  verifyActionToken,
  escapeHtml,
};
