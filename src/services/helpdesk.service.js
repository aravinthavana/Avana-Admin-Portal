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
  const catTitle = request.categoryTitle || request.category;
  const emailSubject = `Help Desk Request #${request.id}: ${catTitle}`;
  const employeeHtml = templates.helpdeskSubmission(request);
  const adminHtml = templates.helpdeskAdminAlert(request, host);

  try {
    const sends = [];
    // 1. Separate confirmation email to Employee (NO CC to aravinth)
    if (employeeEmail) {
      sends.push(sendEmail({
        to: employeeEmail,
        subject: emailSubject,
        htmlBody: employeeHtml
      }));
    }

    // 2. Alert email to Admin (with srinivasan@avanamedical.com + Employee in CC)
    const adminCcList = [NOTIFICATION_CC];
    if (employeeEmail && !adminCcList.includes(employeeEmail)) {
      adminCcList.push(employeeEmail);
    }

    sends.push(sendEmail({
      to: adminEmail,
      cc: adminCcList.join(', '),
      subject: `ACTION REQUIRED: New Help Desk Request #${request.id}`,
      htmlBody: adminHtml
    }));
    await Promise.all(sends);
  } catch (error) {
    console.error('Background sendHelpdeskEmailNotification failed:', error);
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

