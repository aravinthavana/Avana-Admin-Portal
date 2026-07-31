const courierService = require('../services/courier-dispatch.service');

exports.getAllDispatches = async (req, res, next) => {
  try {
    const list = await courierService.getAllDispatches();
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
};

exports.getDispatchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dispatch = await courierService.getDispatchById(id);
    if (!dispatch) return res.status(404).json({ error: 'Delivery Challan not found.' });

    res.status(200).json(dispatch);
  } catch (error) {
    next(error);
  }
};

exports.createDispatch = async (req, res, next) => {
  try {
    const requesterEmail = req.user?.email || req.body.requesterEmail || '';
    const host = req.protocol + '://' + req.get('host');
    const created = await courierService.createDispatch(req.body, requesterEmail, host);

    res.status(201).json({ message: 'Delivery Challan created successfully.', dispatch: created });
  } catch (error) {
    next(error);
  }
};

exports.updateTrackingInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await courierService.updateTrackingInfo(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Delivery Challan not found.' });

    res.status(200).json({ message: 'Tracking information updated.', dispatch: updated });
  } catch (error) {
    next(error);
  }
};

exports.mergeParcel = async (req, res, next) => {
  try {
    const { parentDispatchId, items, remarks } = req.body;
    const requesterEmail = req.user?.email || req.body.requesterEmail || '';
    if (!parentDispatchId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing parent dispatch ID or items array.' });
    }

    const updated = await courierService.mergeParcel(parentDispatchId, requesterEmail, items, remarks);
    if (!updated) return res.status(404).json({ error: 'Parent Delivery Challan not found.' });

    res.status(200).json({ message: 'Parcels merged successfully into Delivery Challan.', dispatch: updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteDispatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await courierService.deleteDispatch(id);
    if (!success) return res.status(404).json({ error: 'Record not found or failed to delete.' });

    res.status(200).json({ message: 'Delivery Challan deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.printDeliveryChallan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dispatch = await courierService.getDispatchById(id);
    if (!dispatch) return res.status(404).send('Delivery Challan not found.');

    const html = courierService.renderDeliveryChallanHtml(dispatch);
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};
