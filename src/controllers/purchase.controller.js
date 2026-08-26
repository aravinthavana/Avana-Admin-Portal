const purchaseService = require('../services/purchase.service');
const auditLogger = require('../utils/audit-logger');
const fs = require('fs');

const createPurchaseRequest = async (req, res) => {
    try {
        const data = { ...req.body };
        
        // Email validation
        const email = data.approvalPersonEmail;
        if (!email || (!email.endsWith('@avanamedical.com') && !email.endsWith('@avanasurgical.com'))) {
            return res.status(400).json({ error: 'Please enter a valid Avana company email address (@avanamedical.com or @avanasurgical.com).' });
        }

        // Attach file path if an image was uploaded
        if (req.files && req.files.itemImage) {
            data.itemImage = '/uploads/purchases/' + req.files.itemImage[0].filename;
        }

        const request = await purchaseService.createPurchaseRequest(data);
        try { await purchaseService.sendApprovalEmail(request); } catch(e) { console.error('Failed to send approval email', e); }
        res.status(201).json(request);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create purchase request.' });
    }
};

const getPurchases = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            search: req.query.search,
            requestedBy: req.query.requestedBy,
            approvalPersonEmail: req.query.approvalPersonEmail,
            month: req.query.month,
            year: req.query.year
        };
        const purchases = await purchaseService.getPurchases(filters);
        res.status(200).json(purchases);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch purchases.' });
    }
};

const getPurchaseById = async (req, res) => {
    try {
        const purchase = await purchaseService.getPurchaseById(req.params.id);
        if (!purchase) return res.status(404).json({ error: 'Not found.' });
        res.status(200).json(purchase);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch purchase details.' });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { status, comments, reason, approverEmail } = req.body;
        if (!approverEmail) return res.status(400).json({ error: 'Approver email is required.' });
        if (!status) return res.status(400).json({ error: 'Status is required.' });

        const updated = await purchaseService.updateStatus(req.params.id, {
            status, comments, reason, approverEmail
        });
        res.status(200).json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Failed to update status.' });
    }
};

const markPurchased = async (req, res) => {
    try {
        const data = { ...req.body };
        
        if (req.files && req.files.invoiceFile) {
            data.invoiceFile = '/uploads/purchases/' + req.files.invoiceFile[0].filename;
        }

        const updated = await purchaseService.markPurchased(req.params.id, data);
        res.status(200).json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to mark as purchased.' });
    }
};

const exportExcel = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            search: req.query.search,
            requestedBy: req.query.requestedBy,
            approvalPersonEmail: req.query.approvalPersonEmail,
            month: req.query.month,
            year: req.query.year
        };
        const buffer = await purchaseService.generateExcelReport(filters);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Purchase_Report.xlsx"');
        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate Excel report.' });
    }
};

const exportPdf = async (req, res) => {
    try {
        const buffer = await purchaseService.generatePdfReport(req.params.id);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Purchase_${req.params.id}.pdf"`);
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate PDF.' });
    }
};



const handleEmailAction = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.query;
        if (!['Approve', 'Reject', 'Discuss'].includes(action)) {
            return res.status(400).send('Invalid action.');
        }
        
        const purchase = await purchaseService.getPurchaseById(id);
        if (!purchase) return res.status(404).send('Not found.');

        if (req.method === 'GET' && (action === 'Reject' || action === 'Discuss')) {
            return res.send(`
                <html>
                <body style="font-family: sans-serif; background-color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                    <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 500px; width: 100%;">
                        <h2 style="margin-top: 0; color: #0f172a;">Provide Reason for ${action === 'Reject' ? 'Rejection' : 'Discussion'}</h2>
                        <p style="color: #475569; margin-bottom: 20px;">Please provide the reason below. This will be sent back to the admin and logged in the portal.</p>
                        <form method="POST" action="/api/purchase/${id}/action?action=${action}">
                            <textarea name="comments" rows="5" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 20px; font-family: sans-serif;" required placeholder="Please enter your reason here..."></textarea>
                            <br/>
                            <button type="submit" style="padding: 12px 24px; background: #0f172a; color: white; border: none; cursor: pointer; border-radius: 5px; font-weight: bold; width: 100%;">Submit & Notify Admin</button>
                        </form>
                    </div>
                </body>
                </html>
            `);
        }

        let status = 'Pending Approval';
        if (action === 'Approve') status = 'Approved';
        if (action === 'Reject') status = 'Rejected';
        if (action === 'Discuss') status = 'Need to Discuss';
        
        const comments = req.body?.comments || req.query?.comments || '';
        
        await purchaseService.updateStatus(id, {
            status,
            approverEmail: purchase.approvalPersonEmail,
            comments: comments,
            reason: comments
        });
        
        res.send(`
            <html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;">
                <div style="background:white;padding:40px;border-radius:8px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);max-width:500px;margin:0 auto;">
                    <h2 style="color: #16a34a; margin-top: 0;">Action Completed: ${status}</h2>
                    <p style="color: #475569;">The purchase request has been updated successfully and the admin has been notified.</p>
                    <p style="color: #94a3b8; font-size: 0.9em; margin-bottom: 0;">You can safely close this window.</p>
                </div>
            </body></html>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    handleEmailAction,

    createPurchaseRequest,
    getPurchases,
    getPurchaseById,
    updateStatus,
    markPurchased,
    exportExcel,
    exportPdf
};
