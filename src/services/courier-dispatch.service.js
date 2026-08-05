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
      const recipients = [dispatch.requesterEmail];
      if (dispatch.mergedRequesters) {
        recipients.push(...dispatch.mergedRequesters.split(',').map(e => e.trim()).filter(Boolean));
      }
      
      for (const email of [...new Set(recipients)]) {
        await sendEmail(email, 'Courier Dispatched - Tracking Details', emailContent);
      }
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

// ─── Courier Merge Logic ───────────────────────────────────────────────────────

exports.getDispatchesByDate = async (date, excludeEmail) => {
  return prisma.courierDispatch.findMany({
    where: {
      dcDate: date,
      status: 'approved',
      requesterEmail: { not: excludeEmail }
    },
    include: { items: true },
    orderBy: { submittedAt: 'desc' }
  });
};

exports.getMergeRequestById = async (id) => {
  return prisma.courierMergeRequest.findUnique({
    where: { id },
    include: { targetDispatch: true }
  });
};

exports.createMergeRequest = async (data) => {
  const { targetDispatchId, requesterEmail, requesterName, items, host } = data;
  
  const target = await prisma.courierDispatch.findUnique({ where: { id: targetDispatchId } });
  if (!target) throw new Error('Target Courier Dispatch not found');

  const mr = await prisma.courierMergeRequest.create({
    data: {
      targetDispatchId,
      requesterEmail,
      requesterName,
      itemsJson: JSON.stringify(items),
      approvalToken: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });

  // Send email to target.requesterEmail
  const { sendEmail } = require('../utils/notifications');
  const acceptLink = `${host}/api/courier-dispatch/merge/accept?id=${mr.id}`;
  const rejectLink = `${host}/api/courier-dispatch/merge/reject-page?id=${mr.id}`;

  const itemsHtml = items.map(it => `<li>${it.qty}x ${it.description} (Value: ₹${it.value})</li>`).join('');

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background:#ea580c; padding:20px; text-align:center;">
        <h2 style="color:#fff; margin:0;">📦 Parcel Merge Request</h2>
      </div>
      <div style="padding:24px; background:#f9fafb;">
        <p style="font-size:16px;">Hello <b>${target.senderName || 'Colleague'}</b>,</p>
        <p style="font-size:16px;"><b>${requesterName}</b> (${requesterEmail}) has requested to merge their items into your active Delivery Challan (<b>DC #${target.dcNo}</b>).</p>
        <div style="background:#fff; border: 1px solid #e5e7eb; padding:16px; border-radius:8px; margin: 16px 0;">
          <h4 style="margin-top:0; color:#374151;">Items to Merge:</h4>
          <ul style="margin-bottom:0; color:#4b5563;">
            ${itemsHtml}
          </ul>
        </div>
        <p style="margin-top:24px;">Please review and choose to Accept or Reject this merge request:</p>
        <div style="text-align: center; margin-top: 20px; margin-bottom: 20px;">
          <a href="${acceptLink}" style="background:#10b981; color:white; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:0.9rem; margin-right: 10px;">Accept Merge</a>
          <a href="${rejectLink}" style="background:#ef4444; color:white; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:0.9rem;">Reject Merge</a>
        </div>
      </div>
    </div>
  `;

  await sendEmail(target.requesterEmail, `Merge Request for DC #${target.dcNo}`, emailHtml);
  return mr;
};

exports.acceptMergeRequest = async (id) => {
  const mr = await prisma.courierMergeRequest.findUnique({ where: { id }, include: { targetDispatch: true } });
  if (!mr || mr.status !== 'pending') return { success: false, error: 'Merge request is invalid or has already been processed.' };

  const items = JSON.parse(mr.itemsJson);
  const target = mr.targetDispatch;

  let addedVal = 0;
  for (const it of items) {
    const qty = parseInt(it.qty, 10) || 1;
    const rate = parseFloat(it.rate) || 0;
    const val = parseFloat(it.value) || (qty * rate);
    addedVal += val;
    await prisma.courierDispatchItem.create({
      data: {
        dispatchId: target.id,
        itemCode: it.itemCode || 'MERGED',
        description: `[Merged for ${mr.requesterName || mr.requesterEmail}] ${it.description || 'Item'}`,
        serialNo: it.serialNo || '',
        qty,
        rate,
        value: val
      }
    });
  }

  // Update target dispatch
  const currentMerged = target.mergedRequesters ? target.mergedRequesters.split(',') : [];
  if (!currentMerged.includes(mr.requesterEmail)) {
    currentMerged.push(mr.requesterEmail);
  }

  const updatedTarget = await prisma.courierDispatch.update({
    where: { id: target.id },
    data: {
      totalAmount: target.totalAmount + addedVal,
      mergedRequesters: currentMerged.join(','),
      updatedAt: new Date().toISOString()
    },
    include: { items: true }
  });

  // Mark MR as approved
  await prisma.courierMergeRequest.update({
    where: { id },
    data: { status: 'approved', updatedAt: new Date().toISOString() }
  });

  // Send emails with updated PDF
  const { generateDeliveryChallanPDF } = require('../utils/courier_pdf_generator');
  const { sendEmail } = require('../utils/notifications');
  const pdfBuffer = await generateDeliveryChallanPDF(updatedTarget);

  const attachments = [{
    filename: `delivery-challan-${updatedTarget.dcNo}.pdf`,
    content: pdfBuffer,
    contentType: 'application/pdf'
  }];

  // To Requester
  const reqHtml = \`
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #059669;">✅ Merge Request Accepted</h2>
      <p>We are pleased to inform you that your parcel merge request has been accepted by <strong>${target.requesterEmail}</strong>.</p>
      <p>Your items have been merged into Delivery Challan <strong>DC #${target.dcNo}</strong>.</p>
      <p>Please find the updated Delivery Challan attached.</p>
    </div>
  \`;
  await sendEmail(mr.requesterEmail, `Merge Request Accepted - DC #${target.dcNo}`, reqHtml, attachments);

  // To Owner
  const ownerHtml = \`
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #059669;">✅ Merge Successful</h2>
      <p>A new parcel was successfully merged into your Delivery Challan (<strong>DC #${target.dcNo}</strong>).</p>
      <p>Please find the updated Delivery Challan attached. Please use this latest copy for dispatch.</p>
    </div>
  \`;
  await sendEmail(target.requesterEmail, `Merge Successful - DC #${target.dcNo}`, ownerHtml, attachments);

  return { success: true, parentDcNo: target.dcNo };
};

exports.rejectMergeRequest = async (id, reason) => {
  const mr = await prisma.courierMergeRequest.findUnique({ where: { id }, include: { targetDispatch: true } });
  if (!mr || mr.status !== 'pending') return { success: false, error: 'Merge request is invalid or has already been processed.' };

  await prisma.courierMergeRequest.update({
    where: { id },
    data: { status: 'rejected', rejectionReason: reason, updatedAt: new Date().toISOString() }
  });

  const { sendEmail } = require('../utils/notifications');
  const html = \`
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #ef4444;">❌ Merge Request Rejected</h2>
      <p>We regret to inform you that your merge request for Delivery Challan <strong>DC #${mr.targetDispatch.dcNo}</strong> has been rejected by the original owner.</p>
      <p><strong>Reason for rejection:</strong></p>
      <blockquote style="background: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 0;">${reason}</blockquote>
      <p style="margin-top:20px;">Please raise a separate courier request for your items.</p>
    </div>
  \`;
  await sendEmail(mr.requesterEmail, `Merge Request Rejected - DC #${mr.targetDispatch.dcNo}`, html);

  return { success: true };
};
