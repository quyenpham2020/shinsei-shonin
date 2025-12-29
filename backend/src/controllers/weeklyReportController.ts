import { Response } from 'express';
import { getOne, getAll, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { getUsersUnderAuthority } from '../services/permissionService';
import Anthropic from '@anthropic-ai/sdk';

interface WeeklyReport {
  id: number;
  user_id: number;
  week_start: string;
  week_end: string;
  content: string;
  achievements: string | null;
  challenges: string | null;
  next_week_plan: string | null;
  created_at: string;
  updated_at: string;
}

const getWeekDates = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  };
};

export const getMyReports = (req: AuthRequest, res: Response): void => {
  try {
    const user = req.user!;
    const reports = getAll(`
      SELECT wr.*, u.name as user_name, u.department
      FROM weekly_reports wr
      LEFT JOIN users u ON wr.user_id = u.id
      WHERE wr.user_id = ?
      ORDER BY wr.week_start DESC
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
    if (user.role === 'approver') {
      query += ` AND u.department IN (SELECT d.name FROM approvers ap JOIN departments d ON ap.department_id = d.id WHERE ap.user_id = ? AND ap.is_active = 1)`;
      params.push(user.id);
    } else if (user.role === 'onsite_leader') {
      const allowedUserIds = await getUsersUnderAuthority(user.id);

      if (allowedUserIds.length === 0) {
        res.json([]);
        return;
      }

      const placeholders = allowedUserIds.map(() => '?').join(',');
      query += ` AND wr.user_id IN (${placeholders})`;
      params.push(...allowedUserIds);
    }
    if (weekStart) { query += ' AND wr.week_start >= ?'; params.push(weekStart as string); }
    if (weekEnd) { query += ' AND wr.week_start <= ?'; params.push(weekEnd as string); }
    query += ' ORDER BY wr.week_start DESC, u.department, u.name';
    res.json(getAll(query, params));
  } catch (error) {
    console.error('Get department reports error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

export const getReportsForComparison = (req: AuthRequest, res: Response): void => {
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
    const currentReport = getOne(`SELECT * FROM weekly_reports WHERE user_id = ? AND week_start = ?`, [targetUserId, currentWeek.weekStart]);
    const previousReport = getOne(`SELECT * FROM weekly_reports WHERE user_id = ? AND week_start = ?`, [targetUserId, prevWeek.weekStart]);
    res.json({
      currentWeek: { ...currentWeek, report: currentReport || null },
      previousWeek: { ...prevWeek, report: previousReport || null },
    });
  } catch (error) {
    console.error('Get reports for comparison error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

export const createOrUpdateReport = (req: AuthRequest, res: Response): void => {
  try {
    const user = req.user!;
    const { content, achievements, challenges, nextWeekPlan, overview, weekStart } = req.body;
    if (!content) {
      res.status(400).json({ message: '報告内容は必須です' });
      return;
    }
    const targetWeek = weekStart ? { weekStart, weekEnd: '' } : getWeekDates();
    if (!weekStart) {
      targetWeek.weekEnd = getWeekDates().weekEnd;
    } else {
      const startDate = new Date(weekStart);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      targetWeek.weekEnd = endDate.toISOString().split('T')[0];
    }
    const existingReport = getOne<WeeklyReport>(`SELECT * FROM weekly_reports WHERE user_id = ? AND week_start = ?`, [user.id, targetWeek.weekStart]);
    if (existingReport) {
      runQuery(`UPDATE weekly_reports SET content = ?, achievements = ?, challenges = ?, next_week_plan = ?, overview = ?, updated_at = datetime('now') WHERE id = ?`,
        [content, achievements || null, challenges || null, nextWeekPlan || null, overview || null, existingReport.id]);
      const updatedReport = getOne('SELECT * FROM weekly_reports WHERE id = ?', [existingReport.id]);
      res.json({ message: 'レポートを更新しました', report: updatedReport });
    } else {
      const result = runQuery(`INSERT INTO weekly_reports (user_id, week_start, week_end, content, achievements, challenges, next_week_plan, overview) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [user.id, targetWeek.weekStart, targetWeek.weekEnd, content, achievements || null, challenges || null, nextWeekPlan || null, overview || null]);
      const newReport = getOne('SELECT * FROM weekly_reports WHERE id = ?', [result.lastInsertRowid]);
      res.status(201).json({ message: 'レポートを作成しました', report: newReport });
    }
  } catch (error) {
    console.error('Create/update report error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

export const getReport = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const report = getOne<WeeklyReport & { user_name: string; department: string }>(`SELECT wr.*, u.name as user_name, u.department FROM weekly_reports wr LEFT JOIN users u ON wr.user_id = u.id WHERE wr.id = ?`, [Number(id)]);
    if (!report) { res.status(404).json({ message: 'レポートが見つかりません' }); return; }
    if (report.user_id !== user.id && user.role === 'user') { res.status(403).json({ message: '権限がありません' }); return; }
    res.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

export const deleteReport = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const report = getOne<WeeklyReport>('SELECT * FROM weekly_reports WHERE id = ?', [Number(id)]);
    if (!report) { res.status(404).json({ message: 'レポートが見つかりません' }); return; }
    if (report.user_id !== user.id && user.role !== 'admin') { res.status(403).json({ message: '削除権限がありません' }); return; }
    runQuery('DELETE FROM weekly_reports WHERE id = ?', [Number(id)]);
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
    let query = `SELECT u.id, u.employee_id, u.name, u.email, u.department FROM users u WHERE u.id NOT IN (SELECT user_id FROM weekly_reports WHERE week_start = ?) AND (u.weekly_report_exempt IS NULL OR u.weekly_report_exempt = 0)`;
    const params: (string | number)[] = [currentWeek.weekStart];
    if (user.role === 'approver') {
      query += ` AND u.department IN (SELECT d.name FROM approvers ap JOIN departments d ON ap.department_id = d.id WHERE ap.user_id = ? AND ap.is_active = 1)`;
      params.push(user.id);
    } else if (user.role === 'onsite_leader') {
      const allowedUserIds = await getUsersUnderAuthority(user.id);

      if (allowedUserIds.length === 0) {
        res.json({ weekStart: currentWeek.weekStart, weekEnd: currentWeek.weekEnd, pendingUsers: [] });
        return;
      }

      const placeholders = allowedUserIds.map(() => '?').join(',');
      query += ` AND u.id IN (${placeholders})`;
      params.push(...allowedUserIds);
    }
    query += ' ORDER BY u.department, u.name';
    res.json({ weekStart: currentWeek.weekStart, weekEnd: currentWeek.weekEnd, pendingUsers: getAll(query, params) });
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
        wr.next_week_plan, wr.week_start, wr.week_end, wr.updated_at
      FROM users u
      LEFT JOIN weekly_reports wr ON u.id = wr.user_id AND wr.week_start = ?
      WHERE (u.weekly_report_exempt IS NULL OR u.weekly_report_exempt = 0)
    `;
    const params: (string | number)[] = [currentWeek.weekStart];

    if (user.role === 'approver') {
      query += ` AND u.department IN (
        SELECT d.name FROM approvers ap
        JOIN departments d ON ap.department_id = d.id
        WHERE ap.user_id = ? AND ap.is_active = 1
      )`;
      params.push(user.id);
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

      const placeholders = allowedUserIds.map(() => '?').join(',');
      query += ` AND u.id IN (${placeholders})`;
      params.push(...allowedUserIds);
    }
    query += ' ORDER BY u.department, u.name';

    const members = getAll(query, params);
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

// Get members with reports for the last 3 weeks (for leader view)
export const getMembersReportsLast3Weeks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (user.role === 'user') { res.status(403).json({ message: '権限がありません' }); return; }

    // Calculate the last 3 weeks
    const weeks: { weekStart: string; weekEnd: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      weeks.push(getWeekDates(date));
    }

    // Get all members based on role (exclude weekly report exempt users)
    let membersQuery = `SELECT id, employee_id, name, email, department FROM users WHERE (weekly_report_exempt IS NULL OR weekly_report_exempt = 0)`;
    const membersParams: (string | number)[] = [];

    if (user.role === 'approver') {
      membersQuery += ` AND department IN (
        SELECT d.name FROM approvers ap
        JOIN departments d ON ap.department_id = d.id
        WHERE ap.user_id = ? AND ap.is_active = 1
      )`;
      membersParams.push(user.id);
    } else if (user.role === 'onsite_leader') {
      const allowedUserIds = await getUsersUnderAuthority(user.id);

      if (allowedUserIds.length === 0) {
        res.json({
          weeks,
          members: []
        });
        return;
      }

      const placeholders = allowedUserIds.map(() => '?').join(',');
      membersQuery += ` AND id IN (${placeholders})`;
      membersParams.push(...allowedUserIds);
    }
    membersQuery += ' ORDER BY department, name';

    const members = getAll<{
      id: number;
      employee_id: string;
      name: string;
      email: string;
      department: string;
    }>(membersQuery, membersParams);

    // Get reports for all members for the last 3 weeks
    const weekStarts = weeks.map(w => w.weekStart);
    const placeholders = weekStarts.map(() => '?').join(',');

    const reportsQuery = `
      SELECT id, user_id, week_start, week_end, content, achievements, challenges, next_week_plan, updated_at
      FROM weekly_reports
      WHERE week_start IN (${placeholders})
      ORDER BY week_start DESC
    `;
    const reports = getAll<{
      id: number;
      user_id: number;
      week_start: string;
      week_end: string;
      content: string;
      achievements: string | null;
      challenges: string | null;
      next_week_plan: string | null;
      updated_at: string;
    }>(reportsQuery, weekStarts);

    // Create a map of reports by user_id and week_start
    const reportMap = new Map<string, typeof reports[0]>();
    reports.forEach(r => {
      reportMap.set(`${r.user_id}-${r.week_start}`, r);
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
    const member = getOne<{
      id: number;
      employee_id: string;
      name: string;
      email: string;
      department: string;
    }>('SELECT id, employee_id, name, email, department FROM users WHERE id = ?', [targetUserId]);

    if (!member) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    // Check if approver has access to this member's department
    if (user.role === 'approver') {
      const hasAccess = getOne(`
        SELECT 1 FROM approvers ap
        JOIN departments d ON ap.department_id = d.id
        WHERE ap.user_id = ? AND ap.is_active = 1 AND d.name = ?
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
    const reports = getAll<{
      id: number;
      week_start: string;
      week_end: string;
      content: string;
      achievements: string | null;
      challenges: string | null;
      next_week_plan: string | null;
      created_at: string;
      updated_at: string;
    }>(`
      SELECT id, week_start, week_end, content, achievements, challenges, next_week_plan, created_at, updated_at
      FROM weekly_reports
      WHERE user_id = ?
      ORDER BY week_start DESC
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

// Generate overview from detailed report using Claude AI
export const generateOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content, achievements, challenges, nextWeekPlan } = req.body;

    if (!content?.trim()) {
      res.status(400).json({ message: '報告内容を入力してください' });
      return;
    }

    // Initialize Anthropic client
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      res.status(500).json({ message: 'Anthropic API key is not configured' });
      return;
    }

    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

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

    // Call Claude API to generate overview
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `以下の詳細な週次報告から、部署の全メンバーが理解できる簡潔なoverviewを作成してください。
この報告者がどのプロジェクトで何をしているかが一目でわかるように、3-5文程度にまとめてください。

詳細報告:
${detailedReport}

要件:
- 簡潔で分かりやすい日本語で記載
- プロジェクト名や主な業務内容を明記
- 3-5文程度にまとめる
- 他のメンバーが読んでも理解できる内容
- 技術用語は必要最小限に

Overview:`,
        },
      ],
    });

    // Extract the generated overview
    const overview = message.content[0].type === 'text' ? message.content[0].text : '';

    res.json({ overview });
  } catch (error: any) {
    console.error('Generate overview error:', error);
    const errorMessage = error?.message || 'Overview生成に失敗しました';
    res.status(500).json({ message: errorMessage });
  }
};
