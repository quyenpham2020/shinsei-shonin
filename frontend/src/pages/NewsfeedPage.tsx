import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Card,
  CardContent,
  CardActions,
  TextField,
  Button,
  Typography,
  Avatar,
  IconButton,
  Divider,
  Chip,
  Switch,
  FormControlLabel,
  Paper,
  CircularProgress,
  Menu,
  MenuItem,
  Collapse,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar,
  Slide,
  Fab,
  Backdrop,
  Link,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import {
  ThumbUp as ThumbUpIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  Comment as CommentIcon,
  Send as SendIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Image as ImageIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ThumbDown as ThumbDownIcon,
  Favorite as FavoriteIcon,
  SentimentVerySatisfied as HahaIcon,
  Whatshot as WowIcon,
  SentimentVeryDissatisfied as SadIcon,
  Mood as AngryIcon,
  Close as CloseIcon,
  Add as AddIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { newsfeedService, NewsfeedPost, NewsfeedComment } from '../services/newsfeedService';
import { ProtectedImage } from '../components/ProtectedImage';

// Fullscreen transition for dialogs
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface NewsfeedPageProps {
  category?: 'knowhow' | 'tip';
}

export default function NewsfeedPage({ category }: NewsfeedPageProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<NewsfeedPost[]>([]);
  const [allPosts, setAllPosts] = useState<NewsfeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [isAnonymousPost, setIsAnonymousPost] = useState(false);
  const [postType, setPostType] = useState<'general' | 'knowhow' | 'tip'>('general');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [expandedComments, setExpandedComments] = useState<{ [key: number]: boolean }>({});
  const [expandedPosts, setExpandedPosts] = useState<{ [key: number]: boolean }>({});
  const [fullPostDialogOpen, setFullPostDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<NewsfeedPost | null>(null);
  const [comments, setComments] = useState<{ [key: number]: NewsfeedComment[] }>({});
  const [commentTexts, setCommentTexts] = useState<{ [key: number]: string }>({});
  const [commentAnonymous, setCommentAnonymous] = useState<{ [key: number]: boolean }>({});
  const [likedPosts, setLikedPosts] = useState<{ [key: number]: boolean }>({});
  const [userReactions, setUserReactions] = useState<{ [key: number]: string | null }>({});
  const [reactionCounts, setReactionCounts] = useState<{ [key: number]: { [key: string]: number } }>({});
  const [reactionAnchorEl, setReactionAnchorEl] = useState<{ [key: number]: HTMLElement | null }>({});
  const [anchorEl, setAnchorEl] = useState<{ [key: number]: HTMLElement | null }>({});
  const [postAttachments, setPostAttachments] = useState<{ [key: number]: any[] }>({});
  const [commentFiles, setCommentFiles] = useState<{ [key: number]: File[] }>({});
  const [commentAttachments, setCommentAttachments] = useState<{ [key: number]: any[] }>({});
  const [createPostDialogOpen, setCreatePostDialogOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const commentFileInputRefs = React.useRef<{ [key: number]: HTMLInputElement | null }>({});
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset and load initial posts when category changes
    setPosts([]);
    setAllPosts([]);
    setOffset(0);
    setHasMore(true);
    loadPosts(true);
  }, [category]);

  useEffect(() => {
    filterPosts();
  }, [searchTerm, allPosts]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || loading || loadingMore || !hasMore || searchTerm) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, searchTerm]);

  const loadPosts = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const limit = isInitial ? 3 : 5; // 3 posts đầu tiên, sau đó 5 posts mỗi lần
      const currentOffset = isInitial ? 0 : offset;

      const params: any = { limit, offset: currentOffset };
      if (category) {
        params.type = category;
      }

      const data = await newsfeedService.getPosts(params);

      if (data.posts.length < limit) {
        setHasMore(false);
      }

      // Load reactions and attachments cho posts mới
      const newPosts = data.posts;
      for (const post of newPosts) {
        try {
          const reactionData = await newsfeedService.getUserReaction(post.id);
          setUserReactions((prev) => ({ ...prev, [post.id]: reactionData.reactionType }));
          setLikedPosts((prev) => ({ ...prev, [post.id]: reactionData.reactionType === 'like' }));
        } catch (error) {
          console.error('Error checking reaction:', error);
        }

        try {
          const counts = await newsfeedService.getReactionCounts(post.id);
          setReactionCounts((prev) => ({ ...prev, [post.id]: counts }));
        } catch (error) {
          console.error('Error getting reaction counts:', error);
        }

        try {
          const attachments = await newsfeedService.getPostAttachments(post.id);
          if (attachments && attachments.length > 0) {
            setPostAttachments((prev) => ({ ...prev, [post.id]: attachments }));
          }
        } catch (error) {
          console.error('Error loading attachments:', error);
        }
      }

      if (isInitial) {
        setAllPosts(newPosts);
        setPosts(newPosts);
        setOffset(limit);
      } else {
        setAllPosts((prev) => [...prev, ...newPosts]);
        setPosts((prev) => [...prev, ...newPosts]);
        setOffset((prev) => prev + limit);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const loadMorePosts = () => {
    if (!loading && !loadingMore && hasMore) {
      loadPosts(false);
    }
  };

  const filterPosts = () => {
    if (!searchTerm.trim()) {
      setPosts(allPosts);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = allPosts.filter(post =>
      post.content.toLowerCase().includes(term) ||
      post.author_name.toLowerCase().includes(term) ||
      (post.author_department && post.author_department.toLowerCase().includes(term))
    );
    setPosts(filtered);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleOpenFullPost = async (post: NewsfeedPost) => {
    setSelectedPost(post);
    setFullPostDialogOpen(true);

    // Load comments if not loaded
    if (!comments[post.id]) {
      try {
        const data = await newsfeedService.getPost(post.id);
        setComments({ ...comments, [post.id]: data.comments });
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    }
  };

  const handleCloseFullPost = () => {
    setFullPostDialogOpen(false);
    setSelectedPost(null);
  };

  const isContentLong = (content: string): boolean => {
    const lines = content.split('\n');
    return lines.length > 4 || content.length > 300;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const validFiles = Array.from(files).filter(file => {
        const isImage = file.type.startsWith('image/');
        const isAudio = file.type.startsWith('audio/');
        const isVideo = file.type.startsWith('video/');
        return isImage || isAudio || isVideo;
      });

      if (validFiles.length !== files.length) {
        alert('画像、音声、動画ファイルのみアップロード可能です');
      }

      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    try {
      const newPost = await newsfeedService.createPost({
        content: newPostContent,
        postType,
        isAnonymous: isAnonymousPost,
      });

      // Upload attachments if any
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            await newsfeedService.uploadPostAttachment(newPost.id, file);
          } catch (error) {
            console.error('Error uploading file:', error);
          }
        }

        // Load attachments for the new post
        try {
          const attachments = await newsfeedService.getPostAttachments(newPost.id);
          if (attachments && attachments.length > 0) {
            setPostAttachments((prev) => ({ ...prev, [newPost.id]: attachments }));
          }
        } catch (error) {
          console.error('Error loading attachments:', error);
        }
      }

      setNewPostContent('');
      setIsAnonymousPost(false);
      setPostType('general');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setCreatePostDialogOpen(false);

      // Reload posts to show the new post with attachments
      setPosts([]);
      setAllPosts([]);
      setOffset(0);
      setHasMore(true);
      loadPosts(true);
    } catch (error: any) {
      alert(error.response?.data?.message || '投稿の作成に失敗しました');
    }
  };

  const handleOpenImageViewer = (imageUrl: string) => {
    setCurrentImage(imageUrl);
    setImageViewerOpen(true);
  };

  const handleCloseImageViewer = () => {
    setImageViewerOpen(false);
    setCurrentImage('');
  };

  // Function to linkify URLs in text
  const linkify = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <Link
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: 'primary.main', textDecoration: 'underline' }}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('この投稿を削除しますか？')) return;

    try {
      await newsfeedService.deletePost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (error: any) {
      alert(error.response?.data?.message || '投稿の削除に失敗しました');
    }
  };

  const handleToggleLike = async (postId: number) => {
    try {
      const result = await newsfeedService.toggleLike(postId);
      setLikedPosts((prev) => ({ ...prev, [postId]: result.liked }));
      setPosts(
        posts.map((p) =>
          p.id === postId
            ? { ...p, likes_count: p.likes_count + (result.liked ? 1 : -1) }
            : p
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleReaction = async (postId: number, reactionType: string) => {
    try {
      const currentReaction = userReactions[postId];
      const result = await newsfeedService.toggleReaction(postId, reactionType);

      setUserReactions((prev) => ({ ...prev, [postId]: result.reactionType }));
      setLikedPosts((prev) => ({ ...prev, [postId]: result.reactionType === 'like' }));

      // Update reaction counts
      const counts = await newsfeedService.getReactionCounts(postId);
      setReactionCounts((prev) => ({ ...prev, [postId]: counts }));

      // Update post likes_count
      setPosts(
        posts.map((p) => {
          if (p.id === postId) {
            let newCount = p.likes_count;
            if (!currentReaction && result.reactionType) {
              newCount += 1;
            } else if (currentReaction && !result.reactionType) {
              newCount -= 1;
            }
            return { ...p, likes_count: newCount };
          }
          return p;
        })
      );

      // Close reaction menu
      setReactionAnchorEl((prev) => ({ ...prev, [postId]: null }));
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const handleOpenReactionMenu = (postId: number, event: React.MouseEvent<HTMLElement>) => {
    setReactionAnchorEl((prev) => ({ ...prev, [postId]: event.currentTarget }));
  };

  const handleCloseReactionMenu = (postId: number) => {
    setReactionAnchorEl((prev) => ({ ...prev, [postId]: null }));
  };

  const getReactionIcon = (reactionType: string | null) => {
    switch (reactionType) {
      case 'like': return <ThumbUpIcon fontSize="small" sx={{ color: '#1976d2' }} />;
      case 'love': return <FavoriteIcon fontSize="small" sx={{ color: '#e91e63' }} />;
      case 'dislike': return <ThumbDownIcon fontSize="small" sx={{ color: '#757575' }} />;
      case 'haha': return <HahaIcon fontSize="small" sx={{ color: '#ffc107' }} />;
      case 'wow': return <WowIcon fontSize="small" sx={{ color: '#ff9800' }} />;
      case 'sad': return <SadIcon fontSize="small" sx={{ color: '#2196f3' }} />;
      case 'angry': return <AngryIcon fontSize="small" sx={{ color: '#f44336' }} />;
      default: return <ThumbUpOutlinedIcon fontSize="small" />;
    }
  };

  const handleToggleComments = async (postId: number) => {
    const isExpanded = expandedComments[postId];
    setExpandedComments({ ...expandedComments, [postId]: !isExpanded });

    if (!isExpanded && !comments[postId]) {
      try {
        const data = await newsfeedService.getPost(postId);
        setComments({ ...comments, [postId]: data.comments });
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    }
  };

  const handleCommentFileSelect = (postId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const validFiles = Array.from(files).filter(file => {
        const isImage = file.type.startsWith('image/');
        const isAudio = file.type.startsWith('audio/');
        const isVideo = file.type.startsWith('video/');
        return isImage || isAudio || isVideo;
      });

      if (validFiles.length !== files.length) {
        alert('画像、音声、動画ファイルのみアップロード可能です');
      }

      setCommentFiles(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), ...validFiles]
      }));
    }
  };

  const handleRemoveCommentFile = (postId: number, index: number) => {
    setCommentFiles(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddComment = async (postId: number) => {
    const content = commentTexts[postId];
    if (!content?.trim()) return;

    try {
      const newComment = await newsfeedService.addComment(postId, {
        content,
        isAnonymous: commentAnonymous[postId] || false,
      });

      // Upload attachments if any
      const files = commentFiles[postId] || [];
      if (files.length > 0) {
        for (const file of files) {
          try {
            await newsfeedService.uploadCommentAttachment(newComment.id, file);
          } catch (error) {
            console.error('Error uploading comment file:', error);
          }
        }
      }

      setComments({
        ...comments,
        [postId]: [...(comments[postId] || []), newComment],
      });
      setCommentTexts({ ...commentTexts, [postId]: '' });
      setCommentFiles({ ...commentFiles, [postId]: [] });
      if (commentFileInputRefs.current[postId]) {
        commentFileInputRefs.current[postId]!.value = '';
      }
      setPosts(
        posts.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
      );
    } catch (error: any) {
      alert(error.response?.data?.message || 'コメントの追加に失敗しました');
    }
  };

  const getPostTypeLabel = (type: string) => {
    switch (type) {
      case 'knowhow':
        return 'ノウハウ';
      case 'tip':
        return 'ヒント';
      default:
        return '一般';
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'knowhow':
        return 'primary';
      case 'tip':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 1, sm: 3 } }}>
      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="投稿を検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Quick Create Post Button */}
      <Card
        sx={{ mb: 2, boxShadow: 2, cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
        onClick={() => setCreatePostDialogOpen(true)}
      >
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {user?.name.charAt(0)}
            </Avatar>
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              {user?.name}さん、何を共有しますか？
            </Typography>
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </Box>
        </CardContent>
      </Card>

      {/* Posts List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : posts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">まだ投稿がありません</Typography>
        </Paper>
      ) : (
        posts.map((post) => (
          <Card key={post.id} sx={{ mb: 2, boxShadow: 2 }}>
            <CardContent>
              {/* Post Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Avatar sx={{ bgcolor: post.is_anonymous ? 'grey.500' : 'primary.main' }}>
                    {post.author_name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {post.author_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {post.author_department && !post.is_anonymous ? `${post.author_department} • ` : ''}
                      {new Date(post.created_at).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label={getPostTypeLabel(post.post_type)}
                    color={getPostTypeColor(post.post_type) as any}
                    size="small"
                  />
                  {(post.user_id === user?.id || user?.role === 'admin') && (
                    <IconButton
                      size="small"
                      onClick={(e) => setAnchorEl({ ...anchorEl, [post.id]: e.currentTarget })}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                  <Menu
                    anchorEl={anchorEl[post.id]}
                    open={Boolean(anchorEl[post.id])}
                    onClose={() => setAnchorEl({ ...anchorEl, [post.id]: null })}
                  >
                    <MenuItem onClick={() => handleDeletePost(post.id)}>
                      <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
                      削除
                    </MenuItem>
                  </Menu>
                </Box>
              </Box>

              {/* Post Content with Clickable Links and Truncation */}
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body1"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    display: '-webkit-box',
                    WebkitLineClamp: expandedPosts[post.id] ? 'unset' : 4,
                    WebkitBoxOrient: 'vertical',
                    overflow: expandedPosts[post.id] ? 'visible' : 'hidden',
                  }}
                  component="div"
                >
                  {linkify(post.content)}
                </Typography>
                {isContentLong(post.content) && !expandedPosts[post.id] && (
                  <Button
                    size="small"
                    onClick={() => handleOpenFullPost(post)}
                    sx={{
                      mt: 0.5,
                      textTransform: 'none',
                      fontWeight: 'bold',
                      color: 'primary.main',
                      p: 0,
                      minWidth: 'auto',
                      '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                    }}
                  >
                    ... Xem thêm
                  </Button>
                )}
              </Box>

              {/* Attachments */}
              {postAttachments[post.id] && postAttachments[post.id].length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1 }}>
                    {postAttachments[post.id].map((attachment: any) => (
                      <Box key={attachment.id}>
                        {attachment.file_type === 'image' ? (
                          <ProtectedImage
                            src={newsfeedService.getAttachmentUrl(attachment.id)}
                            alt={attachment.original_name}
                            onClick={() => handleOpenImageViewer(newsfeedService.getAttachmentUrl(attachment.id))}
                            sx={{
                              width: '100%',
                              height: 200,
                              borderRadius: 1,
                              cursor: 'pointer',
                              transition: 'transform 0.2s',
                              '&:hover': {
                                transform: 'scale(1.02)',
                              },
                            }}
                          />
                        ) : attachment.file_type === 'audio' ? (
                          <Box sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                            <Typography variant="caption" display="block" gutterBottom>
                              🎵 {attachment.original_name}
                            </Typography>
                            <audio
                              controls
                              style={{ width: '100%', height: 40 }}
                              src={newsfeedService.getAttachmentUrl(attachment.id)}
                            />
                          </Box>
                        ) : attachment.file_type === 'video' ? (
                          <video
                            controls
                            style={{ width: '100%', maxHeight: 300, borderRadius: 4 }}
                            src={newsfeedService.getAttachmentUrl(attachment.id)}
                          />
                        ) : null}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              <Divider />

              {/* Stats with Reaction Counts */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {post.likes_count} リアクション
                  </Typography>
                  {reactionCounts[post.id] && Object.keys(reactionCounts[post.id]).length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {Object.entries(reactionCounts[post.id]).map(([type, count]) => (
                        <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                          {getReactionIcon(type)}
                          <Typography variant="caption" color="text.secondary">
                            {count}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {post.comments_count} コメント
                </Typography>
              </Box>

              <Divider />

              {/* Actions */}
              <CardActions sx={{ px: 0 }}>
                <Button
                  fullWidth
                  startIcon={getReactionIcon(userReactions[post.id])}
                  onClick={(e) => handleOpenReactionMenu(post.id, e)}
                  color={userReactions[post.id] ? 'primary' : 'inherit'}
                  sx={{ borderRadius: 2 }}
                >
                  {userReactions[post.id] ?
                    (userReactions[post.id] === 'like' ? 'いいね' :
                     userReactions[post.id] === 'love' ? 'ラブ' :
                     userReactions[post.id] === 'dislike' ? 'よくない' :
                     userReactions[post.id] === 'haha' ? '笑' :
                     userReactions[post.id] === 'wow' ? 'すごい' :
                     userReactions[post.id] === 'sad' ? '悲しい' :
                     userReactions[post.id] === 'angry' ? '怒' : 'リアクション')
                    : 'リアクション'}
                </Button>
                <Menu
                  anchorEl={reactionAnchorEl[post.id]}
                  open={Boolean(reactionAnchorEl[post.id])}
                  onClose={() => handleCloseReactionMenu(post.id)}
                  sx={{ '& .MuiPaper-root': { borderRadius: 3, p: 1 } }}
                >
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton onClick={() => handleReaction(post.id, 'like')} size="small">
                      <ThumbUpIcon sx={{ color: '#1976d2' }} />
                    </IconButton>
                    <IconButton onClick={() => handleReaction(post.id, 'love')} size="small">
                      <FavoriteIcon sx={{ color: '#e91e63' }} />
                    </IconButton>
                    <IconButton onClick={() => handleReaction(post.id, 'dislike')} size="small">
                      <ThumbDownIcon sx={{ color: '#757575' }} />
                    </IconButton>
                    <IconButton onClick={() => handleReaction(post.id, 'haha')} size="small">
                      <HahaIcon sx={{ color: '#ffc107' }} />
                    </IconButton>
                    <IconButton onClick={() => handleReaction(post.id, 'wow')} size="small">
                      <WowIcon sx={{ color: '#ff9800' }} />
                    </IconButton>
                    <IconButton onClick={() => handleReaction(post.id, 'sad')} size="small">
                      <SadIcon sx={{ color: '#2196f3' }} />
                    </IconButton>
                    <IconButton onClick={() => handleReaction(post.id, 'angry')} size="small">
                      <AngryIcon sx={{ color: '#f44336' }} />
                    </IconButton>
                  </Box>
                </Menu>
                <Button
                  fullWidth
                  startIcon={<CommentIcon />}
                  onClick={() => handleToggleComments(post.id)}
                  sx={{ borderRadius: 2 }}
                >
                  コメント
                </Button>
              </CardActions>

              {/* Comments Section */}
              <Collapse in={expandedComments[post.id]}>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ mt: 2 }}>
                  {/* Comments List */}
                  {comments[post.id]?.map((comment) => (
                    <Box key={comment.id} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: comment.is_anonymous ? 'grey.500' : 'secondary.main',
                        }}
                      >
                        {comment.author_name.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Paper
                          sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 2 }}
                          elevation={0}
                        >
                          <Typography variant="caption" fontWeight="bold">
                            {comment.author_name}
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {comment.content}
                          </Typography>
                        </Paper>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {new Date(comment.created_at).toLocaleString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </Box>
                    </Box>
                  ))}

                  {/* Add Comment */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                      {commentAnonymous[post.id] ? '?' : user?.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      {/* Comment File Preview */}
                      {commentFiles[post.id] && commentFiles[post.id].length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                          {commentFiles[post.id].map((file, index) => (
                            <Box
                              key={index}
                              sx={{
                                position: 'relative',
                                width: 60,
                                height: 60,
                                borderRadius: 1,
                                overflow: 'hidden',
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              {file.type.startsWith('image/') ? (
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: 'grey.100',
                                    fontSize: '20px',
                                  }}
                                >
                                  {file.type.startsWith('audio/') ? '🎵' : '🎬'}
                                </Box>
                              )}
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveCommentFile(post.id, index)}
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  right: 0,
                                  bgcolor: 'rgba(0,0,0,0.6)',
                                  color: 'white',
                                  p: 0.25,
                                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                      )}

                      <TextField
                        fullWidth
                        size="small"
                        placeholder="コメントを追加..."
                        value={commentTexts[post.id] || ''}
                        onChange={(e) =>
                          setCommentTexts({ ...commentTexts, [post.id]: e.target.value })
                        }
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => handleAddComment(post.id)}
                                disabled={!commentTexts[post.id]?.trim()}
                              >
                                <SendIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ borderRadius: 2 }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={commentAnonymous[post.id] || false}
                              onChange={(e) =>
                                setCommentAnonymous({
                                  ...commentAnonymous,
                                  [post.id]: e.target.checked,
                                })
                              }
                              size="small"
                            />
                          }
                          label={
                            <Typography variant="caption">匿名でコメント</Typography>
                          }
                        />
                        <input
                          ref={(el) => (commentFileInputRefs.current[post.id] = el)}
                          type="file"
                          multiple
                          accept="image/*,audio/*,video/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleCommentFileSelect(post.id, e)}
                        />
                        <IconButton
                          size="small"
                          onClick={() => commentFileInputRefs.current[post.id]?.click()}
                          title="画像・音声・動画を添付"
                        >
                          <ImageIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        ))
      )}

      {/* Infinite Scroll Trigger */}
      {!searchTerm && hasMore && (
        <Box
          ref={loadMoreRef}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 3,
            minHeight: 100,
          }}
        >
          {loadingMore && <CircularProgress size={32} />}
        </Box>
      )}

      {/* End of posts message */}
      {!searchTerm && !hasMore && posts.length > 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            すべての投稿を表示しました
          </Typography>
        </Paper>
      )}

      {/* Fullscreen Create Post Dialog */}
      <Dialog
        fullScreen
        open={createPostDialogOpen}
        onClose={() => setCreatePostDialogOpen(false)}
        TransitionComponent={Transition}
      >
        <AppBar sx={{ position: 'relative' }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setCreatePostDialogOpen(false)}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              新しい投稿を作成
            </Typography>
            <Button
              autoFocus
              color="inherit"
              onClick={handleCreatePost}
              disabled={!newPostContent.trim()}
            >
              投稿
            </Button>
          </Toolbar>
        </AppBar>
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Container maxWidth="md">
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                  {isAnonymousPost ? '?' : user?.name.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {isAnonymousPost ? '匿名' : user?.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isAnonymousPost ? '' : user?.department}
                  </Typography>
                </Box>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={10}
                placeholder={`${user?.name}さん、何を共有しますか？`}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                variant="outlined"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                  },
                }}
                autoFocus
              />

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ width: '100%', mb: 1 }}>
                  投稿タイプ:
                </Typography>
                <Chip
                  label="一般"
                  color={postType === 'general' ? 'primary' : 'default'}
                  onClick={() => setPostType('general')}
                />
                <Chip
                  label="ノウハウ"
                  color={postType === 'knowhow' ? 'primary' : 'default'}
                  onClick={() => setPostType('knowhow')}
                />
                <Chip
                  label="ヒント"
                  color={postType === 'tip' ? 'primary' : 'default'}
                  onClick={() => setPostType('tip')}
                />
              </Box>

              {/* File Preview */}
              {selectedFiles.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    添付ファイル:
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 2 }}>
                    {selectedFiles.map((file, index) => (
                      <Box
                        key={index}
                        sx={{
                          position: 'relative',
                          paddingTop: '100%',
                          borderRadius: 2,
                          overflow: 'hidden',
                          border: '2px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                          }}
                        >
                          {file.type.startsWith('image/') ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'grey.100',
                                p: 2,
                              }}
                            >
                              <Typography variant="h4">
                                {file.type.startsWith('audio/') ? '🎵' : '🎬'}
                              </Typography>
                              <Typography variant="caption" align="center" sx={{ mt: 1 }}>
                                {file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveFile(index)}
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            bgcolor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isAnonymousPost}
                        onChange={(e) => setIsAnonymousPost(e.target.checked)}
                      />
                    }
                    label="匿名で投稿"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,audio/*,video/*"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<ImageIcon />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    ファイルを添付
                  </Button>
                </Box>
              </Box>
            </Box>
          </Container>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog
        open={imageViewerOpen}
        onClose={handleCloseImageViewer}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <IconButton
              onClick={handleCloseImageViewer}
              sx={{
                position: 'absolute',
                top: -50,
                right: 0,
                color: 'white',
                bgcolor: 'rgba(0,0,0,0.5)',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
              }}
            >
              <CloseIcon />
            </IconButton>
            <ProtectedImage
              src={currentImage}
              alt="Full size"
              sx={{
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: 1,
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        aria-label="create post"
        onClick={() => setCreatePostDialogOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' },
        }}
      >
        <AddIcon />
      </Fab>

      {/* Full Page Post View Dialog */}
      {selectedPost && (
        <Dialog
          fullScreen
          open={fullPostDialogOpen}
          onClose={handleCloseFullPost}
          TransitionComponent={Transition}
        >
          <AppBar sx={{ position: 'relative' }}>
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                onClick={handleCloseFullPost}
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>
              <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                投稿詳細
              </Typography>
            </Toolbar>
          </AppBar>
          <DialogContent sx={{ p: 0, bgcolor: 'grey.50' }}>
            <Container maxWidth="md" sx={{ py: 3 }}>
              <Card sx={{ boxShadow: 3 }}>
                <CardContent>
                  {/* Post Header */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <Avatar
                      sx={{
                        bgcolor: selectedPost.is_anonymous ? 'grey.500' : 'primary.main',
                        width: 48,
                        height: 48,
                      }}
                    >
                      {selectedPost.author_name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {selectedPost.author_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedPost.author_department && !selectedPost.is_anonymous
                          ? `${selectedPost.author_department} • `
                          : ''}
                        {new Date(selectedPost.created_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                      <Chip
                        label={getPostTypeLabel(selectedPost.post_type)}
                        color={getPostTypeColor(selectedPost.post_type) as any}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Box>

                  {/* Full Content */}
                  <Typography
                    variant="body1"
                    sx={{ mb: 3, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '1.1rem' }}
                    component="div"
                  >
                    {linkify(selectedPost.content)}
                  </Typography>

                  {/* Attachments */}
                  {postAttachments[selectedPost.id] && postAttachments[selectedPost.id].length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                          gap: 2,
                        }}
                      >
                        {postAttachments[selectedPost.id].map((attachment: any) => (
                          <Box key={attachment.id}>
                            {attachment.file_type === 'image' ? (
                              <ProtectedImage
                                src={newsfeedService.getAttachmentUrl(attachment.id)}
                                alt={attachment.original_name}
                                onClick={() =>
                                  handleOpenImageViewer(newsfeedService.getAttachmentUrl(attachment.id))
                                }
                                sx={{
                                  width: '100%',
                                  height: 250,
                                  borderRadius: 2,
                                  cursor: 'pointer',
                                }}
                              />
                            ) : attachment.file_type === 'audio' ? (
                              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                                <Typography variant="body2" gutterBottom>
                                  🎵 {attachment.original_name}
                                </Typography>
                                <audio
                                  controls
                                  style={{ width: '100%', height: 40 }}
                                  src={newsfeedService.getAttachmentUrl(attachment.id)}
                                />
                              </Box>
                            ) : attachment.file_type === 'video' ? (
                              <video
                                controls
                                style={{ width: '100%', maxHeight: 400, borderRadius: 8 }}
                                src={newsfeedService.getAttachmentUrl(attachment.id)}
                              />
                            ) : null}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Divider />

                  {/* Stats */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {selectedPost.likes_count} リアクション
                      </Typography>
                      {reactionCounts[selectedPost.id] &&
                        Object.keys(reactionCounts[selectedPost.id]).length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {Object.entries(reactionCounts[selectedPost.id]).map(([type, count]) => (
                              <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                {getReactionIcon(type)}
                                <Typography variant="caption" color="text.secondary">
                                  {count}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {selectedPost.comments_count} コメント
                    </Typography>
                  </Box>

                  <Divider />

                  {/* Actions */}
                  <CardActions sx={{ px: 0, py: 2 }}>
                    <Button
                      fullWidth
                      startIcon={getReactionIcon(userReactions[selectedPost.id])}
                      onClick={(e) => handleOpenReactionMenu(selectedPost.id, e)}
                      color={userReactions[selectedPost.id] ? 'primary' : 'inherit'}
                      sx={{ borderRadius: 2 }}
                    >
                      {userReactions[selectedPost.id]
                        ? userReactions[selectedPost.id] === 'like'
                          ? 'いいね'
                          : userReactions[selectedPost.id] === 'love'
                          ? 'ラブ'
                          : userReactions[selectedPost.id] === 'dislike'
                          ? 'よくない'
                          : userReactions[selectedPost.id] === 'haha'
                          ? '笑'
                          : userReactions[selectedPost.id] === 'wow'
                          ? 'すごい'
                          : userReactions[selectedPost.id] === 'sad'
                          ? '悲しい'
                          : userReactions[selectedPost.id] === 'angry'
                          ? '怒'
                          : 'リアクション'
                        : 'リアクション'}
                    </Button>
                    <Menu
                      anchorEl={reactionAnchorEl[selectedPost.id]}
                      open={Boolean(reactionAnchorEl[selectedPost.id])}
                      onClose={() => handleCloseReactionMenu(selectedPost.id)}
                      sx={{ '& .MuiPaper-root': { borderRadius: 3, p: 1 } }}
                    >
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton onClick={() => handleReaction(selectedPost.id, 'like')} size="small">
                          <ThumbUpIcon sx={{ color: '#1976d2' }} />
                        </IconButton>
                        <IconButton onClick={() => handleReaction(selectedPost.id, 'love')} size="small">
                          <FavoriteIcon sx={{ color: '#e91e63' }} />
                        </IconButton>
                        <IconButton
                          onClick={() => handleReaction(selectedPost.id, 'dislike')}
                          size="small"
                        >
                          <ThumbDownIcon sx={{ color: '#757575' }} />
                        </IconButton>
                        <IconButton onClick={() => handleReaction(selectedPost.id, 'haha')} size="small">
                          <HahaIcon sx={{ color: '#ffc107' }} />
                        </IconButton>
                        <IconButton onClick={() => handleReaction(selectedPost.id, 'wow')} size="small">
                          <WowIcon sx={{ color: '#ff9800' }} />
                        </IconButton>
                        <IconButton onClick={() => handleReaction(selectedPost.id, 'sad')} size="small">
                          <SadIcon sx={{ color: '#2196f3' }} />
                        </IconButton>
                        <IconButton onClick={() => handleReaction(selectedPost.id, 'angry')} size="small">
                          <AngryIcon sx={{ color: '#f44336' }} />
                        </IconButton>
                      </Box>
                    </Menu>
                  </CardActions>

                  <Divider />

                  {/* Comments Section */}
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      コメント ({selectedPost.comments_count})
                    </Typography>

                    {/* Comments List */}
                    {comments[selectedPost.id]?.map((comment) => (
                      <Box key={comment.id} sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: comment.is_anonymous ? 'grey.500' : 'secondary.main',
                          }}
                        >
                          {comment.author_name.charAt(0)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Paper sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2 }} elevation={0}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {comment.author_name}
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                              {comment.content}
                            </Typography>
                          </Paper>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 2, mt: 0.5 }}>
                            {new Date(comment.created_at).toLocaleString('ja-JP', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        </Box>
                      </Box>
                    ))}

                    {/* Add Comment */}
                    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                      <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                        {commentAnonymous[selectedPost.id] ? '?' : user?.name.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          placeholder="コメントを書く..."
                          value={commentTexts[selectedPost.id] || ''}
                          onChange={(e) =>
                            setCommentTexts({ ...commentTexts, [selectedPost.id]: e.target.value })
                          }
                          variant="outlined"
                          sx={{ bgcolor: 'white', borderRadius: 2 }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={commentAnonymous[selectedPost.id] || false}
                                onChange={(e) =>
                                  setCommentAnonymous({
                                    ...commentAnonymous,
                                    [selectedPost.id]: e.target.checked,
                                  })
                                }
                                size="small"
                              />
                            }
                            label={<Typography variant="caption">匿名でコメント</Typography>}
                          />
                          <Button
                            variant="contained"
                            endIcon={<SendIcon />}
                            onClick={() => handleAddComment(selectedPost.id)}
                            disabled={!commentTexts[selectedPost.id]?.trim()}
                            sx={{ borderRadius: 2 }}
                          >
                            送信
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Container>
          </DialogContent>
        </Dialog>
      )}
    </Container>
  );
}
