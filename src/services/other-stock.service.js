const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

// Seed legacy other_stock.json if table is empty
async function ensureLegacyOtherStockMigrated() {
  try {
    const count = await prisma.otherStock.count();
    if (count > 0) return;

    const legacyFile = path.join(__dirname, '../../legacy-booking/other_stock.json');
    if (!fs.existsSync(legacyFile)) return;

    const raw = fs.readFileSync(legacyFile, 'utf8');
    const legacyStock = JSON.parse(raw);

    if (!Array.isArray(legacyStock) || legacyStock.length === 0) return;

    console.log(`[Other Stock Migration] Migrating ${legacyStock.length} legacy stock items to SQLite...`);

    for (const os of legacyStock) {
      await prisma.otherStock.create({
        data: {
          id: os.id || undefined,
          stockName: os.stockName || 'Stock Item',
          availableQty: parseInt(os.availableQty) || 0,
          usedQty: parseInt(os.usedQty) || 0,
          subtitlesJson: Array.isArray(os.subtitles) ? JSON.stringify(os.subtitles) : '[]',
          location: os.location || 'HO',
          remarks: os.remarks || '',
          usageHistoryJson: Array.isArray(os.usageHistory) ? JSON.stringify(os.usageHistory) : '[]',
          createdAt: os.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    }
    console.log('[Other Stock Migration] Legacy stock items migrated successfully!');
  } catch (err) {
    console.error('[Other Stock Migration] Migration error:', err);
  }
}

// Call on startup
ensureLegacyOtherStockMigrated().catch(console.error);

exports.getAllOtherStock = async () => {
  await ensureLegacyOtherStockMigrated();
  const list = await prisma.otherStock.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return list.map(item => ({
    ...item,
    subtitles: item.subtitlesJson ? JSON.parse(item.subtitlesJson) : [],
    usageHistory: item.usageHistoryJson ? JSON.parse(item.usageHistoryJson) : []
  }));
};

exports.saveOtherStock = async (data) => {
  const { id, stockName, availableQty, subtitles, location, remarks } = data;
  
  const formattedSubtitles = (Array.isArray(subtitles) ? subtitles : []).map(st => ({
    id: st.id || 'sub-' + Date.now() + Math.random().toString(36).substr(2,4),
    title: (st.title || '').trim(),
    details: (st.details || '').trim(),
    qty: parseInt(st.qty) || 0,
    usedQty: parseInt(st.usedQty) || 0
  }));

  let calcQty = parseInt(availableQty) || 0;
  if (formattedSubtitles.length > 0) {
    const sumSubQty = formattedSubtitles.reduce((s, st) => s + (st.qty || 0), 0);
    if (sumSubQty > 0 || availableQty === undefined) {
      calcQty = sumSubQty;
    }
  }

  if (id) {
    const existing = await prisma.otherStock.findUnique({ where: { id } });
    if (existing) {
      const updated = await prisma.otherStock.update({
        where: { id },
        data: {
          stockName: stockName ? stockName.trim() : existing.stockName,
          availableQty: calcQty,
          subtitlesJson: JSON.stringify(formattedSubtitles),
          location: location !== undefined ? location.trim() : existing.location,
          remarks: remarks !== undefined ? remarks.trim() : existing.remarks,
          updatedAt: new Date().toISOString()
        }
      });
      return {
        ...updated,
        subtitles: formattedSubtitles,
        usageHistory: updated.usageHistoryJson ? JSON.parse(updated.usageHistoryJson) : []
      };
    }
  }

  const created = await prisma.otherStock.create({
    data: {
      stockName: stockName ? stockName.trim() : 'Stock Item',
      availableQty: calcQty,
      usedQty: 0,
      subtitlesJson: JSON.stringify(formattedSubtitles),
      location: (location || 'HO').trim(),
      remarks: (remarks || '').trim(),
      usageHistoryJson: '[]',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });

  return {
    ...created,
    subtitles: formattedSubtitles,
    usageHistory: []
  };
};

exports.useOtherStock = async (data) => {
  const { stockId, subtitleId, qtyToUse, usedBy, remarks } = data;
  const count = parseInt(qtyToUse) || 1;

  const item = await prisma.otherStock.findUnique({ where: { id: stockId } });
  if (!item) return null;

  const subtitles = item.subtitlesJson ? JSON.parse(item.subtitlesJson) : [];
  const history = item.usageHistoryJson ? JSON.parse(item.usageHistoryJson) : [];

  let subTitleText = '';
  if (subtitleId) {
    const subIdx = subtitles.findIndex(s => s.id === subtitleId);
    if (subIdx !== -1) {
      subtitles[subIdx].qty = Math.max(0, (subtitles[subIdx].qty || 0) - count);
      subtitles[subIdx].usedQty = (subtitles[subIdx].usedQty || 0) + count;
      subTitleText = `${subtitles[subIdx].title}: ${subtitles[subIdx].details}`;
    }
  }

  const newAvailable = Math.max(0, item.availableQty - count);
  const newUsed = item.usedQty + count;

  history.unshift({
      id: 'usage-' + Date.now() + Math.random().toString(36).substr(2,4),
      subtitleId: subtitleId || null,
      date: new Date().toISOString(),
      usedBy: usedBy || 'Admin',
      qty: count,
      subtitleText: subTitleText,
      remarks: remarks || ''
    });

  const updated = await prisma.otherStock.update({
    where: { id: stockId },
    data: {
      availableQty: newAvailable,
      usedQty: newUsed,
      subtitlesJson: JSON.stringify(subtitles),
      usageHistoryJson: JSON.stringify(history),
      updatedAt: new Date().toISOString()
    }
  });

  return {
    ...updated,
    subtitles,
    usageHistory: history
  };
};

exports.deleteOtherStock = async (id) => {
  try {
    await prisma.otherStock.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
};

exports.updateUsage = async (stockId, usageId, newQty, newRemarks) => {
  const item = await prisma.otherStock.findUnique({ where: { id: stockId } });
  if (!item) throw new Error('Stock item not found');
  
  const history = item.usageHistoryJson ? JSON.parse(item.usageHistoryJson) : [];
  const usageIdx = history.findIndex(h => h.id === usageId || h.date === usageId);
  if (usageIdx === -1) throw new Error('Usage record not found');
  
  const oldQty = history[usageIdx].qty || 0;
  const diff = newQty - oldQty;
  
  history[usageIdx].qty = newQty;
  if (newRemarks !== undefined) history[usageIdx].remarks = newRemarks;
  
  let newAvailable = item.availableQty;
  let newUsed = item.usedQty;
  let subtitles = item.subtitlesJson ? JSON.parse(item.subtitlesJson) : [];
  
  if (diff !== 0) {
    newAvailable = Math.max(0, item.availableQty - diff);
    newUsed = Math.max(0, item.usedQty + diff);
    
    // Attempt to update subtitle qty
    const subId = history[usageIdx].subtitleId;
    if (subId) {
      const subIdx = subtitles.findIndex(s => s.id === subId);
      if (subIdx !== -1) {
        subtitles[subIdx].qty = Math.max(0, (subtitles[subIdx].qty || 0) - diff);
        subtitles[subIdx].usedQty = Math.max(0, (subtitles[subIdx].usedQty || 0) + diff);
      }
    } else {
      // Fallback to text matching for legacy records
      const subText = history[usageIdx].subtitleText;
      if (subText) {
         const subIdx = subtitles.findIndex(s => `${s.title}: ${s.details}` === subText);
         if (subIdx !== -1) {
            subtitles[subIdx].qty = Math.max(0, (subtitles[subIdx].qty || 0) - diff);
            subtitles[subIdx].usedQty = Math.max(0, (subtitles[subIdx].usedQty || 0) + diff);
         }
      }
    }
  }

  const updated = await prisma.otherStock.update({
    where: { id: stockId },
    data: {
      availableQty: newAvailable,
      usedQty: newUsed,
      subtitlesJson: JSON.stringify(subtitles),
      usageHistoryJson: JSON.stringify(history),
      updatedAt: new Date().toISOString()
    }
  });

  return {
    ...updated,
    subtitles,
    usageHistory: history
  };
};
