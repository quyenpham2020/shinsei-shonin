import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  addComment,
  deleteComment,
  toggleLike,
  checkLike,
  toggleReaction,
  getUserReaction,
  getReactionCounts,
} from '../controllers/newsfeedController';
import {
  uploadPostAttachment,
  uploadCommentAttachment,
  getPostAttachments,
  getCommentAttachments,
  viewAttachment,
  deleteAttachment,
} from '../controllers/newsfeedAttachmentController';
import { authenticateToken } from '../middlewares/auth';
import { auditLog } from '../middlewares/auditLog';

const router = Router();

// Temp upload directory
const TEMP_DIR = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Multer configuration for newsfeed
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for media files
  },
  fileFilter: (_req, file, cb) => {
    // Allowed file types for newsfeed
    const allowedTypes = [
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      // Audio
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/aac',
      'audio/m4a',
      'audio/webm',
      // Video (optional)
      'video/mp4',
      'video/webm',
      'video/ogg',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('許可されていないファイル形式です。画像または音声ファイルのみアップロード可能です。'));
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

// Posts
router.get('/', getPosts);
router.get('/:id', getPost);
router.post('/', auditLog('create', 'newsfeed_post'), createPost);
router.put('/:id', auditLog('update', 'newsfeed_post'), updatePost);
router.delete('/:id', auditLog('delete', 'newsfeed_post'), deletePost);

// Comments
router.post('/:id/comments', auditLog('comment', 'newsfeed_post'), addComment);
router.delete('/:id/comments/:commentId', auditLog('delete_comment', 'newsfeed_post'), deleteComment);

// Reactions (new system)
router.post('/:id/reaction', toggleReaction);
router.get('/:id/reaction', getUserReaction);
router.get('/:id/reaction-counts', getReactionCounts);

// Legacy like endpoints (for backward compatibility)
router.post('/:id/like', toggleLike);
router.get('/:id/like/check', checkLike);

// Attachments for posts
router.post('/posts/:postId/attachments', upload.single('file'), uploadPostAttachment);
router.get('/posts/:postId/attachments', getPostAttachments);

// Attachments for comments
router.post('/comments/:commentId/attachments', upload.single('file'), uploadCommentAttachment);
router.get('/comments/:commentId/attachments', getCommentAttachments);

// View/Download attachment
router.get('/attachments/:id', viewAttachment);
router.delete('/attachments/:id', deleteAttachment);

export default router;
