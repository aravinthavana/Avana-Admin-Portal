const billWarrantyService = require('../services/bill-warranty.service');

exports.getAll = async (req, res, next) => {
  try {
    const { month } = req.query;
    const list = await billWarrantyService.getAllBillWarrantyRecords(month);
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const created = await billWarrantyService.createBillWarrantyRecord(req.body);
    res.status(201).json({ message: 'Bill & Warranty record created.', entry: created });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await billWarrantyService.updateBillWarrantyRecord(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Record not found.' });

    res.status(200).json({ message: 'Bill & Warranty record updated.', entry: updated });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await billWarrantyService.deleteBillWarrantyRecord(id);
    if (!success) return res.status(404).json({ error: 'Record not found or failed to delete.' });

    res.status(200).json({ message: 'Bill & Warranty record deleted.' });
  } catch (error) {
    next(error);
  }
};
