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

/**
 * Checks for AMC contracts expiring in 30 days, unpaid bills, and due custom reminders
 */
exports.checkAndSendReminders = async () => {
  try {
    console.log('[Reminders Service] Running daily deadline checks...');
    const adminEmail = process.env.ADMIN_EMAIL || 'Karthicksankar@avanamedical.com';
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

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

    // 2. Fetch active AMC contracts
    const amcs = await prisma.amcContract.findMany({
      where: { status: 'active' }
    });

    const expiringAmcs = amcs.filter(c => {
      if (!c.end_date) return false;
      const endDate = new Date(c.end_date);
      return endDate >= now && endDate <= thirtyDaysFromNow;
    });

    // 3. Fetch unpaid/overdue Utility payments due in 3 days
    const utilities = await prisma.utilityPayment.findMany({
      where: {
        status: { in: ['Unpaid', 'unpaid', 'Overdue', 'overdue'] }
      }
    });

    const dueUtilities = utilities.filter(p => {
      if (!p.due_date) return false;
      const dueDate = new Date(p.due_date);
      return dueDate >= now && dueDate <= threeDaysFromNow;
    });

    // 4. Fetch unpaid/overdue Tax payments due in 3 days
    const taxes = await prisma.taxPayment.findMany({
      where: {
        status: { in: ['Unpaid', 'unpaid', 'Overdue', 'overdue'] }
      }
    });

    const dueTaxes = taxes.filter(p => {
      if (!p.due_date) return false;
      const dueDate = new Date(p.due_date);
      return dueDate >= now && dueDate <= threeDaysFromNow;
    });

    if (expiringAmcs.length === 0 && dueUtilities.length === 0 && dueTaxes.length === 0 && readyReminders.length === 0) {
      console.log('[Reminders Service] No upcoming deadlines found today.');
      return { amcCount: 0, utilityCount: 0, taxCount: 0, customCount: readyReminders.length };
    }

    console.log(`[Reminders Service] Alerts found: AMCs(${expiringAmcs.length}), Utilities(${dueUtilities.length}), Taxes(${dueTaxes.length}), Custom(${readyReminders.length}). Sending mail.`);

    let html = `<h2>Help Desk Expiry & Due Date Summary</h2>`;

    if (expiringAmcs.length > 0) {
      html += `<h3>AMC Contracts Expiring Soon (${expiringAmcs.length}):</h3><ul>`;
      expiringAmcs.forEach(a => {
        html += `<li><strong>${a.equipment_name}</strong> (${a.vendor_name}) - End Date: ${a.end_date}</li>`;
      });
      html += `</ul>`;
    }

    if (dueUtilities.length > 0) {
      html += `<h3>Utility Payments Due (${dueUtilities.length}):</h3><ul>`;
      dueUtilities.forEach(u => {
        html += `<li><strong>${u.utility_type}</strong> (${u.provider_name}) - Amount: ₹${u.amount} - Due: ${u.due_date}</li>`;
      });
      html += `</ul>`;
    }

    if (dueTaxes.length > 0) {
      html += `<h3>Tax Payments Due (${dueTaxes.length}):</h3><ul>`;
      dueTaxes.forEach(t => {
        html += `<li><strong>${t.tax_type}</strong> (${t.authority_name}) - Amount: ₹${t.amount} - Due: ${t.due_date}</li>`;
      });
      html += `</ul>`;
    }

    await sendEmail({
      to: adminEmail,
      subject: `🚨 Portal Deadline Alert: ${expiringAmcs.length} AMCs, ${dueUtilities.length} Utilities, ${dueTaxes.length} Taxes`,
      htmlBody: html,
    });

    return { amcCount: expiringAmcs.length, utilityCount: dueUtilities.length, taxCount: dueTaxes.length, customCount: readyReminders.length };
  } catch (err) {
    console.error('[Reminders Service] Error running checkAndSendReminders:', err);
    throw err;
  }
};
