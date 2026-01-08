import { Response } from 'express';
import { getOne, getAll, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { getUsersUnderAuthority } from '../services/permissionService';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as XLSX from 'xlsx';

// Helper function to clean and format user input content
function cleanUserInput(content: string | undefined): string | undefined {
  if (!content) return content;

  // Split by lines, trim each line, remove empty lines
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Join back with single newline
  return lines.length > 0 ? lines.join('\n') : undefined;
}

// Helper function to format content with sub-numbering
function formatContentWithSubNumbering(content: string, sectionNumber: number): string {
  if (!content || !content.trim()) return '';

  const lines = content.split('\n').filter(line => line.trim());

  return lines.map((line, index) => {
    // Remove existing numbering (1., 2., etc.) and add sub-numbering
    const cleanedLine = line.replace(/^\d+\.\s*/, '').trim();
    return `    ${sectionNumber}.${index + 1}. ${cleanedLine}`;
  }).join('\n');
}

// Helper function to send webhook notification
async function sendWebhookNotification(webhookUrl: string, reportData: {
  userName: string;
  department: string;
  teamName: string;
  weekStart: string;
  weekEnd: string;
  content: string;
  achievements?: string;
  challenges?: string;
  nextWeekPlan?: string;
  overview?: string;
}): Promise<void> {
  try {
    let sectionNumber = 0;
    let messageBody = '';

    // Section 1: 今週の報告内容
    if (reportData.content) {
      sectionNumber++;
      const formattedContent = formatContentWithSubNumbering(reportData.content, sectionNumber);
      messageBody += `${sectionNumber}. 今週の報告内容:\n${formattedContent}\n\n`;
    }

    // Section 2: 成果・達成事項
    if (reportData.achievements) {
      sectionNumber++;
      const formattedAchievements = formatContentWithSubNumbering(reportData.achievements, sectionNumber);
      messageBody += `${sectionNumber}. 成果・達成事項:\n${formattedAchievements}\n\n`;
    }

    // Section 3: 課題・問題点
    if (reportData.challenges) {
      sectionNumber++;
      const formattedChallenges = formatContentWithSubNumbering(reportData.challenges, sectionNumber);
      messageBody += `${sectionNumber}. 課題・問題点:\n${formattedChallenges}\n\n`;
    }

    // Section 4: 来週の予定
    if (reportData.nextWeekPlan) {
      sectionNumber++;
      const formattedPlan = formatContentWithSubNumbering(reportData.nextWeekPlan, sectionNumber);
      messageBody += `${sectionNumber}. 来週の予定:\n${formattedPlan}\n\n`;
    }

    // Section 5: Overview (if exists)
    if (reportData.overview) {
      sectionNumber++;
      const formattedOverview = formatContentWithSubNumbering(reportData.overview, sectionNumber);
      messageBody += `${sectionNumber}. Overview:\n${formattedOverview}`;
    }

    // Format message for Google Chat or Microsoft Teams
    const message = {
      text: `📝 週次報告が提出されました\n\n` +
        `👤 氏名: ${reportData.userName}\n\n` +
        `🏢 部署: ${reportData.department}\n\n` +
        `👥 チーム: ${reportData.teamName}\n\n` +
        `📅 期間: ${reportData.weekStart} ~ ${reportData.weekEnd}\n\n` +
        messageBody,
    };

    await axios.post(webhookUrl, message, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000, // 5 second timeout
    });

    console.log(`[Webhook] Successfully sent notification to ${webhookUrl} for ${reportData.userName}`);
  } catch (error: any) {
    console.error(`[Webhook] Failed to send notification to ${webhookUrl}:`, error.message);
    // Don't throw error - webhook failure shouldn't block report submission
  }
}

interface WeeklyReport {
  id: number;
  user_id: number;
  week_start_date: string;
  week_end_date: string;
  content: string;
  achievements: string | null;
  challenges: string | null;
  next_week_plan: string | null;
  created_at: string;
  updated_at: string;
}

