const inventoryService = require('../services/inventory.service');

// Employee endpoint
exports.getStationeryCatalog = (req, res, next) => {
  try {
    const catalog = inventoryService.getStationeryCatalog();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(catalog);
  } catch (error) {
    next(error);
  }
};

// Admin Endpoints for Stock Management
const handleGetStock = (type, req, res, next) => {
  try {
    const stock = inventoryService.getStock(type);
    res.status(200).json(stock);
  } catch (error) {
    next(error);
  }
};

const handleUpdateStock = (type, req, res, next) => {
  try {
    const { item, quantity, transactionType, date } = req.body;
    if (!item || quantity === undefined) {
      return res.status(400).json({ error: 'Missing item or quantity.' });
    }

    const stock = inventoryService.getStock(type);
    const previousStock = stock[item] || 0;
    
    // Check if adding new item type (setup) vs transaction
    if (!transactionType) {
      stock[item] = quantity;
      inventoryService.saveStock(type, stock);
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
    inventoryService.saveStock(type, stock);

    // Save transaction
    const logs = inventoryService.getTransactions(type);
    logs.push({
      item,
      type: transactionType,
      quantity: qty,
      previousStock,
      newStock,
      timestamp: date || new Date().toISOString()
    });
    inventoryService.saveTransactions(type, logs);

    res.status(200).json({ message: 'Stock updated successfully.', stock: newStock });
  } catch (error) {
    next(error);
  }
};

const handleGetAudit = (type, req, res, next) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month) {
      return res.status(400).json({ error: 'Missing month parameter.' });
    }

    const stock = inventoryService.getStock(type);
    const logs = inventoryService.getTransactions(type);
    const overrides = inventoryService.getAuditOverrides(type);
    
    const sortedLogs = [...logs].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    const audit = inventoryService.calculateAuditForMonth(stock, sortedLogs, month, overrides);

    res.status(200).json(audit);
  } catch (error) {
    next(error);
  }
};

const handleAuditOverride = (type, req, res, next) => {
  try {
    const { month, item, startingStock, purchased, used, endingStock } = req.body;
    if (!month || !item) {
      return res.status(400).json({ error: 'Missing month or item.' });
    }

    const overrides = inventoryService.getAuditOverrides(type);
    if (!overrides[month]) overrides[month] = {};
    
    overrides[month][item] = {
      startingStock: parseInt(startingStock) || 0,
      purchased: parseInt(purchased) || 0,
      used: parseInt(used) || 0,
      endingStock: parseInt(endingStock) || 0
    };

    inventoryService.saveAuditOverrides(type, overrides);
    res.status(200).json({ message: 'Audit overrides saved successfully.', overrides: overrides[month] });
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
