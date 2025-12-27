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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  SelectChangeEvent,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { customerService, Customer, CustomerInput } from '../services/customerService';
import { useTranslation } from 'react-i18next';

interface Team {
  id: number;
  name: string;
}

const CustomerListPage: React.FC = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerInput>({
    name: '',
    description: '',
    team_ids: [],
  });

  useEffect(() => {
    fetchCustomers();
    fetchTeams();
  }, []);

  const fetchCustomers = async () => {
    try {
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        description: customer.description || '',
        team_ids: customer.team_ids || [],
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', description: '', team_ids: [] });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCustomer(null);
    setFormData({ name: '', description: '', team_ids: [] });
  };

  const handleSubmit = async () => {
    try {
      if (editingCustomer) {
        await customerService.update(editingCustomer.id, {
          ...formData,
          is_active: editingCustomer.is_active,
        });
      } else {
        await customerService.create(formData);
      }
      fetchCustomers();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save customer:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('common:confirmDelete') || 'Are you sure you want to delete this customer?')) {
      try {
        await customerService.delete(id);
        fetchCustomers();
      } catch (error) {
        console.error('Failed to delete customer:', error);
      }
    }
  };

  const handleToggleActive = async (customer: Customer) => {
    try {
      await customerService.update(customer.id, {
        ...customer,
        is_active: customer.is_active === 1 ? 0 : 1,
      });
      fetchCustomers();
    } catch (error) {
      console.error('Failed to toggle customer status:', error);
    }
  };

  const handleTeamChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value;
    setFormData({
      ...formData,
      team_ids: typeof value === 'string' ? [] : value,
    });
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('revenue:customerManagement')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          {t('revenue:customer.addCustomer')}
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('revenue:customer.name')}</TableCell>
              <TableCell>{t('revenue:customer.description')}</TableCell>
              <TableCell>{t('revenue:customer.teams')}</TableCell>
              <TableCell>{t('revenue:customer.status')}</TableCell>
              <TableCell>{t('common:table.createdAt')}</TableCell>
              <TableCell align="right">{t('common:table.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.description || '-'}</TableCell>
                <TableCell>
                  {customer.team_names && customer.team_names.length > 0 ? (
                    customer.team_names.map((teamName, idx) => (
                      <Chip key={idx} label={teamName} size="small" sx={{ mr: 0.5 }} />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {t('revenue:customer.unassigned')}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={customer.is_active === 1}
                        onChange={() => handleToggleActive(customer)}
                        size="small"
                      />
                    }
                    label={customer.is_active === 1 ? t('revenue:customer.active') : t('revenue:customer.inactive')}
                  />
                </TableCell>
                <TableCell>{new Date(customer.created_at).toLocaleDateString('ja-JP')}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenDialog(customer)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(customer.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCustomer ? t('revenue:customer.editCustomer') : t('revenue:customer.addCustomer')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('revenue:customer.name')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label={t('revenue:customer.description')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('revenue:customer.teams')}</InputLabel>
            <Select
              multiple
              value={formData.team_ids || []}
              onChange={handleTeamChange}
              input={<OutlinedInput label={t('revenue:customer.teams')} />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((teamId) => {
                    const team = teams.find((t) => t.id === teamId);
                    return <Chip key={teamId} label={team?.name || teamId} size="small" />;
                  })}
                </Box>
              )}
            >
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common:buttons.cancel')}</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.name}>
            {editingCustomer ? t('common:buttons.update') : t('common:buttons.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerListPage;
