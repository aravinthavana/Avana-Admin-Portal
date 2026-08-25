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

module.exports = {
    createPurchaseRequest,
    getPurchases,
    getPurchaseById,
    updateStatus,
    markPurchased,
    exportExcel,
    exportPdf
};
