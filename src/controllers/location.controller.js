const prisma = require('../config/db');
const crypto = require('crypto');

const DEFAULT_LOCATIONS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', 'Other'];

exports.getLocations = async (req, res, next) => {
  try {
    let locations = await prisma.location.findMany({
      orderBy: { name: 'asc' }
    });

    if (!locations || locations.length === 0) {
      // Seed default locations
      const now = new Date().toISOString();
      for (const name of DEFAULT_LOCATIONS) {
        try {
          await prisma.location.create({
            data: {
              id: crypto.randomUUID(),
              name,
              createdAt: now
            }
          });
        } catch (e) {
          // Ignore unique constraint if race condition
        }
      }
      locations = await prisma.location.findMany({
        orderBy: { name: 'asc' }
      });
    }

    res.status(200).json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    next(error);
  }
};

exports.createLocation = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Location name is required.' });
    }

    const trimmed = name.trim();
    const existing = await prisma.location.findFirst({
      where: { name: trimmed }
    });

    if (existing) {
      return res.status(409).json({ error: 'A location with this name already exists.' });
    }

    const newLocation = await prisma.location.create({
      data: {
        id: crypto.randomUUID(),
        name: trimmed,
        createdAt: new Date().toISOString()
      }
    });

    res.status(201).json(newLocation);
  } catch (error) {
    console.error('Error creating location:', error);
    next(error);
  }
};

exports.deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Location ID is required.' });
    }

    await prisma.location.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Location deleted successfully.' });
  } catch (error) {
    console.error('Error deleting location:', error);
    next(error);
  }
};
