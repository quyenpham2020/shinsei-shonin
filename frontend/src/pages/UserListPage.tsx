import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  Button,
  IconButton,
  CircularProgress,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Tooltip,
  Checkbox,
  ButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VpnKey as KeyIcon,
  ExpandMore as ExpandMoreIcon,
  Business as BusinessIcon,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon,
  UnfoldMore as ExpandAllIcon,
  UnfoldLess as CollapseAllIcon,
  DeleteSweep as BulkDeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { userService, CreateUserData, UpdateUserData } from '../services/userService';
import { departmentService, Department } from '../services/departmentService';
import { User, ROLE_LABELS, UserRole } from '../types';

const ROLE_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
  user: 'default',
  approver: 'primary',
  onsite_leader: 'info',
  gm: 'warning',
  bod: 'error',
  admin: 'secondary',
};

interface UserFormData {
  employeeId: string;
  name: string;
  email: string;
  password: string;
  department: string;
  role: UserRole;
  weeklyReportExempt: boolean;
}

const initialFormData: UserFormData = {
  employeeId: '',
  name: '',
  email: '',
  password: '',
  department: '',
  role: 'user',
  weeklyReportExempt: false,
};

interface UserWithExempt extends User {
  weekly_report_exempt?: number;
}

const UserListPage: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserWithExempt[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithExempt | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Group users by department
  const usersByDepartment = useMemo(() => {
    const grouped: Record<string, UserWithExempt[]> = {};
    users.forEach(user => {
      const dept = user.department || '未所属';
      if (!grouped[dept]) {
        grouped[dept] = [];
      }
      grouped[dept].push(user);
    });
    return grouped;
  }, [users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getAll();
      setUsers(data);
      // Expand all departments by default
      const depts = [...new Set(data.map((u: any) => u.department || '未所属'))];
      setExpandedDepts(depts);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('ユーザー一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await departmentService.getAll();
      setDepartments(data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  // ページが表示された時に最新データを取得（部署名変更などに対応）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // ページが表示されたら最新データを取得
        fetchUsers();
        fetchDepartments();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 定期的にデータを更新（部署変更のリアルタイム反映）
  useEffect(() => {
    // 15秒ごとに最新データを取得（ページが表示されている時のみ）
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isLoading && !isSubmitting) {
        // サイレント更新（ローディング表示なし）
        const fetchSilently = async () => {
          try {
            const [usersData, deptsData] = await Promise.all([
              userService.getAll(),
              departmentService.getAll(),
            ]);
            setUsers(usersData);
            setDepartments(deptsData);
          } catch (err) {
            // サイレントエラー（エラー表示しない）
            console.debug('Silent refresh failed:', err);
          }
        };
        fetchSilently();
      }
    }, 15000); // 15秒ごと

    return () => clearInterval(pollInterval);
  }, [isLoading, isSubmitting]);

  const handleAccordionChange = (dept: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedDepts(prev =>
      isExpanded ? [...prev, dept] : prev.filter(d => d !== dept)
    );
  };

  const handleRefresh = () => {
    fetchUsers();
    fetchDepartments();
    setSuccessMessage('データを更新しました');
  };

  const handleCreateOpen = () => {
    setFormData(initialFormData);
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    setCreateDialogOpen(false);
    setFormData(initialFormData);
  };

  const handleCreateSubmit = async () => {
    setIsSubmitting(true);
    try {
      const createData: CreateUserData = {
        employeeId: formData.employeeId,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        department: formData.department,
        role: formData.role,
      };
      await userService.create(createData);
      setSuccessMessage('ユーザーを作成しました');
      handleCreateClose();
      fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'ユーザーの作成に失敗しました';
      setError(errorMessage || 'ユーザーの作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (user: UserWithExempt) => {
    setSelectedUser(user);
    setFormData({
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      password: '',
      department: user.department,
      role: user.role,
      weeklyReportExempt: user.weekly_report_exempt === 1,
    });
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
    setFormData(initialFormData);
  };

  const handleEditSubmit = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const updateData: UpdateUserData = {
        employeeId: formData.employeeId,
        name: formData.name,
        email: formData.email,
        department: formData.department,
        role: formData.role,
        weeklyReportExempt: formData.weeklyReportExempt,
      };
      await userService.update(selectedUser.id, updateData);
      setSuccessMessage('ユーザー情報を更新しました');
      handleEditClose();
      fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'ユーザーの更新に失敗しました';
      setError(errorMessage || 'ユーザーの更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOpen = (user: UserWithExempt) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await userService.delete(selectedUser.id);
      setSuccessMessage('ユーザーを削除しました');
      handleDeleteClose();
      fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'ユーザーの削除に失敗しました';
      setError(errorMessage || 'ユーザーの削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    if (!window.confirm(`選択した${selectedIds.length}件のユーザーを削除しますか？`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await userService.bulkDelete(selectedIds);
      setSuccessMessage(`${selectedIds.length}件のユーザーを削除しました`);
      setSelectedIds([]);
      fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'ユーザーの一括削除に失敗しました';
      setError(errorMessage || 'ユーザーの一括削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map(u => u.id));
    }
  };

  const handleSelectUser = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExpandAll = () => {
    const depts = Object.keys(usersByDepartment);
    setExpandedDepts(depts);
  };

  const handleCollapseAll = () => {
    setExpandedDepts([]);
  };

  const handlePasswordOpen = (user: UserWithExempt) => {
    setSelectedUser(user);
    setNewPassword('');
    setPasswordDialogOpen(true);
  };

  const handlePasswordClose = () => {
    setPasswordDialogOpen(false);
    setSelectedUser(null);
    setNewPassword('');
  };

  const handlePasswordSubmit = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await userService.changePassword(selectedUser.id, newPassword);
      setSuccessMessage('パスワードを変更しました');
      handlePasswordClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'パスワードの変更に失敗しました';
      setError(errorMessage || 'パスワードの変更に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (field: keyof UserFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Excel Export
  const handleExport = () => {
    try {
      const exportData = users.map(user => ({
        '社員番号': user.employeeId,
        '名前': user.name,
        'メール': user.email,
        '部署': user.department,
        'ロール': ROLE_LABELS[user.role],
        '週次報告免除': user.weekly_report_exempt === 1 ? '有' : '無',
        'パスワード': '', // Don't export passwords
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ユーザー一覧');

      const fileName = `users_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setSuccessMessage('Excelファイルをエクスポートしました');
    } catch (err) {
      setError('Excelファイルのエクスポートに失敗しました');
      console.error(err);
    }
  };

  // Excel Import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      // Get default password from system settings (or use a default)
      const DEFAULT_PASSWORD = 'Welcome123!'; // This should come from system settings

      let successCount = 0;
      let errorCount = 0;

      for (const row of jsonData) {
        try {
          // Map role label back to role code
          const roleEntry = Object.entries(ROLE_LABELS).find(([_, label]) => label === row['ロール']);
          const role = roleEntry ? roleEntry[0] as UserRole : 'user';

          const createData: CreateUserData = {
            employeeId: row['社員番号'],
            name: row['名前'],
            email: row['メール'],
            password: row['パスワード'] || DEFAULT_PASSWORD, // Use default password if empty
            department: row['部署'],
            role: role,
          };

          await userService.create(createData);
          successCount++;
        } catch (err) {
          errorCount++;
          console.error('Failed to import user:', row['社員番号'], err);
        }
      }

      if (successCount > 0) {
        setSuccessMessage(`${successCount}件のユーザーをインポートしました${errorCount > 0 ? ` (${errorCount}件失敗)` : ''}`);
        fetchUsers();
      } else {
        setError('ユーザーのインポートに失敗しました');
      }
    } catch (err) {
      setError('Excelファイルの読み込みに失敗しました');
      console.error(err);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const isAdminUser = (user: UserWithExempt) => user.role === 'admin';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          ユーザー管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <ButtonGroup variant="outlined" size="small">
            <Button startIcon={<ExpandAllIcon />} onClick={handleExpandAll}>
              すべて展開
            </Button>
            <Button startIcon={<CollapseAllIcon />} onClick={handleCollapseAll}>
              すべて省略
            </Button>
          </ButtonGroup>
          {selectedIds.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<BulkDeleteIcon />}
              onClick={handleBulkDelete}
              disabled={isSubmitting}
            >
              選択削除 ({selectedIds.length})
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="最新データを取得">
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
              更新
            </Button>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <Button variant="outlined" startIcon={<ImportIcon />} onClick={handleImportClick}>
            インポート
          </Button>
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={handleExport}>
            エクスポート
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateOpen}>
            新規ユーザー
          </Button>
        </Box>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : users.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              ユーザーがいません
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {Object.entries(usersByDepartment).map(([dept, deptUsers]) => (
            <Accordion
              key={dept}
              expanded={expandedDepts.includes(dept)}
              onChange={handleAccordionChange(dept)}
              sx={{ mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon color="primary" />
                  <Typography sx={{ fontWeight: 600 }}>{dept}</Typography>
                  <Chip label={`${deptUsers.length}名`} size="small" />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            indeterminate={
                              selectedIds.length > 0 &&
                              selectedIds.length < users.length
                            }
                            checked={users.length > 0 && selectedIds.length === users.length}
                            onChange={handleSelectAll}
                          />
                        </TableCell>
                        <TableCell>社員ID</TableCell>
                        <TableCell>氏名</TableCell>
                        <TableCell>メールアドレス</TableCell>
                        <TableCell>ロール</TableCell>
                        <TableCell>週報免除</TableCell>
                        <TableCell align="center">操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {deptUsers.map((user) => (
                        <TableRow key={user.id} hover selected={selectedIds.includes(user.id)}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedIds.includes(user.id)}
                              onChange={() => handleSelectUser(user.id)}
                            />
                          </TableCell>
                          <TableCell>{user.employeeId}</TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={ROLE_LABELS[user.role] || user.role}
                              color={ROLE_COLORS[user.role] || 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {user.weekly_report_exempt === 1 && (
                              <Chip label="免除" size="small" color="info" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={t('common:tooltips.edit')}>
                              <IconButton
                                size="small"
                                onClick={() => handleEditOpen(user)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('common:tooltips.changePassword')}>
                              <IconButton
                                size="small"
                                onClick={() => handlePasswordOpen(user)}
                              >
                                <KeyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {isAdminUser(user) ? (
                              <Tooltip title={t('common:tooltips.cannotDeleteAdmin')}>
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled
                                    color="error"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            ) : (
                              <Tooltip title={t('common:tooltips.delete')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteOpen(user)}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
        <DialogTitle>新規ユーザー作成</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="社員ID"
              value={formData.employeeId}
              onChange={(e) => handleFormChange('employeeId', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="氏名"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="メールアドレス"
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="パスワード"
              type="password"
              value={formData.password}
              onChange={(e) => handleFormChange('password', e.target.value)}
              required
              fullWidth
              helperText="6文字以上"
            />
            <FormControl fullWidth required>
              <InputLabel>部署</InputLabel>
              <Select
                value={formData.department}
                label="部署"
                onChange={(e) => handleFormChange('department', e.target.value)}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>ロール</InputLabel>
              <Select
                value={formData.role}
                label="ロール"
                onChange={(e) => handleFormChange('role', e.target.value)}
              >
                <MenuItem value="user">一般ユーザー</MenuItem>
                <MenuItem value="approver">承認者</MenuItem>
                <MenuItem value="onsite_leader">オンサイトリーダー</MenuItem>
                <MenuItem value="gm">GM（部門長）</MenuItem>
                <MenuItem value="bod">BOD（取締役）</MenuItem>
                <MenuItem value="admin">管理者</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateClose}>キャンセル</Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={isSubmitting || !formData.employeeId || !formData.name || !formData.email || !formData.password || !formData.department}
          >
            {isSubmitting ? <CircularProgress size={20} /> : '作成'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>ユーザー編集</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="社員ID"
              value={formData.employeeId}
              onChange={(e) => handleFormChange('employeeId', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="氏名"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="メールアドレス"
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
              required
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel>部署</InputLabel>
              <Select
                value={formData.department}
                label="部署"
                onChange={(e) => handleFormChange('department', e.target.value)}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>ロール</InputLabel>
              <Select
                value={formData.role}
                label="ロール"
                onChange={(e) => handleFormChange('role', e.target.value)}
              >
                <MenuItem value="user">一般ユーザー</MenuItem>
                <MenuItem value="approver">承認者</MenuItem>
                <MenuItem value="onsite_leader">オンサイトリーダー</MenuItem>
                <MenuItem value="gm">GM（部門長）</MenuItem>
                <MenuItem value="bod">BOD（取締役）</MenuItem>
                <MenuItem value="admin">管理者</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.weeklyReportExempt}
                  onChange={(e) => handleFormChange('weeklyReportExempt', e.target.checked)}
                />
              }
              label="週報提出を免除する"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>キャンセル</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={isSubmitting || !formData.employeeId || !formData.name || !formData.email || !formData.department}
          >
            {isSubmitting ? <CircularProgress size={20} /> : '更新'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteClose}>
        <DialogTitle>ユーザー削除の確認</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedUser?.name}（{selectedUser?.employeeId}）を削除しますか？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>キャンセル</Button>
          <Button
            onClick={handleDeleteSubmit}
            variant="contained"
            color="error"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={20} /> : '削除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={handlePasswordClose} maxWidth="sm" fullWidth>
        <DialogTitle>パスワード変更</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {selectedUser?.name}（{selectedUser?.employeeId}）のパスワードを変更
          </Typography>
          <TextField
            label="新しいパスワード"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            fullWidth
            helperText="6文字以上"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePasswordClose}>キャンセル</Button>
          <Button
            onClick={handlePasswordSubmit}
            variant="contained"
            disabled={isSubmitting || newPassword.length < 6}
          >
            {isSubmitting ? <CircularProgress size={20} /> : '変更'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserListPage;
