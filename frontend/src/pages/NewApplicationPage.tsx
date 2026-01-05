import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  FormHelperText,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ja';
import { useAuth } from '../contexts/AuthContext';
import { applicationService, CreateApplicationData } from '../services/applicationService';
import { attachmentService, Attachment } from '../services/attachmentService';
import { applicationTypeService, ApplicationType as ApplicationTypeModel } from '../services/applicationTypeService';
import { departmentService, Department } from '../services/departmentService';
import { userService } from '../services/userService';

interface UserOption {
  id: number;
  name: string;
  employeeId: string;
}

const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
  'text/csv',
];

interface FormErrors {
  title?: string;
  type?: string;
  description?: string;
  amount?: string;
  department?: string;
  preferredDate?: string;
  attachments?: string;
}

const NewApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const isEditMode = !!id;

  // Data state
  const [applicationTypes, setApplicationTypes] = useState<ApplicationTypeModel[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [approvers, setApprovers] = useState<UserOption[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingApplication, setIsLoadingApplication] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateApplicationData>({
    title: '',
    type: '',
    description: '',
    amount: undefined,
    departmentId: undefined,
    preferredDate: undefined,
    approverId: undefined,
  });
  const [preferredDate, setPreferredDate] = useState<Dayjs | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [applicationId, setApplicationId] = useState<number | null>(id ? Number(id) : null);
  const [isDraft, setIsDraft] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [types, depts, users] = await Promise.all([
          applicationTypeService.getAll(),
          departmentService.getAll(true), // Only active departments
          userService.getApprovers(),
        ]);
        setApplicationTypes(types);
        setDepartments(depts);
        // Map approvers to the format expected by the form
        const approverList = users.map((u: any) => ({
          id: u.id,
          employeeId: u.employeeId,
          name: u.name,
        }));
        setApprovers(approverList);
        if (types.length > 0 && !id) {
          const firstType = types[0];
          const today = dayjs().format('YYYY-MM-DD');
          const titlePrefix = `${today}_${firstType.name}_`;
          setFormData((prev) => ({ ...prev, type: firstType.code, title: titlePrefix }));
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
        setError('データの取得に失敗しました');
      } finally {
        setIsLoadingTypes(false);
      }
    };
    fetchData();
  }, [id]);

  // Load existing application if editing
  useEffect(() => {
    if (id) {
      const fetchApplication = async () => {
        setIsLoadingApplication(true);
        try {
          const app = await applicationService.getById(Number(id));
          setFormData({
            title: app.title,
            type: app.type,
            description: app.description || '',
            amount: app.amount || undefined,
            departmentId: app.department_id || undefined,
            preferredDate: app.preferred_date || undefined,
            approverId: app.approver_id || undefined,
          });
          if (app.preferred_date) {
            setPreferredDate(dayjs(app.preferred_date));
          }
          setIsDraft(app.status === 'draft');

          // Load attachments
          const attachs = await attachmentService.getByApplicationId(Number(id));
          setAttachments(attachs);
        } catch (err) {
          console.error('Failed to fetch application:', err);
          setError('申請の取得に失敗しました');
        } finally {
          setIsLoadingApplication(false);
        }
      };
      fetchApplication();
    }
  }, [id]);

  // Get user's department from departments list
  const userDepartment = departments.find((d) => d.name === user?.department);

  // Validation
  const validateField = (field: keyof CreateApplicationData, value: any): string | undefined => {
    switch (field) {
      case 'title':
        if (!value || value.trim() === '') return '件名は必須です';
        if (value.length > MAX_TITLE_LENGTH) return `件名は${MAX_TITLE_LENGTH}文字以内で入力してください`;
        return undefined;
      case 'type':
        if (!value) return '申請種別は必須です';
        return undefined;
      case 'description':
        if (!value || value.trim() === '') return '申請内容は必須です';
        if (value.length > MAX_DESCRIPTION_LENGTH)
          return `申請内容は${MAX_DESCRIPTION_LENGTH}文字以内で入力してください`;
        return undefined;
      case 'amount':
        const selectedType = applicationTypes.find((t) => t.code === formData.type);
        if (selectedType?.requires_amount === 1 && (!value || value <= 0)) {
          return '金額は必須です';
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const validateForm = (asDraft: boolean): boolean => {
    if (asDraft) return true; // No validation for drafts

    const newErrors: FormErrors = {};
    newErrors.title = validateField('title', formData.title);
    newErrors.type = validateField('type', formData.type);
    newErrors.description = validateField('description', formData.description);
    newErrors.amount = validateField('amount', formData.amount);

    const selectedType = applicationTypes.find((t) => t.code === formData.type);
    if (selectedType?.requires_attachment === 1 && attachments.length === 0) {
      newErrors.attachments = '添付ファイルは必須です';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((e) => e !== undefined);
  };

  // Generate title prefix based on today's date and application type
  const generateTitlePrefix = (typeCode: string): string => {
    const today = dayjs().format('YYYY-MM-DD');
    const appType = applicationTypes.find((t) => t.code === typeCode);
    const typeName = appType?.name || '';
    return `${today}_${typeName}_`;
  };

  const handleChange = (field: keyof CreateApplicationData, value: string | number | undefined) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Auto-update title prefix when type changes (only for new applications)
      if (field === 'type' && !isEditMode && typeof value === 'string') {
        const prefix = generateTitlePrefix(value);
        // Only update if title is empty or starts with a date pattern (auto-generated)
        if (!prev.title || /^\d{4}-\d{2}-\d{2}_/.test(prev.title)) {
          newData.title = prefix;
        }
      }

      return newData;
    });
    // Real-time validation
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleDateChange = (date: Dayjs | null) => {
    setPreferredDate(date);
    setFormData((prev) => ({
      ...prev,
      preferredDate: date ? date.format('YYYY-MM-DD') : undefined,
    }));
  };

  const handleSubmit = async (asDraft: boolean = false) => {
    setError('');

    if (!validateForm(asDraft)) {
      setError('入力内容を確認してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = { ...formData, isDraft: asDraft };

      if (isEditMode && applicationId) {
        await applicationService.update(applicationId, submitData);
      } else {
        const newApp = await applicationService.create(submitData);
        setApplicationId(newApp.id);

        if (!asDraft) {
          navigate(`/shinsei/applications/${newApp.id}`);
          return;
        }
      }

      if (asDraft) {
        setIsDraft(true);
        navigate('/shinsei/applications');
      } else {
        navigate(`/shinsei/applications/${applicationId || id}`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '申請の作成に失敗しました';
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || errorMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // File handling
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: ファイルサイズは10MB以下にしてください`;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `${file.name}: 対応していないファイル形式です`;
    }
    return null;
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFiles = async (files: File[]) => {
    // Check total file count
    if (attachments.length + files.length > MAX_FILES) {
      setError(`添付ファイルは最大${MAX_FILES}ファイルまでです`);
      return;
    }

    // Validate all files
    const validationErrors: string[] = [];
    const validFiles: File[] = [];
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(error);
      } else {
        validFiles.push(file);
      }
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      return;
    }

    // Need to save as draft first if no application ID
    if (!applicationId) {
      setIsSubmitting(true);
      try {
        const submitData = { ...formData, isDraft: true };
        const newApp = await applicationService.create(submitData);
        setApplicationId(newApp.id);
        setIsDraft(true);
        await uploadFiles(newApp.id, validFiles);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'ファイルのアップロードに失敗しました';
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message || errorMessage
        );
      } finally {
        setIsSubmitting(false);
      }
    } else {
      await uploadFiles(applicationId, validFiles);
    }
  };

  const uploadFiles = async (appId: number, files: File[]) => {
    setIsUploading(true);
    try {
      for (const file of files) {
        const attachment = await attachmentService.upload(appId, file);
        setAttachments((prev) => [...prev, attachment]);
      }
      setErrors((prev) => ({ ...prev, attachments: undefined }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'ファイルのアップロードに失敗しました';
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || errorMessage
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await attachmentService.delete(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      setError('添付ファイルの削除に失敗しました');
    }
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    try {
      await attachmentService.download(attachment.id, attachment.original_name);
    } catch (err) {
      console.error('Failed to download attachment:', err);
      setError('ファイルのダウンロードに失敗しました');
    }
  };

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await processFiles(files);
      }
    },
    [applicationId, formData, attachments]
  );

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon color="primary" />;
    if (mimeType === 'application/pdf') return <PdfIcon color="error" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <DocIcon color="info" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <DocIcon color="success" />;
    return <FileIcon />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canPreview = (mimeType: string) => {
    return mimeType.startsWith('image/') || mimeType === 'application/pdf';
  };

  const selectedType = applicationTypes.find((t) => t.code === formData.type);
  const requiresAmount = selectedType?.requires_amount === 1;
  const requiresAttachment = selectedType?.requires_attachment === 1;

  if (isLoadingTypes || isLoadingApplication) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/applications')} sx={{ mb: 2 }}>
          一覧に戻る
        </Button>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {isEditMode ? '申請編集' : '新規申請'}
              </Typography>
              {isDraft && <Chip label="下書き" size="small" />}
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </Alert>
            )}

            {applicationTypes.length === 0 ? (
              <Alert severity="warning">利用可能な申請種別がありません。管理者に連絡してください。</Alert>
            ) : (
              <Box>
                <Grid container spacing={3}>
                  {/* Application Type */}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={!!errors.type}>
                      <InputLabel>申請種別 *</InputLabel>
                      <Select
                        value={formData.type}
                        label="申請種別 *"
                        onChange={(e) => handleChange('type', e.target.value)}
                      >
                        {applicationTypes.map((appType) => (
                          <MenuItem key={appType.id} value={appType.code}>
                            {appType.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
                      {selectedType?.description && (
                        <FormHelperText>{selectedType.description}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  {/* Department */}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth disabled={user?.role !== 'admin'}>
                      <InputLabel>所属部署</InputLabel>
                      <Select
                        value={user?.role === 'admin' ? formData.departmentId || '' : userDepartment?.id || ''}
                        label="所属部署"
                        onChange={(e) => handleChange('departmentId', e.target.value as number)}
                      >
                        {user?.role === 'admin' ? (
                          departments.map((dept) => (
                            <MenuItem key={dept.id} value={dept.id}>
                              {dept.code} - {dept.name}
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem value={userDepartment?.id || ''}>
                            {userDepartment ? `${userDepartment.code} - ${userDepartment.name}` : user?.department}
                          </MenuItem>
                        )}
                      </Select>
                      {user?.role !== 'admin' && (
                        <FormHelperText>一般ユーザーは自部署のみ選択可能です</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  {/* Approver */}
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      options={approvers}
                      getOptionLabel={(option) => `${option.name} (${option.employeeId})`}
                      value={approvers.find(a => a.id === formData.approverId) || null}
                      onChange={(_, newValue) => handleChange('approverId', newValue?.id)}
                      renderInput={(params) => (
                        <TextField {...params} label="承認者（任意）" helperText="承認者を指定する場合は選択してください" />
                      )}
                    />
                  </Grid>

                  {/* Title */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="件名 *"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      error={!!errors.title}
                      helperText={
                        errors.title ||
                        `${formData.title.length}/${MAX_TITLE_LENGTH}文字`
                      }
                      inputProps={{ maxLength: MAX_TITLE_LENGTH }}
                    />
                  </Grid>

                  {/* Description (Rich Text) */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="申請内容 *"
                      multiline
                      rows={8}
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      error={!!errors.description}
                      helperText={
                        errors.description ||
                        `${formData.description.length}/${MAX_DESCRIPTION_LENGTH}文字`
                      }
                      inputProps={{ maxLength: MAX_DESCRIPTION_LENGTH }}
                      placeholder="申請の詳細内容を入力してください..."
                    />
                  </Grid>

                  {/* Amount */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label={requiresAmount ? '金額 *' : '金額'}
                      type="number"
                      value={formData.amount || ''}
                      onChange={(e) => handleChange('amount', Number(e.target.value) || undefined)}
                      error={!!errors.amount}
                      helperText={errors.amount}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                      }}
                    />
                  </Grid>

                  {/* Preferred Date */}
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="希望日"
                      value={preferredDate}
                      onChange={handleDateChange}
                      format="YYYY年MM月DD日"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.preferredDate,
                          helperText: errors.preferredDate,
                        },
                      }}
                      minDate={dayjs()}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* File Attachments Section */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    添付ファイル
                    {requiresAttachment && <Chip label="必須" size="small" color="primary" sx={{ ml: 1 }} />}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {attachments.length}/{MAX_FILES}ファイル
                    </Typography>
                  </Typography>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  />

                  {/* Drop Zone */}
                  <Paper
                    ref={dropZoneRef}
                    elevation={0}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleFileSelect}
                    sx={{
                      border: '2px dashed',
                      borderColor: isDragOver ? 'primary.main' : errors.attachments ? 'error.main' : 'grey.300',
                      borderRadius: 2,
                      p: 4,
                      textAlign: 'center',
                      bgcolor: isDragOver ? 'primary.light' : 'grey.50',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'primary.light',
                      },
                    }}
                  >
                    {isUploading ? (
                      <CircularProgress size={40} />
                    ) : (
                      <>
                        <CloudUploadIcon sx={{ fontSize: 48, color: isDragOver ? 'primary.main' : 'grey.400', mb: 1 }} />
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          ここにファイルをドラッグ＆ドロップ
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          または クリックしてファイルを選択
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                          対応形式: PDF, Word, Excel, 画像 (最大10MB/ファイル)
                        </Typography>
                      </>
                    )}
                  </Paper>

                  {errors.attachments && (
                    <FormHelperText error sx={{ mt: 1 }}>
                      {errors.attachments}
                    </FormHelperText>
                  )}

                  {/* Attachment List */}
                  {attachments.length > 0 && (
                    <List sx={{ mt: 2 }}>
                      {attachments.map((attachment) => (
                        <ListItem
                          key={attachment.id}
                          sx={{
                            bgcolor: 'grey.50',
                            borderRadius: 1,
                            mb: 1,
                            '&:hover': { bgcolor: 'grey.100' },
                          }}
                        >
                          <ListItemIcon>{getFileIcon(attachment.mime_type)}</ListItemIcon>
                          <ListItemText
                            primary={attachment.original_name}
                            secondary={formatFileSize(attachment.size)}
                            sx={{ cursor: 'pointer' }}
                            onClick={() => handleDownloadAttachment(attachment)}
                          />
                          <ListItemSecondaryAction>
                            {canPreview(attachment.mime_type) && (
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => setPreviewFile(attachment)}
                                sx={{ mr: 1 }}
                              >
                                <PreviewIcon fontSize="small" />
                              </IconButton>
                            )}
                            <IconButton
                              edge="end"
                              size="small"
                              color="error"
                              onClick={() => handleDeleteAttachment(attachment.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={() => navigate('/applications')}>
                    キャンセル
                  </Button>
                  <Button variant="outlined" onClick={() => handleSubmit(true)} disabled={isSubmitting}>
                    {isSubmitting ? '保存中...' : '下書き保存'}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => handleSubmit(false)}
                    disabled={isSubmitting || (requiresAttachment && attachments.length === 0)}
                  >
                    {isSubmitting ? '送信中...' : '申請する'}
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>{previewFile?.original_name}</DialogTitle>
          <DialogContent>
            {previewFile?.mime_type.startsWith('image/') && (
              <Box sx={{ textAlign: 'center' }}>
                <img
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/attachments/${previewFile.id}/download`}
                  alt={previewFile.original_name}
                  style={{ maxWidth: '100%', maxHeight: '70vh' }}
                />
              </Box>
            )}
            {previewFile?.mime_type === 'application/pdf' && (
              <Box sx={{ height: '70vh' }}>
                <iframe
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/attachments/${previewFile.id}/download`}
                  width="100%"
                  height="100%"
                  title={previewFile.original_name}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewFile(null)}>閉じる</Button>
            <Button
              variant="contained"
              onClick={() => previewFile && handleDownloadAttachment(previewFile)}
            >
              ダウンロード
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default NewApplicationPage;
