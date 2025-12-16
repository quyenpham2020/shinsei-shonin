import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { applicationService } from '../services/applicationService';
import {
  Application,
  ApplicationStatus,
  ApplicationType,
  APPLICATION_STATUS_LABELS,
  APPLICATION_TYPE_LABELS,
  APPLICATION_STATUS_COLORS,
} from '../types';

const ApplicationListPage: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ApplicationType | 'all'>('all');

  useEffect(() => {
    const fetchApplications = async () => {
      setIsLoading(true);
      try {
        const data = await applicationService.getAll({
          status: statusFilter,
          type: typeFilter,
        });
        setApplications(data);
      } catch (error) {
        console.error('Failed to fetch applications:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchApplications();
  }, [statusFilter, typeFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatAmount = (amount: number | null) => {
    if (amount === null) return '-';
    return `¥${amount.toLocaleString()}`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          申請一覧
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/applications/new')}
        >
          新規申請
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>ステータス</InputLabel>
              <Select
                value={statusFilter}
                label="ステータス"
                onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'all')}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="pending">審査中</MenuItem>
                <MenuItem value="approved">承認済</MenuItem>
                <MenuItem value="rejected">却下</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>種別</InputLabel>
              <Select
                value={typeFilter}
                label="種別"
                onChange={(e) => setTypeFilter(e.target.value as ApplicationType | 'all')}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="travel">出張申請</MenuItem>
                <MenuItem value="expense">経費精算</MenuItem>
                <MenuItem value="leave">休暇申請</MenuItem>
                <MenuItem value="purchase">備品購入</MenuItem>
                <MenuItem value="other">その他</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              申請がありません
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>タイトル</TableCell>
                <TableCell>種別</TableCell>
                <TableCell>申請者</TableCell>
                <TableCell align="right">金額</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>申請日</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {applications.map((app) => (
                <TableRow
                  key={app.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/applications/${app.id}`)}
                >
                  <TableCell>{app.id}</TableCell>
                  <TableCell>{app.title}</TableCell>
                  <TableCell>{APPLICATION_TYPE_LABELS[app.type]}</TableCell>
                  <TableCell>
                    {app.applicant_name}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {app.applicant_department}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{formatAmount(app.amount)}</TableCell>
                  <TableCell>
                    <Chip
                      label={APPLICATION_STATUS_LABELS[app.status]}
                      color={APPLICATION_STATUS_COLORS[app.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(app.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ApplicationListPage;
