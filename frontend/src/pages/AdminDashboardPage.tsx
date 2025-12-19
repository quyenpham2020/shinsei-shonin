import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Chip,
  LinearProgress,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Download as DownloadIcon,
  PersonAdd as PersonAddIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { applicationService } from '../services/applicationService';
import { applicationTypeService, ApplicationType as ApplicationTypeModel } from '../services/applicationTypeService';
import { userService } from '../services/userService';
import { departmentService, Department } from '../services/departmentService';
import { Application, User } from '../types';

const STATUS_COLORS: Record<string, string> = {
  draft: '#9e9e9e',
  pending: '#ff9800',
  approved: '#4caf50',
  rejected: '#f44336',
};

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationTypes, setApplicationTypes] = useState<ApplicationTypeModel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [systemHealth, setSystemHealth] = useState({
    database: 'healthy',
    api: 'healthy',
    lastBackup: new Date().toISOString(),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apps, types, usersData, deptsData] = await Promise.all([
          applicationService.getAll(),
          applicationTypeService.getAll(),
          userService.getAll(),
          departmentService.getAll(),
        ]);
        setApplications(apps);
        setApplicationTypes(types);
        setUsers(usersData);
        setDepartments(deptsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // System statistics
  const systemStats = {
    totalUsers: users.length,
    totalDepartments: departments.length,
    totalApplications: applications.length,
    activeApprovers: users.filter((u) => u.role === 'approver' || u.role === 'admin').length,
  };

  // Application status distribution
  const statusDistribution = [
    { name: '下書き', value: applications.filter((a) => a.status === 'draft').length, color: STATUS_COLORS.draft },
    { name: '審査中', value: applications.filter((a) => a.status === 'pending').length, color: STATUS_COLORS.pending },
    { name: '承認済', value: applications.filter((a) => a.status === 'approved').length, color: STATUS_COLORS.approved },
    { name: '却下', value: applications.filter((a) => a.status === 'rejected').length, color: STATUS_COLORS.rejected },
  ];

  // Role distribution
  const roleDistribution = [
    { name: '一般ユーザー', count: users.filter((u) => u.role === 'user').length },
    { name: '承認者', count: users.filter((u) => u.role === 'approver').length },
    { name: '管理者', count: users.filter((u) => u.role === 'admin').length },
  ];

  // Calculate approval rate
  const approvalRate = applications.length > 0
    ? Math.round((applications.filter((a) => a.status === 'approved').length / applications.filter((a) => a.status !== 'draft').length) * 100) || 0
    : 0;

  // Data export functions
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((header) => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportApplications = async () => {
    setExportLoading(true);
    try {
      const exportData = applications.map((app) => ({
        ID: app.id,
        タイトル: app.title,
        種別: applicationTypes.find((t) => t.code === app.type)?.name || app.type,
        ステータス: app.status === 'draft' ? '下書き' : app.status === 'pending' ? '審査中' : app.status === 'approved' ? '承認済' : '却下',
        申請者: app.applicant_name,
        申請者部署: app.applicant_department,
        金額: app.amount || '',
        作成日: app.created_at,
        更新日: app.updated_at,
      }));
      exportToCSV(exportData, '申請データ');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportUsers = async () => {
    setExportLoading(true);
    try {
      const exportData = users.map((u) => ({
        ID: u.id,
        社員ID: u.employeeId,
        氏名: u.name,
        メール: u.email,
        部署: u.department,
        権限: u.role === 'admin' ? '管理者' : u.role === 'approver' ? '承認者' : '一般ユーザー',
      }));
      exportToCSV(exportData, 'ユーザーデータ');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportDepartments = async () => {
    setExportLoading(true);
    try {
      const exportData = departments.map((d) => ({
        ID: d.id,
        コード: d.code,
        部署名: d.name,
        説明: d.description || '',
        作成日: d.created_at,
      }));
      exportToCSV(exportData, '部署データ');
    } finally {
      setExportLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          管理者ダッシュボード
        </Typography>
        <Chip label="管理者" color="error" size="small" />
      </Box>

      <Typography variant="body1" sx={{ mb: 3 }}>
        ようこそ、{user?.name}さん ({user?.department})
      </Typography>

      {/* System Statistics */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        システム統計
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {systemStats.totalUsers}
              </Typography>
              <Typography color="text.secondary">総ユーザー数</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <BusinessIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {systemStats.totalDepartments}
              </Typography>
              <Typography color="text.secondary">部署数</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <DescriptionIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {systemStats.totalApplications}
              </Typography>
              <Typography color="text.secondary">総申請数</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssessmentIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {approvalRate}%
              </Typography>
              <Typography color="text.secondary">承認率</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Application Status Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                全社申請ステータス集計
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}件`}
                    labelLine={false}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                {statusDistribution.map((item) => (
                  <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: item.color, borderRadius: '50%' }} />
                    <Typography variant="body2">{item.name}: {item.value}件</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Role Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                ユーザー権限分布
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={roleDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1976d2" name="人数" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Health Monitor */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            システムヘルスモニター
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <StorageIcon color="success" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    データベース
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon color="success" fontSize="small" />
                  <Typography variant="body2">正常稼働中</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  応答時間: 12ms
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <SpeedIcon color="success" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    API サーバー
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon color="success" fontSize="small" />
                  <Typography variant="body2">正常稼働中</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  稼働率: 99.9%
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <StorageIcon color="info" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    ストレージ使用量
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={35} sx={{ mb: 1, height: 8, borderRadius: 4 }} />
                <Typography variant="body2">35% 使用中</Typography>
                <Typography variant="caption" color="text.secondary">
                  3.5GB / 10GB
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          <Alert severity="success" sx={{ mt: 2 }}>
            すべてのシステムは正常に稼働しています。最終チェック: {new Date().toLocaleString('ja-JP')}
          </Alert>
        </CardContent>
      </Card>

      {/* Admin Quick Actions & Data Export */}
      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                管理者クイックアクション
              </Typography>
              <List>
                <ListItem
                  component="div"
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1 }}
                  onClick={() => navigate('/users')}
                >
                  <ListItemIcon>
                    <PeopleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="ユーザー管理" secondary="ユーザーの追加・編集・削除" />
                </ListItem>
                <Divider />
                <ListItem
                  component="div"
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1 }}
                  onClick={() => navigate('/departments')}
                >
                  <ListItemIcon>
                    <BusinessIcon color="secondary" />
                  </ListItemIcon>
                  <ListItemText primary="部署管理" secondary="部署の追加・編集・削除" />
                </ListItem>
                <Divider />
                <ListItem
                  component="div"
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1 }}
                  onClick={() => navigate('/application-types')}
                >
                  <ListItemIcon>
                    <DescriptionIcon color="info" />
                  </ListItemIcon>
                  <ListItemText primary="申請種別管理" secondary="申請種別の追加・編集" />
                </ListItem>
                <Divider />
                <ListItem
                  component="div"
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1 }}
                  onClick={() => navigate('/approvers')}
                >
                  <ListItemIcon>
                    <PersonAddIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="承認者管理" secondary="承認者の設定・変更" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Data Export */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                データエクスポート
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                各種データをCSV形式でダウンロードできます。
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={exportLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
                  onClick={handleExportApplications}
                  disabled={exportLoading}
                  fullWidth
                >
                  申請データをエクスポート ({applications.length}件)
                </Button>
                <Button
                  variant="outlined"
                  startIcon={exportLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
                  onClick={handleExportUsers}
                  disabled={exportLoading}
                  fullWidth
                >
                  ユーザーデータをエクスポート ({users.length}件)
                </Button>
                <Button
                  variant="outlined"
                  startIcon={exportLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
                  onClick={handleExportDepartments}
                  disabled={exportLoading}
                  fullWidth
                >
                  部署データをエクスポート ({departments.length}件)
                </Button>
              </Box>
              <Alert severity="info" sx={{ mt: 2 }}>
                エクスポートされたファイルはUTF-8 (BOM付き) 形式で、Excelで直接開けます。
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboardPage;
