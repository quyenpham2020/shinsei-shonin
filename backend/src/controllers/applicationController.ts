import { Response } from 'express';
import { getOne, getAll, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';

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
export const getApplications = (req: AuthRequest, res: Response): void => {
  try {
    const { status, type } = req.query;
    const user = req.user!;

    let query = `
      SELECT
        a.*,
        u1.name as applicant_name,
        u1.department as applicant_department,
        u2.name as approver_name
      FROM applications a
      LEFT JOIN users u1 ON a.applicant_id = u1.id
      LEFT JOIN users u2 ON a.approver_id = u2.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    // 一般ユーザーは自分の申請のみ、承認者/管理者は全件表示
    if (user.role === 'user') {
      query += ' AND a.applicant_id = ?';
      params.push(user.id);
    }

    if (status && status !== 'all') {
      query += ' AND a.status = ?';
      params.push(status as string);
    }

    if (type && type !== 'all') {
      query += ' AND a.type = ?';
      params.push(type as string);
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
export const getApplication = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;

    const application = getOne(`
      SELECT
        a.*,
        u1.name as applicant_name,
        u1.department as applicant_department,
        u1.email as applicant_email,
        u2.name as approver_name
      FROM applications a
      LEFT JOIN users u1 ON a.applicant_id = u1.id
      LEFT JOIN users u2 ON a.approver_id = u2.id
      WHERE a.id = ?
    `, [Number(id)]);

    if (!application) {
      res.status(404).json({ message: '申請が見つかりません' });
      return;
    }

    // コメント取得
    const comments = getAll(`
      SELECT c.*, u.name as user_name, u.department as user_department
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.application_id = ?
      ORDER BY c.created_at ASC
    `, [Number(id)]);

    res.json({ ...application, comments });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 新規申請作成
export const createApplication = (req: AuthRequest, res: Response): void => {
  try {
    const { title, type, description, amount } = req.body;
    const user = req.user!;

    if (!title || !type) {
      res.status(400).json({ message: 'タイトルと申請種別は必須です' });
      return;
    }

    const result = runQuery(`
      INSERT INTO applications (title, type, description, amount, applicant_id)
      VALUES (?, ?, ?, ?, ?)
    `, [title, type, description || null, amount || null, user.id]);

    const newApplication = getOne('SELECT * FROM applications WHERE id = ?', [result.lastInsertRowid]);

    res.status(201).json(newApplication);
  } catch (error) {
    console.error('Create application error:', error);
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
