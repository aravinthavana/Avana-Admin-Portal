const otherStockService = require('../services/other-stock.service');

exports.getAll = async (req, res, next) => {
  try {
    const list = await otherStockService.getAllOtherStock();
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
};

exports.save = async (req, res, next) => {
  try {
    const saved = await otherStockService.saveOtherStock(req.body);
    res.status(200).json(saved);
  } catch (error) {
    next(error);
  }
};

exports.useStock = async (req, res, next) => {
  try {
    const updated = await otherStockService.useOtherStock(req.body);
    if (!updated) return res.status(404).json({ error: 'Stock item not found.' });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await otherStockService.deleteOtherStock(id);
    if (!success) return res.status(404).json({ error: 'Stock item not found or failed to delete.' });

    res.status(200).json({ message: 'Stock item deleted.' });
  } catch (error) {
    next(error);
  }
};

exports.updateUsage = async (req, res) => {
  try {
    const { id, usageId } = req.params;
    const { qty, remarks } = req.body;
    const updated = await otherStockService.updateUsage(id, usageId, parseInt(qty), remarks);
    res.json(updated);
  } catch (err) {
    console.error('Update Usage Error:', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
};
