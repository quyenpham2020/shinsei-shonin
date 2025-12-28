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
  TextField,
  Button,
  Grid,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Email as EmailIcon,
  Warning as WarningIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { settingsService, Setting } from '../services/settingsService';

const SystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Email settings state
  const [emailHost, setEmailHost] = useState('');
  const [emailPort, setEmailPort] = useState('587');
  const [emailSecure, setEmailSecure] = useState(false);
  const [emailUser, setEmailUser] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailFrom, setEmailFrom] = useState('');

  // Escalation settings state
  const [enableSundayEscalation, setEnableSundayEscalation] = useState(true);
  const [escalationEmails, setEscalationEmails] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const allSettings = await settingsService.getAll();
      setSettings(allSettings);

      // Populate email settings
      const emailHostSetting = allSettings.find(s => s.settingKey === 'email_host');
      const emailPortSetting = allSettings.find(s => s.settingKey === 'email_port');
      const emailSecureSetting = allSettings.find(s => s.settingKey === 'email_secure');
      const emailUserSetting = allSettings.find(s => s.settingKey === 'email_user');
      const emailPasswordSetting = allSettings.find(s => s.settingKey === 'email_password');
      const emailFromSetting = allSettings.find(s => s.settingKey === 'email_from');

      setEmailHost(emailHostSetting?.settingValue || '');
      setEmailPort(emailPortSetting?.settingValue || '587');
      setEmailSecure(emailSecureSetting?.settingValue === 'true');
      setEmailUser(emailUserSetting?.settingValue || '');
      setEmailPassword(emailPasswordSetting?.settingValue || '');
      setEmailFrom(emailFromSetting?.settingValue || '');

      // Populate escalation settings
      const enableEscalationSetting = allSettings.find(s => s.settingKey === 'enable_sunday_escalation');
      const escalationEmailsSetting = allSettings.find(s => s.settingKey === 'escalation_emails');

      setEnableSundayEscalation(enableEscalationSetting?.settingValue === 'true');
      setEscalationEmails(escalationEmailsSetting?.settingValue || '');
    } catch (err: any) {
      setError('設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSetting = async (key: string, currentValue: string) => {
    const newValue = currentValue === '1' ? '0' : '1';

    try {
      setError(null);
      await settingsService.update(key, { value: newValue });
      setSuccess('設定を更新しました');
      loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.message || '設定の更新に失敗しました');
    }
  };

  const handleSaveEmailSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      await Promise.all([
        settingsService.update('email_host', { value: emailHost }),
        settingsService.update('email_port', { value: emailPort }),
        settingsService.update('email_secure', { value: emailSecure ? 'true' : 'false' }),
        settingsService.update('email_user', { value: emailUser }),
        settingsService.update('email_password', { value: emailPassword }),
        settingsService.update('email_from', { value: emailFrom }),
      ]);

      setSuccess('メール設定を保存しました');
      loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'メール設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEscalationSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      await Promise.all([
        settingsService.update('enable_sunday_escalation', { value: enableSundayEscalation ? 'true' : 'false' }),
        settingsService.update('escalation_emails', { value: escalationEmails }),
      ]);

      setSuccess('エスカレーション設定を保存しました');
      loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'エスカレーション設定の保存に失敗しました');
    } finally {
      setSaving(false);
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

  // Filter out email and escalation settings from general settings
  const generalSettings = settings.filter(
    s => !s.settingKey.startsWith('email_') &&
         !s.settingKey.startsWith('escalation_') &&
         s.settingKey !== 'enable_sunday_escalation'
  );

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

      {/* Email Configuration Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon /> メール設定
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            週次報告リマインダーメールの送信に使用するSMTP設定
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTPホスト"
                placeholder="smtp.gmail.com"
                value={emailHost}
                onChange={(e) => setEmailHost(e.target.value)}
                helperText="SMTPサーバーのホスト名"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTPポート"
                type="number"
                placeholder="587"
                value={emailPort}
                onChange={(e) => setEmailPort(e.target.value)}
                helperText="587 (TLS) または 465 (SSL)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ユーザー名/メールアドレス"
                placeholder="your-email@example.com"
                value={emailUser}
                onChange={(e) => setEmailUser(e.target.value)}
                helperText="SMTP認証用のユーザー名"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="パスワード"
                type="password"
                placeholder="••••••••"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                helperText="SMTP認証用のパスワード"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="送信元メールアドレス"
                placeholder="noreply@example.com"
                value={emailFrom}
                onChange={(e) => setEmailFrom(e.target.value)}
                helperText="送信メールのFromアドレス"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailSecure}
                    onChange={(e) => setEmailSecure(e.target.checked)}
                  />
                }
                label={`SSL使用 (ポート465の場合は有効にする)`}
                sx={{ mt: 2 }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveEmailSettings}
              disabled={saving}
            >
              メール設定を保存
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            メール設定が未設定の場合、リマインダーはコンソールログのみに出力されます（開発用）
          </Alert>
        </CardContent>
      </Card>

      {/* Escalation Settings Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon /> エスカレーション設定
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            週次報告未提出者へのエスカレーション設定
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              リマインダースケジュール:
            </Typography>
            <Typography variant="body2" component="div">
              • <strong>金曜日 15:00:</strong> 未提出者にリマインダーメール送信<br />
              • <strong>土曜日 10:00:</strong> 未提出者 + オンサイトリーダーにエスカレーション<br />
              • <strong>日曜日 19:00:</strong> 未提出者 + オンサイトリーダー + GM/BOD（有効時）にエスカレーション
            </Typography>
          </Alert>

          <FormControlLabel
            control={
              <Switch
                checked={enableSundayEscalation}
                onChange={(e) => setEnableSundayEscalation(e.target.checked)}
              />
            }
            label="日曜日のGM/BODへのエスカレーションを有効にする"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="エスカレーション先メールアドレス（GM/BOD）"
            placeholder="gm@example.com, bod@example.com"
            value={escalationEmails}
            onChange={(e) => setEscalationEmails(e.target.value)}
            helperText="カンマ区切りで複数のメールアドレスを指定できます。日曜日のエスカレーションが有効な場合のみ使用されます。"
            multiline
            rows={2}
          />

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveEscalationSettings}
              disabled={saving}
            >
              エスカレーション設定を保存
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* General Settings Section */}
      {generalSettings.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              機能設定
            </Typography>

            <Divider sx={{ my: 2 }} />

            {generalSettings.map((setting, index) => (
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
                      />
                    }
                    label={setting.settingValue === '1' ? '有効' : '無効'}
                  />
                </Paper>
                {index < generalSettings.length - 1 && <Box sx={{ my: 2 }} />}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SystemSettingsPage;
