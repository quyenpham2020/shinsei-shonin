import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  TableSortLabel,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  Menu,
  Alert,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Clear as ClearIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { applicationService, ApplicationFilters } from '../services/applicationService';
import { applicationTypeService, ApplicationType as ApplicationTypeModel } from '../services/applicationTypeService';
import { departmentService, Department } from '../services/departmentService';
import { favoriteService } from '../services/favoriteService';
import {
  Application,
  ApplicationStatus,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
} from '../types';

type Order = 'asc' | 'desc';
type OrderBy = 'id' | 'title' | 'type' | 'applicant_name' | 'amount' | 'status' | 'created_at';

const ApplicationListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Data state
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationTypes, setApplicationTypes] = useState<ApplicationTypeModel[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>(
    (searchParams.get('status') as ApplicationStatus | 'all') || 'all'
  );
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting state
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderBy>('created_at');

  // Selection state
  const [selected, setSelected] = useState<number[]>([]);

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [bulkActionAnchor, setBulkActionAnchor] = useState<null | HTMLElement>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch application types and departments
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [types, depts] = await Promise.all([
          applicationTypeService.getAll(),
          departmentService.getAll(),
        ]);
        setApplicationTypes(types);
        setDepartments(depts);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch applications
  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const filters: ApplicationFilters = {
        status: statusFilter,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: searchText || undefined,
      };
      const data = await applicationService.getAll(filters);
      setApplications(data);
      setSelected([]); // Clear selection when data changes
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, typeFilter, departmentFilter, startDate, endDate]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchApplications();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Sorting logic
  const sortedApplications = useMemo(() => {
    const comparator = (a: Application, b: Application) => {
      let aValue: any = a[orderBy];
      let bValue: any = b[orderBy];

      if (orderBy === 'amount') {
        aValue = a.amount ?? 0;
        bValue = b.amount ?? 0;
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    };

    return [...applications].sort(comparator);
  }, [applications, order, orderBy]);

  // Paginated data
  const paginatedApplications = useMemo(() => {
    return sortedApplications.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedApplications, page, rowsPerPage]);

  // Handlers
  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = paginatedApplications.map((app) => app.id);
      setSelected(newSelected);
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id: number) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  const isSelected = (id: number) => selected.indexOf(id) !== -1;

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

  const handleEditClick = (e: React.MouseEvent, app: Application) => {
    e.stopPropagation();
    navigate(`/shinsei/applications/${app.id}/edit`);
  };

  const handleDeleteClick = (e: React.MouseEvent, app: Application) => {
    e.stopPropagation();
    setSelectedApp(app);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedApp) return;
    try {
      await applicationService.delete(selectedApp.id);
      setDeleteDialogOpen(false);
      setSelectedApp(null);
      fetchApplications();
    } catch (error) {
      console.error('Failed to delete application:', error);
    }
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    try {
      await Promise.all(selected.map((id) => applicationService.delete(id)));
      setBulkDeleteDialogOpen(false);
      setSelected([]);
      fetchApplications();
    } catch (error) {
      console.error('Failed to bulk delete:', error);
    }
  };

  const handleBulkApprove = async () => {
    try {
      await Promise.all(selected.map((id) => applicationService.approve(id)));
      setBulkActionAnchor(null);
      setSelected([]);
      fetchApplications();
    } catch (error) {
      console.error('Failed to bulk approve:', error);
    }
  };

  const handleBulkReject = async () => {
    try {
      await Promise.all(selected.map((id) => applicationService.reject(id)));
      setBulkActionAnchor(null);
      setSelected([]);
      fetchApplications();
    } catch (error) {
      console.error('Failed to bulk reject:', error);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (e: React.MouseEvent, appId: number) => {
    e.stopPropagation();
    try {
      const result = await favoriteService.toggle(appId);
      // Update local state optimistically
      setApplications((prev) =>
        prev.map((app) =>
          app.id === appId ? { ...app, is_favorite: result.is_favorite ? 1 : 0 } : app
        )
      );
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Export to Excel (CSV)
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const exportData = sortedApplications.map((app) => ({
        ID: app.id,
        タイトル: app.title,
        種別: getTypeLabel(app.type),
        申請者: app.applicant_name,
        部署: app.applicant_department,
        金額: app.amount || '',
        ステータス: APPLICATION_STATUS_LABELS[app.status],
        申請日: formatDate(app.created_at),
        更新日: formatDate(app.updated_at),
        承認者: app.approver_name || '',
        却下理由: app.rejection_reason || '',
      }));

      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map((row) =>
          headers
            .map((header) => {
              const value = (row as any)[header];
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value ?? '';
            })
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `申請一覧_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } finally {
      setExportLoading(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setDepartmentFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchText('');
  };

  const canEdit = (app: Application) => {
    return (app.status === 'draft' || app.status === 'pending') && app.applicant_id === user?.id;
  };

  const canDelete = (app: Application) => {
    if (user?.role === 'admin') return true;
    return app.status === 'draft' && app.applicant_id === user?.id;
  };

  const canBulkApprove = user?.role === 'approver' || user?.role === 'admin';
  const canExport = user?.role === 'admin';
  const showDepartmentFilter = user?.role === 'approver' || user?.role === 'admin';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          申請一覧
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canExport && (
            <Button
              variant="outlined"
              startIcon={exportLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
              onClick={handleExport}
              disabled={exportLoading || applications.length === 0}
            >
              Excel出力
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/applications/new')}
          >
            新規申請
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {/* Basic filters */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="申請番号・件名で検索"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
              }}
              sx={{ minWidth: 250 }}
            />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>ステータス</InputLabel>
              <Select
                value={statusFilter}
                label="ステータス"
                onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'all')}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="draft">下書き</MenuItem>
                <MenuItem value="pending">申請中</MenuItem>
                <MenuItem value="approved">承認済</MenuItem>
                <MenuItem value="rejected">差戻し</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>種別</InputLabel>
              <Select
                value={typeFilter}
                label="種別"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">すべて</MenuItem>
                {applicationTypes.map((appType) => (
                  <MenuItem key={appType.id} value={appType.code}>
                    {appType.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              size="small"
              startIcon={showAdvancedFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              詳細フィルター
            </Button>
            <Button size="small" startIcon={<ClearIcon />} onClick={clearFilters}>
              クリア
            </Button>
          </Box>

          {/* Advanced filters */}
          <Collapse in={showAdvancedFilters}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              {showDepartmentFilter && (
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>部署</InputLabel>
                  <Select
                    value={departmentFilter}
                    label="部署"
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                  >
                    <MenuItem value="all">すべて</MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <TextField
                size="small"
                type="date"
                label="開始日"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
              />
              <TextField
                size="small"
                type="date"
                label="終了日"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
              />
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Bulk actions bar */}
      {selected.length > 0 && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              {canBulkApprove && (
                <>
                  <Button size="small" color="success" startIcon={<ApproveIcon />} onClick={handleBulkApprove}>
                    一括承認
                  </Button>
                  <Button size="small" color="warning" startIcon={<RejectIcon />} onClick={handleBulkReject}>
                    一括却下
                  </Button>
                </>
              )}
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                一括削除
              </Button>
            </Box>
          }
        >
          {selected.length}件選択中
        </Alert>
      )}

      {/* Table */}
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
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selected.length > 0 && selected.length < paginatedApplications.length}
                      checked={paginatedApplications.length > 0 && selected.length === paginatedApplications.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'id'}
                      direction={orderBy === 'id' ? order : 'asc'}
                      onClick={() => handleRequestSort('id')}
                    >
                      ID
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'title'}
                      direction={orderBy === 'title' ? order : 'asc'}
                      onClick={() => handleRequestSort('title')}
                    >
                      タイトル
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'type'}
                      direction={orderBy === 'type' ? order : 'asc'}
                      onClick={() => handleRequestSort('type')}
                    >
                      種別
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'applicant_name'}
                      direction={orderBy === 'applicant_name' ? order : 'asc'}
                      onClick={() => handleRequestSort('applicant_name')}
                    >
                      申請者
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={orderBy === 'amount'}
                      direction={orderBy === 'amount' ? order : 'asc'}
                      onClick={() => handleRequestSort('amount')}
                    >
                      金額
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'status'}
                      direction={orderBy === 'status' ? order : 'asc'}
                      onClick={() => handleRequestSort('status')}
                    >
                      ステータス
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'created_at'}
                      direction={orderBy === 'created_at' ? order : 'asc'}
                      onClick={() => handleRequestSort('created_at')}
                    >
                      申請日
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedApplications.map((app) => {
                  const isItemSelected = isSelected(app.id);
                  return (
                    <TableRow
                      key={app.id}
                      hover
                      selected={isItemSelected}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/shinsei/applications/${app.id}`)}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isItemSelected}
                          onChange={() => handleSelectOne(app.id)}
                        />
                      </TableCell>
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
                        <Tooltip title={app.is_favorite ? 'お気に入りから削除' : 'お気に入りに追加'}>
                          <IconButton
                            size="small"
                            onClick={(e) => handleToggleFavorite(e, app.id)}
                            sx={{ color: app.is_favorite ? 'warning.main' : 'action.disabled' }}
                          >
                            {app.is_favorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        {canEdit(app) && (
                          <Tooltip title="編集">
                            <IconButton size="small" onClick={(e) => handleEditClick(e, app)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete(app) && (
                          <Tooltip title="削除">
                            <IconButton size="small" color="error" onClick={(e) => handleDeleteClick(e, app)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={sortedApplications.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50, 100]}
            labelRowsPerPage="表示件数:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
          />
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>申請削除の確認</DialogTitle>
        <DialogContent>
          <Typography>
            「{selectedApp?.title || '(無題)'}」を削除しますか？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            削除
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)}>
        <DialogTitle>一括削除の確認</DialogTitle>
        <DialogContent>
          <Typography>
            選択した{selected.length}件の申請を削除しますか？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleBulkDelete} variant="contained" color="error">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApplicationListPage;
