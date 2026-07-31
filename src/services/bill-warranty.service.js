const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

// Seed legacy bill_warranty_records.json if table is empty
async function ensureLegacyBillWarrantyMigrated() {
  try {
    const count = await prisma.billWarranty.count();
    if (count > 0) return;

    const legacyFile = path.join(__dirname, '../../legacy-booking/bill_warranty_records.json');
    if (!fs.existsSync(legacyFile)) return;

    const raw = fs.readFileSync(legacyFile, 'utf8');
    const legacyRecords = JSON.parse(raw);

    if (!Array.isArray(legacyRecords) || legacyRecords.length === 0) return;

    console.log(`[Bill Warranty Migration] Migrating ${legacyRecords.length} legacy bill & warranty records to SQLite...`);

    for (const r of legacyRecords) {
      await prisma.billWarranty.create({
        data: {
          id: r.id || undefined,
          date: r.date || new Date().toISOString().slice(0,10),
          billNo: r.billNo || 'N/A',
          vendorName: r.vendorName || 'Vendor',
          itemsJson: Array.isArray(r.items) ? JSON.stringify(r.items) : (r.itemsJson || '[]'),
          totalAmount: parseFloat(r.totalAmount) || 0,
          warrantyDate: r.warrantyDate || null,
          billFileUrl: r.billFileUrl || null,
          billFileName: r.billFileName || null,
          warrantyFileUrl: r.warrantyFileUrl || null,
          warrantyFileName: r.warrantyFileName || null,
          approvedBy: r.approvedBy || '',
          remarks: r.remarks || '',
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    }
    console.log('[Bill Warranty Migration] Legacy bill & warranty records migrated successfully!');
  } catch (err) {
    console.error('[Bill Warranty Migration] Migration error:', err);
  }
}

// Call on startup
ensureLegacyBillWarrantyMigrated().catch(console.error);

exports.getAllBillWarrantyRecords = async (month) => {
  await ensureLegacyBillWarrantyMigrated();
  const where = {};
  if (month) {
    where.date = { startsWith: month };
  }
  const list = await prisma.billWarranty.findMany({
    where,
    orderBy: { date: 'desc' }
  });

  return list.map(item => ({
    ...item,
    items: item.itemsJson ? JSON.parse(item.itemsJson) : []
  }));
};

exports.createBillWarrantyRecord = async (data) => {
  const { date, billNo, vendorName, items, totalAmount, warrantyDate, billFileUrl, billFileName, warrantyFileUrl, warrantyFileName, approvedBy, remarks } = data;
  
  const itemsArr = Array.isArray(items) ? items : [];
  const tot = parseFloat(totalAmount) || itemsArr.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  const created = await prisma.billWarranty.create({
    data: {
      date: date || new Date().toISOString().slice(0,10),
      billNo: billNo || 'N/A',
      vendorName: vendorName || '',
      itemsJson: JSON.stringify(itemsArr),
      totalAmount: tot,
      warrantyDate: warrantyDate || null,
      billFileUrl: billFileUrl || null,
      billFileName: billFileName || null,
      warrantyFileUrl: warrantyFileUrl || null,
      warrantyFileName: warrantyFileName || null,
      approvedBy: approvedBy || '',
      remarks: remarks || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });

  return {
    ...created,
    items: itemsArr
  };
};

exports.updateBillWarrantyRecord = async (id, data) => {
  const { date, billNo, vendorName, items, totalAmount, warrantyDate, billFileUrl, billFileName, warrantyFileUrl, warrantyFileName, approvedBy, remarks } = data;
  
  const existing = await prisma.billWarranty.findUnique({ where: { id } });
  if (!existing) return null;

  const itemsArr = Array.isArray(items) ? items : (existing.itemsJson ? JSON.parse(existing.itemsJson) : []);
  const tot = totalAmount !== undefined ? parseFloat(totalAmount) : existing.totalAmount;

  const updated = await prisma.billWarranty.update({
    where: { id },
    data: {
      date: date || undefined,
      billNo: billNo || undefined,
      vendorName: vendorName !== undefined ? vendorName : undefined,
      itemsJson: items !== undefined ? JSON.stringify(itemsArr) : undefined,
      totalAmount: tot,
      warrantyDate: warrantyDate !== undefined ? warrantyDate : undefined,
      billFileUrl: billFileUrl !== undefined ? billFileUrl : undefined,
      billFileName: billFileName !== undefined ? billFileName : undefined,
      warrantyFileUrl: warrantyFileUrl !== undefined ? warrantyFileUrl : undefined,
      warrantyFileName: warrantyFileName !== undefined ? warrantyFileName : undefined,
      approvedBy: approvedBy !== undefined ? approvedBy : undefined,
      remarks: remarks !== undefined ? remarks : undefined,
      updatedAt: new Date().toISOString()
    }
  });

  return {
    ...updated,
    items: itemsArr
  };
};

exports.deleteBillWarrantyRecord = async (id) => {
  try {
    await prisma.billWarranty.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
};
