const env = require('../config/env');

/**
 * email-templates.js
 * 
 * Central email template builder for the Avana Group Admin Request Portal.
 * Uses strict Avana brand design system:
 * - Brand Amber: #b27f0d (Hover: #8b6209, Soft bg: #fdf5e6)
 * - Brand Charcoal: #172025
 * - Canvas Background: #f5f5f7
 * - Card Surface: #ffffff
 * - Border: #e4e4e7
 * - Fully mobile-responsive across all email clients
 * - Zero emojis across all templates and subject lines
 */

const APP_URL = env.APP_URL || 'http://172.30.10.21:8086';

function extractHelpdeskDetails(request) {
  let itemsArr = request.items;
  let extraFields = {};
  if (typeof itemsArr === 'string' && itemsArr.trim() !== '') {
    try { itemsArr = JSON.parse(itemsArr); } catch(e) {}
  }
  
  if (itemsArr && typeof itemsArr === 'object' && !Array.isArray(itemsArr)) {
     extraFields = itemsArr;
     itemsArr = null;
  }

  let detailsText = '';
  if (Array.isArray(itemsArr) && itemsArr.length) {
    detailsText = itemsArr.map(it => `• <strong>${it.item || it.name || 'Item'}</strong> &times; ${it.quantity || it.qty || 1}`).join('<br/>');
  } else if (request.item) {
    detailsText = `${request.stationery_type || 'Item'}: <strong>${request.item}</strong> &times; ${request.quantity || 1}`;
  } else {
    detailsText = request.exact_issue || request.description || 'N/A';
  }
  
  const subcategory = request.subcategory || request.item_type || extraFields.request_type || extraFields.support_type || extraFields.service_type || extraFields.issue_type || 'N/A';
  const floor = request.floor || request.location || extraFields.floor || extraFields.location || 'N/A';
  const remarks = request.remarks || extraFields.remarks || 'None';
  
  return { detailsText, subcategory, floor, remarks };
}

