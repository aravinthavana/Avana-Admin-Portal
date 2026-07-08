const http = require('http');
const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Start Background Jobs
require('./jobs/alerts.job');

server.listen(PORT, () => {
  console.log(`[Express] Server is running on port ${PORT}`);
});

// Basic graceful shutdown
process.on('SIGINT', () => {
  console.log('[Express] Shutting down gracefully...');
  server.close(() => {
    console.log('[Express] Server closed.');
    process.exit(0);
  });
});
