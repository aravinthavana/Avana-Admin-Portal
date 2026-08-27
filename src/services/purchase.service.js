const env = require('../config/env');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const { templates } = require('../utils/email-templates');
const { sendEmail } = require('./helpdesk.service'); // we'll check how emails are sent
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// Try to use existing email sender
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendMail = async (options) => {
    try {
        await transporter.sendMail({
            from: env.SMTP_FROM,
            ...options
        });
    } catch (e) {
        console.error("Email send failed", e);
    }
};

const generateRequestId = async () => {
    const year = new Date().getFullYear();
    const count = await prisma.purchaseRequest.count({
        where: {
            requestId: {
                startsWith: `PUR-${year}-`
            }
        }
    });
    const nextNum = (count + 1).toString().padStart(4, '0');
    return `PUR-${year}-${nextNum}`;
};

const createPurchaseRequest = async (data) => {
    const requestId = await generateRequestId();
    
    let unitAmount = parseFloat(data.unitAmount);
    let quantity = parseInt(data.quantity, 10);
    let hasGst = data.hasGst === 'true' || data.hasGst === true;
    let gstPercentage = hasGst ? parseFloat(data.gstPercentage) : 0;
    
    let subtotal = unitAmount * quantity;
    let gstAmount = hasGst ? (subtotal * gstPercentage) / 100 : 0;
    let finalAmount = subtotal + gstAmount;

    if (data.itemsJson) {
      gstAmount = parseFloat(data.gstAmount) || 0;
      finalAmount = parseFloat(data.finalAmount) || 0;
    }

    const request = await prisma.purchaseRequest.create({
        data: {
            itemsJson: data.itemsJson || null,
            requestId,
            itemName: data.itemName,
            quantity,
            unitAmount,
            hasGst,
            gstPercentage,
            gstAmount,
            finalAmount,
            modeOfPurchase: data.modeOfPurchase,
            storeName: data.storeName || null,
            purchaseLink: data.purchaseLink || null,
            itemImage: data.itemImage || null,
            reason: data.reason,
            approvalPersonEmail: data.approvalPersonEmail,
            requestedBy: data.requestedBy,
            status: 'Pending Approval',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    });



    return request;
};

const getPurchases = async (filters) => {
    let where = {};
    
    if (filters.status) {
        where.status = filters.status;
    }
    
    if (filters.search) {
        where.OR = [
            { requestId: { contains: filters.search } },
            { itemName: { contains: filters.search } },
            { requestedBy: { contains: filters.search } },
            { orderId: { contains: filters.search } }
        ];
    }
    
    if (filters.requestedBy) {
        where.requestedBy = filters.requestedBy;
    }
    
    if (filters.approvalPersonEmail) {
        where.approvalPersonEmail = filters.approvalPersonEmail;
    }
    
    if (filters.month && filters.year) {
        // Simple string matching since dates are stored as ISO strings
        const monthPrefix = `${filters.year}-${filters.month.padStart(2, '0')}`;
        where.createdAt = { startsWith: monthPrefix };
    }

    return await prisma.purchaseRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    });
};

const getPurchaseById = async (id) => {
    return await prisma.purchaseRequest.findUnique({
        where: { id }
    });
};

const updateStatus = async (id, data) => {
    const { status, comments, reason, approverEmail } = data;
    
    const purchase = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!purchase) throw new Error('Purchase request not found');
    
    if (approverEmail.toLowerCase() !== purchase.approvalPersonEmail.toLowerCase()) {
        throw new Error('Unauthorized approver');
    }

    const updateData = {
        status,
        approvalDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (status === 'Approved' || status === 'Need to Discuss') {
        updateData.approverComments = comments;
    }
    if (status === 'Rejected') {
        updateData.rejectionReason = reason;
    }

    const updated = await prisma.purchaseRequest.update({
        where: { id },
        data: updateData
    });

    try {
        const emailContent = templates.purchaseStatusUpdate(updated);
        await sendMail({
            to: purchase.requestedBy,
            subject: `Purchase Request ${updated.requestId} - ${updated.status}`,
            html: emailContent
        });
    } catch (e) {
        console.error('Failed to send status update email', e);
    }

    return updated;
};

const markPurchased = async (id, data) => {
    const updated = await prisma.purchaseRequest.update({
        where: { id },
        data: {
            status: 'Purchased',
            orderId: data.orderId,
            deliveryDate: data.deliveryDate,
            exactPurchaseAmount: parseFloat(data.exactPurchaseAmount),
            purchaseDate: data.purchaseDate || new Date().toISOString(),
            invoiceFile: data.invoiceFile,
            purchaseRemarks: data.purchaseRemarks,
            updatedAt: new Date().toISOString()
        }
    });

    return updated;
};

