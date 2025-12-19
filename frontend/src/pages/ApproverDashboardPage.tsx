import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  PendingActions as PendingIcon,
  CheckCircle as ApprovedIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { applicationService } from '../services/applicationService';
import { applicationTypeService, ApplicationType as ApplicationTypeModel } from '../services/applicationTypeService';
import { Application, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const ApproverDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationTypes, setApplicationTypes] = useState<ApplicationTypeModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apps, types] = await Promise.all([
          applicationService.getAll(),
          applicationTypeService.getAll()
        ]);
        setApplications(apps);
        setApplicationTypes(types);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Current month filter
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Stats calculation
  const pendingApprovals = applications.filter((a) => a.status === 'pending');
  const approvedThisMonth = applications.filter((a) => {
    if (a.status !== 'approved' || !a.approved_at) return false;
    const approvedDate = new Date(a.approved_at);
    return approvedDate >= currentMonthStart && approvedDate <= currentMonthEnd;
  });

  // Department-wise application count
  const departmentStats = applications.reduce((acc, app) => {
    const dept = app.applicant_department || '不明';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const departmentChartData = Object.entries(departmentStats).map(([name, count]) => ({
    name,
    count,
  }));

  // Application type distribution
  const typeStats = applications.reduce((acc, app) => {
    const typeModel = applicationTypes.find(t => t.code === app.type);
    const typeName = typeModel?.name || app.type;
    acc[typeName] = (acc[typeName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeChartData = Object.entries(typeStats).map(([name, value]) => ({
    name,
    value,
  }));

  // Monthly approval trend (last 6 months)
  const getMonthlyApprovalData = () => {
    const months: { name: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const count = applications.filter((a) => {
        if (a.status !== 'approved' || !a.approved_at) return false;
        const approvedDate = new Date(a.approved_at);
        return approvedDate >= monthStart && approvedDate <= monthEnd;
      }).length;

      const monthName = date.toLocaleDateString('ja-JP', { month: 'short' });
      months.push({ name: monthName, count });
    }
    return months;
  };

  const monthlyApprovalData = getMonthlyApprovalData();

  // Pending approvals list (top 5)
  const pendingList = pendingApprovals.slice(0, 5);

  const getTypeLabel = (typeCode: string) => {
    const appType = applicationTypes.find(t => t.code === typeCode);
    return appType?.name || typeCode;
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
          承認者ダッシュボード
        </Typography>
      </Box>

      <Typography variant="body1" sx={{ mb: 3 }}>
        ようこそ、{user?.name}さん ({user?.department})
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <PendingIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {pendingApprovals.length}
              </Typography>
              <Typography variant="h6">承認待ち</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                要対応
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ApprovedIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {approvedThisMonth.length}
              </Typography>
              <Typography variant="h6" color="text.secondary">今月承認件数</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Department Bar Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                部署別申請件数
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={departmentChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1976d2" name="件数" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Application Type Pie Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                申請種別分布
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={typeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {typeChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Monthly Trend Chart */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  月別承認推移
                </Typography>
              </Box>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyApprovalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#1976d2"
                    strokeWidth={2}
                    name="承認件数"
                    dot={{ fill: '#1976d2', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Approval List */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            承認待ち一覧
          </Typography>
          {pendingList.length === 0 ? (
            <Typography color="text.secondary">承認待ちの申請はありません</Typography>
          ) : (
            <List>
              {pendingList.map((app) => (
                <ListItem
                  key={app.id}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    borderRadius: 1,
                  }}
                  onClick={() => navigate(`/applications/${app.id}`)}
                >
                  <ListItemText
                    primary={app.title}
                    secondary={`${getTypeLabel(app.type)} - ${app.applicant_name} (${app.applicant_department})`}
                  />
                  <Chip
                    label={APPLICATION_STATUS_LABELS[app.status]}
                    color={APPLICATION_STATUS_COLORS[app.status]}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          )}
          {pendingApprovals.length > 5 && (
            <Button
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => navigate('/applications?status=pending')}
            >
              すべての承認待ちを見る ({pendingApprovals.length}件)
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ApproverDashboardPage;
