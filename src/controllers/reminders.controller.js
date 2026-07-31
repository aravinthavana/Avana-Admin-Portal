const remindersService = require('../services/reminders.service');

exports.getAll = async (req, res, next) => {
  try {
    const list = await remindersService.getAllReminders();
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const created = await remindersService.createReminder(req.body);
    res.status(201).json({ message: 'Reminder task created.', entry: created });
  } catch (error) {
    next(error);
  }
};

exports.triggerScan = async (req, res, next) => {
  try {
    const result = await remindersService.checkAndSendReminders();
    res.status(200).json({ message: 'Instant renewal & deadline scan completed.', summary: result });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await remindersService.deleteReminder(id);
    if (!success) return res.status(404).json({ error: 'Reminder not found or failed to delete.' });

    res.status(200).json({ message: 'Reminder task deleted.' });
  } catch (error) {
    next(error);
  }
};
