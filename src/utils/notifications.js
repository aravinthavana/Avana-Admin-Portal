const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const https = require('https');

const MOCK_EMAIL_FILE = path.join(__dirname, '../../mock_emails.log');

function logMockEmail(to, cc, subject, html) {
  const timestamp = new Date().toISOString();
  const logMessage = `\n========================================\n[MOCK EMAIL SENT] Time: ${timestamp}\nTo: ${to}\nCC: ${cc || 'None'}\nSubject: ${subject}\n----------------------------------------\nHTML Content:\n${html}\n========================================\n`;
  try {
    fs.appendFileSync(MOCK_EMAIL_FILE, logMessage, 'utf8');
    console.log(`[MOCK EMAIL] Email logged in mock_emails.log for: ${to} (CC: ${cc || 'None'})`);
  } catch (err) {
    console.error('Failed to write mock email:', err);
  }
}

/**
 * Sends an email using Nodemailer. 
 * If SMTP is not configured, it logs the email to a mock file.
 */
exports.sendEmail = async ({ to, cc, bcc, subject, htmlBody, attachments = [] }) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    logMockEmail(to, cc, subject, htmlBody);
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

    const finalAttachments = [...attachments];
    try {
      const primaryLogo = path.join(__dirname, '../assets/logo.png');
      const fallbackLogo = path.join(__dirname, '../../frontend/public/Logo new.png');
      const logoPath = fs.existsSync(primaryLogo) ? primaryLogo : (fs.existsSync(fallbackLogo) ? fallbackLogo : null);
      if (logoPath) {
        finalAttachments.push({
          filename: 'avana-logo.png',
          path: logoPath,
          cid: 'avanalogo'
        });
      }
    } catch (e) {
      console.error('Failed to attach logo:', e);
    }

    const mailOptions = {
      from: `"Avana Admin Portal" <${smtpUser}>`,
      to,
      subject,
      html: htmlBody,
      attachments: finalAttachments
    };
    if (cc) mailOptions.cc = cc;
    if (bcc) mailOptions.bcc = bcc;

    const info = await transporter.sendMail(mailOptions);

    console.log(`Email sent to ${to} (CC: ${cc || 'None'}): ${info.messageId}`);
    return { success: true, info };
  } catch (error) {
    console.error('Nodemailer send error:', error);
    // Removed legacy PowerShell and raw socket fallbacks for security and reliability.
    throw error;
  }
};
