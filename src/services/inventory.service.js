const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

exports.getStock = async (type) => {
  const items = await prisma.inventoryItem.findMany({ where: { category: type } });
  const stock = {};
  items.forEach(i => { stock[i.name] = i.currentStock; });
  return stock;
};

exports.saveStock = async (type, stockMap) => {
  for (const [name, qty] of Object.entries(stockMap)) {
    const item = await prisma.inventoryItem.findFirst({ where: { name, category: type } });
    if (item) {
      await prisma.inventoryItem.update({ where: { id: item.id }, data: { currentStock: qty, updatedAt: new Date().toISOString() } });
    } else {
      await prisma.inventoryItem.create({ data: { name, category: type, currentStock: qty, updatedAt: new Date().toISOString() } });
    }
  }
  return true;
};

exports.getTransactions = async (type) => {
  const txs = await prisma.inventoryTransaction.findMany({
    where: { item: { category: type } },
    include: { item: true },
    orderBy: { timestamp: 'asc' }
  });
  return txs.map(t => ({
    item: t.item.name,
    type: t.type,
    quantity: t.quantity,
    previousStock: t.previousStock,
    newStock: t.newStock,
    timestamp: t.timestamp,
    remarks: t.remarks
  }));
};

exports.saveTransactions = async (type, dataList) => {
  // dataList is the full list of transactions.
  // To avoid duplicates when appending in the controller, we should ideally change the controller,
  // but for legacy compatibility we'll just handle the LAST transaction added.
  const lastTx = dataList[dataList.length - 1];
  if (!lastTx) return;
  const item = await prisma.inventoryItem.findFirst({ where: { name: lastTx.item, category: type } });
  if (item) {
    await prisma.inventoryTransaction.create({
      data: {
        itemId: item.id,
        type: lastTx.type,
        quantity: lastTx.quantity,
        previousStock: lastTx.previousStock,
        newStock: lastTx.newStock,
        timestamp: lastTx.timestamp,
        remarks: lastTx.remarks || ''
      }
    });
  }
};

exports.getAuditOverrides = async (type) => {
  const overrides = await prisma.inventoryAuditOverride.findMany({
    where: { item: { category: type } },
    include: { item: true }
  });
  const map = {};
  overrides.forEach(o => {
    if (!map[o.month]) map[o.month] = {};
    map[o.month][o.item.name] = {
      startingStock: o.startingStock,
      purchased: o.purchased,
      used: o.used,
      endingStock: o.endingStock
    };
  });
  return map;
};

exports.saveAuditOverrides = async (type, dataMap) => {
  for (const [month, itemsMap] of Object.entries(dataMap)) {
    for (const [name, obj] of Object.entries(itemsMap)) {
      const item = await prisma.inventoryItem.findFirst({ where: { name, category: type } });
      if (item) {
        const existing = await prisma.inventoryAuditOverride.findFirst({ where: { itemId: item.id, month } });
        if (existing) {
          await prisma.inventoryAuditOverride.update({
            where: { id: existing.id },
            data: { startingStock: obj.startingStock, purchased: obj.purchased, used: obj.used, endingStock: obj.endingStock }
          });
        } else {
          await prisma.inventoryAuditOverride.create({
            data: { itemId: item.id, month, startingStock: obj.startingStock, purchased: obj.purchased, used: obj.used, endingStock: obj.endingStock }
          });
        }
      }
    }
  }
};

