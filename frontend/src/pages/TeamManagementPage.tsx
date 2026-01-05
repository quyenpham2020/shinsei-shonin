import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Button,
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
  Box,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import Checkbox from '@mui/material/Checkbox';
import { teamService } from '../services/teamService';
import { departmentService } from '../services/departmentService';
import { userService } from '../services/userService';
import { Team, TeamMember, ROLE_LABELS, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface Department {
  id: number;
  code: string;
  name: string;
}

interface UserOption {
  id: number;
  employee_id: string;
  name: string;
  department: string;
  role: string;
}

const TeamManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);

  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openMembersDialog, setOpenMembersDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    department_id: 0,
    description: '',
    leader_id: null as number | null,
    webhook_url: '',
  });

  // Member management states
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableMembers, setAvailableMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Check if user can manage teams
  const canManageTeams = user?.role === 'admin' || user?.role === 'bod' || user?.role === 'gm';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamsData, deptsData, usersData] = await Promise.all([
        teamService.getAll(),
        departmentService.getAll(),
        userService.getAll(),
      ]);
      setTeams(teamsData);
      setDepartments(deptsData.filter((d: any) => d.is_active));
      setAllUsers(usersData.map((u: any) => ({
        id: u.id,
        employee_id: u.employee_id,
        name: u.name,
        department: u.department,
        role: u.role,
      })));
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      department_id: departments[0]?.id || 0,
      description: '',
      leader_id: null,
      webhook_url: '',
    });
    setOpenCreateDialog(true);
  };

  const handleOpenEdit = (team: Team) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      department_id: team.department_id,
      description: team.description || '',
      leader_id: team.leader_id,
      webhook_url: team.webhook_url || '',
    });
    setOpenEditDialog(true);
  };

  const handleOpenMembers = async (team: Team) => {
    setSelectedTeam(team);
    setMembersLoading(true);
    setOpenMembersDialog(true);
    try {
      const [members, available] = await Promise.all([
        teamService.getMembers(team.id),
        teamService.getAvailableMembers(team.id),
      ]);
      setTeamMembers(members);
      setAvailableMembers(available);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('メンバー情報の取得に失敗しました');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await teamService.create({
        ...formData,
        leader_id: formData.leader_id ?? undefined,
      });
      setSuccess('チームを作成しました');
      setOpenCreateDialog(false);
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error creating team:', err);
      setError('チームの作成に失敗しました');
    }
  };

  const handleUpdate = async () => {
    if (!selectedTeam) return;
    try {
      await teamService.update(selectedTeam.id, {
        name: formData.name,
        description: formData.description,
        leader_id: formData.leader_id,
        webhook_url: formData.webhook_url,
      });
      setSuccess('チームを更新しました');
      setOpenEditDialog(false);
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating team:', err);
      setError('チームの更新に失敗しました');
    }
  };

  const handleDelete = async (team: Team) => {
    if (!window.confirm(`「${team.name}」を削除してもよろしいですか？`)) return;
    try {
      await teamService.delete(team.id);
      setSuccess('チームを削除しました');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting team:', err);
      setError('チームの削除に失敗しました');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTeamIds.length === 0) return;

    const teamNames = teams
      .filter(t => selectedTeamIds.includes(t.id))
      .map(t => t.name)
      .join('、');

    if (!window.confirm(`以下のチームを削除してもよろしいですか？\n\n${teamNames}`)) return;

    try {
      await teamService.bulkDelete(selectedTeamIds);
      setSuccess(`${selectedTeamIds.length}件のチームを削除しました`);
      setSelectedTeamIds([]);
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error bulk deleting teams:', err);
      setError('チームの一括削除に失敗しました');
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedTeamIds(teams.map(t => t.id));
    } else {
      setSelectedTeamIds([]);
    }
  };

  const handleSelectTeam = (teamId: number) => {
    setSelectedTeamIds(prev => {
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId);
      } else {
        return [...prev, teamId];
      }
    });
  };

  const isAllSelected = teams.length > 0 && selectedTeamIds.length === teams.length;
  const isIndeterminate = selectedTeamIds.length > 0 && selectedTeamIds.length < teams.length;

  const handleAddMember = async (userId: number) => {
    if (!selectedTeam) return;
    try {
      await teamService.addMember(selectedTeam.id, userId);
      const [members, available] = await Promise.all([
        teamService.getMembers(selectedTeam.id),
        teamService.getAvailableMembers(selectedTeam.id),
      ]);
      setTeamMembers(members);
      setAvailableMembers(available);
      fetchData();
    } catch (err) {
      console.error('Error adding member:', err);
      setError('メンバーの追加に失敗しました');
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedTeam) return;
    try {
      await teamService.removeMember(selectedTeam.id, userId);
      const [members, available] = await Promise.all([
        teamService.getMembers(selectedTeam.id),
        teamService.getAvailableMembers(selectedTeam.id),
      ]);
      setTeamMembers(members);
      setAvailableMembers(available);
      fetchData();
    } catch (err: any) {
      console.error('Error removing member:', err);
      setError(err.response?.data?.error || 'メンバーの削除に失敗しました');
    }
  };

  // Get users for leader selection (filter by department)
  const getLeaderOptions = () => {
    const deptId = formData.department_id;
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return [];
    return allUsers.filter(u =>
      u.department === dept.name &&
      ['user', 'approver', 'onsite_leader'].includes(u.role)
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!canManageTeams) {
    return (
      <Container maxWidth="lg">
        <Alert severity="warning" sx={{ mt: 4 }}>
          チーム管理にアクセスする権限がありません。GM以上の権限が必要です。
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            チーム管理
          </Typography>
          <Typography variant="body1" color="text.secondary">
            部門内のチームを管理し、オンサイトリーダーを割り当てます
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {selectedTeamIds.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={handleBulkDelete}
            >
              選択したチームを削除 ({selectedTeamIds.length})
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
          >
            新規チーム作成
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
              <TableCell padding="checkbox">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={handleSelectAll}
                  color="primary"
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>チーム名</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>部署</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>リーダー</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>メンバー数</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>説明</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teams.map((team) => (
              <TableRow
                key={team.id}
                selected={selectedTeamIds.includes(team.id)}
                hover
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedTeamIds.includes(team.id)}
                    onChange={() => handleSelectTeam(team.id)}
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupIcon color="primary" />
                    <Typography fontWeight={500}>{team.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{team.department_name}</TableCell>
                <TableCell>
                  {team.leader_name ? (
                    <Chip
                      label={team.leader_name}
                      size="small"
                      color="secondary"
                    />
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      未設定
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip label={`${team.member_count}名`} size="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                    {team.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={t('common:tooltips.manageMembers')}>
                    <IconButton onClick={() => handleOpenMembers(team)} color="primary">
                      <PersonAddIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common:tooltips.edit')}>
                    <IconButton onClick={() => handleOpenEdit(team)} color="primary">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common:tooltips.delete')}>
                    <IconButton onClick={() => handleDelete(team)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {teams.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    チームがありません。「新規チーム作成」から作成してください。
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Team Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新規チーム作成</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="チーム名"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth required>
              <InputLabel>部署</InputLabel>
              <Select
                value={formData.department_id}
                label="部署"
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value as number, leader_id: null })}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Autocomplete
              options={getLeaderOptions()}
              getOptionLabel={(option) => `${option.name} (${option.employee_id})`}
              value={getLeaderOptions().find(u => u.id === formData.leader_id) || null}
              onChange={(_, newValue) => setFormData({ ...formData, leader_id: newValue?.id || null })}
              renderInput={(params) => (
                <TextField {...params} label="オンサイトリーダー（任意）" />
              )}
            />
            <TextField
              label="説明（任意）"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Webhook URL (Google Chat/Teams)"
              value={formData.webhook_url}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              fullWidth
              placeholder="https://chat.googleapis.com/v1/spaces/..."
              helperText="週次報告が送信されるWebhook URL"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!formData.name || !formData.department_id}
          >
            作成
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>チーム編集</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="チーム名"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="部署"
              value={departments.find(d => d.id === formData.department_id)?.name || ''}
              fullWidth
              disabled
            />
            <Autocomplete
              options={getLeaderOptions()}
              getOptionLabel={(option) => `${option.name} (${option.employee_id})`}
              value={getLeaderOptions().find(u => u.id === formData.leader_id) || null}
              onChange={(_, newValue) => setFormData({ ...formData, leader_id: newValue?.id || null })}
              renderInput={(params) => (
                <TextField {...params} label="オンサイトリーダー" />
              )}
            />
            <TextField
              label="説明（任意）"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Webhook URL (Google Chat/Teams)"
              value={formData.webhook_url}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              fullWidth
              placeholder="https://chat.googleapis.com/v1/spaces/..."
              helperText="週次報告が送信されるWebhook URL"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={!formData.name}
          >
            更新
          </Button>
        </DialogActions>
      </Dialog>

      {/* Members Management Dialog */}
      <Dialog open={openMembersDialog} onClose={() => setOpenMembersDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTeam?.name} - メンバー管理
        </DialogTitle>
        <DialogContent>
          {membersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Current Members */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  現在のメンバー ({teamMembers.length}名)
                </Typography>
                <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <List dense>
                    {teamMembers.map((member) => (
                      <ListItem key={member.id}>
                        <ListItemText
                          primary={member.name}
                          secondary={`${member.employee_id} - ${ROLE_LABELS[member.role as UserRole] || member.role}`}
                        />
                        <ListItemSecondaryAction>
                          {selectedTeam?.leader_id !== member.id && (
                            <Tooltip title={t('common:tooltips.removeFromTeam')}>
                              <IconButton
                                edge="end"
                                onClick={() => handleRemoveMember(member.id)}
                                color="error"
                                size="small"
                              >
                                <PersonRemoveIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {selectedTeam?.leader_id === member.id && (
                            <Chip label="リーダー" size="small" color="secondary" />
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                    {teamMembers.length === 0 && (
                      <ListItem>
                        <ListItemText
                          primary="メンバーがいません"
                          primaryTypographyProps={{ color: 'text.secondary' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Box>

              <Divider orientation="vertical" flexItem />

              {/* Available Members */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  追加可能なメンバー ({availableMembers.length}名)
                </Typography>
                <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <List dense>
                    {availableMembers.map((member) => (
                      <ListItem key={member.id}>
                        <ListItemText
                          primary={member.name}
                          secondary={`${member.employee_id} - ${ROLE_LABELS[member.role as UserRole] || member.role}`}
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title={t('common:tooltips.addToTeam')}>
                            <IconButton
                              edge="end"
                              onClick={() => handleAddMember(member.id)}
                              color="primary"
                              size="small"
                            >
                              <PersonAddIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                    {availableMembers.length === 0 && (
                      <ListItem>
                        <ListItemText
                          primary="追加可能なメンバーがいません"
                          primaryTypographyProps={{ color: 'text.secondary' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMembersDialog(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeamManagementPage;
