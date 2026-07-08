const crypto = require('crypto');
const { sendEmail } = require('../utils/notifications');
const prisma = require('../config/db');

// Prisma: read bookings
const getBookings = async () => {
  try {
    const rows = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return rows;
  } catch (err) {
    console.error('Error reading bookings:', err);
    return [];
  }
};

// Prisma: Insert or update a booking
const saveBooking = async (b) => {
  try {
    await prisma.booking.upsert({
      where: { id: b.id },
      update: {
        name: b.name, email: b.email, phone: b.phone, date: b.date,
        startDate: b.startDate, endDate: b.endDate, bookingType: b.bookingType,
        startTime: b.startTime, endTime: b.endTime, reason: b.reason,
        attendees: b.attendees, remarks: b.remarks, food: b.food,
        foodSpecify: b.foodSpecify, foodCount: b.foodCount,
        createdAt: b.createdAt, status: b.status
      },
      create: {
        id: b.id, name: b.name, email: b.email, phone: b.phone, date: b.date,
        startDate: b.startDate, endDate: b.endDate, bookingType: b.bookingType,
        startTime: b.startTime, endTime: b.endTime, reason: b.reason,
        attendees: b.attendees, remarks: b.remarks, food: b.food,
        foodSpecify: b.foodSpecify, foodCount: b.foodCount,
        createdAt: b.createdAt, status: b.status
      }
    });
    return true;
  } catch (err) {
    console.error('Error writing booking:', err);
    return false;
  }
};

const deleteBooking = async (id) => {
  try {
    await prisma.booking.delete({ where: { id } });
    return true;
  } catch (err) {
    return false;
  }
};

