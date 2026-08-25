const prisma = require('../config/db');

/**
 * Logs an administrative action to the AuditLog.
 * @param {Object} req - The Express request object (to extract IP and User)
 * @param {string} action - The action taken (e.g., 'UPDATE_STOCK', 'APPROVE_PURCHASE')
 * @param {string} entity - The entity affected (e.g., 'Inventory', 'PurchaseRequest')
 * @param {string} [entityId] - The ID of the affected entity
 * @param {Object|string} [details] - Any additional details or before/after state
 */
exports.logAdminAction = async (req, action, entity, entityId = null, details = null) => {
  try {
    const adminEmail = req.admin?.email || req.admin?.username || 'Unknown Admin';
    const ip = req.ip || req.connection?.remoteAddress || 'Unknown IP';
    
    let detailsString = null;
    if (details) {
      detailsString = typeof details === 'string' ? details : JSON.stringify(details);
    }

    await prisma.auditLog.create({
      data: {
        admin: adminEmail,
        action,
        entity,
        entityId: String(entityId),
        details: detailsString,
        ip,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};
