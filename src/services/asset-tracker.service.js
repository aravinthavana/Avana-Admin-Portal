const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');
const { sendEmail } = require('../utils/notifications');

// Seed legacy asset_tracker.json if table is empty
async function ensureLegacyAssetsMigrated() {
  try {
    const count = await prisma.assetHandover.count();
    if (count > 0) return;

    const legacyFile = path.join(__dirname, '../../legacy-booking/asset_tracker.json');
    if (!fs.existsSync(legacyFile)) return;

    const raw = fs.readFileSync(legacyFile, 'utf8');
    const legacyAssets = JSON.parse(raw);

    if (!Array.isArray(legacyAssets) || legacyAssets.length === 0) return;

    console.log(`[Asset Tracker Migration] Migrating ${legacyAssets.length} legacy asset handovers to SQLite...`);

    for (const item of legacyAssets) {
      const ackDate = item.acknowledgementDetails?.acknowledgedAt || null;
      const remarks = item.acknowledgementDetails?.remarks || item.remarks || null;

      await prisma.assetHandover.create({
        data: {
          id: item.id || undefined,
          name: item.name || 'Employee',
          email: item.email || '',
          department: item.department || '',
          handoverDate: item.handoverDate || new Date().toISOString().slice(0,10),
          handoverBy: item.handoverBy || 'Admin',
          status: item.status || 'Pending Acknowledgement',
          acknowledgedAt: ackDate,
          signature: ackDate ? (item.name || 'Signed') : null,
          remarks: remarks,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: {
            create: (item.assets || []).map(a => ({
              itemName: a.particular || a.name || a.item || 'Asset Item',
              serialNo: a.qty ? `Qty: ${a.qty}` : null,
              condition: a.condition || 'Good',
              status: item.status === 'Resigned/Returned' ? 'Returned' : 'Assigned'
            }))
          }
        }
      });
    }
    console.log('[Asset Tracker Migration] Legacy asset handovers migrated successfully!');
  } catch (err) {
    console.error('[Asset Tracker Migration] Migration error:', err);
  }
}

// Call on startup
ensureLegacyAssetsMigrated().catch(console.error);

exports.getAllHandovers = async () => {
  await ensureLegacyAssetsMigrated();
  return prisma.assetHandover.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' }
  });
};

exports.getHandoverById = async (id) => {
  await ensureLegacyAssetsMigrated();
  return prisma.assetHandover.findUnique({
    where: { id },
    include: { items: true }
  });
};

exports.createHandover = async (data, host) => {
  const { name, email, department, handoverDate, handoverBy, remarks, sendEmail: shouldSendEmail, items } = data;
  
  const created = await prisma.assetHandover.create({
    data: {
      name,
      email,
      department: department || '',
      handoverDate: handoverDate || new Date().toISOString().slice(0,10),
      handoverBy: handoverBy || 'Admin',
      status: 'Pending Acknowledgement',
      remarks: remarks || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: {
        create: (items || []).map(it => ({
          itemName: it.itemName || it.name || 'Asset Item',
          serialNo: it.serialNo || '',
          condition: it.condition || 'Good',
          remarks: it.remarks || ''
        }))
      }
    },
    include: { items: true }
  });

  if (shouldSendEmail !== false && email) {
    exports.sendHandoverEmailNotification(created, host).catch(console.error);
  }

  return created;
};

exports.appendAssets = async (id, newItems, sendEmailAlert, host) => {
  const handover = await prisma.assetHandover.findUnique({ where: { id } });
  if (!handover) return null;

  for (const it of newItems) {
    await prisma.assetHandoverItem.create({
      data: {
        handoverId: id,
        itemName: it.itemName || it.name || 'Asset Item',
        serialNo: it.serialNo || '',
        condition: it.condition || 'Good',
        remarks: it.remarks || ''
      }
    });
  }

  const updated = await prisma.assetHandover.findUnique({
    where: { id },
    include: { items: true }
  });

  if (sendEmailAlert && handover.email) {
    exports.sendHandoverEmailNotification(updated, host, true).catch(console.error);
  }

  return updated;
};

exports.acknowledgeAssets = async (id, signatureName, remarks) => {
  const handover = await prisma.assetHandover.findUnique({ where: { id }, include: { items: true } });
  if (!handover) return null;

  const updated = await prisma.assetHandover.update({
    where: { id },
    data: {
      status: 'Acknowledged',
      acknowledgedAt: new Date().toISOString(),
      signature: signatureName || handover.name,
      remarks: remarks ? (handover.remarks ? `${handover.remarks} | Ack: ${remarks}` : remarks) : handover.remarks,
      updatedAt: new Date().toISOString()
    },
    include: { items: true }
  });

  return updated;
};

exports.processReturn = async (id, returnedItems, remarks) => {
  const handover = await prisma.assetHandover.findUnique({ where: { id: String(id) }, include: { items: true } });
  if (!handover) return null;

  if (Array.isArray(returnedItems) && returnedItems.length > 0) {
    for (const item of returnedItems) {
      if (typeof item === "string") {
        // Fallback for old API callers passing array of IDs
        await prisma.assetHandoverItem.update({
          where: { id: String(item) },
          data: { status: "Returned", returnedAt: new Date().toISOString() }
        });
      } else {
        const itemTargetId = String(item.itemId || item.id);
        const itemStatus = item.status === "Missing" || item.condition === "Missing" ? "Missing" : (item.status || "Returned");
        const itemCondition = item.condition || (itemStatus === "Missing" ? "Missing" : "Reusable");
        await prisma.assetHandoverItem.update({
          where: { id: itemTargetId },
          data: {
            status: itemStatus,
            condition: itemCondition,
            returnedAt: itemStatus === "Missing" ? null : new Date().toISOString()
          }
        });
      }
    }
  } else {
    // Mark all as returned
    await prisma.assetHandoverItem.updateMany({
      where: { handoverId: String(id) },
      data: { status: "Returned", returnedAt: new Date().toISOString() }
    });
  }

  // Determine overall handover status based on remaining items
  const allItems = await prisma.assetHandoverItem.findMany({ where: { handoverId: String(id) } });
  const hasRemainingAssigned = allItems.some(it => it.status === "Assigned");
  const newHandoverStatus = hasRemainingAssigned ? handover.status : "Resigned/Returned";

  const updated = await prisma.assetHandover.update({
    where: { id: String(id) },
    data: {
      status: newHandoverStatus,
      remarks: remarks ? (handover.remarks ? `${handover.remarks} | Return: ${remarks}` : remarks) : handover.remarks,
      updatedAt: new Date().toISOString()
    },
    include: { items: true }
  });

  return updated;
};

exports.deleteHandover = async (id) => {
  try {
    await prisma.assetHandover.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
};

exports.sendHandoverEmailNotification = async (handover, host, isAppended = false) => {
  if (!handover || !handover.email) return;

  const baseUrl = host || process.env.APP_URL || 'http://172.30.10.21:8086';
  const ackLink = `${baseUrl}/asset-acknowledgement?id=${handover.id}`;
  const { templates } = require('../utils/email-templates');
  const subject = isAppended
    ? '[ACTION REQUIRED] Additional Office Stationery Assigned - ' + (handover.employeeName || handover.name)
    : '[ACTION REQUIRED] Office Stationery Handover Acknowledgement - ' + (handover.employeeName || handover.name);

  const htmlBody = templates.assetHandoverNotification({
    handover,
    items: handover.items,
    ackLink,
    isAppended
  });

  await sendEmail({ to: handover.email, subject, htmlBody });
};
