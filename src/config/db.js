const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configure SQLite for concurrent web requests (set busy_timeout before WAL)
(async () => {
  try {
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
  } catch (err) {
    console.warn('[DB] Failed to set SQLite WAL/busy_timeout:', err.message);
  }
})();

module.exports = prisma;
