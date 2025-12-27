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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { revenueService, RevenueRecord, RevenueInput } from '../services/revenueService';
import { customerService, Customer } from '../services/customerService';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

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
    unit_price: 0,
    notes: '',
  });

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
        unit_price: record.unit_price,
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
        unit_price: 0,
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

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('revenue:revenueManagement')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          {t('revenue:revenue.addRevenue')}
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('revenue:revenue.yearMonth')}</TableCell>
              <TableCell>{t('revenue:customer.name')}</TableCell>
              <TableCell align="right">{t('revenue:revenue.mmOnsite')}</TableCell>
              <TableCell align="right">{t('revenue:revenue.mmOffshore')}</TableCell>
              <TableCell align="right">{t('revenue:revenue.unitPrice')}</TableCell>
              <TableCell align="right">{t('revenue:revenue.totalAmount')}</TableCell>
              <TableCell>{t('revenue:revenue.notes')}</TableCell>
              <TableCell align="right">{t('common:table.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => (
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
                <TableCell align="right">{formatCurrency(record.unit_price)}</TableCell>
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
            label={`${t('revenue:revenue.unitPrice')} (円)`}
            type="number"
            value={formData.unit_price}
            onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
            margin="normal"
            inputProps={{ min: 0 }}
          />

          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('revenue:revenue.totalMM')}: {(formData.mm_onsite + formData.mm_offshore).toFixed(2)}
            </Typography>
            <Typography variant="h6" color="primary">
              {t('revenue:revenue.totalAmount')}:{' '}
              {formatCurrency((formData.mm_onsite + formData.mm_offshore) * formData.unit_price)}
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
