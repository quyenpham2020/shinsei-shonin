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
  TablePagination,
  Chip,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Star as StarIcon,
} from '@mui/icons-material';
import { favoriteService } from '../services/favoriteService';
import { applicationTypeService, ApplicationType as ApplicationTypeModel } from '../services/applicationTypeService';
import {
  Application,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
} from '../types';

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationTypes, setApplicationTypes] = useState<ApplicationTypeModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [favorites, types] = await Promise.all([
          favoriteService.getAll(),
          applicationTypeService.getAll(),
        ]);
        setApplications(favorites);
        setApplicationTypes(types);
      } catch (error) {
        console.error('Failed to fetch favorites:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const getTypeLabel = (typeCode: string) => {
    const appType = applicationTypes.find((t) => t.code === typeCode);
    return appType?.name || typeCode;
  };

  const handleToggleFavorite = async (e: React.MouseEvent, appId: number) => {
    e.stopPropagation();
    try {
      await favoriteService.toggle(appId);
      setApplications((prev) => prev.filter((app) => app.id !== appId));
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  const paginatedApplications = applications.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          <StarIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} />
          お気に入り
        </Typography>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              お気に入りの申請がありません
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>タイトル</TableCell>
                  <TableCell>種別</TableCell>
                  <TableCell>申請者</TableCell>
                  <TableCell align="right">金額</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell>申請日</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedApplications.map((app) => (
                  <TableRow
                    key={app.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/shinsei/applications/${app.id}`)}
                  >
                    <TableCell>{app.id}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.title || '(無題)'}
                    </TableCell>
                    <TableCell>{getTypeLabel(app.type)}</TableCell>
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
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="お気に入りから削除">
                        <IconButton
                          size="small"
                          onClick={(e) => handleToggleFavorite(e, app.id)}
                          sx={{ color: 'warning.main' }}
                        >
                          <StarIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={applications.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="表示件数:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
          />
        </Paper>
      )}
    </Box>
  );
};

export default FavoritesPage;
