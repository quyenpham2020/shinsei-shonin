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
  Avatar,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { applicationService } from '../services/applicationService';
import {
  Application,
  APPLICATION_STATUS_LABELS,
  APPLICATION_TYPE_LABELS,
  APPLICATION_STATUS_COLORS,
} from '../types';

const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const data = await applicationService.getById(Number(id));
        setApplication(data);
      } catch (err) {
        console.error('Failed to fetch application:', err);
        setError('申請の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    fetchApplication();
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

  const canApprove = user?.role === 'approver' || user?.role === 'admin';

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
              <Typography variant="body1">{APPLICATION_TYPE_LABELS[application.type]}</Typography>
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
