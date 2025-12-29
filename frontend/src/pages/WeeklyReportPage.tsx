import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import weeklyReportService, {
  ComparisonData,
  Members3WeeksData,
  MemberWith3WeeksReports,
  MemberDetailData,
} from '../services/weeklyReportService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Format date for display (MM/DD)
const formatWeekDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const WeeklyReportPage: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generatingOverview, setGeneratingOverview] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isPreFilled, setIsPreFilled] = useState(false);

  // Form state
  const [content, setContent] = useState('');
  const [achievements, setAchievements] = useState('');
  const [challenges, setChallenges] = useState('');
  const [nextWeekPlan, setNextWeekPlan] = useState('');
  const [overview, setOverview] = useState('');

  // Comparison data
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);

  // 3 weeks members data
  const [members3WeeksData, setMembers3WeeksData] = useState<Members3WeeksData | null>(null);

  // Member detail modal
  const [selectedMember, setSelectedMember] = useState<MemberWith3WeeksReports | null>(null);
  const [memberDetailData, setMemberDetailData] = useState<MemberDetailData | null>(null);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Export filters
  const [exportDepartment, setExportDepartment] = useState('');
  const [exportTeam, setExportTeam] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  const isLeader = user?.role === 'approver' || user?.role === 'admin';
  const canExport = ['onsite_leader', 'gm', 'bod', 'admin'].includes(user?.role || '');

  useEffect(() => {
    loadComparisonData();
    if (isLeader) {
      loadMembers3Weeks();
    }
  }, [isLeader]);

  const loadComparisonData = async () => {
    try {
      const data = await weeklyReportService.getReportsForComparison();
      setComparisonData(data);

      // If current week has report, use it
      if (data.currentWeek.report) {
        setContent(data.currentWeek.report.content);
        setAchievements(data.currentWeek.report.achievements || '');
        setChallenges(data.currentWeek.report.challenges || '');
        setNextWeekPlan(data.currentWeek.report.next_week_plan || '');
        setOverview(data.currentWeek.report.overview || '');
        setIsPreFilled(false);
      }
      // If no current week report but previous week has, pre-fill with previous week data
      else if (data.previousWeek.report) {
        setContent(data.previousWeek.report.content);
        setAchievements(data.previousWeek.report.achievements || '');
        setChallenges(data.previousWeek.report.challenges || '');
        setNextWeekPlan(data.previousWeek.report.next_week_plan || '');
        setOverview(''); // Don't prefill overview from previous week
        setIsPreFilled(true);
      }
    } catch (error) {
      console.error('Failed to load comparison data:', error);
    }
  };

  const loadMembers3Weeks = async () => {
    try {
      const data = await weeklyReportService.getMembersReportsLast3Weeks();
      setMembers3WeeksData(data);
    } catch (error) {
      console.error('Failed to load members 3 weeks data:', error);
    }
  };

  const handleMemberClick = async (member: MemberWith3WeeksReports) => {
    setSelectedMember(member);
    setDetailModalOpen(true);
    setMemberDetailLoading(true);
    try {
      const data = await weeklyReportService.getMemberReports(member.id);
      setMemberDetailData(data);
    } catch (error) {
      console.error('Failed to load member reports:', error);
      setErrorMessage('メンバーの報告データの取得に失敗しました');
    } finally {
      setMemberDetailLoading(false);
    }
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedMember(null);
    setMemberDetailData(null);
  };

  const handleGenerateOverview = async () => {
    if (!content.trim()) {
      setErrorMessage('報告内容を入力してから、Overviewを生成してください');
      return;
    }

    setGeneratingOverview(true);
    try {
      const data = await weeklyReportService.generateOverview({
        content,
        achievements: achievements || undefined,
        challenges: challenges || undefined,
        nextWeekPlan: nextWeekPlan || undefined,
      });
      setOverview(data.overview);
      setSuccessMessage('Overviewを生成しました。内容を確認・編集してください。');
    } catch (error) {
      console.error('Failed to generate overview:', error);
      setErrorMessage('Overview生成に失敗しました');
    } finally {
      setGeneratingOverview(false);
    }
  };

  const handleExportToExcel = async () => {
    setExporting(true);
    try {
      const blob = await weeklyReportService.exportToExcel({
        department: exportDepartment || undefined,
        team: exportTeam || undefined,
        startDate: exportStartDate || undefined,
        endDate: exportEndDate || undefined,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `weekly_reports_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccessMessage('Excelファイルをダウンロードしました');
    } catch (error) {
      console.error('Failed to export to Excel:', error);
      setErrorMessage('Excel出力に失敗しました');
    } finally {
      setExporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMessage('報告内容を入力してください');
      return;
    }

    setLoading(true);
    try {
      await weeklyReportService.createOrUpdateReport({
        content,
        achievements: achievements || undefined,
        challenges: challenges || undefined,
        nextWeekPlan: nextWeekPlan || undefined,
        overview: overview || undefined,
      });
      setSuccessMessage('週次報告を保存しました');
      setIsPreFilled(false);
      loadComparisonData();
      if (isLeader) {
        loadMembers3Weeks();
      }
    } catch (error) {
      setErrorMessage('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Calculate submission stats for each week
  const getWeekStats = (weekStart: string) => {
    if (!members3WeeksData) return { submitted: 0, total: 0 };
    const submitted = members3WeeksData.members.filter(m => m.reports[weekStart] !== null).length;
    return { submitted, total: members3WeeksData.members.length };
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorMessage('')} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>

      <Typography variant="h4" gutterBottom>
        週次報告管理
      </Typography>

      {/* Reminder Banner - Show if no current week report */}
      {comparisonData && !comparisonData.currentWeek.report && (
        <Alert
          severity="warning"
          sx={{
            mb: 3,
            backgroundColor: '#fff3cd',
            borderLeft: '4px solid #ffc107',
            '& .MuiAlert-icon': {
              fontSize: '32px',
            },
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
            週次報告の提出をお願いします
          </Typography>
          <Typography variant="body1" sx={{ fontSize: '18px', fontWeight: 600, color: '#d32f2f' }}>
            Hãy gửi báo cáo tuần ở chỗ dễ nhìn trên web
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {comparisonData.currentWeek.weekStart} 週の報告がまだ提出されていません。下記のフォームから報告を入力してください。
          </Typography>
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="報告入力" />
          <Tab label="週次比較" />
          {isLeader && <Tab label="メンバー一覧" />}
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {isPreFilled && (
            <Alert severity="info" sx={{ mb: 2 }}>
              先週の報告内容が入力されています。内容を編集して今週の報告として保存してください。
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              multiline
              rows={6}
              label="今週の報告内容 *"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              margin="normal"
              placeholder="今週行った業務内容を記載してください"
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="成果・達成事項"
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              margin="normal"
              placeholder="今週達成したことを記載してください"
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="課題・問題点"
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              margin="normal"
              placeholder="直面している課題や問題点を記載してください"
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="来週の予定"
              value={nextWeekPlan}
              onChange={(e) => setNextWeekPlan(e.target.value)}
              margin="normal"
              placeholder="来週予定している業務を記載してください"
            />

            {/* Overview Section */}
            <Box sx={{ mt: 3, mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Overview（部署共有用の簡潔な報告）
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                上記の詳細報告からAIが自動的に簡潔なoverviewを生成します。生成後に内容を編集できます。
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleGenerateOverview}
                disabled={generatingOverview || !content.trim()}
                startIcon={generatingOverview && <CircularProgress size={20} />}
                sx={{ mb: 2 }}
              >
                {generatingOverview ? 'Overview生成中...' : 'Overviewを生成'}
              </Button>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Overview"
                value={overview}
                onChange={(e) => setOverview(e.target.value)}
                placeholder="「Overviewを生成」ボタンをクリックするとAIが自動生成します"
                helperText="生成後に内容を確認・編集してから報告を保存してください"
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                startIcon={loading && <CircularProgress size={20} />}
              >
                {loading ? '保存中...' : '報告を保存'}
              </Button>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {comparisonData ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>項目</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '42.5%' }}>
                      先週 ({comparisonData.previousWeek.weekStart} ~ {comparisonData.previousWeek.weekEnd})
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '42.5%' }}>
                      今週 ({comparisonData.currentWeek.weekStart} ~ {comparisonData.currentWeek.weekEnd})
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>報告内容</TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-wrap' }}>
                      {comparisonData.previousWeek.report?.content || '未提出'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-wrap' }}>
                      {comparisonData.currentWeek.report?.content || '未提出'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>成果</TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-wrap' }}>
                      {comparisonData.previousWeek.report?.achievements || '-'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-wrap' }}>
                      {comparisonData.currentWeek.report?.achievements || '-'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>課題</TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-wrap' }}>
                      {comparisonData.previousWeek.report?.challenges || '-'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-wrap' }}>
                      {comparisonData.currentWeek.report?.challenges || '-'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>来週予定</TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-wrap' }}>
                      {comparisonData.previousWeek.report?.next_week_plan || '-'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-wrap' }}>
                      {comparisonData.currentWeek.report?.next_week_plan || '-'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          )}
        </TabPanel>

        {isLeader && (
          <TabPanel value={tabValue} index={2}>
            {members3WeeksData ? (
              <>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  メンバー週次報告一覧（直近3週間）
                </Typography>

                {/* Export Section */}
                {canExport && (
                  <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                      Excel出力
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="部署"
                          size="small"
                          value={exportDepartment}
                          onChange={(e) => setExportDepartment(e.target.value)}
                          placeholder="全て"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="チーム"
                          size="small"
                          value={exportTeam}
                          onChange={(e) => setExportTeam(e.target.value)}
                          placeholder="全て"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          label="開始日"
                          type="date"
                          size="small"
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          label="終了日"
                          type="date"
                          size="small"
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={12} md={2}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          startIcon={exporting ? <CircularProgress size={20} /> : <FileDownloadIcon />}
                          onClick={handleExportToExcel}
                          disabled={exporting}
                        >
                          {exporting ? '出力中...' : 'Excel出力'}
                        </Button>
                      </Grid>
                    </Grid>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      ※ フィルターを指定しない場合、全てのデータが出力されます
                    </Typography>
                  </Paper>
                )}

                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>社員番号</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>氏名</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>部門</TableCell>
                        {members3WeeksData.weeks.map((week, index) => {
                          const stats = getWeekStats(week.weekStart);
                          return (
                            <TableCell
                              key={week.weekStart}
                              align="center"
                              sx={{ fontWeight: 'bold', minWidth: 120 }}
                            >
                              <Box>
                                {formatWeekDate(week.weekStart)} ~ {formatWeekDate(week.weekEnd)}
                                {index === 0 && ' (今週)'}
                              </Box>
                              <Chip
                                size="small"
                                label={`${stats.submitted}/${stats.total}`}
                                color={stats.submitted === stats.total ? 'success' : 'warning'}
                                sx={{ mt: 0.5 }}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {members3WeeksData.members.map((member) => (
                        <TableRow
                          key={member.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => handleMemberClick(member)}
                        >
                          <TableCell>{member.employee_id}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon fontSize="small" color="action" />
                              {member.name}
                            </Box>
                          </TableCell>
                          <TableCell>{member.department}</TableCell>
                          {members3WeeksData.weeks.map((week) => {
                            const report = member.reports[week.weekStart];
                            return (
                              <TableCell key={week.weekStart} align="center">
                                {report ? (
                                  <Chip
                                    icon={<CheckCircleIcon />}
                                    label="提出済"
                                    color="success"
                                    size="small"
                                  />
                                ) : (
                                  <Chip
                                    icon={<CancelIcon />}
                                    label="未提出"
                                    color="error"
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="body2" color="text.secondary">
                  ※ メンバーをクリックすると詳細な報告内容を確認できます
                </Typography>
              </>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            )}
          </TabPanel>
        )}
      </Paper>

      {/* Member Detail Modal */}
      <Dialog
        open={detailModalOpen}
        onClose={handleCloseDetailModal}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            {selectedMember?.name} ({selectedMember?.employee_id}) - 週次報告履歴
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {memberDetailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : memberDetailData ? (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  部門: {memberDetailData.member.department} | メール: {memberDetailData.member.email}
                </Typography>
              </Box>
              {memberDetailData.reports.length === 0 ? (
                <Alert severity="info">報告データがありません</Alert>
              ) : (
                <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{
                            fontWeight: 'bold',
                            minWidth: 120,
                            backgroundColor: 'grey.100',
                            position: 'sticky',
                            left: 0,
                            zIndex: 3,
                          }}
                        >
                          項目
                        </TableCell>
                        {memberDetailData.reports.map((report, index) => (
                          <TableCell
                            key={report.id}
                            align="center"
                            sx={{
                              fontWeight: 'bold',
                              minWidth: 280,
                              backgroundColor: index === 0 ? 'primary.light' : 'grey.100',
                              color: index === 0 ? 'primary.contrastText' : 'inherit',
                            }}
                          >
                            <Box>
                              {report.week_start} ~ {report.week_end}
                              {index === 0 && (
                                <Chip
                                  label="最新"
                                  size="small"
                                  color="warning"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                              更新: {new Date(report.updated_at).toLocaleDateString('ja-JP')}
                            </Typography>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* 報告内容 */}
                      <TableRow>
                        <TableCell
                          sx={{
                            fontWeight: 'bold',
                            backgroundColor: 'primary.50',
                            color: 'primary.main',
                            position: 'sticky',
                            left: 0,
                            zIndex: 1,
                          }}
                        >
                          報告内容
                        </TableCell>
                        {memberDetailData.reports.map((report) => (
                          <TableCell
                            key={`content-${report.id}`}
                            sx={{
                              whiteSpace: 'pre-wrap',
                              verticalAlign: 'top',
                              backgroundColor: 'background.paper',
                            }}
                          >
                            {report.content || '-'}
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* 成果・達成事項 */}
                      <TableRow>
                        <TableCell
                          sx={{
                            fontWeight: 'bold',
                            backgroundColor: 'success.50',
                            color: 'success.main',
                            position: 'sticky',
                            left: 0,
                            zIndex: 1,
                          }}
                        >
                          成果・達成事項
                        </TableCell>
                        {memberDetailData.reports.map((report) => (
                          <TableCell
                            key={`achievements-${report.id}`}
                            sx={{
                              whiteSpace: 'pre-wrap',
                              verticalAlign: 'top',
                              backgroundColor: 'background.paper',
                            }}
                          >
                            {report.achievements || '-'}
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* 課題・問題点 */}
                      <TableRow>
                        <TableCell
                          sx={{
                            fontWeight: 'bold',
                            backgroundColor: 'warning.50',
                            color: 'warning.main',
                            position: 'sticky',
                            left: 0,
                            zIndex: 1,
                          }}
                        >
                          課題・問題点
                        </TableCell>
                        {memberDetailData.reports.map((report) => (
                          <TableCell
                            key={`challenges-${report.id}`}
                            sx={{
                              whiteSpace: 'pre-wrap',
                              verticalAlign: 'top',
                              backgroundColor: 'background.paper',
                            }}
                          >
                            {report.challenges || '-'}
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* 来週の予定 */}
                      <TableRow>
                        <TableCell
                          sx={{
                            fontWeight: 'bold',
                            backgroundColor: 'info.50',
                            color: 'info.main',
                            position: 'sticky',
                            left: 0,
                            zIndex: 1,
                          }}
                        >
                          来週の予定
                        </TableCell>
                        {memberDetailData.reports.map((report) => (
                          <TableCell
                            key={`plan-${report.id}`}
                            sx={{
                              whiteSpace: 'pre-wrap',
                              verticalAlign: 'top',
                              backgroundColor: 'background.paper',
                            }}
                          >
                            {report.next_week_plan || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                ※ 横スクロールで過去の報告を確認できます。左から右へ新しい順に表示されています。
              </Typography>
            </Box>
          ) : (
            <Alert severity="error">データの取得に失敗しました</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailModal}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WeeklyReportPage;