// Convert "HH:MM" to minutes from midnight
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Generate all date strings in the range [startDateStr, endDateStr]
const getDatesInRange = (startDateStr, endDateStr) => {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

exports.checkConflict = (newBooking, existingBookings) => {
  const newStart = newBooking.startDate || newBooking.date;
  const newEnd = newBooking.endDate || newBooking.date;

  if (new Date(newStart + 'T00:00:00') > new Date(newEnd + 'T00:00:00')) {
    return 'End date must be on or after start date.';
  }

  const requestedDates = getDatesInRange(newStart, newEnd);

  for (const date of requestedDates) {
    const sameDateBookings = existingBookings.filter(b => {
      if (b.status && b.status !== 'confirmed') return false;
      const bStart = b.startDate || b.date;
      const bEnd = b.endDate || b.date;
      return date >= bStart && date <= bEnd;
    });

    if (sameDateBookings.some(b => b.bookingType === 'full')) {
      return `The room is already booked for the entire day on ${date}.`;
    }

    if (newBooking.bookingType === 'full' && sameDateBookings.length > 0) {
      return `The room has existing bookings on ${date} and cannot be booked for the full day.`;
    }

    if (newBooking.bookingType === 'time') {
      const newTimeStart = timeToMinutes(newBooking.startTime);
      const newTimeEnd = timeToMinutes(newBooking.endTime);

      if (newTimeStart >= newTimeEnd) {
        return 'End time must be after start time.';
      }

      for (const b of sameDateBookings) {
        if (b.bookingType === 'full') {
          return `The room is already booked for the entire day on ${date}.`;
        }
        if (b.bookingType === 'time') {
          const bTimeStart = timeToMinutes(b.startTime);
          const bTimeEnd = timeToMinutes(b.endTime);

          if (newTimeStart < bTimeEnd && newTimeEnd > bTimeStart) {
            return `Time slot conflicts with an existing booking on ${date}: ${b.startTime} - ${b.endTime} (${b.name})`;
          }
        }
      }
    }
  }
  return null;
};

exports.getAllBookings = getBookings;
exports.saveBooking = saveBooking;
exports.deleteBooking = deleteBooking;

exports.sendBookingRequestToAdminNotification = async (booking, host) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  
  const foodText = booking.food === 'none' 
    ? 'No Food' 
    : `${booking.food === 'others' ? `Other (${booking.foodSpecify})` : booking.food} (Count: ${booking.foodCount || 0})`;

  const timeText = booking.bookingType === 'full' 
    ? 'Full Day' 
    : `${booking.startTime} to ${booking.endTime}`;

  const start = booking.startDate || booking.date;
  const end = booking.endDate || booking.date;
  const dateText = start === end ? start : `${start} to ${end}`;

  // 1. Send confirmation to Employee
  if (booking.email) {
    const employeeSubject = `Conference Room Booked: ${dateText} (${timeText})`;
    const employeeHtml = `
      <div style="font-family: Calibri, Arial, sans-serif; max-width: 650px; margin: auto; padding: 20px; color: #000000; line-height: 1.5; font-size: 15px;">
        <p style="margin-bottom: 15px;">Dear ${booking.name},</p>
        <p style="margin-bottom: 20px;">Your request for the conference room booking has been received, and the room has been successfully reserved.</p>
        
        <p style="margin-bottom: 8px; font-weight: bold;">Booking Details:</p>
        <ul style="list-style-type: none; padding-left: 15px; margin-top: 0; margin-bottom: 25px;">
          <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Booking Person Name: ${booking.name}</li>
          <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Date: ${dateText}</li>
          <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Time: ${timeText}</li>
          <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Meeting Purpose: ${booking.reason}</li>
          <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Food Requirement: ${foodText}</li>
        </ul>
        
        <p style="margin-bottom: 5px; font-weight: bold;">Important Note:</p>
        <p style="margin-top: 0; margin-bottom: 25px;">After completing the meeting, kindly ensure that the lights, AC, and TV are switched off. Also, please remove any meeting-related papers or chat items/materials used during the meeting and do not leave any items in the storage unit.</p>
        
        <p style="margin-bottom: 10px;">The conference room has been blocked for the above-mentioned schedule.</p>
        <p style="margin-top: 0; margin-bottom: 20px;">In case of any further assistance , please feel free to contact us.</p>

        <div style="margin-top: 20px; border-top: 1px solid #dddddd; padding-top: 20px;">
          <p style="margin-top: 0; margin-bottom: 15px;">For cancellation of room Please click below</p>
          <a href="${host}/api/bookings/cancel?id=${booking.id}&email=${encodeURIComponent(booking.email)}" 
             style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px;">
            Cancel This Booking
          </a>
        </div>
      </div>
    `;
    sendEmail({ to: booking.email, subject: employeeSubject, htmlBody: employeeHtml }).catch(console.error);
  }

  // 2. Send actionable alert to Admin
  const adminSubject = ` ACTION REQUIRED: New Conference Room Request - ${booking.name}`;
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">New Booking Request Submitted</h2>
      <p>Hello Admin,</p>
      <p>An employee has requested to book the conference room. Here are the booking details:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee; width: 35%;">Requester Name:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${booking.name}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Email Address:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${booking.email}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Phone:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${booking.phone}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Date:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${dateText}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Timings:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${timeText}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Purpose / Reason:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${booking.reason}</td>
        </tr>
      </table>

      <p style="margin-top: 25px; text-align: center;">
        <a href="${host}/admin" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Open Admin Portal to Approve / Reject
        </a>
      </p>
    </div>
  `;
  sendEmail({ to: adminEmail, subject: adminSubject, htmlBody: adminHtml }).catch(console.error);
};

exports.sendBookingApprovalToEmployeeNotification = async (booking, host) => {
  const foodText = booking.food === 'none' ? 'No Food' : `${booking.food} (Count: ${booking.foodCount})`;
  const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
  const start = booking.startDate || booking.date;
  const end = booking.endDate || booking.date;
  const dateText = start === end ? start : `${start} to ${end}`;
  const subject = ` Conference Room Booking Confirmed`;

  const htmlBody = `
    <div style="font-family: Calibri, Arial, sans-serif; max-width: 650px; margin: auto; padding: 20px; color: #000000; line-height: 1.5; font-size: 15px;">
      <p style="margin-bottom: 15px; font-weight: bold; color: #059669; font-size: 1.1rem;"> Your booking has been confirmed!</p>
      <p style="margin-bottom: 15px;">Dear ${booking.name},</p>
      <p style="margin-bottom: 20px;">Your request for the conference room booking has been reviewed and confirmed by the Admin team.</p>
      
      <p style="margin-bottom: 8px; font-weight: bold;">Confirmed Details:</p>
      <ul style="list-style-type: none; padding-left: 15px; margin-top: 0; margin-bottom: 25px;">
        <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Date: ${dateText}</li>
        <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Time: ${timeText}</li>
        <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Meeting Purpose: ${booking.reason}</li>
        <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Food Arrangement: ${foodText}</li>
      </ul>
      
      <p style="margin-bottom: 5px; font-weight: bold;">Important Meeting Rules:</p>
      <p style="margin-top: 0; margin-bottom: 25px;">After completing the meeting, kindly ensure that the lights, AC, and TV are switched off. Also, please remove any meeting-related papers or materials and do not leave any trash behind.</p>
      
      <div style="margin-top: 20px; border-top: 1px solid #dddddd; padding-top: 20px;">
        <p style="margin-top: 0; margin-bottom: 15px;">For cancellation of room Please click below</p>
        <a href="${host}/api/bookings/cancel?id=${booking.id}&email=${encodeURIComponent(booking.email)}" 
           style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px;">
          Cancel This Booking
        </a>
      </div>
    </div>
  `;

  if (booking.email) {
    return sendEmail({ to: booking.email, subject, htmlBody }).catch(console.error);
  }
};

exports.sendBookingRejectionToEmployeeNotification = async (booking, reason) => {
  const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
  const start = booking.startDate || booking.date;
  const end = booking.endDate || booking.date;
  const dateText = start === end ? start : `${start} to ${end}`;
  const subject = ` REJECTED: Conference Room Booking Request`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff;">
      <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Booking Request Rejected</h2>
      <p>Dear ${booking.name},</p>
      <p>We regret to inform you that your request to book the conference room has been declined by the Admin team.</p>
      
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <strong style="color: #991b1b; display: block; margin-bottom: 5px;">Reason for Rejection:</strong>
        <span style="color: #7f1d1d;">${reason}</span>
      </div>

      <p style="margin-bottom: 8px; font-weight: bold;">Request Details:</p>
      <ul style="padding-left: 20px; margin-top: 0; margin-bottom: 20px; color: #4b5563;">
        <li style="margin-bottom: 5px;">Date: ${dateText}</li>
        <li style="margin-bottom: 5px;">Time: ${timeText}</li>
        <li style="margin-bottom: 5px;">Purpose: ${booking.reason}</li>
      </ul>
      
      <p style="color: #6b7280; font-size: 0.9rem; margin-top: 25px;">Please check the calendar page to find alternative available times or submit another request.</p>
    </div>
  `;

  if (booking.email) {
    return sendEmail({ to: booking.email, subject, htmlBody }).catch(console.error);
  }
};
