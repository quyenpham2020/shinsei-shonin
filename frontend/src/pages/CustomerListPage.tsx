import React, { useState, useEffect, useRef } from 'react';
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
  Collapse,
  ButtonGroup,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  UnfoldMore as ExpandAllIcon,
  UnfoldLess as CollapseAllIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { customerService, Customer, CustomerInput } from '../services/customerService';
import { useTranslation } from 'react-i18next';

interface Team {
  id: number;
  name: string;
}

type GroupByMode = 'none' | 'team';

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
  const [groupBy, setGroupBy] = useState<GroupByMode>('none');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Group customers by team
  const groupedData: Record<string, Customer[]> = {};
  if (groupBy === 'team') {
    customers.forEach(customer => {
      const teamNames = customer.team_names?.join(', ') || '未割り当て';
      if (!groupedData[teamNames]) {
        groupedData[teamNames] = [];
      }
      groupedData[teamNames].push(customer);
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

  // Excel Export
  const handleExport = () => {
    try {
      const exportData = customers.map(customer => ({
        '顧客名': customer.name,
        '説明': customer.description || '',
        '担当チーム': customer.team_names?.join(', ') || '',
        'ステータス': customer.is_active === 1 ? '有効' : '無効',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '顧客一覧');

      const fileName = `customers_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setSuccess('Excelファイルをエクスポートしました');
      setTimeout(() => setSuccess(null), 3000);
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

      let successCount = 0;
      let errorCount = 0;

      for (const row of jsonData) {
        try {
          // Find team IDs from team names
          const teamNames = row['担当チーム']?.split(',').map((n: string) => n.trim()) || [];
          const team_ids = teams
            .filter(t => teamNames.includes(t.name))
            .map(t => t.id);

          const customerData: CustomerInput = {
            name: row['顧客名'],
            description: row['説明'] || '',
            team_ids: team_ids,
          };

          await customerService.create(customerData);
          successCount++;
        } catch (err) {
          errorCount++;
          console.error('Failed to import customer:', row['顧客名'], err);
        }
      }

      if (successCount > 0) {
        setSuccess(`${successCount}件の顧客をインポートしました${errorCount > 0 ? ` (${errorCount}件失敗)` : ''}`);
        fetchCustomers();
      } else {
        setError('顧客のインポートに失敗しました');
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

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('revenue:customerManagement')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
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

          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            {t('revenue:customer.addCustomer')}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {groupBy !== 'none' && <TableCell sx={{ width: 50 }} />}
              <TableCell>{t('revenue:customer.name')}</TableCell>
              <TableCell>{t('revenue:customer.description')}</TableCell>
              <TableCell>{t('revenue:customer.teams')}</TableCell>
              <TableCell>{t('revenue:customer.status')}</TableCell>
              <TableCell>{t('common:table.createdAt')}</TableCell>
              <TableCell align="right">{t('common:table.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupBy === 'none' ? (
              customers.map((customer) => (
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
                    <TableCell colSpan={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {groupName}
                        </Typography>
                        <Chip label={`${groupedData[groupName].length}件`} size="small" />
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                      <Collapse in={expandedGroups.has(groupName)} timeout="auto" unmountOnExit>
                        <Table size="small">
                          <TableBody>
                            {groupedData[groupName].map((customer) => (
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
