const prisma = require('../config/db');
const { sendEmail } = require('../utils/notifications');
const { templates } = require('../utils/email-templates');
const crypto = require('crypto');

exports.createPurchaseRequest = async (data, host) => {
  const approvalToken = crypto.randomBytes(32).toString('hex');
  
  const created = await prisma.purchaseRequest.create({
    data: {
      itemName: data.itemName,
      quantity: parseInt(data.quantity, 10),
      amount: parseFloat(data.amount),
      totalAmount: parseFloat(data.quantity) * parseFloat(data.amount),
      modeOfPurchase: data.modeOfPurchase,
      link: data.link || null,
      itemImage: data.itemImage || null,
      reason: data.reason,
      gstStatus: data.gstStatus,
      approvalEmail: data.approvalEmail,
      requesterEmail: data.requesterEmail,
      requesterName: data.requesterName || 'Employee',
      status: 'Pending Approval',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvalToken
    }
  });

  // Send email to approver
  try {
    const htmlBody = templates.purchaseApprovalRequest(created, host);
    await sendEmail({
      to: data.approvalEmail,
      subject: `Action Required: Purchase Request from ${created.requesterName}`,
      htmlBody
    });
  } catch (err) {
    console.error('Failed to send approval email:', err);
  }

  return created;
};

exports.getAllPurchases = async () => {
  return prisma.purchaseRequest.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

exports.handleApprovalAction = async (token, action, host) => {
  const request = await prisma.purchaseRequest.findUnique({
    where: { approvalToken: token }
  });

  if (!request) {
    throw new Error('Invalid or expired approval token.');
  }

  if (request.status !== 'Pending Approval' && request.status !== 'Need to Discuss') {
    throw new Error(`This request has already been processed (Current Status: ${request.status}).`);
  }

  const validActions = ['Approved', 'Rejected', 'Need to Discuss'];
  if (!validActions.includes(action)) {
    throw new Error('Invalid action.');
  }

  const updated = await prisma.purchaseRequest.update({
    where: { id: request.id },
    data: {
      status: action,
      approvalDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });

  // Send status update to requester
  try {
    const htmlBody = templates.purchaseStatusUpdate(updated, host);
    await sendEmail({
      to: updated.requesterEmail,
      subject: `Update on your Purchase Request: ${updated.itemName}`,
      htmlBody
    });
  } catch (err) {
    console.error('Failed to send status email:', err);
  }

  return updated;
};

exports.markAsPurchased = async (id, data) => {
  const request = await prisma.purchaseRequest.findUnique({ where: { id } });
  if (!request) throw new Error('Purchase request not found');

  if (request.status !== 'Approved') {
    throw new Error('Only approved requests can be marked as purchased');
  }

  return prisma.purchaseRequest.update({
    where: { id },
    data: {
      status: 'Purchased',
      orderId: data.orderId,
      deliveryDate: data.deliveryDate,
      actualAmount: parseFloat(data.actualAmount),
      updatedAt: new Date().toISOString()
    }
  });
};
