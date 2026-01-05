import { Response } from 'express';
import { getOne, getAll, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';

// Get all feedback (admin only - see all, users see their own)
export const getAllFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { status } = req.query;

    let query = `
      SELECT f.*, u.name as user_name, u.email as user_email, u.department,
             u2.name as responder_name
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN users u2 ON f.responded_by = u2.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramIndex = 1;

    // Regular users only see their own feedback
    if (user.role !== 'admin') {
      query += ` AND f.user_id = $${paramIndex}`;
      params.push(user.id);
      paramIndex++;
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      query += ` AND f.status = $${paramIndex}`;
      params.push(status as string);
      paramIndex++;
    }

    query += ' ORDER BY f.created_at DESC';

    const feedback = await getAll(query, params);
    res.json(feedback);
  } catch (error) {
    console.error('Get all feedback error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// Get single feedback by ID
export const getFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const feedback = await getOne<{
      id: number;
      user_id: number;
      category: string;
      subject: string;
      content: string;
      status: string;
      admin_response: string | null;
      created_at: string;
      updated_at: string;
      responded_at: string | null;
      responded_by: number | null;
      user_name: string;
      user_email: string;
      department: string;
      responder_name: string | null;
    }>(`
      SELECT f.*, u.name as user_name, u.email as user_email, u.department,
             u2.name as responder_name
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN users u2 ON f.responded_by = u2.id
      WHERE f.id = $1
    `, [Number(id)]);

    if (!feedback) {
      res.status(404).json({ message: 'フィードバックが見つかりません' });
      return;
    }

    // Check access - users can only view their own feedback
    if (user.role !== 'admin' && feedback.user_id !== user.id) {
      res.status(403).json({ message: '権限がありません' });
      return;
    }

    res.json(feedback);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// Create new feedback
export const createFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { category, subject, content } = req.body;

    // Validation
    if (!category || !subject || !content) {
      res.status(400).json({ message: 'カテゴリ、件名、内容は必須です' });
      return;
    }

    if (subject.length > 200) {
      res.status(400).json({ message: '件名は200文字以内で入力してください' });
      return;
    }

    if (content.length > 2000) {
      res.status(400).json({ message: '内容は2000文字以内で入力してください' });
      return;
    }

    // Check if feedback is enabled
    const setting = await getOne<{ setting_value: string }>(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      ['feedback_enabled']
    );

    if (!setting || setting.setting_value !== '1') {
      res.status(403).json({ message: 'フィードバック機能は現在無効になっています' });
      return;
    }

    // Create feedback
    const result = await runQuery(`
      INSERT INTO feedback (user_id, category, subject, content, status)
      VALUES ($1, $2, $3, $4, 'pending') RETURNING id
    `, [user.id, category, subject, content]);

    const newFeedback = await getOne(`
      SELECT f.*, u.name as user_name, u.email as user_email, u.department
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(newFeedback);
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// Update feedback (admin only - for responding)
export const updateFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { status, adminResponse } = req.body;

    // Only admin can update feedback
    if (user.role !== 'admin') {
      res.status(403).json({ message: '権限がありません' });
      return;
    }

    // Check if feedback exists
    const existingFeedback = await getOne<{ id: number }>(
      'SELECT id FROM feedback WHERE id = $1',
      [Number(id)]
    );

    if (!existingFeedback) {
      res.status(404).json({ message: 'フィードバックが見つかりません' });
      return;
    }

    // Update feedback
    const responded_by = adminResponse ? user.id : null;

    await runQuery(`
      UPDATE feedback
      SET status = COALESCE($1, status),
          admin_response = COALESCE($2, admin_response),
          responded_at = ${adminResponse ? 'NOW()' : 'responded_at'},
          responded_by = COALESCE($3, responded_by),
          updated_at = NOW()
      WHERE id = $4
    `, [status || null, adminResponse || null, responded_by, Number(id)]);

    const updatedFeedback = await getOne(`
      SELECT f.*, u.name as user_name, u.email as user_email, u.department,
             u2.name as responder_name
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN users u2 ON f.responded_by = u2.id
      WHERE f.id = $1
    `, [Number(id)]);

    res.json(updatedFeedback);
  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// Delete feedback (admin only)
export const deleteFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Only admin can delete feedback
    if (user.role !== 'admin') {
      res.status(403).json({ message: '権限がありません' });
      return;
    }

    // Check if feedback exists
    const existingFeedback = await getOne<{ id: number }>(
      'SELECT id FROM feedback WHERE id = $1',
      [Number(id)]
    );

    if (!existingFeedback) {
      res.status(404).json({ message: 'フィードバックが見つかりません' });
      return;
    }

    // Delete feedback
    await runQuery('DELETE FROM feedback WHERE id = $1', [Number(id)]);

    res.json({ message: 'フィードバックを削除しました' });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};
