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

exports.sendHelpdeskNotification = async (request, host) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const catTitle = request.categoryTitle || request.category;
  const emailSubject = `Help Desk Request #${request.id}: ${catTitle}`;
  const emailHtml = templates.helpdeskSubmission(request);

  try {
    const sends = [];
    if (request.requester_email || request.email) {
      sends.push(sendEmail({ to: request.requester_email || request.email, subject: emailSubject, htmlBody: emailHtml }));
    }
    sends.push(sendEmail({ to: adminEmail, subject: emailSubject, htmlBody: emailHtml }));
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
    await sendEmail({ to: emailToSend, subject: emailSubject, htmlBody: emailHtml });
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
    await sendEmail({ to: emailToSend, subject: emailSubject, htmlBody: emailHtml });
  } catch (error) {
    console.error('Background sendHelpdeskRejectionEmailNotification failed:', error);
  }
};

