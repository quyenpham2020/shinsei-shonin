import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  ListItemIcon,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Lock as LockIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getEnabledSystems, SystemConfig } from '../config/systems';
import { systemAccessService } from '../services/systemAccessService';

const PortalPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [accessibleSystemIds, setAccessibleSystemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const enabledSystems = getEnabledSystems();

  useEffect(() => {
    fetchUserAccess();
  }, []);

  const fetchUserAccess = async () => {
    try {
      setLoading(true);
      const access = await systemAccessService.getMyAccess();
      setAccessibleSystemIds(access);
    } catch (error) {
      console.error('Failed to fetch system access:', error);
      if (user?.role === 'admin') {
        setAccessibleSystemIds(enabledSystems.map(s => s.id));
      }
    } finally {
      setLoading(false);
    }
  };

  const userSystems = enabledSystems.filter(system => {
    if (user?.role === 'admin') return true;
    if (system.adminOnly) return false;
    return accessibleSystemIds.includes(system.id);
  });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSystemClick = (system: SystemConfig) => {
    navigate(system.path);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <BusinessIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            社内システムポータル
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.name} ({user?.department})
            </Typography>
            <IconButton onClick={handleMenuClick} sx={{ p: 0 }}>
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
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
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          py: 6,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              社内システムポータル
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              ご利用になりたいシステムを選択してください
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Grid container spacing={4} justifyContent="center">
                {userSystems.map((system) => {
                  const IconComponent = system.icon;
                  return (
                    <Grid item xs={12} sm={6} md={4} key={system.id}>
                      <Card
                        sx={{
                          height: '100%',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateY(-8px)',
                            boxShadow: 6,
                          },
                        }}
                      >
                        <CardActionArea
                          onClick={() => handleSystemClick(system)}
                          sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                        >
                          <Box
                            sx={{
                              bgcolor: system.color,
                              color: 'white',
                              py: 4,
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <IconComponent sx={{ fontSize: 64 }} />
                          </Box>
                          <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                            <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                              {system.name}
                            </Typography>
                            <Chip
                              label={system.nameEn}
                              size="small"
                              sx={{ mb: 2, bgcolor: 'grey.100' }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {system.description}
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              {userSystems.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary">
                    利用可能なシステムがありません
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    システム管理者にアクセス権限を依頼してください
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          bgcolor: 'grey.100',
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © 2024 Company Name. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default PortalPage;
