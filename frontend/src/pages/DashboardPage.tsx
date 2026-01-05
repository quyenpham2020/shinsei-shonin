import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Pending as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Add as AddIcon,
  Drafts as DraftIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { applicationService } from '../services/applicationService';
import { applicationTypeService, ApplicationType as ApplicationTypeModel } from '../services/applicationTypeService';
import { Application, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from '../types';
import ApproverDashboardPage from './ApproverDashboardPage';
import AdminDashboardPage from './AdminDashboardPage';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Show admin dashboard for admins
  if (user?.role === 'admin') {
    return <AdminDashboardPage />;
  }

  // Show approver dashboard for approvers
  if (user?.role === 'approver') {
    return <ApproverDashboardPage />;
  }
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

  // Get current month's start and end for filtering
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const stats = {
    pending: applications.filter((a) => a.status === 'pending').length,
    approvedThisMonth: applications.filter((a) => {
      if (a.status !== 'approved' || !a.approved_at) return false;
      const approvedDate = new Date(a.approved_at);
      return approvedDate >= currentMonthStart && approvedDate <= currentMonthEnd;
    }).length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
    draft: applications.filter((a) => a.status === 'draft').length,
  };

  const getTypeLabel = (typeCode: string) => {
    const appType = applicationTypes.find(t => t.code === typeCode);
    return appType?.name || typeCode;
  };

  const recentApplications = applications.slice(0, 5);

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
          ダッシュボード
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/shinsei/applications/new')}
        >
          新規申請
        </Button>
      </Box>

      <Typography variant="body1" sx={{ mb: 3 }}>
        ようこそ、{user?.name}さん ({user?.department})
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PendingIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stats.pending}
              </Typography>
              <Typography color="text.secondary">申請中</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ApprovedIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stats.approvedThisMonth}
              </Typography>
              <Typography color="text.secondary">承認済（今月）</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <RejectedIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stats.rejected}
              </Typography>
              <Typography color="text.secondary">差戻し</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <DraftIcon sx={{ fontSize: 40, color: 'grey.500', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stats.draft}
              </Typography>
              <Typography color="text.secondary">下書き</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            最近の申請
          </Typography>
          {recentApplications.length === 0 ? (
            <Typography color="text.secondary">申請がありません</Typography>
          ) : (
            <List>
              {recentApplications.map((app) => (
                <ListItem
                  key={app.id}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    borderRadius: 1,
                  }}
                  onClick={() => navigate(`/shinsei/applications/${app.id}`)}
                >
                  <ListItemText
                    primary={app.title}
                    secondary={`${getTypeLabel(app.type)} - ${app.applicant_name} (${app.applicant_department})`}
                  />
                  <Chip
                    label={t(`application:status.${app.status}`)}
                    color={APPLICATION_STATUS_COLORS[app.status]}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          )}
          {applications.length > 5 && (
            <Button
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => navigate('/applications')}
            >
              すべての申請を見る
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardPage;
