const assetTrackerService = require('../services/asset-tracker.service');

// Admin Handlers
exports.getAllHandovers = async (req, res, next) => {
  try {
    const list = await assetTrackerService.getAllHandovers();
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
};

exports.createHandover = async (req, res, next) => {
  try {
    const host = req.protocol + '://' + req.get('host');
    const created = await assetTrackerService.createHandover(req.body, host);
    res.status(201).json({ message: 'Asset handover created successfully.', handover: created });
  } catch (error) {
    next(error);
  }
};

exports.remindHandover = async (req, res, next) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing handover ID.' });
    
    const handover = await assetTrackerService.getHandoverById(id);
    if (!handover) return res.status(404).json({ error: 'Handover record not found.' });

    const host = req.protocol + '://' + req.get('host');
    await assetTrackerService.sendHandoverEmailNotification(handover, host);
    res.status(200).json({ message: 'Reminder email sent successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.appendAssets = async (req, res, next) => {
  try {
    const { id, assets, sendEmail } = req.body;
    if (!id || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ error: 'Missing ID or assets array.' });
    }
    const host = req.protocol + '://' + req.get('host');
    const updated = await assetTrackerService.appendAssets(id, assets, sendEmail, host);
    if (!updated) return res.status(404).json({ error: 'Handover record not found.' });

    res.status(200).json({ message: 'Assets added successfully.', handover: updated });
  } catch (error) {
    next(error);
  }
};

exports.returnAssets = async (req, res, next) => {
  try {
    const { id, items, remarks } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing ID.' });

    const updated = await assetTrackerService.processReturn(id, items, remarks);
    if (!updated) return res.status(404).json({ error: 'Handover record not found.' });

    res.status(200).json({ message: 'Asset return processed successfully.', handover: updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteHandover = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await assetTrackerService.deleteHandover(id);
    if (!success) return res.status(404).json({ error: 'Record not found or failed to delete.' });

    res.status(200).json({ message: 'Asset handover record deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Public Employee Acknowledgement Handlers
exports.getAckDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const handover = await assetTrackerService.getHandoverById(id);
    if (!handover) return res.status(404).json({ error: 'Asset handover record not found.' });

    res.status(200).json(handover);
  } catch (error) {
    next(error);
  }
};

exports.submitAck = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { signature, remarks } = req.body;
    const updated = await assetTrackerService.acknowledgeAssets(id, signature, remarks);
    if (!updated) return res.status(404).json({ error: 'Handover record not found.' });

    res.status(200).json({ message: 'Asset handover acknowledged successfully.', handover: updated });
  } catch (error) {
    next(error);
  }
};
