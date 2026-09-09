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
    const { amc_id, amcId, ...visitData } = req.body;
    const finalAmcId = amc_id || amcId;
    await billingService.saveAMCVisit(finalAmcId, visitData);
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
    const { status, payment_date, transaction_ref, amount, bill_file } = req.body;
    // For simplicity, we just fetch, merge, and save
    const payments = await billingService.getUtilityPayments();
    const payment = payments.find(p => p.id === id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    
    if (status !== undefined) payment.status = status;
    if (payment_date !== undefined) payment.payment_date = payment_date;
    if (transaction_ref !== undefined) payment.transaction_ref = transaction_ref;
    if (amount !== undefined) payment.amount = amount;
    if (bill_file !== undefined) payment.bill_file = bill_file;
    
    await billingService.saveUtilityPayment(payment);
    res.status(200).json({ message: 'Status updated' });
  } catch (error) {
    next(error);
  }
};

exports.uploadUtilityBill = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No bill file uploaded' });
    }
    const billFileUrl = '/uploads/utilities/' + req.file.filename;
    const { id, utility_type, provider_name, account_number, billing_cycle, location, amount, due_date, status } = req.body;

    let recordId = id;
    if (!recordId) {
      const all = await billingService.getUtilityPayments();
      const exist = all.find(p => p.utility_type === utility_type && p.provider_name === provider_name && p.account_number === account_number && p.billing_cycle === billing_cycle);
      if (exist) recordId = exist.id;
    }

    const savedId = await billingService.saveUtilityPayment({
      id: recordId,
      utility_type,
      provider_name,
      account_number,
      billing_cycle,
      location,
      amount,
      due_date,
      status: status || 'Unpaid',
      bill_file: billFileUrl
    });

    res.status(200).json({
      message: 'Bill uploaded successfully',
      id: savedId,
      bill_file: billFileUrl
    });
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

exports.deleteUtilityConnection = async (req, res, next) => {
  try {
    const { utility_type, provider_name, account_number } = req.query;
    if (!utility_type || !provider_name || !account_number) {
      return res.status(400).json({ error: 'Missing connection details' });
    }
    await billingService.deleteUtilityConnection(utility_type, provider_name, account_number);
    res.status(200).json({ message: 'Connection deleted successfully' });
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
