import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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
import { ArrowBack as ArrowBackIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { passwordService, TokenVerificationResponse } from '../services/passwordService';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenVerificationResponse | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('トークンが指定されていません');
        setIsVerifying(false);
        return;
      }

      try {
        const response = await passwordService.verifyToken(token);
        if (response.valid) {
          setTokenInfo(response);
        } else {
          setError(response.message || 'トークンが無効です');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'トークンの検証に失敗しました';
        setError(errorMessage || 'トークンの検証に失敗しました');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    setIsLoading(true);

    try {
      await passwordService.resetPassword({ token: token!, newPassword });
      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'パスワードのリセットに失敗しました';
      setError(errorMessage || 'パスワードのリセットに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

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
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" component="h1" sx={{ mb: 2, fontWeight: 700 }}>
              パスワードリセット完了
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              パスワードが正常にリセットされました。
              新しいパスワードでログインしてください。
            </Typography>
            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/login')}
            >
              ログインページへ
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!tokenInfo?.valid) {
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
              エラー
            </Typography>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error || 'トークンが無効または期限切れです'}
            </Alert>
            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/forgot-password')}
              sx={{ mb: 2 }}
            >
              パスワードリセットを再申請
            </Button>
            <Button
              fullWidth
              variant="outlined"
              component={Link}
              to="/login"
            >
              ログインページへ戻る
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
            新しいパスワードを設定
          </Typography>
          {tokenInfo.user && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              {tokenInfo.user.name}（{tokenInfo.user.employeeId}）さん
            </Typography>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="新しいパスワード"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              sx={{ mb: 2 }}
              disabled={isLoading}
              helperText="6文字以上で入力してください"
            />
            <TextField
              fullWidth
              label="新しいパスワード（確認）"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              sx={{ mb: 3 }}
              disabled={isLoading}
              error={confirmPassword.length > 0 && newPassword !== confirmPassword}
              helperText={confirmPassword.length > 0 && newPassword !== confirmPassword ? 'パスワードが一致しません' : ''}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading || newPassword.length < 6 || newPassword !== confirmPassword}
              sx={{ mb: 2 }}
            >
              {isLoading ? <CircularProgress size={24} /> : 'パスワードを変更'}
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

export default ResetPasswordPage;
