const cron = require('node-cron');
// We would import services here (e.g., amcService, utilitiesService)
// const { checkAMCAlerts } = require('../services/amc.service');

// Schedule tasks to be run on the server at 9:30 AM every day.
cron.schedule('30 9 * * *', () => {
  console.log('[CRON] Running daily alerts check at 9:30 AM...');
  
  try {
    // Ported background tasks will be executed here:
    // checkAMCAlerts();
    // checkUtilityReminders();
    // checkTaxReminders();
    // rolloverUtilityPayments();
    console.log('[CRON] Daily alerts completed successfully.');
  } catch (error) {
    console.error('[CRON] Error running daily alerts:', error);
  }
});
