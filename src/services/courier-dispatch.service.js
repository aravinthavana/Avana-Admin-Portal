const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');
const { sendEmail } = require('../utils/notifications');
const { templates } = require('../utils/email-templates');
const pdfGenerator = require('../utils/courier_pdf_generator');

// Seed legacy courier_dispatches.json if table is empty
async function ensureLegacyDispatchesMigrated() {
  try {
    const count = await prisma.courierDispatch.count();
    if (count > 0) return;

    const legacyFile = path.join(__dirname, '../../legacy-booking/courier_dispatches.json');
    if (!fs.existsSync(legacyFile)) return;

    const raw = fs.readFileSync(legacyFile, 'utf8');
    const legacyDispatches = JSON.parse(raw);

    if (!Array.isArray(legacyDispatches) || legacyDispatches.length === 0) return;

    console.log(`[Courier Migration] Migrating ${legacyDispatches.length} legacy courier dispatches to SQLite...`);

    for (const d of legacyDispatches) {
      await prisma.courierDispatch.create({
        data: {
          id: d.id || undefined,
          dcNo: d.dcNo || '001',
          dcDate: d.dcDate || new Date().toISOString().slice(0,10),
          remarksType: d.remarksType || 'Service',
          remarksOther: d.remarksOther || '',
          transporterName: d.transporterName || '',
          transporterAmount: parseFloat(d.transporterAmount) || null,
          docketNo: d.docketNo || d.trackingNumber || '',
          noOfBoxes: parseInt(d.noOfBoxes, 10) || 1,
          courierBilling: d.courierBilling || 'Avana Medical Devices Pvt Ltd',
          fromAddressText: d.fromAddressText || '',
          senderName: d.senderName || 'Admin',
          senderPhone: d.senderPhone || '',
          toAddress: d.toAddress || '',
          receiverName: d.receiverName || '',
          receiverPhone: d.receiverPhone || '',
          totalAmount: parseFloat(d.totalAmount) || 0,
          dimensions: d.dimensions || '',
          weight: d.weight || '',
          status: d.status || 'approved',
          requesterEmail: d.requesterEmail || '',
          submittedAt: d.submittedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: {
            create: (d.items || []).map(it => ({
              itemCode: it.itemCode || '',
              description: it.description || it.particular || 'Item',
              serialNo: it.serialNo || '',
              qty: parseInt(it.qty, 10) || 1,
              rate: parseFloat(it.rate) || 0,
              value: parseFloat(it.value) || 0
            }))
          }
        }
      });
    }
    console.log('[Courier Migration] Legacy courier dispatches migrated successfully!');
  } catch (err) {
    console.error('[Courier Migration] Migration error:', err);
  }
}

// Call on startup
ensureLegacyDispatchesMigrated().catch(console.error);

async function getNextDcNumber() {
  await ensureLegacyDispatchesMigrated();
  const latest = await prisma.courierDispatch.findFirst({
    orderBy: { submittedAt: 'desc' }
  });
  if (!latest || !latest.dcNo) return '001';
  const match = latest.dcNo.match(/\d+/);
  if (!match) return '001';
  const num = parseInt(match[0], 10) + 1;
  return num.toString().padStart(3, '0');
}
exports.getNextDcNumber = getNextDcNumber;
exports.getAllDispatches = async () => {
  await ensureLegacyDispatchesMigrated();
  return prisma.courierDispatch.findMany({
    include: { items: true },
    orderBy: { submittedAt: 'desc' }
  });
};

exports.getDispatchById = async (id) => {
  await ensureLegacyDispatchesMigrated();
  return prisma.courierDispatch.findUnique({
    where: { id },
    include: { items: true }
  });
};