// ── Branded Mobile-Responsive Wrapper ──────────────────────────────────────────
function buildEmail({ title, subtitle = 'Avana Group — Admin Operations Hub', accentColor = '#b27f0d', bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>${title}</title>
  <style type="text/css">
    /* Client Resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #172025; }

    /* Mobile Responsive Styles */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 8px 4px !important;
      }
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 6px !important;
      }
      .fluid-padding {
        padding: 20px 16px !important;
      }
      .header-padding {
        padding: 16px 16px !important;
      }
      .header-logo {
        width: 55px !important;
        height: 21px !important;
        max-width: 55px !important;
        max-height: 21px !important;
      }
      .header-title {
        font-size: 16px !important;
      }
      .footer-padding {
        padding: 16px 16px !important;
      }
      .table-cell-stack {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .table-label {
        background-color: #fbfbfb !important;
        color: #71717a !important;
        font-size: 11px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.04em !important;
        padding: 8px 12px 2px 12px !important;
        border-bottom: none !important;
      }
      .table-value {
        padding: 2px 12px 10px 12px !important;
        border-bottom: 1px solid #e4e4e7 !important;
        font-size: 13.5px !important;
      }
      .mobile-btn {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 12px 16px !important;
        text-align: center !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
      .mobile-btn-stack {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
      }
      .mobile-btn-stack a {
        margin-right: 0 !important;
        margin-bottom: 8px !important;
      }
      .otp-box {
        padding: 16px 10px !important;
      }
      .otp-code {
        font-size: 28px !important;
        letter-spacing: 6px !important;
      }
      .scroll-table-wrap {
        width: 100% !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        display: block !important;
      }
      .scroll-table {
        min-width: 440px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-wrapper" style="background-color: #f5f5f7; padding: 24px 8px; width: 100%;">
    <tr>
      <td align="center" style="vertical-align: top;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); margin: 0 auto;">

          <!-- ── Branded Header (Dark Charcoal with White Logo) ── -->
          <tr>
            <td class="header-padding" style="background-color: #172025; padding: 20px 24px; border-bottom: 3px solid ${accentColor};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle; text-align: left;">
                    <div style="font-size: 10px; font-weight: 800; color: #b27f0d; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 2px;">
                      Avana Group
                    </div>
                    <div class="header-title" style="font-weight: 700; font-size: 18px; color: #ffffff; letter-spacing: -0.01em; line-height: 1.25;">
                      Admin Request Portal
                    </div>
                    <div style="font-size: 12px; color: #cbd5e1; margin-top: 3px; font-weight: 500;">
                      ${subtitle}
                    </div>
                  </td>
                  <td width="75" align="right" style="vertical-align: middle; text-align: right; width: 75px; min-width: 75px; max-width: 80px; padding-left: 12px;">
                    <img src="cid:avanalogo" alt="Avana" width="65" height="25" border="0" class="header-logo" style="width: 65px; height: 25px; max-width: 65px; max-height: 25px; display: block; margin-left: auto; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Email Body Content ── -->
          <tr>
            <td class="fluid-padding" style="padding: 26px 26px; color: #172025; line-height: 1.6; font-size: 14px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- ── Branded Footer ── -->
          <tr>
            <td class="footer-padding" style="background-color: #fafafa; border-top: 1px solid #e4e4e7; padding: 18px 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #71717a; line-height: 1.5;">
                This is an automated notification from the <strong>Avana Group — Admin Operations Hub</strong>.
                Please do not reply directly to this email.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #a1a1aa;">
                &copy; ${new Date().getFullYear()} Avana Group. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Shared Table and Element Styles ──────────────────────────────────────────
const TABLE_WRAP = `width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; border: 1px solid #e4e4e7; border-radius: 6px; overflow: hidden;`;
const TD_LABEL = `padding: 10px 14px; font-weight: 600; font-size: 13px; border-bottom: 1px solid #e4e4e7; width: 34%; color: #52525b; background-color: #fafafa; vertical-align: top;`;
const TD_VALUE = `padding: 10px 14px; border-bottom: 1px solid #e4e4e7; color: #172025; background-color: #ffffff; vertical-align: top; word-break: break-word;`;
const TD_VALUE_ALT = `padding: 10px 14px; border-bottom: 1px solid #e4e4e7; color: #172025; background-color: #fafafa; vertical-align: top; word-break: break-word;`;

function tableRow(label, value, alt = false) {
  return `
    <tr>
      <td class="table-cell-stack table-label" style="${TD_LABEL}">${label}</td>
      <td class="table-cell-stack table-value" style="${alt ? TD_VALUE_ALT : TD_VALUE}">${value !== undefined && value !== null && value !== '' ? value : 'N/A'}</td>
    </tr>`;
}

function highlightBox(text, color = '#b27f0d', bg = '#fdf5e6') {
  return `<div style="background-color: ${bg}; border-left: 4px solid ${color}; padding: 13px 15px; margin: 16px 0; border-radius: 6px; font-size: 13px; line-height: 1.5; color: #172025; word-break: break-word;">${text}</div>`;
}

function statusBadge(text, variant = 'neutral') {
  let bg = '#f4f4f5';
  let color = '#3f3f46';
  let border = '#e4e4e7';

  if (variant === 'approved' || variant === 'success' || variant === 'completed') {
    bg = '#f0fdf4';
    color = '#16a34a';
    border = '#bbf7d0';
  } else if (variant === 'pending' || variant === 'warning') {
    bg = '#fdf5e6';
    color = '#b27f0d';
    border = '#fde68a';
  } else if (variant === 'rejected' || variant === 'danger' || variant === 'cancelled') {
    bg = '#fef2f2';
    color = '#dc2626';
    border = '#fecaca';
  } else if (variant === 'info') {
    bg = '#eff6ff';
    color = '#2563eb';
    border = '#bfdbfe';
  }

  return `<span style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11.5px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; background-color: ${bg}; color: ${color}; border: 1px solid ${border};">${text}</span>`;
}

function actionButton(label, url, color = '#b27f0d', textColor = '#ffffff') {
  return `<p style="margin: 22px 0 8px 0; text-align: center;">
    <a href="${url}" target="_blank" class="mobile-btn" style="display: inline-block; padding: 11px 24px; background-color: ${color}; color: ${textColor}; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; letter-spacing: 0.01em;">${label}</a>
  </p>`;
}

// ── Individual Email Templates ────────────────────────────────────────────────

const templates = {

  // 1. Employee OTP Login
  employeeOTP({ otp, email }) {
    return buildEmail({
      title: 'Your Login Verification Code',
      subtitle: 'Employee Sign-In Verification',
      accentColor: '#b27f0d',
      bodyHtml: `
        <p style="margin: 0 0 14px 0; font-size: 14.5px;">Hello,</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          A sign-in request was initiated for <strong>${email}</strong> on the <strong>Avana Group Admin Request Portal</strong>. Please enter the verification code below to complete your authentication.
        </p>
        <div class="otp-box" style="background-color: #172025; border: 1px solid #e4e4e7; border-radius: 8px; text-align: center; padding: 22px 0; margin: 20px 0;">
          <div style="font-size: 11px; font-weight: 700; color: #b27f0d; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px;">One-Time Passcode</div>
          <div class="otp-code" style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: 'Consolas', 'Courier New', monospace;">${otp}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Valid for 5 minutes</div>
        </div>
        ${highlightBox('Notice: For security, never share this one-time code with anyone. If you did not request this login, please ignore this email.', '#b27f0d', '#fdf5e6')}
      `,
    });
  },

  // 2. Admin Password Reset OTP
  adminResetOTP({ otp, adminEmail }) {
    return buildEmail({
      title: 'Admin Password Reset Code',
      subtitle: 'Administrative Security Verification',
      accentColor: '#b27f0d',
      bodyHtml: `
        <p style="margin: 0 0 14px 0; font-size: 14.5px;">Hello Administrator,</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          A password reset was requested for the portal administrator account <strong>${adminEmail}</strong>. Use the 6-digit verification code below to reset your password.
        </p>
        <div class="otp-box" style="background-color: #172025; border: 1px solid #e4e4e7; border-radius: 8px; text-align: center; padding: 22px 0; margin: 20px 0;">
          <div style="font-size: 11px; font-weight: 700; color: #b27f0d; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px;">Password Reset Code</div>
          <div class="otp-code" style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: 'Consolas', 'Courier New', monospace;">${otp}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Valid for 10 minutes</div>
        </div>
        ${highlightBox('Security Notice: If you did not request this password reset, please secure your administrative credentials immediately.', '#dc2626', '#fef2f2')}
      `,
    });
  },

  // 2.1 Admin Temporary Password (Reset Password direct)
  adminTemporaryPassword({ tempPassword, adminEmail }) {
    return buildEmail({
      title: 'Admin Temporary Access Credentials',
      subtitle: 'Administrative Security Notice',
      accentColor: '#b27f0d',
      bodyHtml: `
        <p style="margin: 0 0 14px 0; font-size: 14.5px;">Hello Administrator,</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          A temporary access password has been generated for your administrator account <strong>${adminEmail}</strong> on the Avana Group Admin Request Portal.
        </p>
        <div class="otp-box" style="background-color: #172025; border: 1px solid #e4e4e7; border-radius: 8px; text-align: center; padding: 22px 0; margin: 20px 0;">
          <div style="font-size: 11px; font-weight: 700; color: #b27f0d; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px;">Temporary Admin Password</div>
          <div style="font-size: 24px; font-weight: 800; letter-spacing: 3px; color: #ffffff; font-family: 'Consolas', 'Courier New', monospace; word-break: break-all;">${tempPassword}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Log in and change immediately</div>
        </div>
        ${highlightBox('Action Required: Please log into the Admin portal immediately using this temporary password and update your credentials under Settings.', '#b27f0d', '#fdf5e6')}
        ${actionButton('Sign In to Admin Portal', `${APP_URL}/admin`, '#b27f0d')}
      `,
    });
  },

  // 3. Booking Request Received — to Employee (Pending Approval)
  bookingSubmitted({ booking, host }) {
    const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
    const start = booking.startDate || booking.date;
    const end = booking.endDate || booking.date;
    const dateText = start === end ? start : `${start} to ${end}`;
    const foodText = booking.food === 'none' || !booking.food
      ? 'No Food'
      : `${booking.food === 'others' ? `Other (${booking.foodSpecify || ''})` : booking.food} (Count: ${booking.foodCount || 0})`;
    const cancelUrl = `${host || APP_URL}/api/bookings/cancel?id=${booking.id}&email=${encodeURIComponent(booking.email)}&sig=${booking.cancelSig || ''}`;

    return buildEmail({
      title: 'Conference Room Booking Request Received',
      subtitle: 'Booking Request Awaiting Approval',
      accentColor: '#b45309',
      bodyHtml: `
        <p style="margin: 0 0 6px 0;">Dear ${booking.name},</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          Your conference room reservation request has been received and is currently under review by the Admin team. You will receive an email once the request is approved.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Booking Requester', booking.name)}
          ${tableRow('Date', dateText, true)}
          ${tableRow('Schedule / Time', timeText)}
          ${tableRow('Meeting Purpose', booking.reason, true)}
          ${tableRow('Food Arrangement', foodText)}
          ${tableRow('Contact Phone', booking.phone, true)}
          ${tableRow('Status', statusBadge('Pending Approval', 'pending'))}
        </table>
        <p style="margin: 16px 0; font-size: 13.5px; color: #52525b;">Please wait for final admin confirmation before proceeding with your meeting arrangements.</p>
        <div style="border-top: 1px solid #e4e4e7; padding-top: 18px; margin-top: 16px; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 12.5px; color: #71717a;">Need to cancel this reservation request?</p>
          ${actionButton('Cancel Reservation Request', cancelUrl, '#dc2626')}
        </div>
      `,
    });
  },

  // 4. Booking Confirmation to Employee
  bookingConfirmation({ booking, host }) {
    const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
    const start = booking.startDate || booking.date;
    const end = booking.endDate || booking.date;
    const dateText = start === end ? start : `${start} to ${end}`;
    const foodText = booking.food === 'none' || !booking.food
      ? 'No Food'
      : `${booking.food === 'others' ? `Other (${booking.foodSpecify || ''})` : booking.food} (Count: ${booking.foodCount || 0})`;
    const cancelUrl = `${host || APP_URL}/api/bookings/cancel?id=${booking.id}&email=${encodeURIComponent(booking.email)}&sig=${booking.cancelSig || ''}`;

    return buildEmail({
      title: 'Conference Room Booking Confirmed',
      subtitle: 'Conference Room Reservation Confirmed',
      accentColor: '#16a34a',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Reservation Confirmed', 'approved')}
        </div>
        <p style="margin: 12px 0 6px 0;">Dear ${booking.name},</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          Your request for the conference room has been received, and the room has been successfully reserved for your meeting.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Booking Requester', booking.name)}
          ${tableRow('Date', dateText, true)}
          ${tableRow('Schedule / Time', timeText)}
          ${tableRow('Meeting Purpose', booking.reason, true)}
          ${tableRow('Food Arrangement', foodText)}
          ${tableRow('Contact Phone', booking.phone, true)}
          ${tableRow('Status', statusBadge('Confirmed', 'approved'))}
        </table>
        ${highlightBox('<strong>Meeting Guidelines:</strong> After completing the session, kindly ensure that lights, air conditioning, and displays are switched off. Please remove meeting materials and leave the room clean.', '#b27f0d', '#fdf5e6')}
        <div style="border-top: 1px solid #e4e4e7; padding-top: 18px; margin-top: 16px; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 12.5px; color: #71717a;">For cancellation of room, please click below:</p>
          ${actionButton('Cancel Reservation', cancelUrl, '#dc2626')}
        </div>
      `,
    });
  },

  // 5. New Booking Alert to Admin
  bookingAdminAlert({ booking, host }) {
    const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
    const start = booking.startDate || booking.date;
    const end = booking.endDate || booking.date;
    const dateText = start === end ? start : `${start} to ${end}`;

    return buildEmail({
      title: 'New Conference Room Reservation Request',
      subtitle: 'Admin Action Required',
      accentColor: '#b27f0d',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('New Request Awaiting Review', 'pending')}
        </div>
        <p style="margin: 0 0 16px 0; color: #52525b; line-height: 1.5;">
          An employee has submitted a new conference room reservation request. Please review the details and confirm or reschedule.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Requester Name', booking.name)}
          ${tableRow('Email Address', booking.email, true)}
          ${tableRow('Phone', booking.phone)}
          ${tableRow('Date', dateText, true)}
          ${tableRow('Schedule / Time', timeText)}
          ${tableRow('Meeting Purpose', booking.reason, true)}
          ${(() => {
            let att = booking.attendees;
            if (typeof att === 'string') { try { att = JSON.parse(att); } catch (e) { att = [att]; } }
            return att && att.length ? tableRow('Attendees', att.join(', ')) : '';
          })()}
        </table>
        ${actionButton('Review in Admin Portal', `${host || APP_URL}/admin`, '#b27f0d')}
      `,
    });
  },

  // 6. Booking Approval Confirmation to Employee
  bookingApproved({ booking, host, approvalRemarks }) {
    const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
    const start = booking.startDate || booking.date;
    const end = booking.endDate || booking.date;
    const dateText = start === end ? start : `${start} to ${end}`;
    const foodText = booking.food === 'none' || !booking.food
      ? 'No Food'
      : `${booking.food} (Count: ${booking.foodCount || 0})`;
    const cancelUrl = `${host || APP_URL}/api/bookings/cancel?id=${booking.id}&email=${encodeURIComponent(booking.email)}&sig=${booking.cancelSig || ''}`;

    return buildEmail({
      title: 'Conference Room Booking Confirmed',
      subtitle: 'Booking Request Approved',
      accentColor: '#16a34a',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Booking Approved & Confirmed', 'approved')}
        </div>
        <p style="margin: 12px 0 6px 0;">Dear ${booking.name},</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          Your request for the conference room has been reviewed and officially confirmed by the Admin team.
        </p>
        ${approvalRemarks ? highlightBox(`<strong>Admin Remarks:</strong> ${approvalRemarks}`, '#16a34a', '#f0fdf4') : ''}
        <table style="${TABLE_WRAP}">
          ${tableRow('Date', dateText)}
          ${tableRow('Schedule / Time', timeText, true)}
          ${tableRow('Meeting Purpose', booking.reason)}
          ${tableRow('Food Arrangement', foodText, true)}
          ${tableRow('Status', statusBadge('Confirmed', 'approved'))}
        </table>
        ${highlightBox('<strong>Meeting Guidelines:</strong> After completing the meeting, kindly ensure that the lights, AC, and displays are switched off. Please remove meeting materials and keep the room tidy.', '#b27f0d', '#fdf5e6')}
        <div style="border-top: 1px solid #e4e4e7; padding-top: 18px; margin-top: 16px; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 12.5px; color: #71717a;">If you need to release this room, please click below:</p>
          ${actionButton('Cancel Reservation', cancelUrl, '#dc2626')}
        </div>
      `,
    });
  },

  // 7. Booking Rejected — to Employee
  bookingRejected({ booking, reason }) {
    const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
    const start = booking.startDate || booking.date;
    const end = booking.endDate || booking.date;
    const dateText = start === end ? start : `${start} to ${end}`;

    return buildEmail({
      title: 'Conference Room Booking Declined',
      subtitle: 'Booking Request Status',
      accentColor: '#dc2626',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Booking Request Declined', 'danger')}
        </div>
        <p style="margin: 12px 0 6px 0;">Dear ${booking.name},</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          We regret to inform you that your request to book the conference room could not be approved at this time.
        </p>
        ${highlightBox(`<strong>Reason for Decline:</strong><br/>${reason || 'The requested slot is unavailable or conflicts with another event.'}`, '#dc2626', '#fef2f2')}
        <table style="${TABLE_WRAP}">
          ${tableRow('Date', dateText)}
          ${tableRow('Schedule / Time', timeText, true)}
          ${tableRow('Purpose', booking.reason)}
          ${tableRow('Status', statusBadge('Declined', 'danger'), true)}
        </table>
        <p style="margin: 16px 0 0 0; color: #71717a; font-size: 13px;">
          Please check the room availability calendar on the portal to find an alternative time slot.
        </p>
      `,
    });
  },

  // 8. Booking Cancelled — to Employee
  bookingCancelled({ booking }) {
    const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
    const start = booking.startDate || booking.date;
    const end = booking.endDate || booking.date;
    const dateText = start === end ? start : `${start} to ${end}`;

    return buildEmail({
      title: 'Conference Room Booking Cancelled',
      subtitle: 'Reservation Slot Released',
      accentColor: '#52525b',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Reservation Cancelled', 'neutral')}
        </div>
        <p style="margin: 12px 0 6px 0;">Dear ${booking.name},</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          This email confirms that your conference room reservation has been cancelled and the slot has been released.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Date', dateText)}
          ${tableRow('Schedule / Time', timeText, true)}
          ${tableRow('Purpose', booking.reason)}
          ${tableRow('Status', statusBadge('Cancelled', 'neutral'), true)}
        </table>
        ${actionButton('Make a New Reservation', `${APP_URL}/booking`, '#b27f0d')}
      `,
    });
  },

  // 9. Booking Cancellation Alert — to Admin
  bookingCancelledAdminAlert({ booking }) {
    const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
    const start = booking.startDate || booking.date;
    const end = booking.endDate || booking.date;
    const dateText = start === end ? start : `${start} to ${end}`;

    return buildEmail({
      title: 'Conference Room Booking Cancelled',
      subtitle: 'Schedule Slot Released',
      accentColor: '#52525b',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Reservation Cancelled by Requester', 'neutral')}
        </div>
        <p style="margin: 0 0 16px 0; color: #52525b;">
          A conference room booking has been cancelled by the employee. The slot is now open for bookings.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Cancelled By', `${booking.name} (${booking.email})`)}
          ${tableRow('Date', dateText, true)}
          ${tableRow('Schedule / Time', timeText)}
          ${tableRow('Meeting Purpose', booking.reason, true)}
        </table>
      `,
    });
  },

  // 10. Helpdesk Request Submission — to Employee
  helpdeskSubmission(request) {
    const { detailsText, subcategory, floor, remarks } = extractHelpdeskDetails(request);
    const catTitle = request.categoryTitle || request.category;

    return buildEmail({
      title: `Help Desk Request #${request.id} Submitted`,
      subtitle: 'Service Request Confirmation',
      accentColor: '#b27f0d',
      bodyHtml: `
        <p style="margin: 0 0 8px 0;">Hello ${request.requester_name || request.name || 'Colleague'},</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          Your help desk service request has been successfully recorded. The Admin team has been notified and will attend to your request promptly.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Service Request No', `<strong style="color: #b27f0d;">#${request.id}</strong>`)}
          ${tableRow('Category', catTitle, true)}
          ${tableRow('Sub-Type / Priority', subcategory)}
          ${tableRow('Floor / Location', floor, true)}
          ${tableRow('Details / Items', detailsText)}
          ${tableRow('Remarks', remarks, true)}
          ${tableRow('Submitted By', request.requester_name || request.name || 'N/A')}
          ${tableRow('Status', statusBadge('Submitted', 'pending'), true)}
        </table>
        <p style="margin: 20px 0 0 0; font-size: 13px; color: #71717a; text-align: center; border-top: 1px solid #e4e4e7; padding-top: 16px;">
          You can track the progress of this request directly on the Avana Group Admin Request Portal.
        </p>
      `,
    });
  },

  // 11. Helpdesk Request Alert — to Admin
  helpdeskAdminAlert(request, host) {
    const { detailsText, subcategory, floor, remarks } = extractHelpdeskDetails(request);
    const catTitle = request.categoryTitle || request.category;

    return buildEmail({
      title: `New Help Desk Request: ${catTitle} (#${request.id})`,
      subtitle: 'Admin Action Required',
      accentColor: '#b27f0d',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('New Service Ticket', 'pending')}
        </div>
        <p style="margin: 0 0 16px 0; color: #52525b; line-height: 1.5;">
          A new employee service request has been logged. Please review the ticket and assign or resolve it.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Request ID', `<strong style="color: #b27f0d;">#${request.id ? request.id.slice(0,8).toUpperCase() : 'N/A'}</strong>`)}
          ${tableRow('Category', catTitle, true)}
          ${tableRow('Sub-Type', subcategory)}
          ${tableRow('Location / Floor', floor, true)}
          ${tableRow('Details', detailsText)}
          ${tableRow('Remarks', remarks, true)}
          ${tableRow('Submitted By', request.requester_name || request.name || 'N/A')}
          ${tableRow('Contact', `${request.email || 'N/A'} / ${request.phone || 'N/A'}`, true)}
        </table>
        ${actionButton('Open Admin Dashboard', `${host || APP_URL}/helpdesk-admin`, '#b27f0d')}
      `,
    });
  },

  // 12. Courier Dispatch Submission — to Employee
  courierDispatchSubmission(dispatch) {
    const itemsList = Array.isArray(dispatch.items) && dispatch.items.length 
      ? dispatch.items.map(it => `• ${it.description} (Qty: ${it.qty})`).join('<br/>')
      : 'N/A';

    return buildEmail({
      title: `Delivery Challan #${dispatch.dcNo} Generated`,
      subtitle: 'Courier Dispatch Confirmation',
      accentColor: '#b27f0d',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Delivery Challan Generated', 'pending')}
        </div>
        <p style="margin: 0 0 8px 0;">Hello ${dispatch.senderName || 'Employee'},</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          Your courier dispatch documentation has been successfully created. The Delivery Challan details are summarized below:
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('DC Number', `<strong style="color: #b27f0d;">#${dispatch.dcNo}</strong>`)}
          ${tableRow('DC Date', dispatch.dcDate, true)}
          ${tableRow('Sender', `${dispatch.senderName} (${dispatch.senderPhone || 'N/A'})`)}
          ${tableRow('Receiver', `${dispatch.receiverName} (${dispatch.receiverPhone || 'N/A'})`, true)}
          ${tableRow('Destination Address', dispatch.toAddress)}
          ${tableRow('Origin Address', dispatch.fromAddressText, true)}
          ${tableRow('Transporter', dispatch.transporterName || 'Pending Assignment')}
          ${tableRow('No. of Boxes', dispatch.noOfBoxes || 1, true)}
          ${dispatch.ccEmails ? tableRow('CC Recipients', dispatch.ccEmails) : ''}
          ${tableRow('Items Dispatched', itemsList, !dispatch.ccEmails)}
        </table>
        <p style="margin: 20px 0 0 0; font-size: 13px; color: #71717a; text-align: center; border-top: 1px solid #e4e4e7; padding-top: 16px;">
          Please retain the attached DC document copy for your records. The Admin team has been notified.
        </p>
      `,
    });
  },

  // 13. Courier Dispatch Alert — to Admin
  courierDispatchAdminAlert(dispatch, host) {
    return buildEmail({
      title: `New Courier Dispatch Record (#${dispatch.dcNo})`,
      subtitle: 'Courier Management Notice',
      accentColor: '#b27f0d',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('New Courier Dispatch', 'pending')}
        </div>
        <p style="margin: 0 0 16px 0; color: #52525b; line-height: 1.5;">
          A new Courier Dispatch / Delivery Challan has been created by <strong>${dispatch.senderName}</strong>.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('DC Number', `<strong style="color: #b27f0d;">#${dispatch.dcNo}</strong>`)}
          ${tableRow('Sender', `${dispatch.senderName} (${dispatch.requesterEmail || 'N/A'})`, true)}
          ${tableRow('Receiver', `${dispatch.receiverName} - ${dispatch.toAddress}`)}
          ${tableRow('Transporter', dispatch.transporterName || 'Unassigned', true)}
          ${tableRow('No. of Boxes', dispatch.noOfBoxes || 1)}
          ${dispatch.ccEmails ? tableRow('CC Recipients', dispatch.ccEmails, true) : ''}
        </table>
        ${actionButton('View in Admin Portal', `${host || APP_URL}/admin`, '#b27f0d')}
      `,
    });
  },

  // 14. Courier Consignment Dispatched with Tracking Info
  courierTrackingUpdated({ dcNo, senderName, receiverName, toAddress, transporterName, docketNo, trackingLinkHtml }) {
    return buildEmail({
      title: `Courier Tracking Details — DC #${dcNo}`,
      subtitle: 'Courier Consignment Dispatched',
      accentColor: '#b27f0d',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Consignment Dispatched', 'info')}
        </div>
        <p style="margin: 0 0 8px 0;">Hello,</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          Your courier shipment has been handed over to the logistics partner. The tracking details for Delivery Challan <strong>#${dcNo}</strong> are below:
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('DC Number', `<strong style="color: #b27f0d;">#${dcNo}</strong>`)}
          ${tableRow('Sender', senderName, true)}
          ${tableRow('Receiver', `${receiverName} (${toAddress})`)}
          ${tableRow('Courier Partner', transporterName, true)}
          ${tableRow('Tracking / Docket No', `<strong>${docketNo || 'N/A'}</strong>`)}
          ${tableRow('Tracking Link', trackingLinkHtml, true)}
        </table>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e4e4e7; font-size: 13px; color: #52525b; line-height: 1.5;">
          <p style="margin: 0 0 4px 0; font-weight: 700; color: #172025;">Admin & Travel Desk</p>
          <p style="margin: 0 0 4px 0;">Avana Group Operations</p>
          <p style="margin: 0; color: #71717a;">For courier inquiries or updates, please reach out to the Admin Desk.</p>
        </div>
      `,
    });
  },

  // 15. Courier Parcel Merge Request
  courierMergeRequest({ target, requesterName, requesterEmail, items, acceptUrl, rejectUrl }) {
    const itemsList = (items || []).map(it => `• <strong>${it.qty || 1} &times; ${it.description || 'Item'}</strong> (Value: ₹${it.value || 0})`).join('<br/>');

    return buildEmail({
      title: `Parcel Merge Request — DC #${target.dcNo}`,
      subtitle: 'Consignment Merge Approval Required',
      accentColor: '#b27f0d',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Parcel Merge Requested', 'pending')}
        </div>
        <p style="margin: 0 0 8px 0;">Hello <strong>${target.senderName || 'Colleague'}</strong>,</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          <strong>${requesterName}</strong> (${requesterEmail}) has requested to merge their dispatch items into your active Delivery Challan (<strong>DC #${target.dcNo}</strong>) heading to the same destination.
        </p>
        <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 16px; margin: 16px 0;">
          <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; color: #71717a; margin-bottom: 8px;">Requested Items to Merge:</div>
          <div style="font-size: 13.5px; color: #172025; line-height: 1.6;">
            ${itemsList || 'No item descriptions provided.'}
          </div>
        </div>
        <p style="margin: 20px 0 16px 0; font-size: 13.5px; color: #52525b;">
          Please review the request and indicate whether these items should be consolidated into your parcel:
        </p>
        <div class="mobile-btn-stack" style="text-align: center; margin: 24px 0;">
          <a href="${acceptUrl}" target="_blank" class="mobile-btn" style="display: inline-block; padding: 11px 24px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; margin-right: 10px;">Accept Merge</a>
          <a href="${rejectUrl}" target="_blank" class="mobile-btn" style="display: inline-block; padding: 11px 24px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px;">Decline Merge</a>
        </div>
      `,
    });
  },

  // 16. Courier Merge Accepted — to Requester
  courierMergeAcceptedRequester({ target, dcNo }) {
    return buildEmail({
      title: `Merge Request Accepted — DC #${dcNo}`,
      subtitle: 'Parcel Consignment Merged',
      accentColor: '#16a34a',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Merge Request Accepted', 'approved')}
        </div>
        <p style="margin: 0 0 16px 0; color: #52525b; line-height: 1.5;">
          Your parcel merge request has been accepted by <strong>${target.requesterEmail || target.senderName}</strong>.
        </p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          Your items have been merged into Delivery Challan <strong>#${dcNo}</strong>. The updated Delivery Challan document is attached for your reference.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Consolidated DC Number', `<strong>#${dcNo}</strong>`)}
          ${tableRow('Primary Dispatch Owner', target.senderName || target.requesterEmail, true)}
          ${tableRow('Status', statusBadge('Merged into DC', 'approved'))}
        </table>
      `,
    });
  },

  // 17. Courier Merge Accepted — to Owner
  courierMergeAcceptedOwner({ target, dcNo }) {
    return buildEmail({
      title: `Parcel Merged into DC #${dcNo}`,
      subtitle: 'Delivery Challan Updated',
      accentColor: '#16a34a',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Parcel Consolidation Successful', 'approved')}
        </div>
        <p style="margin: 0 0 16px 0; color: #52525b; line-height: 1.5;">
          A parcel merge request has been accepted and added to your Delivery Challan (<strong>DC #${dcNo}</strong>).
        </p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          Please find the newly updated Delivery Challan attached. Please use this latest copy for packaging and dispatch.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('DC Number', `<strong>#${dcNo}</strong>`)}
          ${tableRow('Status', statusBadge('Updated with Merged Items', 'approved'), true)}
        </table>
      `,
    });
  },

  // 18. Courier Merge Rejected
  courierMergeRejected({ dcNo, reason }) {
    return buildEmail({
      title: `Merge Request Declined — DC #${dcNo}`,
      subtitle: 'Parcel Merge Status',
      accentColor: '#dc2626',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Merge Request Declined', 'danger')}
        </div>
        <p style="margin: 0 0 16px 0; color: #52525b; line-height: 1.5;">
          Your merge request for Delivery Challan <strong>#${dcNo}</strong> was declined by the parcel owner.
        </p>
        ${highlightBox(`<strong>Reason for Decline:</strong><br/>${reason || 'The owner could not accommodate additional items.'}`, '#dc2626', '#fef2f2')}
        <p style="margin: 16px 0 0 0; color: #52525b; font-size: 13.5px;">
          Please create an independent Courier Dispatch request for your items on the portal.
        </p>
        ${actionButton('Create Courier Dispatch', `${APP_URL}/courier-dispatch`, '#b27f0d')}
      `,
    });
  },

  // 19. Courier Merge Cancelled (Parent DC recalled / updated)
  courierMergeCancelled({ dcNo, reason }) {
    return buildEmail({
      title: `Merge Request Cancelled — DC #${dcNo}`,
      subtitle: 'Parent Dispatch Modified',
      accentColor: '#52525b',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Merge Request Cancelled', 'neutral')}
        </div>
        <p style="margin: 0 0 16px 0; color: #52525b; line-height: 1.5;">
          The Delivery Challan <strong>#${dcNo}</strong> that you requested to merge into has been recalled, updated, or removed by its owner.
        </p>
        ${highlightBox(`<strong>Notice:</strong> ${reason || 'Your merge request has been cancelled because the parent dispatch details were modified.'}`, '#52525b', '#f4f4f5')}
        <p style="margin: 16px 0 0 0; color: #52525b; font-size: 13.5px;">
          Please create a separate Courier Dispatch request for your items.
        </p>
        ${actionButton('Create Courier Dispatch', `${APP_URL}/courier-dispatch`, '#b27f0d')}
      `,
    });
  },

  // 20. Shipping Label Generated
  shippingLabelGenerated({ from, to }) {
    return buildEmail({
      title: 'Shipping Label Generated',
      subtitle: 'Courier Packaging Documentation',
      accentColor: '#b27f0d',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Shipping Label Ready', 'pending')}
        </div>
        <p style="margin: 0 0 8px 0;">Hello,</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          Your shipping label has been generated. Please find the printable PDF document attached. Print and attach it securely to your shipment package before handover.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Origin (From)', `<strong>${from.name}</strong>${from.phone ? ` | ${from.phone}` : ''}<br/><span style="color:#71717a; font-size:12.5px;">${from.address}</span>`)}
          ${tableRow('Destination (To)', `<strong>${to.name}</strong>${to.phone ? ` | ${to.phone}` : ''}<br/><span style="color:#71717a; font-size:12.5px;">${to.address}</span>`, true)}
        </table>
        ${highlightBox('Notice: Verify that the label is clearly visible and barcode/details are legible before dispatching.', '#b27f0d', '#fdf5e6')}
      `,
    });
  },

  // 21. Helpdesk Request Completed — to Employee
  helpdeskCompleted(request) {
    const { detailsText, subcategory, floor, remarks } = extractHelpdeskDetails(request);
    const catTitle = request.categoryTitle || request.category;

    return buildEmail({
      title: `Service Request #${request.id} Completed`,
      subtitle: 'Service Request Resolved',
      accentColor: '#16a34a',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Request Completed', 'completed')}
        </div>
        <p style="margin: 12px 0 8px 0;">Dear ${request.requester_name || request.name || 'Employee'},</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          We are pleased to inform you that your service request (<strong>#${request.id}</strong>) has been successfully resolved by the Admin team.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Service Request No', `<strong style="color: #16a34a;">#${request.id}</strong>`)}
          ${tableRow('Category', catTitle, true)}
          ${tableRow('Sub-Type / Priority', subcategory)}
          ${tableRow('Floor', floor, true)}
          ${tableRow('Details / Issue', detailsText)}
          ${tableRow('Remarks', remarks, true)}
          ${tableRow('Status', statusBadge('Completed', 'completed'))}
        </table>
        <p style="margin: 16px 0 0 0; color: #52525b; font-size: 13.5px;">In case of any further assistance, please feel free to contact us.</p>
      `,
    });
  },

  // 22. Helpdesk Request Rejected — to Employee
  helpdeskRejected(request, rejectionReason) {
    const { detailsText, subcategory, floor, remarks } = extractHelpdeskDetails(request);
    const catTitle = request.categoryTitle || request.category;

    return buildEmail({
      title: `Service Request #${request.id} Declined`,
      subtitle: 'Service Request Status',
      accentColor: '#dc2626',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Request Declined', 'danger')}
        </div>
        <p style="margin: 12px 0 8px 0;">Dear ${request.requester_name || request.name || 'Employee'},</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          We regret to inform you that your service request (<strong>#${request.id}</strong>) has been declined by the Admin team.
        </p>
        ${highlightBox(`<strong>Reason for Decline:</strong><br/>${rejectionReason || 'No specific explanation provided.'}`, '#dc2626', '#fef2f2')}
        <table style="${TABLE_WRAP}">
          ${tableRow('Service Request No', `<strong style="color: #dc2626;">#${request.id}</strong>`)}
          ${tableRow('Category', catTitle, true)}
          ${tableRow('Sub-Type / Priority', subcategory)}
          ${tableRow('Floor', floor, true)}
          ${tableRow('Details / Issue', detailsText)}
          ${tableRow('Remarks', remarks, true)}
          ${tableRow('Status', statusBadge('Declined', 'danger'))}
        </table>
        <p style="margin: 16px 0 0 0; color: #52525b; font-size: 13.5px;">In case of any queries, please feel free to contact the Admin team.</p>
      `,
    });
  },

  // 23. Low Stock Alert — to Admin
  lowStockAlert({ item, currentQty, threshold = 5, type = 'stationery' }) {
    const isPrinting = type === 'printing';
    const categoryLabel = isPrinting ? 'Printing' : 'Stationery';
    return buildEmail({
      title: `Low Stock Alert: ${item}`,
      subtitle: `${categoryLabel} Inventory Notice`,
      accentColor: '#dc2626',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Low Stock Alert', 'danger')}
        </div>
        ${highlightBox(`Inventory Notice: An automated alert has been triggered because the inventory level for the following item has fallen below the threshold of <strong>${threshold} units</strong>.`, '#dc2626', '#fef2f2')}
        <table style="${TABLE_WRAP}">
          ${tableRow('Item Name', `<strong>${item}</strong>`)}
          ${tableRow('Stock Category', `<strong>${categoryLabel} Stock</strong>`, true)}
          ${tableRow('Current Available Stock', `<strong style="color: #dc2626; font-size: 18px;">${currentQty}</strong>`)}
          ${tableRow('Alert Threshold', `${threshold} units`, true)}
        </table>
        <p style="margin: 16px 0 0 0; color: #52525b; font-size: 13.5px;">
          Please log into the Admin portal to replenish this item.
        </p>
        ${actionButton(`Manage ${categoryLabel} Stock`, `${APP_URL}/helpdesk-admin/stationery-stock`, '#b27f0d')}
      `,
    });
  },

  // 24. Scheduled Reminder — to Admin
  reminder({ text, dateTime, priority, email }) {
    let priorityVariant = 'neutral';
    let accent = '#52525b';
    if (priority === 'High') {
      priorityVariant = 'danger';
      accent = '#dc2626';
    } else if (priority === 'Medium') {
      priorityVariant = 'warning';
      accent = '#b45309';
    } else {
      priorityVariant = 'success';
      accent = '#16a34a';
    }

    return buildEmail({
      title: `Scheduled Task Reminder: ${text.substring(0, 50)}`,
      subtitle: 'Help Desk Scheduled Reminder',
      accentColor: accent,
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge(`${priority || 'Scheduled'} Priority Reminder`, priorityVariant)}
        </div>
        <p style="margin: 0 0 16px 0; color: #52525b;">
          This is an automated notification from your Help Desk Reminder schedule.
        </p>
        <div style="background-color: #fafafa; border-left: 4px solid ${accent}; padding: 15px 16px; margin: 16px 0; border-radius: 6px; word-break: break-word;">
          <div style="font-size: 11px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">Reminder Task</div>
          <div style="font-size: 14.5px; font-weight: 600; color: #172025; line-height: 1.5;">${text}</div>
        </div>
        <table style="${TABLE_WRAP}">
          ${tableRow('Scheduled Time', new Date(dateTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))}
          ${tableRow('Priority', statusBadge(priority || 'Normal', priorityVariant), true)}
          ${tableRow('Target Email', email || 'Admin Desk')}
        </table>
      `,
    });
  },

  // 25. AMC Contract Renewal Reminder — to Admin & CC (3 Weeks Notice)
  amcIndividualReminder({ amc }) {
    return buildEmail({
      title: `AMC Renewal Notice: ${amc.equipment_name}`,
      subtitle: 'Annual Maintenance Contract Notice (3 Weeks)',
      accentColor: '#b27f0d',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Contract Expiring Soon (3 Weeks)', 'pending')}
        </div>
        ${highlightBox('Contract Expiration Notice: The following Annual Maintenance Contract (AMC) is due to expire in approximately 3 weeks. Please review renewal terms with the vendor.', '#b27f0d', '#fdf5e6')}
        <table style="${TABLE_WRAP}">
          ${tableRow('Equipment / Contract Name', `<strong>${amc.equipment_name}</strong>`)}
          ${tableRow('Vendor / Service Provider', amc.vendor_name || 'N/A', true)}
          ${tableRow('Contact Person / Phone', `${amc.contact_person || 'N/A'} ${amc.phone ? `(${amc.phone})` : ''}`)}
          ${tableRow('Contract Period', `${amc.start_date || 'N/A'} to <strong style="color: #dc2626;">${amc.end_date || 'N/A'}</strong>`, true)}
          ${tableRow('Annual Cost', amc.cost ? `₹${amc.cost}` : 'N/A')}
          ${tableRow('Current Status', statusBadge(amc.status || 'Active', 'approved'), true)}
          ${tableRow('Remarks', amc.remarks || 'None')}
        </table>
        <p style="margin: 16px 0 0 0; color: #52525b; font-size: 13.5px;">
          Please review the contract terms and initiate renewal proceedings before the expiration date.
        </p>
        ${actionButton('View AMC Contracts', `${APP_URL}/helpdesk-admin/amc`, '#b27f0d')}
      `,
    });
  },

  // 26. AMC Upcoming Service Visit Reminder — 2 Days Notice
  amcUpcomingVisitReminder(data) {
    const contract = data.contract || {};
    const amcName = data.amcName || contract.amc_name || contract.equipment_name || 'AMC Contract';
    const vendorDetails = data.vendorDetails || contract.vendor_name || contract.vendor_contact || 'N/A';
    const contactPerson = data.contactPerson || contract.vendor_contact || 'Vendor Representative';
    const contactPhone = data.contactPhone || contract.vendor_phone || '';
    const lastServiceDate = data.lastServiceDate || 'None / Initial Service';
    const upcomingServiceDate = data.upcomingServiceDate || (data.visit ? data.visit.next_service_date : 'Upcoming');
    const location = data.location || contract.units_location || 'N/A';
    const upcomingVisitNumber = data.upcomingVisitNumber || (data.visit ? (data.visit.visit_no || 1) : 1);
    const totalVisits = data.totalVisits || contract.no_of_visits || null;

    const visitLabel = totalVisits ? `Visit #${upcomingVisitNumber} of ${totalVisits}` : `Visit #${upcomingVisitNumber}`;

    const whoShouldWeContact = contactPhone
      ? `<strong>${contactPerson}</strong> &nbsp;•&nbsp; <a href="tel:${contactPhone}" style="color: #b27f0d; text-decoration: none; font-weight: 600;">${contactPhone}</a>`
      : `<strong>${contactPerson}</strong>`;

    return buildEmail({
      title: `Upcoming AMC Service Visit: ${amcName} (${visitLabel})`,
      subtitle: `Scheduled Upcoming Service Date: ${upcomingServiceDate}`,
      accentColor: '#b27f0d',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Upcoming Service Visit (2 Days Notice)', 'pending')}
        </div>
        ${highlightBox('Notice: An upcoming maintenance service visit is scheduled within 2 days. Please confirm technician arrival.', '#b27f0d', '#fdf5e6')}
        <table style="${TABLE_WRAP}">
          ${tableRow('AMC Name', `<strong>${amcName}</strong>`)}
          ${tableRow('Visit Sequence', `<strong>${visitLabel}</strong>`, true)}
          ${tableRow('Scheduled Service Date', `<strong style="color: #b27f0d;">${upcomingServiceDate}</strong>`)}
          ${tableRow('Last Completed Service', lastServiceDate, true)}
          ${tableRow('Facility / Location', location)}
          ${tableRow('Service Vendor', vendorDetails, true)}
          ${tableRow('Vendor Contact', whoShouldWeContact)}
        </table>
        <p style="margin: 18px 0 0 0; color: #52525b; font-size: 13.5px;">
          Please coordinate with <strong>${contactPerson}</strong> to confirm technician arrival and ensure necessary site access.
        </p>
        ${actionButton('View AMC Visit Logs', `${APP_URL}/helpdesk-admin/amc`, '#b27f0d')}
      `,
    });
  },

  // 27. Utility Payment Due Reminder — to Admin & CC (4 Days Notice)
  utilityIndividualReminder({ utility }) {
    return buildEmail({
      title: `Utility Bill Due Notice: ${utility.utility_type} (${utility.provider_name})`,
      subtitle: 'Utility Payment Deadline (4 Days Notice)',
      accentColor: '#dc2626',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Utility Payment Due (4 Days)', 'danger')}
        </div>
        ${highlightBox('Payment Deadline: The following utility payment is due in 4 days. Please process payment to prevent service disruption.', '#dc2626', '#fef2f2')}
        <table style="${TABLE_WRAP}">
          ${tableRow('Utility Service Type', `<strong>${utility.utility_type}</strong>`)}
          ${tableRow('Provider Name', utility.provider_name || 'N/A', true)}
          ${tableRow('Account / Consumer No', utility.account_number || 'N/A')}
          ${tableRow('Billing Cycle', utility.billing_cycle || 'N/A', true)}
          ${tableRow('Payment Due Date', `<strong style="color: #dc2626; font-size: 16px;">${utility.due_date}</strong>`)}
          ${tableRow('Amount Payable', `<strong style="color: #172025; font-size: 17px;">₹${utility.amount}</strong>`, true)}
          ${tableRow('Payment Status', statusBadge(utility.status || 'Unpaid', 'danger'))}
          ${tableRow('Remarks', utility.remarks || 'None', true)}
        </table>
        <p style="margin: 16px 0 0 0; color: #52525b; font-size: 13.5px;">
          Please ensure payment is completed before the due date to avoid service disruption or late penalty charges.
        </p>
        ${actionButton('Go to Utility Payments', `${APP_URL}/helpdesk-admin/utility-payments`, '#b27f0d')}
      `,
    });
  },

  // 28. Tax Payment Due Reminder — to Admin & CC (1 Month Notice)
  taxIndividualReminder({ tax }) {
    return buildEmail({
      title: `Tax Payment Due Notice: ${tax.tax_type} (${tax.authority_name || tax.location || 'Municipal'})`,
      subtitle: 'Statutory Tax Payment Deadline (1 Month Notice)',
      accentColor: '#b27f0d',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Tax Payment Due in 1 Month', 'pending')}
        </div>
        ${highlightBox('Tax Deadline Notice: The following statutory/property tax payment is due in approximately 1 month.', '#b27f0d', '#fdf5e6')}
        <table style="${TABLE_WRAP}">
          ${tableRow('Tax Assessment Type', `<strong>${tax.tax_type}</strong>`)}
          ${tableRow('Authority / Location', tax.authority_name || tax.location || 'N/A', true)}
          ${tableRow('Assessment Year / Term', `${tax.year || tax.assessment_year || ''} ${tax.term ? `(${tax.term})` : ''}`.trim() || 'N/A')}
          ${tableRow('Bill / Challan No', tax.bill_no || 'N/A', true)}
          ${tableRow('Payment Due Date', `<strong style="color: #b27f0d; font-size: 16px;">${tax.due_date}</strong>`)}
          ${tableRow('Amount Payable', `<strong style="color: #172025; font-size: 17px;">₹${tax.amount}</strong>`, true)}
          ${tableRow('Status', statusBadge(tax.status || 'Unpaid', 'pending'))}
          ${tableRow('Remarks', tax.remarks || 'None', true)}
        </table>
        <p style="margin: 16px 0 0 0; color: #52525b; font-size: 13.5px;">
          Please review assessment details and schedule the tax payment in advance.
        </p>
        ${actionButton('Go to Tax Payments', `${APP_URL}/helpdesk-admin/tax-payments`, '#b27f0d')}
      `,
    });
  },

  // 29. Asset Handover — to Employee
  assetHandover({ handover, assetName, items }) {
    const itemRows = (items || []).map((it, i) => tableRow(
      `Item ${i + 1}`,
      `${it.description || it.name || 'Asset'}${it.serialNumber ? ` — S/N: ${it.serialNumber}` : ''}${it.quantity ? ` (Qty: ${it.quantity})` : ''}`,
      i % 2 === 1
    )).join('');

    return buildEmail({
      title: `Asset Handover Confirmation — ${assetName || 'Office Assets'}`,
      subtitle: 'Asset Handover Acknowledgement',
      accentColor: '#b27f0d',
      bodyHtml: `
        <p style="margin: 0 0 8px 0;">Dear ${handover.employeeName || handover.name},</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          The following office assets have been assigned to you. Please review the details and acknowledge receipt.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Employee Name', handover.employeeName || handover.name)}
          ${tableRow('Employee ID', handover.employeeId || 'N/A', true)}
          ${tableRow('Department', handover.department || 'N/A')}
          ${tableRow('Handover Date', handover.handoverDate || new Date().toLocaleDateString('en-IN'), true)}
          ${tableRow('Handled By', handover.handedBy || 'Admin')}
        </table>
        <p style="margin: 16px 0 8px 0; font-weight: 700; color: #172025;">Assets Handed Over:</p>
        <table style="${TABLE_WRAP}">${itemRows}</table>
        ${actionButton('View & Acknowledge Handover', `${APP_URL}/asset-acknowledgement?token=${handover.token || ''}`, '#b27f0d')}
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #71717a; text-align: center;">
          Please click the button above to digitally acknowledge receipt of the assigned assets.
        </p>
      `,
    });
  },

  // 30. Asset / Stationery Handover Notification (with items table & digital sign link)
  assetHandoverNotification({ handover, items, ackLink, isAppended }) {
    let itemsRows = '';
    const itemList = items || handover.items || [];
    itemList.forEach((it, idx) => {
      itemsRows += `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-size: 12.5px; color: #71717a; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-weight: 600; color: #172025; font-size: 13px;">${it.itemName || it.description || it.name || 'Stationery Item'}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; color: #52525b; font-size: 12.5px;">${it.serialNo || it.serialNumber || 'N/A'}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; color: #52525b; font-size: 12.5px;">${it.condition || 'Good'}</td>
        </tr>
      `;
    });

    return buildEmail({
      title: isAppended ? 'Additional Office Stationery Issued' : 'Office Stationery Handover Acknowledgement',
      subtitle: 'Stationery & Asset Tracking',
      accentColor: '#b27f0d',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge(isAppended ? 'Additional Assets Issued' : 'Handover Acknowledgement Required', 'pending')}
        </div>
        <p style="margin: 0 0 8px 0;">Dear <strong>${handover.employeeName || handover.name}</strong>,</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          ${isAppended ? 'Additional company stationery items have been issued to you by the Admin team.' : 'The company stationery and office items listed below have been assigned to you by the Admin team.'}
        </p>
        <div class="scroll-table-wrap" style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 18px 0; border: 1px solid #e4e4e7; border-radius: 6px;">
          <table role="presentation" class="scroll-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #fafafa; border-bottom: 1px solid #e4e4e7; font-size: 12px; color: #52525b;">
                <th style="padding: 10px 12px; text-align: center; width: 36px;">#</th>
                <th style="padding: 10px 12px; text-align: left;">Item Description</th>
                <th style="padding: 10px 12px; text-align: left;">Serial / Identifier</th>
                <th style="padding: 10px 12px; text-align: left;">Condition</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        </div>
        ${highlightBox('<strong>Acknowledgement Required:</strong> Please review the items listed above and complete your digital acknowledgement to confirm receipt.', '#b27f0d', '#fdf5e6')}
        ${actionButton('Acknowledge Receipt Online', ackLink, '#b27f0d')}
        <p style="margin: 16px 0 0 0; font-size: 12.5px; color: #71717a; text-align: center;">
          If you have questions or notice any serial number discrepancies, please contact the Admin Desk.
        </p>
      `,
    });
  },

  // 31. Purchase Approval Request
  purchaseApprovalRequest: (request) => {
    const loginUrl = `${APP_URL}/purchase-approvals`;

    const bodyHtml = `
      <div style="margin-bottom: 16px;">
        ${statusBadge('Purchase Approval Required', 'pending')}
      </div>
      <p style="margin: 0 0 16px 0; color: #52525b; line-height: 1.5;">
        A new purchase request (<strong>${request.requestId}</strong>) has been submitted by <strong>${request.requestedBy}</strong>.
      </p>
      
      <table style="${TABLE_WRAP}">
        ${tableRow('Request ID', request.requestId)}
        ${tableRow('Item Name', request.itemName, true)}
        ${tableRow('Quantity', request.quantity)}
        ${tableRow('Unit Amount', '₹' + request.unitAmount, true)}
        ${tableRow('GST Amount', '₹' + request.gstAmount)}
        ${tableRow('Final Amount', '<strong>₹' + request.finalAmount + '</strong>', true)}
        ${tableRow('Mode of Purchase', request.modeOfPurchase)}
        ${tableRow('Purchase Link', request.purchaseLink ? `<a href="${request.purchaseLink}" target="_blank" style="color: #b27f0d; text-decoration: none; font-weight: 600;">View Link</a>` : 'N/A', true)}
      </table>

      ${highlightBox('<strong>Purchase Reason:</strong> ' + request.reason, '#b27f0d', '#fdf5e6')}

      <div style="margin-top: 24px; text-align: center;">
        <p style="margin-bottom: 16px; color: #52525b; font-size: 13.5px;">Please log into the Admin Portal to Approve, Reject, or Discuss this request.</p>
        ${actionButton('Review Purchase Request', loginUrl, '#16a34a')}
      </div>
    `;
    return buildEmail({
      title: 'Purchase Approval Request',
      subtitle: 'Purchase Management',
      accentColor: '#b27f0d',
      bodyHtml
    });
  },

  // 32. Purchase Approval Action Email (Direct 1-click Approve / Reject / Discuss)
  purchaseApprovalActionEmail: ({ request, reqUrl, itemsHtml }) => {
    return buildEmail({
      title: `Purchase Approval Required — ${request.requestId}`,
      subtitle: 'Purchase Management Action Required',
      accentColor: '#b27f0d',
      bodyHtml: `
        <div style="margin-bottom: 16px;">
          ${statusBadge('Approval Required', 'pending')}
        </div>
        <p style="margin: 0 0 8px 0;">Dear Sir / Madam,</p>
        <p style="margin: 0 0 20px 0; color: #52525b; line-height: 1.5;">
          A purchase request (<strong>${request.requestId}</strong>) has been submitted for your review and approval by <strong>${request.requestedBy}</strong>.
        </p>
        <div class="scroll-table-wrap" style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 18px 0; border: 1px solid #e4e4e7; border-radius: 6px;">
          <table role="presentation" class="scroll-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #fafafa; border-bottom: 1px solid #e4e4e7; color: #52525b; font-size: 12px;">
                <th style="padding: 10px 8px; border-bottom: 1px solid #e4e4e7; text-align: right; width: 32px;">#</th>
                <th style="padding: 10px 10px; border-bottom: 1px solid #e4e4e7; text-align: left;">Item Name</th>
                <th style="padding: 10px 8px; border-bottom: 1px solid #e4e4e7; text-align: right; width: 44px;">Qty</th>
                <th style="padding: 10px 10px; border-bottom: 1px solid #e4e4e7; text-align: right; width: 85px;">Unit Price</th>
                <th style="padding: 10px 10px; border-bottom: 1px solid #e4e4e7; text-align: right; width: 75px;">GST</th>
                <th style="padding: 10px 10px; border-bottom: 1px solid #e4e4e7; text-align: right; width: 85px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr style="background-color: #fafafa; font-weight: 700; border-top: 2px solid #e4e4e7;">
                <td colspan="5" style="padding: 10px; text-align: right; color: #172025;">Grand Total:</td>
                <td style="padding: 10px; text-align: right; color: #16a34a; font-size: 14.5px;">&#8377;${parseFloat(request.finalAmount || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <table style="${TABLE_WRAP}">
          ${tableRow('Mode of Purchase', request.modeOfPurchase || 'N/A')}
          ${tableRow('Purchase Reason', request.reason || 'N/A', true)}
          ${request.storeName ? tableRow('Store / Vendor', request.storeName) : ''}
        </table>
        <p style="margin: 20px 0 16px 0; font-size: 13.5px; color: #52525b;">
          Please select your approval decision below:
        </p>
        <div class="mobile-btn-stack" style="text-align: center; margin: 24px 0;">
          <a href="${reqUrl}?action=Approve" target="_blank" class="mobile-btn" style="display: inline-block; padding: 11px 22px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; margin-right: 8px;">Approve</a>
          <a href="${reqUrl}?action=Reject" target="_blank" class="mobile-btn" style="display: inline-block; padding: 11px 22px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; margin-right: 8px;">Reject</a>
          <a href="${reqUrl}?action=Discuss" target="_blank" class="mobile-btn" style="display: inline-block; padding: 11px 22px; background-color: #b27f0d; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px;">Need to Discuss</a>
        </div>
      `,
    });
  },

  // 33. Purchase Status Update
  purchaseStatusUpdate: (request) => {
    let statusVariant = 'pending';
    let statusColor = '#b27f0d';
    if (request.status === 'Approved') {
      statusVariant = 'approved';
      statusColor = '#16a34a';
    } else if (request.status === 'Rejected') {
      statusVariant = 'danger';
      statusColor = '#dc2626';
    } else if (request.status === 'Purchased') {
      statusVariant = 'info';
      statusColor = '#2563eb';
    }
    
    let items = [];
    if (request.itemsJson) {
      try {
        items = typeof request.itemsJson === 'string' ? JSON.parse(request.itemsJson) : request.itemsJson;
      } catch (e) {
        items = [];
      }
    }
    if (!Array.isArray(items) || items.length === 0) {
      items = [{
        itemName: request.itemName || 'Item',
        quantity: request.quantity || 1,
        unitAmount: request.unitAmount || (request.finalAmount ? (request.finalAmount / (request.quantity || 1)) : 0),
        subtotal: (request.quantity || 1) * (request.unitAmount || 0),
        gstAmt: request.gstAmount || 0,
        finalAmt: request.finalAmount || 0
      }];
    }

    let itemsRows = '';
    items.forEach((item, index) => {
      const qty = item.qty || item.quantity || 1;
      const unit = parseFloat(item.unitAmt || item.unitAmount || (item.subtotal ? item.subtotal / qty : 0) || 0);
      const subtotal = parseFloat(item.subtotal || (qty * unit) || 0);
      const gst = parseFloat(item.gstAmt !== undefined ? item.gstAmt : (item.gstAmount || 0));
      const total = parseFloat(item.finalAmt !== undefined ? item.finalAmt : (subtotal + gst));

      itemsRows += `
        <tr style="border-bottom: 1px solid #e4e4e7;">
          <td style="padding: 10px 10px; text-align: right; color: #71717a; font-size: 12.5px;">${index + 1}</td>
          <td style="padding: 10px 10px; font-weight: 600; color: #172025; font-size: 13px;">${item.itemName || 'Item'}</td>
          <td style="padding: 10px 8px; text-align: right; color: #172025; font-size: 13px;">${qty}</td>
          <td style="padding: 10px 10px; text-align: right; color: #172025; font-size: 13px;">&#8377;${unit.toFixed(2)}</td>
          <td style="padding: 10px 10px; text-align: right; color: #71717a; font-size: 13px;">&#8377;${gst.toFixed(2)}</td>
          <td style="padding: 10px 10px; text-align: right; font-weight: 700; color: #172025; font-size: 13px;">&#8377;${total.toFixed(2)}</td>
        </tr>
      `;
    });

    const itemsBox = `
      <div style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 6px; overflow: hidden; margin: 20px 0;">
        <div style="background: #fafafa; padding: 12px 14px; border-bottom: 1px solid #e4e4e7; font-weight: 700; color: #172025; font-size: 13px;">
          Requested Items &amp; Pricing Breakdown
        </div>
        <div class="scroll-table-wrap" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
          <table role="presentation" class="scroll-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #fafafa; color: #52525b; border-bottom: 1px solid #e4e4e7; font-size: 12px;">
                <th style="padding: 8px 10px; text-align: right; width: 32px;">#</th>
                <th style="padding: 8px 10px; text-align: left;">Item Name</th>
                <th style="padding: 8px 8px; text-align: right; width: 44px;">Qty</th>
                <th style="padding: 8px 10px; text-align: right; width: 85px;">Price / Unit</th>
                <th style="padding: 8px 10px; text-align: right; width: 75px;">GST</th>
                <th style="padding: 8px 10px; text-align: right; width: 85px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
            <tfoot>
              <tr style="background: #fafafa; font-weight: 700;">
                <td colspan="5" style="padding: 10px; text-align: right; color: #172025; border-top: 2px solid #e4e4e7;">Grand Total:</td>
                <td style="padding: 10px; text-align: right; color: #16a34a; font-size: 14.5px; border-top: 2px solid #e4e4e7;">&#8377;${parseFloat(request.finalAmount || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;

    const statusBadgeHtml = statusBadge(request.status, statusVariant);

    const bodyHtml = `
      <div style="margin-bottom: 16px;">
        ${statusBadgeHtml}
      </div>
      <p style="color: #52525b; line-height: 1.5; margin-bottom: 16px;">
        Your purchase request (<strong>${request.requestId}</strong>) has been updated to <strong>${request.status}</strong> by <strong>${request.approvalPersonEmail || 'Approver'}</strong>.
      </p>

      ${itemsBox}

      <table style="${TABLE_WRAP}">
        ${tableRow('Request ID', request.requestId)}
        ${tableRow('Status', statusBadgeHtml, true)}
        ${tableRow('Mode of Purchase', request.modeOfPurchase || 'N/A')}
        ${request.storeName ? tableRow('Store Name', request.storeName, true) : ''}
        ${tableRow('Approver', request.approvalPersonEmail || 'N/A', !request.storeName)}
        ${request.approverComments ? tableRow('Approver Comments', request.approverComments, true) : ''}
        ${request.rejectionReason ? tableRow('Rejection Reason', `<span style="color:#dc2626;">${request.rejectionReason}</span>`, true) : ''}
        ${request.reason ? tableRow('Purchase Reason', request.reason, true) : ''}
      </table>
      
      <p style="margin-top: 20px; font-size: 13px; color: #71717a;">Please log in to the Avana Group Admin Request Portal to view full details or manage purchasing.</p>
    `;
    
    return buildEmail({
      title: `Purchase Request ${request.requestId} - ${request.status}`,
      subtitle: 'Purchase Management Status Update',
      accentColor: statusColor,
      bodyHtml
    });
  }

};

module.exports = { buildEmail, templates, extractHelpdeskDetails, statusBadge, tableRow, highlightBox, actionButton };
