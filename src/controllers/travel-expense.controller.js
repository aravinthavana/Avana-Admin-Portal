const travelService = require('../services/travel-expense.service');

exports.getAll = async (req, res, next) => {
  try {
    const { month } = req.query;
    const list = await travelService.getAllTravelExpenses(month);
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const created = await travelService.createTravelExpense(req.body);
    res.status(201).json({ message: 'Travel expense entry created.', entry: created });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await travelService.updateTravelExpense(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Entry not found.' });

    res.status(200).json({ message: 'Travel expense entry updated.', entry: updated });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await travelService.deleteTravelExpense(id);
    if (!success) return res.status(404).json({ error: 'Entry not found or failed to delete.' });

    res.status(200).json({ message: 'Travel expense entry deleted.' });
  } catch (error) {
    next(error);
  }
};
