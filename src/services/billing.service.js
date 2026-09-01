const crypto = require('crypto');
const prisma = require('../config/db');

// AMC
exports.getAMCs = async () => {
  return await prisma.amcContract.findMany({
    orderBy: { start_date: 'desc' },
    include: { visits: { orderBy: { scheduled_date: 'asc' } } }
  });
};

exports.saveAMC = async (data) => {
  const id = data.id || crypto.randomUUID();
  const payload = {
    doc_no: data.doc_no,
    amc_name: data.amc_name,
    category: data.category,
    no_of_visits: data.no_of_visits ? parseInt(data.no_of_visits, 10) : null,
    units_location: data.units_location,
    pricing: data.pricing ? parseFloat(data.pricing) : null,
    frequency: data.frequency,
    start_date: data.start_date,
    end_date: data.end_date,
    last_service: data.last_service,
    next_service: data.next_service,
    vendor_contact: data.vendor_contact,
    vendor_phone: data.vendor_phone,
    coverage_specs: data.coverage_specs,
    status: data.status
  };
  await prisma.amcContract.upsert({
    where: { id },
    update: payload,
    create: { id, ...payload, created_at: data.created_at || new Date().toISOString() }
  });
  return id;
};

exports.deleteAMC = async (id) => {
  await prisma.amcContract.delete({ where: { id } });
};

exports.saveAMCVisit = async (amc_id, data) => {
  const id = data.id || crypto.randomUUID();
  const payload = {
    amc_id,
    visit_no: data.visit_no ? parseInt(data.visit_no, 10) : null,
    scheduled_date: data.scheduled_date,
    last_service_date: data.last_service_date,
    next_service_date: data.next_service_date,
    service_no: data.service_no,
    service_person: data.service_person,
    contact_number: data.contact_number,
    remarks: data.remarks,
    status: data.status || 'Pending'
  };
  await prisma.amcVisit.upsert({
    where: { id },
    update: payload,
    create: { id, ...payload, created_at: data.created_at || new Date().toISOString() }
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
      billing_cycle: data.billing_cycle, due_date: data.due_date, amount: data.amount ? parseFloat(data.amount) : null, status: data.status,
      payment_date: data.payment_date, transaction_ref: data.transaction_ref, remarks: data.remarks, location: data.location
    },
    create: {
      id, utility_type: data.utility_type, provider_name: data.provider_name, account_number: data.account_number,
      billing_cycle: data.billing_cycle, due_date: data.due_date, amount: data.amount ? parseFloat(data.amount) : null, status: data.status,
      payment_date: data.payment_date, transaction_ref: data.transaction_ref, remarks: data.remarks, location: data.location, created_at: data.created_at || new Date().toISOString()
    }
  });
  return id;
};

exports.deleteUtilityPayment = async (id) => {
  await prisma.utilityPayment.delete({ where: { id } });
};

exports.deleteUtilityConnection = async (utility_type, provider_name, account_number) => {
  await prisma.utilityPayment.deleteMany({
    where: {
      utility_type,
      provider_name,
      account_number
    }
  });
};

// Tax Payments
exports.getTaxPayments = async () => {
  return await prisma.taxPayment.findMany({ orderBy: { due_date: 'desc' } });
};

exports.saveTaxPayment = async (data) => {
  const id = data.id || crypto.randomUUID();
  const payload = {
    tax_type: data.tax_type,
    location: data.location,
    bill_no: data.bill_no,
    year: data.year,
    term: data.term,
    due_date: data.due_date,
    amount: data.amount ? parseFloat(data.amount) : null,
    status: data.status,
    payment_date: data.payment_date,
    transaction_ref: data.transaction_ref,
    remarks: data.remarks
  };
  await prisma.taxPayment.upsert({
    where: { id },
    update: payload,
    create: { id, ...payload, created_at: data.created_at || new Date().toISOString() }
  });
  return id;
};

exports.deleteTaxPayment = async (id) => {
  await prisma.taxPayment.delete({ where: { id } });
};
