import { Response } from 'express';
import { getOne, getAll, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { getUsersUnderAuthority } from '../services/permissionService';

interface Application {
  id: number;
  title: string;
  type: string;
  description: string;
  amount: number | null;
  status: string;
  applicant_id: number;
  approver_id: number | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
}

// 申請一覧取得
export const getApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, type, department, startDate, endDate, search } = req.query;
    const user = req.user!;

    let query = `
      SELECT
        a.*,
        u1.name as applicant_name,
        u1.department as applicant_department,
        u2.name as approver_name,
        CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
      FROM applications a
      LEFT JOIN users u1 ON a.applicant_id = u1.id
      LEFT JOIN users u2 ON a.approver_id = u2.id
      LEFT JOIN favorites f ON a.id = f.application_id AND f.user_id = ?
      WHERE 1=1
    `;
    const params: (string | number)[] = [user.id];

    // ロール別のフィルタリング
    if (user.role === 'user') {
      // 一般ユーザーは自分の申請のみ
      query += ' AND a.applicant_id = ?';
      params.push(user.id);
    } else if (user.role === 'approver') {
      // 承認者は担当部署の申請のみ
      // 承認者が担当する部署名を取得してフィルタリング
      query += ` AND u1.department IN (
        SELECT d.name FROM approvers ap
        JOIN departments d ON ap.department_id = d.id
        WHERE ap.user_id = ? AND ap.is_active = 1
      )`;
      params.push(user.id);
    } else if (user.role === 'onsite_leader') {
      // Onsite leader sees applications from their team members only
      const allowedUserIds = await getUsersUnderAuthority(user.id);

      if (allowedUserIds.length === 0) {
        res.json([]);
        return;
      }

      const placeholders = allowedUserIds.map(() => '?').join(',');
      query += ` AND a.applicant_id IN (${placeholders})`;
      params.push(...allowedUserIds);
    }
    // GM, BOD, 管理者は全件表示 (no additional filtering)

    // 部署フィルター（承認者・管理者向け）
    if (department && department !== 'all') {
      query += ' AND u1.department = ?';
      params.push(department as string);
    }

    if (status && status !== 'all') {
      query += ' AND a.status = ?';
      params.push(status as string);
    }

    if (type && type !== 'all') {
      query += ' AND a.type = ?';
      params.push(type as string);
    }

    // 期間フィルター
    if (startDate) {
      query += ' AND date(a.created_at) >= date(?)';
      params.push(startDate as string);
    }

    if (endDate) {
      query += ' AND date(a.created_at) <= date(?)';
      params.push(endDate as string);
    }

    // フリーワード検索（申請ID、件名）
    if (search) {
      query += ' AND (a.id LIKE ? OR a.title LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY a.created_at DESC';

    const applications = getAll(query, params);
    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 申請詳細取得
export const getApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const application = getOne<Application & { applicant_name: string; applicant_department: string; applicant_email: string; approver_name: string; parent_id: number | null; is_favorite: number }>(`
      SELECT
        a.*,
        u1.name as applicant_name,
        u1.department as applicant_department,
        u1.email as applicant_email,
        u2.name as approver_name,
        CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
      FROM applications a
      LEFT JOIN users u1 ON a.applicant_id = u1.id
      LEFT JOIN users u2 ON a.approver_id = u2.id
      LEFT JOIN favorites f ON a.id = f.application_id AND f.user_id = ?
      WHERE a.id = ?
    `, [user.id, Number(id)]);

    if (!application) {
      res.status(404).json({ message: '申請が見つかりません' });
      return;
    }

    // Check access for onsite_leader
    if (user.role === 'onsite_leader') {
      const allowedUserIds = await getUsersUnderAuthority(user.id);

      if (!allowedUserIds.includes(application.applicant_id)) {
        res.status(403).json({ message: '権限がありません' });
        return;
      }
    }

    // コメント取得
    const comments = getAll(`
      SELECT c.*, u.name as user_name, u.department as user_department
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.application_id = ?
      ORDER BY c.created_at ASC
    `, [Number(id)]);

    // 補足申請（子申請）取得
    const supplementaryApplications = getAll<Application & { applicant_name: string }>(`
      SELECT a.*, u.name as applicant_name
      FROM applications a
      LEFT JOIN users u ON a.applicant_id = u.id
      WHERE a.parent_id = ?
      ORDER BY a.created_at ASC
    `, [Number(id)]);

    // 合計金額計算（親 + 全子申請）
    const parentAmount = application.amount || 0;
    const childrenAmount = supplementaryApplications.reduce((sum, child) => sum + (child.amount || 0), 0);
    const totalAmount = parentAmount + childrenAmount;

    res.json({
      ...application,
      comments,
      supplementary_applications: supplementaryApplications,
      total_amount: totalAmount,
    });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 申請番号生成 (APP-YYYY-NNNNNN)
const generateApplicationNumber = (): string => {
  const year = new Date().getFullYear();
  const prefix = `APP-${year}-`;

  // 今年の申請数を取得
  const result = getOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM applications WHERE application_number LIKE ?`,
    [`${prefix}%`]
  );

  const nextNumber = (result?.count || 0) + 1;
  return `${prefix}${String(nextNumber).padStart(6, '0')}`;
};

// 新規申請作成
export const createApplication = (req: AuthRequest, res: Response): void => {
  try {
    const { title, type, description, amount, isDraft, departmentId, preferredDate, approverId } = req.body;
    const user = req.user!;

    // 下書きの場合はタイトルのみ必須
    if (!isDraft && (!title || !type)) {
      res.status(400).json({ message: 'タイトルと申請種別は必須です' });
      return;
    }

    // 件名の長さチェック
    if (title && title.length > 500) {
      res.status(400).json({ message: '件名は500文字以内で入力してください' });
      return;
    }

    // 説明の長さチェック
    if (description && description.length > 5000) {
      res.status(400).json({ message: '申請内容は5000文字以内で入力してください' });
      return;
    }

    const status = isDraft ? 'draft' : 'pending';
    const applicationNumber = generateApplicationNumber();

    // 部署ID: 管理者は指定可能、一般ユーザーは自分の部署
    const finalDepartmentId = user.role === 'admin' && departmentId ? departmentId : null;

    const result = runQuery(`
      INSERT INTO applications (application_number, title, type, description, amount, applicant_id, approver_id, status, department_id, preferred_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [applicationNumber, title || '', type || '', description || null, amount || null, user.id, approverId || null, status, finalDepartmentId, preferredDate || null]);

    const newApplication = getOne('SELECT * FROM applications WHERE id = ?', [result.lastInsertRowid]);

    res.status(201).json(newApplication);
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 申請更新（下書き編集）
export const updateApplication = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { title, type, description, amount, isDraft, approverId } = req.body;
    const user = req.user!;

    const application = getOne<Application>('SELECT * FROM applications WHERE id = ?', [Number(id)]);

    if (!application) {
      res.status(404).json({ message: '申請が見つかりません' });
      return;
    }

    // 自分の申請かつ下書きまたは審査中のみ編集可能
    if (application.applicant_id !== user.id) {
      res.status(403).json({ message: '編集権限がありません' });
      return;
    }

    if (application.status !== 'draft' && application.status !== 'pending') {
      res.status(400).json({ message: 'この申請は編集できません' });
      return;
    }

    // 提出時はバリデーション
    if (!isDraft && (!title || !type)) {
      res.status(400).json({ message: 'タイトルと申請種別は必須です' });
      return;
    }

    const newStatus = isDraft ? 'draft' : 'pending';

    runQuery(`
      UPDATE applications
      SET title = ?, type = ?, description = ?, amount = ?, approver_id = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [title || '', type || '', description || null, amount || null, approverId || null, newStatus, Number(id)]);

    const updatedApplication = getOne('SELECT * FROM applications WHERE id = ?', [Number(id)]);

    res.json(updatedApplication);
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 下書き削除
export const deleteApplication = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const application = getOne<Application>('SELECT * FROM applications WHERE id = ?', [Number(id)]);

    if (!application) {
      res.status(404).json({ message: '申請が見つかりません' });
      return;
    }

    // 自分の下書きのみ削除可能（管理者は全て削除可能）
    if (application.applicant_id !== user.id && user.role !== 'admin') {
      res.status(403).json({ message: '削除権限がありません' });
      return;
    }

    if (application.status !== 'draft' && user.role !== 'admin') {
      res.status(400).json({ message: '下書き以外は削除できません' });
      return;
    }

    // 添付ファイルも削除
    runQuery('DELETE FROM attachments WHERE application_id = ?', [Number(id)]);
    runQuery('DELETE FROM comments WHERE application_id = ?', [Number(id)]);
    runQuery('DELETE FROM applications WHERE id = ?', [Number(id)]);

    res.json({ message: '申請を削除しました' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 申請承認
export const approveApplication = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const application = getOne<Application>('SELECT * FROM applications WHERE id = ?', [Number(id)]);

    if (!application) {
      res.status(404).json({ message: '申請が見つかりません' });
      return;
    }

    if (application.status !== 'pending') {
      res.status(400).json({ message: 'この申請は既に処理されています' });
      return;
    }

    runQuery(`
      UPDATE applications
      SET status = 'approved', approver_id = ?, approved_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `, [user.id, Number(id)]);

    const updatedApplication = getOne('SELECT * FROM applications WHERE id = ?', [Number(id)]);

    res.json(updatedApplication);
  } catch (error) {
    console.error('Approve application error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 申請却下
export const rejectApplication = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user!;

    const application = getOne<Application>('SELECT * FROM applications WHERE id = ?', [Number(id)]);

    if (!application) {
      res.status(404).json({ message: '申請が見つかりません' });
      return;
    }

    if (application.status !== 'pending') {
      res.status(400).json({ message: 'この申請は既に処理されています' });
      return;
    }

    runQuery(`
      UPDATE applications
      SET status = 'rejected', approver_id = ?, rejection_reason = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [user.id, reason || null, Number(id)]);

    const updatedApplication = getOne('SELECT * FROM applications WHERE id = ?', [Number(id)]);

    res.json(updatedApplication);
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 申請取り下げ
export const withdrawApplication = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const application = getOne<Application>('SELECT * FROM applications WHERE id = ?', [Number(id)]);

    if (!application) {
      res.status(404).json({ message: '申請が見つかりません' });
      return;
    }

    // 自分の申請のみ取り下げ可能
    if (application.applicant_id !== user.id) {
      res.status(403).json({ message: '取り下げ権限がありません' });
      return;
    }

    // pending状態のみ取り下げ可能
    if (application.status !== 'pending') {
      res.status(400).json({ message: '審査中の申請のみ取り下げ可能です' });
      return;
    }

    runQuery(`
      UPDATE applications
      SET status = 'draft', updated_at = datetime('now')
      WHERE id = ?
    `, [Number(id)]);

    const updatedApplication = getOne('SELECT * FROM applications WHERE id = ?', [Number(id)]);

    res.json(updatedApplication);
  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// コメント追加
export const addComment = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const user = req.user!;

    if (!content) {
      res.status(400).json({ message: 'コメント内容を入力してください' });
      return;
    }

    const application = getOne('SELECT * FROM applications WHERE id = ?', [Number(id)]);

    if (!application) {
      res.status(404).json({ message: '申請が見つかりません' });
      return;
    }

    const result = runQuery(`
      INSERT INTO comments (application_id, user_id, content)
      VALUES (?, ?, ?)
    `, [Number(id), user.id, content]);

    const newComment = getOne(`
      SELECT c.*, u.name as user_name, u.department as user_department
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 補足申請作成（tờ trình bổ sung）
export const createSupplementaryApplication = (req: AuthRequest, res: Response): void => {
  try {
    const { parentId } = req.params;
    const { title, description, amount } = req.body;
    const user = req.user!;

    // 親申請の確認
    const parentApplication = getOne<Application>('SELECT * FROM applications WHERE id = ?', [Number(parentId)]);

    if (!parentApplication) {
      res.status(404).json({ message: '親申請が見つかりません' });
      return;
    }

    // 親申請が既に子申請の場合はエラー
    if ((parentApplication as any).parent_id) {
      res.status(400).json({ message: '補足申請に対して補足申請は作成できません' });
      return;
    }

    // 申請者または管理者のみ補足申請を作成可能
    if (parentApplication.applicant_id !== user.id && user.role !== 'admin') {
      res.status(403).json({ message: '補足申請を作成する権限がありません' });
      return;
    }

    if (!title) {
      res.status(400).json({ message: '件名は必須です' });
      return;
    }

    const applicationNumber = generateApplicationNumber();

    const result = runQuery(`
      INSERT INTO applications (application_number, title, type, description, amount, applicant_id, status, parent_id)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `, [applicationNumber, title, parentApplication.type, description || null, amount || null, user.id, Number(parentId)]);

    const newApplication = getOne('SELECT * FROM applications WHERE id = ?', [result.lastInsertRowid]);

    res.status(201).json(newApplication);
  } catch (error) {
    console.error('Create supplementary application error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};
