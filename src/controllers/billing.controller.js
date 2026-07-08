const billingService = require('../services/billing.service');

// --- AMC ---
exports.getAMCs = async (req, res, next) => {
  try {
    const amcs = await billingService.getAMCs();
    res.status(200).json(amcs);
  } catch (error) {
    next(error);
  }
};

exports.saveAMC = async (req, res, next) => {
  try {
    const id = await billingService.saveAMC(req.body);
    res.status(200).json({ message: 'AMC saved successfully', id });
  } catch (error) {
    next(error);
  }
};

exports.deleteAMC = async (req, res, next) => {
  try {
    const { id } = req.params;
    await billingService.deleteAMC(id);
    res.status(200).json({ message: 'AMC deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.saveAMCVisit = async (req, res, next) => {
  try {
    const { amcId, ...visitData } = req.body;
    await billingService.saveAMCVisit(amcId, visitData);
    res.status(200).json({ message: 'Visit saved successfully' });
  } catch (error) {
    next(error);
  }
};

// --- Utilities ---
exports.getUtilityPayments = async (req, res, next) => {
  try {
    const payments = await billingService.getUtilityPayments();
    res.status(200).json(payments);
  } catch (error) {
    next(error);
  }
};

exports.saveUtilityPayment = async (req, res, next) => {
  try {
    const id = await billingService.saveUtilityPayment(req.body);
    res.status(200).json({ message: 'Utility payment saved successfully', id });
  } catch (error) {
    next(error);
  }
};

exports.patchUtilityPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, payment_date, transaction_ref, amount } = req.body;
    // For simplicity, we just fetch, merge, and save
    const payments = await billingService.getUtilityPayments();
    const payment = payments.find(p => p.id === id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    
    if (status) payment.status = status;
    if (payment_date) payment.payment_date = payment_date;
    if (transaction_ref) payment.transaction_ref = transaction_ref;
    if (amount) payment.amount = amount;
    
    await billingService.saveUtilityPayment(payment);
    res.status(200).json({ message: 'Status updated' });
  } catch (error) {
    next(error);
  }
};

exports.deleteUtilityPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    await billingService.deleteUtilityPayment(id);
    res.status(200).json({ message: 'Utility payment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// --- Tax ---
exports.getTaxPayments = async (req, res, next) => {
  try {
    const payments = await billingService.getTaxPayments();
    res.status(200).json(payments);
  } catch (error) {
    next(error);
  }
};

exports.saveTaxPayment = async (req, res, next) => {
  try {
    const id = await billingService.saveTaxPayment(req.body);
    res.status(200).json({ message: 'Tax payment saved successfully', id });
  } catch (error) {
    next(error);
  }
};

exports.patchTaxPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, payment_date, transaction_ref, amount } = req.body;
    const payments = await billingService.getTaxPayments();
    const payment = payments.find(p => p.id === id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    
    if (status) payment.status = status;
    if (payment_date) payment.payment_date = payment_date;
    if (transaction_ref) payment.transaction_ref = transaction_ref;
    if (amount) payment.amount = amount;
    
    await billingService.saveTaxPayment(payment);
    res.status(200).json({ message: 'Status updated' });
  } catch (error) {
    next(error);
  }
};

exports.deleteTaxPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    await billingService.deleteTaxPayment(id);
    res.status(200).json({ message: 'Tax payment deleted successfully' });
  } catch (error) {
    next(error);
  }
};
