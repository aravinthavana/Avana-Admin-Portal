'use strict';
const prisma = require('../config/db');

/**
 * Get all address book entries for a specific user.
 */
exports.getAddresses = async (userEmail) => {
  return prisma.addressBook.findMany({
    where: { userEmail },
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
 * Delete an address book entry by ID.
 * Ensures the entry belongs to the requesting user.
 */
exports.deleteAddress = async (userEmail, id) => {
  const entry = await prisma.addressBook.findUnique({ where: { id } });
  if (!entry) return null;
  if (entry.userEmail !== userEmail) throw new Error('Unauthorized.');
  return prisma.addressBook.delete({ where: { id } });
};
