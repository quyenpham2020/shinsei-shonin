import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Button,
  Alert,
  CircularProgress,
  Box,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Collapse,
  ButtonGroup,
} from '@mui/material';
import {
  Save as SaveIcon,
  Search as SearchIcon,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  UnfoldMore as ExpandAllIcon,
  UnfoldLess as CollapseAllIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { systemAccessService, UserWithAccess } from '../services/systemAccessService';
import { systems } from '../config/systems';

type GroupByMode = 'none' | 'department' | 'team';

interface GroupedData {
  [key: string]: UserWithAccess[];
}

const SystemAccessPage: React.FC = () => {
  const [users, setUsers] = useState<UserWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [changes, setChanges] = useState<Map<number, string[]>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByMode>('none');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter out admin-only systems for regular access management
  const accessibleSystems = systems.filter(s => s.enabled && !s.adminOnly);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await systemAccessService.getAllUsersWithAccess();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccess = (userId: number, systemId: string, currentSystems: string[]) => {
    const userChanges = changes.get(userId) || [...currentSystems];

    if (userChanges.includes(systemId)) {
      // Remove access
      const newSystems = userChanges.filter(s => s !== systemId);
      setChanges(new Map(changes).set(userId, newSystems));
    } else {
      // Add access
      const newSystems = [...userChanges, systemId];
      setChanges(new Map(changes).set(userId, newSystems));
    }
  };

  const getUserSystems = (user: UserWithAccess): string[] => {
    return changes.has(user.id) ? changes.get(user.id)! : user.systems;
  };

  const hasChanges = () => {
    return changes.size > 0;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const updates = Array.from(changes.entries()).map(([userId, systems]) => ({
        userId,
        systems,
      }));

      await systemAccessService.bulkUpdateAccess(updates);

      // Update local state
      setUsers(users.map(user => ({
        ...user,
        systems: changes.has(user.id) ? changes.get(user.id)! : user.systems,
      })));

      setChanges(new Map());
      setSuccess('System access updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save changes');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      user.employee_id.toLowerCase().includes(term) ||
      user.department.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  });

  // Group users by selected mode
  const groupedData: GroupedData = {};
  if (groupBy !== 'none') {
    filteredUsers.forEach(user => {
      const key = groupBy === 'department' ? user.department : (user.team_name || '未割り当て');
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(user);
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
      const exportData = users.map(user => {
        const row: any = {
          '社員番号': user.employee_id,
          '名前': user.name,
          '部署': user.department,
          'チーム': user.team_name || '',
          'ロール': user.role,
        };
        accessibleSystems.forEach(system => {
          row[system.name] = getUserSystems(user).includes(system.id) ? '○' : '';
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'システムアクセス');

      const fileName = `system_access_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setSuccess('Excel file exported successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to export Excel file');
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

      // Process imported data
      const newChanges = new Map(changes);

      jsonData.forEach((row: any) => {
        const employeeId = row['社員番号'];
        const user = users.find(u => u.employee_id === employeeId);

        if (user) {
          const newSystems: string[] = [];
          accessibleSystems.forEach(system => {
            if (row[system.name] === '○' || row[system.name] === 'o' || row[system.name] === 'O') {
              newSystems.push(system.id);
            }
          });
          newChanges.set(user.id, newSystems);
        }
      });

      setChanges(newChanges);
      setSuccess(`Imported ${jsonData.length} rows. Please review and save changes.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError('Failed to import Excel file');
      console.error(err);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const renderUserRow = (user: UserWithAccess) => {
    const userSystems = getUserSystems(user);
    const isChanged = changes.has(user.id);
    const isAdmin = user.role === 'admin';

    return (
      <TableRow
        key={user.id}
        sx={{
          bgcolor: isChanged ? 'action.selected' : 'inherit',
          opacity: isAdmin ? 0.6 : 1,
        }}
      >
        <TableCell>{user.employee_id}</TableCell>
        <TableCell>
          {user.name}
          {isAdmin && (
            <Chip
              label="Admin"
              size="small"
              color="primary"
              sx={{ ml: 1 }}
            />
          )}
        </TableCell>
        <TableCell>{user.department}</TableCell>
        <TableCell>{user.team_name || '-'}</TableCell>
        <TableCell>
          <Chip
            label={user.role === 'admin' ? '管理者' : user.role === 'approver' ? '承認者' : '一般'}
            size="small"
            color={user.role === 'admin' ? 'error' : user.role === 'approver' ? 'warning' : 'default'}
          />
        </TableCell>
        {accessibleSystems.map(system => (
          <TableCell key={system.id} align="center">
            <Checkbox
              checked={isAdmin || userSystems.includes(system.id)}
              onChange={() => handleToggleAccess(user.id, system.id, user.systems)}
              disabled={isAdmin}
              sx={{
                color: system.color,
                '&.Mui-checked': {
                  color: system.color,
                },
              }}
            />
          </TableCell>
        ))}
      </TableRow>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          システムアクセス管理
        </Typography>
        <Typography variant="body1" color="text.secondary">
          各ユーザーがアクセスできるシステムを設定します
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="ユーザー検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />

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
              <MenuItem value="department">部署別</MenuItem>
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

          <Box sx={{ flex: 1 }} />

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleImport}
          />

          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={handleImportClick}
          >
            インポート
          </Button>

          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
          >
            エクスポート
          </Button>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!hasChanges() || saving}
          >
            {saving ? '保存中...' : '変更を保存'}
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {groupBy !== 'none' && <TableCell sx={{ fontWeight: 600, width: 50 }} />}
              <TableCell sx={{ fontWeight: 600 }}>社員番号</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>名前</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>部署</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>チーム</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>ロール</TableCell>
              {accessibleSystems.map(system => (
                <TableCell key={system.id} align="center" sx={{ fontWeight: 600, minWidth: 120 }}>
                  {system.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {groupBy === 'none' ? (
              filteredUsers.map(renderUserRow)
            ) : (
              Object.keys(groupedData).sort().map((groupName) => (
                <React.Fragment key={groupName}>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => toggleGroup(groupName)}
                      >
                        {expandedGroups.has(groupName) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell colSpan={5 + accessibleSystems.length}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {groupName}
                        </Typography>
                        <Chip label={`${groupedData[groupName].length}名`} size="small" />
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6 + accessibleSystems.length} sx={{ p: 0, border: 0 }}>
                      <Collapse in={expandedGroups.has(groupName)} timeout="auto" unmountOnExit>
                        <Table size="small">
                          <TableBody>
                            {groupedData[groupName].map(renderUserRow)}
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

      {filteredUsers.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            {searchTerm ? '検索結果がありません' : 'ユーザーがいません'}
          </Typography>
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          * 管理者（Admin）は全てのシステムにアクセスできるため、設定を変更できません。
        </Typography>
        <Typography variant="body2" color="text.secondary">
          * Excelファイルのシステム列は「○」で権限を付与します。
        </Typography>
      </Box>
    </Container>
  );
};

export default SystemAccessPage;
