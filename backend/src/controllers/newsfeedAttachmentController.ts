import { Response } from 'express';
import { getOne, getAll, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { storageService, StorageType } from '../services/storageService';

const UPLOAD_DIR = path.join(__dirname, '../../uploads/newsfeed');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

interface NewsfeedAttachment {
  id: number;
  post_id?: number;
  comment_id?: number;
  original_name: string;
  stored_name: string;
  mime_type: string;
  file_type: string;
  size: number;
  uploaded_by: number;
  storage_type: StorageType;
  storage_path?: string;
  created_at: string;
}

// Helper function to determine file type from mime type
const getFileType = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'file';
};

// Upload attachment for post
export const uploadPostAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const user = req.user!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'ファイルが選択されていません' });
      return;
    }

    // Check if post exists
    const post = await getOne('SELECT * FROM newsfeed_posts WHERE id = $1', [Number(postId)]);
    if (!post) {
      fs.unlinkSync(file.path);
      res.status(404).json({ message: '投稿が見つかりません' });
      return;
    }

    const storedName = `${uuidv4()}${path.extname(file.originalname)}`;
    const fileType = getFileType(file.mimetype);

    // Upload file using storage service
    const uploadResult = await storageService.uploadFile(file, storedName);

    const result = await runQuery(`
      INSERT INTO newsfeed_attachments (post_id, original_name, stored_name, mime_type, file_type, size, uploaded_by, storage_type, storage_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `, [
      Number(postId),
      file.originalname,
      uploadResult.stored_name,
      file.mimetype,
      fileType,
      file.size,
      user.id,
      uploadResult.storage_type,
      uploadResult.storage_path
    ]);

    const attachment = await getOne<NewsfeedAttachment>(
      'SELECT * FROM newsfeed_attachments WHERE id = $1',
      [result.rows[0].id]
    );

    res.status(201).json(attachment);
  } catch (error) {
    console.error('Upload post attachment error:', error);
    res.status(500).json({ message: 'ファイルのアップロードに失敗しました' });
  }
};

// Upload attachment for comment
export const uploadCommentAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const user = req.user!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'ファイルが選択されていません' });
      return;
    }

    // Check if comment exists
    const comment = await getOne('SELECT * FROM newsfeed_comments WHERE id = $1', [Number(commentId)]);
    if (!comment) {
      fs.unlinkSync(file.path);
      res.status(404).json({ message: 'コメントが見つかりません' });
      return;
    }

    const storedName = `${uuidv4()}${path.extname(file.originalname)}`;
    const fileType = getFileType(file.mimetype);

    // Upload file using storage service
    const uploadResult = await storageService.uploadFile(file, storedName);

    const result = await runQuery(`
      INSERT INTO newsfeed_attachments (comment_id, original_name, stored_name, mime_type, file_type, size, uploaded_by, storage_type, storage_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `, [
      Number(commentId),
      file.originalname,
      uploadResult.stored_name,
      file.mimetype,
      fileType,
      file.size,
      user.id,
      uploadResult.storage_type,
      uploadResult.storage_path
    ]);

    const attachment = await getOne<NewsfeedAttachment>(
      'SELECT * FROM newsfeed_attachments WHERE id = $1',
      [result.rows[0].id]
    );

    res.status(201).json(attachment);
  } catch (error) {
    console.error('Upload comment attachment error:', error);
    res.status(500).json({ message: 'ファイルのアップロードに失敗しました' });
  }
};

// Get attachments for post
export const getPostAttachments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;

    const attachments = await getAll<NewsfeedAttachment>(`
      SELECT a.*, u.name as uploader_name
      FROM newsfeed_attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.post_id = $1
      ORDER BY a.created_at ASC
    `, [Number(postId)]);

    res.json(attachments);
  } catch (error) {
    console.error('Get post attachments error:', error);
    res.status(500).json({ message: '添付ファイルの取得に失敗しました' });
  }
};

// Get attachments for comment
export const getCommentAttachments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;

    const attachments = await getAll<NewsfeedAttachment>(`
      SELECT a.*, u.name as uploader_name
      FROM newsfeed_attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.comment_id = $1
      ORDER BY a.created_at ASC
    `, [Number(commentId)]);

    res.json(attachments);
  } catch (error) {
    console.error('Get comment attachments error:', error);
    res.status(500).json({ message: '添付ファイルの取得に失敗しました' });
  }
};

// Download/view attachment
export const viewAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const attachment = await getOne<NewsfeedAttachment>(
      'SELECT * FROM newsfeed_attachments WHERE id = $1',
      [Number(id)]
    );

    if (!attachment) {
      res.status(404).json({ message: '添付ファイルが見つかりません' });
      return;
    }

    const storageType = attachment.storage_type || 'local';

    // For cloud storage, redirect to presigned URL
    if (storageType !== 'local') {
      const url = await storageService.getFileUrl(
        attachment.stored_name,
        storageType,
        attachment.storage_path
      );
      // Return URL for cloud storage
      res.json({ url });
      return;
    }

    // For local storage, serve file directly
    const filePath = path.join(UPLOAD_DIR, attachment.stored_name);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'ファイルが見つかりません' });
      return;
    }

    // Set headers to prevent download
    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Disable right-click save
    res.setHeader('Cache-Control', 'no-store, must-revalidate');

    res.sendFile(filePath);
  } catch (error) {
    console.error('View attachment error:', error);
    res.status(500).json({ message: 'ファイルの表示に失敗しました' });
  }
};

// Delete attachment
export const deleteAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const attachment = await getOne<NewsfeedAttachment>(
      'SELECT * FROM newsfeed_attachments WHERE id = $1',
      [Number(id)]
    );

    if (!attachment) {
      res.status(404).json({ message: '添付ファイルが見つかりません' });
      return;
    }

    // Only uploader or admin can delete
    if (attachment.uploaded_by !== user.id && user.role !== 'admin') {
      res.status(403).json({ message: '削除権限がありません' });
      return;
    }

    // Delete file using storage service
    const storageType = attachment.storage_type || 'local';
    await storageService.deleteFile(
      attachment.stored_name,
      storageType,
      attachment.storage_path
    );

    // Delete from database
    await runQuery('DELETE FROM newsfeed_attachments WHERE id = $1', [Number(id)]);

    res.json({ message: '添付ファイルを削除しました' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ message: '添付ファイルの削除に失敗しました' });
  }
};