exports.createDispatch = async (data, requesterEmail, host) => {
  const nextDcNo = data.dcNo || await getNextDcNumber();
  
  let totalAmount = 0;
  const itemsData = (data.items || []).map(it => {
    const qty = parseInt(it.qty, 10) || 1;
    const rate = parseFloat(it.rate) || 0;
    const val = parseFloat(it.value) || (qty * rate);
    totalAmount += val;
    return {
      itemCode: it.itemCode || '',
      description: it.description || it.name || 'Dispatched Item',
      serialNo: it.serialNo || '',
      qty,
      rate,
      value: val
    };
  });

  const created = await prisma.courierDispatch.create({
    data: {
      dcNo: nextDcNo,
      dcDate: data.dcDate || new Date().toISOString().slice(0,10),
      remarksType: data.remarksType || 'Service',
      remarksOther: data.remarksOther || '',
      transporterName: data.transporterName || '',
      transporterAmount: data.transporterAmount ? parseFloat(data.transporterAmount) : null,
      docketNo: data.docketNo || '',
      noOfBoxes: parseInt(data.noOfBoxes, 10) || 1,
      courierBilling: data.courierBilling || 'Avana Medical Devices Pvt Ltd',
      signatoryCompany: data.signatoryCompany || 'Avana Medical Devices Pvt. Ltd.',
      fromAddressText: data.fromAddressText || 'Avana Medical Devices Pvt Ltd.,\nNo.91, Sundar Nagar 4th Avenue, Nandambakkam,\nChennai – 600032, Tamil Nadu, India.',
      senderName: data.senderName || 'Admin',
      senderPhone: data.senderPhone || '',
      toAddress: data.toAddress || '',
      receiverName: data.receiverName || '',
      receiverPhone: data.receiverPhone || '',
      totalAmount,
      dimensions: data.boxes ? JSON.stringify(data.boxes) : (data.dimensions || ''),
      weight: data.weight || '',
      status: 'approved',
      requesterEmail: requesterEmail || data.requesterEmail || '',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: {
        create: itemsData
      }
    },
    include: { items: true }
  });

  created.declaration = data.declaration || false;
  created.isFragile = data.isFragile || false;

  // Send Emails
  try {
    let dcPath = '';
    let labelPath = '';

    try {
      const dcBytes = await pdfGenerator.generateDCCopyPDF(created);
      const labelBytes = await pdfGenerator.generateAddressLabelPDF(created);
      
      dcPath = path.join(__dirname, `../temp_dc_${created.id}.pdf`);
      labelPath = path.join(__dirname, `../temp_label_${created.id}.pdf`);
      
      fs.writeFileSync(dcPath, Buffer.from(dcBytes));
      fs.writeFileSync(labelPath, Buffer.from(labelBytes));

      const attachments = [
        { filename: `DC_Copy_${created.dcNo}.pdf`, path: dcPath },
        { filename: `Address_Label_${created.dcNo}.pdf`, path: labelPath }
      ];

      if (requesterEmail) {
        await sendEmail({
          to: requesterEmail,
          subject: `Delivery Challan #${created.dcNo} Generated`,
          htmlBody: templates.courierDispatchSubmission(created),
          attachments
        });
      }
      // Admin Alert
      await sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@avanamedical.com',
        subject: `New Courier Dispatch (#${created.dcNo})`,
        htmlBody: templates.courierDispatchAdminAlert(created, host),
        attachments
      });

    } catch (pdfErr) {
      console.error('Failed to generate or send Courier PDFs:', pdfErr);
    } finally {
      setTimeout(() => {
        try { if (dcPath && fs.existsSync(dcPath)) fs.unlinkSync(dcPath); } catch (e) {}
        try { if (labelPath && fs.existsSync(labelPath)) fs.unlinkSync(labelPath); } catch (e) {}
      }, 5000);
    }
  } catch (err) {
    console.error('Failed to send Courier Dispatch emails:', err);
  }

  return created;
};

