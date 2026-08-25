const env = require('../config/env');
require('dotenv').config();

module.exports = {
  ADMIN_EMAIL: env.ADMIN_EMAIL,
  NOTIFICATION_CC: process.env.NOTIFICATION_CC || 'cc@avanamedical.com',
  SMTP_FROM: env.SMTP_FROM,
  JWT_SECRET: env.JWT_SECRET,
  APP_URL: env.APP_URL,
};
