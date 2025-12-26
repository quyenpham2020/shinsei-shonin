import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Button,
  Badge,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Description as DescriptionIcon,
  Add as AddIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  SupervisorAccount as SupervisorAccountIcon,
  Category as CategoryIcon,
  Logout as LogoutIcon,
  Lock as LockIcon,
  Home as HomeIcon,
  Assessment as AssessmentIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  BookmarkAdd as BookmarkAddIcon,
  BookmarkAdded as BookmarkAddedIcon,
  Bookmarks as BookmarksIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getSystemById, SystemConfig } from '../config/systems';
import { pageFavoriteService, PageFavorite } from '../services/pageFavoriteService';

const drawerWidth = 240;

interface LayoutProps {
  systemId: string;
}

interface MenuItemConfig {
  text: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
}

const getMenuItems = (systemId: string, basePath: string): MenuItemConfig[] => {
  switch (systemId) {
    case 'shinsei-shonin':
      return [
        { text: 'ダッシュボード', icon: <DashboardIcon />, path: basePath },
        { text: '申請一覧', icon: <DescriptionIcon />, path: basePath + '/applications' },
        { text: '新規申請', icon: <AddIcon />, path: basePath + '/applications/new' },
        { text: '申請種別管理', icon: <CategoryIcon />, path: basePath + '/application-types', adminOnly: true },
      ];
    case 'weekly-report':
      return [
        { text: '週次報告', icon: <AssessmentIcon />, path: basePath },
      ];
    case 'master-management':
      return [
        { text: 'ユーザー管理', icon: <PeopleIcon />, path: basePath },
        { text: '部署管理', icon: <BusinessIcon />, path: basePath + '/departments' },
        { text: '承認者管理', icon: <SupervisorAccountIcon />, path: basePath + '/approvers' },
        { text: 'システムアクセス', icon: <SecurityIcon />, path: basePath + '/system-access' },
      ];
    default:
      return [];
  }
};

const Layout: React.FC<LayoutProps> = ({ systemId }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [favoritesAnchorEl, setFavoritesAnchorEl] = useState<null | HTMLElement>(null);
  const [favorites, setFavorites] = useState<PageFavorite[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [isCurrentPageFavorite, setIsCurrentPageFavorite] = useState(false);

  const system: SystemConfig | undefined = getSystemById(systemId);
  const basePath = system?.path || '/';
  const allMenuItems = getMenuItems(systemId, basePath);
  const menuItems = allMenuItems.filter(item => !item.adminOnly || user?.role === 'admin');

  // Get current page title from menu items or path
  const getCurrentPageTitle = () => {
    const currentMenuItem = allMenuItems.find(item => item.path === location.pathname);
    if (currentMenuItem) return currentMenuItem.text;

    // Handle dynamic routes like /applications/:id
    if (location.pathname.includes('/applications/') && !location.pathname.includes('/new')) {
      const parts = location.pathname.split('/');
      const id = parts[parts.length - 1];
      if (parts[parts.length - 1] === 'edit') {
        return `申請編集 #${parts[parts.length - 2]}`;
      }
      return `申請詳細 #${id}`;
    }

    return system?.name || 'ページ';
  };

  // Fetch favorites
  const fetchFavorites = async () => {
    setFavoritesLoading(true);
    try {
      const data = await pageFavoriteService.getAll();
      setFavorites(data);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setFavoritesLoading(false);
    }
  };

  // Check if current page is favorite
  const checkCurrentPageFavorite = async () => {
    try {
      const result = await pageFavoriteService.check(location.pathname);
      setIsCurrentPageFavorite(result.is_favorite);
    } catch (error) {
      console.error('Failed to check favorite:', error);
    }
  };

  useEffect(() => {
    fetchFavorites();
    checkCurrentPageFavorite();
  }, [location.pathname]);

  // Toggle current page favorite
  const handleToggleCurrentPageFavorite = async () => {
    try {
      const title = getCurrentPageTitle();
      const result = await pageFavoriteService.toggle(location.pathname, title);
      setIsCurrentPageFavorite(result.is_favorite);
      fetchFavorites();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleFavoritesClick = (event: React.MouseEvent<HTMLElement>) => {
    fetchFavorites();
    setFavoritesAnchorEl(event.currentTarget);
  };

  const handleFavoritesClose = () => {
    setFavoritesAnchorEl(null);
  };

  const handleFavoriteItemClick = (url: string) => {
    handleFavoritesClose();
    navigate(url);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBackToPortal = () => {
    navigate('/');
  };

  const drawer = (
    <div>
      <Toolbar sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
        <Button
          startIcon={<HomeIcon />}
          onClick={handleBackToPortal}
          size="small"
          sx={{ mb: 1, color: 'text.secondary' }}
        >
          ポータルへ戻る
        </Button>
        <Typography variant="subtitle1" noWrap component="div" sx={{ fontWeight: 700 }}>
          {system?.name || 'システム'}
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: system?.color || 'primary.main',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            {system && React.createElement(system.icon, { sx: { mr: 1 } })}
            <Typography variant="h6" noWrap component="div">
              {system?.name || 'システム'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Add/Remove current page from favorites */}
            <Tooltip title={isCurrentPageFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}>
              <IconButton
                color="inherit"
                onClick={handleToggleCurrentPageFavorite}
              >
                {isCurrentPageFavorite ? <BookmarkAddedIcon /> : <BookmarkAddIcon />}
              </IconButton>
            </Tooltip>
            {/* My Favorites dropdown */}
            <Tooltip title="マイお気に入り">
              <IconButton
                color="inherit"
                onClick={handleFavoritesClick}
              >
                <Badge badgeContent={favorites.length} color="error">
                  <BookmarksIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, ml: 1 }}>
              {user?.name} ({user?.department})
            </Typography>
            <IconButton onClick={handleMenuClick} sx={{ p: 0 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)' }}>
                {user?.name.charAt(0)}
              </Avatar>
            </IconButton>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem disabled>
              <Typography variant="body2">
                {user?.employeeId} - {user?.name}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleBackToPortal}>
              <ListItemIcon>
                <HomeIcon fontSize="small" />
              </ListItemIcon>
              ポータルへ戻る
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); navigate('/change-password'); }}>
              <ListItemIcon>
                <LockIcon fontSize="small" />
              </ListItemIcon>
              パスワード変更
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              ログアウト
            </MenuItem>
          </Menu>
          {/* Favorites Menu */}
          <Menu
            anchorEl={favoritesAnchorEl}
            open={Boolean(favoritesAnchorEl)}
            onClose={handleFavoritesClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: { minWidth: 300, maxHeight: 400 }
            }}
          >
            <MenuItem disabled>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                <BookmarksIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18, color: 'primary.main' }} />
                マイお気に入り ({favorites.length})
              </Typography>
            </MenuItem>
            <Divider />
            {favoritesLoading ? (
              <MenuItem disabled>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                読み込み中...
              </MenuItem>
            ) : favorites.length === 0 ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  お気に入りはありません
                </Typography>
              </MenuItem>
            ) : (
              favorites.map((fav) => (
                <MenuItem
                  key={fav.id}
                  onClick={() => handleFavoriteItemClick(fav.url)}
                  sx={{ py: 1 }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                      {fav.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {fav.url}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            )}
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
