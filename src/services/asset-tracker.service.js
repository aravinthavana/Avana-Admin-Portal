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
  const handover = await prisma.assetHandover.findUnique({ where: { id }, include: { items: true } });
  if (!handover) return null;

  if (Array.isArray(returnedItems) && returnedItems.length > 0) {
    for (const item of returnedItems) {
      if (typeof item === 'string') {
        // Fallback for old API callers passing array of IDs
        await prisma.assetHandoverItem.update({
          where: { id: item },
          data: { status: 'Returned', returnedAt: new Date().toISOString() }
        });
      } else {
        await prisma.assetHandoverItem.update({
          where: { id: item.itemId },
          data: { status: 'Returned', condition: item.condition || 'Reusable', returnedAt: new Date().toISOString() }
        });
      }
    }
  } else {
    // Mark all as returned
    await prisma.assetHandoverItem.updateMany({
      where: { handoverId: id },
      data: { status: 'Returned', returnedAt: new Date().toISOString() }
    });
  }

  const updated = await prisma.assetHandover.update({
    where: { id },
    data: {
      status: 'Resigned/Returned',
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
  const ackLink = `${host}/asset-acknowledgement?id=${handover.id}`;
  const subject = isAppended
    ? `ACTION REQUIRED: Additional Office Assets Assigned - ${handover.name}`
    : `ACTION REQUIRED: Office Asset Handover Acknowledgement - ${handover.name}`;

  let itemsHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #f3f4f6; text-align: left;">
          <th style="padding: 10px; border: 1px solid #e5e7eb;">#</th>
          <th style="padding: 10px; border: 1px solid #e5e7eb;">Asset Name</th>
          <th style="padding: 10px; border: 1px solid #e5e7eb;">Serial / Specs</th>
          <th style="padding: 10px; border: 1px solid #e5e7eb;">Condition</th>
        </tr>
      </thead>
      <tbody>
  `;

  handover.items.forEach((it, idx) => {
    itemsHtml += `
      <tr>
        <td style="padding: 10px; border: 1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">${it.itemName}</td>
        <td style="padding: 10px; border: 1px solid #e5e7eb;">${it.serialNo || 'N/A'}</td>
        <td style="padding: 10px; border: 1px solid #e5e7eb;">${it.condition || 'Good'}</td>
      </tr>
    `;
  });

  itemsHtml += `</tbody></table>`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-top: 0;">
        Avana Office Asset Handover
      </h2>
      <p>Dear <strong>${handover.name}</strong>,</p>
      <p>${isAppended ? 'Additional company assets have been issued to you.' : 'The company assets listed below have been assigned to you by the Admin team.'}</p>
      
      ${itemsHtml}

      <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 6px;">
        <strong style="color: #1e40af; display: block; margin-bottom: 5px;">Acknowledgement Required:</strong>
        <span style="color: #1e3a8a;">Please review the items listed above and complete your digital acknowledgement link below to confirm receipt.</span>
      </div>

      <p style="text-align: center; margin-top: 25px; margin-bottom: 25px;">
        <a href="${ackLink}" style="display: inline-block; padding: 14px 28px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
          ✍️ Complete Digital Acknowledgement
        </a>
      </p>

      <p style="color: #6b7280; font-size: 0.85rem; border-top: 1px solid #e5e7eb; padding-top: 15px;">
        If you have any questions or notice a discrepancy in the serial numbers, please reach out to the Admin team.
      </p>
    </div>
  `;

  await sendEmail({ to: handover.email, subject, htmlBody });
};
