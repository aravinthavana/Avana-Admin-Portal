const courierService = require('../services/courier-dispatch.service');

exports.getAllDispatches = async (req, res, next) => {
  try {
    const list = await courierService.getAllDispatches();
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
};

exports.getNextDcNumber = async (req, res, next) => {
  try {
    const nextDc = await courierService.getNextDcNumber();
    res.status(200).json({ dcNo: nextDc }); 
  } catch (error) {
    next(error);
  }
};

exports.getDispatchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dispatch = await courierService.getDispatchById(id);
    if (!dispatch) return res.status(404).json({ error: 'Delivery Challan not found.' });

    res.status(200).json(dispatch);
  } catch (error) {
    next(error);
  }
};

exports.createDispatch = async (req, res, next) => {
  try {
    const { dcNo } = req.body;
    if (!dcNo || !String(dcNo).trim()) {
      return res.status(400).json({ error: 'Delivery Challan No is mandatory and required.' });
    }
    const requesterEmail = req.user.email;
    const host = req.protocol + '://' + req.get('host');
    const created = await courierService.createDispatch(req.body, requesterEmail, host);

    res.status(201).json({ message: 'Delivery Challan created successfully.', dispatch: created });
  } catch (error) {
    next(error);
  }
};

exports.updateTrackingInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await courierService.updateTrackingInfo(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Delivery Challan not found.' });

    res.status(200).json({ message: 'Tracking information updated.', dispatch: updated });
  } catch (error) {
    next(error);
  }
};

