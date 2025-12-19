import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VpnKey as KeyIcon,
} from '@mui/icons-material';
import { userService, CreateUserData, UpdateUserData } from '../services/userService';
import { departmentService, Department } from '../services/departmentService';
import { User } from '../types';

const ROLE_LABELS: Record<string, string> = {
  user: '一般ユーザー',
  approver: '承認者',
  admin: '管理者',
};

const ROLE_COLORS: Record<string, 'default' | 'primary' | 'secondary'> = {
  user: 'default',
  approver: 'primary',
  admin: 'secondary',
};

interface UserFormData {
  employeeId: string;
  name: string;
  email: string;
  password: string;
  department: string;
  role: 'user' | 'approver' | 'admin';
}

const initialFormData: UserFormData = {
  employeeId: '',
  name: '',
  email: '',
  password: '',
  department: '',
  role: 'user',
};

const UserListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getAll();
      setUsers(data);
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

  const handleEditOpen = (user: User) => {
    setSelectedUser(user);
    setFormData({
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      password: '',
      department: user.department,
      role: user.role,
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

  const handleDeleteOpen = (user: User) => {
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

  const handlePasswordOpen = (user: User) => {
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

  const handleFormChange = (field: keyof UserFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          ユーザー管理
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateOpen}>
          新規ユーザー
        </Button>
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
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>社員ID</TableCell>
                <TableCell>氏名</TableCell>
                <TableCell>メールアドレス</TableCell>
                <TableCell>部署</TableCell>
                <TableCell>ロール</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.employeeId}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <Chip
                      label={ROLE_LABELS[user.role]}
                      color={ROLE_COLORS[user.role]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleEditOpen(user)}
                      title="編集"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handlePasswordOpen(user)}
                      title="パスワード変更"
                    >
                      <KeyIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteOpen(user)}
                      title="削除"
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
                onChange={(e) => handleFormChange('role', e.target.value as 'user' | 'approver' | 'admin')}
              >
                <MenuItem value="user">一般ユーザー</MenuItem>
                <MenuItem value="approver">承認者</MenuItem>
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
                onChange={(e) => handleFormChange('role', e.target.value as 'user' | 'approver' | 'admin')}
              >
                <MenuItem value="user">一般ユーザー</MenuItem>
                <MenuItem value="approver">承認者</MenuItem>
                <MenuItem value="admin">管理者</MenuItem>
              </Select>
            </FormControl>
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
