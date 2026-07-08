const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');

const MOCK_EMAIL_FILE = path.join(__dirname, '../../mock_emails.log');
const MOCK_SMS_FILE = path.join(__dirname, '../../mock_sms.log');

function logMockEmail(to, subject, html) {
  const timestamp = new Date().toISOString();
  const logMessage = `\n========================================\n[MOCK EMAIL SENT] Time: ${timestamp}\nTo: ${to}\nSubject: ${subject}\n----------------------------------------\nHTML Content:\n${html}\n========================================\n`;
  try {
    fs.appendFileSync(MOCK_EMAIL_FILE, logMessage, 'utf8');
    console.log(`[MOCK EMAIL] Email logged in mock_emails.log for: ${to}`);
  } catch (err) {
    console.error('Failed to write mock email:', err);
  }
}

function logMockSms(to, body) {
  const timestamp = new Date().toISOString();
  const logMessage = `\n========================================\n[MOCK SMS SENT] Time: ${timestamp}\nTo: ${to}\nMessage: ${body}\n========================================\n`;
  try {
    fs.appendFileSync(MOCK_SMS_FILE, logMessage, 'utf8');
    console.log(`[MOCK SMS] SMS logged in mock_sms.log for: ${to}`);
  } catch (err) {
    console.error('Failed to write mock SMS:', err);
  }
}

/**
 * Sends an email using Nodemailer. 
 * If SMTP is not configured, it logs the email to a mock file.
 */
exports.sendEmail = async ({ to, subject, htmlBody }) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    logMockEmail(to, subject, htmlBody);
    return { success: true, info: 'Mock email logged. SMTP not configured.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost || 'smtp.office365.com',
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: true
      }
    });

    const info = await transporter.sendMail({
      from: smtpUser,
      to,
      subject,
      html: htmlBody
    });

    console.log(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, info };
  } catch (error) {
    console.error('Nodemailer send error:', error);
    // Removed legacy PowerShell and raw socket fallbacks for security and reliability.
    throw error;
  }
};

/**
 * Sends an SMS using Twilio REST API without external dependencies.
 */
exports.sendTwilioSms = (to, body) => {
  return new Promise((resolve, reject) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      logMockSms(to, body);
      resolve({ success: true, info: 'Mock SMS logged. Twilio not configured.' });
      return;
    }

    const postData = querystring.stringify({ To: to, From: fromNumber, Body: body });
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, res => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`Twilio SMS sent to: ${to}`);
          resolve(JSON.parse(resBody));
        } else {
          console.error(`Twilio SMS error ${res.statusCode}: ${resBody}`);
          reject(new Error(resBody));
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(postData);
    req.end();
  });
};