exports.mergeParcel = async (req, res, next) => {
  try {
    const { parentDispatchId, items, remarks } = req.body;
    const requesterEmail = req.user.email;
    if (!parentDispatchId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing parent dispatch ID or items array.' });
    }

    const updated = await courierService.mergeParcel(parentDispatchId, requesterEmail, items, remarks);
    if (!updated) return res.status(404).json({ error: 'Parent Delivery Challan not found.' });

    res.status(200).json({ message: 'Parcels merged successfully into Delivery Challan.', dispatch: updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteDispatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await courierService.deleteDispatch(id);
    if (!success) return res.status(404).json({ error: 'Record not found or failed to delete.' });

    res.status(200).json({ message: 'Delivery Challan deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.updateDispatchEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requesterEmail = req.user.email;
    const host = req.protocol + '://' + req.get('host');
    const updated = await courierService.updateDispatch(id, req.body, requesterEmail, host);
    if (!updated) return res.status(404).json({ error: 'Delivery Challan not found.' });

    res.status(200).json({ message: 'Delivery Challan updated successfully.', dispatch: updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteDispatchEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await courierService.deleteDispatch(id);
    if (!success) return res.status(404).json({ error: 'Record not found or failed to delete.' });

    res.status(200).json({ message: 'Delivery Challan deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.printDeliveryChallan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dispatch = await courierService.getDispatchById(id);
    if (!dispatch) return res.status(404).send('Delivery Challan not found.');

    const html = courierService.renderDeliveryChallanHtml(dispatch);
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/employee/shipping-label
 * Generates a shipping label PDF using the existing A5 address-label template,
 * then emails it and returns the PDF for direct download.
 * Body: { from: {name, phone, address}, to: {name, phone, address}, recipientEmail }
 */
exports.generateShippingLabel = async (req, res, next) => {
  try {
    const { from, to, recipientEmail, isFragile } = req.body;

    if (!from?.name || !from?.address || !to?.name || !to?.address) {
      return res.status(400).json({ error: 'From and To details (name + address) are required.' });
    }

    const { generateShippingLabelPDF } = require('../utils/courier_pdf_generator');
    const { sendEmail } = require('../utils/notifications');

    const pdfBuffer = await generateShippingLabelPDF({ from, to, isFragile: !!isFragile });


    const toEmail = recipientEmail || '';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="background:#C59100; padding:20px; text-align:center;">
          <h2 style="color:#fff; margin:0;">Shipping Label</h2>
        </div>
        <div style="padding:24px; background:#f9f9f9;">
          <p>Hello,</p>
          <p>Your shipping label has been generated. Please find the PDF attached. Print it and affix it to your parcel before dispatch.</p>
          <table style="width:100%; border-collapse:collapse; margin-top:16px;">
            <tr style="background:#fff3cd;">
              <td style="padding:10px; font-weight:bold; border:1px solid #ddd;">From</td>
              <td style="padding:10px; border:1px solid #ddd;">${from.name}${from.phone ? ' | ' + from.phone : ''}<br/><small>${from.address}</small></td>
            </tr>
            <tr>
              <td style="padding:10px; font-weight:bold; border:1px solid #ddd;">To</td>
              <td style="padding:10px; border:1px solid #ddd;">${to.name}${to.phone ? ' | ' + to.phone : ''}<br/><small>${to.address}</small></td>
            </tr>
          </table>
          <p style="margin-top:20px; font-size:12px; color:#888;">Generated by Avana Office Portal</p>
        </div>
      </div>
    `;

    if (toEmail) {
      await sendEmail({
        to: toEmail,
        subject: 'Shipping Label – Avana Medical',
        htmlBody: emailHtml,
        attachments: [
          {
            filename: `shipping-label-${Date.now()}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
    }

    // Return the PDF directly for browser download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="shipping-label.pdf"`);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

exports.getDispatchesByDate = async (req, res, next) => {
  try {
    const date = req.query.date;
    const requesterEmail = req.user.email;
    if (!date) return res.status(400).json({ error: 'Date is required.' });
    
    const list = await courierService.getDispatchesByDate(date, requesterEmail);
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
};

exports.createMergeRequest = async (req, res, next) => {
  try {
    const { targetDispatchId, items, requesterName: bodyName } = req.body;
    const requesterEmail = req.user.email;
    const requesterName = bodyName || requesterEmail.split('@')[0];
    const host = req.protocol + '://' + req.get('host');

    if (!targetDispatchId || !items || !items.length) {
      return res.status(400).json({ error: 'targetDispatchId and items are required.' });
    }

    const mr = await courierService.createMergeRequest({
      targetDispatchId,
      requesterEmail,
      requesterName,
      items,
      host
    });

    res.status(201).json({ message: 'Merge request submitted successfully.', mergeRequest: mr });
  } catch (error) {
    next(error);
  }
};

exports.acceptMergeRequest = async (req, res, next) => {
  try {
    const { id } = req.query; // approvalToken/id
    if (!id) return res.status(400).send('Merge request ID is missing.');
    
    const result = await courierService.acceptMergeRequest(id);
    if (!result.success) {
      return res.status(400).send(`<h2 style="color:#ef4444;">${result.error}</h2>`);
    }

    res.status(200).send(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center;">
        <h2 style="color:#10b981; margin-top:0;">✅ Merge Request Accepted</h2>
        <p>The parcel items have been merged into Delivery Challan <strong>DC #${result.parentDcNo}</strong> successfully.</p>
        <p>A confirmation email has been sent to the merge requester.</p>
      </div>
    `);
  } catch (error) {
    next(error);
  }
};

exports.serveRejectPage = async (req, res, next) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).send('Merge request ID is missing.');

    const mr = await courierService.getMergeRequestById(id);
    if (!mr || mr.status !== 'pending') {
      return res.status(400).send(`<h2 style="color:#ef4444;">Merge request is invalid or has already been processed.</h2>`);
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reject Merge Request</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
          textarea { width: 100%; padding: 10px; border-radius: 4px; border: 1px solid #ccc; margin-top: 10px; margin-bottom: 20px; box-sizing: border-box; }
          button { background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
        </style>
      </head>
      <body>
        <h3 style="margin-top:0; color:#ef4444;">Reject Merge Request</h3>
        <p>Please enter the reason for rejecting the parcel merge request from <strong>${mr.requesterEmail}</strong>:</p>
        <form action="/api/courier-dispatch/merge/reject" method="POST">
          <input type="hidden" name="id" value="${mr.id}">
          <textarea name="reason" rows="4" required placeholder="Type reason here..."></textarea><br>
          <button type="submit">Submit Rejection</button>
        </form>
      </body>
      </html>
    `;
    res.send(html);
  } catch (error) {
    next(error);
  }
};

exports.rejectMergeRequest = async (req, res, next) => {
  try {
    const { id, reason } = req.body;
    if (!id || !reason) return res.status(400).send('Missing ID or reason.');

    const result = await courierService.rejectMergeRequest(id, reason);
    if (!result.success) {
      return res.status(400).send(`<h3>${result.error}</h3>`);
    }

    res.send(`
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center;">
        <h2 style="color:#f59e0b; margin-top:0;">Merge Request Rejected</h2>
        <p>The merge request has been rejected.</p>
        <p>An email notification containing your reason has been sent to the merge requester.</p>
      </div>
    `);
  } catch (error) {
    next(error);
  }
};
