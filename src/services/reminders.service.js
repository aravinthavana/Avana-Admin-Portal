const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');
const { sendEmail } = require('../utils/notifications');

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
          adminEmail: r.adminEmail || process.env.ADMIN_EMAIL || 'Karthicksankar@avanamedical.com',
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
      adminEmail: adminEmail || process.env.ADMIN_EMAIL || 'Karthicksankar@avanamedical.com',
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

const NOTIFICATION_CC = 'aravinth@avanamedical.com';

/**
 * Checks for:
 * 1. Low stock items (stock <= 5)
 * 2. AMC contracts expiring within 3 weeks (21 days)
 * 3. Utility payments due within 4 days
 * 4. Tax payments due within 1 month (30 days)
 * 5. Due custom reminders
 * All notifications send to admin and CC aravinth@avanamedical.com
 */
exports.checkAndSendReminders = async () => {
  try {
    console.log('[Reminders Service] Running daily deadline & stock checks...');
    const adminEmail = process.env.ADMIN_EMAIL || 'Karthicksankar@avanamedical.com';
    const now = new Date();
    const threeWeeksFromNow = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
    const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Check custom due reminders
    const dueReminders = await prisma.reminder.findMany({
      where: {
        sent: false,
      }
    });

    const readyReminders = dueReminders.filter(r => new Date(r.dateTime) <= now);
    for (const r of readyReminders) {
      await sendEmail({
        to: r.adminEmail || adminEmail,
        cc: NOTIFICATION_CC,
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

    // 2. Fetch active AMC contracts expiring within 3 weeks (21 days)
    const amcs = await prisma.amcContract.findMany({
      where: { status: 'active' }
    });

    const expiringAmcs = amcs.filter(c => {
      if (!c.end_date) return false;
      const endDate = new Date(c.end_date);
      return endDate >= now && endDate <= threeWeeksFromNow;
    });

    // 3. Fetch unpaid/overdue Utility payments due within 4 days
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

    // 4. Fetch unpaid/overdue Tax payments due within 1 month (30 days)
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

    // 5. Fetch low stock items (<= 5)
    let lowStockItems = [];
    try {
      lowStockItems = await prisma.inventoryItem.findMany({
        where: { currentStock: { lte: 5 } }
      });
    } catch (e) {
      console.error('[Reminders Service] Error fetching inventory items:', e);
    }

    if (expiringAmcs.length === 0 && dueUtilities.length === 0 && dueTaxes.length === 0 && readyReminders.length === 0 && lowStockItems.length === 0) {
      console.log('[Reminders Service] No upcoming deadlines or low stock alerts found today.');
      return { amcCount: 0, utilityCount: 0, taxCount: 0, customCount: readyReminders.length, lowStockCount: 0 };
    }

    console.log(`[Reminders Service] Alerts found: AMCs(${expiringAmcs.length}), Utilities(${dueUtilities.length}), Taxes(${dueTaxes.length}), LowStock(${lowStockItems.length}), Custom(${readyReminders.length}). Sending mail.`);

    let html = `<div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #172025; margin-top: 0;">📋 Admin Portal Deadline & Low Stock Summary</h2>
      <p style="color: #4b5563;">Automated daily alert for upcoming renewals, due payments, and inventory status:</p>`;

    if (lowStockItems.length > 0) {
      html += `<div style="margin-top: 15px; padding: 12px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #b45309;">
        <h3 style="color: #b45309; margin: 0 0 8px 0;">⚠️ Low Stock Items (${lowStockItems.length}):</h3>
        <ul style="margin: 0; padding-left: 20px; color: #172025;">`;
      lowStockItems.forEach(i => {
        html += `<li><strong>${i.name}</strong> (${i.category}) — <span style="color: #dc2626; font-weight: bold;">Current Stock: ${i.currentStock}</span></li>`;
      });
      html += `</ul></div>`;
    }

    if (expiringAmcs.length > 0) {
      html += `<div style="margin-top: 15px; padding: 12px; background: #eff6ff; border-radius: 6px; border-left: 4px solid #2563eb;">
        <h3 style="color: #1e40af; margin: 0 0 8px 0;">🛠️ AMC Contracts Expiring (within 3 weeks) (${expiringAmcs.length}):</h3>
        <ul style="margin: 0; padding-left: 20px; color: #172025;">`;
      expiringAmcs.forEach(a => {
        html += `<li><strong>${a.equipment_name}</strong> (${a.vendor_name}) — End Date: <strong>${a.end_date}</strong></li>`;
      });
      html += `</ul></div>`;
    }

    if (dueUtilities.length > 0) {
      html += `<div style="margin-top: 15px; padding: 12px; background: #fef2f2; border-radius: 6px; border-left: 4px solid #dc2626;">
        <h3 style="color: #991b1b; margin: 0 0 8px 0;">⚡ Utility Payments Due (within 4 days) (${dueUtilities.length}):</h3>
        <ul style="margin: 0; padding-left: 20px; color: #172025;">`;
      dueUtilities.forEach(u => {
        html += `<li><strong>${u.utility_type}</strong> (${u.provider_name}) — Amount: ₹${u.amount} — Due Date: <strong>${u.due_date}</strong></li>`;
      });
      html += `</ul></div>`;
    }

    if (dueTaxes.length > 0) {
      html += `<div style="margin-top: 15px; padding: 12px; background: #fdf4ff; border-radius: 6px; border-left: 4px solid #a855f7;">
        <h3 style="color: #6b21a8; margin: 0 0 8px 0;">🏛️ Tax Payments Due (within 1 month) (${dueTaxes.length}):</h3>
        <ul style="margin: 0; padding-left: 20px; color: #172025;">`;
      dueTaxes.forEach(t => {
        html += `<li><strong>${t.tax_type}</strong> (${t.authority_name}) — Amount: ₹${t.amount} — Due Date: <strong>${t.due_date}</strong></li>`;
      });
      html += `</ul></div>`;
    }

    html += `</div>`;

    const summaryCount = expiringAmcs.length + dueUtilities.length + dueTaxes.length + lowStockItems.length;
    await sendEmail({
      to: adminEmail,
      cc: NOTIFICATION_CC,
      subject: `🚨 Admin Portal Alert: ${summaryCount} Action Items (${lowStockItems.length} Low Stock, ${expiringAmcs.length} AMCs, ${dueUtilities.length} Utilities, ${dueTaxes.length} Taxes)`,
      htmlBody: html,
    });

    return { amcCount: expiringAmcs.length, utilityCount: dueUtilities.length, taxCount: dueTaxes.length, customCount: readyReminders.length, lowStockCount: lowStockItems.length };
  } catch (err) {
    console.error('[Reminders Service] Error running checkAndSendReminders:', err);
    throw err;
  }
};
