import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env';
import { initDatabase, initializeSchema } from './config/database';
import { i18nMiddleware } from './middlewares/i18n';
import authRoutes from './routes/auth';
import applicationRoutes from './routes/applications';
import userRoutes from './routes/users';
import departmentRoutes from './routes/departments';
import approverRoutes from './routes/approvers';
import applicationTypeRoutes from './routes/applicationTypes';
import attachmentRoutes from './routes/attachments';
import passwordRoutes from './routes/password';
import weeklyReportRoutes from './routes/weeklyReports';
import favoriteRoutes from './routes/favorites';
import pageFavoriteRoutes from './routes/pageFavorites';
import systemAccessRoutes from './routes/systemAccess';
import teamRoutes from './routes/teams';
import feedbackRoutes from './routes/feedback';
import settingsRoutes from './routes/settings';
import customerRoutes from './routes/customers';
import revenueRoutes from './routes/revenue';
import seedRoutes from './routes/seed';
import auditLogRoutes from './routes/auditLogs';
import newsfeedRoutes from './routes/newsfeed';
import { initScheduler } from './services/scheduler';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(i18nMiddleware);

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/approvers', approverRoutes);
app.use('/api/application-types', applicationTypeRoutes);
app.use('/api', attachmentRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/weekly-reports', weeklyReportRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/page-favorites', pageFavoriteRoutes);
app.use('/api/system-access', systemAccessRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/audit', auditLogRoutes);
app.use('/api/newsfeed', newsfeedRoutes);
app.use('/api', seedRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: req.__('resources.application') + ' API' });
});

// Initialize database and start server
async function start() {
  try {
    initDatabase();
    console.log('Database connection initialized');

    await initializeSchema();
    console.log('Database schema initialized');

    // Initialize scheduler for Friday reminders
    initScheduler();

    const host = process.env.HOST || '0.0.0.0';
    app.listen(config.port, host, () => {
      console.log(`Server is running on ${host}:${config.port}`);
      console.log(`Access from network: http://192.168.3.5:${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
