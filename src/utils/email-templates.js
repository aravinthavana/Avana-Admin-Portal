
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
      detailsText = itemsArr.map(it => `<strong>${it.item || it.name || 'Item'}</strong> (Qty: ${it.quantity || it.qty || 1})`).join(', ');
    } else if (request.item) {
      detailsText = `${request.stationery_type || 'Item'}: <strong>${request.item}</strong> (Qty: ${request.quantity || 1})`;
    } else {
      detailsText = request.exact_issue || request.description || 'N/A';
    }
    
    const subcategory = request.subcategory || request.item_type || extraFields.request_type || extraFields.support_type || extraFields.service_type || extraFields.issue_type || 'N/A';
    const floor = request.floor || request.location || extraFields.floor || extraFields.location || 'N/A';
    const remarks = request.remarks || extraFields.remarks || 'None';
    
    return { detailsText, subcategory, floor, remarks };
  }

const env = require('../config/env');
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

const APP_URL = env.APP_URL;

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

          <!-- ── Header ── -->
          <tr>
            <td style="background: #ffffff; border-bottom: 3px solid ${accentColor}; padding: 20px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-weight: 800; font-size: 20px; color: #1e293b; letter-spacing: -0.02em; line-height: 1.2;">
                      Avana Admin Help Desk
                    </div>
                    <div style="font-size: 13px; color: ${accentColor}; margin-top: 4px; font-weight: 700;">
                      ${subtitle}
                    </div>
                  </td>
                  <td align="right">
                    <div style="padding: 6px 0; display: inline-block;">
                      <img src="cid:avanalogo" alt="Avana" style="height: 28px; display: block;" />
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

  // 2.5 Booking Request Received — to Employee (Pending Approval)
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
      subtitle: 'Booking Pending Approval',
      accentColor: '#b45309',
      bodyHtml: `
        <p style="margin: 0 0 6px 0;">Dear ${booking.name},</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          Your request for the conference room has been received and is currently <strong>pending review</strong> by the Admin team. You will receive another email once your booking is approved or if it needs to be rescheduled.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Booking Person Name', booking.name)}
          ${tableRow('Date', dateText, true)}
          ${tableRow('Time', timeText)}
          ${tableRow('Meeting Purpose', booking.reason, true)}
          ${tableRow('Food Requirement', foodText)}
          ${tableRow('Phone', booking.phone, true)}
          ${tableRow('Status', '<strong style="color:#b45309;">Pending Approval ⏳</strong>')}
        </table>
        <p style="margin: 16px 0;">Please wait for final confirmation before proceeding with your meeting arrangements.</p>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 8px;">
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280;">If you need to cancel this request, please click below:</p>
          ${actionButton('Cancel This Request', cancelUrl, '#dc2626')}
        </div>
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
    const cancelUrl = `${host || APP_URL}/api/bookings/cancel?id=${booking.id}&email=${encodeURIComponent(booking.email)}&sig=${booking.cancelSig || ''}`;

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
          ${(() => {
            let att = booking.attendees;
            if (typeof att === 'string') { try { att = JSON.parse(att); } catch (e) { att = [att]; } }
            return att && att.length ? tableRow('Attendees', att.join(', ')) : '';
          })()}
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
    const cancelUrl = `${host || APP_URL}/api/bookings/cancel?id=${booking.id}&email=${encodeURIComponent(booking.email)}&sig=${booking.cancelSig || ''}`;

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

  // 9. Helpdesk Request Submission — to Employee
  helpdeskSubmission(request) {
    let detailsText = '';
    let itemsArr = request.items;
    if (typeof itemsArr === 'string') {
      try { itemsArr = JSON.parse(itemsArr); } catch(e) {}
    }
    if (Array.isArray(itemsArr) && itemsArr.length) {
      detailsText = itemsArr.map(it => `<strong>${it.item || it.name || 'Item'}</strong> (Qty: ${it.quantity || it.qty || 1})`).join(', ');
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
          ${tableRow('Sub-Type / Priority', request.subcategory || request.item_type || 'N/A')}
          ${tableRow('Floor', floor, true)}
          ${tableRow('Details / Issue', detailsText)}
          ${tableRow('Remarks', remarks, true)}
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

  // 9.5 Helpdesk Request Alert — to Admin
  helpdeskAdminAlert(request, host) {
      const { detailsText, subcategory, floor, remarks } = extractHelpdeskDetails(request);
      const catTitle = request.categoryTitle || request.category;

    return buildEmail({
      title: `New Help Desk Request: ${catTitle} (#${request.id})`,
      subtitle: 'Admin Action Required',
      accentColor: '#dc2626',
      bodyHtml: `
        <p style="margin: 0 0 8px 0;">Hello Admin,</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          A new service request has been submitted by an employee. Please review and assign/resolve it.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Request ID', `<strong style="color:#dc2626;">#${request.id ? request.id.slice(0,8).toUpperCase() : 'N/A'}</strong>`)}
          ${tableRow('Category', catTitle, true)}
          ${tableRow('Sub-Type', subcategory)}
          ${tableRow('Location/Floor', floor, true)}
          ${tableRow('Details', detailsText)}
          ${tableRow('Remarks', remarks, true)}
          ${tableRow('Submitted By', request.requester_name || request.name || 'N/A')}
          ${tableRow('Contact', `${request.email || 'N/A'} / ${request.phone || 'N/A'}`, true)}
        </table>
        ${actionButton('Open Admin Dashboard', `${host || APP_URL}/helpdesk-admin`, '#dc2626')}
      `,
    });
  },

  // 9.6 Courier Dispatch Submission — to Employee
  courierDispatchSubmission(dispatch) {
    const itemsList = Array.isArray(dispatch.items) && dispatch.items.length 
      ? dispatch.items.map(it => `• ${it.description} (Qty: ${it.qty})`).join('<br/>')
      : 'N/A';

    return buildEmail({
      title: `Delivery Challan #${dispatch.dcNo} Generated`,
      subtitle: 'Courier Dispatch Confirmation',
      accentColor: '#10b981',
      bodyHtml: `
        <p style="margin: 0 0 8px 0;">Hello ${dispatch.senderName || 'Employee'},</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          Your courier dispatch request has been successfully created. Here is a copy of your Delivery Challan details:
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('DC Number', `<strong style="color:#10b981;">#${dispatch.dcNo}</strong>`)}
          ${tableRow('DC Date', dispatch.dcDate, true)}
          ${tableRow('Sender', `${dispatch.senderName} (${dispatch.senderPhone || 'N/A'})`)}
          ${tableRow('Receiver', `${dispatch.receiverName} (${dispatch.receiverPhone || 'N/A'})`, true)}
          ${tableRow('Destination Address', dispatch.toAddress)}
          ${tableRow('From Address', dispatch.fromAddressText, true)}
          ${tableRow('Transporter', dispatch.transporterName || 'N/A')}
          ${tableRow('No. of Boxes', dispatch.noOfBoxes || 1, true)}
          ${tableRow('Items Dispatched', itemsList)}
        </table>
        <p style="margin: 20px 0 0 0; font-size: 13px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          Please print this copy or note down the DC number for your records. The Admin team has been notified.
        </p>
      `,
    });
  },

  // 9.7 Courier Dispatch Alert — to Admin
  courierDispatchAdminAlert(dispatch, host) {
    return buildEmail({
      title: `New Courier Dispatch (#${dispatch.dcNo})`,
      subtitle: 'Admin Notification',
      accentColor: '#f59e0b',
      bodyHtml: `
        <p style="margin: 0 0 8px 0;">Hello Admin,</p>
        <p style="margin: 0 0 20px 0; color: #374151;">
          A new Courier Dispatch / Delivery Challan has been created by ${dispatch.senderName}.
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('DC Number', `<strong style="color:#f59e0b;">#${dispatch.dcNo}</strong>`)}
          ${tableRow('Sender', `${dispatch.senderName} (${dispatch.requesterEmail || 'N/A'})`, true)}
          ${tableRow('Receiver', `${dispatch.receiverName} - ${dispatch.toAddress}`)}
          ${tableRow('Transporter', dispatch.transporterName || 'N/A', true)}
          ${tableRow('No. of Boxes', dispatch.noOfBoxes || 1)}
        </table>
        ${actionButton('View in Admin Dashboard', `${host}/admin-login`, '#4f46e5')}
      `,
    });
  },

  // 10. Helpdesk Request Completed — to Employee
  helpdeskCompleted(request) {
      const { detailsText, subcategory, floor, remarks } = extractHelpdeskDetails(request);
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
          ${tableRow('Sub-Type / Priority', subcategory)}
          ${tableRow('Floor', floor, true)}
          ${tableRow('Details / Issue', detailsText)}
          ${tableRow('Remarks', remarks, true)}
          ${tableRow('Status', '<strong style="color:#10b981;">Completed ✔</strong>')}
        </table>
        <p style="margin: 16px 0 0 0; color: #374151;">In case of any further assistance, please feel free to contact us.</p>
      `,
    });
  },

  // 11. Helpdesk Request Rejected — to Employee
  helpdeskRejected(request, rejectionReason) {
      const { detailsText, subcategory, floor, remarks } = extractHelpdeskDetails(request);
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
          ${tableRow('Sub-Type / Priority', subcategory)}
          ${tableRow('Floor', floor, true)}
          ${tableRow('Details / Issue', detailsText)}
          ${tableRow('Remarks', remarks, true)}
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

  // 13.1 AMC Contract Renewal Reminder — to Admin & CC
  amcIndividualReminder({ amc }) {
    return buildEmail({
      title: `AMC Renewal Reminder: ${amc.equipment_name}`,
      subtitle: 'Annual Maintenance Contract Renewal (3 Weeks Notice)',
      accentColor: '#2563eb',
      bodyHtml: `
        ${highlightBox('🛠️ AMC Contract Expiration Notice — Renewal Action Required', '#2563eb', '#eff6ff')}
        <p style="margin: 0 0 16px 0; color: #374151;">
          This is an automated reminder that the following Annual Maintenance Contract (AMC) is scheduled to expire in approximately <strong>3 weeks</strong>:
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Equipment Name', `<strong>${amc.equipment_name}</strong>`)}
          ${tableRow('Vendor / Service Provider', amc.vendor_name || 'N/A', true)}
          ${tableRow('Contact Person / Phone', `${amc.contact_person || 'N/A'} ${amc.phone ? `(${amc.phone})` : ''}`)}
          ${tableRow('Contract Period', `${amc.start_date || 'N/A'} to <strong style="color:#dc2626;">${amc.end_date || 'N/A'}</strong>`, true)}
          ${tableRow('Annual Cost', amc.cost ? `₹${amc.cost}` : 'N/A')}
          ${tableRow('Current Status', `<strong style="color:#2563eb;">${amc.status || 'Active'}</strong>`, true)}
          ${tableRow('Remarks / Notes', amc.remarks || 'None')}
        </table>
        <p style="margin: 16px 0 0 0; color: #374151;">
          Please review the contract terms with the vendor and initiate renewal proceedings before the expiry date.
        </p>
        ${actionButton('View AMC Contracts', `${APP_URL}/helpdesk-admin/amc`, '#2563eb')}
      `,
    });
  },

  // 13.2 Utility Payment Due Reminder — to Admin & CC
  utilityIndividualReminder({ utility }) {
    return buildEmail({
      title: `Utility Bill Due Reminder: ${utility.utility_type} (${utility.provider_name})`,
      subtitle: 'Utility Payment Deadline (4 Days Notice)',
      accentColor: '#dc2626',
      bodyHtml: `
        ${highlightBox('⚡ Utility Payment Deadline Reminder — Due in 4 Days', '#dc2626', '#fef2f2')}
        <p style="margin: 0 0 16px 0; color: #374151;">
          This is an automated reminder that the following utility bill payment is due in <strong>4 days</strong>:
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Utility Service Type', `<strong>${utility.utility_type}</strong>`)}
          ${tableRow('Provider Name', utility.provider_name || 'N/A', true)}
          ${tableRow('Account / Consumer No', utility.account_number || 'N/A')}
          ${tableRow('Billing Cycle', utility.billing_cycle || 'N/A', true)}
          ${tableRow('Payment Due Date', `<strong style="color:#dc2626; font-size:16px;">${utility.due_date}</strong>`)}
          ${tableRow('Amount Payable', `<strong style="color:#111827; font-size:18px;">₹${utility.amount}</strong>`, true)}
          ${tableRow('Payment Status', `<strong style="color:#d97706;">${utility.status || 'Unpaid'}</strong>`)}
          ${tableRow('Remarks / Notes', utility.remarks || 'None', true)}
        </table>
        <p style="margin: 16px 0 0 0; color: #374151;">
          Please ensure the payment is processed before the due date to avoid service disruption or late penalty fees.
        </p>
        ${actionButton('Go to Utility Payments', `${APP_URL}/helpdesk-admin/utility-payments`, '#dc2626')}
      `,
    });
  },

  // 13.3 Tax Payment Due Reminder — to Admin & CC
  taxIndividualReminder({ tax }) {
    return buildEmail({
      title: `Tax Payment Due Reminder: ${tax.tax_type} (${tax.authority_name || tax.location || 'Municipal'})`,
      subtitle: 'Tax Payment Deadline (1 Month Notice)',
      accentColor: '#7c3aed',
      bodyHtml: `
        ${highlightBox('🏛️ Tax Payment Deadline Reminder — Due in 1 Month', '#7c3aed', '#f5f3ff')}
        <p style="margin: 0 0 16px 0; color: #374151;">
          This is an automated reminder that the following statutory / property tax payment is due in <strong>1 month</strong>:
        </p>
        <table style="${TABLE_WRAP}">
          ${tableRow('Tax Type', `<strong>${tax.tax_type}</strong>`)}
          ${tableRow('Authority / Location', tax.authority_name || tax.location || 'N/A', true)}
          ${tableRow('Assessment Year / Term', `${tax.year || tax.assessment_year || ''} ${tax.term ? `(${tax.term})` : ''}`.trim() || 'N/A')}
          ${tableRow('Bill / Challan No', tax.bill_no || 'N/A', true)}
          ${tableRow('Due Date', `<strong style="color:#7c3aed; font-size:16px;">${tax.due_date}</strong>`)}
          ${tableRow('Amount Payable', `<strong style="color:#111827; font-size:18px;">₹${tax.amount}</strong>`, true)}
          ${tableRow('Status', `<strong style="color:#d97706;">${tax.status || 'Unpaid'}</strong>`)}
          ${tableRow('Remarks / Notes', tax.remarks || 'None', true)}
        </table>
        <p style="margin: 16px 0 0 0; color: #374151;">
          Please review the assessment details and schedule the tax payment in advance.
        </p>
        ${actionButton('Go to Tax Payments', `${APP_URL}/helpdesk-admin/tax-payments`, '#7c3aed')}
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

  purchaseApprovalRequest: (request) => {
    const loginUrl = `${APP_URL}/purchase-approvals`;

    const bodyHtml = `
      <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">Purchase Request Approval Required</h3>
      <p>A new purchase request (<strong>${request.requestId}</strong>) has been submitted by <strong>${request.requestedBy}</strong>.</p>
      
      <table style="${TABLE_WRAP}">
        ${tableRow('Request ID', request.requestId)}
        ${tableRow('Item Name', request.itemName, true)}
        ${tableRow('Quantity', request.quantity)}
        ${tableRow('Unit Amount', '₹' + request.unitAmount, true)}
        ${tableRow('GST Amount', '₹' + request.gstAmount)}
        ${tableRow('Final Amount', '<strong>₹' + request.finalAmount + '</strong>', true)}
        ${tableRow('Mode', request.modeOfPurchase)}
        ${tableRow('Link', request.purchaseLink ? `<a href="${request.purchaseLink}">View Link</a>` : 'N/A', true)}
      </table>

      ${highlightBox('<strong>Reason:</strong> ' + request.reason, '#0ea5e9', '#f0f9ff')}

      <div style="margin-top: 24px; text-align: center;">
        <p style="margin-bottom: 16px; color: #374151;">Please login to the Admin Portal to Approve, Reject, or Discuss this request.</p>
        ${actionButton('Review Purchase Request', loginUrl, '#16a34a')}
      </div>
    `;
    return buildEmail({
      title: 'Purchase Approval Request',
      subtitle: 'Purchase Module',
      accentColor: '#0ea5e9',
      bodyHtml
    });
  },

  purchaseStatusUpdate: (request) => {
    let statusColor = '#f59e0b';
    if (request.status === 'Approved') statusColor = '#16a34a';
    if (request.status === 'Rejected') statusColor = '#dc2626';
    if (request.status === 'Purchased') statusColor = '#9333ea';
    
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
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; text-align: right; color: #64748b; font-size: 13px;">${index + 1}</td>
          <td style="padding: 10px 12px; font-weight: 600; color: #1e293b; font-size: 13px;">${item.itemName || 'Item'}</td>
          <td style="padding: 10px 12px; text-align: right; color: #1e293b; font-size: 13px;">${qty}</td>
          <td style="padding: 10px 12px; text-align: right; color: #1e293b; font-size: 13px;">&#8377;${unit.toFixed(2)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #64748b; font-size: 13px;">&#8377;${gst.toFixed(2)}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0f172a; font-size: 13px;">&#8377;${total.toFixed(2)}</td>
        </tr>
      `;
    });

    const itemsBox = `
      <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="background: #f8fafc; padding: 12px 16px; border-bottom: 1px solid #cbd5e1; font-weight: 700; color: #1e293b; font-size: 14px;">
          Requested Items &amp; Pricing
        </div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 8px 12px; text-align: right; width: 40px;">#</th>
                <th style="padding: 8px 12px; text-align: left;">Item Name</th>
                <th style="padding: 8px 12px; text-align: right; width: 60px;">Qty</th>
                <th style="padding: 8px 12px; text-align: right; width: 90px;">Price / Unit</th>
                <th style="padding: 8px 12px; text-align: right; width: 70px;">GST</th>
                <th style="padding: 8px 12px; text-align: right; width: 90px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: 700;">
                <td colspan="5" style="padding: 10px 12px; text-align: right; color: #1e293b; border-top: 2px solid #cbd5e1;">Grand Total:</td>
                <td style="padding: 10px 12px; text-align: right; color: #16a34a; font-size: 15px; border-top: 2px solid #cbd5e1;">&#8377;${parseFloat(request.finalAmount || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;

    const statusBadge = request.status === 'Approved' ? '✅ Approved' : request.status === 'Rejected' ? '❌ Rejected' : request.status === 'Need to Discuss' ? '💬 Need to Discuss' : request.status;

    const bodyHtml = `
      <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">Purchase Request Status Update</h3>
      <p style="color: #334155; margin-bottom: 16px;">Your purchase request (<strong>${request.requestId}</strong>) has been <strong>${request.status}</strong> by <strong>${request.approvalPersonEmail || 'Approver'}</strong>.</p>
      
      ${highlightBox('<strong>Current Status:</strong> ' + statusBadge, statusColor, '#f8fafc')}

      ${itemsBox}

      <table style="${TABLE_WRAP}">
        ${tableRow('Request ID', request.requestId)}
        ${tableRow('Status', `<strong style="color:${statusColor};">${statusBadge}</strong>`, true)}
        ${tableRow('Mode of Purchase', request.modeOfPurchase || 'N/A')}
        ${request.storeName ? tableRow('Store Name', request.storeName, true) : ''}
        ${tableRow('Approver', request.approvalPersonEmail || 'N/A', !request.storeName)}
        ${request.approverComments ? tableRow('Approver Comments', request.approverComments, true) : ''}
        ${request.rejectionReason ? tableRow('Rejection Reason', `<span style="color:#dc2626;">${request.rejectionReason}</span>`, true) : ''}
        ${request.reason ? tableRow('Purchase Reason', request.reason, true) : ''}
      </table>
      
      <p style="margin-top: 20px; font-size: 13px; color: #64748b;">Please log in to the Avana admin portal to view complete details or proceed with purchasing.</p>
    `;
    
    return buildEmail({
      title: `Purchase Request ${request.requestId} - ${request.status}`,
      subtitle: 'Purchase Management',
      accentColor: statusColor,
      bodyHtml
    });
  }

};

module.exports = { buildEmail, templates };