const generateExcelReport = async (filters) => {
    const purchases = await getPurchases(filters);
    
    const data = purchases.map(p => ({
        'Request ID': p.requestId,
        'Date': new Date(p.createdAt).toLocaleDateString(),
        'Item': p.itemName,
        'Qty': p.quantity,
        'Amount': p.unitAmount,
        'GST Amount': p.gstAmount,
        'Final Amount': p.finalAmount,
        'Mode': p.modeOfPurchase,
        'Requested By': p.requestedBy,
        'Approver': p.approvalPersonEmail,
        'Status': p.status,
        'Order ID': p.orderId || '',
        'Delivery Date': p.deliveryDate || '',
        'Exact Purchase Amount': p.exactPurchaseAmount || ''
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Purchases");
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
};

const generatePdfReport = async (id) => {
    const p = await getPurchaseById(id);
    if (!p) throw new Error("Not found");

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const drawText = (text, x, y, size = 12, isBold = false) => {
        page.drawText(text || '', {
            x, y, size, font: isBold ? boldFont : font, color: rgb(0, 0, 0)
        });
    };

    drawText('Avana Purchase Request Record', 50, 800, 18, true);
    
    drawText(`Request ID: ${p.requestId}`, 50, 760, 12, true);
    drawText(`Date: ${new Date(p.createdAt).toLocaleString()}`, 50, 740);
    drawText(`Status: ${p.status}`, 50, 720, 12, true);
    
    drawText(`Requested By: ${p.requestedBy}`, 300, 760);
    drawText(`Approver: ${p.approvalPersonEmail}`, 300, 740);
    
    drawText('Purchase Items Details', 50, 680, 14, true);
    
    let items = [];
    if (p.itemsJson) {
        try { items = JSON.parse(p.itemsJson); } catch(e) {}
    }
    
    let currentY = 650;
    
    if (items.length > 0) {
        // Draw Table Header
        drawText('S.No', 50, currentY, 10, true);
        drawText('Item Name', 90, currentY, 10, true);
        drawText('Qty', 280, currentY, 10, true);
        drawText('Amount', 320, currentY, 10, true);
        drawText('GST Val', 390, currentY, 10, true);
        drawText('Total Amount', 460, currentY, 10, true);
        currentY -= 15;
        
        // Draw line
        page.drawLine({ start: { x: 50, y: currentY + 10 }, end: { x: 540, y: currentY + 10 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
        
        items.forEach((item, index) => {
            if (currentY < 100) {
                page = pdfDoc.addPage([595.28, 841.89]);
                currentY = 800;
            }
            drawText(`${index + 1}`, 50, currentY, 10);
            drawText(`${(item.itemName || '').substring(0, 35)}`, 90, currentY, 10);
            drawText(`${item.qty}`, 280, currentY, 10);
            drawText(`${item.subtotal}`, 320, currentY, 10);
            drawText(`${item.gstAmt}`, 390, currentY, 10);
            drawText(`${item.finalAmt}`, 460, currentY, 10);
            currentY -= 20;
        });
        
        // Draw bottom line
        page.drawLine({ start: { x: 50, y: currentY + 10 }, end: { x: 540, y: currentY + 10 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
        currentY -= 10;
        
        drawText('Grand Total', 50, currentY, 10, true);
        drawText(`Rs ${p.finalAmount}`, 460, currentY, 10, true);
        currentY -= 30;
    } else {
        drawText(`Item Name: ${p.itemName}`, 50, currentY); currentY -= 20;
        drawText(`Quantity: ${p.quantity}`, 50, currentY); currentY -= 20;
        drawText(`Unit Amount: Rs ${p.unitAmount}`, 50, currentY); currentY -= 20;
        drawText(`GST Amount: Rs ${p.gstAmount}`, 50, currentY); currentY -= 20;
        drawText(`Final Amount: Rs ${p.finalAmount}`, 50, currentY, 12, true); currentY -= 30;
    }

    drawText(`Mode: ${p.modeOfPurchase}`, 50, currentY); currentY -= 20;
    if (p.storeName) { drawText(`Store: ${p.storeName}`, 50, currentY); currentY -= 20; }
    if (p.purchaseLink) { drawText(`Link: ${p.purchaseLink}`, 50, currentY); currentY -= 20; }
    drawText(`Reason: ${p.reason}`, 50, currentY); currentY -= 30;

    if (p.status !== 'Pending Approval') {
        drawText('Approval Information', 50, currentY, 14, true);
        currentY -= 20;
        if (p.approvalDate) { drawText(`Action Date: ${new Date(p.approvalDate).toLocaleString()}`, 50, currentY); currentY -= 20; }
        if (p.approverComments) { drawText(`Comments: ${p.approverComments}`, 50, currentY); currentY -= 20; }
        if (p.rejectionReason) { drawText(`Rejection Reason: ${p.rejectionReason}`, 50, currentY); currentY -= 20; }
        currentY -= 20;
    }

    if (p.status === 'Purchased') {
        drawText('Purchase Information', 50, currentY, 14, true);
        currentY -= 20;
        drawText(`Order ID: ${p.orderId}`, 50, currentY);
        currentY -= 20;
        drawText(`Actual Amount: Rs ${p.actualAmount}`, 50, currentY);
        currentY -= 20;
        drawText(`Delivery Date: ${p.deliveryDate}`, 50, currentY);
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
};


const sendApprovalEmail = async (request) => {
    const baseUrl = process.env.BASE_URL || 'http://172.30.10.21:8086';
    const reqUrl = `${baseUrl}/api/purchase/${request.id}/action`;
    
    let itemsHtml = '';
    
    if (request.itemsJson) {
      try {
        const items = JSON.parse(request.itemsJson);
        items.forEach((item, index) => {
          itemsHtml += `
            <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">${index + 1}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${item.itemName}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">${item.qty}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">&#8377;${item.subtotal}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">&#8377;${item.gstAmt}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">&#8377;${item.finalAmt}</td>
            </tr>
          `;
        });
      } catch(e) {
        // Fallback if json fails
      }
    }
    
    if (!itemsHtml) {
        const unitAmt = request.unitAmount || 0;
        const qty = request.quantity || 1;
        const amount = unitAmt * qty;
        const gst = request.gstAmount || 0;
        const total = request.finalAmount || 0;
        itemsHtml = `
            <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">1</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${request.itemName}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">${qty}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">&#8377;${amount}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">&#8377;${gst}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">&#8377;${total}</td>
            </tr>
        `;
    }

    let attachments = [];
    if (request.itemImage) {
        const fsLib = require('fs');
        const pathLib = require('path');
        const filePath = pathLib.join('/app/data', request.itemImage);
        if (fsLib.existsSync(filePath)) {
            attachments.push({
                filename: pathLib.basename(filePath),
                path: filePath
            });
        }
    }

    const html = `
        <div style="font-family: sans-serif; max-width: 800px; color: #1e293b;">
            <p>Dear Sir,</p>
            <p>We request your approval for the below stock purchase. Kindly review the details and provide your approval to proceed with the purchase.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; border: 1px solid #cbd5e1;">
                <thead>
                    <tr style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                        <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">S.No</th>
                        <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Name of the Item</th>
                        <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">Qty</th>
                        <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">Amount</th>
                        <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">GST Value</th>
                        <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">Total Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                    <tr style="background-color: #f1f5f9; font-weight: bold;">
                        <td colspan="5" style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Grand Total</td>
                        <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">&#8377;${request.finalAmount}</td>
                    </tr>
                </tbody>
            </table>
            
            <p><strong>Purchase Reason:</strong> ${request.reason}</p>
            
            <p>Kindly requesting your review for the above purchase details and provide your approval to proceed.</p>
            <p>Thank you.</p>

            <div style="margin-top: 30px;">
                <a href="${reqUrl}?action=Approve" style="padding:10px 20px;background:#16a34a;color:white;text-decoration:none;border-radius:5px;margin-right:10px;display:inline-block;font-weight:bold;">Approve</a>
                <a href="${reqUrl}?action=Reject" style="padding:10px 20px;background:#dc2626;color:white;text-decoration:none;border-radius:5px;margin-right:10px;display:inline-block;font-weight:bold;">Reject</a>
                <a href="${reqUrl}?action=Discuss" style="padding:10px 20px;background:#f59e0b;color:white;text-decoration:none;border-radius:5px;display:inline-block;font-weight:bold;">Need to Discuss</a>
            </div>
        </div>
    `;
    await sendMail({
        to: request.approvalPersonEmail,
        subject: `Request for Purchase Approval - ${request.requestId}`,
        html,
        attachments
    });
};

module.exports = {
    sendApprovalEmail,

    createPurchaseRequest,
    getPurchases,
    getPurchaseById,
    updateStatus,
    markPurchased,
    generateExcelReport,
    generatePdfReport
};
