import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { feedbackService, Feedback } from '../services/feedbackService';

const CATEGORIES: Record<string, string> = {
  feature_request: '新機能のリクエスト',
  bug_report: 'バグ報告',
  improvement: '改善提案',
  question: '質問',
  other: 'その他',
};

const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' }> = {
  pending: { label: '未対応', color: 'warning' },
  responded: { label: '対応済み', color: 'success' },
  closed: { label: 'クローズ', color: 'default' },
};

const FeedbackManagementPage: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialog state
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, [statusFilter]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const feedback = await feedbackService.getAll(statusFilter);
      setFeedbackList(feedback);
    } catch (err: any) {
      setError('フィードバックの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setResponseText(feedback.adminResponse || '');
    setNewStatus(feedback.status);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedFeedback(null);
    setResponseText('');
    setNewStatus('');
  };

  const handleSubmitResponse = async () => {
    if (!selectedFeedback) return;

    try {
      setSubmitting(true);
      setError(null);
      await feedbackService.update(selectedFeedback.id, {
        status: newStatus,
        adminResponse: responseText,
      });
      setSuccess('フィードバックを更新しました');
      handleCloseDialog();
      loadFeedback();
    } catch (err: any) {
      setError(err.response?.data?.message || '更新に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('このフィードバックを削除してもよろしいですか？')) {
      return;
    }

    try {
      await feedbackService.delete(id);
      setSuccess('フィードバックを削除しました');
      loadFeedback();
    } catch (err: any) {
      setError(err.response?.data?.message || '削除に失敗しました');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        フィードバック管理
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Card>
        <CardContent>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">フィードバック一覧</Typography>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>ステータス</InputLabel>
              <Select
                value={statusFilter}
                label="ステータス"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="pending">未対応</MenuItem>
                <MenuItem value="responded">対応済み</MenuItem>
                <MenuItem value="closed">クローズ</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : feedbackList.length === 0 ? (
            <Alert severity="info">フィードバックがありません</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>ユーザー</TableCell>
                    <TableCell>カテゴリ</TableCell>
                    <TableCell>件名</TableCell>
                    <TableCell>ステータス</TableCell>
                    <TableCell>送信日時</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {feedbackList.map((feedback) => (
                    <TableRow key={feedback.id} hover>
                      <TableCell>{feedback.id}</TableCell>
                      <TableCell>
                        {feedback.userName}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {feedback.department}
                        </Typography>
                      </TableCell>
                      <TableCell>{CATEGORIES[feedback.category] || feedback.category}</TableCell>
                      <TableCell>{feedback.subject}</TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABELS[feedback.status]?.label || feedback.status}
                          color={STATUS_LABELS[feedback.status]?.color || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(feedback.createdAt).toLocaleString('ja-JP')}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleViewDetails(feedback)}
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(feedback.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>フィードバック詳細</DialogTitle>
        <DialogContent>
          {selectedFeedback && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">送信者</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedFeedback.userName} ({selectedFeedback.department})
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">カテゴリ</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {CATEGORIES[selectedFeedback.category] || selectedFeedback.category}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">件名</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedFeedback.subject}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">内容</Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 2, whiteSpace: 'pre-wrap' }}>
                {selectedFeedback.content}
              </Paper>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={newStatus}
                  label="ステータス"
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <MenuItem value="pending">未対応</MenuItem>
                  <MenuItem value="responded">対応済み</MenuItem>
                  <MenuItem value="closed">クローズ</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="管理者からの回答"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                multiline
                rows={4}
                placeholder="ユーザーへの回答を入力してください"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>キャンセル</Button>
          <Button
            onClick={handleSubmitResponse}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? '更新中...' : '更新'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FeedbackManagementPage;
