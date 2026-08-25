const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAdmin } = require('../middlewares/admin-auth.middleware');

// Ensure upload directory exists
const dataDir = path.join(__dirname, '../../data');
const uploadDir = path.join(dataDir, 'uploads/purchases');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Only allow safe image types and PDFs
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/', requireAdmin, upload.fields([{ name: 'itemImage', maxCount: 1 }]), purchaseController.createPurchaseRequest);
router.get('/', requireAdmin, purchaseController.getPurchases);
router.get('/export/excel', requireAdmin, purchaseController.exportExcel);
router.get('/:id', requireAdmin, purchaseController.getPurchaseById);
router.put('/:id/status', requireAdmin, purchaseController.updateStatus);
router.put('/:id/purchase', requireAdmin, upload.fields([{ name: 'invoiceFile', maxCount: 1 }]), purchaseController.markPurchased);
router.get('/:id/export/pdf', requireAdmin, purchaseController.exportPdf);

module.exports = router;
