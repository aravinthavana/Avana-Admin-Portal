const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

const readJson = (file) => {
  try {
    const fullPath = path.join(__dirname, '../../', file);
    if (fs.existsSync(fullPath)) {
      return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    }
  } catch (e) {
    console.error(`Error reading ${file}:`, e);
  }
  return null;
};

async function migrate() {
  console.log('Starting Migration to Prisma...');

  // 1. Admin Logins
  const logins = readJson('admin_logins.json');
  if (logins && Array.isArray(logins)) {
    for (const log of logins) {
      await prisma.adminLogin.create({
        data: {
          username: log.username || 'admin',
          timestamp: log.timestamp,
          ip: log.ip,
          userAgent: log.userAgent,
          status: log.status
        }
      });
    }
    console.log(`Migrated ${logins.length} admin logins.`);
  }

  // 2. Bookings
  const bookings = readJson('bookings.json');
  if (bookings && Array.isArray(bookings)) {
    for (const b of bookings) {
      await prisma.booking.upsert({
        where: { id: b.id },
        update: {},
        create: {
          id: b.id, name: b.name, email: b.email, phone: b.phone, date: b.date,
          startDate: b.startDate, endDate: b.endDate, bookingType: b.bookingType,
          startTime: b.startTime, endTime: b.endTime, reason: b.reason,
          attendees: b.attendees, remarks: b.remarks, food: b.food,
          foodSpecify: b.foodSpecify, foodCount: b.foodCount,
          createdAt: b.createdAt, status: b.status
        }
      });
    }
    console.log(`Migrated ${bookings.length} bookings.`);
  }

  // 3. Helpdesk
  const helpdesk = readJson('helpdesk_requests.json');
  if (helpdesk && Array.isArray(helpdesk)) {
    for (const r of helpdesk) {
      const itemsStr = r.items ? (typeof r.items === 'string' ? r.items : JSON.stringify(r.items)) : '';
      await prisma.helpdeskRequest.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id, category: r.category, name: r.name, email: r.email, phone: r.phone,
          location: r.location, description: r.description, items: itemsStr,
          status: r.status, createdAt: r.createdAt, resolution: r.resolution
        }
      });
    }
    console.log(`Migrated ${helpdesk.length} helpdesk requests.`);
  }

  // 4. AMC Contracts & Visits
  const amcs = readJson('amc_contracts.json');
  if (amcs && Array.isArray(amcs)) {
    for (const a of amcs) {
      await prisma.amcContract.upsert({
        where: { id: a.id },
        update: {},
        create: {
          id: a.id, equipment_name: a.equipment_name, vendor_name: a.vendor_name,
          contact_person: a.contact_person, contact_number: a.contact_number,
          contact_email: a.contact_email, start_date: a.start_date, end_date: a.end_date,
          cost: a.cost, status: a.status, remarks: a.remarks, created_at: a.created_at
        }
      });

      if (a.visits && Array.isArray(a.visits)) {
        for (const v of a.visits) {
          const vId = v.id || require('crypto').randomUUID();
          await prisma.amcVisit.upsert({
            where: { id: vId },
            update: {},
            create: {
              id: vId, amc_id: a.id, visit_date: v.visit_date,
              technician_name: v.technician_name, work_done: v.work_done,
              status: v.status, created_at: v.created_at
            }
          });
        }
      }
    }
    console.log(`Migrated ${amcs.length} AMC contracts and their visits.`);
  }

  // 5. Utilities
  const utilities = readJson('utility_payments.json');
  if (utilities && Array.isArray(utilities)) {
    for (const u of utilities) {
      await prisma.utilityPayment.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id, utility_type: u.utility_type, provider_name: u.provider_name,
          account_number: u.account_number, billing_cycle: u.billing_cycle,
          due_date: u.due_date, amount: u.amount, status: u.status,
          payment_date: u.payment_date, transaction_ref: u.transaction_ref,
          remarks: u.remarks, created_at: u.created_at
        }
      });
    }
    console.log(`Migrated ${utilities.length} utility payments.`);
  }

  // 6. Tax Payments
  const taxes = readJson('tax_payments.json');
  if (taxes && Array.isArray(taxes)) {
    for (const t of taxes) {
      await prisma.taxPayment.upsert({
        where: { id: t.id },
        update: {},
        create: {
          id: t.id, tax_type: t.tax_type, authority_name: t.authority_name,
          assessment_year: t.assessment_year, due_date: t.due_date, amount: t.amount,
          status: t.status, payment_date: t.payment_date, transaction_ref: t.transaction_ref,
          remarks: t.remarks, created_at: t.created_at
        }
      });
    }
    console.log(`Migrated ${taxes.length} tax payments.`);
  }

  // 7. Inventory
  // Delete all existing to avoid duplicate conflicts if run multiple times
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryAuditOverride.deleteMany();
  await prisma.inventoryItem.deleteMany();

  const types = ['stationery', 'housekeeping'];
  for (const type of types) {
    const stock = readJson(`${type}_stock.json`);
    if (stock && typeof stock === 'object') {
      for (const [name, qty] of Object.entries(stock)) {
        await prisma.inventoryItem.create({
          data: { name, category: type, currentStock: qty, updatedAt: new Date().toISOString() }
        });
      }
      console.log(`Migrated ${Object.keys(stock).length} ${type} items.`);
    }

    const txs = readJson(`${type}_transactions.json`);
    if (txs && Array.isArray(txs)) {
      for (const t of txs) {
        const item = await prisma.inventoryItem.findFirst({ where: { name: t.item, category: type } });
        if (item) {
          await prisma.inventoryTransaction.create({
            data: {
              itemId: item.id, type: t.type, quantity: t.quantity,
              previousStock: t.previousStock, newStock: t.newStock,
              timestamp: t.timestamp, remarks: t.remarks || ''
            }
          });
        }
      }
      console.log(`Migrated ${txs.length} ${type} transactions.`);
    }

    const overrides = readJson(`${type}_audit_overrides.json`);
    if (overrides && typeof overrides === 'object') {
      for (const [month, itemsMap] of Object.entries(overrides)) {
        for (const [name, obj] of Object.entries(itemsMap)) {
          const item = await prisma.inventoryItem.findFirst({ where: { name, category: type } });
          if (item) {
            await prisma.inventoryAuditOverride.create({
              data: {
                itemId: item.id, month,
                startingStock: obj.startingStock, purchased: obj.purchased,
                used: obj.used, endingStock: obj.endingStock
              }
            });
          }
        }
      }
      console.log(`Migrated ${type} overrides.`);
    }
  }

  console.log('Migration completed perfectly!');
}

migrate()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
