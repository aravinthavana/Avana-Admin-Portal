const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../public/uploads/purchases');
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
const upload = multer({ storage: storage });

router.post('/', upload.fields([{ name: 'itemImage', maxCount: 1 }]), purchaseController.createPurchaseRequest);
router.get('/', purchaseController.getPurchases);
router.get('/export/excel', purchaseController.exportExcel); // Must be before /:id
router.get('/:id', purchaseController.getPurchaseById);
router.put('/:id/status', purchaseController.updateStatus);
router.put('/:id/purchase', upload.fields([{ name: 'invoiceFile', maxCount: 1 }]), purchaseController.markPurchased);
router.get('/:id/export/pdf', purchaseController.exportPdf);

module.exports = router;
