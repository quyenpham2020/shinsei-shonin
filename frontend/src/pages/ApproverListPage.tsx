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
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { approverService, Approver, ApproverCandidate, CreateApproverData, UpdateApproverData } from '../services/approverService';
import { departmentService, Department } from '../services/departmentService';

interface ApproverFormData {
  userId: number | '';
  departmentId: number | '';
  approvalLevel: number;
  maxAmount: string;
  isActive: boolean;
}

const initialFormData: ApproverFormData = {
  userId: '',
  departmentId: '',
  approvalLevel: 1,
  maxAmount: '',
  isActive: true,
};

const ApproverListPage: React.FC = () => {
  const { t } = useTranslation();
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [candidates, setCandidates] = useState<ApproverCandidate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<Approver | null>(null);
  const [formData, setFormData] = useState<ApproverFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchApprovers = async () => {
    setIsLoading(true);
    try {
      const data = await approverService.getAll();
      setApprovers(data);
    } catch (err) {
      console.error('Failed to fetch approvers:', err);
      setError('承認者一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      const data = await approverService.getCandidates();
      setCandidates(data);
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
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
    fetchApprovers();
    fetchCandidates();
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
    if (formData.userId === '' || formData.departmentId === '') return;
    setIsSubmitting(true);
    try {
      const createData: CreateApproverData = {
        userId: formData.userId as number,
        departmentId: formData.departmentId as number,
        approvalLevel: formData.approvalLevel,
        maxAmount: formData.maxAmount ? Number(formData.maxAmount) : null,
      };
      await approverService.create(createData);
      setSuccessMessage('承認者を登録しました');
      handleCreateClose();
      fetchApprovers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : '承認者の登録に失敗しました';
      setError(errorMessage || '承認者の登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (approver: Approver) => {
    setSelectedApprover(approver);
    setFormData({
      userId: approver.user_id,
      departmentId: approver.department_id,
      approvalLevel: approver.approval_level,
      maxAmount: approver.max_amount ? String(approver.max_amount) : '',
      isActive: approver.is_active === 1,
    });
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedApprover(null);
    setFormData(initialFormData);
  };

  const handleEditSubmit = async () => {
    if (!selectedApprover) return;
    setIsSubmitting(true);
    try {
      const updateData: UpdateApproverData = {
        approvalLevel: formData.approvalLevel,
        maxAmount: formData.maxAmount ? Number(formData.maxAmount) : null,
        isActive: formData.isActive,
      };
      await approverService.update(selectedApprover.id, updateData);
      setSuccessMessage('承認者情報を更新しました');
      handleEditClose();
      fetchApprovers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : '承認者の更新に失敗しました';
      setError(errorMessage || '承認者の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOpen = (approver: Approver) => {
    setSelectedApprover(approver);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setSelectedApprover(null);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedApprover) return;
    setIsSubmitting(true);
    try {
      await approverService.delete(selectedApprover.id);
      setSuccessMessage('承認者設定を削除しました');
      handleDeleteClose();
      fetchApprovers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : '承認者の削除に失敗しました';
      setError(errorMessage || '承認者の削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount: number | null) => {
    if (amount === null) return '無制限';
    return `¥${amount.toLocaleString()}`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          承認者管理
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateOpen}>
          新規登録
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            承認者と担当部署の割り当てを管理します。承認レベルは1次承認、2次承認などの順番を表します。
          </Typography>
        </CardContent>
      </Card>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : approvers.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              承認者が登録されていません
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>承認者</TableCell>
                <TableCell>担当部署</TableCell>
                <TableCell align="center">承認レベル</TableCell>
                <TableCell align="right">承認上限金額</TableCell>
                <TableCell align="center">ステータス</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approvers.map((approver) => (
                <TableRow key={approver.id} hover>
                  <TableCell>
                    {approver.user_name}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {approver.user_employee_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {approver.department_name}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {approver.department_code}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${approver.approval_level}次承認`}
                      size="small"
                      color={approver.approval_level === 1 ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell align="right">{formatAmount(approver.max_amount)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={approver.is_active ? '有効' : '無効'}
                      size="small"
                      color={approver.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={t('common:tooltips.edit')}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditOpen(approver)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common:tooltips.delete')}>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteOpen(approver)}
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

      {/* Create Approver Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
        <DialogTitle>承認者登録</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>承認者</InputLabel>
              <Select
                value={formData.userId}
                label="承認者"
                onChange={(e) => setFormData({ ...formData, userId: e.target.value as number })}
              >
                {candidates.map((candidate) => (
                  <MenuItem key={candidate.id} value={candidate.id}>
                    {candidate.name}（{candidate.employee_id}） - {candidate.department}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>担当部署</InputLabel>
              <Select
                value={formData.departmentId}
                label="担当部署"
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value as number })}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name}（{dept.code}）
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>承認レベル</InputLabel>
              <Select
                value={formData.approvalLevel}
                label="承認レベル"
                onChange={(e) => setFormData({ ...formData, approvalLevel: e.target.value as number })}
              >
                <MenuItem value={1}>1次承認</MenuItem>
                <MenuItem value={2}>2次承認</MenuItem>
                <MenuItem value={3}>3次承認</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="承認上限金額"
              type="number"
              value={formData.maxAmount}
              onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
              fullWidth
              helperText="空欄の場合は無制限"
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>¥</Typography>,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateClose}>キャンセル</Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={isSubmitting || formData.userId === '' || formData.departmentId === ''}
          >
            {isSubmitting ? <CircularProgress size={20} /> : '登録'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Approver Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>承認者編集</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="承認者"
              value={selectedApprover ? `${selectedApprover.user_name}（${selectedApprover.user_employee_id}）` : ''}
              fullWidth
              disabled
            />
            <TextField
              label="担当部署"
              value={selectedApprover ? `${selectedApprover.department_name}（${selectedApprover.department_code}）` : ''}
              fullWidth
              disabled
            />
            <FormControl fullWidth>
              <InputLabel>承認レベル</InputLabel>
              <Select
                value={formData.approvalLevel}
                label="承認レベル"
                onChange={(e) => setFormData({ ...formData, approvalLevel: e.target.value as number })}
              >
                <MenuItem value={1}>1次承認</MenuItem>
                <MenuItem value={2}>2次承認</MenuItem>
                <MenuItem value={3}>3次承認</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="承認上限金額"
              type="number"
              value={formData.maxAmount}
              onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
              fullWidth
              helperText="空欄の場合は無制限"
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>¥</Typography>,
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="有効"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>キャンセル</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={20} /> : '更新'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteClose}>
        <DialogTitle>承認者削除の確認</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedApprover?.user_name}（{selectedApprover?.department_name}）の承認者設定を削除しますか？
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

export default ApproverListPage;
