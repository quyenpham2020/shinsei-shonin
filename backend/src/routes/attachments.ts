import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middlewares/auth';
import {
  uploadAttachment,
  getAttachments,
  downloadAttachment,
  deleteAttachment,
} from '../controllers/attachmentController';

const router = Router();

// Temp upload directory
const TEMP_DIR = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Multer configuration
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
      const hasDecodedJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff00-\uffef]/.test(utf8Decoded);
      if (hasDecodedJapanese || utf8Decoded !== filename) {
        return utf8Decoded;
      }
    }

    return filename;
  } catch {
    return filename;
  }
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Decode the original filename to get proper extension
    const decodedName = decodeFilename(file.originalname);
    cb(null, uniqueSuffix + path.extname(decodedName));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('許可されていないファイル形式です'));
    }
  }
});

// Routes
router.post('/applications/:applicationId/attachments', authenticateToken, upload.single('file'), uploadAttachment);
router.get('/applications/:applicationId/attachments', authenticateToken, getAttachments);
router.get('/attachments/:id/download', authenticateToken, downloadAttachment);
router.delete('/attachments/:id', authenticateToken, deleteAttachment);

export default router;