exports.calculateAuditForMonth = (stock, sortedLogs, month, overrides) => {
  const audit = {};
  Object.keys(stock).forEach(item => {
    audit[item] = { startingStock: 0, purchased: 0, used: 0, endingStock: 0 };
  });

  const monthStart = new Date(`${month}-01T00:00:00Z`);
  const parts = month.split('-');
  const targetYear = parseInt(parts[0]);
  const targetMonth = parseInt(parts[1]);
  const nextMonthYear = targetMonth === 12 ? targetYear + 1 : targetYear;
  const nextMonthNum = targetMonth === 12 ? 1 : targetMonth + 1;
  const nextMonthStr = nextMonthNum < 10 ? `0${nextMonthNum}` : `${nextMonthNum}`;
  const monthEnd = new Date(`${nextMonthYear}-${nextMonthStr}-01T00:00:00Z`);

  const itemStockAtStart = {};
  const itemStockAtEnd = {};
  const timelineStock = {};
  
  Object.keys(stock).forEach(item => {
    itemStockAtStart[item] = 0;
    itemStockAtEnd[item] = 0;
    timelineStock[item] = 0;
  });

  sortedLogs.forEach(log => {
    const logTime = new Date(log.timestamp);
    const logItem = log.item;
    if (timelineStock[logItem] === undefined) return;
    
    if (timelineStock[logItem] === 0 && log.previousStock !== 0) {
      timelineStock[logItem] = log.previousStock;
    }

    if (logTime < monthStart) {
      timelineStock[logItem] = log.newStock;
      itemStockAtStart[logItem] = log.newStock;
      itemStockAtEnd[logItem] = log.newStock;
    } else if (logTime >= monthStart && logTime < monthEnd) {
      if (itemStockAtStart[logItem] === 0 && log.previousStock !== 0) {
        itemStockAtStart[logItem] = log.previousStock;
      }
      if (log.type === 'purchase') {
        audit[logItem].purchased += log.quantity;
      } else if (log.type === 'use') {
        audit[logItem].used += log.quantity;
      }
      timelineStock[logItem] = log.newStock;
      itemStockAtEnd[logItem] = log.newStock;
    }
  });

  Object.keys(audit).forEach(item => {
    audit[item].startingStock = itemStockAtStart[item] || 0;
    audit[item].endingStock = itemStockAtEnd[item] || (itemStockAtStart[item] || stock[item] || 0);

    // Apply Overrides
    if (overrides && overrides[month] && overrides[month][item]) {
      const ov = overrides[month][item];
      audit[item].startingStock = ov.startingStock !== undefined && ov.startingStock !== null ? ov.startingStock : audit[item].startingStock;
      audit[item].purchased = ov.purchased !== undefined && ov.purchased !== null ? ov.purchased : audit[item].purchased;
      audit[item].used = ov.used !== undefined && ov.used !== null ? ov.used : audit[item].used;
      audit[item].endingStock = ov.endingStock !== undefined && ov.endingStock !== null ? ov.endingStock : audit[item].endingStock;
    }
  });

  return audit;
};

exports.getStationeryCatalog = async () => {
  let catalog = {};
  try {
    const p1 = path.join(__dirname, '../../stationery_catalog.json');
    const p2 = path.join(__dirname, '../assets/stationery_catalog.json');
    const p = fs.existsSync(p1) ? p1 : (fs.existsSync(p2) ? p2 : null);
    if (p) catalog = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch(e) {}

  try {
    const dbItems = await prisma.inventoryItem.findMany({ where: { category: { in: ['stationery', 'printing'] } } });
    dbItems.forEach(i => {
      if (!catalog[i.name]) {
        catalog[i.name] = i.category === 'printing' ? 'printing' : 'stationery';
      }
    });
  } catch(e) {}

  return catalog;
};

exports.addStationeryCatalogItem = (itemClean, itemType) => {
  try {
    const p = path.join(__dirname, '../../stationery_catalog.json');
    let catalog = {};
    if (fs.existsSync(p)) {
      catalog = JSON.parse(fs.readFileSync(p, 'utf8'));
    }
    catalog[itemClean] = itemType === 'printing' ? 'printing' : 'stationery';
    fs.writeFileSync(p, JSON.stringify(catalog, null, 2), 'utf8');
    return catalog;
  } catch(e) {
    console.error('Failed to update stationery catalog:', e);
    return null;
  }
};

exports.checkLowStockAlert = async (item, newQty, type = 'stationery') => {
  const threshold = 5;
  if (newQty <= threshold) {
    console.log(`[Inventory Alert] "${item}" (${type}) is low in stock: ${newQty}`);
    const { sendEmail } = require('../utils/notifications');
    const adminEmail = process.env.ADMIN_EMAIL || 'Karthicksankar@avanamedical.com';
    const subject = `⚠️ Low Stock Alert: "${item}" (${newQty} remaining)`;
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background-color: #fef3c7; color: #b45309; padding: 12px 16px; border-radius: 8px; font-weight: bold; margin-bottom: 16px; display: inline-flex; align-items: center; gap: 8px; width: fit-content;">
          ⚠️ Low Stock Warning
        </div>
        <h2 style="color: #1f2937; margin-top: 0;">${type === 'housekeeping' ? 'Housekeeping' : 'Stationery'} Item Stock is Low</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          This is an automated system alert notifying you that the inventory level for the following item has fallen below the threshold (5 items):
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Item Name:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #1f2937; font-weight: bold;">${item}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Current Stock:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold; font-size: 18px;">${newQty}</td>
          </tr>
        </table>
        <p style="color: #4b5563; font-size: 14px; margin-top: 20px;">
          Please log into the Admin portal to manually replenish this item as soon as possible.
        </p>
      </div>
    `;
    
    sendEmail({
      to: adminEmail,
      cc: 'aravinth@avanamedical.com',
      subject,
      htmlBody
    }).catch(err => console.error('Low stock email alert failed:', err));
  }
};

