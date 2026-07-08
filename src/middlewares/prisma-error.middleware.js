const { Prisma } = require('@prisma/client');

/**
 * Middleware to handle Prisma-specific errors and return clean API responses.
 */
module.exports = (err, req, res, next) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        return res.status(409).json({
          error: 'A record with this data already exists.',
          field: err.meta?.target
        });
      case 'P2025':
        // Record not found
        return res.status(404).json({
          error: 'The requested record was not found.'
        });
      case 'P2003':
        // Foreign key constraint failure
        return res.status(400).json({
          error: 'This operation references a record that does not exist.'
        });
      case 'P2021':
        // Table does not exist
        console.error('[Prisma] Table not found:', err.meta);
        return res.status(500).json({
          error: 'Database schema error. Please run prisma db push.'
        });
      default:
        console.error(`[Prisma Error ${err.code}]`, err.message);
        return res.status(500).json({
          error: 'A database error occurred.'
        });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error('[Prisma Validation]', err.message);
    return res.status(400).json({
      error: 'Invalid data provided.'
    });
  }

  // Not a Prisma error — pass to the next error handler
  next(err);
};
