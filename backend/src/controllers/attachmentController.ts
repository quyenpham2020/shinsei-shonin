import { Response } from 'express';
import { getOne, getAll, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Helper function to decode filename properly (handles Japanese and other non-ASCII characters)
const decodeFilename = (filename: string): string => {
  try {
    // If the string already contains valid Japanese characters, return as-is
    const hasJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff00-\uffef]/.test(filename);
    if (hasJapanese) {
      return filename;
    }

    // Try to decode as UTF-8 bytes stored in latin1 string (common browser behavior)
    const utf8Decoded = Buffer.from(filename, 'latin1').toString('utf8');

    // Check if decoded result contains valid characters (no replacement char)
    if (!utf8Decoded.includes('\ufffd')) {
      // Verify it actually changed and looks like valid text
      const hasDecodedJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff00-\uffef]/.test(utf8Decoded);
      if (hasDecodedJapanese || utf8Decoded !== filename) {
        return utf8Decoded;
      }
    }

    // Return original if no decoding needed or possible
    return filename;
  } catch {
    return filename;
  }
};

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

interface Attachment {
  id: number;
  application_id: number;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size: number;
  uploaded_by: number;
  created_at: string;
}

// 添付ファイルアップロード
export const uploadAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const user = req.user!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'ファイルが選択されていません' });
      return;
    }

    // Check if application exists
    const application = await getOne('SELECT * FROM applications WHERE id = $1', [Number(applicationId)]);
    if (!application) {
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      res.status(404).json({ message: '申請が見つかりません' });
      return;
    }

    // Decode original filename to handle Japanese and other non-ASCII characters
    const originalName = decodeFilename(file.originalname);
    const storedName = `${uuidv4()}${path.extname(originalName)}`;
    const storedPath = path.join(UPLOAD_DIR, storedName);

    // Move file to uploads directory
    fs.renameSync(file.path, storedPath);

    const result = await runQuery(`
      INSERT INTO attachments (application_id, original_name, stored_name, mime_type, size, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `, [Number(applicationId), originalName, storedName, file.mimetype, file.size, user.id]);

    const attachment = await getOne<Attachment>('SELECT * FROM attachments WHERE id = $1', [result.rows[0].id]);

    res.status(201).json(attachment);
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ message: 'ファイルのアップロードに失敗しました' });
  }
};

// 添付ファイル一覧取得
export const getAttachments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;

    const attachments = await getAll<Attachment>(`
      SELECT a.*, u.name as uploader_name
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.application_id = $1
      ORDER BY a.created_at ASC
    `, [Number(applicationId)]);

    res.json(attachments);
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ message: '添付ファイルの取得に失敗しました' });
  }
};

// 添付ファイルダウンロード
export const downloadAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const attachment = await getOne<Attachment>('SELECT * FROM attachments WHERE id = $1', [Number(id)]);

    if (!attachment) {
      res.status(404).json({ message: '添付ファイルが見つかりません' });
      return;
    }

    const filePath = path.join(UPLOAD_DIR, attachment.stored_name);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'ファイルが見つかりません' });
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachment.original_name)}`);
    res.setHeader('Content-Type', attachment.mime_type);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ message: 'ファイルのダウンロードに失敗しました' });
  }
};

// 添付ファイル削除
export const deleteAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const attachment = await getOne<Attachment>('SELECT * FROM attachments WHERE id = $1', [Number(id)]);

    if (!attachment) {
      res.status(404).json({ message: '添付ファイルが見つかりません' });
      return;
    }

    // Only uploader or admin can delete
    if (attachment.uploaded_by !== user.id && user.role !== 'admin') {
      res.status(403).json({ message: '削除権限がありません' });
      return;
    }

    // Delete file from disk
    const filePath = path.join(UPLOAD_DIR, attachment.stored_name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await runQuery('DELETE FROM attachments WHERE id = $1', [Number(id)]);

    res.json({ message: '添付ファイルを削除しました' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ message: '添付ファイルの削除に失敗しました' });
  }
};
