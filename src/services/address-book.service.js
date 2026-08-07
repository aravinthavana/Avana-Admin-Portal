'use strict';
const prisma = require('../config/db');

/**
 * Get all address book entries for a specific user.
 */
exports.getAddresses = async (userEmail) => {
  return prisma.addressBook.findMany({
    where: {
      OR: [
        { userEmail },
        { userEmail: 'GLOBAL' }
      ]
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Get all global address book entries.
 */
exports.getGlobalAddresses = async () => {
  return prisma.addressBook.findMany({
    where: { userEmail: 'GLOBAL' },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Save a new address book entry.
 */
exports.saveAddress = async (userEmail, { name, phone, address, label }) => {
  if (!name || !address) throw new Error('Name and address are required.');
  return prisma.addressBook.create({
    data: {
      userEmail,
      name: name.trim(),
      phone: phone?.trim() || null,
      address: address.trim(),
      label: label?.trim() || null,
      createdAt: new Date().toISOString(),
    },
  });
};

/**
 * Update an existing address book entry.
 */
exports.updateAddress = async (userEmail, id, { name, phone, address, label }) => {
  const entry = await prisma.addressBook.findUnique({ where: { id } });
  if (!entry) throw new Error('Address not found.');
  if (entry.userEmail !== userEmail) throw new Error('Unauthorized.');
  if (!name || !address) throw new Error('Name and address are required.');
  
  return prisma.addressBook.update({
    where: { id },
    data: {
      name: name.trim(),
      phone: phone?.trim() || null,
      address: address.trim(),
      label: label?.trim() || null,
    },
  });
};

/**
 * Delete an address book entry by ID.
 * Ensures the entry belongs to the requesting user.
 */
exports.deleteAddress = async (userEmail, id) => {
  const entry = await prisma.addressBook.findUnique({ where: { id } });
  if (!entry) return null;
  if (entry.userEmail !== userEmail) throw new Error('Unauthorized.');
  return prisma.addressBook.delete({ where: { id } });
};

// ─── Seed Global Addresses ───────────────────────────────────
async function seedGlobalAddresses() {
  try {
    const globals = await prisma.addressBook.count({ where: { userEmail: 'GLOBAL' } });
    if (globals === 0) {
      const COMMON_ADDRESSES = [
        { userEmail: 'GLOBAL', label: 'Avana Medical', name: 'Avana Medical Devices Pvt Ltd.,', address: 'No.91, Sundar Nagar 4th Avenue, Nandambakkam,\nChennai – 600032, Tamil Nadu, India.\nGST: 33AAHCA6669B1ZT', createdAt: new Date().toISOString() },
        { userEmail: 'GLOBAL', label: 'Avana Surgical', name: 'Avana Surgical Systems Pvt Ltd.,', address: 'No.91, Sundar Nagar 4th Avenue, Nandambakkam,\nChennai – 600032, Tamil Nadu, India.\nGST: 33AAQCA5951K1ZA', createdAt: new Date().toISOString() },
        { userEmail: 'GLOBAL', label: 'Avana Technology', name: 'Avana Technology Services Pvt Ltd.,', address: 'No.91, Sundar Nagar 4th Avenue, Nandambakkam,\nChennai – 600032, Tamil Nadu, India.\nGST: 33ABACA8707A1Z9', createdAt: new Date().toISOString() },
      ];
      for (const a of COMMON_ADDRESSES) {
        await prisma.addressBook.create({ data: a });
      }
      console.log('Seeded initial global addresses.');
    }
  } catch (err) {
    console.error('Failed to seed global addresses:', err.message);
  }
}

seedGlobalAddresses();
