const prisma = require('../config/db');
const crypto = require('crypto');

const DEFAULT_LOCATIONS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', 'Other'];

async function ensureLocationTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Location" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "createdAt" TEXT
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Location_name_key" ON "Location"("name");
    `);
  } catch (e) {
    console.error('ensureLocationTable error:', e);
  }
}

exports.getLocations = async (req, res, next) => {
  try {
    await ensureLocationTable();

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
    await ensureLocationTable();

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
    await ensureLocationTable();

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
