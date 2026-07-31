const crypto = require('crypto');
const helpdeskService = require('../services/helpdesk.service');

exports.getHelpdeskRequests = async (req, res, next) => {
  try {
    const requests = await helpdeskService.getAllRequests();
    const bookingsService = require('../services/bookings.service');
    const bookings = await bookingsService.getAllBookings();

    const conferenceRequests = bookings.map(b => ({
      id: b.id,
      category: 'conference',
      categoryTitle: 'Conference Room Booking',
      submittedAt: b.createdAt || b.submittedAt || new Date(b.startDate || b.date).toISOString(),
      subcategory: b.bookingType === 'full' ? 'Full Day' : `${b.startTime} - ${b.endTime}`,
      floor: 'Conference Room',
      exact_issue: `Reason: ${b.reason || 'N/A'} | Date: ${b.startDate || b.date}` + (b.endDate && b.endDate !== b.startDate ? ` to ${b.endDate}` : '') + (b.attendees ? ` | Attendees: ${b.attendees}` : '') + (b.food && b.food !== 'none' ? ` | Food: ${b.food}` : ''),
      reason: b.reason || 'N/A',
      attendees: b.attendees || 'None',
      food: b.food || 'none',
      foodCount: b.foodCount || 0,
      foodSpecify: b.foodSpecify || '',
      startDate: b.startDate || b.date,
      endDate: b.endDate || b.date,
      remarks: b.remarks || 'None',
      status: b.status || 'pending',
      requester_name: b.name,
      requester_phone: b.phone || b.email,
      createdAt: b.createdAt || new Date().toISOString()
    }));

    const allCombined = [...requests, ...conferenceRequests];
    const sorted = allCombined.sort((a, b) => new Date(b.createdAt || b.submittedAt) - new Date(a.createdAt || a.submittedAt));
    res.status(200).json(sorted);
  } catch (error) {
    next(error);
  }
};

