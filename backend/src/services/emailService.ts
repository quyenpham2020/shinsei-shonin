import nodemailer from 'nodemailer';
import { getOne, getAll, runQuery } from '../config/database';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
}

interface User {
  id: number;
  name: string;
  email: string;
  department: string;
  team_id?: number;
  weekly_report_exempt: number;
}

interface Team {
  id: number;
  name: string;
  leader_id: number;
  leader_name: string;
  leader_email: string;
}

// Get email configuration from system settings
async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    const host = await getOne<{ value: string }>('SELECT value FROM system_settings WHERE key = ?', ['email_host']);
    const port = await getOne<{ value: string }>('SELECT value FROM system_settings WHERE key = ?', ['email_port']);
    const secure = await getOne<{ value: string }>('SELECT value FROM system_settings WHERE key = ?', ['email_secure']);
    const user = await getOne<{ value: string }>('SELECT value FROM system_settings WHERE key = ?', ['email_user']);
    const password = await getOne<{ value: string }>('SELECT value FROM system_settings WHERE key = ?', ['email_password']);
    const from = await getOne<{ value: string }>('SELECT value FROM system_settings WHERE key = ?', ['email_from']);

    if (!host || !port || !user || !password || !from) {
      console.log('Email configuration incomplete - using console logging only');
      return null;
    }

    return {
      host: host.value,
      port: parseInt(port.value),
      secure: secure?.value === 'true',
      user: user.value,
      password: password.value,
      from: from.value,
    };
  } catch (error) {
    console.error('Error getting email configuration:', error);
    return null;
  }
}

// Send email (with fallback to console logging)
export async function sendEmail({ to, subject, html, cc }: SendEmailParams): Promise<boolean> {
  try {
    const config = await getEmailConfig();

    if (!config) {
      // Fallback: Log to console instead of sending actual email
      console.log('=== Email (Console Mode) ===');
      console.log(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
      if (cc) console.log(`CC: ${Array.isArray(cc) ? cc.join(', ') : cc}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${html.replace(/<[^>]*>/g, '')}`);
      console.log('============================');
      return true;
    }

    // Actually send email if configured
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    const recipients = Array.isArray(to) ? to.join(', ') : to;
    const ccRecipients = cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined;

    const info = await transporter.sendMail({
      from: config.from,
      to: recipients,
      cc: ccRecipients,
      subject,
      html,
    });

    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Send weekly report reminder email
export async function sendWeeklyReportReminder(
  userEmail: string,
  userName: string,
  weekStartDate: string,
  language: string = 'ja'
): Promise<boolean> {
  const messages = {
    ja: {
      subject: '【リマインダー】週次報告の提出をお願いします',
      body: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>週次報告提出のお願い</h2>
          <p>${userName} 様</p>
          <p>週次報告（${weekStartDate}週）がまだ提出されていません。</p>
          <p style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <strong style="font-size: 16px;">Hãy gửi báo cáo tuần ở chỗ dễ nhìn trên web</strong>
          </p>
          <p>システムにログインして、週次報告を提出してください。</p>
          <br>
          <p>よろしくお願いいたします。</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            このメールは自動送信されています。返信しないでください。
          </p>
        </div>
      `,
    },
  };

  const message = messages[language as keyof typeof messages] || messages.ja;

  return sendEmail({
    to: userEmail,
    subject: message.subject,
    html: message.body,
  });
}

// Send escalation reminder email (to member + leader + optional GM/BOD)
export async function sendEscalationReminder(
  userEmail: string,
  userName: string,
  leaderEmail: string,
  leaderName: string,
  weekStartDate: string,
  ccEmails?: string[],
  language: string = 'ja'
): Promise<boolean> {
  const messages = {
    ja: {
      subject: '【緊急】週次報告未提出について',
      body: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border-left: 4px solid #f44336;">
          <h2 style="color: #f44336;">週次報告未提出 - 緊急リマインダー</h2>
          <p>${userName} 様</p>
          <p><strong>週次報告（${weekStartDate}週）がまだ提出されていません。</strong></p>
          <p style="background-color: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 20px 0;">
            <strong style="font-size: 16px; color: #d32f2f;">Hãy gửi báo cáo tuần ở chỗ dễ nhìn trên web</strong>
          </p>
          <p>このメールは、オンサイトリーダーにも送信されています。</p>
          <p><strong style="color: #f44336;">至急、システムにログインして週次報告を提出してください。</strong></p>
          <br>
          <p style="color: #666;">CC: ${leaderName} (オンサイトリーダー)</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            このメールは自動送信されています。返信しないでください。
          </p>
        </div>
      `,
    },
  };

  const message = messages[language as keyof typeof messages] || messages.ja;

  const ccList = [leaderEmail, ...(ccEmails || [])].filter(Boolean);

  return sendEmail({
    to: userEmail,
    cc: ccList,
    subject: message.subject,
    html: message.body,
  });
}

// Get pending weekly reports for the current week
export async function getPendingWeeklyReports(weekStartDate: string): Promise<User[]> {
  const users = getAll<User>(`
    SELECT u.id, u.name, u.email, u.department, u.team_id, u.weekly_report_exempt
    FROM users u
    WHERE u.weekly_report_exempt = 0
    AND u.id NOT IN (
      SELECT wr.user_id
      FROM weekly_reports wr
      WHERE wr.week_start_date = ?
      AND wr.status IN ('submitted', 'draft')
    )
    ORDER BY u.department, u.name
  `, [weekStartDate]);

  return users;
}

// Get team leader info
export async function getTeamLeader(teamId: number): Promise<Team | undefined> {
  return getOne<Team>(`
    SELECT
      t.id,
      t.name,
      t.leader_id,
      u.name as leader_name,
      u.email as leader_email
    FROM teams t
    LEFT JOIN users u ON t.leader_id = u.id
    WHERE t.id = ?
  `, [teamId]);
}

// Get escalation email list (GM, BOD, etc.)
export async function getEscalationEmails(): Promise<string[]> {
  const setting = await getOne<{ value: string }>('SELECT value FROM system_settings WHERE key = ?', ['escalation_emails']);

  if (!setting || !setting.value) {
    return [];
  }

  return setting.value.split(',').map(email => email.trim()).filter(Boolean);
}

// Check if escalation is enabled for Sunday
export async function isEscalationEnabled(): Promise<boolean> {
  const setting = await getOne<{ value: string }>('SELECT value FROM system_settings WHERE key = ?', ['enable_sunday_escalation']);
  return setting?.value === 'true';
}

// Log reminder sent
export async function logReminderSent(userId: number, reminderType: 'friday' | 'saturday' | 'sunday', weekStartDate: string): Promise<void> {
  runQuery(`
    INSERT INTO reminder_logs (user_id, reminder_type, week_start_date, sent_at)
    VALUES (?, ?, ?, datetime('now'))
  `, [userId, reminderType, weekStartDate]);
}

// Check if reminder was already sent
export async function wasReminderSent(userId: number, reminderType: string, weekStartDate: string): Promise<boolean> {
  const log = await getOne<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM reminder_logs
    WHERE user_id = ? AND reminder_type = ? AND week_start_date = ?
  `, [userId, reminderType, weekStartDate]);

  return (log?.count || 0) > 0;
}

export default {
  sendEmail,
  sendWeeklyReportReminder,
  sendEscalationReminder,
  getPendingWeeklyReports,
  getTeamLeader,
  getEscalationEmails,
  isEscalationEnabled,
  logReminderSent,
  wasReminderSent,
};
