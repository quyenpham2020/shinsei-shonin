import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Save as SaveIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { systemAccessService, UserWithAccess } from '../services/systemAccessService';
import { systems } from '../config/systems';

const SystemAccessPage: React.FC = () => {
  const [users, setUsers] = useState<UserWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [changes, setChanges] = useState<Map<number, string[]>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
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
            sx={{ minWidth: 300 }}
          />
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
              <TableCell sx={{ fontWeight: 600 }}>社員番号</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>名前</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>部署</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>ロール</TableCell>
              {accessibleSystems.map(system => (
                <TableCell key={system.id} align="center" sx={{ fontWeight: 600, minWidth: 120 }}>
                  {system.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => {
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
            })}
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
      </Box>
    </Container>
  );
};

export default SystemAccessPage;
