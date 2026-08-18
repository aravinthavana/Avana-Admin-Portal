const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

// Seed legacy cash_handling.json if table is empty
async function ensureLegacyCashMigrated() {
  try {
    const count = await prisma.pettyCash.count();
    if (count > 0) return;

    const legacyFile = path.join(__dirname, '../../legacy-booking/cash_handling.json');
    if (!fs.existsSync(legacyFile)) return;

    const raw = fs.readFileSync(legacyFile, 'utf8');
    const legacyCash = JSON.parse(raw);

    if (!Array.isArray(legacyCash) || legacyCash.length === 0) return;

    console.log(`[Petty Cash Migration] Migrating ${legacyCash.length} legacy petty cash records to SQLite...`);

    for (const c of legacyCash) {
      await prisma.pettyCash.create({
        data: {
          id: c.id || undefined,
          date: c.date || new Date().toISOString().slice(0,10),
          reason: c.reason || 'General Expense',
          company: c.company || 'AMD',
          expenseName: c.expenseName || 'Miscellaneous',
          collectedFrom: c.collectedFrom || '',
          amount: parseFloat(c.amount) || 0,
          remarks: c.remarks || '',
          cleared: c.cleared || false,
          clearedDate: c.clearedDate || null,
          createdAt: c.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    }
    console.log('[Petty Cash Migration] Legacy petty cash records migrated successfully!');
  } catch (err) {
    console.error('[Petty Cash Migration] Migration error:', err);
  }
}

// Call on startup
ensureLegacyCashMigrated().catch(console.error);

exports.getAllPettyCash = async (month) => {
  await ensureLegacyCashMigrated();
  const where = {};
  if (month) {
    where.date = { startsWith: month };
  }
  return prisma.pettyCash.findMany({
    where,
    orderBy: { date: 'desc' }
  });
};

exports.createPettyCash = async (data) => {
  const { date, reason, company, expenseName, collectedFrom, amount, remarks } = data;
  return prisma.pettyCash.create({
    data: {
      date: date || new Date().toISOString().slice(0,10),
      reason: reason || 'Petty Cash Expense',
      company: company || 'AMD',
      expenseName: expenseName || 'Miscellaneous',
      collectedFrom: collectedFrom || '',
      amount: parseFloat(amount) || 0,
      remarks: remarks || '',
      cleared: false,
      clearedDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
};

exports.updatePettyCash = async (id, data) => {
  const { cleared, clearedDate, clearAmount, amount, remarks, company, expenseName, reason } = data;
  
  const existing = await prisma.pettyCash.findUnique({ where: { id } });
  if (!existing) return null;

  // Handle partial clear logic matching legacy code
  if (clearAmount !== undefined) {
    const clearAmt = parseFloat(clearAmount);
    const origAmt = existing.amount;

    if (clearAmt > 0 && clearAmt < origAmt) {
      // Partial clear: reduce existing entry amount and create new cleared entry
      await prisma.pettyCash.update({
        where: { id },
        data: { amount: origAmt - clearAmt, updatedAt: new Date().toISOString() }
      });

      return prisma.pettyCash.create({
        data: {
          date: existing.date,
          reason: existing.reason,
          company: existing.company,
          expenseName: existing.expenseName,
          collectedFrom: existing.collectedFrom,
          amount: clearAmt,
          remarks: remarks ? `${existing.remarks} (Cleared: ${remarks})` : existing.remarks,
          cleared: true,
          clearedDate: clearedDate || new Date().toISOString().slice(0,10),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    }
  }

  return prisma.pettyCash.update({
    where: { id },
    data: {
      cleared: cleared !== undefined ? Boolean(cleared) : undefined,
      clearedDate: clearedDate !== undefined ? clearedDate : undefined,
      amount: amount !== undefined ? parseFloat(amount) : undefined,
      company: company || undefined,
      expenseName: expenseName || undefined,
      reason: reason || undefined,
      remarks: remarks !== undefined ? remarks : undefined,
      updatedAt: new Date().toISOString()
    }
  });
};

exports.deletePettyCash = async (id) => {
  try {
    await prisma.pettyCash.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
};
