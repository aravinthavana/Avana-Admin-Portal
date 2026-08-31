require('dotenv').config();

module.exports = {
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'Karthicksankar@avanamedical.com',
  NOTIFICATION_CC: process.env.NOTIFICATION_CC || 'srinivasan@avanamedical.com',
  SMTP_FROM: process.env.SMTP_FROM || '"Avana Portal" <noreply@avanamedical.com>',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
};
