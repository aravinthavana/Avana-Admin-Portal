const { sendEmail } = require('../utils/notifications');
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
  
  let detailsText = '';
  if (Array.isArray(request.items)) {
    detailsText = request.items.map(it => `<strong>${it.item}</strong> (Qty: ${it.quantity})`).join(', ');
  } else if (request.item) {
    detailsText = `${request.stationery_type || 'Item'}: <strong>${request.item}</strong> (Qty: ${request.quantity || 1})`;
  } else {
    detailsText = request.exact_issue || request.description || 'N/A';
  }

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">Avana Help Desk - Request #${request.id} Confirmation</h2>
      <p>Hello,</p>
      <p>Your help desk request has been successfully received by the Admin team. Here are the details of your submission:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee; width: 35%;">Service Request No:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #4f46e5;">#${request.id}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Category:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${catTitle}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Sub-Type / Priority:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.subcategory || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Floor:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.floor || request.location || 'N/A'}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Details / Issue:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${detailsText}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Remarks:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.remarks || 'None'}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Requested By:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.requester_name || request.name || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.requester_email || request.email || 'N/A'}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Phone:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.requester_phone || request.phone || 'N/A'}</td>
        </tr>
      </table>
      
      <p style="margin-top: 25px; font-size: 0.9em; color: #555; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
        The Admin team is reviewing your request and will take action shortly.
      </p>
    </div>
  `;

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
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const emailToSend = request.requester_email || request.email;
  if (!emailToSend) return;

  const catTitle = request.categoryTitle || request.category;
  const emailSubject = `Service Request #${request.id} Completed: ${catTitle}`;
  
  let detailsText = '';
  if (Array.isArray(request.items)) {
    detailsText = request.items.map(it => `<strong>${it.item}</strong> (Qty: ${it.quantity})`).join(', ');
  } else if (request.item) {
    detailsText = `${request.stationery_type || 'Item'}: <strong>${request.item}</strong> (Qty: ${request.quantity || 1})`;
  } else {
    detailsText = request.exact_issue || request.description || 'N/A';
  }

  const emailHtml = `
    <div style="font-family: Calibri, Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff; color: #000000; line-height: 1.5; font-size: 15px;">
      <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px; margin-top: 0;">Avana Help Desk - Request #${request.id} Completed</h2>
      <p style="margin-bottom: 15px;">Dear ${request.requester_name || request.name || 'Employee'},</p>
      <p style="margin-bottom: 20px;">We are pleased to inform you that your service request (<strong>#${request.id}</strong>) has been successfully completed by the Admin team.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; font-size: 15px;">
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee; width: 35%;">Service Request No:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #10b981;">#${request.id}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Category:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${catTitle}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Sub-Type / Priority:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.subcategory || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Floor:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.floor || request.location || 'N/A'}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Details / Issue:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${detailsText}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Remarks:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.remarks || 'None'}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Status:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #10b981;">Completed &#10004;</td>
        </tr>
      </table>
      
      <p style="margin-top: 0; margin-bottom: 10px;">In case of any further assistance , please feel free to contact us.</p>
    </div>
  `;

  try {
    await sendEmail({ to: emailToSend, subject: emailSubject, htmlBody: emailHtml });
  } catch (error) {
    console.error('Background sendHelpdeskCompletionEmailNotification failed:', error);
  }
};
