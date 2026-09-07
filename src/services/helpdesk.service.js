const env = require('../config/env');
const { sendEmail } = require('../utils/notifications');
const { templates } = require('../utils/email-templates');
const prisma = require('../config/db');

exports.getAllRequests = async () => {
  try {
    const rows = await prisma.helpdeskRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return rows;
  } catch (err) {
    console.error('Error reading helpdesk:', err);
    return [];
  }
};

exports.saveRequest = async (r) => {
  try {
    const itemsStr = r.items ? (typeof r.items === 'string' ? r.items : JSON.stringify(r.items)) : '';
    await prisma.helpdeskRequest.upsert({
      where: { id: r.id },
      update: {
        category: r.category, name: r.name, email: r.email, phone: r.phone,
        location: r.location, description: r.description, items: itemsStr,
        status: r.status, createdAt: r.createdAt, resolution: r.resolution
      },
      create: {
        id: r.id, category: r.category, name: r.name, email: r.email, phone: r.phone,
        location: r.location, description: r.description, items: itemsStr,
        status: r.status, createdAt: r.createdAt, resolution: r.resolution
      }
    });
    return true;
  } catch (err) {
    console.error('Error writing helpdesk request:', err);
    return false;
  }
};

exports.deleteRequest = async (id) => {
  try {
    await prisma.helpdeskRequest.delete({ where: { id } });
    return true;
  } catch (err) {
    return false;
  }
};

const NOTIFICATION_CC = env.NOTIFICATION_CC;

exports.sendHelpdeskNotification = async (request, host) => {
  const adminEmail = env.ADMIN_EMAIL;
  const employeeEmail = request.requester_email || request.email;
  const catTitle = request.categoryTitle || request.category || 'Help Desk';
  const emailSubject = `Help Desk Request #${request.id}: ${catTitle}`;

  // 1. Separate confirmation email to Employee
  if (employeeEmail) {
    try {
      const employeeHtml = templates.helpdeskSubmission(request);
      await sendEmail({
        to: employeeEmail,
        subject: emailSubject,
        htmlBody: employeeHtml
      });
    } catch (empErr) {
      console.error('Failed to send employee helpdesk confirmation email:', empErr);
    }
  }

  // 2. Alert email to Admin (with NOTIFICATION_CC in CC)
  try {
    const adminHtml = templates.helpdeskAdminAlert(request, host);
    await sendEmail({
      to: adminEmail,
      cc: NOTIFICATION_CC,
      subject: `🚨 ACTION REQUIRED: New Help Desk Request #${request.id}`,
      htmlBody: adminHtml
    });
    console.log(`[Helpdesk Notification] Admin alert sent successfully to ${adminEmail} for request #${request.id}`);
  } catch (adminErr) {
    console.error('Failed to send admin helpdesk alert email:', adminErr);
  }
};

exports.sendHelpdeskCompletionEmailNotification = async (request, host) => {
  const emailToSend = request.requester_email || request.email;
  if (!emailToSend) return;

  const catTitle = request.categoryTitle || request.category;
  const emailSubject = `Service Request #${request.id} Completed: ${catTitle}`;
  const emailHtml = templates.helpdeskCompleted(request);

  try {
    await sendEmail({
      to: emailToSend,
      subject: emailSubject,
      htmlBody: emailHtml
    });
  } catch (error) {
    console.error('Background sendHelpdeskCompletionEmailNotification failed:', error);
  }
};

exports.sendHelpdeskRejectionEmailNotification = async (request, host, rejectionReason) => {
  const emailToSend = request.requester_email || request.email;
  if (!emailToSend) return;

  const catTitle = request.categoryTitle || request.category;
  const emailSubject = `Service Request #${request.id} Rejected: ${catTitle}`;
  const emailHtml = templates.helpdeskRejected(request, rejectionReason);

  try {
    await sendEmail({
      to: emailToSend,
      subject: emailSubject,
      htmlBody: emailHtml
    });
  } catch (error) {
    console.error('Background sendHelpdeskRejectionEmailNotification failed:', error);
  }
};

