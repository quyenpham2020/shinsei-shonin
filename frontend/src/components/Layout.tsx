import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Groups as GroupsIcon,
  Feedback as FeedbackIcon,
  Settings as SettingsIcon,
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  History as HistoryIcon,
  Forum as ForumIcon,
  WorkOutline as WorkOutlineIcon,
  EmojiObjects as EmojiObjectsIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getSystemById, SystemConfig } from '../config/systems';
import { pageFavoriteService, PageFavorite } from '../services/pageFavoriteService';
import LanguageSwitcher from './LanguageSwitcher';

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

const getMenuItems = (systemId: string, basePath: string, t: (key: string) => string): MenuItemConfig[] => {
  switch (systemId) {
    case 'shinsei-shonin':
      return [
        { text: t('common:nav.dashboard'), icon: <DashboardIcon />, path: basePath },
        { text: t('common:nav.applications'), icon: <DescriptionIcon />, path: basePath + '/applications' },
        { text: t('common:nav.newApplication'), icon: <AddIcon />, path: basePath + '/applications/new' },
        { text: t('common:nav.applicationTypes'), icon: <CategoryIcon />, path: basePath + '/application-types', adminOnly: true },
      ];
    case 'weekly-report':
      return [
        { text: t('common:nav.weeklyReport'), icon: <AssessmentIcon />, path: basePath },
      ];
    case 'newsfeed':
      return [
        { text: 'すべて', icon: <ForumIcon />, path: basePath },
        { text: 'ノウハウ', icon: <WorkOutlineIcon />, path: basePath + '/knowhow' },
        { text: 'ヒント', icon: <EmojiObjectsIcon />, path: basePath + '/tips' },
      ];
    case 'master-management':
      return [
        { text: t('common:nav.userManagement'), icon: <PeopleIcon />, path: basePath },
        { text: t('common:nav.departmentManagement'), icon: <BusinessIcon />, path: basePath + '/departments' },
        { text: t('common:nav.teamManagement'), icon: <GroupsIcon />, path: basePath + '/teams' },
        { text: t('common:nav.approverManagement'), icon: <SupervisorAccountIcon />, path: basePath + '/approvers' },
        { text: t('common:nav.systemAccess'), icon: <SecurityIcon />, path: basePath + '/system-access' },
        { text: t('common:nav.customerManagement'), icon: <AccountBalanceIcon />, path: basePath + '/customers' },
        { text: t('common:nav.revenueManagement'), icon: <TrendingUpIcon />, path: basePath + '/revenue' },
        { text: t('common:nav.revenueStats'), icon: <BarChartIcon />, path: basePath + '/revenue-stats' },
        { text: t('common:nav.feedbackManagement'), icon: <FeedbackIcon />, path: basePath + '/feedback' },
        { text: t('common:nav.systemSettings'), icon: <SettingsIcon />, path: basePath + '/settings' },
        { text: '監査ログ', icon: <HistoryIcon />, path: basePath + '/audit-logs' },
      ];
    default:
      return [];
  }
};

const Layout: React.FC<LayoutProps> = ({ systemId }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(() => {
    // Load drawer state from localStorage, default to open
    const saved = localStorage.getItem('drawerOpen');
    return saved !== null ? saved === 'true' : true;
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [favoritesAnchorEl, setFavoritesAnchorEl] = useState<null | HTMLElement>(null);
  const [favorites, setFavorites] = useState<PageFavorite[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [isCurrentPageFavorite, setIsCurrentPageFavorite] = useState(false);

  const system: SystemConfig | undefined = getSystemById(systemId);
  const basePath = system?.path || '/';
  const allMenuItems = getMenuItems(systemId, basePath, t);
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
        return `${t('common:applicationEdit')} #${parts[parts.length - 2]}`;
      }
      return `${t('common:applicationDetail')} #${id}`;
    }

    return system?.name || t('common:page');
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

  const handleDesktopDrawerToggle = () => {
    const newState = !desktopOpen;
    setDesktopOpen(newState);
    // Save to localStorage
    localStorage.setItem('drawerOpen', String(newState));
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
          sx={{ color: 'text.secondary' }}
        >
          {t('common:backToPortal')}
        </Button>
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
          {/* Mobile menu toggle */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          {/* Desktop menu toggle */}
          <Tooltip title={desktopOpen ? t('common:closeMenu') : t('common:openMenu')}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDesktopDrawerToggle}
              sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}
            >
              {desktopOpen ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>
          </Tooltip>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            {system && React.createElement(system.icon, { sx: { mr: 1 } })}
            <Typography variant="h6" noWrap component="div">
              {system?.name || 'システム'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Add/Remove current page from favorites */}
            <Tooltip title={isCurrentPageFavorite ? t('common:removeFromFavorites') : t('common:addToFavorites')}>
              <IconButton
                color="inherit"
                onClick={handleToggleCurrentPageFavorite}
              >
                {isCurrentPageFavorite ? <BookmarkAddedIcon /> : <BookmarkAddIcon />}
              </IconButton>
            </Tooltip>
            {/* My Favorites dropdown */}
            <Tooltip title={t('common:myFavorites')}>
              <IconButton
                color="inherit"
                onClick={handleFavoritesClick}
              >
                <Badge badgeContent={favorites.length} color="error">
                  <BookmarksIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            {/* Language Switcher */}
            <LanguageSwitcher />
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
              {t('common:backToPortal')}
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); navigate('/change-password'); }}>
              <ListItemIcon>
                <LockIcon fontSize="small" />
              </ListItemIcon>
              {t('common:changePassword')}
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              {t('common:logout')}
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
                {t('common:myFavorites')} ({favorites.length})
              </Typography>
            </MenuItem>
            <Divider />
            {favoritesLoading ? (
              <MenuItem disabled>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                {t('common:app.loading')}
              </MenuItem>
            ) : favorites.length === 0 ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  {t('common:noFavorites')}
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
        sx={{ width: { sm: desktopOpen ? drawerWidth : 0 }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer - temporary */}
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
        {/* Desktop drawer - persistent (can be toggled) */}
        <Drawer
          variant="persistent"
          open={desktopOpen}
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              transition: (theme) => theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: {
            xs: '100%',
            sm: desktopOpen ? `calc(100% - ${drawerWidth}px)` : '100%'
          },
          mt: 8,
          transition: (theme) => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
