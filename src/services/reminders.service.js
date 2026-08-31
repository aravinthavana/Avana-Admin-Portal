const env = require('../config/env');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');
const { sendEmail } = require('../utils/notifications');
const { templates } = require('../utils/email-templates');

// Seed legacy reminders.json if table is empty
async function ensureLegacyRemindersMigrated() {
  try {
    const count = await prisma.reminder.count();
    if (count > 0) return;

    const legacyFile = path.join(__dirname, '../../legacy-booking/reminders.json');
    if (!fs.existsSync(legacyFile)) return;

    const raw = fs.readFileSync(legacyFile, 'utf8');
    const legacyReminders = JSON.parse(raw);

    if (!Array.isArray(legacyReminders) || legacyReminders.length === 0) return;

    console.log(`[Reminders Migration] Migrating ${legacyReminders.length} legacy reminders to SQLite...`);

    for (const r of legacyReminders) {
      await prisma.reminder.create({
        data: {
          id: r.id || undefined,
          text: r.text || 'Reminder Task',
          dateTime: r.dateTime || new Date().toISOString(),
          priority: r.priority || 'Medium',
          adminEmail: r.adminEmail || env.ADMIN_EMAIL,
          sent: r.sent || false,
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    }
    console.log('[Reminders Migration] Legacy reminders migrated successfully!');
  } catch (err) {
    console.error('[Reminders Migration] Migration error:', err);
  }
}

// Call on startup
ensureLegacyRemindersMigrated().catch(console.error);

exports.getAllReminders = async () => {
  await ensureLegacyRemindersMigrated();
  return prisma.reminder.findMany({
    orderBy: { dateTime: 'asc' }
  });
};

exports.createReminder = async (data) => {
  const { text, dateTime, priority, adminEmail } = data;
  return prisma.reminder.create({
    data: {
      text: text || 'Admin Task Reminder',
      dateTime: dateTime || new Date().toISOString().slice(0, 16),
      priority: priority || 'Medium',
      adminEmail: adminEmail || env.ADMIN_EMAIL,
      sent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
};

exports.deleteReminder = async (id) => {
  try {
    await prisma.reminder.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
};

const NOTIFICATION_CC = env.NOTIFICATION_CC;

/**
 * Checks for:
 * 1. AMC contracts expiring within 3 weeks (21 days) -> Separate email per AMC + CC srinivasan@avanamedical.com
 * 2. Utility payments due within 4 days -> Separate email per payment + CC srinivasan@avanamedical.com
 * 3. Tax payments due within 1 month (30 days) -> Separate email per tax + CC srinivasan@avanamedical.com
 * 4. Low stationery stocks (stock < 6) -> Separate email per item to Admin ONLY (no CC)
 * 5. Due custom reminders -> Admin ONLY (no CC)
 */
exports.checkAndSendReminders = async () => {
  try {
    console.log('[Reminders Service] Running daily deadline & stock checks...');
    const adminEmail = env.ADMIN_EMAIL;
    const now = new Date();
    const threeWeeksFromNow = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
    const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Check custom due reminders (Admin ONLY, no CC)
    const dueReminders = await prisma.reminder.findMany({
      where: {
        sent: false,
      }
    });

    const readyReminders = dueReminders.filter(r => new Date(r.dateTime) <= now);
    for (const r of readyReminders) {
      await sendEmail({
        to: r.adminEmail || adminEmail,
        subject: `🔔 [REMINDER - ${r.priority}] ${r.text.substring(0, 40)}`,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; padding: 1.5rem; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4338ca; margin-top: 0;">Help Desk Task Reminder</h2>
            <p>This is a scheduled notification for your reminder task:</p>
            <p style="font-size: 1.1rem; font-weight: bold; background: #f1f5f9; padding: 0.8rem; border-radius: 6px;">${r.text}</p>
            <p><strong>Priority:</strong> ${r.priority} | <strong>Scheduled:</strong> ${r.dateTime}</p>
          </div>
        `
      });

      await prisma.reminder.update({
        where: { id: r.id },
        data: { sent: true, sentAt: new Date().toISOString() }
      });
    }

    // 2. Fetch active AMC contracts expiring within 3 weeks (21 days) -> Separate email per AMC
    const amcs = await prisma.amcContract.findMany({
      where: { status: 'active' }
    });

    const expiringAmcs = amcs.filter(c => {
      if (!c.end_date) return false;
      const endDate = new Date(c.end_date);
      return endDate >= now && endDate <= threeWeeksFromNow;
    });

    for (const amc of expiringAmcs) {
      console.log(`[Reminders Service] Sending individual AMC reminder for: ${amc.equipment_name}`);
      await sendEmail({
        to: adminEmail,
        cc: NOTIFICATION_CC,
        subject: `🛠️ AMC Renewal Reminder: ${amc.equipment_name} (${amc.vendor_name || 'Vendor'}) - Expiring ${amc.end_date}`,
        htmlBody: templates.amcIndividualReminder({ amc })
      });
    }

    // 3. Fetch unpaid/overdue Utility payments due within 4 days -> Separate email per utility bill
    const utilities = await prisma.utilityPayment.findMany({
      where: {
        status: { in: ['Unpaid', 'unpaid', 'Overdue', 'overdue'] }
      }
    });

    const dueUtilities = utilities.filter(p => {
      if (!p.due_date) return false;
      const dueDate = new Date(p.due_date);
      return dueDate >= now && dueDate <= fourDaysFromNow;
    });

    for (const utility of dueUtilities) {
      console.log(`[Reminders Service] Sending individual Utility reminder for: ${utility.utility_type} (${utility.provider_name})`);
      await sendEmail({
        to: adminEmail,
        cc: NOTIFICATION_CC,
        subject: `⚡ Utility Payment Reminder: ${utility.utility_type} (${utility.provider_name || 'Provider'}) - Due on ${utility.due_date}`,
        htmlBody: templates.utilityIndividualReminder({ utility })
      });
    }

    // 4. Fetch unpaid/overdue Tax payments due within 1 month (30 days) -> Separate email per tax payment
    const taxes = await prisma.taxPayment.findMany({
      where: {
        status: { in: ['Unpaid', 'unpaid', 'Overdue', 'overdue'] }
      }
    });

    const dueTaxes = taxes.filter(p => {
      if (!p.due_date) return false;
      const dueDate = new Date(p.due_date);
      return dueDate >= now && dueDate <= oneMonthFromNow;
    });

    for (const tax of dueTaxes) {
      console.log(`[Reminders Service] Sending individual Tax reminder for: ${tax.tax_type}`);
      await sendEmail({
        to: adminEmail,
        cc: NOTIFICATION_CC,
        subject: `🏛️ Tax Payment Reminder: ${tax.tax_type} (${tax.authority_name || 'Authority'}) - Due on ${tax.due_date}`,
        htmlBody: templates.taxIndividualReminder({ tax })
      });
    }

    // 5. Fetch low stationery stock items (strictly below 6 items) -> Separate email per item (Admin ONLY, no CC)
    let newlyNotifiedCount = 0;
    const lowStockStateFile = '/app/data/low_stock_notified.json';
    let notifiedItems = {};
    if (fs.existsSync(lowStockStateFile)) {
      try {
        notifiedItems = JSON.parse(fs.readFileSync(lowStockStateFile, 'utf8'));
      } catch (e) {}
    }
    let lowStationeryItems = [];
    try {
      lowStationeryItems = await prisma.inventoryItem.findMany({
        where: {
          category: { in: ['stationery', 'printing'] },
          currentStock: { lt: 6 }
        }
      });
    } catch (e) {
      console.error('[Reminders Service] Error fetching inventory items:', e);
    }

    for (const item of lowStationeryItems) {
      if (!notifiedItems[item.id] || notifiedItems[item.id] > item.currentStock) {
        console.log(`[Reminders Service] Sending individual Low Stock alert for: ${item.name} (${item.currentStock} remaining)`);
        await sendEmail({
          to: adminEmail,
          subject: `⚠️ Low Stock Alert: "${item.name}" (${item.currentStock} remaining)`,
          htmlBody: templates.lowStockAlert({ item: item.name, currentQty: item.currentStock, threshold: 5 })
        });
        notifiedItems[item.id] = item.currentStock;
        newlyNotifiedCount++;
      }
    }
    
    try {
      fs.writeFileSync(lowStockStateFile, JSON.stringify(notifiedItems));
    } catch (e) { console.error('Failed to save low stock state:', e); }

    const totalDeadlines = expiringAmcs.length + dueUtilities.length + dueTaxes.length;
    if (totalDeadlines === 0 && readyReminders.length === 0 && newlyNotifiedCount === 0) {
      console.log('[Reminders Service] No upcoming deadlines or low stock alerts found today.');
    }

    return { 
      amcCount: expiringAmcs.length, 
      utilityCount: dueUtilities.length, 
      taxCount: dueTaxes.length, 
      customCount: readyReminders.length, 
      lowStockCount: newlyNotifiedCount 
    };
  } catch (err) {
    console.error('[Reminders Service] Error running checkAndSendReminders:', err);
    throw err;
  }
};
