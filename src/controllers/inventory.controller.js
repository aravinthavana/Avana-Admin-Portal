const inventoryService = require('../services/inventory.service');

exports.getStationeryCatalog = async (req, res, next) => {
  try {
    const catalog = await inventoryService.getStationeryCatalog();
    const stationeryStock = await inventoryService.getStock('stationery');
    const printingStock = await inventoryService.getStock('printing');
    const housekeepingStock = await inventoryService.getStock('housekeeping');

    const stationery = [];
    const printing = [];
    for (const [name, type] of Object.entries(catalog || {})) {
      if (type === 'stationery') {
        stationery.push(name);
      } else if (type === 'printing') {
        printing.push(name);
      }
    }

    // Merge stationery and printing stock into a unified stock map
    const stock = { ...stationeryStock, ...printingStock };

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ stationery, printing, stock, housekeepingStock });
  } catch (error) {
    next(error);
  }
};

// Admin Endpoints for Stock Management
const handleGetStock = async (type, req, res, next) => {
  try {
    const stock = await inventoryService.getStock(type);
    res.status(200).json(stock);
  } catch (error) {
    next(error);
  }
};

const handleUpdateStock = async (type, req, res, next) => {
  try {
    const { item, quantity, transactionType, date } = req.body;
    if (!item || quantity === undefined) {
      return res.status(400).json({ error: 'Missing item or quantity.' });
    }

    const stock = await inventoryService.getStock(type);
    const previousStock = stock[item] || 0;
    
    // Check if adding new item type (setup) vs transaction
    if (!transactionType) {
      stock[item] = quantity;
      await inventoryService.saveStock(type, stock);
      return res.status(200).json({ message: 'Item initialized.', stock: stock[item] });
    }

    const qty = parseInt(quantity);
    let newStock = previousStock;
    if (transactionType === 'purchase') {
      newStock += qty;
    } else if (transactionType === 'use') {
      newStock -= qty;
      if (newStock < 0) newStock = 0;
    }

    stock[item] = newStock;
    await inventoryService.saveStock(type, stock);

    // Save transaction
    const logs = await inventoryService.getTransactions(type);
    logs.push({
      item,
      type: transactionType,
      quantity: qty,
      previousStock,
      newStock,
      timestamp: date || new Date().toISOString()
    });
    await inventoryService.saveTransactions(type, logs);

    if (newStock < previousStock) {
      inventoryService.checkLowStockAlert(item, newStock, type).catch(console.error);
    }

    res.status(200).json({ message: 'Stock updated successfully.', stock: newStock });
  } catch (error) {
    next(error);
  }
};

const handleGetAudit = async (type, req, res, next) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month) {
      return res.status(400).json({ error: 'Missing month parameter.' });
    }

    const stock = await inventoryService.getStock(type);
    const logs = await inventoryService.getTransactions(type);
    const overrides = await inventoryService.getAuditOverrides(type);
    
    const sortedLogs = [...logs].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    const audit = inventoryService.calculateAuditForMonth(stock, sortedLogs, month, overrides);

    res.status(200).json(audit);
  } catch (error) {
    next(error);
  }
};

const handleAuditOverride = async (type, req, res, next) => {
  try {
    const { month, item, startingStock, purchased, used, endingStock } = req.body;
    if (!month || !item) {
      return res.status(400).json({ error: 'Missing month or item.' });
    }

    const overrides = await inventoryService.getAuditOverrides(type);
    if (!overrides[month]) {
      overrides[month] = {};
    }
    
    overrides[month][item] = {
      startingStock: parseInt(startingStock) || 0,
      purchased: parseInt(purchased) || 0,
      used: parseInt(used) || 0,
      endingStock: parseInt(endingStock) || 0
    };

    await inventoryService.saveAuditOverrides(type, overrides);

    // If overriding the current month, update the actual stock
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    if (month === currentMonth && endingStock !== undefined) {
      const stock = await inventoryService.getStock(type);
      stock[item] = parseInt(endingStock) || 0;
      await inventoryService.saveStock(type, stock);
    }

    res.status(200).json({ message: 'Audit overrides saved successfully.', overrides: overrides[month] });
  } catch (error) {
    next(error);
  }
};

exports.addStationeryItemType = async (req, res, next) => {
  try {
    const { item, type, initialStock } = req.body;
    if (!item) {
      return res.status(400).json({ error: 'Missing item name.' });
    }
    const itemClean = item.trim();
    const catalog = inventoryService.getStationeryCatalog();
    if (catalog[itemClean]) {
      return res.status(400).json({ error: 'Item already exists in catalog.' });
    }

    const updatedCatalog = inventoryService.addStationeryCatalogItem(itemClean, type || 'stationery');
    
    const qty = parseInt(initialStock, 10) || 0;
    const stock = await inventoryService.getStock('stationery');
    stock[itemClean] = qty;
    await inventoryService.saveStock('stationery', stock);

    if (qty > 0) {
      const logs = await inventoryService.getTransactions('stationery');
      logs.push({
        item: itemClean,
        type: 'purchase',
        quantity: qty,
        previousStock: 0,
        newStock: qty,
        timestamp: new Date().toISOString(),
        remarks: 'Initial stock creation'
      });
      await inventoryService.saveTransactions('stationery', logs);
    }

    res.status(200).json({ message: 'Stationery item added successfully.', catalog: updatedCatalog });
  } catch (error) {
    next(error);
  }
};

exports.addHousekeepingItemType = async (req, res, next) => {
  try {
    const { item, initialStock } = req.body;
    if (!item) {
      return res.status(400).json({ error: 'Missing item name.' });
    }
    const itemClean = item.trim();
    const stock = await inventoryService.getStock('housekeeping');
    if (stock[itemClean] !== undefined) {
      return res.status(400).json({ error: 'Housekeeping item already exists.' });
    }

    const qty = parseInt(initialStock, 10) || 0;
    stock[itemClean] = qty;
    await inventoryService.saveStock('housekeeping', stock);

    if (qty > 0) {
      const logs = await inventoryService.getTransactions('housekeeping');
      logs.push({
        item: itemClean,
        type: 'purchase',
        quantity: qty,
        previousStock: 0,
        newStock: qty,
        timestamp: new Date().toISOString(),
        remarks: 'Initial stock creation'
      });
      await inventoryService.saveTransactions('housekeeping', logs);
    }

    res.status(200).json({ message: 'Housekeeping item added successfully.', stock });
  } catch (error) {
    next(error);
  }
};

// Route Handlers
exports.getStationeryStock = (req, res, next) => handleGetStock('stationery', req, res, next);
exports.updateStationeryStock = (req, res, next) => handleUpdateStock('stationery', req, res, next);
exports.getStationeryAudit = (req, res, next) => handleGetAudit('stationery', req, res, next);
exports.overrideStationeryAudit = (req, res, next) => handleAuditOverride('stationery', req, res, next);

exports.getHousekeepingStock = (req, res, next) => handleGetStock('housekeeping', req, res, next);
exports.updateHousekeepingStock = (req, res, next) => handleUpdateStock('housekeeping', req, res, next);
exports.getHousekeepingAudit = (req, res, next) => handleGetAudit('housekeeping', req, res, next);
exports.overrideHousekeepingAudit = (req, res, next) => handleAuditOverride('housekeeping', req, res, next);
