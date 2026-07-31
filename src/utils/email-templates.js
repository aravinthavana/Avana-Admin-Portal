/**
 * email-templates.js
 * 
 * Central email template builder for the Avana Admin Portal.
 * Provides a branded HTML wrapper matching the legacy portal's visual identity,
 * plus individual builders for every email event in the system.
 * 
 * Usage:
 *   const { buildEmail, templates } = require('./email-templates');
 *   const html = templates.helpdeskSubmission(request);
 *   const html = templates.bookingConfirmation(booking, host);
 */

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// ── Branded Wrapper ──────────────────────────────────────────────────────────
// Matches the legacy portal's gold gradient header with logo and footer.
function buildEmail({ title, subtitle = 'Avana Admin Helpdesk Portal', accentColor = '#c29100', bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f2f8; font-family: 'Calibri', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f2f8; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width: 640px; width: 100%; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

          <!-- ── Header: Legacy gradient matching the portal ── -->
          <tr>
            <td style="background: linear-gradient(to right, #fde68a 0%, #1e293b 45%, #0f172a 100%); border-bottom: 3px solid ${accentColor}; padding: 20px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-weight: 800; font-size: 20px; color: #ffffff; letter-spacing: -0.02em; line-height: 1.2;">
                      Avana Admin Help Desk
                    </div>
                    <div style="font-size: 13px; color: #fde68a; margin-top: 4px; font-weight: 500;">
                      ${subtitle}
                    </div>
                  </td>
                  <td align="right">
                    <div style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 6px 14px; display: inline-block;">
                      <span style="font-size: 12px; font-weight: 700; color: #fde68a; letter-spacing: 0.08em; text-transform: uppercase;">AVANA</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding: 28px 32px; color: #0f172a; line-height: 1.6; font-size: 15px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background: #f8fafc; border-top: 1px solid #e5e7eb; padding: 16px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                This is an automated notification from the <strong>Avana Admin Helpdesk Portal</strong>.
                Please do not reply to this email.
              </p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #9ca3af;">
                © ${new Date().getFullYear()} Avana Group — All rights reserved
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

// ── Shared table styles ───────────────────────────────────────────────────────
const TABLE_WRAP = `width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 15px;`;
const TD_LABEL = `padding: 10px 14px; font-weight: 600; border-bottom: 1px solid #e5e7eb; width: 38%; color: #374151; background: #f9fafb;`;
const TD_VALUE = `padding: 10px 14px; border-bottom: 1px solid #e5e7eb; color: #111827;`;
const TD_VALUE_ALT = `padding: 10px 14px; border-bottom: 1px solid #e5e7eb; color: #111827; background: #fafafa;`;

function tableRow(label, value, alt = false) {
  return `
    <tr>
      <td style="${TD_LABEL}">${label}</td>
      <td style="${alt ? TD_VALUE_ALT : TD_VALUE}">${value || 'N/A'}</td>
    </tr>`;
}

function highlightBox(text, color = '#c29100', bg = '#fffbeb') {
  return `<div style="background:${bg}; border-left: 4px solid ${color}; padding: 14px 16px; margin: 16px 0; border-radius: 4px; font-size: 14px; color: #1e293b;">${text}</div>`;
}

function actionButton(label, url, color = '#c29100') {
  return `<p style="margin: 24px 0 8px 0; text-align: center;">
    <a href="${url}" style="display: inline-block; padding: 12px 28px; background-color: ${color}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px;">${label}</a>
  </p>`;
}

// ── Individual Email Templates ────────────────────────────────────────────────

const templates = {

  // 1. Employee OTP Login
  employeeOTP({ otp, email }) {
    return buildEmail({
      title: 'Your Login Verification Code',
      subtitle: 'Employee Login — Avana Helpdesk Portal',
      accentColor: '#c29100',
      bodyHtml: `
        <p style="margin: 0 0 16px 0;">Hello,</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          A login was requested for <strong>${email}</strong> on the Avana Admin Help Desk portal.
          Use the verification code below to complete sign-in.
        </p>
        <div style="background: #1e293b; border-radius: 10px; text-align: center; padding: 24px 0; margin: 20px 0;">
          <div style="font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #fde68a; font-family: monospace;">${otp}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Valid for 10 minutes</div>
        </div>
        ${highlightBox('⚠️ If you did not request this login, please ignore this email and secure your account immediately.', '#d97706', '#fffbeb')}
        <p style="margin: 16px 0 0 0; font-size: 13px; color: #6b7280;">
          For security, do not share this code with anyone.
        </p>
      `,
    });
  },

  // 2. Admin Password Reset OTP
  adminResetOTP({ otp, adminEmail }) {
    return buildEmail({
      title: 'Admin Password Reset Code',
      subtitle: 'Admin Password Reset — Avana Helpdesk Portal',
      accentColor: '#1e3a8a',
      bodyHtml: `
        <p style="margin: 0 0 16px 0;">Hello Admin,</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          A password reset was requested for the Admin Portal account <strong>${adminEmail}</strong>.
          Use the 6-digit verification code below to reset your password.
        </p>
        <div style="background: #1e3a8a; border-radius: 10px; text-align: center; padding: 24px 0; margin: 20px 0;">
          <div style="font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #ffffff; font-family: monospace;">${otp}</div>
          <div style="font-size: 12px; color: #93c5fd; margin-top: 8px;">Valid for 10 minutes</div>
        </div>
        ${highlightBox('⚠️ If you did not request this reset, please secure your admin credentials immediately.', '#dc2626', '#fef2f2')}
      `,
    });
  },

  // 3. Booking Confirmation to Employee
  bookingConfirmation({ booking, host }) {
    const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
    const start = booking.startDate || booking.date;
    const end = booking.endDate || booking.date;
    const dateText = start === end ? start : `${start} to ${end}`;
    const foodText = booking.food === 'none' || !booking.food
      ? 'No Food'
      : `${booking.food === 'others' ? `Other (${booking.foodSpecify || ''})` : booking.food} (Count: ${booking.foodCount || 0})`;
    const cancelUrl = `${host || APP_URL}/api/bookings/cancel?id=${booking.id}&email=${encodeURIComponent(booking.email)}`;

    return buildEmail({
      title: 'Conference Room Booking Confirmed',
      subtitle: 'Conference Room Booking Notification',
      accentColor: '#059669',
      bodyHtml: `
        <p style="margin: 0 0 6px 0;">Dear ${booking.name},</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          Your request for the conference room has been received, and the room has been successfully reserved.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Booking Person Name', booking.name)}
          ${tableRow('Date', dateText, true)}
          ${tableRow('Time', timeText)}
          ${tableRow('Meeting Purpose', booking.reason, true)}
          ${tableRow('Food Requirement', foodText)}
          ${tableRow('Phone', booking.phone, true)}
        </table>
        ${highlightBox('<strong>Important Note:</strong> After completing the meeting, kindly ensure that the lights, AC, and TV are switched off. Please remove any meeting-related papers or materials and do not leave any items in the storage unit.', '#c29100', '#fffbeb')}
        <p style="margin: 16px 0;">The conference room has been blocked for the above-mentioned schedule.</p>
        <p style="margin: 0 0 20px 0; color: #374151;">In case of any further assistance, please feel free to contact us.</p>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 8px;">
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280;">For cancellation of room, please click below:</p>
          ${actionButton('Cancel This Booking', cancelUrl, '#dc2626')}
        </div>
      `,
    });
  },

  // 4. New Booking Alert to Admin
  bookingAdminAlert({ booking, host }) {
    const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
    const start = booking.startDate || booking.date;
    const end = booking.endDate || booking.date;
    const dateText = start === end ? start : `${start} to ${end}`;

    return buildEmail({
      title: 'New Conference Room Booking Request',
      subtitle: 'Admin Action Required',
      accentColor: '#4f46e5',
      bodyHtml: `
        <p style="margin: 0 0 8px 0;">Hello Admin,</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          An employee has submitted a new conference room booking request. Please review and take action.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Requester Name', booking.name)}
          ${tableRow('Email Address', booking.email, true)}
          ${tableRow('Phone', booking.phone)}
          ${tableRow('Date', dateText, true)}
          ${tableRow('Timings', timeText)}
          ${tableRow('Purpose / Reason', booking.reason, true)}
          ${booking.attendees && booking.attendees.length ? tableRow('Attendees', (booking.attendees || []).join(', ')) : ''}
        </table>
        ${actionButton('Open Admin Portal to Review', `${host || APP_URL}/admin`, '#4f46e5')}
      `,
    });
  },

  // 5. Booking Approval Confirmation to Employee
  bookingApproved({ booking, host, approvalRemarks }) {
    const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
    const start = booking.startDate || booking.date;
    const end = booking.endDate || booking.date;
    const dateText = start === end ? start : `${start} to ${end}`;
    const foodText = booking.food === 'none' || !booking.food
      ? 'No Food'
      : `${booking.food} (Count: ${booking.foodCount || 0})`;
    const cancelUrl = `${host || APP_URL}/api/bookings/cancel?id=${booking.id}&email=${encodeURIComponent(booking.email)}`;

    return buildEmail({
      title: 'Conference Room Booking Confirmed',
      subtitle: 'Your Booking Has Been Approved',
      accentColor: '#059669',
      bodyHtml: `
        <p style="margin: 0 0 4px 0; font-weight: 700; font-size: 17px; color: #059669;">✅ Your booking has been confirmed!</p>
        <p style="margin: 12px 0 8px 0;">Dear ${booking.name},</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          Your request for the conference room has been reviewed and confirmed by the Admin team.
        </p>
        ${approvalRemarks ? highlightBox(`<strong>Admin Remarks:</strong> ${approvalRemarks}`, '#059669', '#f0fdf4') : ''}
        <table style="${TABLE_WRAP}">
          ${tableRow('Date', dateText)}
          ${tableRow('Time', timeText, true)}
          ${tableRow('Meeting Purpose', booking.reason)}
          ${tableRow('Food Arrangement', foodText, true)}
        </table>
        ${highlightBox('<strong>Important Meeting Rules:</strong> After completing the meeting, kindly ensure that the lights, AC, and TV are switched off. Please remove any meeting-related papers or materials and do not leave any trash behind.', '#c29100', '#fffbeb')}
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 16px;">
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280;">For cancellation of room, please click below:</p>
          ${actionButton('Cancel This Booking', cancelUrl, '#dc2626')}
        </div>
      `,
    });
  },

  // 6. Booking Rejected — to Employee
  bookingRejected({ booking, reason }) {
    const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
    const start = booking.startDate || booking.date;
    const end = booking.endDate || booking.date;
    const dateText = start === end ? start : `${start} to ${end}`;

    return buildEmail({
      title: 'Conference Room Booking Rejected',
      subtitle: 'Booking Request Declined',
      accentColor: '#dc2626',
      bodyHtml: `
        <p style="margin: 0 0 4px 0; font-weight: 700; font-size: 17px; color: #dc2626;">❌ Booking Request Rejected</p>
        <p style="margin: 12px 0 8px 0;">Dear ${booking.name},</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          We regret to inform you that your request to book the conference room has been declined by the Admin team.
        </p>
        ${highlightBox(`<strong>Reason for Rejection:</strong><br>${reason || 'No specific reason provided.'}`, '#dc2626', '#fef2f2')}
        <table style="${TABLE_WRAP}">
          ${tableRow('Date', dateText)}
          ${tableRow('Time', timeText, true)}
          ${tableRow('Purpose', booking.reason)}
        </table>
        <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 13px;">
          Please check the calendar page to find alternative available times or submit another request.
        </p>
      `,
    });
  },

  // 7. Booking Cancelled — to Employee
  bookingCancelled({ booking }) {
    const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
    const start = booking.startDate || booking.date;
    const end = booking.endDate || booking.date;
    const dateText = start === end ? start : `${start} to ${end}`;

    return buildEmail({
      title: 'Conference Room Booking Cancelled',
      subtitle: 'Booking Cancellation Confirmation',
      accentColor: '#6b7280',
      bodyHtml: `
        <p style="margin: 0 0 8px 0;">Dear ${booking.name},</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          This email confirms that your conference room booking has been successfully cancelled and the slot has been released.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Date', dateText)}
          ${tableRow('Time', timeText, true)}
          ${tableRow('Purpose', booking.reason)}
        </table>
        <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 13px;">
          If this cancellation was accidental, please submit a new request on the booking portal.
        </p>
        ${actionButton('Make a New Booking', `${APP_URL}/booking`, '#c29100')}
      `,
    });
  },

  // 8. Booking Cancellation Alert — to Admin
  bookingCancelledAdminAlert({ booking }) {
    const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
    const start = booking.startDate || booking.date;
    const end = booking.endDate || booking.date;
    const dateText = start === end ? start : `${start} to ${end}`;

    return buildEmail({
      title: 'Room Booking Cancelled by Employee',
      subtitle: 'Cancellation Notification',
      accentColor: '#6b7280',
      bodyHtml: `
        <p style="margin: 0 0 12px 0;">A conference room booking has been cancelled by the employee.</p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Cancelled By', `${booking.name} (${booking.email})`)}
          ${tableRow('Date', dateText, true)}
          ${tableRow('Time', timeText)}
          ${tableRow('Purpose', booking.reason, true)}
        </table>
      `,
    });
  },

  // 9. Helpdesk Request Submission — to Employee & Admin
  helpdeskSubmission(request) {
    let detailsText = '';
    if (Array.isArray(request.items) && request.items.length) {
      detailsText = request.items.map(it => `<strong>${it.item}</strong> (Qty: ${it.quantity})`).join(', ');
    } else if (request.item) {
      detailsText = `${request.stationery_type || 'Item'}: <strong>${request.item}</strong> (Qty: ${request.quantity || 1})`;
    } else {
      detailsText = request.exact_issue || request.description || 'N/A';
    }
    const catTitle = request.categoryTitle || request.category;

    return buildEmail({
      title: `Help Desk Request #${request.id} Submitted`,
      subtitle: 'Service Request Confirmation',
      accentColor: '#4f46e5',
      bodyHtml: `
        <p style="margin: 0 0 8px 0;">Hello,</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          Your help desk request has been successfully received by the Admin team. Here are the details of your submission:
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Service Request No', `<strong style="color:#4f46e5;">#${request.id}</strong>`)}
          ${tableRow('Category', catTitle, true)}
          ${tableRow('Sub-Type / Priority', request.subcategory || 'N/A')}
          ${tableRow('Floor', request.floor || request.location || 'N/A', true)}
          ${tableRow('Details / Issue', detailsText)}
          ${tableRow('Remarks', request.remarks || 'None', true)}
          ${tableRow('Requested By', request.requester_name || request.name || 'N/A')}
          ${tableRow('Email', request.requester_email || request.email || 'N/A', true)}
          ${tableRow('Phone', request.requester_phone || request.phone || 'N/A')}
        </table>
        <p style="margin: 20px 0 0 0; font-size: 13px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          The Admin team is reviewing your request and will take action shortly.
        </p>
      `,
    });
  },

  // 10. Helpdesk Request Completed — to Employee
  helpdeskCompleted(request) {
    let detailsText = '';
    if (Array.isArray(request.items) && request.items.length) {
      detailsText = request.items.map(it => `<strong>${it.item}</strong> (Qty: ${it.quantity})`).join(', ');
    } else if (request.item) {
      detailsText = `${request.stationery_type || 'Item'}: <strong>${request.item}</strong> (Qty: ${request.quantity || 1})`;
    } else {
      detailsText = request.exact_issue || request.description || 'N/A';
    }
    const catTitle = request.categoryTitle || request.category;

    return buildEmail({
      title: `Service Request #${request.id} Completed`,
      subtitle: 'Service Request Completed',
      accentColor: '#10b981',
      bodyHtml: `
        <p style="margin: 0 0 4px 0; font-weight: 700; font-size: 17px; color: #059669;">✅ Your Request Has Been Completed!</p>
        <p style="margin: 12px 0 8px 0;">Dear ${request.requester_name || request.name || 'Employee'},</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          We are pleased to inform you that your service request (<strong>#${request.id}</strong>) has been successfully completed by the Admin team.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Service Request No', `<strong style="color:#10b981;">#${request.id}</strong>`)}
          ${tableRow('Category', catTitle, true)}
          ${tableRow('Sub-Type / Priority', request.subcategory || 'N/A')}
          ${tableRow('Floor', request.floor || request.location || 'N/A', true)}
          ${tableRow('Details / Issue', detailsText)}
          ${tableRow('Remarks', request.remarks || 'None', true)}
          ${tableRow('Status', '<strong style="color:#10b981;">Completed ✔</strong>')}
        </table>
        <p style="margin: 16px 0 0 0; color: #374151;">In case of any further assistance, please feel free to contact us.</p>
      `,
    });
  },

  // 11. Helpdesk Request Rejected — to Employee
  helpdeskRejected(request, rejectionReason) {
    let detailsText = '';
    if (Array.isArray(request.items) && request.items.length) {
      detailsText = request.items.map(it => `<strong>${it.item}</strong> (Qty: ${it.quantity})`).join(', ');
    } else if (request.item) {
      detailsText = `${request.stationery_type || 'Item'}: <strong>${request.item}</strong> (Qty: ${request.quantity || 1})`;
    } else {
      detailsText = request.exact_issue || request.description || 'N/A';
    }
    const catTitle = request.categoryTitle || request.category;

    return buildEmail({
      title: `Service Request #${request.id} Rejected`,
      subtitle: 'Service Request Declined',
      accentColor: '#ef4444',
      bodyHtml: `
        <p style="margin: 0 0 4px 0; font-weight: 700; font-size: 17px; color: #dc2626;">❌ Request Declined</p>
        <p style="margin: 12px 0 8px 0;">Dear ${request.requester_name || request.name || 'Employee'},</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          We regret to inform you that your service request (<strong>#${request.id}</strong>) has been declined by the Admin team.
        </p>
        ${highlightBox(`<strong>Reason:</strong> ${rejectionReason || 'No reason provided.'}`, '#ef4444', '#fef2f2')}
        <table style="${TABLE_WRAP}">
          ${tableRow('Service Request No', `<strong style="color:#ef4444;">#${request.id}</strong>`)}
          ${tableRow('Category', catTitle, true)}
          ${tableRow('Sub-Type / Priority', request.subcategory || 'N/A')}
          ${tableRow('Floor', request.floor || request.location || 'N/A', true)}
          ${tableRow('Details / Issue', detailsText)}
          ${tableRow('Remarks', request.remarks || 'None', true)}
        </table>
        <p style="margin: 16px 0 0 0; color: #374151;">In case of any queries, please feel free to contact the Admin team.</p>
      `,
    });
  },

  // 12. Low Stationery Stock Alert — to Admin
  lowStockAlert({ item, currentQty, threshold = 5 }) {
    return buildEmail({
      title: `Low Stock Alert: ${item}`,
      subtitle: 'Inventory Management Alert',
      accentColor: '#d97706',
      bodyHtml: `
        ${highlightBox('⚠️ Low Stock Warning — Immediate Action Required', '#d97706', '#fffbeb')}
        <p style="margin: 0 0 16px 0; color: #374151;">
          An automated system alert has been triggered because the inventory level for the following item has fallen at or below the threshold of <strong>${threshold} units</strong>:
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Item Name', `<strong>${item}</strong>`)}
          ${tableRow('Current Stock', `<strong style="color:#dc2626; font-size:20px;">${currentQty}</strong>`, true)}
          ${tableRow('Alert Threshold', `${threshold} units`)}
        </table>
        <p style="margin: 16px 0 0 0; color: #374151;">
          Please log into the Admin portal to manually replenish this item as soon as possible.
        </p>
        ${actionButton('Go to Stationery Stock', `${APP_URL}/helpdesk-admin/stationery-stock`, '#d97706')}
      `,
    });
  },

  // 13. Scheduled Reminder — to Admin
  reminder({ text, dateTime, priority, email }) {
    const priorityColor = priority === 'High' ? '#dc2626' : priority === 'Medium' ? '#d97706' : '#059669';
    const priorityBg = priority === 'High' ? '#fef2f2' : priority === 'Medium' ? '#fffbeb' : '#f0fdf4';
    const priorityLabel = priority === 'High' ? '🔴 High Priority' : priority === 'Medium' ? '🟡 Medium Priority' : '🟢 Low Priority';

    return buildEmail({
      title: `Reminder: ${text.substring(0, 50)}`,
      subtitle: 'Scheduled Reminder Notification',
      accentColor: priorityColor,
      bodyHtml: `
        <p style="margin: 0 0 12px 0;">Hello Admin,</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          This is a scheduled notification from your Helpdesk Reminder system.
        </p>
        <div style="background: ${priorityBg}; border-left: 4px solid ${priorityColor}; padding: 16px 20px; margin: 16px 0; border-radius: 6px;">
          <p style="margin: 0 0 6px 0; font-weight: 700; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">REMINDER</p>
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1e293b;">${text}</p>
        </div>
        <table style="${TABLE_WRAP}">
          ${tableRow('Scheduled Time', new Date(dateTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))}
          ${tableRow('Priority', `<strong style="color:${priorityColor};">${priorityLabel}</strong>`, true)}
          ${tableRow('Target Email', email || 'Admin')}
        </table>
      `,
    });
  },

  // 14. Asset Handover — to Employee
  assetHandover({ handover, assetName, items }) {
    const itemRows = (items || []).map((it, i) => tableRow(
      `Item ${i + 1}`,
      `${it.description || it.name || 'Asset'}${it.serialNumber ? ` — S/N: ${it.serialNumber}` : ''}${it.quantity ? ` (Qty: ${it.quantity})` : ''}`,
      i % 2 === 1
    )).join('');

    return buildEmail({
      title: `Asset Handover Confirmation — ${assetName || 'Office Assets'}`,
      subtitle: 'Asset Handover Acknowledgement',
      accentColor: '#0891b2',
      bodyHtml: `
        <p style="margin: 0 0 8px 0;">Dear ${handover.employeeName || handover.name},</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          The following office assets have been assigned to you. Please review the details and acknowledge receipt.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Employee Name', handover.employeeName || handover.name)}
          ${tableRow('Employee ID', handover.employeeId || 'N/A', true)}
          ${tableRow('Department', handover.department || 'N/A')}
          ${tableRow('Handover Date', handover.handoverDate || new Date().toLocaleDateString('en-IN'), true)}
          ${tableRow('Handled By', handover.handedBy || 'Admin')}
        </table>
        <p style="margin: 16px 0 8px 0; font-weight: 700; color: #374151;">Assets Handed Over:</p>
        <table style="${TABLE_WRAP}">${itemRows}</table>
        ${actionButton('View & Acknowledge Handover', `${APP_URL}/asset-acknowledgement?token=${handover.token || ''}`, '#0891b2')}
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #6b7280; text-align: center;">
          Please click the button above to digitally acknowledge receipt of the above assets.
        </p>
      `,
    });
  },

};

module.exports = { buildEmail, templates };
