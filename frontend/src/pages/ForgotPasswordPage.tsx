import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { passwordService } from '../services/passwordService';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await passwordService.requestReset({ employeeId, email });
      setSuccess(true);
      // For demo purposes, show the reset token
      if (response.resetToken) {
        setResetToken(response.resetToken);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'パスワードリセットの申請に失敗しました';
      setError(errorMessage || 'パスワードリセットの申請に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 400, width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" component="h1" sx={{ mb: 3, fontWeight: 700, textAlign: 'center' }}>
              メール送信完了
            </Typography>
            <Alert severity="success" sx={{ mb: 3 }}>
              パスワードリセットのリクエストを受け付けました。
              登録されているメールアドレスにリセットリンクが送信されます。
            </Alert>

            {/* Demo mode: show reset link directly */}
            {resetToken && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>デモモード:</strong> 以下のリンクからパスワードをリセットできます。
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => navigate(`/reset-password/${resetToken}`)}
                  sx={{ mt: 1 }}
                >
                  パスワードをリセット
                </Button>
              </Alert>
            )}

            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate('/login')}
            >
              ログインページに戻る
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" sx={{ mb: 1, fontWeight: 700, textAlign: 'center' }}>
            パスワードリセット
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            社員IDとメールアドレスを入力してください
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="社員ID"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              sx={{ mb: 2 }}
              disabled={isLoading}
            />
            <TextField
              fullWidth
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 3 }}
              disabled={isLoading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading || !employeeId || !email}
              sx={{ mb: 2 }}
            >
              {isLoading ? <CircularProgress size={24} /> : 'リセットリンクを送信'}
            </Button>
            <Button
              fullWidth
              variant="text"
              startIcon={<ArrowBackIcon />}
              component={Link}
              to="/login"
            >
              ログインページに戻る
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPasswordPage;
