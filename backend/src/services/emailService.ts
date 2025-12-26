import { getAll } from '../config/database';

interface User {
  id: number;
  name: string;
  email: string;
  department: string;
}

export const sendEmail = async (to: string, subject: string, body: string): Promise<boolean> => {
  console.log('=== Sending Email ===');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  console.log('====================');
  return true;
};

export const sendWeeklyReportReminder = async (): Promise<void> => {
  console.log('Sending weekly report reminders...');
  
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  const weekStart = monday.toISOString().split('T')[0];
  
  const pendingUsers = getAll<User>(`
    SELECT u.id, u.name, u.email, u.department
    FROM users u
    WHERE u.id NOT IN (
      SELECT user_id FROM weekly_reports WHERE week_start = ?
    )
    ORDER BY u.department, u.name
  `, [weekStart]);
  
  console.log(`Found ${pendingUsers.length} users without weekly report`);
  
  for (const user of pendingUsers) {
    const emailBody = `${user.name} 様\n\n週次報告の提出をお願いいたします。\n\n今週の報告期限が近づいています。\nシステムにログインして、週次報告を入力してください。\n\n---\n申請・承認管理システム`;
    await sendEmail(
      user.email,
      '【リマインダー】週次報告を提出してください',
      emailBody
    );
  }
  
  console.log('Weekly report reminders sent successfully');
};
