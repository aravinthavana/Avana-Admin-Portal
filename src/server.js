const http = require('http');
const app = require('./app');
const prisma = require('./config/db');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Start Background Jobs
const { dailyAlertsTask } = require('./jobs/alerts.job');

server.listen(PORT, () => {
  console.log(`[Express] Server is running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`[Express] Received ${signal}, shutting down gracefully...`);
  if (dailyAlertsTask && typeof dailyAlertsTask.stop === 'function') {
    dailyAlertsTask.stop();
  }
  server.close(async () => {
    await prisma.$disconnect().catch(() => {});
    console.log('[Express] Server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
