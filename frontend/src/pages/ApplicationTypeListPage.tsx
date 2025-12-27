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
  FormControlLabel,
  Switch,
  Alert,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { applicationTypeService, ApplicationType, CreateApplicationTypeData, UpdateApplicationTypeData } from '../services/applicationTypeService';

interface ApplicationTypeFormData {
  code: string;
  name: string;
  description: string;
  requiresAmount: boolean;
  requiresAttachment: boolean;
  approvalLevels: number;
  displayOrder: number;
  isActive: boolean;
}

const initialFormData: ApplicationTypeFormData = {
  code: '',
  name: '',
  description: '',
  requiresAmount: false,
  requiresAttachment: false,
  approvalLevels: 1,
  displayOrder: 0,
  isActive: true,
};

const ApplicationTypeListPage: React.FC = () => {
  const { t } = useTranslation();
  const [applicationTypes, setApplicationTypes] = useState<ApplicationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ApplicationType | null>(null);
  const [formData, setFormData] = useState<ApplicationTypeFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchApplicationTypes = async () => {
    setIsLoading(true);
    try {
      const data = await applicationTypeService.getAll(true);
      setApplicationTypes(data);
    } catch (err) {
      console.error('Failed to fetch application types:', err);
      setError('申請種別一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationTypes();
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
      const createData: CreateApplicationTypeData = {
        code: formData.code,
        name: formData.name,
        description: formData.description || undefined,
        requiresAmount: formData.requiresAmount,
        requiresAttachment: formData.requiresAttachment,
        approvalLevels: formData.approvalLevels,
        displayOrder: formData.displayOrder,
      };
      await applicationTypeService.create(createData);
      setSuccessMessage('申請種別を作成しました');
      handleCreateClose();
      fetchApplicationTypes();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : '申請種別の作成に失敗しました';
      setError(errorMessage || '申請種別の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (appType: ApplicationType) => {
    setSelectedType(appType);
    setFormData({
      code: appType.code,
      name: appType.name,
      description: appType.description || '',
      requiresAmount: appType.requires_amount === 1,
      requiresAttachment: appType.requires_attachment === 1,
      approvalLevels: appType.approval_levels,
      displayOrder: appType.display_order,
      isActive: appType.is_active === 1,
    });
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedType(null);
    setFormData(initialFormData);
  };

  const handleEditSubmit = async () => {
    if (!selectedType) return;
    setIsSubmitting(true);
    try {
      const updateData: UpdateApplicationTypeData = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        requiresAmount: formData.requiresAmount,
        requiresAttachment: formData.requiresAttachment,
        approvalLevels: formData.approvalLevels,
        displayOrder: formData.displayOrder,
        isActive: formData.isActive,
      };
      await applicationTypeService.update(selectedType.id, updateData);
      setSuccessMessage('申請種別を更新しました');
      handleEditClose();
      fetchApplicationTypes();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : '申請種別の更新に失敗しました';
      setError(errorMessage || '申請種別の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOpen = (appType: ApplicationType) => {
    setSelectedType(appType);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setSelectedType(null);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedType) return;
    setIsSubmitting(true);
    try {
      await applicationTypeService.delete(selectedType.id);
      setSuccessMessage('申請種別を削除しました');
      handleDeleteClose();
      fetchApplicationTypes();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : '申請種別の削除に失敗しました';
      setError(errorMessage || '申請種別の削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          申請種別管理
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateOpen}>
          新規作成
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            申請の種別を管理します。金額入力や添付ファイルの必須設定、承認段階数を設定できます。
          </Typography>
        </CardContent>
      </Card>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : applicationTypes.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              申請種別がありません
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>コード</TableCell>
                <TableCell>種別名</TableCell>
                <TableCell>説明</TableCell>
                <TableCell align="center">金額必須</TableCell>
                <TableCell align="center">添付必須</TableCell>
                <TableCell align="center">承認段階</TableCell>
                <TableCell align="center">表示順</TableCell>
                <TableCell align="center">ステータス</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {applicationTypes.map((appType) => (
                <TableRow key={appType.id} hover>
                  <TableCell>{appType.code}</TableCell>
                  <TableCell>{appType.name}</TableCell>
                  <TableCell>{appType.description || '-'}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={appType.requires_amount ? '必須' : '任意'}
                      size="small"
                      color={appType.requires_amount ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={appType.requires_attachment ? '必須' : '任意'}
                      size="small"
                      color={appType.requires_attachment ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">{appType.approval_levels}段階</TableCell>
                  <TableCell align="center">{appType.display_order}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={appType.is_active ? '有効' : '無効'}
                      size="small"
                      color={appType.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={t('common:tooltips.edit')}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditOpen(appType)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common:tooltips.delete')}>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteOpen(appType)}
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

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
        <DialogTitle>新規申請種別作成</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="種別コード"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              fullWidth
              helperText="例: travel, expense, leave"
            />
            <TextField
              label="種別名"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="説明"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="承認段階数"
                type="number"
                value={formData.approvalLevels}
                onChange={(e) => setFormData({ ...formData, approvalLevels: Number(e.target.value) })}
                fullWidth
                inputProps={{ min: 1, max: 5 }}
              />
              <TextField
                label="表示順"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requiresAmount}
                    onChange={(e) => setFormData({ ...formData, requiresAmount: e.target.checked })}
                  />
                }
                label="金額入力必須"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requiresAttachment}
                    onChange={(e) => setFormData({ ...formData, requiresAttachment: e.target.checked })}
                  />
                }
                label="添付ファイル必須"
              />
            </Box>
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>申請種別編集</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="種別コード"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="種別名"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="説明"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="承認段階数"
                type="number"
                value={formData.approvalLevels}
                onChange={(e) => setFormData({ ...formData, approvalLevels: Number(e.target.value) })}
                fullWidth
                inputProps={{ min: 1, max: 5 }}
              />
              <TextField
                label="表示順"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requiresAmount}
                    onChange={(e) => setFormData({ ...formData, requiresAmount: e.target.checked })}
                  />
                }
                label="金額入力必須"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requiresAttachment}
                    onChange={(e) => setFormData({ ...formData, requiresAttachment: e.target.checked })}
                  />
                }
                label="添付ファイル必須"
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
        <DialogTitle>申請種別削除の確認</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedType?.name}（{selectedType?.code}）を削除しますか？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            この種別を使用している申請がある場合は削除できません。
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

export default ApplicationTypeListPage;
