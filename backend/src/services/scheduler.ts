import cron from 'node-cron';
import {
  getPendingWeeklyReports,
  sendWeeklyReportReminder,
  sendEscalationReminder,
  getTeamLeader,
  getEscalationEmails,
  isEscalationEnabled,
  logReminderSent,
  wasReminderSent,
} from './emailService';

// Get week start date (Monday) for current week
function getCurrentWeekStartDate(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, else go to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

// Friday 3 PM reminder job
async function fridayReminderJob(): Promise<void> {
  console.log('Running Friday 3 PM weekly report reminder job...');
  try {
    const weekStartDate = getCurrentWeekStartDate();
    const pendingUsers = await getPendingWeeklyReports(weekStartDate);

    console.log(`Found ${pendingUsers.length} users without weekly reports for week ${weekStartDate}`);

    for (const user of pendingUsers) {
      // Check if reminder already sent
      const alreadySent = await wasReminderSent(user.id, 'friday', weekStartDate);
      if (alreadySent) {
        console.log(`Friday reminder already sent to ${user.name} (${user.email})`);
        continue;
      }

      // Send reminder
      const sent = await sendWeeklyReportReminder(
        user.email,
        user.name,
        weekStartDate,
        'ja'
      );

      if (sent) {
        await logReminderSent(user.id, 'friday', weekStartDate);
        console.log(`Friday reminder sent to ${user.name} (${user.email})`);
      } else {
        console.error(`Failed to send Friday reminder to ${user.name} (${user.email})`);
      }
    }

    console.log('Friday reminder job completed');
  } catch (error) {
    console.error('Error in Friday reminder job:', error);
  }
}

// Saturday 10 AM escalation job
async function saturdayEscalationJob(): Promise<void> {
  console.log('Running Saturday 10 AM escalation reminder job...');
  try {
    const weekStartDate = getCurrentWeekStartDate();
    const pendingUsers = await getPendingWeeklyReports(weekStartDate);

    console.log(`Found ${pendingUsers.length} users still without weekly reports for week ${weekStartDate}`);

    for (const user of pendingUsers) {
      // Check if escalation already sent
      const alreadySent = await wasReminderSent(user.id, 'saturday', weekStartDate);
      if (alreadySent) {
        console.log(`Saturday escalation already sent to ${user.name} (${user.email})`);
        continue;
      }

      // Get team leader info
      if (!user.team_id) {
        console.log(`User ${user.name} has no team - skipping escalation`);
        continue;
      }

      const teamLeader = await getTeamLeader(user.team_id);
      if (!teamLeader || !teamLeader.leader_email) {
        console.log(`No leader found for team ${user.team_id} - skipping escalation`);
        continue;
      }

      // Send escalation (to member, CC leader)
      const sent = await sendEscalationReminder(
        user.email,
        user.name,
        teamLeader.leader_email,
        teamLeader.leader_name,
        weekStartDate,
        undefined, // No GM/BOD on Saturday
        'ja'
      );

      if (sent) {
        await logReminderSent(user.id, 'saturday', weekStartDate);
        console.log(`Saturday escalation sent to ${user.name}, CC: ${teamLeader.leader_name}`);
      } else {
        console.error(`Failed to send Saturday escalation to ${user.name}`);
      }
    }

    console.log('Saturday escalation job completed');
  } catch (error) {
    console.error('Error in Saturday escalation job:', error);
  }
}

// Sunday 7 PM escalation job (with optional GM/BOD)
async function sundayEscalationJob(): Promise<void> {
  console.log('Running Sunday 7 PM escalation reminder job...');
  try {
    // Check if Sunday escalation is enabled
    const enabled = await isEscalationEnabled();
    if (!enabled) {
      console.log('Sunday escalation is disabled in system settings - skipping');
      return;
    }

    const weekStartDate = getCurrentWeekStartDate();
    const pendingUsers = await getPendingWeeklyReports(weekStartDate);

    console.log(`Found ${pendingUsers.length} users still without weekly reports for week ${weekStartDate}`);

    // Get escalation email list (GM, BOD, etc.)
    const escalationEmails = await getEscalationEmails();

    for (const user of pendingUsers) {
      // Check if escalation already sent
      const alreadySent = await wasReminderSent(user.id, 'sunday', weekStartDate);
      if (alreadySent) {
        console.log(`Sunday escalation already sent to ${user.name} (${user.email})`);
        continue;
      }

      // Get team leader info
      if (!user.team_id) {
        console.log(`User ${user.name} has no team - skipping escalation`);
        continue;
      }

      const teamLeader = await getTeamLeader(user.team_id);
      if (!teamLeader || !teamLeader.leader_email) {
        console.log(`No leader found for team ${user.team_id} - skipping escalation`);
        continue;
      }

      // Send escalation (to member, CC leader + GM/BOD if configured)
      const sent = await sendEscalationReminder(
        user.email,
        user.name,
        teamLeader.leader_email,
        teamLeader.leader_name,
        weekStartDate,
        escalationEmails, // Include GM/BOD
        'ja'
      );

      if (sent) {
        await logReminderSent(user.id, 'sunday', weekStartDate);
        const ccList = [teamLeader.leader_name, ...escalationEmails].join(', ');
        console.log(`Sunday escalation sent to ${user.name}, CC: ${ccList}`);
      } else {
        console.error(`Failed to send Sunday escalation to ${user.name}`);
      }
    }

    console.log('Sunday escalation job completed');
  } catch (error) {
    console.error('Error in Sunday escalation job:', error);
  }
}

export const initScheduler = (): void => {
  console.log('Initializing weekly report reminder scheduler...');

  // Friday 3 PM (15:00 JST) - Initial reminder
  cron.schedule('0 15 * * 5', async () => {
    await fridayReminderJob();
  }, {
    timezone: 'Asia/Tokyo'
  });

  // Saturday 10 AM (10:00 JST) - First escalation
  cron.schedule('0 10 * * 6', async () => {
    await saturdayEscalationJob();
  }, {
    timezone: 'Asia/Tokyo'
  });

  // Sunday 7 PM (19:00 JST) - Second escalation (with GM/BOD if enabled)
  cron.schedule('0 19 * * 0', async () => {
    await sundayEscalationJob();
  }, {
    timezone: 'Asia/Tokyo'
  });

  console.log('Scheduler initialized:');
  console.log('  - Friday 3 PM JST: Weekly report reminder');
  console.log('  - Saturday 10 AM JST: Escalation to leader');
  console.log('  - Sunday 7 PM JST: Escalation to leader + GM/BOD (if enabled)');
};

// Manual trigger functions for testing
export const triggerFridayReminder = async (): Promise<void> => {
  console.log('Manually triggering Friday reminder...');
  await fridayReminderJob();
};

export const triggerSaturdayEscalation = async (): Promise<void> => {
  console.log('Manually triggering Saturday escalation...');
  await saturdayEscalationJob();
};

export const triggerSundayEscalation = async (): Promise<void> => {
  console.log('Manually triggering Sunday escalation...');
  await sundayEscalationJob();
};
