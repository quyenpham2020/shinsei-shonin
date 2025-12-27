import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  Feedback as FeedbackIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { feedbackService, CreateFeedbackData, Feedback } from '../services/feedbackService';
import { settingsService } from '../services/settingsService';

const CATEGORIES = [
  { value: 'feature_request', label: '新機能のリクエスト' },
  { value: 'bug_report', label: 'バグ報告' },
  { value: 'improvement', label: '改善提案' },
  { value: 'question', label: '質問' },
  { value: 'other', label: 'その他' },
];

const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' }> = {
  pending: { label: '未対応', color: 'warning' },
  responded: { label: '対応済み', color: 'success' },
  closed: { label: 'クローズ', color: 'default' },
};

const FeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [formData, setFormData] = useState<CreateFeedbackData>({
    category: '',
    subject: '',
    content: '',
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [feedbackEnabled, setFeedbackEnabled] = useState(true);
  const [checkingSettings, setCheckingSettings] = useState(true);

  // Form errors
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    checkFeedbackEnabled();
    loadMyFeedback();
  }, []);

  const checkFeedbackEnabled = async () => {
    try {
      const setting = await settingsService.getPublicSetting('feedback_enabled');
      setFeedbackEnabled(setting.enabled);
    } catch (err) {
      console.error('Failed to check feedback setting:', err);
      setFeedbackEnabled(false);
    } finally {
      setCheckingSettings(false);
    }
  };

  const loadMyFeedback = async () => {
    try {
      setLoading(true);
      const feedback = await feedbackService.getAll();
      setFeedbackList(feedback);
    } catch (err: any) {
      console.error('Failed to load feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.category) {
      errors.category = 'カテゴリは必須です';
    }

    if (!formData.subject) {
      errors.subject = '件名は必須です';
    } else if (formData.subject.length > 200) {
      errors.subject = '件名は200文字以内で入力してください';
    }

    if (!formData.content) {
      errors.content = '内容は必須です';
    } else if (formData.content.length > 2000) {
      errors.content = '内容は2000文字以内で入力してください';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);
      await feedbackService.create(formData);
      setSuccess('フィードバックを送信しました');
      setFormData({ category: '', subject: '', content: '' });
      setFormErrors({});
      loadMyFeedback();
    } catch (err: any) {
      setError(err.response?.data?.message || 'フィードバックの送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CreateFeedbackData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  if (checkingSettings) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!feedbackEnabled) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          フィードバック機能は現在無効になっています。管理者にお問い合わせください。
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FeedbackIcon /> フィードバック
      </Typography>

      {/* Submit Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            新しいフィードバックを送信
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }} error={!!formErrors.category}>
              <InputLabel>カテゴリ *</InputLabel>
              <Select
                value={formData.category}
                label="カテゴリ *"
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.category && (
                <Typography variant="caption" color="error">
                  {formErrors.category}
                </Typography>
              )}
            </FormControl>

            <TextField
              fullWidth
              label="件名"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              error={!!formErrors.subject}
              helperText={formErrors.subject || `${formData.subject.length}/200`}
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="内容"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              error={!!formErrors.content}
              helperText={formErrors.content || `${formData.content.length}/2000`}
              required
              multiline
              rows={6}
              sx={{ mb: 2 }}
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
            >
              {submitting ? '送信中...' : '送信'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* My Feedback List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            送信履歴
          </Typography>

          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : feedbackList.length === 0 ? (
            <Alert severity="info">まだフィードバックを送信していません</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>カテゴリ</TableCell>
                    <TableCell>件名</TableCell>
                    <TableCell>ステータス</TableCell>
                    <TableCell>送信日時</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {feedbackList.map((feedback) => (
                    <TableRow key={feedback.id} hover>
                      <TableCell>
                        {CATEGORIES.find((c) => c.value === feedback.category)?.label || feedback.category}
                      </TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default FeedbackPage;
