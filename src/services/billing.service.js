const crypto = require('crypto');
const prisma = require('../config/db');

// AMC helper to ensure N visits exist for a contract
async function ensureAmcVisits(amcId, noOfVisits) {
  if (!noOfVisits || noOfVisits <= 0) return;
  const existingVisits = await prisma.amcVisit.findMany({
    where: { amc_id: amcId },
    orderBy: { visit_no: 'asc' }
  });

  const existingVisitNos = new Set(existingVisits.map(v => v.visit_no).filter(Boolean));

  for (let i = 1; i <= noOfVisits; i++) {
    if (!existingVisitNos.has(i)) {
      await prisma.amcVisit.create({
        data: {
          id: crypto.randomUUID(),
          amc_id: amcId,
          visit_no: i,
          status: 'Pending',
          created_at: new Date().toISOString()
        }
      });
    }
  }
}

// AMC
exports.getAMCs = async () => {
  const now = new Date();
  const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);

  const amcs = await prisma.amcContract.findMany({
    orderBy: { start_date: 'desc' },
    include: { visits: { orderBy: { visit_no: 'asc' } } }
  });

  let needsReload = false;

  for (const c of amcs) {
    // 1. Auto-generate missing visit logs based on no_of_visits
    if (c.no_of_visits && c.no_of_visits > 0) {
      const visitCount = c.visits ? c.visits.length : 0;
      if (visitCount < c.no_of_visits) {
        await ensureAmcVisits(c.id, c.no_of_visits);
        needsReload = true;
      }
    }

    // 2. Auto-expire contracts when end_date < today
    if (c.end_date) {
      const isExpired = c.end_date < todayStr;
      if (isExpired && c.status !== 'Expired') {
        await prisma.amcContract.update({
          where: { id: c.id },
          data: { status: 'Expired' }
        });
        c.status = 'Expired';
      } else if (!isExpired && c.status === 'Expired') {
        await prisma.amcContract.update({
          where: { id: c.id },
          data: { status: 'Active' }
        });
        c.status = 'Active';
      }
    }
  }

  if (needsReload) {
    return await prisma.amcContract.findMany({
      orderBy: { start_date: 'desc' },
      include: { visits: { orderBy: { visit_no: 'asc' } } }
    });
  }

  return amcs;
};

exports.saveAMC = async (data) => {
  const id = data.id || crypto.randomUUID();
  const now = new Date();
  const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
  
  // Calculate status if expired
  let status = data.status || 'Active';
  if (data.end_date && data.end_date < todayStr) {
    status = 'Expired';
  }

  const noOfVisits = data.no_of_visits ? parseInt(data.no_of_visits, 10) : null;

  const payload = {
    doc_no: data.doc_no,
    amc_name: data.amc_name,
    category: data.category,
    no_of_visits: noOfVisits,
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
    status
  };

  await prisma.amcContract.upsert({
    where: { id },
    update: payload,
    create: { id, ...payload, created_at: data.created_at || new Date().toISOString() }
  });

  // Automatically generate visit logs matching no_of_visits
  if (noOfVisits && noOfVisits > 0) {
    await ensureAmcVisits(id, noOfVisits);
  }

  return id;
};

exports.deleteAMC = async (id) => {
  await prisma.amcContract.delete({ where: { id } });
};

exports.saveAMCVisit = async (amc_id, data) => {
  const id = data.id || crypto.randomUUID();
  let existing = null;
  if (data.id) {
    try {
      existing = await prisma.amcVisit.findUnique({ where: { id: data.id } });
    } catch (e) {}
  }

  let reminderSentFor = existing ? existing.reminder_sent_for : null;
  let reminderSentAt = existing ? existing.reminder_sent_at : null;

  // If next_service_date is changed, reset reminder tracking to reschedule
  if (existing && data.next_service_date !== undefined && data.next_service_date !== existing.next_service_date) {
    reminderSentFor = null;
    reminderSentAt = null;
  }

  const payload = {
    amc_id,
    visit_no: data.visit_no ? parseInt(data.visit_no, 10) : (existing ? existing.visit_no : null),
    scheduled_date: data.scheduled_date !== undefined ? data.scheduled_date : (existing ? existing.scheduled_date : null),
    last_service_date: data.last_service_date !== undefined ? data.last_service_date : (existing ? existing.last_service_date : null),
    next_service_date: data.next_service_date !== undefined ? data.next_service_date : (existing ? existing.next_service_date : null),
    service_no: data.service_no !== undefined ? data.service_no : (existing ? existing.service_no : null),
    service_person: data.service_person !== undefined ? data.service_person : (existing ? existing.service_person : null),
    contact_number: data.contact_number !== undefined ? data.contact_number : (existing ? existing.contact_number : null),
    remarks: data.remarks !== undefined ? data.remarks : (existing ? existing.remarks : null),
    status: data.status || (existing ? existing.status : 'Pending'),
    reminder_sent_for: reminderSentFor,
    reminder_sent_at: reminderSentAt
  };

  await prisma.amcVisit.upsert({
    where: { id },
    update: payload,
    create: { id, ...payload, created_at: data.created_at || new Date().toISOString() }
  });

  // If next_service_date is scheduled on Visit N, cascade scheduled_date to Visit N+1 if pending
  if (payload.next_service_date && payload.visit_no) {
    try {
      const nextVisitNo = payload.visit_no + 1;
      const nextVisit = await prisma.amcVisit.findFirst({
        where: { amc_id, visit_no: nextVisitNo }
      });
      if (nextVisit && !nextVisit.last_service_date && nextVisit.status !== 'Completed') {
        await prisma.amcVisit.update({
          where: { id: nextVisit.id },
          data: { scheduled_date: payload.next_service_date }
        });
      }
    } catch (e) {
      console.error('[Billing Service] Error cascading scheduled date to next visit:', e);
    }
  }

  // Check and trigger reminder if the scheduled next visit is within 2 days
  try {
    const { checkAndSendAmcVisitReminders } = require('./reminders.service');
    await checkAndSendAmcVisitReminders();
  } catch (err) {
    console.error('[Billing Service] Error triggering checkAndSendAmcVisitReminders:', err);
  }

  return id;
};

// Utility Payments
exports.getUtilityPayments = async () => {
  return await prisma.utilityPayment.findMany({ orderBy: { due_date: 'desc' } });
};

exports.saveUtilityPayment = async (data) => {
  const id = data.id || crypto.randomUUID();
  const updateData = {
    utility_type: data.utility_type,
    provider_name: data.provider_name,
    account_number: data.account_number,
    billing_cycle: data.billing_cycle,
    due_date: data.due_date,
    amount: data.amount !== undefined && data.amount !== '' && data.amount !== null ? parseFloat(data.amount) : null,
    status: data.status,
    payment_date: data.payment_date,
    transaction_ref: data.transaction_ref,
    remarks: data.remarks,
    location: data.location
  };
  if (data.bill_file !== undefined) {
    updateData.bill_file = data.bill_file;
  }
  await prisma.utilityPayment.upsert({
    where: { id },
    update: updateData,
    create: {
      id,
      ...updateData,
      bill_file: data.bill_file || null,
      created_at: data.created_at || new Date().toISOString()
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