exports.updateTrackingInfo = async (id, data) => {
  const { transporterName, docketNo, transporterAmount, status, remarksOther } = data;
  const dispatch = await prisma.courierDispatch.findUnique({ where: { id } });
  if (!dispatch) throw new Error('Dispatch not found');

  const newStatus = (transporterName && docketNo && status !== 'Delivered') ? 'Dispatched' : (status || dispatch.status);

  const updated = await prisma.courierDispatch.update({
    where: { id },
    data: {
      transporterName: transporterName !== undefined ? transporterName : undefined,
      docketNo: docketNo !== undefined ? docketNo : undefined,
      transporterAmount: transporterAmount !== undefined ? parseFloat(transporterAmount) : undefined,
      status: newStatus,
      remarksOther: remarksOther || undefined,
      updatedAt: new Date().toISOString()
    },
    include: { items: true }
  });

  if (transporterName && docketNo && dispatch.status !== 'Dispatched' && newStatus === 'Dispatched') {
    let trackingLink = '';
    const tn = transporterName.toLowerCase();
    if (tn.includes('bluedart')) trackingLink = `https://www.bluedart.com/web/guest/trackdart`;
    else if (tn.includes('delhivery')) trackingLink = `https://www.delhivery.com/tracking`;
    else if (tn.includes('dxpress')) trackingLink = `https://www.dxpress.in/tracking`;
    else trackingLink = `Track via ${transporterName} website`;

    const emailContent = `
      <h3>Courier Dispatch Tracking Details</h3>
      <p>Hello,</p>
      <p>Your courier request has been dispatched.</p>
      <p><strong>Courier Partner:</strong> ${transporterName}</p>
      <p><strong>Tracking / Docket No:</strong> ${docketNo}</p>
      <p><strong>Tracking Link:</strong> ${trackingLink}</p>
      <p><br>Thanks,<br>Avana Admin</p>
    `;
    try {
      await sendEmail(dispatch.requesterEmail, 'Courier Dispatched - Tracking Details', emailContent);
    } catch (e) {
      console.error('Failed to send tracking email:', e);
    }
  }

  return updated;
};

exports.mergeParcel = async (parentDispatchId, requesterEmail, items, remarks) => {
  const parent = await prisma.courierDispatch.findUnique({ where: { id: parentDispatchId }, include: { items: true } });
  if (!parent) return null;

  let addedVal = 0;
  for (const it of items) {
    const qty = parseInt(it.qty, 10) || 1;
    const rate = parseFloat(it.rate) || 0;
    const val = parseFloat(it.value) || (qty * rate);
    addedVal += val;
    await prisma.courierDispatchItem.create({
      data: {
        dispatchId: parentDispatchId,
        itemCode: it.itemCode || 'MERGED',
        description: `[Merged for ${requesterEmail}] ${it.description || 'Item'}`,
        serialNo: it.serialNo || '',
        qty,
        rate,
        value: val
      }
    });
  }

  const updated = await prisma.courierDispatch.update({
    where: { id: parentDispatchId },
    data: {
      totalAmount: parent.totalAmount + addedVal,
      remarksOther: remarks ? (parent.remarksOther ? `${parent.remarksOther} | Merged: ${remarks}` : `Merged: ${remarks}`) : parent.remarksOther,
      updatedAt: new Date().toISOString()
    },
    include: { items: true }
  });

  return updated;
};

