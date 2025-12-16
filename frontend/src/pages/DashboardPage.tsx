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
  Pending as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { applicationService } from '../services/applicationService';
import { Application, APPLICATION_STATUS_LABELS, APPLICATION_TYPE_LABELS, APPLICATION_STATUS_COLORS } from '../types';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const data = await applicationService.getAll();
        setApplications(data);
      } catch (error) {
        console.error('Failed to fetch applications:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const stats = {
    pending: applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
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
          onClick={() => navigate('/applications/new')}
        >
          新規申請
        </Button>
      </Box>

      <Typography variant="body1" sx={{ mb: 3 }}>
        ようこそ、{user?.name}さん ({user?.department})
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PendingIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stats.pending}
              </Typography>
              <Typography color="text.secondary">審査中</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ApprovedIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stats.approved}
              </Typography>
              <Typography color="text.secondary">承認済</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <RejectedIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stats.rejected}
              </Typography>
              <Typography color="text.secondary">却下</Typography>
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
                  onClick={() => navigate(`/applications/${app.id}`)}
                >
                  <ListItemText
                    primary={app.title}
                    secondary={`${APPLICATION_TYPE_LABELS[app.type]} - ${app.applicant_name} (${app.applicant_department})`}
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
