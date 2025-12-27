import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const LoginPage: React.FC = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(employeeId, password);
      navigate('/');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('auth:loginFailed');
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || errorMessage
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 700 }}>
              {t('auth:title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              {t('auth:subtitle')}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label={t('auth:employeeId')}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                margin="normal"
                required
                autoFocus
              />
              <TextField
                fullWidth
                label={t('auth:password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ mt: 3, mb: 2 }}
              >
                {isLoading ? t('auth:loggingIn') : t('auth:login')}
              </Button>
              <Box sx={{ textAlign: 'center' }}>
                <Button
                  component={Link}
                  to="/forgot-password"
                  variant="text"
                  size="small"
                >
                  {t('auth:forgotPassword')}
                </Button>
              </Box>
            </form>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {t('auth:contactForAccount')}
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default LoginPage;
