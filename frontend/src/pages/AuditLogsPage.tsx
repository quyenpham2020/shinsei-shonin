import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Button,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  LoginLog,
  AuditLog,
  PasswordChangeLog,
  getLoginLogs,
  getAuditLogs,
  getPasswordChangeLogs,
} from '../services/auditLogService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`audit-tabpanel-${index}`}
      aria-labelledby={`audit-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AuditLogsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [passwordLogs, setPasswordLogs] = useState<PasswordChangeLog[]>([]);
  const [filters, setFilters] = useState({
    userId: '',
    startDate: '',
    endDate: '',
  });

  const loadLoginLogs = async () => {
    setLoading(true);
    try {
      const response = await getLoginLogs({
        limit: 100,
        userId: filters.userId ? parseInt(filters.userId) : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setLoginLogs(response.logs);
    } catch (error) {
      console.error('Error loading login logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await getAuditLogs({
        limit: 100,
        userId: filters.userId ? parseInt(filters.userId) : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setAuditLogs(response.logs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPasswordLogs = async () => {
    setLoading(true);
    try {
      const response = await getPasswordChangeLogs({
        limit: 100,
        userId: filters.userId ? parseInt(filters.userId) : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      console.log('Password logs loaded:', response.logs.length, 'records');
      setPasswordLogs(response.logs);
    } catch (error) {
      console.error('Error loading password logs:', error);
      alert('パスワード変更ログの読み込みに失敗しました: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoginLogs();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 0) loadLoginLogs();
    else if (newValue === 1) loadAuditLogs();
    else if (newValue === 2) loadPasswordLogs();
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters({ ...filters, [field]: value });
  };

  const handleSearch = () => {
    if (tabValue === 0) loadLoginLogs();
    else if (tabValue === 1) loadAuditLogs();
    else if (tabValue === 2) loadPasswordLogs();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  return (
    <Container maxWidth="xl">
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h4" gutterBottom>
          監査ログ
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                label="ユーザーID"
                fullWidth
                size="small"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="開始日"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="終了日"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button variant="contained" fullWidth onClick={handleSearch}>
                検索
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="ログイン履歴" />
            <Tab label="操作履歴" />
            <Tab label="パスワード変更履歴" />
          </Tabs>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Login Logs Tab */}
            <TabPanel value={tabValue} index={0}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>日時</TableCell>
                      <TableCell>ユーザー</TableCell>
                      <TableCell>社員ID</TableCell>
                      <TableCell>ステータス</TableCell>
                      <TableCell>IPアドレス</TableCell>
                      <TableCell>場所</TableCell>
                      <TableCell>デバイス</TableCell>
                      <TableCell>ブラウザ</TableCell>
                      <TableCell>失敗理由</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loginLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            ログイン履歴がありません
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      loginLogs.map((log) => (
                        <TableRow key={log.id}>
                        <TableCell>{formatDate(log.created_at)}</TableCell>
                        <TableCell>{log.username}</TableCell>
                        <TableCell>{log.employee_id}</TableCell>
                        <TableCell>
                          <Chip
                            label={log.login_status}
                            color={log.login_status === 'success' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{log.ip_address}</TableCell>
                        <TableCell>
                          {log.city}, {log.country}
                        </TableCell>
                        <TableCell>
                          {log.device} / {log.os}
                        </TableCell>
                        <TableCell>{log.browser}</TableCell>
                        <TableCell>{log.failure_reason || '-'}</TableCell>
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* Audit Logs Tab */}
            <TabPanel value={tabValue} index={1}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>日時</TableCell>
                      <TableCell>ユーザー</TableCell>
                      <TableCell>アクション</TableCell>
                      <TableCell>リソース</TableCell>
                      <TableCell>説明</TableCell>
                      <TableCell>IPアドレス</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            操作履歴がありません
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((log) => (
                        <TableRow key={log.id}>
                        <TableCell>{formatDate(log.created_at)}</TableCell>
                        <TableCell>{log.username}</TableCell>
                        <TableCell>
                          <Chip label={log.action} size="small" color="primary" />
                        </TableCell>
                        <TableCell>
                          {log.resource_type}
                          {log.resource_id && ` #${log.resource_id}`}
                        </TableCell>
                        <TableCell>{log.description || '-'}</TableCell>
                        <TableCell>{log.ip_address}</TableCell>
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* Password Change Logs Tab */}
            <TabPanel value={tabValue} index={2}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>日時</TableCell>
                      <TableCell>ユーザー</TableCell>
                      <TableCell>社員ID</TableCell>
                      <TableCell>変更タイプ</TableCell>
                      <TableCell>変更者</TableCell>
                      <TableCell>強制変更</TableCell>
                      <TableCell>IPアドレス</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {passwordLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            パスワード変更履歴がありません
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      passwordLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{formatDate(log.created_at)}</TableCell>
                          <TableCell>{log.username}</TableCell>
                          <TableCell>{log.employee_id}</TableCell>
                          <TableCell>
                            <Chip label={log.change_type} size="small" color="warning" />
                          </TableCell>
                          <TableCell>{log.changed_by_name || log.username}</TableCell>
                          <TableCell>
                            {log.is_forced ? (
                              <Chip label="強制" size="small" color="error" />
                            ) : (
                              <Chip label="通常" size="small" />
                            )}
                          </TableCell>
                          <TableCell>{log.ip_address}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          </>
        )}
      </Paper>
    </Container>
  );
}
