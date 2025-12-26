import cron from 'node-cron';
import { sendWeeklyReportReminder } from './emailService';

export const initScheduler = (): void => {
  console.log('Initializing scheduler...');
  
  // Schedule weekly report reminder for every Friday at 9:00 AM
  // Cron format: second minute hour day-of-month month day-of-week
  cron.schedule('0 9 * * 5', async () => {
    console.log('Running Friday weekly report reminder job...');
    try {
      await sendWeeklyReportReminder();
    } catch (error) {
      console.error('Error sending weekly report reminders:', error);
    }
  }, {
    timezone: 'Asia/Tokyo'
  });
  
  console.log('Scheduler initialized - Weekly reminder scheduled for Fridays at 9:00 AM JST');
};

// Manual trigger for testing
export const triggerWeeklyReminder = async (): Promise<void> => {
  console.log('Manually triggering weekly report reminder...');
  await sendWeeklyReportReminder();
};