// Format date to YYYY-MM-DD in local timezone (not UTC)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekDates = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: formatLocalDate(monday),
    weekEnd: formatLocalDate(sunday),
  };
};

export const getMyReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const reports = await getAll(`
      SELECT wr.*, u.name as user_name, u.department
      FROM weekly_reports wr
      LEFT JOIN users u ON wr.user_id = u.id
      WHERE wr.user_id = $1
      ORDER BY wr.week_start_date DESC
    `, [user.id]);
    res.json(reports);
  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

export const getDepartmentReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { weekStart, weekEnd } = req.query;
    if (user.role === 'user') {
      res.status(403).json({ message: '権限がありません' });
      return;
    }
    let query = `SELECT wr.*, u.name as user_name, u.department, u.employee_id
      FROM weekly_reports wr LEFT JOIN users u ON wr.user_id = u.id WHERE 1=1`;
    const params: (string | number)[] = [];
    let paramIndex = 1;
    if (user.role === 'approver') {
      query += ` AND u.department IN (SELECT d.name FROM approvers ap JOIN departments d ON ap.department_id = d.id WHERE ap.user_id = $${paramIndex} AND ap.is_active = true)`;
      params.push(user.id);
      paramIndex++;
    } else if (user.role === 'onsite_leader') {
      const allowedUserIds = await getUsersUnderAuthority(user.id);

      if (allowedUserIds.length === 0) {
        res.json([]);
        return;
      }

      const placeholders = allowedUserIds.map((_, i) => `$${paramIndex + i}`).join(',');
      query += ` AND wr.user_id IN (${placeholders})`;
      params.push(...allowedUserIds);
      paramIndex += allowedUserIds.length;
    }
    if (weekStart) { query += ` AND wr.week_start_date >= $${paramIndex}`; params.push(weekStart as string); paramIndex++; }
    if (weekEnd) { query += ` AND wr.week_start_date <= $${paramIndex}`; params.push(weekEnd as string); paramIndex++; }
    query += ' ORDER BY wr.week_start_date DESC, u.department, u.name';
    res.json(await getAll(query, params));
  } catch (error) {
    console.error('Get department reports error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

export const getReportsForComparison = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { userId } = req.query;
    const targetUserId = userId ? Number(userId) : user.id;
    if (targetUserId !== user.id && user.role === 'user') {
      res.status(403).json({ message: '権限がありません' });
      return;
    }
    const currentWeek = getWeekDates();
    const prevWeekDate = new Date();
    prevWeekDate.setDate(prevWeekDate.getDate() - 7);
    const prevWeek = getWeekDates(prevWeekDate);
    const currentReport = await getOne(`SELECT * FROM weekly_reports WHERE user_id = $1 AND week_start_date = $2`, [targetUserId, currentWeek.weekStart]);
    const previousReport = await getOne(`SELECT * FROM weekly_reports WHERE user_id = $1 AND week_start_date = $2`, [targetUserId, prevWeek.weekStart]);
    res.json({
      currentWeek: { ...currentWeek, report: currentReport || null },
      previousWeek: { ...prevWeek, report: previousReport || null },
    });
  } catch (error) {
    console.error('Get reports for comparison error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

export const createOrUpdateReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { content, achievements, challenges, nextWeekPlan, overview, weekStart } = req.body;
    if (!content) {
      res.status(400).json({ message: '報告内容は必須です' });
      return;
    }

    // Clean and format user input
    const cleanedContent = cleanUserInput(content);
    const cleanedAchievements = cleanUserInput(achievements);
    const cleanedChallenges = cleanUserInput(challenges);
    const cleanedNextWeekPlan = cleanUserInput(nextWeekPlan);
    const cleanedOverview = cleanUserInput(overview);

    const targetWeek = weekStart ? { weekStart, weekEnd: '' } : getWeekDates();
    if (!weekStart) {
      targetWeek.weekEnd = getWeekDates().weekEnd;
    } else {
      const startDate = new Date(weekStart);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      targetWeek.weekEnd = endDate.toISOString().split('T')[0];
    }
    const existingReport = await getOne<WeeklyReport>(`SELECT * FROM weekly_reports WHERE user_id = $1 AND week_start_date = $2`, [user.id, targetWeek.weekStart]);

    let reportId: number;
    let isNewReport = false;

    if (existingReport) {
      await runQuery(`UPDATE weekly_reports SET content = $1, achievements = $2, challenges = $3, next_week_plan = $4, overview = $5, updated_at = NOW() WHERE id = $6`,
        [cleanedContent, cleanedAchievements || null, cleanedChallenges || null, cleanedNextWeekPlan || null, cleanedOverview || null, existingReport.id]);
      reportId = existingReport.id;
    } else {
      const result = await runQuery(`INSERT INTO weekly_reports (user_id, week_start_date, week_end_date, content, achievements, challenges, next_week_plan, overview) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [user.id, targetWeek.weekStart, targetWeek.weekEnd, cleanedContent, cleanedAchievements || null, cleanedChallenges || null, cleanedNextWeekPlan || null, cleanedOverview || null]);
      reportId = result.rows[0].id;
      isNewReport = true;
    }

    // Get user's team information for webhook notification
    const userTeamInfo = await getOne<{
      user_name: string;
      department: string;
      team_name: string | null;
      webhook_url: string | null;
    }>(`
      SELECT u.name as user_name, u.department, t.name as team_name, t.webhook_url
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id AND t.is_active = true
      WHERE u.id = $1
    `, [user.id]);

    // Send webhook notification if team has webhook configured
    if (userTeamInfo && userTeamInfo.webhook_url && cleanedContent) {
      // Send notification in background (don't wait for it)
      sendWebhookNotification(userTeamInfo.webhook_url, {
        userName: userTeamInfo.user_name,
        department: userTeamInfo.department,
        teamName: userTeamInfo.team_name || '未割当',
        weekStart: targetWeek.weekStart,
        weekEnd: targetWeek.weekEnd,
        content: cleanedContent,
        achievements: cleanedAchievements,
        challenges: cleanedChallenges,
        nextWeekPlan: cleanedNextWeekPlan,
        overview: cleanedOverview,
      }).catch(err => {
        console.error('[Webhook] Error sending notification:', err);
      });
    }

    const report = await getOne('SELECT * FROM weekly_reports WHERE id = $1', [reportId]);

    if (isNewReport) {
      res.status(201).json({ message: 'レポートを作成しました', report });
    } else {
      res.json({ message: 'レポートを更新しました', report });
    }
  } catch (error) {
    console.error('Create/update report error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

export const getReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const report = await getOne<WeeklyReport & { user_name: string; department: string }>(`SELECT wr.*, u.name as user_name, u.department FROM weekly_reports wr LEFT JOIN users u ON wr.user_id = u.id WHERE wr.id = $1`, [Number(id)]);
    if (!report) { res.status(404).json({ message: 'レポートが見つかりません' }); return; }
    if (report.user_id !== user.id && user.role === 'user') { res.status(403).json({ message: '権限がありません' }); return; }
    res.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

export const deleteReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const report = await getOne<WeeklyReport>('SELECT * FROM weekly_reports WHERE id = $1', [Number(id)]);
    if (!report) { res.status(404).json({ message: 'レポートが見つかりません' }); return; }
    if (report.user_id !== user.id && user.role !== 'admin') { res.status(403).json({ message: '削除権限がありません' }); return; }
    await runQuery('DELETE FROM weekly_reports WHERE id = $1', [Number(id)]);
    res.json({ message: 'レポートを削除しました' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

export const getPendingReportUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (user.role === 'user') { res.status(403).json({ message: '権限がありません' }); return; }
    const currentWeek = getWeekDates();
    let query = `SELECT u.id, u.employee_id, u.name, u.email, u.department FROM users u WHERE u.id NOT IN (SELECT user_id FROM weekly_reports WHERE week_start_date = $1) AND (u.weekly_report_exempt IS NULL OR u.weekly_report_exempt = false)`;
    const params: (string | number)[] = [currentWeek.weekStart];
    let paramIndex = 2;
    if (user.role === 'approver') {
      query += ` AND u.department IN (SELECT d.name FROM approvers ap JOIN departments d ON ap.department_id = d.id WHERE ap.user_id = $${paramIndex} AND ap.is_active = true)`;
      params.push(user.id);
      paramIndex++;
    } else if (user.role === 'onsite_leader') {
      const allowedUserIds = await getUsersUnderAuthority(user.id);

      if (allowedUserIds.length === 0) {
        res.json({ weekStart: currentWeek.weekStart, weekEnd: currentWeek.weekEnd, pendingUsers: [] });
        return;
      }

      const placeholders = allowedUserIds.map((_, i) => `$${paramIndex + i}`).join(',');
      query += ` AND u.id IN (${placeholders})`;
      params.push(...allowedUserIds);
      paramIndex += allowedUserIds.length;
    }
    query += ' ORDER BY u.department, u.name';
    res.json({ weekStart: currentWeek.weekStart, weekEnd: currentWeek.weekEnd, pendingUsers: await getAll(query, params) });
  } catch (error) {
    console.error('Get pending report users error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

export const getAllMembersWithReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (user.role === 'user') { res.status(403).json({ message: '権限がありません' }); return; }
    const currentWeek = getWeekDates();

    let query = `
      SELECT
        u.id, u.employee_id, u.name, u.email, u.department,
        wr.id as report_id, wr.content, wr.achievements, wr.challenges,
        wr.next_week_plan, wr.week_start_date, wr.week_end_date, wr.updated_at
      FROM users u
      LEFT JOIN weekly_reports wr ON u.id = wr.user_id AND wr.week_start_date = $1
      WHERE (u.weekly_report_exempt IS NULL OR u.weekly_report_exempt = false)
    `;
    const params: (string | number)[] = [currentWeek.weekStart];
    let paramIndex = 2;

    if (user.role === 'approver') {
      query += ` AND u.department IN (
        SELECT d.name FROM approvers ap
        JOIN departments d ON ap.department_id = d.id
        WHERE ap.user_id = $${paramIndex} AND ap.is_active = true
      )`;
      params.push(user.id);
      paramIndex++;
    } else if (user.role === 'onsite_leader') {
      const allowedUserIds = await getUsersUnderAuthority(user.id);

      if (allowedUserIds.length === 0) {
        res.json({
          weekStart: currentWeek.weekStart,
          weekEnd: currentWeek.weekEnd,
          members: []
        });
        return;
      }

      const placeholders = allowedUserIds.map((_, i) => `$${paramIndex + i}`).join(',');
      query += ` AND u.id IN (${placeholders})`;
      params.push(...allowedUserIds);
      paramIndex += allowedUserIds.length;
    }
    query += ' ORDER BY u.department, u.name';

    const members = await getAll(query, params);
    res.json({
      weekStart: currentWeek.weekStart,
      weekEnd: currentWeek.weekEnd,
      members
    });
  } catch (error) {
    console.error('Get all members with reports error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// Get members with reports for the last N weeks (for leader view)
// Onsite leaders: 3 weeks only, GM/BOD/Admin: configurable with pagination
export const getMembersReportsLast3Weeks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (user.role === 'user') { res.status(403).json({ message: '権限がありません' }); return; }

    // Determine number of weeks based on role
    // onsite_leader: 3 weeks max, GM/BOD/Admin: configurable
    const isOnsiteLeader = user.role === 'onsite_leader';
    const requestedWeeks = req.query.weeks ? parseInt(req.query.weeks as string) : 3;
    const numWeeks = isOnsiteLeader ? 3 : Math.min(requestedWeeks, 52); // Max 1 year

    // Calculate the weeks
    const weeks: { weekStart: string; weekEnd: string }[] = [];
    for (let i = 0; i < numWeeks; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      weeks.push(getWeekDates(date));
    }

    // Get all members based on role (exclude weekly report exempt users)
    let membersQuery = `
      SELECT u.id, u.employee_id, u.name, u.email, u.department, t.name as team
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id AND t.is_active = true
      WHERE (u.weekly_report_exempt IS NULL OR u.weekly_report_exempt = false)
    `;
    const membersParams: (string | number)[] = [];
    let memberParamIndex = 1;

    if (user.role === 'approver') {
      membersQuery += ` AND u.department IN (
        SELECT d.name FROM approvers ap
        JOIN departments d ON ap.department_id = d.id
        WHERE ap.user_id = $${memberParamIndex} AND ap.is_active = true
      )`;
      membersParams.push(user.id);
      memberParamIndex++;
    } else if (user.role === 'onsite_leader') {
      const allowedUserIds = await getUsersUnderAuthority(user.id);

      if (allowedUserIds.length === 0) {
        res.json({
          weeks,
          members: [],
          canLoadMore: false,
        });
        return;
      }

      const placeholders = allowedUserIds.map((_, i) => `$${memberParamIndex + i}`).join(',');
      membersQuery += ` AND u.id IN (${placeholders})`;
      membersParams.push(...allowedUserIds);
      memberParamIndex += allowedUserIds.length;
    }
    membersQuery += ' ORDER BY u.department, u.name';

    const members = await getAll<{
      id: number;
      employee_id: string;
      name: string;
      email: string;
      department: string;
      team: string | null;
    }>(membersQuery, membersParams);

    // Get reports for the specific members and weeks
    // CRITICAL FIX: Filter by both week_start_date AND user_id
    if (members.length === 0) {
      res.json({
        weeks,
        members: [],
        canLoadMore: false,
      });
      return;
    }

    const weekStarts = weeks.map(w => w.weekStart);
    const memberIds = members.map(m => m.id);

    // Build query with proper filtering
    const weekPlaceholders = weekStarts.map((_, i) => `$${i + 1}`).join(',');
    const memberPlaceholders = memberIds.map((_, i) => `$${weekStarts.length + i + 1}`).join(',');

    const reportsQuery = `
      SELECT id, user_id, week_start_date, week_end_date, content, achievements, challenges, next_week_plan, overview, updated_at
      FROM weekly_reports
      WHERE week_start_date IN (${weekPlaceholders})
        AND user_id IN (${memberPlaceholders})
      ORDER BY week_start_date DESC
    `;
    const reports = await getAll<{
      id: number;
      user_id: number;
      week_start_date: string | Date;
      week_end_date: string | Date;
      content: string;
      achievements: string | null;
      challenges: string | null;
      next_week_plan: string | null;
      overview: string | null;
      updated_at: string;
    }>(reportsQuery, [...weekStarts, ...memberIds]);

    // Create a map of reports by user_id and week_start_date
    // IMPORTANT: Convert Date objects to YYYY-MM-DD format for consistent key matching
    const reportMap = new Map<string, typeof reports[0]>();
    reports.forEach(r => {
      const dateStr = r.week_start_date instanceof Date
        ? formatLocalDate(r.week_start_date)
        : r.week_start_date.toString().split('T')[0]; // Handle both Date objects and ISO strings
      reportMap.set(`${r.user_id}-${dateStr}`, r);
    });

    // Build the result
    const result = members.map(member => {
      const memberReports: { [weekStart: string]: typeof reports[0] | null } = {};
      weeks.forEach(week => {
        const key = `${member.id}-${week.weekStart}`;
        memberReports[week.weekStart] = reportMap.get(key) || null;
      });
      return {
        ...member,
        reports: memberReports,
      };
    });

    res.json({
      weeks,
      members: result,
      canLoadMore: !isOnsiteLeader && numWeeks < 52, // Only GM/BOD/Admin can load more
    });
  } catch (error) {
    console.error('Get members reports last 3 weeks error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// Get all reports for a specific member
export const getMemberReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { userId } = req.params;
    const targetUserId = Number(userId);

    if (user.role === 'user' && user.id !== targetUserId) {
      res.status(403).json({ message: '権限がありません' });
      return;
    }

    // Get member info
    const member = await getOne<{
      id: number;
      employee_id: string;
      name: string;
      email: string;
      department: string;
    }>('SELECT id, employee_id, name, email, department FROM users WHERE id = $1', [targetUserId]);

    if (!member) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    // Check if approver has access to this member's department
    if (user.role === 'approver') {
      const hasAccess = await getOne(`
        SELECT 1 FROM approvers ap
        JOIN departments d ON ap.department_id = d.id
        WHERE ap.user_id = $1 AND ap.is_active = true AND d.name = $2
      `, [user.id, member.department]);

      if (!hasAccess) {
        res.status(403).json({ message: '権限がありません' });
        return;
      }
    }

    // Check if onsite_leader has access to this team member
    if (user.role === 'onsite_leader') {
      const allowedUserIds = await getUsersUnderAuthority(user.id);

      if (!allowedUserIds.includes(targetUserId)) {
        res.status(403).json({ message: '権限がありません' });
        return;
      }
    }

    // Get all reports for this member (last 12 weeks)
    const reports = await getAll<{
      id: number;
      week_start_date: string;
      week_end_date: string;
      content: string;
      achievements: string | null;
      challenges: string | null;
      next_week_plan: string | null;
      created_at: string;
      updated_at: string;
    }>(`
      SELECT id, week_start_date, week_end_date, content, achievements, challenges, next_week_plan, created_at, updated_at
      FROM weekly_reports
      WHERE user_id = $1
      ORDER BY week_start_date DESC
      LIMIT 12
    `, [targetUserId]);

    res.json({
      member,
      reports,
    });
  } catch (error) {
    console.error('Get member reports error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// Generate overview from detailed report using AI with failover mechanism
// Primary: Claude AI, Fallback: Gemini AI
export const generateOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content, achievements, challenges, nextWeekPlan } = req.body;

    if (!content?.trim()) {
      res.status(400).json({ message: '報告内容を入力してください' });
      return;
    }

    // Build the detailed report content
    let detailedReport = `今週の報告内容:\n${content}`;
    if (achievements?.trim()) {
      detailedReport += `\n\n成果・達成事項:\n${achievements}`;
    }
    if (challenges?.trim()) {
      detailedReport += `\n\n課題・問題点:\n${challenges}`;
    }
    if (nextWeekPlan?.trim()) {
      detailedReport += `\n\n来週の予定:\n${nextWeekPlan}`;
    }

    const prompt = `以下の詳細な週次報告から、部署の全メンバーが理解できる簡潔なoverviewを作成してください。
この報告者がどのプロジェクトで何をしているかが一目でわかるように、3-5文程度にまとめてください。

詳細報告:
${detailedReport}

要件:
- 簡潔で分かりやすい日本語で記載
- プロジェクト名や主な業務内容を明記
- 3-5文程度にまとめる
- 他のメンバーが読んでも理解できる内容
- 技術用語は必要最小限に

Overview:`;

    let overview = '';
    let usedProvider = '';

    // Try Claude AI first (Primary)
    try {
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      if (anthropicApiKey) {
        console.log('[AI Overview] Trying Claude AI (Primary)...');
        const anthropic = new Anthropic({ apiKey: anthropicApiKey });

        const message = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        });

        overview = message.content[0].type === 'text' ? message.content[0].text : '';
        usedProvider = 'Claude AI';
        console.log('[AI Overview] ✓ Claude AI succeeded');
      }
    } catch (claudeError: any) {
      console.warn('[AI Overview] ✗ Claude AI failed:', claudeError.message);

      // Try Gemini AI as fallback (Secondary)
      try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (geminiApiKey) {
          console.log('[AI Overview] Trying Gemini AI (Fallback)...');
          const genAI = new GoogleGenerativeAI(geminiApiKey);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

          const result = await model.generateContent(prompt);
          const response = await result.response;
          overview = response.text();
          usedProvider = 'Gemini AI';
          console.log('[AI Overview] ✓ Gemini AI succeeded');
        } else {
          throw new Error('Gemini API key not configured');
        }
      } catch (geminiError: any) {
        console.error('[AI Overview] ✗ Gemini AI failed:', geminiError.message);
        throw new Error('両方のAI APIが利用できません。Claude AI と Gemini AI の両方で失敗しました。');
      }
    }

    if (!overview) {
      throw new Error('Overview生成に失敗しました');
    }

    res.json({ overview, usedProvider });
  } catch (error: any) {
    console.error('[AI Overview] Generate overview error:', error);
    const errorMessage = error?.message || 'Overview生成に失敗しました';
    res.status(500).json({ message: errorMessage });
  }
};

// Export weekly reports to Excel with filters
export const exportToExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    // Check permissions - only for onsite_leader, gm, bod, admin
    const allowedRoles = ['onsite_leader', 'gm', 'bod', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ message: '権限がありません' });
      return;
    }

    const { department, team, startDate, endDate } = req.query;

    // Build query based on user role and filters
    let query = `
      SELECT
        u.employee_id,
        u.name,
        u.department,
        t.name as team_name,
        wr.week_start_date,
        wr.week_end_date,
        wr.content,
        wr.achievements,
        wr.challenges,
        wr.next_week_plan,
        wr.overview,
        wr.created_at,
        wr.updated_at
      FROM weekly_reports wr
      LEFT JOIN users u ON wr.user_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Apply role-based filtering
    let paramIndex = 1;
    if (user.role === 'onsite_leader') {
      const allowedUserIds = await getUsersUnderAuthority(user.id);
      if (allowedUserIds.length === 0) {
        res.status(200).json({ data: [] });
        return;
      }
      const placeholders = allowedUserIds.map((_, i) => `$${paramIndex + i}`).join(',');
      query += ` AND wr.user_id IN (${placeholders})`;
      params.push(...allowedUserIds);
      paramIndex += allowedUserIds.length;
    } else if (user.role === 'gm') {
      // GM can see their department
      query += ` AND u.department = $${paramIndex}`;
      params.push(user.department);
      paramIndex++;
    }
    // admin and bod can see all

    // Apply additional filters
    if (department) {
      query += ` AND u.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    if (team) {
      query += ` AND t.name = $${paramIndex}`;
      params.push(team);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND wr.week_start_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND wr.week_start_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY wr.week_start_date DESC, u.department, u.name`;

    const reports = await getAll(query, params);

    // Format data for Excel
    const excelData = reports.map((report: any) => ({
      '社員番号': report.employee_id,
      '氏名': report.name,
      '部署': report.department,
      'チーム': report.team_name || '',
      '週開始日': report.week_start_date,
      '週終了日': report.week_end_date,
      '報告内容': report.content || '',
      '成果・達成事項': report.achievements || '',
      '課題・問題点': report.challenges || '',
      '来週の予定': report.next_week_plan || '',
      'Overview': report.overview || '',
      '作成日時': report.created_at,
      '更新日時': report.updated_at,
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '週次報告');

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // 社員番号
      { wch: 15 }, // 氏名
      { wch: 15 }, // 部署
      { wch: 15 }, // チーム
      { wch: 12 }, // 週開始日
      { wch: 12 }, // 週終了日
      { wch: 40 }, // 報告内容
      { wch: 30 }, // 成果
      { wch: 30 }, // 課題
      { wch: 30 }, // 来週予定
      { wch: 35 }, // Overview
      { wch: 18 }, // 作成日時
      { wch: 18 }, // 更新日時
    ];
    worksheet['!cols'] = columnWidths;

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    const filename = `weekly_reports_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Send file
    res.send(buffer);
  } catch (error: any) {
    console.error('Export to Excel error:', error);
    res.status(500).json({ message: 'Excel出力に失敗しました' });
  }
};
