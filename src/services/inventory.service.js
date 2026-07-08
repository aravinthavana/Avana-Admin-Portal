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

exports.getStationeryCatalog = () => {
  try {
    const p = path.join(__dirname, '../../stationery_catalog.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    return [];
  } catch(e) { return []; }
};
