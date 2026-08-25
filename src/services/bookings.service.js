const env = require('../config/env');
const crypto = require('crypto');
const { sendEmail } = require('../utils/notifications');
const { templates } = require('../utils/email-templates');
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
      if (b.status && (b.status.toLowerCase() === 'rejected' || b.status.toLowerCase() === 'cancelled')) return false;
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

const NOTIFICATION_CC = env.NOTIFICATION_CC;

const getCancelSig = (id, email) => {
  const secret = env.JWT_SECRET;
  return crypto.createHmac('sha256', secret).update(`${id}:${email}`).digest('hex');
};

exports.sendBookingRequestToAdminNotification = async (booking, host) => {
  const adminEmail = env.ADMIN_EMAIL;
  booking.cancelSig = getCancelSig(booking.id, booking.email);
  
  // 1. Separate confirmation email to Employee (NO CC to aravinth)
  if (booking.email) {
    const employeeSubject = `Conference Room Request Received: ${(() => { const s = booking.startDate || booking.date; const e = booking.endDate || booking.date; return s === e ? s : `${s} to ${e}`; })()} (${booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`})`;
    sendEmail({
      to: booking.email,
      subject: employeeSubject,
      htmlBody: templates.bookingSubmitted({ booking, host })
    }).catch(console.error);
  }

  // 2. Alert email to Admin (with aravinth@avanamedical.com + employee in CC)
  const adminCcList = [NOTIFICATION_CC];
  if (booking.email && !adminCcList.includes(booking.email)) {
    adminCcList.push(booking.email);
  }

  const adminSubject = ` ACTION REQUIRED: New Conference Room Request - ${booking.name}`;
  sendEmail({
    to: adminEmail,
    cc: adminCcList.join(', '),
    subject: adminSubject,
    htmlBody: templates.bookingAdminAlert({ booking, host })
  }).catch(console.error);
};

exports.sendBookingApprovalToEmployeeNotification = async (booking, host, approvalRemarks) => {
  if (!booking.email) return;
  booking.cancelSig = getCancelSig(booking.id, booking.email);
  const subject = ` Conference Room Booking Confirmed`;
  const htmlBody = templates.bookingApproved({ booking, host, approvalRemarks });
  return sendEmail({
    to: booking.email,
    subject,
    htmlBody
  }).catch(console.error);
};

exports.sendBookingRejectionToEmployeeNotification = async (booking, reason) => {
  if (!booking.email) return;
  const subject = ` REJECTED: Conference Room Booking Request`;
  const htmlBody = templates.bookingRejected({ booking, reason });
  return sendEmail({
    to: booking.email,
    subject,
    htmlBody
  }).catch(console.error);
};

exports.sendBookingCancellationNotification = async (booking) => {
  const adminEmail = env.ADMIN_EMAIL;

  if (booking.email) {
    const subject = `❌ CANCELLED: Conference Room Booking`;
    sendEmail({
      to: booking.email,
      subject,
      htmlBody: templates.bookingCancelled({ booking })
    }).catch(console.error);
  }

  const adminCcList = [NOTIFICATION_CC];
  if (booking.email && !adminCcList.includes(booking.email)) {
    adminCcList.push(booking.email);
  }

  const adminSubject = `❌ Room Booking Cancelled - ${booking.name}`;
  sendEmail({
    to: adminEmail,
    cc: adminCcList.join(', '),
    subject: adminSubject,
    htmlBody: templates.bookingCancelledAdminAlert({ booking })
  }).catch(console.error);
};
