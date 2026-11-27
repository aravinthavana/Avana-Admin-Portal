require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && (!jwtSecret || jwtSecret === 'fallback-secret-key-change-in-production')) {
  throw new Error('FATAL: JWT_SECRET must be set to a strong secret in production.');
}

module.exports = {
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'Karthicksankar@avanamedical.com',
  NOTIFICATION_CC: process.env.NOTIFICATION_CC || '',
  SMTP_FROM: process.env.SMTP_FROM || '"Avana Portal" <noreply@avanamedical.com>',
  JWT_SECRET: jwtSecret || 'dev-only-jwt-secret-change-in-production',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
};
