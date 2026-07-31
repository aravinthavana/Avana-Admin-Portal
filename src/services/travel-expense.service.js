const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

// Seed legacy travel_expenses.json if table is empty
async function ensureLegacyTravelMigrated() {
  try {
    const count = await prisma.travelExpense.count();
    if (count > 0) return;

    const legacyFile = path.join(__dirname, '../../legacy-booking/travel_expenses.json');
    if (!fs.existsSync(legacyFile)) return;

    const raw = fs.readFileSync(legacyFile, 'utf8');
    const legacyTravel = JSON.parse(raw);

    if (!Array.isArray(legacyTravel) || legacyTravel.length === 0) return;

    console.log(`[Travel Migration] Migrating ${legacyTravel.length} legacy travel expense records to SQLite...`);

    for (const t of legacyTravel) {
      await prisma.travelExpense.create({
        data: {
          id: t.id || undefined,
          date: t.date || new Date().toISOString().slice(0,10),
          employeeName: t.employeeName || 'Admin',
          vehicleNo: t.vehicleNo || 'TN-01-AB-1234',
          fromLoc: t.fromLoc || 'HO',
          toLoc: t.toLoc || 'Site Visit',
          mode: t.mode || 'Bike',
          totalKm: parseFloat(t.totalKm) || 0,
          fuelLiters: parseFloat(t.fuelLiters) || null,
          fuelCost: parseFloat(t.fuelCost) || null,
          tollParking: parseFloat(t.tollParking) || null,
          totalExpense: parseFloat(t.totalExpense || t.fuelCost) || 0,
          remarks: t.remarks || '',
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    }
    console.log('[Travel Migration] Legacy travel expense records migrated successfully!');
  } catch (err) {
    console.error('[Travel Migration] Migration error:', err);
  }
}

// Call on startup
ensureLegacyTravelMigrated().catch(console.error);

exports.getAllTravelExpenses = async (month) => {
  await ensureLegacyTravelMigrated();
  const where = {};
  if (month) {
    where.date = { startsWith: month };
  }
  return prisma.travelExpense.findMany({
    where,
    orderBy: { date: 'desc' }
  });
};

exports.createTravelExpense = async (data) => {
  const { date, employeeName, vehicleNo, fromLoc, toLoc, mode, totalKm, fuelLiters, fuelCost, tollParking, totalExpense, remarks } = data;
  const km = parseFloat(totalKm) || 0;
  const fCost = parseFloat(fuelCost) || 0;
  const tpCost = parseFloat(tollParking) || 0;
  const tot = parseFloat(totalExpense) || (fCost + tpCost);

  return prisma.travelExpense.create({
    data: {
      date: date || new Date().toISOString().slice(0,10),
      employeeName: employeeName || 'Admin',
      vehicleNo: vehicleNo || '',
      fromLoc: fromLoc || 'HO',
      toLoc: toLoc || '',
      mode: mode || 'Bike',
      totalKm: km,
      fuelLiters: parseFloat(fuelLiters) || null,
      fuelCost: fCost || null,
      tollParking: tpCost || null,
      totalExpense: tot,
      remarks: remarks || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
};

exports.updateTravelExpense = async (id, data) => {
  const { date, employeeName, vehicleNo, fromLoc, toLoc, mode, totalKm, fuelLiters, fuelCost, tollParking, totalExpense, remarks } = data;
  
  return prisma.travelExpense.update({
    where: { id },
    data: {
      date: date || undefined,
      employeeName: employeeName || undefined,
      vehicleNo: vehicleNo !== undefined ? vehicleNo : undefined,
      fromLoc: fromLoc || undefined,
      toLoc: toLoc || undefined,
      mode: mode || undefined,
      totalKm: totalKm !== undefined ? parseFloat(totalKm) : undefined,
      fuelLiters: fuelLiters !== undefined ? parseFloat(fuelLiters) : undefined,
      fuelCost: fuelCost !== undefined ? parseFloat(fuelCost) : undefined,
      tollParking: tollParking !== undefined ? parseFloat(tollParking) : undefined,
      totalExpense: totalExpense !== undefined ? parseFloat(totalExpense) : undefined,
      remarks: remarks !== undefined ? remarks : undefined,
      updatedAt: new Date().toISOString()
    }
  });
};

exports.deleteTravelExpense = async (id) => {
  try {
    await prisma.travelExpense.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
};
