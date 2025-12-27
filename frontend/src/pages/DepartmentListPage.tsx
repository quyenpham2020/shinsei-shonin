import React, { useEffect, useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { departmentService, Department, CreateDepartmentData, UpdateDepartmentData } from '../services/departmentService';

interface DepartmentFormData {
  code: string;
  name: string;
  description: string;
}

const initialFormData: DepartmentFormData = {
  code: '',
  name: '',
  description: '',
};

const DepartmentListPage: React.FC = () => {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState<DepartmentFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const data = await departmentService.getAll();
      setDepartments(data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setError('部署一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
      const createData: CreateDepartmentData = {
        code: formData.code,
        name: formData.name,
        description: formData.description || undefined,
      };
      await departmentService.create(createData);
      setSuccessMessage('部署を作成しました');
      handleCreateClose();
      fetchDepartments();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : '部署の作成に失敗しました';
      setError(errorMessage || '部署の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (department: Department) => {
    setSelectedDepartment(department);
    setFormData({
      code: department.code,
      name: department.name,
      description: department.description || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedDepartment(null);
    setFormData(initialFormData);
  };

  const handleEditSubmit = async () => {
    if (!selectedDepartment) return;
    setIsSubmitting(true);
    try {
      const updateData: UpdateDepartmentData = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
      };
      await departmentService.update(selectedDepartment.id, updateData);
      setSuccessMessage('部署情報を更新しました');
      handleEditClose();
      fetchDepartments();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : '部署の更新に失敗しました';
      setError(errorMessage || '部署の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOpen = (department: Department) => {
    setSelectedDepartment(department);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setSelectedDepartment(null);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedDepartment) return;
    setIsSubmitting(true);
    try {
      await departmentService.delete(selectedDepartment.id);
      setSuccessMessage('部署を削除しました');
      handleDeleteClose();
      fetchDepartments();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : '部署の削除に失敗しました';
      setError(errorMessage || '部署の削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (field: keyof DepartmentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          部署管理
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateOpen}>
          新規部署
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              部署がありません
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>部署コード</TableCell>
                <TableCell>部署名</TableCell>
                <TableCell>説明</TableCell>
                <TableCell>作成日</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id} hover>
                  <TableCell>{dept.code}</TableCell>
                  <TableCell>{dept.name}</TableCell>
                  <TableCell>{dept.description || '-'}</TableCell>
                  <TableCell>{formatDate(dept.created_at)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={t('common:tooltips.edit')}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditOpen(dept)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common:tooltips.delete')}>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteOpen(dept)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Department Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
        <DialogTitle>新規部署作成</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="部署コード"
              value={formData.code}
              onChange={(e) => handleFormChange('code', e.target.value)}
              required
              fullWidth
              helperText="例: SALES, DEV, HR"
            />
            <TextField
              label="部署名"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="説明"
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateClose}>キャンセル</Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={isSubmitting || !formData.code || !formData.name}
          >
            {isSubmitting ? <CircularProgress size={20} /> : '作成'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>部署編集</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="部署コード"
              value={formData.code}
              onChange={(e) => handleFormChange('code', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="部署名"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="説明"
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>キャンセル</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={isSubmitting || !formData.code || !formData.name}
          >
            {isSubmitting ? <CircularProgress size={20} /> : '更新'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteClose}>
        <DialogTitle>部署削除の確認</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedDepartment?.name}（{selectedDepartment?.code}）を削除しますか？
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

export default DepartmentListPage;
