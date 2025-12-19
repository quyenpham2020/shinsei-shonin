import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getOne, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';

interface User {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  password: string;
  department: string;
  role: string;
  must_change_password: number;
  password_changed_at: string | null;
  password_reset_token: string | null;
  password_reset_expires: string | null;
}

// Generate secure random token
const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash token for storage
const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// パスワードリセット申請
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, email } = req.body;

    if (!employeeId || !email) {
      res.status(400).json({ message: '社員IDとメールアドレスを入力してください' });
      return;
    }

    // Find user by employee ID and email
    const user = getOne<User>(
      'SELECT * FROM users WHERE employee_id = ? AND email = ?',
      [employeeId, email]
    );

    if (!user) {
      // Don't reveal if user exists or not for security
      res.json({
        message: 'パスワードリセットのリクエストを受け付けました。登録されているメールアドレスにリセットリンクが送信されます。',
        // In a real app, this would send an email
      });
      return;
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const hashedToken = hashToken(resetToken);

    // Token expires in 1 hour
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Save hashed token to database
    runQuery(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [hashedToken, expires, user.id]
    );

    // In a real application, you would send an email here
    // For demo purposes, we'll return the token directly
    console.log(`Password reset token for ${user.email}: ${resetToken}`);

    res.json({
      message: 'パスワードリセットのリクエストを受け付けました。',
      // For demo purposes only - in production, send via email
      resetToken: resetToken,
      expiresAt: expires,
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'パスワードリセットの申請に失敗しました' });
  }
};

// パスワードリセット (トークン認証)
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ message: 'トークンと新しいパスワードを入力してください' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'パスワードは6文字以上で入力してください' });
      return;
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = hashToken(token);

    // Find user with valid token
    const user = getOne<User>(
      `SELECT * FROM users
       WHERE password_reset_token = ?
       AND password_reset_expires > datetime('now')`,
      [hashedToken]
    );

    if (!user) {
      res.status(400).json({ message: 'トークンが無効または期限切れです' });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    runQuery(
      `UPDATE users SET
        password = ?,
        password_reset_token = NULL,
        password_reset_expires = NULL,
        must_change_password = 0,
        password_changed_at = datetime('now')
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    res.json({ message: 'パスワードが正常にリセットされました' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'パスワードのリセットに失敗しました' });
  }
};

// パスワード変更 (ログイン後)
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: '現在のパスワードと新しいパスワードを入力してください' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'パスワードは6文字以上で入力してください' });
      return;
    }

    // Get user from database to verify current password
    const dbUser = getOne<User>('SELECT * FROM users WHERE id = ?', [user.id]);

    if (!dbUser) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isValidPassword) {
      res.status(400).json({ message: '現在のパスワードが正しくありません' });
      return;
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, dbUser.password);
    if (isSamePassword) {
      res.status(400).json({ message: '新しいパスワードは現在のパスワードと異なるものを設定してください' });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    runQuery(
      `UPDATE users SET
        password = ?,
        must_change_password = 0,
        password_changed_at = datetime('now')
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    res.json({ message: 'パスワードが正常に変更されました' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'パスワードの変更に失敗しました' });
  }
};

// 初回ログイン時パスワード変更 (must_change_password フラグ付き)
export const forceChangePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { newPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({ message: '新しいパスワードを入力してください' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'パスワードは6文字以上で入力してください' });
      return;
    }

    // Get user from database
    const dbUser = getOne<User>('SELECT * FROM users WHERE id = ?', [user.id]);

    if (!dbUser) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, dbUser.password);
    if (isSamePassword) {
      res.status(400).json({ message: '新しいパスワードは現在のパスワードと異なるものを設定してください' });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear must_change_password flag
    runQuery(
      `UPDATE users SET
        password = ?,
        must_change_password = 0,
        password_changed_at = datetime('now')
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    res.json({ message: 'パスワードが正常に変更されました' });
  } catch (error) {
    console.error('Force password change error:', error);
    res.status(500).json({ message: 'パスワードの変更に失敗しました' });
  }
};

// トークン検証 (リセットページ用)
export const verifyResetToken = (req: Request, res: Response): void => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ valid: false, message: 'トークンが指定されていません' });
      return;
    }

    const hashedToken = hashToken(token);

    const user = getOne<User>(
      `SELECT id, employee_id, name FROM users
       WHERE password_reset_token = ?
       AND password_reset_expires > datetime('now')`,
      [hashedToken]
    );

    if (!user) {
      res.status(400).json({ valid: false, message: 'トークンが無効または期限切れです' });
      return;
    }

    res.json({
      valid: true,
      user: {
        employeeId: user.employee_id,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ valid: false, message: 'トークンの検証に失敗しました' });
  }
};
