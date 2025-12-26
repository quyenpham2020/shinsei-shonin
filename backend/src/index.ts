import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { initDatabase } from './config/database';
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
import { initScheduler } from './services/scheduler';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '申請・承認管理システム API' });
});

// Initialize database and start server
async function start() {
  try {
    await initDatabase();
    console.log('Database initialized');

    // Initialize scheduler for Friday reminders
    initScheduler();

    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
