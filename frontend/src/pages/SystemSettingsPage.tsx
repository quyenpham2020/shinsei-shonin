import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Divider,
  Paper,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { settingsService, Setting } from '../services/settingsService';

const SystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const allSettings = await settingsService.getAll();
      setSettings(allSettings);
    } catch (err: any) {
      setError('設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSetting = async (key: string, currentValue: string) => {
    const newValue = currentValue === '1' ? '0' : '1';

    try {
      setUpdating(key);
      setError(null);
      await settingsService.update(key, { value: newValue });
      setSuccess('設定を更新しました');
      loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.message || '設定の更新に失敗しました');
    } finally {
      setUpdating(null);
    }
  };

  const getSettingLabel = (key: string): string => {
    const labels: Record<string, string> = {
      feedback_enabled: 'フィードバック機能',
    };
    return labels[key] || key;
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      feedback_enabled: 'ユーザーがフィードバックを送信できるようにする',
    };
    return descriptions[key] || '';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon /> システム設定
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            機能設定
          </Typography>

          <Divider sx={{ my: 2 }} />

          {settings.map((setting, index) => (
            <Box key={setting.id}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {getSettingLabel(setting.settingKey)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {setting.description || getSettingDescription(setting.settingKey)}
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={setting.settingValue === '1'}
                      onChange={() => handleToggleSetting(setting.settingKey, setting.settingValue)}
                      disabled={updating === setting.settingKey}
                    />
                  }
                  label={setting.settingValue === '1' ? '有効' : '無効'}
                />
              </Paper>
              {index < settings.length - 1 && <Box sx={{ my: 2 }} />}
            </Box>
          ))}

          {settings.length === 0 && (
            <Alert severity="info">設定項目がありません</Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SystemSettingsPage;
