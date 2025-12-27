import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './i18n/config';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import PortalPage from './pages/PortalPage';
import DashboardPage from './pages/DashboardPage';
import ApplicationListPage from './pages/ApplicationListPage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import NewApplicationPage from './pages/NewApplicationPage';
import UserListPage from './pages/UserListPage';
import DepartmentListPage from './pages/DepartmentListPage';
import ApproverListPage from './pages/ApproverListPage';
import ApplicationTypeListPage from './pages/ApplicationTypeListPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import WeeklyReportPage from './pages/WeeklyReportPage';
import FavoritesPage from './pages/FavoritesPage';
import SystemAccessPage from './pages/SystemAccessPage';
import TeamManagementPage from './pages/TeamManagementPage';
import FeedbackPage from './pages/FeedbackPage';
import FeedbackManagementPage from './pages/FeedbackManagementPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import CustomerListPage from './pages/CustomerListPage';
import RevenueManagementPage from './pages/RevenueManagementPage';
import RevenueStatsPage from './pages/RevenueStatsPage';
import ForcePasswordChangeDialog from './components/ForcePasswordChangeDialog';
import { CircularProgress, Box } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Noto Sans JP", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, clearMustChangePassword } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      {children}
      <ForcePasswordChangeDialog
        open={user.mustChangePassword === true}
        onPasswordChanged={clearMustChangePassword}
      />
    </>
  );
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, clearMustChangePassword } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return (
    <>
      {children}
      <ForcePasswordChangeDialog
        open={user.mustChangePassword === true}
        onPasswordChanged={clearMustChangePassword}
      />
    </>
  );
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return user ? <Navigate to="/" /> : <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Portal - Main entry point */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <PortalPage />
          </PrivateRoute>
        }
      />

      {/* 申請承認管理システム */}
      <Route
        path="/shinsei"
        element={
          <PrivateRoute>
            <Layout systemId="shinsei-shonin" />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="applications" element={<ApplicationListPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="applications/new" element={<NewApplicationPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />} />
        <Route path="applications/:id/edit" element={<NewApplicationPage />} />
        <Route path="application-types" element={<ApplicationTypeListPage />} />
      </Route>

      {/* 週間報告管理システム */}
      <Route
        path="/weekly-reports"
        element={
          <PrivateRoute>
            <Layout systemId="weekly-report" />
          </PrivateRoute>
        }
      >
        <Route index element={<WeeklyReportPage />} />
      </Route>

      {/* マスタ管理システム */}
      <Route
        path="/master"
        element={
          <AdminRoute>
            <Layout systemId="master-management" />
          </AdminRoute>
        }
      >
        <Route index element={<UserListPage />} />
        <Route path="users" element={<UserListPage />} />
        <Route path="departments" element={<DepartmentListPage />} />
        <Route path="approvers" element={<ApproverListPage />} />
        <Route path="system-access" element={<SystemAccessPage />} />
        <Route path="teams" element={<TeamManagementPage />} />
        <Route path="feedback" element={<FeedbackManagementPage />} />
        <Route path="settings" element={<SystemSettingsPage />} />
        <Route path="customers" element={<CustomerListPage />} />
        <Route path="revenue" element={<RevenueManagementPage />} />
        <Route path="revenue-stats" element={<RevenueStatsPage />} />
      </Route>

      {/* Shared routes */}
      <Route
        path="/change-password"
        element={
          <PrivateRoute>
            <ChangePasswordPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/feedback"
        element={
          <PrivateRoute>
            <FeedbackPage />
          </PrivateRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
