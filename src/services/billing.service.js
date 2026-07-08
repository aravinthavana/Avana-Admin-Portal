const crypto = require('crypto');
const prisma = require('../config/db');

// AMC
exports.getAMCs = async () => {
  return await prisma.amcContract.findMany({
    orderBy: { start_date: 'desc' },
    include: { visits: { orderBy: { visit_date: 'asc' } } }
  });
};

exports.saveAMC = async (data) => {
  const id = data.id || crypto.randomUUID();
  await prisma.amcContract.upsert({
    where: { id },
    update: {
      equipment_name: data.equipment_name, vendor_name: data.vendor_name, contact_person: data.contact_person,
      contact_number: data.contact_number, contact_email: data.contact_email, start_date: data.start_date,
      end_date: data.end_date, cost: data.cost, status: data.status, remarks: data.remarks
    },
    create: {
      id, equipment_name: data.equipment_name, vendor_name: data.vendor_name, contact_person: data.contact_person,
      contact_number: data.contact_number, contact_email: data.contact_email, start_date: data.start_date,
      end_date: data.end_date, cost: data.cost, status: data.status, remarks: data.remarks, created_at: data.created_at || new Date().toISOString()
    }
  });
  return id;
};

exports.deleteAMC = async (id) => {
  await prisma.amcContract.delete({ where: { id } });
};

exports.saveAMCVisit = async (amc_id, data) => {
  const id = data.id || crypto.randomUUID();
  await prisma.amcVisit.upsert({
    where: { id },
    update: {
      visit_date: data.visit_date, technician_name: data.technician_name, work_done: data.work_done, status: data.status
    },
    create: {
      id, amc_id, visit_date: data.visit_date, technician_name: data.technician_name, work_done: data.work_done, status: data.status, created_at: data.created_at || new Date().toISOString()
    }
  });
};

// Utility Payments
exports.getUtilityPayments = async () => {
  return await prisma.utilityPayment.findMany({ orderBy: { due_date: 'desc' } });
};

exports.saveUtilityPayment = async (data) => {
  const id = data.id || crypto.randomUUID();
  await prisma.utilityPayment.upsert({
    where: { id },
    update: {
      utility_type: data.utility_type, provider_name: data.provider_name, account_number: data.account_number,
      billing_cycle: data.billing_cycle, due_date: data.due_date, amount: data.amount, status: data.status,
      payment_date: data.payment_date, transaction_ref: data.transaction_ref, remarks: data.remarks
    },
    create: {
      id, utility_type: data.utility_type, provider_name: data.provider_name, account_number: data.account_number,
      billing_cycle: data.billing_cycle, due_date: data.due_date, amount: data.amount, status: data.status,
      payment_date: data.payment_date, transaction_ref: data.transaction_ref, remarks: data.remarks, created_at: data.created_at || new Date().toISOString()
    }
  });
  return id;
};

exports.deleteUtilityPayment = async (id) => {
  await prisma.utilityPayment.delete({ where: { id } });
};

// Tax Payments
exports.getTaxPayments = async () => {
  return await prisma.taxPayment.findMany({ orderBy: { due_date: 'desc' } });
};

exports.saveTaxPayment = async (data) => {
  const id = data.id || crypto.randomUUID();
  await prisma.taxPayment.upsert({
    where: { id },
    update: {
      tax_type: data.tax_type, authority_name: data.authority_name, assessment_year: data.assessment_year,
      due_date: data.due_date, amount: data.amount, status: data.status, payment_date: data.payment_date,
      transaction_ref: data.transaction_ref, remarks: data.remarks
    },
    create: {
      id, tax_type: data.tax_type, authority_name: data.authority_name, assessment_year: data.assessment_year,
      due_date: data.due_date, amount: data.amount, status: data.status, payment_date: data.payment_date,
      transaction_ref: data.transaction_ref, remarks: data.remarks, created_at: data.created_at || new Date().toISOString()
    }
  });
  return id;
};

exports.deleteTaxPayment = async (id) => {
  await prisma.taxPayment.delete({ where: { id } });
};
