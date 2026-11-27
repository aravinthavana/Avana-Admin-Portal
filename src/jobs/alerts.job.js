const cron = require('node-cron');
const { checkAndSendReminders } = require('../services/reminders.service');

let isRunning = false;

// Schedule tasks to be run on the server at 9:30 AM every day.
const dailyAlertsTask = cron.schedule('30 9 * * *', async () => {
  if (isRunning) {
    console.warn('[CRON] Daily alerts already running; skipping overlapping trigger.');
    return;
  }
  isRunning = true;
  console.log('[CRON] Running daily alerts check at 9:30 AM...');
  try {
    await checkAndSendReminders();
    console.log('[CRON] Daily alerts completed successfully.');
  } catch (error) {
    console.error('[CRON] Error running daily alerts:', error);
  } finally {
    isRunning = false;
  }
});

module.exports = { dailyAlertsTask };
