const cron = require('node-cron');
const { checkAndSendReminders } = require('../services/reminders.service');

// Run once on startup (delayed by 10 seconds to let database connection initialize)
// Removed on-startup run to avoid spam during deployments.

// Schedule tasks to be run on the server at 9:30 AM every day.
cron.schedule('30 9 * * *', () => {
  console.log('[CRON] Running daily alerts check at 9:30 AM...');
  try {
    checkAndSendReminders().catch(console.error);
    console.log('[CRON] Daily alerts completed successfully.');
  } catch (error) {
    console.error('[CRON] Error running daily alerts:', error);
  }
});