exports.createRequest = async (req, res, next) => {
  try {
    console.log('[Helpdesk POST] Payload:', req.body);
    const { category, requester_name, requester_email, requester_phone, location_dept, issue_desc, ...otherData } = req.body;

    const missing = [];
    if (!category) missing.push('category');
    if (!requester_name) missing.push('requester_name');
    if (!requester_phone) missing.push('requester_phone');

    if (missing.length > 0) {
      console.log('[Helpdesk POST] Validation failed. Missing required core fields:', missing);
      return res.status(400).json({ error: 'Please fill in all required fields (Name, Phone, Category). Missing: ' + missing.join(', ') });
    }

    const newRequest = {
      id: crypto.randomUUID(),
      category, 
      name: requester_name, 
      email: requester_email || '', 
      phone: requester_phone, 
      location: location_dept || '',
      description: issue_desc || '',
      ...otherData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (await helpdeskService.saveRequest(newRequest)) {
      const host = req.headers.host ? `${req.protocol}://${req.headers.host}` : 'http://localhost:3000';
      helpdeskService.sendHelpdeskNotification(newRequest, host).catch(console.error);
      res.status(201).json({ message: 'Request submitted successfully.', request: newRequest });
    } else {
      res.status(500).json({ error: 'Database save failure.' });
    }
  } catch (error) {
    next(error);
  }
};

exports.getCounts = async (req, res, next) => {
  try {
    const requests = await helpdeskService.getAllRequests();
    // Assuming bookingService is available, but if not we can just require it
    const bookingService = require('../services/bookings.service');
    const bookings = await bookingService.getAllBookings();

    const counts = {};
    requests.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    counts['conference'] = bookings.length;
    
    res.status(200).json(counts);
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolution, category, rejectionReason, approvalRemarks } = req.body;
    if (!id || !status) {
      return res.status(400).json({ error: 'Missing ID or status.' });
    }

    if (category === 'conference') {
      const bookingsService = require('../services/bookings.service');
      const bookings = await bookingsService.getAllBookings();
      const bIndex = bookings.findIndex(b => b.id === id);
      if (bIndex === -1) {
        return res.status(404).json({ error: 'Booking not found.' });
      }
      
      const b = bookings[bIndex];
      b.status = status;
      if (status === 'rejected') {
        b.rejectionReason = rejectionReason || 'No reason provided.';
      } else if (status === 'confirmed' && approvalRemarks) {
        // Store approval remarks inside the remarks field in SQLite
        b.remarks = b.remarks ? `${b.remarks} | Admin Remarks: ${approvalRemarks}` : `Admin Remarks: ${approvalRemarks}`;
      }
      
      if (await bookingsService.saveBooking(b)) {
        const host = req.protocol + '://' + req.get('host');
        if (status === 'confirmed') {
          bookingsService.sendBookingApprovalToEmployeeNotification(b, host, approvalRemarks).catch(console.error);
        } else if (status === 'rejected') {
          bookingsService.sendBookingRejectionToEmployeeNotification(b, b.rejectionReason).catch(console.error);
        }
        return res.status(200).json({ message: 'Booking status updated successfully.' });
      } else {
        return res.status(500).json({ error: 'Failed to update booking status.' });
      }
    }

    const requests = await helpdeskService.getAllRequests();
    const reqIndex = requests.findIndex(r => r.id === id);

    if (reqIndex === -1) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const request = requests[reqIndex];
    request.status = status;
    if (resolution) {
      request.resolution = resolution;
    } else if (status === 'rejected' && rejectionReason) {
      request.resolution = `Rejected: ${rejectionReason}`;
    }

    if (await helpdeskService.saveRequest(request)) {
      const host = req.protocol + '://' + req.get('host');
      if (status === 'completed') {
        helpdeskService.sendHelpdeskCompletionEmailNotification(request, host).catch(console.error);

        // Automated Stock Deduction
        if (request.category === 'stationery' || request.category === 'hk_material') {
          try {
            const inventoryService = require('../services/inventory.service');
            const type = request.category === 'stationery' ? 'stationery' : 'housekeeping';
            let items = [];
            if (request.items) {
              items = typeof request.items === 'string' ? JSON.parse(request.items) : request.items;
            }
            if (Array.isArray(items) && items.length > 0) {
              const stock = await inventoryService.getStock(type);
              for (const it of items) {
                const name = it.item || it.name;
                const qty = parseInt(it.quantity || it.qty || 1, 10);
                if (name && !isNaN(qty) && qty > 0) {
                  const previousStock = stock[name] || 0;
                  let newStock = previousStock - qty;
                  if (newStock < 0) newStock = 0;
                  stock[name] = newStock;

                  const logs = await inventoryService.getTransactions(type);
                  logs.push({
                    item: name,
                    type: 'use',
                    quantity: qty,
                    previousStock,
                    newStock,
                    timestamp: new Date().toISOString(),
                    remarks: `Auto-deducted from completed Request #${request.id}`
                  });
                  await inventoryService.saveTransactions(type, logs);
                }
              }
              await inventoryService.saveStock(type, stock);
              console.log(`[Helpdesk Auto-Stock] Deducted stock for completed request #${request.id}`);
            }
          } catch (err) {
            console.error('[Helpdesk Auto-Stock] Failed to deduct stock:', err);
          }
        }
      } else if (status === 'rejected') {
        helpdeskService.sendHelpdeskRejectionEmailNotification(request, host, rejectionReason).catch(console.error);
      }
      res.status(200).json({ message: 'Status updated successfully.' });
    } else {
      res.status(500).json({ error: 'Failed to update status.' });
    }
  } catch (error) {
    next(error);
  }
};

exports.deleteRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Missing ID.' });
    }

    const requests = await helpdeskService.getAllRequests();
    const reqIndex = requests.findIndex(r => r.id === id);

    if (reqIndex === -1) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (await helpdeskService.deleteRequest(id)) {
      res.status(200).json({ message: 'Request deleted successfully.' });
    } else {
      res.status(500).json({ error: 'Failed to delete request.' });
    }
  } catch (error) {
    next(error);
  }
};