exports.deleteDispatch = async (id) => {
  try {
    await prisma.courierDispatch.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
};

exports.renderDeliveryChallanHtml = (dispatch) => {
  const itemsHtml = (dispatch.items || []).map((it, idx) => `
    <tr>
      <td style="border:1px solid #cbd5e1; padding:8px; text-align:center;">${it.itemCode || (idx + 1)}</td>
      <td style="border:1px solid #cbd5e1; padding:8px;">${it.description}</td>
      <td style="border:1px solid #cbd5e1; padding:8px;">${it.serialNo || '-'}</td>
      <td style="border:1px solid #cbd5e1; padding:8px; text-align:center;">${it.qty}</td>
      <td style="border:1px solid #cbd5e1; padding:8px; text-align:right;">₹${(it.rate || 0).toLocaleString()}</td>
      <td style="border:1px solid #cbd5e1; padding:8px; text-align:right; font-weight:600;">₹${(it.value || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Delivery Challan #${dispatch.dcNo}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1e293b; max-width: 800px; margin: auto; }
        .header { display: flex; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
        .title { font-size: 24px; font-weight: 800; color: #2563eb; text-transform: uppercase; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
        .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; font-size: 13px; line-height: 1.6; }
        .box-title { font-weight: 700; color: #475569; text-transform: uppercase; font-size: 11px; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
        .total-row { font-weight: 700; font-size: 14px; background: #eff6ff; }
        .footer { display: flex; justify-content: space-between; margin-top: 50px; font-size: 12px; text-align: center; }
        .sig-line { border-top: 1px dashed #94a3b8; width: 180px; margin-top: 40px; padding-top: 5px; font-weight: 600; }
        @media print { body { padding: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">🖨️ Print Delivery Challan</button>
      </div>

      <div class="header">
        <div>
          <div class="title">Delivery Challan</div>
          <div style="font-size: 14px; font-weight: 600; color: #475569;">DC No: #${dispatch.dcNo}</div>
        </div>
        <div style="text-align: right; font-size: 13px; color: #64748b;">
          <div><strong>Date:</strong> ${dispatch.dcDate}</div>
          <div><strong>Billing Entity:</strong> ${dispatch.courierBilling || 'Avana Group'}</div>
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <div class="box-title">Consignor (Dispatched From)</div>
          <strong>${dispatch.senderName || 'Avana Office'}</strong><br/>
          ${(dispatch.fromAddressText || '').replace(/\n/g, '<br/>')}<br/>
          Ph: ${dispatch.senderPhone || 'N/A'}
        </div>
        <div class="box">
          <div class="box-title">Consignee (Dispatched To)</div>
          <strong>${dispatch.receiverName || 'Recipient'}</strong><br/>
          ${(dispatch.toAddress || '').replace(/\n/g, '<br/>')}<br/>
          Ph: ${dispatch.receiverPhone || 'N/A'}
        </div>
      </div>

      <div class="box" style="margin-bottom: 20px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div><strong>Transporter:</strong> ${dispatch.transporterName || 'N/A'}</div>
        <div><strong>Docket / Waybill No:</strong> ${dispatch.docketNo || 'N/A'}</div>
        <div><strong>Boxes:</strong> ${dispatch.noOfBoxes || 1}</div>
        <div><strong>Category:</strong> ${dispatch.remarksType || 'Service'}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 80px; text-align:center;">Item Code</th>
            <th>Item Description</th>
            <th style="width: 100px;">Serial No</th>
            <th style="width: 60px; text-align:center;">Qty</th>
            <th style="width: 100px; text-align:right;">Rate (₹)</th>
            <th style="width: 110px; text-align:right;">Total Value (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          <tr class="total-row">
            <td colspan="5" style="border:1px solid #cbd5e1; padding:10px; text-align:right;">Total Declared Value:</td>
            <td style="border:1px solid #cbd5e1; padding:10px; text-align:right; color:#2563eb;">₹${(dispatch.totalAmount || 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      ${(() => {
        try {
          const parsed = JSON.parse(dispatch.dimensions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return `
              <h4 style="margin-bottom: 10px; font-size: 14px; color: #475569;">Box Details (Dimensions & Weight)</h4>
              <table>
                <thead>
                  <tr>
                    <th style="width: 60px; text-align:center;">Box No</th>
                    <th>Dimensions (optional)</th>
                    <th>Weight (optional)</th>
                  </tr>
                </thead>
                <tbody>
                  ${parsed.map(box => `
                    <tr>
                      <td style="border:1px solid #cbd5e1; padding:8px; text-align:center;">Box ${box.boxNo}</td>
                      <td style="border:1px solid #cbd5e1; padding:8px;">${box.dimensions || '-'}</td>
                      <td style="border:1px solid #cbd5e1; padding:8px;">${box.weight || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `;
          }
        } catch (e) {}
        
        if (dispatch.dimensions || dispatch.weight) {
          return `
            <div style="font-size: 12px; color: #64748b; margin-bottom: 30px;">
              ${dispatch.dimensions ? `<strong>Dimensions:</strong> ${dispatch.dimensions} &nbsp;&nbsp;` : ''}
              ${dispatch.weight ? `<strong>Weight:</strong> ${dispatch.weight}` : ''}
            </div>
          `;
        }
        return '';
      })()}

      <div class="footer">
        <div>
          <div class="sig-line">Prepared By</div>
          <div>${dispatch.senderName || 'Authorized Signatory'}</div>
        </div>
        <div>
          <div class="sig-line">Receiver Signature</div>
          <div>(Received in Good Condition)</div>
        </div>
      </div>
    </body>
    </html>
  `;
};
