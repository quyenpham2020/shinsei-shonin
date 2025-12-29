import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Collapse,
  ButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  UnfoldMore as ExpandAllIcon,
  UnfoldLess as CollapseAllIcon,
} from '@mui/icons-material';
import { revenueService, RevenueRecord, RevenueInput } from '../services/revenueService';
import { customerService, Customer } from '../services/customerService';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

type GroupByMode = 'none' | 'customer' | 'team';

const RevenueManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RevenueRecord | null>(null);
  const [formData, setFormData] = useState<RevenueInput>({
    customer_id: 0,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    mm_onsite: 0,
    mm_offshore: 0,
    unit_price_onsite: 0,
    unit_price_offshore: 0,
    notes: '',
  });
  const [groupBy, setGroupBy] = useState<GroupByMode>('none');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRecords();
    fetchCustomers();
  }, []);

  const fetchRecords = async () => {
    try {
      const data = await revenueService.getAll();
      setRecords(data);
    } catch (error) {
      console.error('Failed to fetch revenue records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await customerService.getAll();
      setCustomers(data.filter((c) => c.is_active === 1));
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const handleOpenDialog = (record?: RevenueRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        customer_id: record.customer_id,
        year: record.year,
        month: record.month,
        mm_onsite: record.mm_onsite,
        mm_offshore: record.mm_offshore,
        unit_price_onsite: record.unit_price_onsite || 0,
        unit_price_offshore: record.unit_price_offshore || 0,
        notes: record.notes || '',
      });
    } else {
      setEditingRecord(null);
      setFormData({
        customer_id: 0,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        mm_onsite: 0,
        mm_offshore: 0,
        unit_price_onsite: 0,
        unit_price_offshore: 0,
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRecord(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingRecord) {
        await revenueService.update(editingRecord.id, formData);
      } else {
        await revenueService.create(formData);
      }
      fetchRecords();
      handleCloseDialog();
    } catch (error: any) {
      console.error('Failed to save revenue record:', error);
      alert(error.response?.data?.message || 'Failed to save revenue record');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('revenue:messages.confirmDeleteRevenue'))) {
      try {
        await revenueService.delete(id);
        fetchRecords();
      } catch (error) {
        console.error('Failed to delete revenue record:', error);
      }
    }
  };

  const canDelete = user?.role === 'admin' || user?.role === 'gm' || user?.role === 'bod';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  // Group revenue records
  const groupedData: Record<string, RevenueRecord[]> = {};
  if (groupBy !== 'none') {
    records.forEach(record => {
      const key = groupBy === 'customer'
        ? record.customer_name || '不明'
        : (record.team_names?.join(', ') || '未割り当て');
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(record);
    });
  }

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const expandAll = () => {
    setExpandedGroups(new Set(Object.keys(groupedData)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('revenue:revenueManagement')}</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>グループ表示</InputLabel>
            <Select
              value={groupBy}
              label="グループ表示"
              onChange={(e) => {
                setGroupBy(e.target.value as GroupByMode);
                setExpandedGroups(new Set());
              }}
            >
              <MenuItem value="none">なし</MenuItem>
              <MenuItem value="customer">顧客別</MenuItem>
              <MenuItem value="team">チーム別</MenuItem>
            </Select>
          </FormControl>

          {groupBy !== 'none' && (
            <ButtonGroup size="small" variant="outlined">
              <Button startIcon={<ExpandAllIcon />} onClick={expandAll}>
                全展開
              </Button>
              <Button startIcon={<CollapseAllIcon />} onClick={collapseAll}>
                全省略
              </Button>
            </ButtonGroup>
          )}

          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            {t('revenue:revenue.addRevenue')}
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {groupBy !== 'none' && <TableCell sx={{ width: 50 }} />}
              <TableCell>{t('revenue:revenue.yearMonth')}</TableCell>
              <TableCell>{t('revenue:customer.name')}</TableCell>
              <TableCell align="right">{t('revenue:revenue.mmOnsite')}</TableCell>
              <TableCell align="right">{t('revenue:revenue.mmOffshore')}</TableCell>
              <TableCell align="right">単価 Onsite</TableCell>
              <TableCell align="right">単価 Offshore</TableCell>
              <TableCell align="right">{t('revenue:revenue.totalAmount')}</TableCell>
              <TableCell>{t('revenue:revenue.notes')}</TableCell>
              <TableCell align="right">{t('common:table.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupBy === 'none' ? (
              records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>
                  <Chip
                    label={`${record.year}年 ${record.month}月`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{record.customer_name}</TableCell>
                <TableCell align="right">{record.mm_onsite.toFixed(2)}</TableCell>
                <TableCell align="right">{record.mm_offshore.toFixed(2)}</TableCell>
                <TableCell align="right">{formatCurrency(record.unit_price_onsite || 0)}</TableCell>
                <TableCell align="right">{formatCurrency(record.unit_price_offshore || 0)}</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(record.total_amount)}
                  </Typography>
                </TableCell>
                <TableCell>{record.notes || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenDialog(record)}>
                    <EditIcon />
                  </IconButton>
                  {canDelete && (
                    <IconButton size="small" onClick={() => handleDelete(record.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))
            ) : (
              Object.keys(groupedData).sort().map((groupName) => (
                <React.Fragment key={groupName}>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>
                      <IconButton size="small" onClick={() => toggleGroup(groupName)}>
                        {expandedGroups.has(groupName) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell colSpan={9}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {groupName}
                        </Typography>
                        <Chip label={`${groupedData[groupName].length}件`} size="small" />
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={10} sx={{ p: 0, border: 0 }}>
                      <Collapse in={expandedGroups.has(groupName)} timeout="auto" unmountOnExit>
                        <Table size="small">
                          <TableBody>
                            {groupedData[groupName].map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>
                                  <Chip
                                    label={`${record.year}年 ${record.month}月`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>{record.customer_name}</TableCell>
                                <TableCell align="right">{record.mm_onsite.toFixed(2)}</TableCell>
                                <TableCell align="right">{record.mm_offshore.toFixed(2)}</TableCell>
                                <TableCell align="right">{formatCurrency(record.unit_price_onsite || 0)}</TableCell>
                                <TableCell align="right">{formatCurrency(record.unit_price_offshore || 0)}</TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight="bold">
                                    {formatCurrency(record.total_amount)}
                                  </Typography>
                                </TableCell>
                                <TableCell>{record.notes || '-'}</TableCell>
                                <TableCell align="right">
                                  <IconButton size="small" onClick={() => handleOpenDialog(record)}>
                                    <EditIcon />
                                  </IconButton>
                                  {canDelete && (
                                    <IconButton size="small" onClick={() => handleDelete(record.id)} color="error">
                                      <DeleteIcon />
                                    </IconButton>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRecord ? t('revenue:revenue.editRevenue') : t('revenue:revenue.addRevenue')}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>{t('revenue:revenue.customer')}</InputLabel>
            <Select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: Number(e.target.value) })}
              label={t('revenue:revenue.customer')}
            >
              <MenuItem value={0} disabled>
                {t('revenue:fields.selectCustomer')}
              </MenuItem>
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={customer.id}>
                  {customer.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label={t('revenue:fields.year')}
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
              margin="normal"
              required
              sx={{ flex: 1 }}
            />
            <TextField
              label={t('revenue:fields.month')}
              type="number"
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
              margin="normal"
              required
              inputProps={{ min: 1, max: 12 }}
              sx={{ flex: 1 }}
            />
          </Box>

          <TextField
            fullWidth
            label={t('revenue:revenue.mmOnsite')}
            type="number"
            value={formData.mm_onsite}
            onChange={(e) => setFormData({ ...formData, mm_onsite: Number(e.target.value) })}
            margin="normal"
            inputProps={{ min: 0, step: 0.1 }}
          />

          <TextField
            fullWidth
            label={t('revenue:revenue.mmOffshore')}
            type="number"
            value={formData.mm_offshore}
            onChange={(e) => setFormData({ ...formData, mm_offshore: Number(e.target.value) })}
            margin="normal"
            inputProps={{ min: 0, step: 0.1 }}
          />

          <TextField
            fullWidth
            label="単価 Onsite (円)"
            type="number"
            value={formData.unit_price_onsite}
            onChange={(e) => setFormData({ ...formData, unit_price_onsite: Number(e.target.value) })}
            margin="normal"
            inputProps={{ min: 0 }}
          />

          <TextField
            fullWidth
            label="単価 Offshore (円)"
            type="number"
            value={formData.unit_price_offshore}
            onChange={(e) => setFormData({ ...formData, unit_price_offshore: Number(e.target.value) })}
            margin="normal"
            inputProps={{ min: 0 }}
          />

          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('revenue:revenue.totalMM')}: {(formData.mm_onsite + formData.mm_offshore).toFixed(2)}
            </Typography>
            <Typography variant="h6" color="primary">
              {t('revenue:revenue.totalAmount')}:{' '}
              {formatCurrency((formData.mm_onsite * (formData.unit_price_onsite || 0)) + (formData.mm_offshore * (formData.unit_price_offshore || 0)))}
            </Typography>
          </Box>

          <TextField
            fullWidth
            label={t('revenue:revenue.notes')}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common:buttons.cancel')}</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.customer_id || !formData.year || !formData.month}
          >
            {editingRecord ? t('common:buttons.update') : t('common:buttons.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RevenueManagementPage;
