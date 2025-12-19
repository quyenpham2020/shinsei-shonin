import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Grid,
  Divider,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Avatar,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AttachFile as AttachFileIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { applicationService } from '../services/applicationService';
import { applicationTypeService, ApplicationType as ApplicationTypeModel } from '../services/applicationTypeService';
import { attachmentService, Attachment } from '../services/attachmentService';
import {
  Application,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
} from '../types';

const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [applicationTypes, setApplicationTypes] = useState<ApplicationTypeModel[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appData, types, attachs] = await Promise.all([
          applicationService.getById(Number(id)),
          applicationTypeService.getAll(),
          attachmentService.getByApplicationId(Number(id))
        ]);
        setApplication(appData);
        setApplicationTypes(types);
        setAttachments(attachs);
      } catch (err) {
        console.error('Failed to fetch application:', err);
        setError('申請の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleApprove = async () => {
    if (!application) return;
    setIsSubmitting(true);
    try {
      await applicationService.approve(application.id);
      const updated = await applicationService.getById(application.id);
      setApplication(updated);
    } catch (err) {
      console.error('Failed to approve:', err);
      setError('承認に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!application) return;
    setIsSubmitting(true);
    try {
      await applicationService.reject(application.id, rejectReason);
      const updated = await applicationService.getById(application.id);
      setApplication(updated);
      setRejectDialogOpen(false);
      setRejectReason('');
    } catch (err) {
      console.error('Failed to reject:', err);
      setError('却下に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!application || !comment.trim()) return;
    setIsSubmitting(true);
    try {
      await applicationService.addComment(application.id, comment);
      const updated = await applicationService.getById(application.id);
      setApplication(updated);
      setComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
      setError('コメントの追加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const formatAmount = (amount: number | null) => {
    if (amount === null) return '-';
    return `¥${amount.toLocaleString()}`;
  };

  const getTypeLabel = (typeCode: string) => {
    const appType = applicationTypes.find(t => t.code === typeCode);
    return appType?.name || typeCode;
  };

  const canApprove = user?.role === 'approver' || user?.role === 'admin';
  const canEdit = application?.applicant_id === user?.id || user?.role === 'admin';

  // Attachment helpers
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon color="primary" />;
    if (mimeType === 'application/pdf') return <PdfIcon color="error" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <DocIcon color="info" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <DocIcon color="success" />;
    return <FileIcon />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    try {
      await attachmentService.download(attachment.id, attachment.original_name);
    } catch (err) {
      console.error('Failed to download attachment:', err);
      setError('ファイルのダウンロードに失敗しました');
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm('添付ファイルを削除しますか？')) return;
    try {
      await attachmentService.delete(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      setError('添付ファイルの削除に失敗しました');
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !application) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const attachment = await attachmentService.upload(application.id, file);
        setAttachments((prev) => [...prev, attachment]);
      }
    } catch (err) {
      console.error('Failed to upload attachment:', err);
      setError('ファイルのアップロードに失敗しました');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!application) {
    return (
      <Box>
        <Alert severity="error">申請が見つかりません</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/applications')} sx={{ mt: 2 }}>
          一覧に戻る
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/applications')} sx={{ mb: 2 }}>
        一覧に戻る
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {application.title}
              </Typography>
              <Chip
                label={APPLICATION_STATUS_LABELS[application.status]}
                color={APPLICATION_STATUS_COLORS[application.status]}
              />
            </Box>
            {canApprove && application.status === 'pending' && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                >
                  承認
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={isSubmitting}
                >
                  却下
                </Button>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                申請種別
              </Typography>
              <Typography variant="body1">{getTypeLabel(application.type)}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                金額
              </Typography>
              <Typography variant="body1">{formatAmount(application.amount)}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                申請者
              </Typography>
              <Typography variant="body1">
                {application.applicant_name} ({application.applicant_department})
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                申請日時
              </Typography>
              <Typography variant="body1">{formatDate(application.created_at)}</Typography>
            </Grid>
            {application.approver_name && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  承認者
                </Typography>
                <Typography variant="body1">{application.approver_name}</Typography>
              </Grid>
            )}
            {application.approved_at && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  承認日時
                </Typography>
                <Typography variant="body1">{formatDate(application.approved_at)}</Typography>
              </Grid>
            )}
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                説明
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {application.description || '-'}
              </Typography>
            </Grid>
            {application.rejection_reason && (
              <Grid item xs={12}>
                <Alert severity="error">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    却下理由
                  </Typography>
                  <Typography variant="body1">{application.rejection_reason}</Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Attachments Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              <AttachFileIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              添付ファイル ({attachments.length})
            </Typography>
            {canEdit && application.status === 'pending' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                  onClick={handleFileSelect}
                  disabled={isUploading}
                >
                  {isUploading ? 'アップロード中...' : 'ファイルを追加'}
                </Button>
              </>
            )}
          </Box>

          {attachments.length > 0 ? (
            <List>
              {attachments.map((attachment) => (
                <ListItem
                  key={attachment.id}
                  sx={{
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': { bgcolor: 'grey.100' },
                  }}
                >
                  <ListItemIcon>{getFileIcon(attachment.mime_type)}</ListItemIcon>
                  <ListItemText
                    primary={attachment.original_name}
                    secondary={`${formatFileSize(attachment.size)} • ${attachment.uploader_name || ''}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDownloadAttachment(attachment)}
                      title="ダウンロード"
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                    {canEdit && application.status === 'pending' && (
                      <IconButton
                        edge="end"
                        size="small"
                        color="error"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                        title="削除"
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              添付ファイルはありません
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            コメント
          </Typography>

          {application.comments && application.comments.length > 0 ? (
            <List>
              {application.comments.map((c) => (
                <ListItem key={c.id} alignItems="flex-start" sx={{ px: 0 }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>{c.user_name.charAt(0)}</Avatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {c.user_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.user_department}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(c.created_at)}
                        </Typography>
                      </Box>
                    }
                    secondary={c.content}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              コメントはありません
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="コメントを入力..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button
              variant="contained"
              onClick={handleAddComment}
              disabled={isSubmitting || !comment.trim()}
            >
              送信
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>申請を却下</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="却下理由"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>キャンセル</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={isSubmitting}>
            却下
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApplicationDetailPage;
