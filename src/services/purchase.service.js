const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const templates = require('../utils/email-templates');
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
            from: process.env.SMTP_FROM || '"Avana Portal" <noreply@avanamedical.com>',
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
    
    const unitAmount = parseFloat(data.unitAmount);
    const quantity = parseInt(data.quantity, 10);
    const hasGst = data.hasGst === 'true' || data.hasGst === true;
    const gstPercentage = hasGst ? parseFloat(data.gstPercentage) : 0;
    
    const subtotal = unitAmount * quantity;
    const gstAmount = hasGst ? (subtotal * gstPercentage) / 100 : 0;
    const finalAmount = subtotal + gstAmount;

    const request = await prisma.purchaseRequest.create({
        data: {
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

    try {
        const emailContent = templates.purchaseApprovalRequest(request);
        await sendMail({
            to: request.approvalPersonEmail,
            subject: `Action Required: Purchase Request ${request.requestId} for ${request.itemName}`,
            html: emailContent
        });
    } catch (e) {
        console.error('Failed to send approval email', e);
    }

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
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
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

    drawText('Item Details', 50, 680, 14, true);
    drawText(`Item Name: ${p.itemName}`, 50, 660);
    drawText(`Quantity: ${p.quantity}`, 50, 640);
    drawText(`Unit Amount: Rs ${p.unitAmount}`, 50, 620);
    drawText(`GST Amount: Rs ${p.gstAmount}`, 50, 600);
    drawText(`Final Amount: Rs ${p.finalAmount}`, 50, 580, 12, true);
    drawText(`Mode: ${p.modeOfPurchase}`, 50, 560);
    if (p.storeName) drawText(`Store: ${p.storeName}`, 50, 540);
    if (p.purchaseLink) drawText(`Link: ${p.purchaseLink}`, 50, 520);
    
    drawText(`Requested By: ${p.requestedBy}`, 300, 760);
    drawText(`Approver: ${p.approvalPersonEmail}`, 300, 740);
    drawText(`Reason: ${p.reason}`, 50, 500);

    let currentY = 460;
    
    if (p.status !== 'Pending Approval') {
        drawText('Approval Information', 50, currentY, 14, true);
        currentY -= 20;
        if (p.approvalDate) drawText(`Action Date: ${new Date(p.approvalDate).toLocaleString()}`, 50, currentY);
        currentY -= 20;
        if (p.approverComments) drawText(`Comments: ${p.approverComments}`, 50, currentY);
        if (p.rejectionReason) drawText(`Rejection Reason: ${p.rejectionReason}`, 50, currentY);
        currentY -= 40;
    }

    if (p.status === 'Purchased') {
        drawText('Purchase Information', 50, currentY, 14, true);
        currentY -= 20;
        drawText(`Order ID: ${p.orderId}`, 50, currentY);
        currentY -= 20;
        drawText(`Exact Amount: Rs ${p.exactPurchaseAmount}`, 50, currentY);
        currentY -= 20;
        drawText(`Delivery Date: ${p.deliveryDate}`, 50, currentY);
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
};

module.exports = {
    createPurchaseRequest,
    getPurchases,
    getPurchaseById,
    updateStatus,
    markPurchased,
    generateExcelReport,
    generatePdfReport
};
