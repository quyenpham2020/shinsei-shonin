import React, { useState } from 'react';
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
  InputAdornment,
  Alert,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { applicationService, CreateApplicationData } from '../services/applicationService';
import { ApplicationType, APPLICATION_TYPE_LABELS } from '../types';

const NewApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateApplicationData>({
    title: '',
    type: 'expense',
    description: '',
    amount: undefined,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof CreateApplicationData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const newApp = await applicationService.create(formData);
      navigate(`/applications/${newApp.id}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '申請の作成に失敗しました';
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || errorMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/applications')} sx={{ mb: 2 }}>
        一覧に戻る
      </Button>

      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
            新規申請
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="タイトル"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>申請種別</InputLabel>
              <Select
                value={formData.type}
                label="申請種別"
                onChange={(e) => handleChange('type', e.target.value as ApplicationType)}
              >
                {Object.entries(APPLICATION_TYPE_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="金額"
              type="number"
              value={formData.amount || ''}
              onChange={(e) => handleChange('amount', Number(e.target.value) || 0)}
              InputProps={{
                startAdornment: <InputAdornment position="start">¥</InputAdornment>,
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="説明"
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => navigate('/applications')}>
                キャンセル
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? '送信中...' : '申請する'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NewApplicationPage;
