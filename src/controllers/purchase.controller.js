const purchaseService = require('../services/purchase.service');

exports.createRequest = async (req, res) => {
  try {
    const host = process.env.BASE_URL || `http://${req.headers.host}`;
    const result = await purchaseService.createPurchaseRequest(req.body, host);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const results = await purchaseService.getAllPurchases();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.handleAction = async (req, res) => {
  try {
    const { token, action } = req.params;
    const host = process.env.BASE_URL || `http://${req.headers.host}`;
    
    await purchaseService.handleApprovalAction(token, action, host);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Action Processed</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: #16a34a;">Success!</h2>
        <p>Purchase request has been marked as <strong>${action}</strong>.</p>
        <p>You may now close this window.</p>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Action Failed</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: #dc2626;">Error</h2>
        <p>${error.message}</p>
      </body>
      </html>
    `);
  }
};

exports.markPurchased = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await purchaseService.markAsPurchased(id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
